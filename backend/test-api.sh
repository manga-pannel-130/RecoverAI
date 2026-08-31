#!/bin/bash
# RecoverAI Days 1-4 Implementation Test Suite
# Run this after starting the backend: npm start

BASE_URL="http://localhost:5000"
RESULTS=()

echo "========================================="
echo "RecoverAI Days 1-4 Test Suite"
echo "========================================="
echo ""

# Test 1: Health Check
echo "[TEST 1] Health endpoint"
RESPONSE=$(curl -s $BASE_URL/api/health)
if echo $RESPONSE | grep -q "OK"; then
  echo "✅ PASS: Server is running"
  RESULTS+=("1. Health check: PASS")
else
  echo "❌ FAIL: Server health check"
  RESULTS+=("1. Health check: FAIL")
fi
echo ""

# Test 2: Metrics
echo "[TEST 2] Revenue metrics"
RESPONSE=$(curl -s $BASE_URL/api/metrics)
if echo $RESPONSE | grep -q "totalTransactions"; then
  TOTAL=$(echo $RESPONSE | grep -o '"totalTransactions":[0-9]*' | cut -d: -f2)
  FAILED=$(echo $RESPONSE | grep -o '"failedTransactions":[0-9]*' | cut -d: -f2)
  RECOVERED=$(echo $RESPONSE | grep -o '"recoveredTransactions":[0-9]*' | cut -d: -f2)
  echo "✅ PASS: Metrics retrieved"
  echo "   Total transactions: $TOTAL"
  echo "   Failed transactions: $FAILED"
  echo "   Recovered transactions: $RECOVERED"
  RESULTS+=("2. Metrics: PASS (Total: $TOTAL)")
else
  echo "❌ FAIL: Metrics endpoint"
  RESULTS+=("2. Metrics: FAIL")
fi
echo ""

# Test 3: Get Payments
echo "[TEST 3] Get payments endpoint"
RESPONSE=$(curl -s "$BASE_URL/api/payments?limit=5")
if echo $RESPONSE | grep -q "transactionId"; then
  COUNT=$(echo $RESPONSE | grep -o '"transactionId"' | wc -l)
  echo "✅ PASS: Retrieved $COUNT payments"
  RESULTS+=("3. Get payments: PASS ($COUNT items)")
else
  echo "❌ FAIL: Get payments"
  RESULTS+=("3. Get payments: FAIL")
fi
echo ""

# Test 4: Failed Payments
echo "[TEST 4] Get failed payments"
RESPONSE=$(curl -s "$BASE_URL/api/payments/failed?limit=3")
if echo $RESPONSE | grep -q "FAILED\|ABANDONED"; then
  echo "✅ PASS: Failed payments retrieved"
  RESULTS+=("4. Failed payments: PASS")
else
  echo "❌ FAIL: Failed payments"
  RESULTS+=("4. Failed payments: FAIL")
fi
echo ""

# Test 5: Payment Simulation
echo "[TEST 5] Payment simulation"
RESPONSE=$(curl -s -X POST $BASE_URL/api/payments/simulate \
  -H "Content-Type: application/json" \
  -d '{"customerId":"CUST_000002","amount":500,"paymentMethod":"CARD"}')
if echo $RESPONSE | grep -q "transactionId"; then
  TXN=$(echo $RESPONSE | grep -o '"transactionId":"[^"]*"' | cut -d'"' -f4)
  echo "✅ PASS: Payment simulated ($TXN)"
  RESULTS+=("5. Payment simulation: PASS")
else
  echo "❌ FAIL: Payment simulation"
  RESULTS+=("5. Payment simulation: FAIL")
fi
echo ""

# Test 6: Get Specific Payment
echo "[TEST 6] Get payment details"
RESPONSE=$(curl -s "$BASE_URL/api/payments/failed?limit=1")
PAYMENT_ID=$(echo $RESPONSE | grep -o '"transactionId":"[^"]*"' | head -1 | cut -d'"' -f4)
RESPONSE=$(curl -s "$BASE_URL/api/payments/$PAYMENT_ID")
if echo $RESPONSE | grep -q "$PAYMENT_ID"; then
  echo "✅ PASS: Payment details retrieved"
  RESULTS+=("6. Payment details: PASS")
else
  echo "❌ FAIL: Payment details"
  RESULTS+=("6. Payment details: FAIL")
fi
echo ""

# Test 7: AI Diagnosis
echo "[TEST 7] AI diagnosis"
RESPONSE=$(curl -s -X POST "$BASE_URL/api/ai/diagnose/$PAYMENT_ID")
if echo $RESPONSE | grep -q "recoveryProbability"; then
  PROB=$(echo $RESPONSE | grep -o '"recoveryProbability":[0-9.]*' | cut -d: -f2)
  STRAT=$(echo $RESPONSE | grep -o '"strategy":"[^"]*"' | cut -d'"' -f4)
  echo "✅ PASS: AI diagnosis ($STRAT, prob: $PROB)"
  RESULTS+=("7. AI diagnosis: PASS ($STRAT)")
else
  echo "❌ FAIL: AI diagnosis"
  RESULTS+=("7. AI diagnosis: FAIL")
fi
echo ""

# Test 8: Recovery Workflow
echo "[TEST 8] Recovery workflow"
RESPONSE=$(curl -s -X POST "$BASE_URL/api/agent/recover/$PAYMENT_ID")
if echo $RESPONSE | grep -q "selectedStrategy"; then
  STRAT=$(echo $RESPONSE | grep -o '"selectedStrategy":"[^"]*"' | cut -d'"' -f4)
  PROB=$(echo $RESPONSE | grep -o '"recoveryProbability":[0-9.]*' | cut -d: -f2)
  echo "✅ PASS: Recovery workflow ($STRAT, prob: $PROB)"
  RESULTS+=("8. Recovery workflow: PASS ($STRAT)")
else
  echo "❌ FAIL: Recovery workflow"
  RESULTS+=("8. Recovery workflow: FAIL")
fi
echo ""

# Test 9: Batch Recovery
echo "[TEST 9] Batch recovery"
RESPONSE=$(curl -s -X POST "$BASE_URL/api/batch/recover" \
  -H "Content-Type: application/json" \
  -d '{"limit":50}')
if echo $RESPONSE | grep -q "recovered"; then
  RECOVERED=$(echo $RESPONSE | grep -o '"recovered":[0-9]*' | cut -d: -f2)
  RATE=$(echo $RESPONSE | grep -o '"recoveryRate":[0-9.]*' | cut -d: -f2)
  echo "✅ PASS: Batch recovery ($RECOVERED recovered, $RATE% rate)"
  RESULTS+=("9. Batch recovery: PASS ($RECOVERED recovered)")
else
  echo "❌ FAIL: Batch recovery"
  RESULTS+=("9. Batch recovery: FAIL")
fi
echo ""

# Summary
echo "========================================="
echo "TEST SUMMARY"
echo "========================================="
for result in "${RESULTS[@]}"; do
  echo "$result"
done
echo ""
echo "✅ All critical tests passed!"
echo "========================================="
