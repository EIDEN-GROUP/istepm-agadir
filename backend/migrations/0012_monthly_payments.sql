CREATE TABLE IF NOT EXISTS "paiements_mensuels" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "etudiant_id" uuid NOT NULL REFERENCES "public"."etudiants"("id") ON DELETE CASCADE,
  "mois" text NOT NULL,
  "montant_du" numeric NOT NULL DEFAULT '0',
  "montant_paye" numeric NOT NULL DEFAULT '0',
  "date_paiement" text,
  "mode" text DEFAULT 'Espèces',
  "recu" text DEFAULT '',
  "statut" text NOT NULL DEFAULT 'impaye',
  "notes" text DEFAULT '',
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "unique_etudiant_mois" ON "paiements_mensuels" ("etudiant_id", "mois");
