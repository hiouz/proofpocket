CREATE TABLE `decision_receipts` (
	`id` text PRIMARY KEY NOT NULL,
	`request_id` text NOT NULL,
	`fingerprint` text NOT NULL,
	`merchant` text NOT NULL,
	`resource` text NOT NULL,
	`amount_micros` integer NOT NULL,
	`verdict` text NOT NULL,
	`risk_score` integer NOT NULL,
	`reasons_json` text NOT NULL,
	`memory_source` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `payment_receipts` (
	`digest` text PRIMARY KEY NOT NULL,
	`payer` text,
	`recipient` text NOT NULL,
	`amount_micros` integer NOT NULL,
	`asset` text NOT NULL,
	`status` text NOT NULL,
	`checkpoint` text,
	`created_at` text NOT NULL
);
