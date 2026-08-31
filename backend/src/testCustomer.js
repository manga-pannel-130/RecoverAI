const { createCustomer } = require("./models/customerModel");

const customer = createCustomer({
    customerId: "C001",
    name: "Arun Kumar",
    segment: "HIGH_VALUE",
    lifetimeValue: 34000
});

console.log(customer);