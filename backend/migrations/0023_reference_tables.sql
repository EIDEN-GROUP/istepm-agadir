-- Table modules en migration réelle (remplace le CREATE TABLE runtime).
-- Idempotent : ré-exécutable sans risque.
CREATE TABLE IF NOT EXISTS "modules" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "nom" text NOT NULL,
  "filiere" text NOT NULL,
  "code" text,
  "description" text,
  "volume_horaire" integer,
  "coefficient" numeric,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint
-- Référentiel de base : inséré uniquement si la table est vide.
INSERT INTO "modules" ("nom", "filiere")
SELECT m.nom, m.filiere FROM (VALUES
  ('Soins infirmiers en médecine', 'Infirmier polyvalent'),
  ('Hygiène hospitalière', 'Infirmier polyvalent'),
  ('Éthique et déontologie', 'Infirmier polyvalent'),
  ('Pharmacologie', 'Infirmier polyvalent'),
  ('Santé publique', 'Infirmier polyvalent'),
  ('Réanimation et soins intensifs', 'Infirmier en anesthésie-réanimation'),
  ('Anesthésie clinique', 'Infirmier en anesthésie-réanimation'),
  ('Obstétrique', 'Sage-femme'),
  ('Suivi de grossesse', 'Sage-femme'),
  ('Néonatologie', 'Sage-femme'),
  ('Rééducation fonctionnelle', 'Kinésithérapie'),
  ('Électrothérapie', 'Kinésithérapie'),
  ('Techniques de radiologie', 'Radiologie / Imagerie médicale'),
  ('Scanner et IRM', 'Radiologie / Imagerie médicale'),
  ('Radioprotection', 'Radiologie / Imagerie médicale'),
  ('Hématologie', 'Laboratoire / Biologie médicale'),
  ('Biochimie clinique', 'Laboratoire / Biologie médicale'),
  ('Microbiologie', 'Laboratoire / Biologie médicale'),
  ('Anatomie dentaire', 'Prothèse dentaire'),
  ('Prothèse fixe (TP)', 'Prothèse dentaire'),
  ('Occlusodontie', 'Prothèse dentaire')
) AS m(nom, filiere)
WHERE NOT EXISTS (SELECT 1 FROM "modules");
--> statement-breakpoint
-- Référentiel filières : créé uniquement si la clé est absente.
INSERT INTO "settings" ("key", "value")
SELECT 'filieres', '["Infirmier polyvalent", "Infirmier en anesthésie-réanimation", "Sage-femme", "Kinésithérapie", "Radiologie / Imagerie médicale", "Laboratoire / Biologie médicale", "Prothèse dentaire"]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM "settings" WHERE "key" = 'filieres');
