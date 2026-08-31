const { createRecovery } = require("./models/recoveryModel");

const recovery = createRecovery({
    recoveryId: "REC001",
    paymentId: "txn_test_001",
    riskScore: 75,
    recoveryProbability: 0.82,
    recommendedAction: "RETRY_AFTER_24H"
});

console.log(recovery);