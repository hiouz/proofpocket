import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const decisionReceipts = sqliteTable("decision_receipts", {
  id: text("id").primaryKey(),
  requestId: text("request_id").notNull(),
  fingerprint: text("fingerprint").notNull(),
  merchant: text("merchant").notNull(),
  resource: text("resource").notNull(),
  amountMicros: integer("amount_micros").notNull(),
  verdict: text("verdict").notNull(),
  riskScore: integer("risk_score").notNull(),
  reasonsJson: text("reasons_json").notNull(),
  memorySource: text("memory_source").notNull(),
  createdAt: text("created_at").notNull(),
});

export const paymentReceipts = sqliteTable("payment_receipts", {
  digest: text("digest").primaryKey(),
  payer: text("payer"),
  recipient: text("recipient").notNull(),
  amountMicros: integer("amount_micros").notNull(),
  asset: text("asset").notNull(),
  status: text("status").notNull(),
  checkpoint: text("checkpoint"),
  createdAt: text("created_at").notNull(),
});
