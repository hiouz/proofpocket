import { getDb } from "@/db";
import { decisionReceipts } from "@/db/schema";
import { getWalrusClient, proofPocketNamespace } from "@/lib/integrations";
import {
  evaluatePayment,
  type MemorySignal,
  type PaymentRequest,
  type PriorRequest,
  type SpendingPolicy,
} from "@/lib/policy";

export const dynamic = "force-dynamic";

function isBoundedText(value: unknown, max: number): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= max;
}

function validPayment(value: unknown): value is PaymentRequest {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return (
    isBoundedText(row.merchant, 160) &&
    isBoundedText(row.resource, 200) &&
    isBoundedText(row.category, 100) &&
    isBoundedText(row.requestId, 160) &&
    typeof row.amountUsd === "number" &&
    Number.isFinite(row.amountUsd) &&
    row.amountUsd > 0 &&
    row.amountUsd <= 10_000
  );
}

function validPolicy(value: unknown): value is SpendingPolicy {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return [
    row.perRequestCapUsd,
    row.dailyCapUsd,
    row.autoApproveMaxUsd,
    row.duplicateWindowMinutes,
    row.spentTodayUsd,
  ].every((item) => typeof item === "number" && Number.isFinite(item) && item >= 0);
}

function memoryText(result: unknown): string[] {
  if (!result || typeof result !== "object") return [];
  const values = (result as { results?: unknown[] }).results;
  if (!Array.isArray(values)) return [];
  return values
    .map((item) => {
      if (typeof item === "string") return item;
      if (!item || typeof item !== "object") return "";
      const row = item as Record<string, unknown>;
      return String(row.text ?? row.content ?? row.memory ?? "");
    })
    .filter(Boolean);
}

function parseWalrusMemory(text: string, index: number): MemorySignal {
  const merchant = text.match(/merchant=([^|]+)/)?.[1]?.trim();
  const approved = text.match(/approved=(true|false)/)?.[1] === "true";
  const kind = text.match(/kind=([^|]+)/)?.[1]?.trim();
  return {
    id: `walrus-${index}`,
    text,
    merchant,
    approved,
    kind: kind === "warning" ? "warning" : "outcome",
    createdAt: new Date().toISOString(),
    source: "walrus-mainnet",
  };
}

export async function POST(request: Request) {
  const payload = (await request.json()) as {
    payment?: PaymentRequest;
    policy?: SpendingPolicy;
    memories?: MemorySignal[];
    priorRequests?: PriorRequest[];
  };

  if (!validPayment(payload.payment) || !validPolicy(payload.policy)) {
    return Response.json({ error: "A valid bounded payment and policy are required" }, { status: 400 });
  }

  let memories = Array.isArray(payload.memories) ? payload.memories.slice(0, 30) : [];
  let memoryMode: "walrus-mainnet" | "session-demo" = "session-demo";
  const walrus = getWalrusClient();
  if (walrus) {
    try {
      const recall = await walrus.recall({
        query: `${payload.payment.merchant} ${payload.payment.category} ${payload.payment.resource}`,
        limit: 8,
        namespace: proofPocketNamespace,
      });
      const liveMemories = memoryText(recall).map(parseWalrusMemory);
      if (liveMemories.length) {
        memories = liveMemories;
        memoryMode = "walrus-mainnet";
      }
    } catch {
      // The decision engine remains available and explicitly reports session-demo evidence.
    }
  }

  const decision = evaluatePayment({
    request: payload.payment,
    policy: payload.policy,
    memories,
    priorRequests: Array.isArray(payload.priorRequests)
      ? payload.priorRequests.slice(0, 100)
      : [],
  });
  const receiptId = crypto.randomUUID();

  let persisted = false;
  try {
    await getDb().insert(decisionReceipts).values({
      id: receiptId,
      requestId: payload.payment.requestId,
      fingerprint: decision.fingerprint,
      merchant: payload.payment.merchant,
      resource: payload.payment.resource,
      amountMicros: Math.round(payload.payment.amountUsd * 1_000_000),
      verdict: decision.verdict,
      riskScore: decision.riskScore,
      reasonsJson: JSON.stringify(decision.reasons),
      memorySource: memoryMode,
      createdAt: new Date().toISOString(),
    });
    persisted = true;
  } catch {
    // D1 is optional in local checks; the response states whether persistence succeeded.
  }

  return Response.json({
    receiptId,
    memoryMode,
    persisted,
    decision,
  });
}
