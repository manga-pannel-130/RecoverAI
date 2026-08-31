const { analyzeFailure } = require("./services/failureAnalyzer");

const testFailures = [
    "NETWORK_TIMEOUT",
    "BANK_SERVER_UNAVAILABLE",
    "INSUFFICIENT_FUNDS",
    "INVALID_PAYMENT_DETAILS",
    "UNKNOWN_ERROR"
];

testFailures.forEach((failure) => {
    const result = analyzeFailure(failure);

    console.log(`${failure}:`);
    console.log(result);
    console.log("-------------------------");
});