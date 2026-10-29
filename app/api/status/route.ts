import { integrationMode, getWalrusClient, tatumRpc } from "@/lib/integrations";

export const dynamic = "force-dynamic";

export async function GET() {
  const mode = integrationMode();
  const status = {
    mode: mode.live ? "mainnet" : "evidence-demo",
    checkedAt: new Date().toISOString(),
    walrus: { configured: mode.walrus, healthy: false, detail: "Not configured" },
    tatum: { configured: mode.tatum, healthy: false, detail: "Not configured" },
    payments: {
      configured: mode.payments,
      healthy: mode.payments,
      detail: mode.payments ? "Sui recipient configured" : "Recipient not configured",
    },
  };

  const walrus = getWalrusClient();
  if (walrus) {
    try {
      const health = await walrus.health();
      status.walrus = {
        configured: true,
        healthy: health.status === "ok" || health.status === "healthy",
        detail: `Relayer ${health.version ?? health.relayerVersion ?? "reachable"}`,
      };
    } catch (error) {
      status.walrus = {
        configured: true,
        healthy: false,
        detail: error instanceof Error ? error.message : "Walrus health check failed",
      };
    }
  }

  if (mode.tatum) {
    try {
      const checkpoint = await tatumRpc<string>(
        "sui_getLatestCheckpointSequenceNumber",
        [],
      );
      status.tatum = {
        configured: true,
        healthy: true,
        detail: `Mainnet checkpoint ${checkpoint}`,
      };
    } catch (error) {
      status.tatum = {
        configured: true,
        healthy: false,
        detail: error instanceof Error ? error.message : "Tatum check failed",
      };
    }
  }

  return Response.json(status, {
    headers: { "cache-control": "no-store" },
  });
}

