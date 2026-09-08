-- Photo de profil pour tous les comptes (pas seulement les étudiants).
-- Idempotent, ré-exécutable sans risque.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "photo_url" text DEFAULT '' NOT NULL;
