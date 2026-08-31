const paymentStatuses = {
    INITIATED: "INITIATED",
    PROCESSING: "PROCESSING",
    SUCCESS: "SUCCESS",
    FAILED: "FAILED",
    RETRYING: "RETRYING",
    RECOVERED: "RECOVERED",
    IRRECOVERABLE: "IRRECOVERABLE"
};

const recoverabilityTypes = {
    RECOVERABLE: "RECOVERABLE",
    IRRECOVERABLE: "IRRECOVERABLE"
};

function createPayment({
    transactionId,
    amount,
    failureReason = null
}) {
    return {
        transactionId,
        amount,
        status: paymentStatuses.INITIATED,
        failureReason,
        recoverability: null,
        retryCount: 0,
        maxRetries: 3,
        recovered: false,
        createdAt: new Date(),
        updatedAt: new Date()
    };
}

module.exports = {
    paymentStatuses,
    recoverabilityTypes,
    createPayment
};