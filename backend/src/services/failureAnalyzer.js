const {
    recoverabilityTypes
} = require("../models/paymentModel");

const recoverableFailures = [
    "NETWORK_TIMEOUT",
    "BANK_SERVER_UNAVAILABLE",
    "GATEWAY_TIMEOUT",
    "TEMPORARY_GATEWAY_ERROR"
];

const irrecoverableFailures = [
    "INSUFFICIENT_FUNDS",
    "INVALID_PAYMENT_DETAILS",
    "INVALID_ACCOUNT",
    "AUTHENTICATION_FAILED"
];

function analyzeFailure(failureReason) {
    if (recoverableFailures.includes(failureReason)) {
        return {
            recoverability: recoverabilityTypes.RECOVERABLE,
            recommendation: "RETRY"
        };
    }

    if (irrecoverableFailures.includes(failureReason)) {
        return {
            recoverability: recoverabilityTypes.IRRECOVERABLE,
            recommendation: "STOP"
        };
    }

    return {
        recoverability: recoverabilityTypes.IRRECOVERABLE,
        recommendation: "MANUAL_REVIEW"
    };
}

module.exports = {
    analyzeFailure
};