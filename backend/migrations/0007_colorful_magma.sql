ALTER TABLE "etudiants" ADD COLUMN "paiements_mensuels" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "examens" ADD COLUMN "groupe" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "examens" ADD COLUMN "duree" integer DEFAULT 120 NOT NULL;--> statement-breakpoint
ALTER TABLE "examens" ADD COLUMN "description" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "examens" ADD COLUMN "created_by" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "historique_paiements" ADD COLUMN "mois" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "notes_etudiant" ADD COLUMN "examen" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "seances" ADD COLUMN "filiere" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "seances" ADD COLUMN "annee_universitaire" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "seances" ADD COLUMN "semestre" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "seances" ADD COLUMN "notes" text DEFAULT '' NOT NULL;