function createAuditEvent({
    eventId,
    paymentId,
    agent,
    action,
    reason,
    result
}) {
    return {
        eventId,
        paymentId,
        timestamp: new Date(),
        agent,
        action,
        reason,
        result
    };
}

module.exports = {
    createAuditEvent
};