CREATE TABLE "inscription_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"prenom" text NOT NULL,
	"nom" text NOT NULL,
	"telephone" text DEFAULT '' NOT NULL,
	"email" text DEFAULT '' NOT NULL,
	"filiere" text DEFAULT '' NOT NULL,
	"niveau" text DEFAULT '' NOT NULL,
	"message" text DEFAULT '' NOT NULL,
	"statut" text DEFAULT 'en_attente' NOT NULL,
	"reponse" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rendez_vous" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"inscription_id" uuid NOT NULL,
	"date" text NOT NULL,
	"heure" text DEFAULT '' NOT NULL,
	"message" text DEFAULT '' NOT NULL,
	"created_by" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "rendez_vous" ADD CONSTRAINT "rendez_vous_inscription_id_inscription_requests_id_fk" FOREIGN KEY ("inscription_id") REFERENCES "public"."inscription_requests"("id") ON DELETE cascade ON UPDATE no action;