function createRecovery({
    recoveryId,
    paymentId,
    riskScore = null,
    recoveryProbability = null,
    recommendedAction = null,
    actualAction = null,
    status = "PENDING",
    recoveredAmount = 0
}) {
    return {
        recoveryId,
        paymentId,
        riskScore,
        recoveryProbability,
        recommendedAction,
        actualAction,
        status,
        recoveredAmount,
        createdAt: new Date(),
        updatedAt: new Date()
    };
}

module.exports = {
    createRecovery
};