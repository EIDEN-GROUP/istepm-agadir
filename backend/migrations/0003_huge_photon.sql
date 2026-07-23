CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"type" text DEFAULT 'info' NOT NULL,
	"title" text NOT NULL,
	"message" text DEFAULT '' NOT NULL,
	"link" text DEFAULT '' NOT NULL,
	"read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
