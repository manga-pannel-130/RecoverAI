const { createAuditEvent } = require("./models/auditModel");

const event = createAuditEvent({
    eventId: "EVT001",
    paymentId: "txn_test_001",
    agent: "FailureAnalyzer",
    action: "CLASSIFY_FAILURE",
    reason: "Network timeout is potentially temporary",
    result: "RECOVERABLE"
});

console.log(event);