export async function GET(request: Request) {
  const origin = new URL(request.url).origin;
  return Response.json({
    openapi: "3.1.0",
    info: {
      title: "ProofPocket Agent Payment API",
      version: "1.0.0",
      description: "Memory-governed MPP payment endpoint settled in USDC on Sui.",
    },
    servers: [{ url: origin }],
    paths: {
      "/api/mpp/resource": {
        post: {
          operationId: "buyMerchantRiskSignal",
          summary: "Purchase a merchant risk signal",
          description: "Returns an MPP challenge before releasing the paid resource.",
          responses: {
            "200": { description: "Paid resource" },
            "402": { description: "Payment challenge: Sui USDC via MPP" },
            "503": { description: "Live settlement is not configured" },
          },
          "x-payment-info": { amount: "0.01", currency: "USDC", network: "sui:mainnet" },
        },
      },
    },
  });
}
