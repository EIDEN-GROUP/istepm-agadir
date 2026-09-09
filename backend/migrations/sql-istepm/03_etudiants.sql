-- 03_etudiants.sql — 14 étudiants, 38 notes, 30 lignes d'historique (idempotent).
-- Prérequis : 02_comptes.sql (aucune FK vers users requise, user_id reste NULL :
-- lier les comptes via Paramètres › Utilisateurs ou le flux d'invitation).

-- Conventions d'UUID : ET_1..ET_14 (voir README).
INSERT INTO "etudiants" ("id", "cne", "matricule", "prenom", "nom", "filiere", "niveau", "annee", "groupe", "statut", "paiement", "moyenne", "telephone", "email", "date_naissance", "ville", "frais_annuels", "reste_a_payer") VALUES
  ('a5b0d3e8-7a11-4068-9769-cc9d6b96ed92', 'G134567890', 'ISTPM-23-0142', 'Salma', 'El Amrani', 'Infirmier polyvalent', 'S5', '3e année', 'G1', 'inscrit', 'paye', 14.6, '+212 6 61 24 55 018', 'salma.elamrani@istpm.ma', '2003-04-12', 'Agadir', 34000, 0),
  ('20f78796-a1f0-4feb-8d8c-6ad7b2029616', 'J138245017', 'ISTPM-23-0155', 'Youssef', 'Ait Taleb', 'Infirmier en anesthésie-réanimation', 'S5', '3e année', 'G1', 'inscrit', 'retard', 12.3, '+212 6 70 11 42 88', 'y.aittaleb@istpm.ma', '2002-11-30', 'Inezgane', 38000, 13000),
  ('22dff638-f698-4d5f-a8c8-a1d4065ab08f', 'F145908712', 'ISTPM-24-0203', 'Imane', 'Benkirane', 'Sage-femme', 'S3', '2e année', 'G2', 'inscrit', 'paye', 15.9, '+212 6 55 78 90 12', 'i.benkirane@istpm.ma', '2004-02-18', 'Agadir', 32000, 0),
  ('f6e1e450-4a67-4055-87b3-e4ecee79ef15', 'M139874521', 'ISTPM-24-0211', 'Anas', 'Chafik', 'Kinésithérapie', 'S3', '2e année', 'G1', 'inscrit', 'en_attente', 11.2, '+212 6 12 34 56 78', 'a.chafik@istpm.ma', '2003-07-05', 'Taroudant', 33000, 16500),
  ('aca5d8ba-f8d6-44f7-8ae1-802ea63806e0', 'D141200983', 'ISTPM-22-0098', 'Khadija', 'Ouhssaine', 'Radiologie / Imagerie médicale', 'S6', '3e année', 'G1', 'inscrit', 'paye', 13.7, '+212 6 88 45 21 09', 'k.ouhssaine@istpm.ma', '2002-05-22', 'Agadir', 35000, 0),
  ('cbd915cc-63fa-4649-bd99-822e4ce62adf', 'H137654210', 'ISTPM-22-0104', 'Omar', 'Bennani', 'Laboratoire / Biologie médicale', 'S6', '3e année', 'G2', 'inscrit', 'impaye', 9.4, '+212 6 33 90 18 45', 'o.bennani@istpm.ma', '2002-09-14', 'Agadir', 33000, 33000),
  ('6bb2440a-a63c-4318-a449-8fd0750ba151', 'S144210087', 'ISTPM-24-0230', 'Fatima Zahra', 'Lahlou', 'Prothèse dentaire', 'S1', '1re année', 'A', 'inscrit', 'paye', 13.1, '+212 6 47 22 88 90', 'fz.lahlou@istpm.ma', '2005-01-08', 'Aït Melloul', 30000, 0),
  ('b8810be2-d95c-4935-893b-7560613a27f5', 'R142870031', 'ISTPM-24-0245', 'Mehdi', 'Sabri', 'Infirmier polyvalent', 'S1', '1re année', 'B', 'inscrit', 'retard', 10.8, '+212 6 90 34 12 67', 'm.sabri@istpm.ma', '2005-03-25', 'Agadir', 34000, 11000),
  ('825c80d9-2618-482f-bb91-339ad54e388b', 'B140095512', 'ISTPM-23-0167', 'Hajar', 'Idrissi', 'Sage-femme', 'S4', '2e année', 'G1', 'inscrit', 'paye', 14.2, '+212 6 21 76 43 90', 'h.idrissi@istpm.ma', '2003-12-01', 'Agadir', 32000, 8000),
  ('9da2260a-1955-4b9a-a531-dbf4e0de4e17', 'K139001284', 'ISTPM-23-0178', 'Zakaria', 'Moutaouakil', 'Kinésithérapie', 'S4', '2e année', 'G2', 'inscrit', 'paye', 13.9, '+212 6 64 30 11 22', 'z.moutaouakil@istpm.ma', '2003-06-19', 'Ouarzazate', 33000, 0),
  ('eb199746-0324-4922-845e-fe9ec70aae19', 'T143562019', 'ISTPM-24-0251', 'Nisrine', 'Fadili', 'Radiologie / Imagerie médicale', 'S2', '1re année', 'A', 'inscrit', 'en_attente', 12.6, '+212 6 78 45 60 33', 'n.fadili@istpm.ma', '2005-08-11', 'Agadir', 35000, 17500),
  ('09061f5a-a301-40bf-9aa0-947867ca6380', 'L138744120', 'ISTPM-22-0087', 'Ayoub', 'Naciri', 'Infirmier en anesthésie-réanimation', 'S6', '3e année', 'G1', 'diplome', 'paye', 15.4, '+212 6 55 12 90 84', 'a.naciri@istpm.ma', '2002-01-27', 'Agadir', 38000, 0),
  ('48849675-410d-4b32-8736-2abefb71548a', 'N142008874', 'ISTPM-24-0260', 'Sara', 'El Ghazi', 'Laboratoire / Biologie médicale', 'S2', '1re année', 'B', 'en_attente', 'impaye', 8.7, '+212 6 41 55 78 20', 's.elghazi@istpm.ma', '2005-10-03', 'Tiznit', 33000, 33000),
  ('951bbe10-e88f-4877-a92d-6abee5eddd0c', 'C139887654', 'ISTPM-23-0190', 'Bilal', 'Ramdani', 'Prothèse dentaire', 'S4', '2e année', 'A', 'abandon', 'impaye', 7.9, '+212 6 60 21 43 77', 'b.ramdani@istpm.ma', '2003-04-30', 'Agadir', 30000, 22000)
ON CONFLICT ("id") DO UPDATE SET
  "cne" = EXCLUDED."cne", "prenom" = EXCLUDED."prenom", "nom" = EXCLUDED."nom",
  "filiere" = EXCLUDED."filiere", "niveau" = EXCLUDED."niveau",
  "statut" = EXCLUDED."statut", "paiement" = EXCLUDED."paiement",
  "moyenne" = EXCLUDED."moyenne", "reste_a_payer" = EXCLUDED."reste_a_payer";

-- Notes (38) : n'insère que les couples (étudiant, module) absents.
INSERT INTO "notes_etudiant" ("etudiant_id", "module", "note", "coef", "credits")
SELECT v."etudiant_id", v."module", v."note", v."coef", v."credits"
FROM (VALUES
  ('a5b0d3e8-7a11-4068-9769-cc9d6b96ed92', 'Soins infirmiers en médecine', 15.5, 3, 6),
  ('a5b0d3e8-7a11-4068-9769-cc9d6b96ed92', 'Pharmacologie', 13.0, 2, 4),
  ('a5b0d3e8-7a11-4068-9769-cc9d6b96ed92', 'Santé publique', 14.75, 2, 4),
  ('a5b0d3e8-7a11-4068-9769-cc9d6b96ed92', 'Éthique et déontologie', 16.0, 1, 2),
  ('20f78796-a1f0-4feb-8d8c-6ad7b2029616', 'Réanimation et soins intensifs', 13.5, 3, 6),
  ('20f78796-a1f0-4feb-8d8c-6ad7b2029616', 'Anesthésie clinique', 11.0, 3, 6),
  ('20f78796-a1f0-4feb-8d8c-6ad7b2029616', 'Physiologie appliquée', 12.25, 2, 4),
  ('22dff638-f698-4d5f-a8c8-a1d4065ab08f', 'Obstétrique', 16.5, 3, 6),
  ('22dff638-f698-4d5f-a8c8-a1d4065ab08f', 'Suivi de grossesse', 15.0, 2, 4),
  ('22dff638-f698-4d5f-a8c8-a1d4065ab08f', 'Néonatologie', 16.25, 2, 4),
  ('f6e1e450-4a67-4055-87b3-e4ecee79ef15', 'Rééducation fonctionnelle', 12.0, 3, 6),
  ('f6e1e450-4a67-4055-87b3-e4ecee79ef15', 'Anatomie du mouvement', 10.5, 2, 4),
  ('f6e1e450-4a67-4055-87b3-e4ecee79ef15', 'Kinésithérapie respiratoire', 11.0, 2, 4),
  ('aca5d8ba-f8d6-44f7-8ae1-802ea63806e0', 'Techniques de radiologie', 14.0, 3, 6),
  ('aca5d8ba-f8d6-44f7-8ae1-802ea63806e0', 'Scanner et IRM', 13.5, 3, 6),
  ('aca5d8ba-f8d6-44f7-8ae1-802ea63806e0', 'Radioprotection', 13.0, 2, 4),
  ('cbd915cc-63fa-4649-bd99-822e4ce62adf', 'Hématologie', 8.5, 3, 6),
  ('cbd915cc-63fa-4649-bd99-822e4ce62adf', 'Biochimie clinique', 10.0, 3, 6),
  ('cbd915cc-63fa-4649-bd99-822e4ce62adf', 'Microbiologie', 9.75, 2, 4),
  ('6bb2440a-a63c-4318-a449-8fd0750ba151', 'Anatomie dentaire', 14.0, 2, 4),
  ('6bb2440a-a63c-4318-a449-8fd0750ba151', 'Matériaux de prothèse', 12.5, 2, 4),
  ('6bb2440a-a63c-4318-a449-8fd0750ba151', 'Prothèse fixe (TP)', 13.0, 3, 6),
  ('b8810be2-d95c-4935-893b-7560613a27f5', 'Bases des soins infirmiers', 11.0, 3, 6),
  ('b8810be2-d95c-4935-893b-7560613a27f5', 'Anatomie-physiologie', 10.5, 2, 4),
  ('b8810be2-d95c-4935-893b-7560613a27f5', 'Hygiène hospitalière', 11.25, 2, 4),
  ('825c80d9-2618-482f-bb91-339ad54e388b', 'Obstétrique avancée', 15.0, 3, 6),
  ('825c80d9-2618-482f-bb91-339ad54e388b', 'Pathologies de la grossesse', 13.5, 2, 4),
  ('9da2260a-1955-4b9a-a531-dbf4e0de4e17', 'Kinésithérapie orthopédique', 14.5, 3, 6),
  ('9da2260a-1955-4b9a-a531-dbf4e0de4e17', 'Électrothérapie', 13.0, 2, 4),
  ('eb199746-0324-4922-845e-fe9ec70aae19', 'Physique des rayonnements', 12.0, 2, 4),
  ('eb199746-0324-4922-845e-fe9ec70aae19', 'Introduction à l''imagerie', 13.25, 2, 4),
  ('09061f5a-a301-40bf-9aa0-947867ca6380', 'Réanimation avancée', 16.0, 3, 6),
  ('09061f5a-a301-40bf-9aa0-947867ca6380', 'Prise en charge de la douleur', 15.0, 2, 4),
  ('48849675-410d-4b32-8736-2abefb71548a', 'Bases de biochimie', 9.0, 2, 4),
  ('48849675-410d-4b32-8736-2abefb71548a', 'Techniques de laboratoire', 8.5, 2, 4),
  ('951bbe10-e88f-4877-a92d-6abee5eddd0c', 'Prothèse amovible (TP)', 8.0, 3, 6),
  ('951bbe10-e88f-4877-a92d-6abee5eddd0c', 'Occlusodontie', 7.5, 2, 4)
) AS v("etudiant_id", "module", "note", "coef", "credits")
LEFT JOIN "notes_etudiant" n
  ON n."etudiant_id" = v."etudiant_id"::uuid AND n."module" = v."module"
WHERE n."id" IS NULL;

-- Historique des paiements (30) : n'insère que les périodes absentes par étudiant.
INSERT INTO "historique_paiements" ("etudiant_id", "date", "montant", "mode", "periode", "recu", "statut")
SELECT v."etudiant_id", v."date", v."montant", v."mode", v."periode", v."recu", v."statut"
FROM (VALUES
  ('a5b0d3e8-7a11-4068-9769-cc9d6b96ed92', '2025-10-05', 12000, 'Virement', 'Tranche 1 — 2025/26', 'ISTPM-R-2510-018', 'paye'),
  ('a5b0d3e8-7a11-4068-9769-cc9d6b96ed92', '2026-01-14', 11000, 'Chèque', 'Tranche 2 — 2025/26', 'ISTPM-R-2601-051', 'paye'),
  ('a5b0d3e8-7a11-4068-9769-cc9d6b96ed92', '2026-04-10', 11000, 'Virement', 'Tranche 3 — 2025/26', 'ISTPM-R-2604-077', 'paye'),
  ('20f78796-a1f0-4feb-8d8c-6ad7b2029616', '2025-10-09', 13000, 'Espèces', 'Tranche 1 — 2025/26', 'ISTPM-R-2510-033', 'paye'),
  ('20f78796-a1f0-4feb-8d8c-6ad7b2029616', '2026-01-20', 12000, 'Virement', 'Tranche 2 — 2025/26', 'ISTPM-R-2601-064', 'paye'),
  ('20f78796-a1f0-4feb-8d8c-6ad7b2029616', CURRENT_DATE::text, 13000, 'Virement', 'Tranche 3 — 2025/26', '', 'retard'),
  ('22dff638-f698-4d5f-a8c8-a1d4065ab08f', '2025-09-28', 16000, 'Virement', 'Tranche 1 — 2025/26', 'ISTPM-R-2509-004', 'paye'),
  ('22dff638-f698-4d5f-a8c8-a1d4065ab08f', '2026-02-02', 16000, 'Carte', 'Tranche 2 — 2025/26', 'ISTPM-R-2602-088', 'paye'),
  ('f6e1e450-4a67-4055-87b3-e4ecee79ef15', '2025-10-15', 16500, 'Chèque', 'Tranche 1 — 2025/26', 'ISTPM-R-2510-045', 'paye'),
  ('f6e1e450-4a67-4055-87b3-e4ecee79ef15', CURRENT_DATE::text, 16500, 'Virement', 'Tranche 2 — 2025/26', '', 'en_attente'),
  ('aca5d8ba-f8d6-44f7-8ae1-802ea63806e0', '2025-09-30', 17500, 'Virement', 'Tranche 1 — 2025/26', 'ISTPM-R-2509-011', 'paye'),
  ('aca5d8ba-f8d6-44f7-8ae1-802ea63806e0', '2026-01-30', 17500, 'Virement', 'Tranche 2 — 2025/26', 'ISTPM-R-2601-072', 'paye'),
  ('cbd915cc-63fa-4649-bd99-822e4ce62adf', CURRENT_DATE::text, 16500, 'Virement', 'Tranche 1 — 2025/26', '', 'impaye'),
  ('6bb2440a-a63c-4318-a449-8fd0750ba151', '2025-10-02', 15000, 'Espèces', 'Tranche 1 — 2025/26', 'ISTPM-R-2510-002', 'paye'),
  ('6bb2440a-a63c-4318-a449-8fd0750ba151', '2026-02-10', 15000, 'Carte', 'Tranche 2 — 2025/26', 'ISTPM-R-2602-095', 'paye'),
  ('b8810be2-d95c-4935-893b-7560613a27f5', '2025-10-12', 12000, 'Espèces', 'Tranche 1 — 2025/26', 'ISTPM-R-2510-058', 'paye'),
  ('b8810be2-d95c-4935-893b-7560613a27f5', '2026-01-25', 11000, 'Virement', 'Tranche 2 — 2025/26', 'ISTPM-R-2601-081', 'paye'),
  ('b8810be2-d95c-4935-893b-7560613a27f5', CURRENT_DATE::text, 11000, 'Virement', 'Tranche 3 — 2025/26', '', 'retard'),
  ('825c80d9-2618-482f-bb91-339ad54e388b', '2025-10-01', 12000, 'Virement', 'Tranche 1 — 2025/26', 'ISTPM-R-2510-009', 'paye'),
  ('825c80d9-2618-482f-bb91-339ad54e388b', '2026-01-18', 12000, 'Chèque', 'Tranche 2 — 2025/26', 'ISTPM-R-2601-060', 'paye'),
  ('825c80d9-2618-482f-bb91-339ad54e388b', CURRENT_DATE::text, 8000, 'Virement', 'Tranche 3 — 2025/26', '', 'en_attente'),
  ('9da2260a-1955-4b9a-a531-dbf4e0de4e17', '2025-09-29', 16500, 'Virement', 'Tranche 1 — 2025/26', 'ISTPM-R-2509-007', 'paye'),
  ('9da2260a-1955-4b9a-a531-dbf4e0de4e17', '2026-02-05', 16500, 'Virement', 'Tranche 2 — 2025/26', 'ISTPM-R-2602-090', 'paye'),
  ('eb199746-0324-4922-845e-fe9ec70aae19', '2025-10-18', 17500, 'Chèque', 'Tranche 1 — 2025/26', 'ISTPM-R-2510-062', 'paye'),
  ('eb199746-0324-4922-845e-fe9ec70aae19', CURRENT_DATE::text, 17500, 'Virement', 'Tranche 2 — 2025/26', '', 'en_attente'),
  ('09061f5a-a301-40bf-9aa0-947867ca6380', '2025-09-25', 19000, 'Virement', 'Tranche 1 — 2025/26', 'ISTPM-R-2509-001', 'paye'),
  ('09061f5a-a301-40bf-9aa0-947867ca6380', '2026-01-15', 19000, 'Virement', 'Tranche 2 — 2025/26', 'ISTPM-R-2601-052', 'paye'),
  ('48849675-410d-4b32-8736-2abefb71548a', CURRENT_DATE::text, 16500, 'Virement', 'Tranche 1 — 2025/26', '', 'impaye'),
  ('951bbe10-e88f-4877-a92d-6abee5eddd0c', '2025-10-08', 8000, 'Espèces', 'Tranche 1 — 2025/26', 'ISTPM-R-2510-040', 'paye'),
  ('951bbe10-e88f-4877-a92d-6abee5eddd0c', CURRENT_DATE::text, 22000, 'Virement', 'Solde 2025/26', '', 'impaye')
) AS v("etudiant_id", "date", "montant", "mode", "periode", "recu", "statut")
LEFT JOIN "historique_paiements" h
  ON h."etudiant_id" = v."etudiant_id"::uuid AND h."periode" = v."periode"
WHERE h."id" IS NULL;
