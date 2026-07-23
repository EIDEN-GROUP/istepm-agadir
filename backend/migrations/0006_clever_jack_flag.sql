CREATE TABLE "attendance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"seance_id" uuid NOT NULL,
	"etudiant_id" text NOT NULL,
	"present" boolean DEFAULT false NOT NULL,
	"justifie" boolean DEFAULT false NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attendance_session" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"seance_id" uuid NOT NULL,
	"date" date NOT NULL,
	"statut" text DEFAULT 'ouverte' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "attendance_session_seance_id_unique" UNIQUE("seance_id")
);
--> statement-breakpoint
CREATE TABLE "reminders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid,
	"target_type" text DEFAULT 'user' NOT NULL,
	"target_id" text DEFAULT '' NOT NULL,
	"title" text NOT NULL,
	"message" text DEFAULT '' NOT NULL,
	"remind_at" timestamp NOT NULL,
	"sent" boolean DEFAULT false NOT NULL,
	"method" text DEFAULT 'in_app' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
