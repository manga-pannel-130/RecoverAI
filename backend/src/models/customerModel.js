function createCustomer({
    customerId,
    name,
    segment,
    lifetimeValue,
    communicationPreference = "EMAIL",
    optedOut = false
}) {
    return {
        customerId,
        name,
        segment,
        lifetimeValue,
        communicationPreference,
        optedOut,
        createdAt: new Date()
    };
}

module.exports = {
    createCustomer
};