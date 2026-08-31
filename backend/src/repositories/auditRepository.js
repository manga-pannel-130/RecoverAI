const { PrismaClient } = require("@prisma/client");
const { v4: uuidv4 } = require("uuid");

const prisma = new PrismaClient();

async function createAuditEvent(auditData) {
  const auditEvent = await prisma.auditEvent.create({
    data: {
      eventId: auditData.eventId || uuidv4(),
      paymentId: auditData.paymentId,
      eventType: auditData.eventType,
      description: auditData.description,
      metadata: auditData.metadata ? JSON.stringify(auditData.metadata) : null,
      agent: auditData.agent || "SYSTEM",
      action: auditData.action,
      reason: auditData.reason,
      result: auditData.result
    }
  });

  return auditEvent;
}

async function getAuditEventsByPaymentId(paymentId) {
  return await prisma.auditEvent.findMany({
    where: { paymentId },
    orderBy: { timestamp: "desc" }
  });
}

async function getAuditEventsByType(eventType) {
  return await prisma.auditEvent.findMany({
    where: { eventType },
    orderBy: { timestamp: "desc" }
  });
}

async function getAllAuditEvents() {
  return await prisma.auditEvent.findMany({
    orderBy: { timestamp: "desc" }
  });
}

module.exports = {
  createAuditEvent,
  getAuditEventsByPaymentId,
  getAuditEventsByType,
  getAllAuditEvents
};
