const { createPayment } = require("./models/paymentModel");

const payment = createPayment({
    transactionId: "txn_test_001",
    amount: 2500,
    failureReason: "NETWORK_TIMEOUT"
});

console.log(payment);