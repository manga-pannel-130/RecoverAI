const { PrismaClient } = require("@prisma/client");
const { v4: uuidv4 } = require("uuid");

const prisma = new PrismaClient();

const FAILURE_REASONS = [
  "NETWORK_ERROR",
  "TIMEOUT",
  "INSUFFICIENT_FUNDS",
  "BANK_DECLINED",
  "CARD_EXPIRED",
  "AUTHENTICATION_FAILED",
  "LIMIT_EXCEEDED",
  "GATEWAY_TIMEOUT",
  "BANK_SERVER_UNAVAILABLE",
  "INVALID_PAYMENT_DETAILS"
];

const PAYMENT_METHODS = ["CARD", "UPI", "NETBANKING", "WALLET"];
const SEGMENTS = ["PREMIUM", "STANDARD", "BASIC"];

const PAYMENT_STATUSES = [
  "SUCCESS",
  "FAILED",
  "ABANDONED",
  "PENDING",
  "RECOVERED"
];

async function generateCustomers(count = 10000) {
  console.log(`Generating ${count} customers...`);
  const customers = [];

  for (let i = 0; i < count; i++) {
    customers.push({
      customerId: `CUST_${String(i + 1).padStart(6, "0")}`,
      name: `Customer ${i + 1}`,
      email: `customer.${i + 1}@example.com`,
      phone: `+91${Math.floor(Math.random() * 9000000000 + 1000000000)}`,
      segment: SEGMENTS[Math.floor(Math.random() * SEGMENTS.length)],
      lifetimeValue:
        Math.random() * 100000 + (Math.random() < 0.3 ? 50000 : 0),
      communicationPreference: Math.random() < 0.7 ? "EMAIL" : "SMS",
      optedOut: Math.random() < 0.05
    });

    if (i % 1000 === 0) {
      console.log(`  Generated ${i} customers...`);
    }
  }

  console.log(`Inserting ${count} customers into database...`);
  const batchSize = 100;
  for (let i = 0; i < customers.length; i += batchSize) {
    const batch = customers.slice(i, i + batchSize);
    await prisma.customer.createMany({
      data: batch,
      skipDuplicates: true
    });

    if (i % 1000 === 0) {
      console.log(`  Inserted ${i} customers...`);
    }
  }

  console.log(`✅ ${count} customers generated successfully`);
  return customers;
}

async function generatePayments(customers, count = 15000) {
  console.log(`Generating ${count} payments...`);
  const payments = [];
  const failureRate = 0.2;
  const abandonmentRate = 0.05;

  for (let i = 0; i < count; i++) {
    const customer =
      customers[Math.floor(Math.random() * customers.length)];
    const rand = Math.random();

    let status, failureReason;

    if (rand < failureRate) {
      status = "FAILED";
      failureReason =
        FAILURE_REASONS[
          Math.floor(Math.random() * FAILURE_REASONS.length)
        ];
    } else if (rand < failureRate + abandonmentRate) {
      status = "ABANDONED";
      failureReason = null;
    } else {
      status = "SUCCESS";
      failureReason = null;
    }

    payments.push({
      transactionId: `TXN_${uuidv4().substring(0, 16).toUpperCase()}`,
      customerId: customer.customerId,
      amount: Math.floor(Math.random() * 100000 + 100) / 100,
      status,
      failureReason,
      paymentMethod:
        PAYMENT_METHODS[
          Math.floor(Math.random() * PAYMENT_METHODS.length)
        ],
      retryCount: status === "FAILED" ? Math.floor(Math.random() * 3) : 0,
      maxRetries: 3,
      recovered: false,
      recoveredAmount: 0
    });

    if (i % 2000 === 0) {
      console.log(`  Generated ${i} payments...`);
    }
  }

  console.log(`Inserting ${count} payments into database...`);
  const batchSize = 100;
  for (let i = 0; i < payments.length; i += batchSize) {
    const batch = payments.slice(i, i + batchSize);

    // Resolve customer IDs first
    const paymentDataWithIds = await Promise.all(
      batch.map(async (p) => {
        const customer = await prisma.customer.findUnique({
          where: { customerId: p.customerId }
        });
        return {
          transactionId: p.transactionId,
          customerId: customer?.id,
          amount: p.amount,
          status: p.status,
          failureReason: p.failureReason,
          paymentMethod: p.paymentMethod,
          retryCount: p.retryCount,
          maxRetries: p.maxRetries,
          recovered: p.recovered,
          recoveredAmount: p.recoveredAmount
        };
      })
    );

    await prisma.payment.createMany({
      data: paymentDataWithIds,
      skipDuplicates: true
    });

    if (i % 1000 === 0) {
      console.log(`  Inserted ${i} payments...`);
    }
  }

  console.log(`✅ ${count} payments generated successfully`);
}

async function main() {
  try {
    console.log("🚀 Starting data generation...");
    console.log("Clearing existing data...");

    await prisma.auditEvent.deleteMany({});
    await prisma.recovery.deleteMany({});
    await prisma.payment.deleteMany({});
    await prisma.customer.deleteMany({});

    const customers = await generateCustomers(10000);
    await generatePayments(customers, 15000);

    console.log("\n✅ Data generation complete!");
  } catch (error) {
    console.error("Error generating data:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
