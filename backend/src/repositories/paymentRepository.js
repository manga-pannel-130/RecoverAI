const pool = require("../config/db");

async function createPayment(payment, customerId = null) {
    const query = `
        INSERT INTO payments (
            transaction_id,
            customer_id,
            amount,
            status,
            failure_reason,
            recoverability,
            retry_count,
            max_retries,
            recovered
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *;
    `;

    const values = [
        payment.transactionId,
        customerId,
        payment.amount,
        payment.status,
        payment.failureReason,
        payment.recoverability,
        payment.retryCount,
        payment.maxRetries,
        payment.recovered
    ];

    const result = await pool.query(query, values);

    return result.rows[0];
}

async function getPaymentById(transactionId) {
    const result = await pool.query(
        "SELECT * FROM payments WHERE transaction_id = $1;",
        [transactionId]
    );

    return result.rows[0] || null;
}

async function updatePaymentStatus(
    transactionId,
    status,
    recoverability = null
) {
    const query = `
        UPDATE payments
        SET
            status = $1,
            recoverability = $2,
            updated_at = CURRENT_TIMESTAMP
        WHERE transaction_id = $3
        RETURNING *;
    `;

    const result = await pool.query(query, [
        status,
        recoverability,
        transactionId
    ]);

    return result.rows[0] || null;
}

module.exports = {
    createPayment,
    getPaymentById,
    updatePaymentStatus
};