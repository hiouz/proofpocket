import { MemWal } from "@mysten-incubation/memwal";

export const proofPocketNamespace = "proofpocket-v1";

export function integrationMode() {
  const walrus = Boolean(
    process.env.MEMWAL_PRIVATE_KEY && process.env.MEMWAL_ACCOUNT_ID,
  );
  const tatum = Boolean(process.env.TATUM_API_KEY);
  const payments = Boolean(process.env.SUI_RECIPIENT_ADDRESS);
  return { walrus, tatum, payments, live: walrus && tatum && payments };
}

export function getWalrusClient() {
  const key = process.env.MEMWAL_PRIVATE_KEY;
  const accountId = process.env.MEMWAL_ACCOUNT_ID;
  if (!key || !accountId) return null;

  return MemWal.create({
    key,
    accountId,
    serverUrl:
      process.env.MEMWAL_SERVER_URL ?? "https://relayer.memory.walrus.xyz",
    namespace: proofPocketNamespace,
    requestTimeoutMs: 30_000,
    recallTimeoutMs: 15_000,
  });
}

export async function tatumRpc<T>(method: string, params: unknown[]): Promise<T> {
  const apiKey = process.env.TATUM_API_KEY;
  if (!apiKey) throw new Error("TATUM_API_KEY is not configured");

  const response = await fetch("https://sui-mainnet.gateway.tatum.io", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify({ jsonrpc: "2.0", id: "proofpocket", method, params }),
  });

  const payload = (await response.json()) as {
    result?: T;
    error?: { code?: number; message?: string };
  };
  if (!response.ok || payload.error || payload.result === undefined) {
    throw new Error(payload.error?.message ?? `Tatum RPC returned ${response.status}`);
  }
  return payload.result;
}

