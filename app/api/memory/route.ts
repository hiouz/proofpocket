import { getWalrusClient, proofPocketNamespace } from "@/lib/integrations";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim();
  if (!query) return Response.json({ error: "Query is required" }, { status: 400 });

  const walrus = getWalrusClient();
  if (!walrus) {
    return Response.json({
      mode: "evidence-demo",
      namespace: proofPocketNamespace,
      memories: [],
      notice: "Walrus credentials are not configured; no Mainnet claim is made.",
    });
  }

  try {
    const result = await walrus.recall({ query, limit: 8, namespace: proofPocketNamespace });
    return Response.json({ mode: "mainnet", namespace: proofPocketNamespace, result });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Recall failed" },
      { status: 502 },
    );
  }
}

export async function POST(request: Request) {
  const payload = (await request.json()) as {
    text?: string;
    merchant?: string;
    approved?: boolean;
    kind?: string;
  };
  if (!payload.text?.trim()) {
    return Response.json({ error: "Memory text is required" }, { status: 400 });
  }

  const walrus = getWalrusClient();
  if (!walrus) {
    return Response.json(
      {
        mode: "evidence-demo",
        stored: false,
        notice: "Walrus credentials are not configured; the memory was not written.",
      },
      { status: 503 },
    );
  }

  const safeMerchant = (payload.merchant ?? "unknown").replace(/[|\n\r]/g, " ").slice(0, 120);
  const safeKind = (payload.kind ?? "outcome").replace(/[|\n\r]/g, " ").slice(0, 40);
  const envelope = [
    "PROOFPOCKET_MEMORY_V1",
    `merchant=${safeMerchant}`,
    `approved=${payload.approved === true}`,
    `kind=${safeKind}`,
    `observed_at=${new Date().toISOString()}`,
    `note=${payload.text.trim().replace(/[\n\r]+/g, " ").slice(0, 800)}`,
  ].join(" | ");

  try {
    const result = await walrus.rememberAndWait(envelope, proofPocketNamespace, {
      timeoutMs: 60_000,
    });
    return Response.json({ mode: "mainnet", stored: true, result });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Memory write failed" },
      { status: 502 },
    );
  }
}

