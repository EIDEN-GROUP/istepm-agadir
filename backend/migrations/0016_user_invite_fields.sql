ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "invite_token_hash" text;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "invite_expires_at" timestamp;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "invite_used_at" timestamp;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "invite_cne" text NOT NULL DEFAULT '';
