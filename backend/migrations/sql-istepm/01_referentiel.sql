-- 01_referentiel.sql - filières, modules, niveaux, réglages (idempotent).
-- Prérequis : migrations appliquées.

-- Filières (clé settings, créée si absente) : exactement les 4 aux carnets.
INSERT INTO "settings" ("key", "value")
SELECT 'filieres', '["Aide-Soignant(e)", "Infirmier polyvalent", "Infirmier(e) Auxiliaire", "Sage-femme"]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM "settings" WHERE "key" = 'filieres');

-- Modules (21, insérés uniquement si la table est vide). Filières : les 4
-- du carnet (même attribution que les migrations 0031/0033).
INSERT INTO "modules" ("nom", "filiere")
SELECT m.nom, m.filiere FROM (VALUES
  ('Soins infirmiers en médecine', 'Infirmier polyvalent'),
  ('Hygiène hospitalière', 'Infirmier polyvalent'),
  ('Éthique et déontologie', 'Infirmier polyvalent'),
  ('Pharmacologie', 'Infirmier polyvalent'),
  ('Santé publique', 'Infirmier polyvalent'),
  ('Réanimation et soins intensifs', 'Infirmier(e) Auxiliaire'),
  ('Anesthésie clinique', 'Infirmier(e) Auxiliaire'),
  ('Obstétrique', 'Sage-femme'),
  ('Suivi de grossesse', 'Sage-femme'),
  ('Néonatologie', 'Sage-femme'),
  ('Rééducation fonctionnelle', 'Aide-Soignant(e)'),
  ('Électrothérapie', 'Aide-Soignant(e)'),
  ('Techniques de radiologie', 'Sage-femme'),
  ('Scanner et IRM', 'Sage-femme'),
  ('Radioprotection', 'Sage-femme'),
  ('Hématologie', 'Infirmier(e) Auxiliaire'),
  ('Biochimie clinique', 'Infirmier(e) Auxiliaire'),
  ('Microbiologie', 'Infirmier(e) Auxiliaire'),
  ('Anatomie dentaire', 'Aide-Soignant(e)'),
  ('Prothèse fixe (TP)', 'Aide-Soignant(e)'),
  ('Occlusodontie', 'Aide-Soignant(e)')
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

-- Structures d'accueil (capacités de démo - ajuster en Paramètres).
INSERT INTO "settings" ("key", "value")
SELECT 'structures_accueil', '[
  {"nom": "CHR Hassan II - Agadir", "capacite": 40},
  {"nom": "Hôpital Hassan II - Agadir", "capacite": 30},
  {"nom": "Hôpital préfectoral Inezgane", "capacite": 20},
  {"nom": "Clinique Al Massira - Agadir", "capacite": 15},
  {"nom": "CHU Ibn Rochd - Casablanca", "capacite": 25},
  {"nom": "Clinique Ennakhil - Agadir", "capacite": 10}
]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM "settings" WHERE "key" = 'structures_accueil');

-- Services de stage (union des carnets IP / Auxiliaire / Sage-femme + options
-- du stage optionnel ; seul le nom sert aux combos, les heures vivent dans
-- `programme_stages`). Frais : uniquement si la clé est absente.
INSERT INTO "settings" ("key", "value")
SELECT 'services_stage', '["Bloc opératoire","Bloc opératoire gynéco-obstétrical","Cardiologie","CDTRM","Centre de référence","Chirurgie","Chirurgie + Stérilisation","Consultation gynécologique (MST)","Consultation postnatale et enfants","Dermatologie","FVAD (enfants)","Gynécologie","Maison d''accouchement","Maison d''accouchement rurale","Maternité","Maternité + maison d''accouchement","Médecine","Obstétrique","Ophtalmologie","ORL","Pédiatrie","Pédiatrie périnatale","Pédiatrie-Crèche","Planification familiale (PF)","Réanimation","Réanimation chirurgicale","Réanimation gynéco-obstétricale","Réanimation médicale","Salle d''admission (jour)","Salle d''admission (nuit)","Salle de travail et accouchement (jour)","Salle de travail et accouchement (nuit)","SMI","SMI (prénatal, PF, visites à domicile)","SMT","Soins de santé de base","Stage optionnel","Stage rural","Stérilisation","Suites de couches","Urgences","Urgences gynéco-obstétricales","Uro-néphrologie (hémodialyse)"]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM "settings" WHERE "key" = 'services_stage');

-- Heures indicatives par service (carnet Infirmier polyvalent : valeur de 1ère
-- apparition, 0 si inconnu) : pré-remplit le formulaire d'ajout de sous-stage.
INSERT INTO "settings" ("key", "value")
SELECT 'service_heures', '{"Médecine":80,"Chirurgie":80,"Pédiatrie":80,"Réanimation médicale":80,"Réanimation chirurgicale":80,"Urgences":40,"Gynécologie":40,"Obstétrique":40,"Bloc opératoire":80,"Dermatologie":40,"Ophtalmologie":40,"ORL":40,"Soins de santé de base":80,"Centre de référence":40,"Stage rural":80,"Stage optionnel":160,"Bloc opératoire gynéco-obstétrical":0,"Cardiologie":0,"CDTRM":0,"Chirurgie + Stérilisation":0,"Consultation gynécologique (MST)":0,"Consultation postnatale et enfants":0,"FVAD (enfants)":0,"Maison d''accouchement":0,"Maison d''accouchement rurale":0,"Maternité":0,"Maternité + maison d''accouchement":0,"Pédiatrie périnatale":0,"Pédiatrie-Crèche":0,"Planification familiale (PF)":0,"Réanimation":0,"Réanimation gynéco-obstétricale":0,"Salle d''admission (jour)":0,"Salle d''admission (nuit)":0,"Salle de travail et accouchement (jour)":0,"Salle de travail et accouchement (nuit)":0,"SMI":0,"SMI (prénatal, PF, visites à domicile)":0,"SMT":0,"Stérilisation":0,"Suites de couches":0,"Urgences gynéco-obstétricales":0,"Uro-néphrologie (hémodialyse)":0}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM "settings" WHERE "key" = 'service_heures');

-- Programme de référence des carnets de stage (lignes plates filière-tagguées,
-- capacite 5 par défaut éditable) : pré-remplit heures + filières, et nourrit
-- le bandeau de détails de l'affectation. Totaux : IP 320/480/1000 (1800),
-- Auxiliaire 800/1000 (1800), Sage-femme 2120. Notes : "Maternité + maison
-- d'accouchement" gardé groupé (total carnet) ; "ORL" normalisé
-- (Oto-Rhino-Laryngologie) ; lignes SF sans ventilation = niveau "" (toutes
-- années) ; lignes partiellement illisibles omises.
INSERT INTO "settings" ("key", "value")
SELECT 'programme_stages', '[{"nom":"Médecine","niveau":"1ère année","heures":80,"capacite":5,"filieres":["Infirmier polyvalent"]},{"nom":"Médecine","niveau":"2ème année","heures":80,"capacite":5,"filieres":["Infirmier polyvalent"]},{"nom":"Médecine","niveau":"3ème année","heures":80,"capacite":5,"filieres":["Infirmier polyvalent"]},{"nom":"Chirurgie","niveau":"1ère année","heures":80,"capacite":5,"filieres":["Infirmier polyvalent"]},{"nom":"Chirurgie","niveau":"2ème année","heures":80,"capacite":5,"filieres":["Infirmier polyvalent"]},{"nom":"Chirurgie","niveau":"3ème année","heures":80,"capacite":5,"filieres":["Infirmier polyvalent"]},{"nom":"Pédiatrie","niveau":"1ère année","heures":80,"capacite":5,"filieres":["Infirmier polyvalent"]},{"nom":"Pédiatrie","niveau":"2ème année","heures":80,"capacite":5,"filieres":["Infirmier polyvalent"]},{"nom":"Pédiatrie","niveau":"3ème année","heures":40,"capacite":5,"filieres":["Infirmier polyvalent"]},{"nom":"Réanimation médicale","niveau":"3ème année","heures":80,"capacite":5,"filieres":["Infirmier polyvalent"]},{"nom":"Réanimation chirurgicale","niveau":"3ème année","heures":80,"capacite":5,"filieres":["Infirmier polyvalent"]},{"nom":"Urgences","niveau":"3ème année","heures":40,"capacite":5,"filieres":["Infirmier polyvalent"]},{"nom":"Gynécologie","niveau":"3ème année","heures":40,"capacite":5,"filieres":["Infirmier polyvalent"]},{"nom":"Obstétrique","niveau":"2ème année","heures":40,"capacite":5,"filieres":["Infirmier polyvalent"]},{"nom":"Obstétrique","niveau":"3ème année","heures":40,"capacite":5,"filieres":["Infirmier polyvalent"]},{"nom":"Bloc opératoire","niveau":"2ème année","heures":80,"capacite":5,"filieres":["Infirmier polyvalent"]},{"nom":"Dermatologie","niveau":"3ème année","heures":40,"capacite":5,"filieres":["Infirmier polyvalent"]},{"nom":"Ophtalmologie","niveau":"3ème année","heures":40,"capacite":5,"filieres":["Infirmier polyvalent"]},{"nom":"ORL","niveau":"3ème année","heures":40,"capacite":5,"filieres":["Infirmier polyvalent"]},{"nom":"Soins de santé de base","niveau":"1ère année","heures":80,"capacite":5,"filieres":["Infirmier polyvalent"]},{"nom":"Soins de santé de base","niveau":"2ème année","heures":80,"capacite":5,"filieres":["Infirmier polyvalent"]},{"nom":"Soins de santé de base","niveau":"3ème année","heures":160,"capacite":5,"filieres":["Infirmier polyvalent"]},{"nom":"Centre de référence","niveau":"2ème année","heures":40,"capacite":5,"filieres":["Infirmier polyvalent"]},{"nom":"Stage rural","niveau":"3ème année","heures":80,"capacite":5,"filieres":["Infirmier polyvalent"]},{"nom":"Stage optionnel","niveau":"3ème année","heures":160,"capacite":5,"filieres":["Infirmier polyvalent"]},{"nom":"Médecine","niveau":"1ère année","heures":160,"capacite":5,"filieres":["Infirmier(e) Auxiliaire"]},{"nom":"Médecine","niveau":"2ème année","heures":80,"capacite":5,"filieres":["Infirmier(e) Auxiliaire"]},{"nom":"Chirurgie","niveau":"1ère année","heures":160,"capacite":5,"filieres":["Infirmier(e) Auxiliaire"]},{"nom":"Chirurgie","niveau":"2ème année","heures":80,"capacite":5,"filieres":["Infirmier(e) Auxiliaire"]},{"nom":"Pédiatrie","niveau":"1ère année","heures":160,"capacite":5,"filieres":["Infirmier(e) Auxiliaire"]},{"nom":"Pédiatrie","niveau":"2ème année","heures":80,"capacite":5,"filieres":["Infirmier(e) Auxiliaire"]},{"nom":"Réanimation","niveau":"2ème année","heures":40,"capacite":5,"filieres":["Infirmier(e) Auxiliaire"]},{"nom":"Urgences","niveau":"2ème année","heures":40,"capacite":5,"filieres":["Infirmier(e) Auxiliaire"]},{"nom":"Maternité + maison d''accouchement","niveau":"1ère année","heures":40,"capacite":5,"filieres":["Infirmier(e) Auxiliaire"]},{"nom":"Maternité + maison d''accouchement","niveau":"2ème année","heures":40,"capacite":5,"filieres":["Infirmier(e) Auxiliaire"]},{"nom":"Soins de santé de base","niveau":"1ère année","heures":280,"capacite":5,"filieres":["Infirmier(e) Auxiliaire"]},{"nom":"Soins de santé de base","niveau":"2ème année","heures":120,"capacite":5,"filieres":["Infirmier(e) Auxiliaire"]},{"nom":"Planification familiale (PF)","niveau":"2ème année","heures":40,"capacite":5,"filieres":["Infirmier(e) Auxiliaire"]},{"nom":"CDTRM","niveau":"2ème année","heures":40,"capacite":5,"filieres":["Infirmier(e) Auxiliaire"]},{"nom":"Stage rural","niveau":"2ème année","heures":160,"capacite":5,"filieres":["Infirmier(e) Auxiliaire"]},{"nom":"Stage optionnel","niveau":"2ème année","heures":280,"capacite":5,"filieres":["Infirmier(e) Auxiliaire"]},{"nom":"Médecine","niveau":"","heures":80,"capacite":5,"filieres":["Sage-femme"]},{"nom":"Chirurgie + Stérilisation","niveau":"","heures":80,"capacite":5,"filieres":["Sage-femme"]},{"nom":"Pédiatrie","niveau":"","heures":80,"capacite":5,"filieres":["Sage-femme"]},{"nom":"SMI","niveau":"","heures":80,"capacite":5,"filieres":["Sage-femme"]},{"nom":"Soins de santé de base","niveau":"","heures":60,"capacite":5,"filieres":["Sage-femme"]},{"nom":"Salle d''admission (jour)","niveau":"","heures":160,"capacite":5,"filieres":["Sage-femme"]},{"nom":"Salle d''admission (nuit)","niveau":"","heures":40,"capacite":5,"filieres":["Sage-femme"]},{"nom":"Salle de travail et accouchement (jour)","niveau":"","heures":160,"capacite":5,"filieres":["Sage-femme"]},{"nom":"Salle de travail et accouchement (nuit)","niveau":"","heures":60,"capacite":5,"filieres":["Sage-femme"]},{"nom":"Suites de couches","niveau":"","heures":80,"capacite":5,"filieres":["Sage-femme"]},{"nom":"SMI (prénatal, PF, visites à domicile)","niveau":"","heures":160,"capacite":5,"filieres":["Sage-femme"]},{"nom":"Planification familiale (PF)","niveau":"","heures":80,"capacite":5,"filieres":["Sage-femme"]},{"nom":"Salle d''admission (jour)","niveau":"","heures":40,"capacite":5,"filieres":["Sage-femme"]},{"nom":"Salle d''admission (nuit)","niveau":"","heures":80,"capacite":5,"filieres":["Sage-femme"]},{"nom":"Salle de travail et accouchement (jour)","niveau":"","heures":120,"capacite":5,"filieres":["Sage-femme"]},{"nom":"Salle de travail et accouchement (nuit)","niveau":"","heures":80,"capacite":5,"filieres":["Sage-femme"]},{"nom":"Suites de couches","niveau":"","heures":80,"capacite":5,"filieres":["Sage-femme"]},{"nom":"Urgences gynéco-obstétricales","niveau":"","heures":40,"capacite":5,"filieres":["Sage-femme"]},{"nom":"Gynécologie","niveau":"","heures":40,"capacite":5,"filieres":["Sage-femme"]},{"nom":"Consultation gynécologique (MST)","niveau":"","heures":40,"capacite":5,"filieres":["Sage-femme"]},{"nom":"Bloc opératoire gynéco-obstétrical","niveau":"","heures":40,"capacite":5,"filieres":["Sage-femme"]},{"nom":"Réanimation gynéco-obstétricale","niveau":"","heures":40,"capacite":5,"filieres":["Sage-femme"]},{"nom":"SMI","niveau":"","heures":40,"capacite":5,"filieres":["Sage-femme"]},{"nom":"Planification familiale (PF)","niveau":"","heures":40,"capacite":5,"filieres":["Sage-femme"]},{"nom":"Maison d''accouchement","niveau":"","heures":80,"capacite":5,"filieres":["Sage-femme"]},{"nom":"Consultation postnatale et enfants","niveau":"","heures":80,"capacite":5,"filieres":["Sage-femme"]},{"nom":"Centre de référence","niveau":"","heures":40,"capacite":5,"filieres":["Sage-femme"]},{"nom":"FVAD (enfants)","niveau":"","heures":80,"capacite":5,"filieres":["Sage-femme"]},{"nom":"Maison d''accouchement rurale","niveau":"","heures":40,"capacite":5,"filieres":["Sage-femme"]}]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM "settings" WHERE "key" = 'programme_stages');

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
