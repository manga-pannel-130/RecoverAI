// Metrics and Analytics Service
// Calculates revenue-at-risk and recovery metrics

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function getRevenueMetrics() {
  // Get all payments
  const allPayments = await prisma.payment.findMany();

  // Calculate failed/abandoned transactions
  const failedPayments = allPayments.filter((p) =>
    ["FAILED", "ABANDONED"].includes(p.status)
  );
  const successfulPayments = allPayments.filter((p) =>
    p.status === "SUCCESS"
  );
  const recoveredPayments = allPayments.filter((p) =>
    p.status === "RECOVERED"
  );

  // Calculate totals
  const totalRevenue = allPayments.reduce((sum, p) => sum + p.amount, 0);
  const revenueAtRisk = failedPayments.reduce((sum, p) => sum + p.amount, 0);
  const recoveredRevenue = recoveredPayments.reduce(
    (sum, p) => sum + p.recoveredAmount,
    0
  );
  const successfulRevenue = successfulPayments.reduce(
    (sum, p) => sum + p.amount,
    0
  );

  // Calculate rates
  const overallSuccessRate =
    allPayments.length > 0
      ? ((successfulPayments.length + recoveredPayments.length) /
          allPayments.length) *
        100
      : 0;
  const recoveryRate =
    failedPayments.length > 0
      ? (recoveredPayments.length / failedPayments.length) * 100
      : 0;

  return {
    timestamp: new Date(),
    summary: {
      totalTransactions: allPayments.length,
      successfulTransactions: successfulPayments.length,
      failedTransactions: failedPayments.length,
      recoveredTransactions: recoveredPayments.length,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      successfulRevenue: Math.round(successfulRevenue * 100) / 100,
      revenueAtRisk: Math.round(revenueAtRisk * 100) / 100,
      recoveredRevenue: Math.round(recoveredRevenue * 100) / 100,
      overallSuccessRate: Math.round(overallSuccessRate * 100) / 100,
      recoveryRate: Math.round(recoveryRate * 100) / 100
    },
    byPaymentMethod: await getMetricsByPaymentMethod(),
    byCustomerSegment: await getMetricsByCustomerSegment(),
    byFailureReason: await getMetricsByFailureReason()
  };
}

async function getMetricsByPaymentMethod() {
  const payments = await prisma.payment.findMany();

  const methods = {};
  payments.forEach((p) => {
    const method = p.paymentMethod || "UNKNOWN";
    if (!methods[method]) {
      methods[method] = {
        total: 0,
        success: 0,
        failed: 0,
        recovered: 0,
        totalAmount: 0,
        recoveredAmount: 0
      };
    }

    methods[method].total += 1;
    methods[method].totalAmount += p.amount;

    if (p.status === "SUCCESS") {
      methods[method].success += 1;
    } else if (["FAILED", "ABANDONED"].includes(p.status)) {
      methods[method].failed += 1;
    }

    if (p.status === "RECOVERED") {
      methods[method].recovered += 1;
      methods[method].recoveredAmount += p.recoveredAmount;
    }
  });

  return methods;
}

async function getMetricsByCustomerSegment() {
  const payments = await prisma.payment.findMany({
    include: { customer: true }
  });

  const segments = {};
  payments.forEach((p) => {
    const segment = p.customer?.segment || "UNKNOWN";
    if (!segments[segment]) {
      segments[segment] = {
        total: 0,
        success: 0,
        failed: 0,
        recovered: 0,
        totalAmount: 0,
        recoveredAmount: 0
      };
    }

    segments[segment].total += 1;
    segments[segment].totalAmount += p.amount;

    if (p.status === "SUCCESS") {
      segments[segment].success += 1;
    } else if (["FAILED", "ABANDONED"].includes(p.status)) {
      segments[segment].failed += 1;
    }

    if (p.status === "RECOVERED") {
      segments[segment].recovered += 1;
      segments[segment].recoveredAmount += p.recoveredAmount;
    }
  });

  return segments;
}

async function getMetricsByFailureReason() {
  const failedPayments = await prisma.payment.findMany({
    where: { status: { in: ["FAILED", "ABANDONED"] } }
  });

  const reasons = {};
  failedPayments.forEach((p) => {
    const reason = p.failureReason || "UNKNOWN";
    if (!reasons[reason]) {
      reasons[reason] = {
        count: 0,
        totalAmount: 0,
        recoveredCount: 0,
        recoveredAmount: 0
      };
    }

    reasons[reason].count += 1;
    reasons[reason].totalAmount += p.amount;

    if (p.recovered) {
      reasons[reason].recoveredCount += 1;
      reasons[reason].recoveredAmount += p.recoveredAmount;
    }
  });

  return reasons;
}

module.exports = {
  getRevenueMetrics
};
