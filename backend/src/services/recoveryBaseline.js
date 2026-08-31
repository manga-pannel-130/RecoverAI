// Rule-based deterministic recovery baseline
// This is Day 2 functionality - pure rule-based, no AI

const recoveryRules = {
  NETWORK_ERROR: {
    action: "RETRY_NOW",
    probability: 0.85,
    reason: "Network errors are typically transient"
  },
  TIMEOUT: {
    action: "RETRY_NOW",
    probability: 0.8,
    reason: "Timeout errors often resolve on retry"
  },
  INSUFFICIENT_FUNDS: {
    action: "RETRY_LATER",
    probability: 0.4,
    reason: "Customer may have funds available later"
  },
  BANK_DECLINED: {
    action: "RETRY_LATER",
    probability: 0.3,
    reason: "Bank may accept retry after some time"
  },
  CARD_EXPIRED: {
    action: "PAYMENT_UPDATE",
    probability: 0.65,
    reason: "Customer needs to update payment method"
  },
  AUTHENTICATION_FAILED: {
    action: "RETRY_LATER",
    probability: 0.35,
    reason: "Customer may successfully authenticate later"
  },
  LIMIT_EXCEEDED: {
    action: "PAYMENT_UPDATE",
    probability: 0.5,
    reason: "Customer needs to update payment method or increase limit"
  },
  GATEWAY_TIMEOUT: {
    action: "RETRY_NOW",
    probability: 0.75,
    reason: "Gateway timeouts are often transient"
  },
  BANK_SERVER_UNAVAILABLE: {
    action: "RETRY_NOW",
    probability: 0.7,
    reason: "Bank server will likely be available soon"
  },
  INVALID_PAYMENT_DETAILS: {
    action: "PAYMENT_UPDATE",
    probability: 0.45,
    reason: "Customer needs to update payment details"
  }
};

function getBaselineRecoveryDecision(failureReason) {
  const rule = recoveryRules[failureReason];

  if (!rule) {
    return {
      action: "STOP",
      probability: 0,
      confidence: 1.0,
      reason: "Unknown failure reason - cannot recommend recovery"
    };
  }

  return {
    action: rule.action,
    probability: rule.probability,
    confidence: 0.95, // High confidence in deterministic rules
    reason: rule.reason
  };
}

function validateRecoveryConstraints(payment, customer) {
  const violations = [];

  if (customer.optedOut) {
    violations.push("Customer has opted out of recovery");
  }

  if (payment.recovered) {
    violations.push("Payment already recovered");
  }

  if (payment.retryCount >= payment.maxRetries) {
    violations.push("Maximum retry limit reached");
  }

  if (!payment.failureReason) {
    violations.push("No failure reason recorded");
  }

  return violations;
}

function calculateExpectedRecoveryValue(payment, probability) {
  return payment.amount * probability;
}

module.exports = {
  getBaselineRecoveryDecision,
  validateRecoveryConstraints,
  calculateExpectedRecoveryValue
};
