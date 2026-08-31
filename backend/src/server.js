const express = require("express");
const cors = require("cors");
require("dotenv").config();

const { PrismaClient } = require("@prisma/client");
const { v4: uuidv4 } = require("uuid");
const { getRevenueMetrics } = require("./services/metricsService");
const {
  getBaselineRecoveryDecision,
  validateRecoveryConstraints,
  calculateExpectedRecoveryValue
} = require("./services/recoveryBaseline");
const { diagnosisPaymentFailure } = require("./services/aiDiagnosis");
const { RecoveryWorkflow } = require("./services/recoveryWorkflow");
const {
  createRecovery,
  getRecoveryByPaymentId
} = require("./repositories/recoveryRepository");
const {
  createAuditEvent
} = require("./repositories/auditRepository");

const app = express();
const prisma = new PrismaClient();

// Middleware
app.use(cors());
app.use(express.json());

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Error:", err);
  res
    .status(err.status || 500)
    .json({
      error: err.message,
      status: err.status || 500
    });
});

// ============================================
// DAY 1 - FOUNDATION APIs
// ============================================

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    message: "RecoverAI backend is running",
    timestamp: new Date()
  });
});

// Get all payments
app.get("/api/payments", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const payments = await prisma.payment.findMany({
      skip,
      take: limit,
      include: { customer: true },
      orderBy: { createdAt: "desc" }
    });

    const total = await prisma.payment.count();

    res.json({
      data: payments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get failed payments
app.get("/api/payments/failed", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const failedPayments = await prisma.payment.findMany({
      where: {
        status: { in: ["FAILED", "ABANDONED"] }
      },
      skip,
      take: limit,
      include: { customer: true },
      orderBy: { createdAt: "desc" }
    });

    const total = await prisma.payment.count({
      where: { status: { in: ["FAILED", "ABANDONED"] } }
    });

    res.json({
      data: failedPayments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get payment by ID
app.get("/api/payments/:transactionId", async (req, res) => {
  try {
    const payment = await prisma.payment.findUnique({
      where: { transactionId: req.params.transactionId },
      include: {
        customer: true,
        recoveries: true,
        auditEvents: { orderBy: { timestamp: "desc" } }
      }
    });

    if (!payment) {
      return res.status(404).json({ error: "Payment not found" });
    }

    res.json(payment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get metrics (revenue at risk, recovery rate, etc.)
app.get("/api/metrics", async (req, res) => {
  try {
    const metrics = await getRevenueMetrics();
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Simulate a payment (Day 1 - Payment Simulator)
app.post("/api/payments/simulate", async (req, res) => {
  try {
    const { customerId, amount, paymentMethod } = req.body;

    if (!customerId || !amount) {
      return res.status(400).json({
        error: "customerId and amount are required"
      });
    }

    // Get or create customer
    let customer = await prisma.customer.findUnique({
      where: { customerId }
    });

    if (!customer) {
      return res.status(404).json({ error: "Customer not found" });
    }

    // Simulate payment result
    const random = Math.random();
    let status, failureReason;

    if (random < 0.15) {
      status = "FAILED";
      const reasons = [
        "NETWORK_ERROR",
        "TIMEOUT",
        "INSUFFICIENT_FUNDS",
        "BANK_DECLINED"
      ];
      failureReason =
        reasons[Math.floor(Math.random() * reasons.length)];
    } else if (random < 0.2) {
      status = "ABANDONED";
      failureReason = null;
    } else {
      status = "SUCCESS";
      failureReason = null;
    }

    const transactionId = `TXN_${uuidv4().substring(0, 16).toUpperCase()}`;

    const payment = await prisma.payment.create({
      data: {
        transactionId,
        customerId: customer.id,
        amount,
        status,
        failureReason,
        paymentMethod: paymentMethod || "CARD",
        retryCount: 0,
        maxRetries: 3
      },
      include: { customer: true }
    });

    await createAuditEvent({
      paymentId: payment.id,
      eventType: "PAYMENT_SIMULATED",
      description: `Payment simulated: ${status}`,
      metadata: { failureReason },
      agent: "SIMULATOR"
    });

    res.status(201).json(payment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// DAY 3 - AI DIAGNOSIS APIs
// ============================================

// Diagnose a failed payment using AI
app.post("/api/ai/diagnose/:transactionId", async (req, res) => {
  try {
    const payment = await prisma.payment.findUnique({
      where: { transactionId: req.params.transactionId }
    });

    if (!payment) {
      return res.status(404).json({ error: "Payment not found" });
    }

    const diagnosis = await diagnosisPaymentFailure(payment.id);

    res.json({
      transactionId: payment.transactionId,
      ...diagnosis
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// DAY 4 - AGENTIC RECOVERY WORKFLOW
// ============================================

// Execute complete recovery workflow
app.post("/api/agent/recover/:transactionId", async (req, res) => {
  try {
    const payment = await prisma.payment.findUnique({
      where: { transactionId: req.params.transactionId }
    });

    if (!payment) {
      return res.status(404).json({ error: "Payment not found" });
    }

    // Execute workflow
    const workflow = new RecoveryWorkflow();
    const result = await workflow.execute(payment.id);

    res.json({
      transactionId: payment.transactionId,
      workflow: result.outcome || result.error,
      recovery: result.recovery
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get customer payment history
app.get("/api/customers/:customerId/payments", async (req, res) => {
  try {
    const customer = await prisma.customer.findUnique({
      where: { customerId: req.params.customerId }
    });

    if (!customer) {
      return res.status(404).json({ error: "Customer not found" });
    }

    const payments = await prisma.payment.findMany({
      where: { customerId: customer.id },
      orderBy: { createdAt: "desc" }
    });

    res.json({
      customerId: customer.customerId,
      payments
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get customer details
app.get("/api/customers/:customerId", async (req, res) => {
  try {
    const customer = await prisma.customer.findUnique({
      where: { customerId: req.params.customerId },
      include: {
        payments: { orderBy: { createdAt: "desc" } },
        recoveries: { orderBy: { createdAt: "desc" } }
      }
    });

    if (!customer) {
      return res.status(404).json({ error: "Customer not found" });
    }

    res.json(customer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Batch recovery execution (test baseline against many payments)
app.post("/api/batch/recover", async (req, res) => {
  try {
    const limit = req.body.limit || 100;

    const failedPayments = await prisma.payment.findMany({
      where: {
        status: { in: ["FAILED", "ABANDONED"] },
        recovered: false
      },
      take: limit,
      include: { customer: true }
    });

    const results = {
      totalProcessed: failedPayments.length,
      eligible: 0,
      retried: 0,
      recovered: 0,
      stopped: 0,
      totalRevenueAtRisk: 0,
      totalRecovered: 0,
      details: []
    };

    for (const payment of failedPayments) {
      const constraints = validateRecoveryConstraints(
        payment,
        payment.customer
      );

      if (constraints.length > 0) {
        results.stopped++;
        continue;
      }

      results.eligible++;

      const baseline = getBaselineRecoveryDecision(
        payment.failureReason
      );
      results.totalRevenueAtRisk += payment.amount;

      let success = false;

      if (baseline.action !== "STOP") {
        results.retried++;

        // Simulate recovery
        success = Math.random() < baseline.probability;

        if (success) {
          results.recovered++;
          results.totalRecovered += payment.amount;

          await prisma.payment.update({
            where: { id: payment.id },
            data: {
              status: "RECOVERED",
              recovered: true,
              recoveredAmount: payment.amount
            }
          });

          await createAuditEvent({
            paymentId: payment.id,
            eventType: "BASELINE_RECOVERY_SUCCESS",
            description: `Baseline recovery executed: ${baseline.action}`,
            agent: "BATCH_PROCESSOR"
          });
        }
      }

      results.details.push({
        transactionId: payment.transactionId,
        amount: payment.amount,
        strategy: baseline.action,
        success
      });
    }

    results.recoveryRate =
      results.eligible > 0
        ? (results.recovered / results.eligible) * 100
        : 0;

    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// SERVER STARTUP
// ============================================

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    console.log("✅ Database connected");

    app.listen(PORT, () => {
      console.log(`🚀 RecoverAI backend running on http://localhost:${PORT}`);
      console.log(`📊 Metrics: http://localhost:${PORT}/api/metrics`);
      console.log(`💊 Health: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

startServer();

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n🛑 Shutting down...");
  await prisma.$disconnect();
  process.exit(0);
});