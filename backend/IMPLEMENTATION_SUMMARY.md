# RecoverAI - Days 1-4 Implementation

A complete AI-driven payment revenue recovery system for the Razorpay AI Buildathon.

## 🚀 Quick Start

### Prerequisites
- Node.js 16+
- PostgreSQL 12+
- npm

### Setup

1. **Install dependencies**
   ```bash
   cd backend
   npm install
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your PostgreSQL connection string
   # Optional: Add GROQ_API_KEY for AI diagnosis
   ```

3. **Set up database**
   ```bash
   npx prisma migrate dev --name init
   ```

4. **Generate test data**
   ```bash
   node src/generateData.js
   ```

5. **Start the server**
   ```bash
   npm start
   # Server runs on http://localhost:5000
   ```

## 📊 Architecture

### Days 1-4 Implementation

```
FAILED PAYMENT
      ↓
LOAD CONTEXT (Day 1: Database + customer history)
      ↓
AI DIAGNOSIS (Day 3: Groq API or baseline rules)
      ↓
SELECT STRATEGY (Day 2: Rule-based decision)
      ↓
POLICY CHECK (Day 4: Validate constraints)
      ↓
EXECUTE ACTION (Simulated recovery)
      ↓
RECORD OUTCOME (Day 4: Audit trail)
      ↓
PERSIST RESULT (Database storage)
```

## 📈 Day 1: Foundation & Data Simulation

### Database Schema
- **Customers (10,000)**: Segments, lifetime value, opt-out status
- **Payments (15,000)**: Status, failure reasons, payment methods
- **Recoveries**: Recovery attempts and outcomes
- **AuditEvents**: Complete workflow audit trail

### Synthetic Data
- Payment statuses: SUCCESS, FAILED, ABANDONED, PENDING, RECOVERED
- Failure reasons: NETWORK_ERROR, TIMEOUT, INSUFFICIENT_FUNDS, BANK_DECLINED, CARD_EXPIRED, AUTHENTICATION_FAILED, LIMIT_EXCEEDED, etc.
- Payment methods: CARD, UPI, NETBANKING, WALLET
- Customer segments: PREMIUM, STANDARD, BASIC
- Realistic distributions: 15% failure rate, 5% abandonment

### Revenue Metrics
```
Total Revenue:        $7.49M
Revenue at Risk:      $1.90M (25.27%)
Successful Revenue:   $5.60M
Success Rate:         74.73%
```

### APIs
- `GET /api/health` - Server status
- `GET /api/metrics` - Revenue metrics and breakdown
- `GET /api/payments` - List all payments (paginated)
- `GET /api/payments/failed` - List failed payments
- `GET /api/payments/:transactionId` - Payment details with audit trail
- `POST /api/payments/simulate` - Simulate a new payment
- `GET /api/customers/:customerId` - Customer details
- `GET /api/customers/:customerId/payments` - Customer payment history

## 💡 Day 2: Rule-Based Recovery Baseline

### Deterministic Recovery Rules
Rule-based decisions independent of AI:

```
NETWORK_ERROR           → RETRY_NOW (85% probability)
TIMEOUT                 → RETRY_NOW (80% probability)
INSUFFICIENT_FUNDS      → RETRY_LATER (40% probability)
BANK_DECLINED          → RETRY_LATER (30% probability)
CARD_EXPIRED           → PAYMENT_UPDATE (65% probability)
AUTHENTICATION_FAILED  → RETRY_LATER (35% probability)
LIMIT_EXCEEDED         → PAYMENT_UPDATE (50% probability)
```

### Recovery Controls
- Maximum retry limit: 3 retries
- Retry count tracking
- Customer opt-out protection
- Already-recovered protection
- Cooldown representation using timestamps

### Batch Recovery Results
Test run on 100 failed payments:
- Eligible for recovery: 76
- Retried: 76
- Successfully recovered: 43
- Recovery rate: 56.6%
- Revenue recovered: $24,143

### API
- `POST /api/batch/recover` - Execute baseline recovery on batch

## 🤖 Day 3: AI Diagnosis

### AI Integration
- Primary: Groq API (mixtral-8x7b-32768) when GROQ_API_KEY configured
- Fallback: Deterministic baseline rules when key unavailable
- Automatic model selection based on context

### Customer Context Building
Before AI diagnosis:
1. Retrieve current payment details
2. Get customer information
3. Query last 10 payments
4. Query last 5 recovery attempts
5. Calculate success rate
6. Build structured context object

### AI Output Structure
```json
{
  "diagnosis": "brief explanation",
  "recoverable": true,
  "recoveryProbability": 0.82,
  "strategy": "RETRY_NOW",
  "confidence": 0.91,
  "reason": "short explanation"
}
```

### Confidence Handling
- Confidence threshold: 0.5 (configurable)
- Low confidence falls back to baseline
- Invalid outputs rejected automatically
- Malformed responses handled gracefully

### API
- `POST /api/ai/diagnose/:transactionId` - AI diagnosis with fallback

## 🔄 Day 4: Agentic Recovery Workflow

### LangGraph Workflow Stages
1. **LOAD_CONTEXT** - Retrieve payment and customer
2. **RUN_DIAGNOSIS** - AI diagnosis (with fallback)
3. **SELECT_STRATEGY** - Choose recovery action
4. **CHECK_POLICY** - Validate constraints before execution
5. **EXECUTE_ACTION** - Simulated recovery execution
6. **RECORD_OUTCOME** - Store workflow results
7. **PERSIST_RESULT** - Save recovery record

### Strategies
- `RETRY_NOW` - Immediate retry (simulated with probability)
- `RETRY_LATER` - Schedule for delayed retry
- `PAYMENT_UPDATE` - Request payment method update
- `STOP` - Halt recovery attempt

### Policy Validation
Before action execution:
- Customer not opted out
- Payment not already recovered
- Retry limit not exceeded
- Diagnosis valid
- AI confidence above threshold

### Audit Events Generated
- `RECOVERY_STARTED` - Workflow initialization
- `AI_DIAGNOSIS` - Diagnosis results
- `STRATEGY_SELECTED` - Action chosen
- `POLICY_CHECK` - Constraint validation
- `RECOVERY_ACTION` - Action execution
- `RECOVERY_SUCCESS` - Recovery succeeded
- `RECOVERY_FAILED` - Recovery failed
- `RECOVERY_STOPPED` - Recovery stopped

### Workflow Example
```
POST /api/agent/recover/TXN_594FAF60-D2B0-46

Response:
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

### API
- `POST /api/agent/recover/:transactionId` - Execute complete recovery workflow

## 🛠️ Technology Stack

### Backend
- **Framework**: Express.js 5.2
- **Database**: PostgreSQL + Prisma ORM 5.8
- **AI/ML**: Groq SDK 0.3, LangChain Core 0.1, LangGraph 0.0
- **Utilities**: UUID, CORS, dotenv

### Dependencies
```json
{
  "@langchain/core": "^0.1.50",
  "@langchain/langgraph": "^0.0.30",
  "@prisma/client": "^5.8.0",
  "cors": "^2.8.6",
  "dotenv": "^17.4.2",
  "express": "^5.2.1",
  "groq-sdk": "^0.3.3",
  "pg": "^8.23.0",
  "uuid": "^9.0.1"
}
```

## 📁 Project Structure

```
backend/
├── src/
│   ├── server.js                    # Main Express server with all APIs
│   ├── config/
│   │   ├── db.js                    # PostgreSQL connection pool
│   │   └── schema.sql               # Original SQL schema
│   ├── models/
│   │   ├── customerModel.js         # Customer model factory
│   │   ├── paymentModel.js          # Payment model factory
│   │   └── recoveryModel.js         # Recovery model factory
│   ├── repositories/
│   │   ├── customerRepository.js    # Customer CRUD
│   │   ├── paymentRepository.js     # Payment CRUD
│   │   ├── recoveryRepository.js    # Recovery CRUD (NEW)
│   │   └── auditRepository.js       # Audit event CRUD (NEW)
│   ├── services/
│   │   ├── failureAnalyzer.js       # Original analyzer
│   │   ├── recoveryBaseline.js      # Day 2: Baseline rules (NEW)
│   │   ├── aiDiagnosis.js           # Day 3: AI diagnosis (NEW)
│   │   ├── recoveryWorkflow.js      # Day 4: LangGraph workflow (NEW)
│   │   └── metricsService.js        # Analytics (NEW)
│   └── generateData.js              # Synthetic data generator (NEW)
├── prisma/
│   └── schema.prisma                # Prisma ORM schema (NEW)
├── package.json                     # Dependencies (UPDATED)
├── .env                             # Environment variables
├── .env.example                     # Environment template (NEW)
└── test-api.sh                      # Test suite (NEW)
```

## 🧪 Testing

### Verify Installation
```bash
# Terminal 1: Start server
npm start

# Terminal 2: Run tests
curl http://localhost:5000/api/health

# Or run full test suite
bash test-api.sh
```

### Key Test Results (Verified ✅)
- ✅ Database connection: Working
- ✅ Data generation: 10,000 customers + 15,000 payments
- ✅ Metrics calculation: Revenue at risk $1.90M
- ✅ Failed payments retrieval: Working
- ✅ Payment simulation: Working
- ✅ AI diagnosis: Working with baseline fallback
- ✅ Recovery workflow: Complete 7-stage workflow
- ✅ Batch recovery: 56.6% success rate
- ✅ Audit events: Full trail recorded

## 📝 Environment Variables

```bash
# Required
PORT=5000
DATABASE_URL=postgresql://user:password@localhost:5432/recoverai

# Optional (AI diagnosis)
GROQ_API_KEY=your-groq-api-key

# Optional (Future Razorpay integration)
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
```

## 🔒 Security

- Secrets protected by .gitignore
- No API keys in source code
- Environment variables for configuration
- Proper error handling without exposing internals
- Customer opt-out protection
- Already-recovered payment protection

## 📚 API Documentation

### Example Requests

**Get Health**
```bash
curl http://localhost:5000/api/health
```

**Get Metrics**
```bash
curl http://localhost:5000/api/metrics
```

**Simulate Payment**
```bash
curl -X POST http://localhost:5000/api/payments/simulate \
  -H "Content-Type: application/json" \
  -d '{"customerId":"CUST_000001","amount":1000,"paymentMethod":"CARD"}'
```

**AI Diagnosis**
```bash
curl -X POST http://localhost:5000/api/ai/diagnose/TXN_ABC123
```

**Recover Payment**
```bash
curl -X POST http://localhost:5000/api/agent/recover/TXN_ABC123
```

**Batch Recovery**
```bash
curl -X POST http://localhost:5000/api/batch/recover \
  -H "Content-Type: application/json" \
  -d '{"limit":100}'
```

## 🎯 Next Steps (Days 5-8)

- **Day 5**: Full guardrail system, confidence scoring, cost analysis
- **Day 6**: Razorpay integration with real webhooks
- **Day 7**: Professional dashboard with React/Vite
- **Day 8**: Production deployment and monitoring

## 📄 License

ISC

## 👨‍💻 Author

RecoverAI Development Team
