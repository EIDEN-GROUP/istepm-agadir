ALTER TABLE "feature_tickets" ADD COLUMN IF NOT EXISTS "resolution" text NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE "feature_tickets" ADD COLUMN IF NOT EXISTS "resolved_at" timestamp;
