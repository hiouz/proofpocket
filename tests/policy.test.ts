import assert from "node:assert/strict";
import test from "node:test";
import { evaluatePayment, type MemorySignal, type PaymentRequest } from "../lib/policy";

const payment: PaymentRequest = {
  merchant: "atlas-research.network",
  resource: "brief-001",
  category: "Research data",
  amountUsd: 0.4,
  requestId: "req-1",
  merchantRisk: "low",
};

const policy = {
  perRequestCapUsd: 3,
  dailyCapUsd: 12,
  autoApproveMaxUsd: 0.75,
  duplicateWindowMinutes: 30,
  spentTodayUsd: 1.2,
};

const positiveMemory: MemorySignal = {
  id: "memory-1",
  text: "atlas-research.network delivered the resource successfully",
  merchant: "atlas-research.network",
  kind: "outcome",
  approved: true,
  createdAt: "2026-10-22T00:00:00.000Z",
  source: "session-demo",
};

test("new merchant requires review", () => {
  const result = evaluatePayment({ request: payment, policy, memories: [] });
  assert.equal(result.verdict, "review");
});

test("positive history can auto-approve a bounded request", () => {
  const result = evaluatePayment({ request: payment, policy, memories: [positiveMemory] });
  assert.equal(result.verdict, "approve");
  assert.ok(result.riskScore <= 24);
});

test("duplicate is blocked even when merchant memory is positive", () => {
  const result = evaluatePayment({
    request: payment,
    policy,
    memories: [positiveMemory],
    priorRequests: [{
      requestId: "prior",
      merchant: payment.merchant,
      resource: payment.resource,
      amountUsd: payment.amountUsd,
      createdAt: "2026-10-22T09:55:00.000Z",
    }],
    now: new Date("2026-10-22T10:00:00.000Z"),
  });
  assert.equal(result.verdict, "block");
  assert.match(result.reasons.join(" "), /duplicate|replay/i);
});

test("hard cap cannot be overridden by memory", () => {
  const result = evaluatePayment({
    request: { ...payment, amountUsd: 8 },
    policy,
    memories: [positiveMemory, positiveMemory, positiveMemory],
  });
  assert.equal(result.verdict, "block");
  assert.ok(result.policyChecks.some((check) => check.label === "Per-request cap" && !check.pass));
});

