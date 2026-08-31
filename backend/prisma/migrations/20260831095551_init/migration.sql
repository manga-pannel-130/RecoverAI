-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "segment" TEXT,
    "lifetimeValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "communicationPreference" TEXT NOT NULL DEFAULT 'EMAIL',
    "optedOut" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "customerId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'INITIATED',
    "failureReason" TEXT,
    "paymentMethod" TEXT DEFAULT 'CARD',
    "recoverability" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "recovered" BOOLEAN NOT NULL DEFAULT false,
    "recoveredAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "razorpayOrderId" TEXT,
    "razorpayPaymentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recovery" (
    "id" TEXT NOT NULL,
    "recoveryId" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "customerId" TEXT,
    "diagnosis" TEXT,
    "recoveryProbability" DOUBLE PRECISION,
    "confidence" DOUBLE PRECISION,
    "expectedRecoveryValue" DOUBLE PRECISION,
    "recommendedAction" TEXT,
    "actualAction" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "recoveredAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Recovery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "description" TEXT,
    "metadata" TEXT,
    "agent" TEXT,
    "action" TEXT,
    "reason" TEXT,
    "result" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Customer_customerId_key" ON "Customer"("customerId");

-- CreateIndex
CREATE INDEX "Customer_customerId_idx" ON "Customer"("customerId");

-- CreateIndex
CREATE INDEX "Customer_optedOut_idx" ON "Customer"("optedOut");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_transactionId_key" ON "Payment"("transactionId");

-- CreateIndex
CREATE INDEX "Payment_customerId_idx" ON "Payment"("customerId");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "Payment"("status");

-- CreateIndex
CREATE INDEX "Payment_failureReason_idx" ON "Payment"("failureReason");

-- CreateIndex
CREATE UNIQUE INDEX "Recovery_recoveryId_key" ON "Recovery"("recoveryId");

-- CreateIndex
CREATE INDEX "Recovery_paymentId_idx" ON "Recovery"("paymentId");

-- CreateIndex
CREATE INDEX "Recovery_customerId_idx" ON "Recovery"("customerId");

-- CreateIndex
CREATE INDEX "Recovery_status_idx" ON "Recovery"("status");

-- CreateIndex
CREATE UNIQUE INDEX "AuditEvent_eventId_key" ON "AuditEvent"("eventId");

-- CreateIndex
CREATE INDEX "AuditEvent_paymentId_idx" ON "AuditEvent"("paymentId");

-- CreateIndex
CREATE INDEX "AuditEvent_eventType_idx" ON "AuditEvent"("eventType");

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recovery" ADD CONSTRAINT "Recovery_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recovery" ADD CONSTRAINT "Recovery_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
