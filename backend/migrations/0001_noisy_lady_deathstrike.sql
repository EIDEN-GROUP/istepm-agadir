CREATE TABLE "roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"permissions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "roles_name_unique" UNIQUE("name")
);
