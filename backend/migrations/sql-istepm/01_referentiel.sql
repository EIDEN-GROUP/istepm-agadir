-- 01_referentiel.sql — filières, modules, niveaux, réglages (idempotent).
-- Prérequis : migrations appliquées.

-- Filières (clé settings, créée si absente).
INSERT INTO "settings" ("key", "value")
SELECT 'filieres', '["Infirmier polyvalent", "Infirmier en anesthésie-réanimation", "Sage-femme", "Kinésithérapie", "Radiologie / Imagerie médicale", "Laboratoire / Biologie médicale", "Prothèse dentaire"]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM "settings" WHERE "key" = 'filieres');

-- Modules (21, insérés uniquement si la table est vide).
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

-- Niveaux S1–S6 (mensualités et effectifs max de démo).
INSERT INTO "levels" ("id", "name", "cycle", "monthly_fee", "max_students") VALUES
  ('04064f91-3d60-4e11-87e5-450e7f890b22', 'S1', 'Licence', 3400, 60),
  ('fd4e8c34-ce5d-47bd-a757-54981937bbc5', 'S2', 'Licence', 3400, 55),
  ('afcc7abc-89db-4a8e-a2e5-21cee132a9aa', 'S3', 'Licence', 3200, 55),
  ('36f94a05-3986-49cc-a5b9-4c06fc418b21', 'S4', 'Licence', 3200, 50),
  ('91bbe569-e546-42ff-b0e9-14f7979f80e2', 'S5', 'Licence', 3500, 45),
  ('87bc5bbe-7580-47fb-8193-bb755c560241', 'S6', 'Licence', 3500, 40)
ON CONFLICT ("name") DO NOTHING;

-- Structures d'accueil (capacités de démo — ajuster en Paramètres).
INSERT INTO "settings" ("key", "value")
SELECT 'structures_accueil', '[
  {"nom": "CHR Hassan II — Agadir", "capacite": 40},
  {"nom": "Hôpital Hassan II — Agadir", "capacite": 30},
  {"nom": "Hôpital préfectoral Inezgane", "capacite": 20},
  {"nom": "Clinique Al Massira — Agadir", "capacite": 15},
  {"nom": "CHU Ibn Rochd — Casablanca", "capacite": 25},
  {"nom": "Clinique Ennakhil — Agadir", "capacite": 10}
]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM "settings" WHERE "key" = 'structures_accueil');

-- Services de stage libres.
INSERT INTO "settings" ("key", "value")
SELECT 'services_stage', '[
  "Bloc opératoire", "Kinésithérapie respiratoire", "Laboratoire d''analyses",
  "Maternité", "Médecine interne", "Réanimation polyvalente",
  "Rééducation fonctionnelle", "Service d''imagerie"
]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM "settings" WHERE "key" = 'services_stage');

-- Créneaux types de l'emploi du temps.
INSERT INTO "settings" ("key", "value")
SELECT 'creneaux', '[
  "08:30 – 10:00", "10:15 – 11:45", "12:00 – 13:30",
  "14:00 – 15:30", "15:45 – 17:15", "17:30 – 19:00"
]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM "settings" WHERE "key" = 'creneaux');

-- Semestres, salles, années universitaires, types d'examen.
INSERT INTO "settings" ("key", "value")
SELECT 'semestres', '["S1", "S2", "S3", "S4", "S5", "S6"]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM "settings" WHERE "key" = 'semestres');

INSERT INTO "settings" ("key", "value")
SELECT 'salles', '[
  "Amphi A", "Amphi B", "Atelier prothèse", "Labo biologie",
  "Labo simulation 2", "Salle 101", "Salle 102", "Salle 103", "Salle 104",
  "Salle 12", "Salle 5", "Salle 9", "Salle de rééducation"
]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM "settings" WHERE "key" = 'salles');

INSERT INTO "settings" ("key", "value")
SELECT 'annees_universitaires', '["2025/2026", "2026/2027"]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM "settings" WHERE "key" = 'annees_universitaires');

INSERT INTO "settings" ("key", "value")
SELECT 'types_examen', '[
  "Contrôle continu", "Évaluation pratique (TP)", "Examen théorique", "Rattrapage"
]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM "settings" WHERE "key" = 'types_examen');

-- Valeurs par défaut de l'écran Paramètres (institut, système, planning…).
INSERT INTO "settings" ("key", "value")
SELECT v.key, to_jsonb(v.value) FROM (VALUES
  ('institut_nom', 'ISTEPM Agadir'),
  ('institut_ville', 'Agadir'),
  ('institut_telephone', '+212 5 28 00 00 00'),
  ('institut_email', 'contact@istpm-agadir.ma'),
  ('systeme_langue', 'Français'),
  ('systeme_devise', 'MAD'),
  ('systeme_fuseau', 'Africa/Casablanca'),
  ('securite_longueurMdp', '8'),
  ('securite_expirationSession', '60'),
  ('planning_joursOuvres', 'Lundi – Samedi'),
  ('planning_heureDebut', '08:00'),
  ('planning_heureFin', '19:00'),
  ('bulletin_bareme', '20'),
  ('bulletin_seuilAdmission', '10'),
  ('bulletin_creditsSemestre', '30')
) AS v(key, value)
WHERE NOT EXISTS (SELECT 1 FROM "settings" s WHERE s."key" = v.key);
