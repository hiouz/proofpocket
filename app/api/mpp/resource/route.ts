import { Mppx } from "mppx/nextjs";
import { InMemoryDigestStore, USDC, sui } from "@suimpp/mpp/server";

export const dynamic = "force-dynamic";

const recipient = process.env.SUI_RECIPIENT_ADDRESS;

const handler = recipient
  ? Mppx.create({
      realm: "proofpocket.app",
      methods: [
        sui({
          currency: USDC,
          recipient,
          network: "mainnet",
          store: new InMemoryDigestStore(),
        }),
      ],
    }).charge({ amount: "0.01" })(async () =>
      Response.json({
        resource: "merchant-risk-signal",
        merchant: "atlas-research.network",
        confidence: 0.94,
        signal: "consistent-delivery",
        note: "Paid resource released after Sui settlement verification.",
      }),
    )
  : null;

export async function POST(request: Request) {
  if (!handler) {
    return Response.json(
      {
        mode: "evidence-demo",
        error: "Live MPP settlement is not configured",
        requiredEnvironment: ["SUI_RECIPIENT_ADDRESS"],
        noSettlementClaimed: true,
      },
      { status: 503 },
    );
  }
  return handler(request);
}

