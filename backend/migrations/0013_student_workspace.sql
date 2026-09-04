ALTER TABLE "etudiants" ADD COLUMN IF NOT EXISTS "user_id" uuid REFERENCES "public"."users"("id") ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE "etudiants" ADD COLUMN IF NOT EXISTS "photo_url" text NOT NULL DEFAULT '';
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_etudiants_user_id" ON "etudiants" ("user_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "student_requests" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "etudiant_id" uuid NOT NULL REFERENCES "public"."etudiants"("id") ON DELETE CASCADE,
  "type" text NOT NULL DEFAULT 'libre',
  "titre" text NOT NULL,
  "description" text NOT NULL DEFAULT '',
  "statut" text NOT NULL DEFAULT 'en_attente',
  "reponse" text NOT NULL DEFAULT '',
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_student_requests_etudiant" ON "student_requests" ("etudiant_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_student_requests_statut" ON "student_requests" ("statut");
