const pool = require("../config/db");

async function createCustomer(customer) {
    const query = `
        INSERT INTO customers (
            customer_id,
            name,
            segment,
            lifetime_value,
            communication_preference,
            opted_out
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *;
    `;

    const values = [
        customer.customerId,
        customer.name,
        customer.segment,
        customer.lifetimeValue,
        customer.communicationPreference,
        customer.optedOut
    ];

    const result = await pool.query(query, values);

    return result.rows[0];
}

async function getCustomerById(customerId) {
    const result = await pool.query(
        "SELECT * FROM customers WHERE customer_id = $1;",
        [customerId]
    );

    return result.rows[0] || null;
}

module.exports = {
    createCustomer,
    getCustomerById
};