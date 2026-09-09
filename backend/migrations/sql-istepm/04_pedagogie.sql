-- 04_pedagogie.sql — formateurs, examens, bulletins, stages, séances, présences (idempotent).
-- Prérequis : 02_comptes.sql, 03_etudiants.sql.

-- Formateurs (FO_1..FO_8), liaison compte via l'email après insertion.
INSERT INTO "formateurs" ("id", "matricule", "cin", "prenom", "nom", "grade", "departement", "modules", "groupes", "statut", "telephone", "email", "notes_saisies") VALUES
  ('cfa4dcc0-9233-40f8-9420-406b6e6d3ec0', 'ENS-014', 'JB145872', 'Salma', 'El Idrissi', 'PES', 'Infirmier polyvalent', ARRAY['Soins infirmiers en médecine', 'Hygiène hospitalière', 'Éthique et déontologie'], ARRAY['S5-G1', 'S1-B'], 'permanent', '+212 6 61 45 22 10', 's.elidrissi@istpm.ma', 128),
  ('2e65741e-a1d3-4069-8650-529a9287c2fc', 'ENS-021', 'J409231', 'Rachid', 'Benjelloun', 'PES', 'Infirmier en anesthésie-réanimation', ARRAY['Réanimation et soins intensifs', 'Anesthésie clinique'], ARRAY['S5-G1', 'S6-G1'], 'permanent', '+212 6 70 88 41 05', 'r.benjelloun@istpm.ma', 96),
  ('e5f0ec0b-a5f6-4bd4-a5f3-cfa14253ffd1', 'ENS-033', 'JC220514', 'Naima', 'Ait Hammou', 'PES', 'Sage-femme', ARRAY['Obstétrique', 'Suivi de grossesse', 'Néonatologie'], ARRAY['S3-G2', 'S4-G1'], 'permanent', '+212 6 55 30 78 44', 'n.aithammou@istpm.ma', 142),
  ('ccf5695c-0d77-4533-b182-2d3fb48bd4f3', 'ENS-045', 'JE118064', 'Hicham', 'Bouzid', 'vacataire', 'Kinésithérapie', ARRAY['Rééducation fonctionnelle', 'Électrothérapie'], ARRAY['S3-G1', 'S4-G2'], 'vacataire', '+212 6 12 90 34 56', 'h.bouzid@istpm.ma', 54),
  ('91eca196-6555-411e-b371-6cb67a376f3e', 'ENS-052', 'JB302977', 'Loubna', 'Sekkat', 'PES', 'Radiologie / Imagerie médicale', ARRAY['Techniques de radiologie', 'Scanner et IRM', 'Radioprotection'], ARRAY['S6-G1', 'S2-A'], 'en_conge', '+212 6 88 12 44 90', 'l.sekkat@istpm.ma', 71),
  ('ab66e7d1-5bee-46cc-8393-4a91b11b6ac6', 'ENS-060', 'J512403', 'Karim', 'Tahiri', 'formateur_clinique', 'Laboratoire / Biologie médicale', ARRAY['Hématologie', 'Biochimie clinique', 'Microbiologie'], ARRAY['S6-G2', 'S2-B'], 'permanent', '+212 6 33 21 09 87', 'k.tahiri@istpm.ma', 88),
  ('6db6d5c0-286f-4e46-9f4a-557336188dac', 'ENS-068', 'JC176390', 'Amina', 'Rochdi', 'vacataire', 'Prothèse dentaire', ARRAY['Anatomie dentaire', 'Prothèse fixe (TP)', 'Occlusodontie'], ARRAY['S1-A', 'S4-A'], 'vacataire', '+212 6 47 66 21 08', 'a.rochdi@istpm.ma', 42),
  ('fcf84c54-42b6-4200-96c2-aa324f1e9cc9', 'ENS-074', 'JE240815', 'Mustapha', 'El Khattabi', 'formateur_clinique', 'Infirmier polyvalent', ARRAY['Pharmacologie', 'Santé publique'], ARRAY['S5-G1', 'S1-B'], 'permanent', '+212 6 90 55 12 34', 'm.elkhattabi@istpm.ma', 63)
ON CONFLICT ("id") DO UPDATE SET
  "prenom" = EXCLUDED."prenom", "nom" = EXCLUDED."nom", "grade" = EXCLUDED."grade",
  "departement" = EXCLUDED."departement", "statut" = EXCLUDED."statut",
  "notes_saisies" = EXCLUDED."notes_saisies";

UPDATE "formateurs" f SET "user_id" = u."id"::text
FROM "users" u WHERE u."email" = f."email";

-- Examens (EX_1..EX_10).
INSERT INTO "examens" ("id", "module", "filiere", "niveau", "type", "date", "heure", "salle", "surveillants", "statut", "etudiants_convoques", "composante") VALUES
  ('a310d123-dc09-4e4e-9ef3-06a9711b8d32', 'Soins infirmiers en médecine', 'Infirmier polyvalent', 'S5', 'examen_theorique', '2026-07-28', '09:00', 'Amphi A', ARRAY['S. El Idrissi', 'M. El Khattabi'], 'planifie', 32, 'Théorique + Pratique'),
  ('bda640f8-911c-4383-9457-48f1d7afd7a7', 'Réanimation et soins intensifs', 'Infirmier en anesthésie-réanimation', 'S5', 'evaluation_pratique', '2026-07-29', '08:30', 'Labo simulation 2', ARRAY['R. Benjelloun'], 'planifie', 24, 'Pratique'),
  ('83f3e783-8dff-45ee-a49d-e15f1cbd6899', 'Obstétrique', 'Sage-femme', 'S3', 'controle_continu', '2026-07-24', '10:00', 'Salle 12', ARRAY['N. Ait Hammou'], 'en_cours', 28, 'Théorique'),
  ('871025b4-f228-4ce9-8952-6d005caa87dc', 'Rééducation fonctionnelle', 'Kinésithérapie', 'S3', 'evaluation_pratique', '2026-07-22', '14:00', 'Salle de rééducation', ARRAY['H. Bouzid'], 'notes_saisies', 26, 'Pratique'),
  ('2a848563-36b2-487b-925d-d9dcffecbba6', 'Techniques de radiologie', 'Radiologie / Imagerie médicale', 'S6', 'examen_theorique', '2026-07-30', '09:00', 'Amphi B', ARRAY['L. Sekkat', 'K. Tahiri'], 'planifie', 22, 'Théorique + Pratique'),
  ('94f900fc-8356-4ce3-86e2-c37daecba873', 'Hématologie', 'Laboratoire / Biologie médicale', 'S6', 'evaluation_pratique', '2026-07-23', '11:00', 'Labo biologie', ARRAY['K. Tahiri'], 'en_cours', 20, 'Pratique'),
  ('9cc02763-fd4f-42b5-96b2-c8c9fabe3e64', 'Anatomie dentaire', 'Prothèse dentaire', 'S1', 'controle_continu', '2026-07-21', '10:30', 'Salle 5', ARRAY['A. Rochdi'], 'notes_saisies', 30, 'Théorique'),
  ('61f2638e-e1cd-4637-8585-daecd2c985cc', 'Biochimie clinique', 'Laboratoire / Biologie médicale', 'S6', 'rattrapage', '2026-09-08', '09:00', 'Salle 9', ARRAY['K. Tahiri'], 'planifie', 6, 'Théorique + Pratique'),
  ('74bcafd6-b1f7-46f0-948a-7eedb8fd9150', 'Anesthésie clinique', 'Infirmier en anesthésie-réanimation', 'S5', 'examen_theorique', '2026-07-27', '08:30', 'Amphi A', ARRAY['R. Benjelloun', 'S. El Idrissi'], 'planifie', 24, 'Théorique + Pratique'),
  ('421c5e56-ddee-4b6e-bc98-4485ceb7056e', 'Prothèse fixe (TP)', 'Prothèse dentaire', 'S1', 'evaluation_pratique', '2026-07-25', '14:00', 'Atelier prothèse', ARRAY['A. Rochdi'], 'planifie', 30, 'Pratique')
ON CONFLICT ("id") DO UPDATE SET
  "module" = EXCLUDED."module", "statut" = EXCLUDED."statut";

-- Notes d'examen (6).
INSERT INTO "notes_examen" ("examen_id", "etudiant_id", "theorique", "pratique") VALUES
  ('871025b4-f228-4ce9-8952-6d005caa87dc', 'f6e1e450-4a67-4055-87b3-e4ecee79ef15', 12.0, 11.5),
  ('871025b4-f228-4ce9-8952-6d005caa87dc', '9da2260a-1955-4b9a-a531-dbf4e0de4e17', 14.5, 13.5),
  ('9cc02763-fd4f-42b5-96b2-c8c9fabe3e64', '6bb2440a-a63c-4318-a449-8fd0750ba151', 14.0, 12.5),
  ('9cc02763-fd4f-42b5-96b2-c8c9fabe3e64', 'b8810be2-d95c-4935-893b-7560613a27f5', 11.0, 10.5),
  ('94f900fc-8356-4ce3-86e2-c37daecba873', 'cbd915cc-63fa-4649-bd99-822e4ce62adf', 8.5, 9.0),
  ('94f900fc-8356-4ce3-86e2-c37daecba873', '48849675-410d-4b32-8736-2abefb71548a', 9.0, 8.0)
ON CONFLICT ("examen_id", "etudiant_id") DO UPDATE SET
  "theorique" = EXCLUDED."theorique", "pratique" = EXCLUDED."pratique";

-- Bulletins (BU_1..BU_10).
INSERT INTO "bulletins" ("id", "etudiant_id", "cne", "prenom", "nom", "filiere", "niveau", "session", "moyenne", "mention", "decision", "statut", "evaluation_clinique") VALUES
  ('be003b5a-0cd5-43af-9ac5-fb37dff26786', 'a5b0d3e8-7a11-4068-9769-cc9d6b96ed92', 'G134567890', 'Salma', 'El Amrani', 'Infirmier polyvalent', 'S5', 'normale', 14.6, 'Bien', 'Admis', 'valide', 15.5),
  ('b8e00cee-f22d-4dbb-a496-3cdb51cb4aee', '20f78796-a1f0-4feb-8d8c-6ad7b2029616', 'J138245017', 'Youssef', 'Ait Taleb', 'Infirmier en anesthésie-réanimation', 'S5', 'normale', 12.3, 'Assez bien', 'Admis avec dette', 'genere', 13.0),
  ('58936643-1318-4ef3-afa0-4ab521946f58', '22dff638-f698-4d5f-a8c8-a1d4065ab08f', 'F145908712', 'Imane', 'Benkirane', 'Sage-femme', 'S3', 'normale', 15.9, 'Bien', 'Admis', 'publie', 16.0),
  ('0708f22e-1a90-41de-96b2-6e68b6a41c0c', 'f6e1e450-4a67-4055-87b3-e4ecee79ef15', 'M139874521', 'Anas', 'Chafik', 'Kinésithérapie', 'S3', 'normale', 11.2, 'Passable', 'Rattrapage', 'genere', 11.5),
  ('2d5e7d91-203b-4f24-9f97-942a53af1c01', 'aca5d8ba-f8d6-44f7-8ae1-802ea63806e0', 'D141200983', 'Khadija', 'Ouhssaine', 'Radiologie / Imagerie médicale', 'S6', 'normale', 13.7, 'Assez bien', 'Admis', 'valide', 14.0),
  ('dfd7a51e-f728-432a-9256-6beb21cab329', 'cbd915cc-63fa-4649-bd99-822e4ce62adf', 'H137654210', 'Omar', 'Bennani', 'Laboratoire / Biologie médicale', 'S6', 'normale', 9.4, 'Passable', 'Ajourné', 'genere', 9.0),
  ('1ff2d8a8-697d-462a-a3c9-d65951e4cc84', '825c80d9-2618-482f-bb91-339ad54e388b', 'B140095512', 'Hajar', 'Idrissi', 'Sage-femme', 'S4', 'normale', 14.2, 'Bien', 'Admis', 'publie', 14.5),
  ('b10fb8f6-fdcf-40df-a517-fb0203c7672b', '9da2260a-1955-4b9a-a531-dbf4e0de4e17', 'K139001284', 'Zakaria', 'Moutaouakil', 'Kinésithérapie', 'S4', 'normale', 13.9, 'Assez bien', 'Admis', 'valide', 14.0),
  ('5d3ba6d2-ff91-4e0d-891f-88be5f0f88b9', '951bbe10-e88f-4877-a92d-6abee5eddd0c', 'C139887654', 'Bilal', 'Ramdani', 'Prothèse dentaire', 'S4', 'rattrapage', 7.9, 'Passable', 'Ajourné', 'genere', 8.0),
  ('5862ff24-ce88-439d-918e-80e14fd54778', '09061f5a-a301-40bf-9aa0-947867ca6380', 'L138744120', 'Ayoub', 'Naciri', 'Infirmier en anesthésie-réanimation', 'S6', 'normale', 15.4, 'Bien', 'Admis', 'publie', 16.0)
ON CONFLICT ("id") DO UPDATE SET
  "statut" = EXCLUDED."statut", "decision" = EXCLUDED."decision";

-- Stages (ST_1..ST_9).
INSERT INTO "stages" ("id", "etudiant_id", "cne", "prenom", "nom", "filiere", "niveau", "structure", "service", "encadrant_clinique", "tuteur_academique", "debut", "fin", "statut", "convention_signee", "note_soutenance") VALUES
  ('c0fef149-1ee3-4222-ac25-3535b9877c14', 'a5b0d3e8-7a11-4068-9769-cc9d6b96ed92', 'G134567890', 'Salma', 'El Amrani', 'Infirmier polyvalent', 'S5', 'CHR Hassan II — Agadir', 'Médecine interne', 'Dr. A. Bennis (Cadre infirmier)', 'S. El Idrissi', '2026-06-01', '2026-07-31', 'en_cours', true, NULL),
  ('ccbbcba8-5f8e-4e65-b7c1-ed0734a3ff97', '20f78796-a1f0-4feb-8d8c-6ad7b2029616', 'J138245017', 'Youssef', 'Ait Taleb', 'Infirmier en anesthésie-réanimation', 'S5', 'CHR Hassan II — Agadir', 'Bloc opératoire', 'Dr. R. Mansouri (Médecin anesthésiste)', 'R. Benjelloun', '2026-06-01', '2026-07-31', 'en_cours', true, NULL),
  ('67433d0a-99d9-4ba7-ab1b-33092727c278', '22dff638-f698-4d5f-a8c8-a1d4065ab08f', 'F145908712', 'Imane', 'Benkirane', 'Sage-femme', 'S3', 'Hôpital Hassan II — Agadir', 'Maternité', 'Mme F. Oubella (Sage-femme major)', 'N. Ait Hammou', '2026-05-15', '2026-07-15', 'soutenance', true, 16),
  ('62cf60c6-3ecc-4650-ac07-fa25302a20be', 'aca5d8ba-f8d6-44f7-8ae1-802ea63806e0', 'D141200983', 'Khadija', 'Ouhssaine', 'Radiologie / Imagerie médicale', 'S6', 'CHR Hassan II — Agadir', 'Service d''imagerie', 'M. T. Fadel (Manipulateur en chef)', 'L. Sekkat', '2026-04-01', '2026-06-30', 'valide', true, 15),
  ('14e4285b-1eab-4fb8-9791-f5bd59e9620f', 'cbd915cc-63fa-4649-bd99-822e4ce62adf', 'H137654210', 'Omar', 'Bennani', 'Laboratoire / Biologie médicale', 'S6', 'Hôpital Hassan II — Agadir', 'Laboratoire d''analyses', 'Dr. S. Haddad (Biologiste)', 'K. Tahiri', '2026-06-01', '2026-08-31', 'convention_signee', true, NULL),
  ('74c48786-cdd5-464f-b3fa-d937a260736d', '825c80d9-2618-482f-bb91-339ad54e388b', 'B140095512', 'Hajar', 'Idrissi', 'Sage-femme', 'S4', 'Hôpital préfectoral Inezgane', 'Maternité', 'Mme N. Sabil (Sage-femme major)', 'N. Ait Hammou', '2026-06-15', '2026-08-15', 'en_cours', true, NULL),
  ('95613c4b-7384-4eb8-ba0f-4a0ed2f26105', '9da2260a-1955-4b9a-a531-dbf4e0de4e17', 'K139001284', 'Zakaria', 'Moutaouakil', 'Kinésithérapie', 'S4', 'Clinique Al Massira — Agadir', 'Rééducation fonctionnelle', 'M. Y. Ouhadi (Kinésithérapeute chef)', 'H. Bouzid', '2026-07-01', '2026-09-30', 'recherche', false, NULL),
  ('4747acb3-02b5-4a7a-8caf-a3d678ed78eb', '09061f5a-a301-40bf-9aa0-947867ca6380', 'L138744120', 'Ayoub', 'Naciri', 'Infirmier en anesthésie-réanimation', 'S6', 'CHU Ibn Rochd — Casablanca', 'Réanimation polyvalente', 'Pr. H. El Alaoui (Réanimateur)', 'R. Benjelloun', '2026-03-01', '2026-05-31', 'valide', true, 17),
  ('105673e4-b151-4690-9120-5850b85a02b1', 'f6e1e450-4a67-4055-87b3-e4ecee79ef15', 'M139874521', 'Anas', 'Chafik', 'Kinésithérapie', 'S3', 'Clinique Ennakhil — Agadir', 'Kinésithérapie respiratoire', 'M. R. Belmekki (Kinésithérapeute)', 'H. Bouzid', '2026-07-10', '2026-09-10', 'recherche', false, NULL)
ON CONFLICT ("id") DO UPDATE SET
  "statut" = EXCLUDED."statut", "convention_signee" = EXCLUDED."convention_signee",
  "note_soutenance" = EXCLUDED."note_soutenance";

-- Séances (SC_1..SC_10).
INSERT INTO "seances" ("id", "date", "debut", "fin", "professeur_id", "module", "filiere", "salle", "groupe", "type", "statut", "annee_universitaire", "semestre") VALUES
  ('f4d6a9cc-ba53-47b8-bc9f-0606c707f654', '2026-07-21', '08:30', '10:30', 'cfa4dcc0-9233-40f8-9420-406b6e6d3ec0', 'Soins infirmiers en médecine', 'Infirmier polyvalent', 'Salle 101', 'S5-G1', 'cours_magistral', 'termine', '2025/26', 'S5'),
  ('983e6141-5876-41ae-8f7e-fadfba9dfa77', '2026-07-21', '10:45', '12:45', 'e5f0ec0b-a5f6-4bd4-a5f3-cfa14253ffd1', 'Obstétrique', 'Sage-femme', 'Salle 102', 'S3-G2', 'tp', 'termine', '2025/26', 'S3'),
  ('b26249b1-db10-4741-9d02-0054625ff63c', '2026-07-21', '14:00', '16:00', 'ccf5695c-0d77-4533-b182-2d3fb48bd4f3', 'Rééducation fonctionnelle', 'Kinésithérapie', 'Salle de rééducation', 'S3-G1', 'td', 'termine', '2025/26', 'S3'),
  ('eb5ec423-ba0e-42f6-b8f5-4b4194a974b6', '2026-07-22', '08:30', '10:30', '2e65741e-a1d3-4069-8650-529a9287c2fc', 'Anesthésie clinique', 'Infirmier en anesthésie-réanimation', 'Salle 103', 'S5-G1', 'cours_magistral', 'termine', '2025/26', 'S5'),
  ('66c01484-7f32-4bbd-8e35-7a6e2f560e5d', '2026-07-22', '10:45', '12:45', '91eca196-6555-411e-b371-6cb67a376f3e', 'Techniques de radiologie', 'Radiologie / Imagerie médicale', 'Amphi B', 'S6-G1', 'cours_magistral', 'termine', '2025/26', 'S6'),
  ('daeb69a3-2e52-4594-8d44-e439e2078154', '2026-07-22', '14:00', '17:00', 'ab66e7d1-5bee-46cc-8393-4a91b11b6ac6', 'Hématologie', 'Laboratoire / Biologie médicale', 'Labo biologie', 'S6-G2', 'tp', 'en_cours', '2025/26', 'S6'),
  ('e0ab353f-ff93-449f-8580-0e3d3a97820a', '2026-07-23', '08:30', '10:30', '6db6d5c0-286f-4e46-9f4a-557336188dac', 'Prothèse fixe (TP)', 'Prothèse dentaire', 'Atelier prothèse', 'S1-A', 'tp', 'planifie', '2025/26', 'S1'),
  ('7771e1d3-1590-4c24-9525-e8d6a723f1b7', '2026-07-23', '10:45', '12:45', 'fcf84c54-42b6-4200-96c2-aa324f1e9cc9', 'Pharmacologie', 'Infirmier polyvalent', 'Salle 104', 'S5-G1', 'cours_magistral', 'planifie', '2025/26', 'S1'),
  ('32e8a48e-d13e-4f94-9627-423c72d769bc', '2026-07-23', '14:00', '16:00', 'cfa4dcc0-9233-40f8-9420-406b6e6d3ec0', 'Hygiène hospitalière', 'Infirmier polyvalent', 'Salle 101', 'S1-B', 'cours_magistral', 'planifie', '2025/26', 'S1'),
  ('cfdc88ec-d614-4c0c-9a3c-09c0363c9ccf', '2026-07-24', '08:30', '12:00', '2e65741e-a1d3-4069-8650-529a9287c2fc', 'Réanimation et soins intensifs', 'Infirmier en anesthésie-réanimation', 'Labo simulation 2', 'S5-G1', 'tp', 'planifie', '2025/26', 'S5')
ON CONFLICT ("id") DO NOTHING;

-- Sessions d'appel (5) + relevés de présence (8).
INSERT INTO "attendance_session" ("id", "seance_id", "date", "statut") VALUES
  ('83a07622-6c92-4aaa-9160-42a8c2fa4df0', 'f4d6a9cc-ba53-47b8-bc9f-0606c707f654', '2026-07-21', 'termine'),
  ('f10d6843-36d5-43b0-b83d-d20e2b46656d', '983e6141-5876-41ae-8f7e-fadfba9dfa77', '2026-07-21', 'termine'),
  ('f2f3a3a6-5302-4f73-ae03-7f1abb146538', 'b26249b1-db10-4741-9d02-0054625ff63c', '2026-07-21', 'termine'),
  ('bb630574-9dc9-49fc-9f26-b238c0a1ceda', 'eb5ec423-ba0e-42f6-b8f5-4b4194a974b6', '2026-07-22', 'termine'),
  ('77845045-5bd8-4e23-9bd2-558fdc6bebd5', '66c01484-7f32-4bbd-8e35-7a6e2f560e5d', '2026-07-22', 'termine')
ON CONFLICT ("seance_id") DO NOTHING;

INSERT INTO "attendance" ("seance_id", "etudiant_id", "present", "justifie", "note")
SELECT v."seance_id", v."etudiant_id", v."present", v."justifie", v."note"
FROM (VALUES
  ('f4d6a9cc-ba53-47b8-bc9f-0606c707f654', 'a5b0d3e8-7a11-4068-9769-cc9d6b96ed92', true, false, ''),
  ('f4d6a9cc-ba53-47b8-bc9f-0606c707f654', 'b8810be2-d95c-4935-893b-7560613a27f5', false, true, 'Rendez-vous médical'),
  ('983e6141-5876-41ae-8f7e-fadfba9dfa77', '22dff638-f698-4d5f-a8c8-a1d4065ab08f', true, false, ''),
  ('983e6141-5876-41ae-8f7e-fadfba9dfa77', '825c80d9-2618-482f-bb91-339ad54e388b', true, false, ''),
  ('b26249b1-db10-4741-9d02-0054625ff63c', 'f6e1e450-4a67-4055-87b3-e4ecee79ef15', false, false, ''),
  ('b26249b1-db10-4741-9d02-0054625ff63c', '9da2260a-1955-4b9a-a531-dbf4e0de4e17', true, false, ''),
  ('eb5ec423-ba0e-42f6-b8f5-4b4194a974b6', '20f78796-a1f0-4feb-8d8c-6ad7b2029616', true, false, ''),
  ('eb5ec423-ba0e-42f6-b8f5-4b4194a974b6', '09061f5a-a301-40bf-9aa0-947867ca6380', true, false, '')
) AS v("seance_id", "etudiant_id", "present", "justifie", "note")
LEFT JOIN "attendance" a
  ON a."seance_id" = v."seance_id"::uuid AND a."etudiant_id" = v."etudiant_id"
WHERE a."id" IS NULL;

-- Disponibilités enseignants (14).
INSERT INTO "teacher_availability" ("teacher_id", "day_of_week", "start_time", "end_time")
SELECT v."teacher_id", v."day_of_week", v."start_time", v."end_time"
FROM (VALUES
  ('cfa4dcc0-9233-40f8-9420-406b6e6d3ec0', 1, '08:30', '16:30'),
  ('cfa4dcc0-9233-40f8-9420-406b6e6d3ec0', 2, '08:30', '16:30'),
  ('cfa4dcc0-9233-40f8-9420-406b6e6d3ec0', 3, '08:30', '12:30'),
  ('cfa4dcc0-9233-40f8-9420-406b6e6d3ec0', 4, '08:30', '16:30'),
  ('2e65741e-a1d3-4069-8650-529a9287c2fc', 1, '10:00', '18:00'),
  ('2e65741e-a1d3-4069-8650-529a9287c2fc', 3, '08:30', '12:30'),
  ('2e65741e-a1d3-4069-8650-529a9287c2fc', 5, '08:30', '14:00'),
  ('e5f0ec0b-a5f6-4bd4-a5f3-cfa14253ffd1', 2, '08:30', '16:30'),
  ('e5f0ec0b-a5f6-4bd4-a5f3-cfa14253ffd1', 4, '08:30', '12:30'),
  ('ccf5695c-0d77-4533-b182-2d3fb48bd4f3', 1, '14:00', '18:00'),
  ('ccf5695c-0d77-4533-b182-2d3fb48bd4f3', 3, '14:00', '18:00'),
  ('91eca196-6555-411e-b371-6cb67a376f3e', 2, '08:30', '14:00'),
  ('91eca196-6555-411e-b371-6cb67a376f3e', 5, '08:30', '12:30')
) AS v("teacher_id", "day_of_week", "start_time", "end_time")
LEFT JOIN "teacher_availability" t
  ON t."teacher_id" = v."teacher_id"
  AND t."day_of_week" = v."day_of_week"
  AND t."start_time" = v."start_time"
WHERE t."id" IS NULL;
