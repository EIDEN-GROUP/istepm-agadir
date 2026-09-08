CREATE TABLE IF NOT EXISTS "feature_tickets" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "title" text NOT NULL,
  "description" text NOT NULL DEFAULT '',
  "priority" text NOT NULL DEFAULT 'medium',
  "status" text NOT NULL DEFAULT 'open',
  "requested_by" uuid REFERENCES "public"."users"("id") ON DELETE SET NULL,
  "requested_name" text NOT NULL DEFAULT '',
  "requested_email" text NOT NULL DEFAULT '',
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_feature_tickets_status" ON "feature_tickets" ("status");
