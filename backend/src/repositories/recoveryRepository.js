const { PrismaClient } = require("@prisma/client");
const { v4: uuidv4 } = require("uuid");

const prisma = new PrismaClient();

async function createRecovery(recoveryData) {
  const recovery = await prisma.recovery.create({
    data: {
      recoveryId: recoveryData.recoveryId || uuidv4(),
      paymentId: recoveryData.paymentId,
      customerId: recoveryData.customerId,
      diagnosis: recoveryData.diagnosis,
      recoveryProbability: recoveryData.recoveryProbability,
      confidence: recoveryData.confidence,
      expectedRecoveryValue: recoveryData.expectedRecoveryValue,
      recommendedAction: recoveryData.recommendedAction,
      actualAction: recoveryData.actualAction,
      status: recoveryData.status || "PENDING",
      recoveredAmount: recoveryData.recoveredAmount || 0,
      retryCount: recoveryData.retryCount || 0,
      reason: recoveryData.reason
    }
  });

  return recovery;
}

async function getRecoveryByPaymentId(paymentId) {
  return await prisma.recovery.findFirst({
    where: { paymentId }
  });
}

async function updateRecoveryStatus(recoveryId, status, updates = {}) {
  return await prisma.recovery.update({
    where: { id: recoveryId },
    data: {
      status,
      ...updates
    }
  });
}

async function getRecoveriesByStatus(status) {
  return await prisma.recovery.findMany({
    where: { status }
  });
}

async function getRecoveriesByCustomerId(customerId) {
  return await prisma.recovery.findMany({
    where: { customerId }
  });
}

module.exports = {
  createRecovery,
  getRecoveryByPaymentId,
  updateRecoveryStatus,
  getRecoveriesByStatus,
  getRecoveriesByCustomerId
};
