CREATE TABLE "seances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" date NOT NULL,
	"debut" text DEFAULT '08:00' NOT NULL,
	"fin" text DEFAULT '09:00' NOT NULL,
	"professeur_id" text DEFAULT '' NOT NULL,
	"module" text NOT NULL,
	"salle" text DEFAULT '' NOT NULL,
	"groupe" text DEFAULT '' NOT NULL,
	"type" text DEFAULT 'cours' NOT NULL,
	"statut" text DEFAULT 'planifie' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teacher_availability" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"teacher_id" text NOT NULL,
	"day_of_week" integer NOT NULL,
	"start_time" text NOT NULL,
	"end_time" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
