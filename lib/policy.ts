export type Verdict = "approve" | "review" | "block";

export type PaymentRequest = {
  merchant: string;
  resource: string;
  category: string;
  amountUsd: number;
  requestId: string;
  merchantRisk?: "low" | "medium" | "high";
};

export type SpendingPolicy = {
  perRequestCapUsd: number;
  dailyCapUsd: number;
  autoApproveMaxUsd: number;
  duplicateWindowMinutes: number;
  spentTodayUsd: number;
};

export type MemorySignal = {
  id: string;
  text: string;
  kind: "preference" | "merchant" | "outcome" | "warning";
  merchant?: string;
  approved?: boolean;
  createdAt: string;
  source: "walrus-mainnet" | "session-demo";
};

export type PriorRequest = {
  requestId: string;
  merchant: string;
  resource: string;
  amountUsd: number;
  createdAt: string;
};

export type Decision = {
  verdict: Verdict;
  riskScore: number;
  confidence: number;
  fingerprint: string;
  reasons: string[];
  matchedMemories: MemorySignal[];
  policyChecks: Array<{ label: string; pass: boolean; detail: string }>;
};

const normalize = (value: string) => value.trim().toLowerCase();

export function paymentFingerprint(request: PaymentRequest) {
  return [
    normalize(request.merchant),
    normalize(request.resource),
    request.amountUsd.toFixed(6),
  ].join("|");
}

export function evaluatePayment(input: {
  request: PaymentRequest;
  policy: SpendingPolicy;
  memories: MemorySignal[];
  priorRequests?: PriorRequest[];
  now?: Date;
}): Decision {
  const { request, policy, memories, priorRequests = [] } = input;
  const now = input.now ?? new Date();
  const reasons: string[] = [];
  const checks: Decision["policyChecks"] = [];
  const fingerprint = paymentFingerprint(request);

  const merchant = normalize(request.merchant);
  const matchedMemories = memories.filter((memory) => {
    const memoryMerchant = normalize(memory.merchant ?? "");
    return memoryMerchant === merchant || normalize(memory.text).includes(merchant);
  });
  const positiveHistory = matchedMemories.filter(
    (memory) => memory.approved === true && memory.kind !== "warning",
  );
  const warnings = matchedMemories.filter(
    (memory) => memory.kind === "warning" || memory.approved === false,
  );

  const finiteAmount = Number.isFinite(request.amountUsd) && request.amountUsd > 0;
  checks.push({
    label: "Valid amount",
    pass: finiteAmount,
    detail: finiteAmount ? `$${request.amountUsd.toFixed(2)}` : "Amount must be positive",
  });

  const underRequestCap = finiteAmount && request.amountUsd <= policy.perRequestCapUsd;
  checks.push({
    label: "Per-request cap",
    pass: underRequestCap,
    detail: `$${request.amountUsd.toFixed(2)} / $${policy.perRequestCapUsd.toFixed(2)}`,
  });

  const projectedDaily = policy.spentTodayUsd + Math.max(request.amountUsd || 0, 0);
  const underDailyCap = projectedDaily <= policy.dailyCapUsd;
  checks.push({
    label: "Daily budget",
    pass: underDailyCap,
    detail: `$${projectedDaily.toFixed(2)} projected / $${policy.dailyCapUsd.toFixed(2)}`,
  });

  const duplicateCutoff = now.getTime() - policy.duplicateWindowMinutes * 60_000;
  const duplicate = priorRequests.some((prior) => {
    const same =
      normalize(prior.merchant) === merchant &&
      normalize(prior.resource) === normalize(request.resource) &&
      prior.amountUsd.toFixed(6) === request.amountUsd.toFixed(6);
    return same && new Date(prior.createdAt).getTime() >= duplicateCutoff;
  });
  checks.push({
    label: "Replay shield",
    pass: !duplicate,
    detail: duplicate
      ? `Matching request seen inside ${policy.duplicateWindowMinutes} minutes`
      : "No recent duplicate",
  });

  const highRiskMerchant = request.merchantRisk === "high" || warnings.length > 0;
  checks.push({
    label: "Memory warnings",
    pass: !highRiskMerchant,
    detail: highRiskMerchant
      ? `${Math.max(warnings.length, 1)} blocking signal`
      : `${positiveHistory.length} positive outcomes`,
  });

  let riskScore = 18;
  if (!finiteAmount) riskScore += 82;
  if (!underRequestCap) riskScore += 58;
  if (!underDailyCap) riskScore += 32;
  if (duplicate) riskScore += 72;
  if (request.merchantRisk === "medium") riskScore += 18;
  if (request.merchantRisk === "high") riskScore += 60;
  riskScore += warnings.length * 28;
  riskScore -= Math.min(positiveHistory.length * 11, 33);
  riskScore = Math.max(0, Math.min(100, riskScore));

  let verdict: Verdict = "review";
  if (!finiteAmount || !underRequestCap || duplicate || highRiskMerchant) {
    verdict = "block";
  } else if (
    underDailyCap &&
    request.amountUsd <= policy.autoApproveMaxUsd &&
    positiveHistory.length > 0 &&
    riskScore <= 24
  ) {
    verdict = "approve";
  }

  if (verdict === "approve") {
    reasons.push(
      `Approved within the $${policy.autoApproveMaxUsd.toFixed(2)} autonomy limit.`,
      `${positiveHistory.length} matching positive memory signal${positiveHistory.length === 1 ? "" : "s"}.`,
      "No replay, budget, or merchant-warning rule fired.",
    );
  } else if (verdict === "block") {
    if (duplicate) reasons.push("Blocked as a likely duplicate or retry replay.");
    if (!underRequestCap) reasons.push("Amount exceeds the per-request hard cap.");
    if (!finiteAmount) reasons.push("Amount is invalid.");
    if (highRiskMerchant) reasons.push("Stored outcome history contains a merchant warning.");
  } else {
    reasons.push(
      positiveHistory.length === 0
        ? "First encounter with this merchant requires human review."
        : "The request needs confirmation under the current budget policy.",
      "Approval or rejection can be written back as a future decision memory.",
    );
  }

  return {
    verdict,
    riskScore,
    confidence: Math.max(51, Math.min(98, 66 + matchedMemories.length * 7)),
    fingerprint,
    reasons,
    matchedMemories,
    policyChecks: checks,
  };
}

