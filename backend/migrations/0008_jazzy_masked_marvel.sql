ALTER TABLE "etudiants" ADD COLUMN "archived" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "formateurs" ADD COLUMN "user_id" text;