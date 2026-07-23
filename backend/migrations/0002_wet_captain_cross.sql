CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"date" date NOT NULL,
	"start_time" text DEFAULT '08:00' NOT NULL,
	"end_time" text DEFAULT '09:00' NOT NULL,
	"all_day" boolean DEFAULT false NOT NULL,
	"type" text DEFAULT 'event' NOT NULL,
	"color" text DEFAULT 'blue' NOT NULL,
	"location" text DEFAULT '' NOT NULL,
	"created_by" text DEFAULT '' NOT NULL,
	"recurrence" jsonb,
	"status" text DEFAULT 'confirmed' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
