// Day 3 - AI Diagnosis Service
// Uses Groq API if available, falls back to baseline rules

const { getBaselineRecoveryDecision } = require("./recoveryBaseline");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

let groqClient = null;

try {
  if (process.env.GROQ_API_KEY) {
    const Groq = require("groq-sdk");
    groqClient = new Groq({
      apiKey: process.env.GROQ_API_KEY
    });
    console.log("✅ Groq API initialized for AI diagnosis");
  }
} catch (error) {
  console.log("⚠️ Groq SDK not available, will use fallback diagnosis");
}

async function buildRecoveryContext(payment, customer) {
  // Retrieve payment history
  const paymentHistory = await prisma.payment.findMany({
    where: { customerId: customer.id },
    orderBy: { createdAt: "desc" },
    take: 10
  });

  const failedPayments = paymentHistory.filter(
    (p) => p.status === "FAILED"
  ).length;
  const successfulPayments = paymentHistory.filter(
    (p) => p.status === "SUCCESS"
  ).length;

  // Retrieve recovery history
  const recoveryHistory = await prisma.recovery.findMany({
    where: { customerId: customer.id },
    orderBy: { createdAt: "desc" },
    take: 5
  });

  return {
    transactionId: payment.transactionId,
    amount: payment.amount,
    paymentMethod: payment.paymentMethod,
    failureReason: payment.failureReason,
    retryCount: payment.retryCount,
    maxRetries: payment.maxRetries,
    customer: {
      customerId: customer.customerId,
      name: customer.name,
      segment: customer.segment,
      lifetimeValue: customer.lifetimeValue,
      optedOut: customer.optedOut,
      communicationPreference: customer.communicationPreference
    },
    paymentHistory: {
      total: paymentHistory.length,
      successful: successfulPayments,
      failed: failedPayments,
      successRate: paymentHistory.length > 0 ? successfulPayments / paymentHistory.length : 0
    },
    recoveryHistory: {
      total: recoveryHistory.length,
      successfulRecoveries: recoveryHistory.filter(
        (r) => r.status === "SUCCESS"
      ).length,
      failedRecoveries: recoveryHistory.filter(
        (r) => r.status === "FAILED"
      ).length
    }
  };
}

function parseAIResponse(responseText) {
  try {
    // Try to extract JSON from the response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        diagnosis: parsed.diagnosis || "",
        recoverable: parsed.recoverable !== false,
        recoveryProbability: Math.min(
          1,
          Math.max(0, parsed.recoveryProbability || 0.5)
        ),
        strategy: validateStrategy(parsed.strategy || "RETRY_LATER"),
        confidence: Math.min(1, Math.max(0, parsed.confidence || 0.7)),
        reason: parsed.reason || ""
      };
    }
  } catch (error) {
    console.error("Error parsing AI response:", error);
  }

  return null;
}

function validateStrategy(strategy) {
  const validStrategies = [
    "RETRY_NOW",
    "RETRY_LATER",
    "PAYMENT_UPDATE",
    "STOP"
  ];
  return validStrategies.includes(strategy) ? strategy : "RETRY_LATER";
}

async function diagnoseWithAI(context) {
  if (!groqClient) {
    return null;
  }

  try {
    const prompt = `You are a payment recovery expert. Analyze this failed payment and recommend a recovery strategy.

Payment Context:
- Transaction ID: ${context.transactionId}
- Amount: $${context.amount}
- Failure Reason: ${context.failureReason}
- Payment Method: ${context.paymentMethod}
- Retry Count: ${context.retryCount}/${context.maxRetries}

Customer Profile:
- Name: ${context.customer.name}
- Segment: ${context.customer.segment}
- Lifetime Value: $${context.customer.lifetimeValue}
- Previous Payment Success Rate: ${(context.paymentHistory.successRate * 100).toFixed(1)}%

Provide a JSON response with:
{
  "diagnosis": "brief explanation of the failure",
  "recoverable": true/false,
  "recoveryProbability": 0.0-1.0,
  "strategy": "RETRY_NOW|RETRY_LATER|PAYMENT_UPDATE|STOP",
  "confidence": 0.0-1.0,
  "reason": "brief explanation"
}

Available strategies:
- RETRY_NOW: Retry the payment immediately
- RETRY_LATER: Schedule a retry later
- PAYMENT_UPDATE: Ask customer to update payment method
- STOP: Do not attempt recovery`;

    const message = await groqClient.messages.create({
      model: "mixtral-8x7b-32768",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: prompt
        }
      ]
    });

    if (message.content && message.content.length > 0) {
      const responseText = message.content[0].text;
      const parsed = parseAIResponse(responseText);

      if (parsed && parsed.confidence > 0.5) {
        return parsed;
      }
    }
  } catch (error) {
    console.error("Error calling Groq API:", error.message);
  }

  return null;
}

async function diagnosisPaymentFailure(paymentId) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId }
  });

  if (!payment) {
    throw new Error(`Payment not found: ${paymentId}`);
  }

  const customer = await prisma.customer.findUnique({
    where: { id: payment.customerId }
  });

  if (!customer) {
    throw new Error(`Customer not found for payment ${paymentId}`);
  }

  const context = await buildRecoveryContext(payment, customer);

  // Try AI diagnosis first
  if (groqClient) {
    const aiDiagnosis = await diagnoseWithAI(context);
    if (aiDiagnosis) {
      return {
        source: "AI",
        ...aiDiagnosis
      };
    }
  }

  // Fall back to baseline rules
  const baseline = getBaselineRecoveryDecision(payment.failureReason);
  return {
    source: "BASELINE",
    diagnosis: `Rule-based diagnosis for ${payment.failureReason}`,
    recoverable: baseline.probability > 0,
    recoveryProbability: baseline.probability,
    strategy: baseline.action,
    confidence: baseline.confidence,
    reason: baseline.reason
  };
}

module.exports = {
  diagnosisPaymentFailure,
  buildRecoveryContext
};
