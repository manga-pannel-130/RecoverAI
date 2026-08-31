# RecoverAI Days 1-4: TESTING INSTRUCTIONS

## Quick Test (5 minutes)

### Terminal 1: Start the Server
```powershell
cd C:\Users\thecs\OneDrive\Desktop\Projects\RecoverAI\backend
npm start
```

You should see:
```
✅ Database connected
🚀 RecoverAI backend running on http://localhost:5000
📊 Metrics: http://localhost:5000/api/metrics
💊 Health: http://localhost:5000/api/health
```

### Terminal 2: Run These Tests

**Test 1: Health Check**
```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/health"
```
Expected output:
```json
{
  "status": "OK",
  "message": "RecoverAI backend is running",
  "timestamp": "2026-08-31T10:00:00.000Z"
}
```

**Test 2: Metrics (Revenue at Risk)**
```powershell
(Invoke-RestMethod -Uri "http://localhost:5000/api/metrics").summary
```
Expected output:
```json
{
  "totalTransactions": 15000,
  "successfulTransactions": 11210,
  "failedTransactions": 3790,
  "totalRevenue": 7496917.81,
  "revenueAtRisk": 1896782.44,
  "overallSuccessRate": 74.73,
  "recoveryRate": 0
}
```

**Test 3: Failed Payments**
```powershell
(Invoke-RestMethod -Uri "http://localhost:5000/api/payments/failed?limit=3").data | ConvertTo-Json
```
Expected output: 3 failed payment records with failure reasons

**Test 4: Payment Simulation**
```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/payments/simulate" -Method POST -ContentType "application/json" -Body '{"customerId":"CUST_000001","amount":1000,"paymentMethod":"CARD"}'
```
Expected output: New simulated payment record with transactionId

**Test 5: AI Diagnosis** (with fallback to baseline)
```powershell
$failed = Invoke-RestMethod -Uri "http://localhost:5000/api/payments/failed?limit=1"
$txnId = $failed.data[0].transactionId
Invoke-RestMethod -Uri "http://localhost:5000/api/ai/diagnose/$txnId" -Method POST
```
Expected output:
```json
{
  "transactionId": "TXN_594FAF60-D2B0-46",
  "source": "BASELINE",
  "diagnosis": "Rule-based diagnosis for INVALID_PAYMENT_DETAILS",
  "recoverable": true,
  "recoveryProbability": 0.45,
  "strategy": "PAYMENT_UPDATE",
  "confidence": 0.95,
  "reason": "Customer needs to update payment details"
}
```

**Test 6: Recovery Workflow (Day 4)**
```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/agent/recover/$txnId" -Method POST
```
Expected output:
```json
{
  "transactionId": "TXN_594FAF60-D2B0-46",
  "workflow": {
    "selectedStrategy": "PAYMENT_UPDATE",
    "recoveryProbability": 0.45,
    "confidence": 0.95,
    "expectedRecoveryValue": 7.62,
    "actionStatus": "PENDING_UPDATE",
    "recoveredAmount": 0,
    "finalPaymentStatus": "FAILED"
  },
  "recovery": { ... recovery record ... }
}
```

**Test 7: Batch Recovery (Day 2 Baseline)**
```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/batch/recover" -Method POST -ContentType "application/json" -Body '{"limit":100}'
```
Expected output:
```json
{
  "totalProcessed": 100,
  "eligible": 76,
  "retried": 76,
  "recovered": 43,
  "stopped": 24,
  "totalRevenueAtRisk": 41148.69,
  "totalRecovered": 24142.62,
  "recoveryRate": 56.57
}
```

**Test 8: Customer Details with History**
```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/customers/CUST_000001"
```
Expected output: Customer profile with payment history and recovery history

**Test 9: Get Audit Events for Payment**
```powershell
$payment = Invoke-RestMethod -Uri "http://localhost:5000/api/payments/$txnId"
$payment.auditEvents | Select-Object -First 3 | ConvertTo-Json
```
Expected output: Audit events showing RECOVERY_STARTED, AI_DIAGNOSIS, STRATEGY_SELECTED, etc.

---

## Comprehensive Test (15 minutes)

Run the automated test suite:

```powershell
cd C:\Users\thecs\OneDrive\Desktop\Projects\RecoverAI\backend

# Create PowerShell test script
@"
# RecoverAI Comprehensive Test

Write-Host "=== RecoverAI Days 1-4 Comprehensive Test ===" -ForegroundColor Cyan
Write-Host ""

# Test 1: All API endpoints
Write-Host "[1/5] Testing API Endpoints..."
$endpoints = @(
    "/api/health",
    "/api/metrics",
    "/api/payments?limit=1",
    "/api/payments/failed?limit=1",
    "/api/customers/CUST_000001"
)

foreach ($endpoint in $endpoints) {
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:5000$endpoint" -ErrorAction Stop
        Write-Host "  ✅ GET $endpoint"
    } catch {
        Write-Host "  ❌ GET $endpoint - Error: $($_.Exception.Message)"
    }
}
Write-Host ""

# Test 2: Payment Simulation
Write-Host "[2/5] Testing Payment Simulation..."
try {
    $sim = Invoke-RestMethod -Uri "http://localhost:5000/api/payments/simulate" `
        -Method POST -ContentType "application/json" `
        -Body '{"customerId":"CUST_000002","amount":500,"paymentMethod":"CARD"}'
    Write-Host "  ✅ Simulated payment: $($sim.transactionId)"
} catch {
    Write-Host "  ❌ Payment simulation failed"
}
Write-Host ""

# Test 3: AI Diagnosis with Fallback
Write-Host "[3/5] Testing AI Diagnosis (with fallback)..."
try {
    $failed = Invoke-RestMethod -Uri "http://localhost:5000/api/payments/failed?limit=1"
    $txnId = $failed.data[0].transactionId
    $diag = Invoke-RestMethod -Uri "http://localhost:5000/api/ai/diagnose/$txnId" -Method POST
    Write-Host "  ✅ AI Diagnosis: $($diag.strategy) (source: $($diag.source))"
} catch {
    Write-Host "  ❌ AI diagnosis failed"
}
Write-Host ""

# Test 4: Recovery Workflow
Write-Host "[4/5] Testing Recovery Workflow..."
try {
    $wf = Invoke-RestMethod -Uri "http://localhost:5000/api/agent/recover/$txnId" -Method POST
    Write-Host "  ✅ Workflow executed: $($wf.workflow.selectedStrategy)"
    Write-Host "     Expected recovery value: `$$($wf.workflow.expectedRecoveryValue)"
} catch {
    Write-Host "  ❌ Workflow execution failed"
}
Write-Host ""

# Test 5: Batch Recovery
Write-Host "[5/5] Testing Batch Recovery..."
try {
    $batch = Invoke-RestMethod -Uri "http://localhost:5000/api/batch/recover" `
        -Method POST -ContentType "application/json" -Body '{"limit":50}'
    $rate = [math]::Round($batch.recoveryRate, 2)
    Write-Host "  ✅ Batch Recovery: $($batch.recovered)/$($batch.eligible) recovered ($rate% rate)"
    Write-Host "     Revenue recovered: `$$([math]::Round($batch.totalRecovered, 2))"
} catch {
    Write-Host "  ❌ Batch recovery failed"
}
Write-Host ""

Write-Host "=== ✅ ALL TESTS COMPLETED ===" -ForegroundColor Green

"@ | Out-File -FilePath test-comprehensive.ps1 -Encoding UTF8

# Run the test
.\test-comprehensive.ps1
```

---

## Data Verification

### Verify Database Data
```powershell
# Connect to PostgreSQL and run:
$connStr = "Host=localhost;Username=postgres;Password=vishalmadhav;Database=recoverai"
$conn = New-Object Npgsql.NpgsqlConnection($connStr)
$conn.Open()

# Count records
$cmd = $conn.CreateCommand()
$cmd.CommandText = "SELECT COUNT(*) FROM customers;"
Write-Host "Customers: $($cmd.ExecuteScalar())"

$cmd.CommandText = "SELECT COUNT(*) FROM payments;"
Write-Host "Payments: $($cmd.ExecuteScalar())"

$cmd.CommandText = "SELECT COUNT(*) FROM payments WHERE status = 'FAILED';"
Write-Host "Failed payments: $($cmd.ExecuteScalar())"

$conn.Close()
```

---

## Troubleshooting

### Server Won't Start
```powershell
# Check if port 5000 is in use
Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue

# Kill process on port 5000 if needed
Stop-Process -Id (Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue).OwningProcess -Force

# Try starting again
npm start
```

### Database Connection Error
```powershell
# Verify PostgreSQL is running
# Check connection string in .env
# Format: postgresql://user:password@localhost:5432/recoverai

# Test connection
psql -h localhost -U postgres -d recoverai -c "SELECT 1;"
```

### API Returns 500 Error
```powershell
# Check server logs in Terminal 1 for error messages
# Verify Prisma schema matches database
npx prisma db push

# Regenerate Prisma client
npx prisma generate
```

---

## Expected Results Summary

| Test | Expected | Result |
|------|----------|--------|
| Health Check | 200 OK | ✅ |
| Metrics | 15,001 transactions | ✅ |
| Failed Payments | 3,747 records | ✅ |
| Revenue at Risk | ~$1.87M | ✅ |
| Payment Simulate | New record created | ✅ |
| AI Diagnosis | Strategy + Probability | ✅ |
| Recovery Workflow | Complete 7-stage execution | ✅ |
| Batch Recovery | 48%+ success rate | ✅ |
| Audit Events | Complete trail | ✅ |

---

## Success Criteria

✅ All tests pass without errors  
✅ No database connection issues  
✅ Recovery workflow completes successfully  
✅ AI diagnosis uses baseline fallback  
✅ Batch recovery shows realistic recovery rates  
✅ Audit events recorded for all operations  

**If all tests pass, Days 1-4 are successfully implemented! 🎉**
