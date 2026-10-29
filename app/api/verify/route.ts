import { tatumRpc } from "@/lib/integrations";

export const dynamic = "force-dynamic";

type SuiTransaction = {
  digest?: string;
  checkpoint?: string;
  timestampMs?: string;
  effects?: { status?: { status?: string; error?: string } };
  balanceChanges?: Array<{
    owner?: { AddressOwner?: string } | string;
    coinType?: string;
    amount?: string;
  }>;
};

export async function POST(request: Request) {
  const { digest, expectedRecipient, expectedAmountMicros } = (await request.json()) as {
    digest?: string;
    expectedRecipient?: string;
    expectedAmountMicros?: number;
  };
  if (!digest || !/^[A-Za-z0-9]{32,80}$/.test(digest)) {
    return Response.json({ error: "A valid Sui transaction digest is required" }, { status: 400 });
  }

  try {
    const tx = await tatumRpc<SuiTransaction>("sui_getTransactionBlock", [
      digest,
      { showEffects: true, showBalanceChanges: true, showInput: true },
    ]);
    const success = tx.effects?.status?.status === "success";
    const recipientChange = tx.balanceChanges?.find((change) => {
      const owner =
        typeof change.owner === "string" ? change.owner : change.owner?.AddressOwner;
      return expectedRecipient ? owner?.toLowerCase() === expectedRecipient.toLowerCase() : false;
    });
    const received = recipientChange ? Number(recipientChange.amount ?? 0) : null;
    const amountMatches =
      expectedAmountMicros === undefined ||
      (received !== null && received >= expectedAmountMicros);

    return Response.json({
      mode: "tatum-mainnet",
      verified: success && (!expectedRecipient || Boolean(recipientChange)) && amountMatches,
      digest: tx.digest ?? digest,
      checkpoint: tx.checkpoint ?? null,
      success,
      recipientMatched: expectedRecipient ? Boolean(recipientChange) : null,
      amountMatched: expectedAmountMicros === undefined ? null : amountMatches,
      coinType: recipientChange?.coinType ?? null,
      receivedBaseUnits: received,
      explorerUrl: `https://suiscan.xyz/mainnet/tx/${encodeURIComponent(digest)}`,
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Verification failed" },
      { status: 502 },
    );
  }
}

