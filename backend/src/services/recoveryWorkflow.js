// Day 4 - LangGraph-based Recovery Workflow
// Orchestrates the complete recovery process

const { StateGraph, START, END } = require("@langchain/langgraph");
const { PrismaClient } = require("@prisma/client");
const { diagnosisPaymentFailure } = require("./aiDiagnosis");
const {
  validateRecoveryConstraints,
  calculateExpectedRecoveryValue
} = require("./recoveryBaseline");
const {
  createRecovery,
  updateRecoveryStatus
} = require("../repositories/recoveryRepository");
const {
  createAuditEvent
} = require("../repositories/auditRepository");

const prisma = new PrismaClient();

class RecoveryWorkflow {
  constructor() {
    this.graph = this.buildGraph();
  }

  buildGraph() {
    const graph = new StateGraph({
      channels: {
        paymentId: {},
        payment: {},
        customer: {},
        diagnosisData: {},
        strategy: {},
        policyCheckResult: {},
        actionResult: {},
        outcome: {},
        error: {}
      }
    });

    graph.addNode("load_context", this.nodeContext.bind(this));
    graph.addNode("run_diagnosis", this.nodeDiagnosis.bind(this));
    graph.addNode("select_strategy", this.nodeStrategy.bind(this));
    graph.addNode("check_policy", this.nodePolicyCheck.bind(this));
    graph.addNode("execute_action", this.nodeAction.bind(this));
    graph.addNode("record_outcome", this.nodeOutcome.bind(this));
    graph.addNode("persist_result", this.nodePersist.bind(this));

    graph.addEdge(START, "load_context");
    graph.addEdge("load_context", "run_diagnosis");
    graph.addEdge("run_diagnosis", "select_strategy");
    graph.addEdge("select_strategy", "check_policy");

    graph.addConditionalEdges(
      "check_policy",
      (state) => (state.policyCheckResult?.allowed ? "execute_action" : "persist_result"),
      {
        execute_action: "execute_action",
        persist_result: "persist_result"
      }
    );

    graph.addEdge("execute_action", "record_outcome");
    graph.addEdge("record_outcome", "persist_result");
    graph.addEdge("persist_result", END);

    return graph.compile();
  }

  async nodeContext(state) {
    const paymentId = state.paymentId;

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId }
    });

    if (!payment) {
      return {
        ...state,
        error: `Payment not found: ${paymentId}`
      };
    }

    const customer = await prisma.customer.findUnique({
      where: { id: payment.customerId }
    });

    if (!customer) {
      return {
        ...state,
        error: `Customer not found for payment ${paymentId}`
      };
    }

    await createAuditEvent({
      paymentId,
      eventType: "RECOVERY_STARTED",
      description: `Recovery workflow initiated for transaction ${payment.transactionId}`,
      agent: "WORKFLOW"
    });

    return {
      ...state,
      payment,
      customer
    };
  }

  async nodeDiagnosis(state) {
    if (state.error) {
      return state;
    }

    try {
      const diagnosis = await diagnosisPaymentFailure(state.payment.id);

      await createAuditEvent({
        paymentId: state.payment.id,
        eventType: "AI_DIAGNOSIS",
        description: `AI diagnosis performed: ${diagnosis.strategy}`,
        metadata: {
          source: diagnosis.source,
          probability: diagnosis.recoveryProbability,
          confidence: diagnosis.confidence
        },
        agent: "AI_DIAGNOSIS"
      });

      return {
        ...state,
        diagnosisData: diagnosis
      };
    } catch (error) {
      return {
        ...state,
        error: `Diagnosis failed: ${error.message}`
      };
    }
  }

  async nodeStrategy(state) {
    if (state.error || !state.diagnosisData) {
      return state;
    }

    const expectedRecoveryValue = calculateExpectedRecoveryValue(
      state.payment,
      state.diagnosisData.recoveryProbability
    );

    const strategy = {
      selectedAction: state.diagnosisData.strategy,
      probability: state.diagnosisData.recoveryProbability,
      confidence: state.diagnosisData.confidence,
      expectedRecoveryValue,
      reasoning: state.diagnosisData.reason
    };

    await createAuditEvent({
      paymentId: state.payment.id,
      eventType: "STRATEGY_SELECTED",
      description: `Strategy selected: ${strategy.selectedAction}`,
      metadata: {
        probability: strategy.probability,
        confidence: strategy.confidence,
        expectedRecoveryValue: strategy.expectedRecoveryValue
      },
      agent: "STRATEGY_ENGINE"
    });

    return {
      ...state,
      strategy
    };
  }

  async nodePolicyCheck(state) {
    if (state.error || !state.strategy) {
      return state;
    }

    const constraints = validateRecoveryConstraints(
      state.payment,
      state.customer
    );

    const confidenceThreshold = 0.5;
    const confidenceOk =
      state.strategy.confidence >= confidenceThreshold;

    const allowed = constraints.length === 0 && confidenceOk;

    const reason = constraints.length > 0 ? constraints[0] : 
                   !confidenceOk ? `Confidence ${state.strategy.confidence} below threshold ${confidenceThreshold}` :
                   null;

    await createAuditEvent({
      paymentId: state.payment.id,
      eventType: "POLICY_CHECK",
      description: allowed ? "Policy check passed" : "Policy check failed",
      metadata: {
        allowed,
        constraints,
        reason
      },
      agent: "POLICY_ENGINE"
    });

    return {
      ...state,
      policyCheckResult: {
        allowed,
        constraints,
        reason
      }
    };
  }

  async nodeAction(state) {
    if (state.error || !state.policyCheckResult?.allowed) {
      return state;
    }

    const strategy = state.strategy.selectedAction;
    let actionResult = {
      strategy,
      status: "UNKNOWN"
    };

    if (strategy === "RETRY_NOW") {
      // Simulate immediate retry
      const success = Math.random() < state.strategy.probability;
      actionResult = {
        strategy,
        status: success ? "SUCCESS" : "FAILED",
        simulated: true,
        description: success ? "Simulated retry succeeded" : "Simulated retry failed"
      };
    } else if (strategy === "RETRY_LATER") {
      // Schedule for later retry
      actionResult = {
        strategy,
        status: "SCHEDULED",
        simulated: true,
        retryScheduledAt: new Date(Date.now() + 3600000) // 1 hour later
      };
    } else if (strategy === "PAYMENT_UPDATE") {
      // Record payment update request
      actionResult = {
        strategy,
        status: "PENDING_UPDATE",
        simulated: true,
        description: "Customer notified to update payment method"
      };
    } else if (strategy === "STOP") {
      actionResult = {
        strategy,
        status: "STOPPED",
        simulated: true,
        description: "Recovery stopped per policy"
      };
    }

    await createAuditEvent({
      paymentId: state.payment.id,
      eventType: "RECOVERY_ACTION",
      description: `Action executed: ${strategy}`,
      metadata: actionResult,
      agent: "ACTION_ENGINE"
    });

    return {
      ...state,
      actionResult
    };
  }

  async nodeOutcome(state) {
    if (state.error || !state.actionResult) {
      return state;
    }

    let recoveredAmount = 0;
    let paymentStatus = state.payment.status;

    if (state.actionResult.status === "SUCCESS") {
      recoveredAmount = state.payment.amount;
      paymentStatus = "RECOVERED";

      // Update payment status
      await prisma.payment.update({
        where: { id: state.payment.id },
        data: {
          status: paymentStatus,
          recovered: true,
          recoveredAmount
        }
      });

      await createAuditEvent({
        paymentId: state.payment.id,
        eventType: "RECOVERY_SUCCESS",
        description: `Payment recovered successfully`,
        metadata: {
          recoveredAmount,
          strategy: state.actionResult.strategy
        },
        agent: "OUTCOME_ENGINE"
      });
    } else if (
      state.actionResult.status === "FAILED" ||
      state.actionResult.status === "SCHEDULED" ||
      state.actionResult.status === "PENDING_UPDATE"
    ) {
      await createAuditEvent({
        paymentId: state.payment.id,
        eventType: "RECOVERY_PENDING",
        description: `Recovery in progress: ${state.actionResult.status}`,
        metadata: state.actionResult,
        agent: "OUTCOME_ENGINE"
      });
    }

    const outcome = {
      selectedStrategy: state.strategy.selectedAction,
      recoveryProbability: state.strategy.probability,
      confidence: state.strategy.confidence,
      expectedRecoveryValue: state.strategy.expectedRecoveryValue,
      actionStatus: state.actionResult.status,
      recoveredAmount,
      finalPaymentStatus: paymentStatus
    };

    return {
      ...state,
      outcome
    };
  }

  async nodePersist(state) {
    if (state.error) {
      await createAuditEvent({
        paymentId: state.paymentId,
        eventType: "RECOVERY_ERROR",
        description: `Recovery workflow error: ${state.error}`,
        agent: "WORKFLOW",
        result: "FAILED"
      });

      return state;
    }

    if (!state.strategy) {
      return state;
    }

    // Create recovery record
    const recovery = await createRecovery({
      paymentId: state.payment.id,
      customerId: state.customer.id,
      diagnosis: state.diagnosisData.diagnosis,
      recoveryProbability: state.strategy.probability,
      confidence: state.strategy.confidence,
      expectedRecoveryValue: state.strategy.expectedRecoveryValue,
      recommendedAction: state.strategy.selectedAction,
      actualAction: state.actionResult?.strategy,
      status:
        state.outcome?.actionStatus === "SUCCESS"
          ? "SUCCESS"
          : state.outcome?.actionStatus === "SCHEDULED"
            ? "PENDING"
            : "FAILED",
      recoveredAmount: state.outcome?.recoveredAmount || 0,
      reason: state.diagnosisData.reason
    });

    return {
      ...state,
      recovery
    };
  }

  async execute(paymentId) {
    try {
      const result = await this.graph.invoke({
        paymentId
      });

      return result;
    } catch (error) {
      console.error("Workflow execution error:", error);
      throw error;
    }
  }
}

module.exports = {
  RecoveryWorkflow
};
