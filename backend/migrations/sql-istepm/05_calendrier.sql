-- 05_calendrier.sql — événements, vacances, fériés, exceptions, planifications (idempotent).

-- Événements (EV_1..EV_10).
INSERT INTO "events" ("id", "title", "description", "date", "start_time", "end_time", "all_day", "type", "color", "location", "status") VALUES
  ('31713e91-d503-416e-a69c-6532969fc858', 'Réunion pédagogique de rentrée', 'Préparation de l''année universitaire 2026/27 avec l''équipe pédagogique', '2026-09-05', '09:00', '12:00', false, 'reunion', '#3b82f6', 'Salle de conférence', 'confirme'),
  ('fd079f7e-64c6-4319-8a33-43866c3e9971', 'Soutenance de stage', 'Soutenance des étudiants S6 - session juillet', '2026-07-30', '08:30', '17:00', false, 'soutenance', '#ef4444', 'Amphi A', 'confirme'),
  ('73e7f9fd-d8f8-4b77-a971-ce9f7438f08e', 'Conseil de discipline', '', '2026-08-12', '10:00', '11:30', false, 'reunion', '#f59e0b', 'Bureau du directeur', 'planifie'),
  ('233e0e22-a186-46dc-bad5-a7101e079683', 'Journée portes ouvertes', 'Présentation des filières aux futurs étudiants', '2026-07-19', '09:00', '16:00', false, 'evenement', '#8b5cf6', 'Hall principal', 'confirme'),
  ('fbb8bd43-abae-481e-9baf-de626cf9094e', 'Remise des diplômes', 'Cérémonie de remise des diplômes 2025/26', '2026-09-20', '14:00', '18:00', false, 'evenement', '#10b981', 'Amphi A', 'planifie'),
  ('6b12132c-af80-4e6b-b1e1-2567e9f375f9', 'Vacances d''été', 'Fermeture annuelle de l''établissement', '2026-08-01', '', '', true, 'vacance', '#6b7280', '', 'confirme'),
  ('83f7ebae-2d4d-42ad-b512-047fcf7e0a92', 'Réunion parents-enseignants', 'Bilan du 1er semestre', '2026-12-15', '10:00', '13:00', false, 'reunion', '#3b82f6', 'Hall principal', 'planifie'),
  ('c4b9d4fa-2561-48bd-b4ec-a1be4efe73d6', 'Examen de rattrapage', 'Session de septembre', '2026-09-08', '09:00', '16:00', false, 'examen', '#ef4444', 'Toutes les salles', 'confirme'),
  ('b613ffe2-1725-423c-b974-a0b11b336329', 'Conférence : Éthique médicale', 'Conférence animée par Pr. Alami sur l''éthique dans les soins', '2026-07-25', '10:00', '12:00', false, 'evenement', '#8b5cf6', 'Amphi B', 'confirme'),
  ('7b7ed456-41d0-456a-8965-b89dfb5371f0', 'Atelier simulation', 'Atelier de simulation en soins d''urgence', '2026-07-22', '14:00', '17:00', false, 'formation', '#14b8a6', 'Labo simulation', 'confirme')
ON CONFLICT ("id") DO NOTHING;

-- Vacances scolaires (3).
INSERT INTO "school_vacations" ("id", "start_date", "end_date", "label") VALUES
  ('c307f095-5cd6-4fa7-934f-f48085deb282', '2026-08-01', '2026-08-31', 'Vacances d''été'),
  ('a0730392-b32b-4ba7-aed9-7e30b759f9ac', '2026-12-22', '2027-01-05', 'Vacances d''hiver'),
  ('029b4924-1235-4f9a-bbd9-86a167d598c2', '2027-04-10', '2027-04-25', 'Vacances de printemps')
ON CONFLICT ("id") DO NOTHING;

-- Jours fériés (5).
INSERT INTO "holidays" ("id", "date", "label") VALUES
  ('036ec943-dd7a-43e4-bcf7-28ef759a2ac4', '2026-07-30', 'Fête du Trône'),
  ('85f674d1-2b6b-42d9-b23f-d8d13add50e1', '2026-08-14', 'Fête de la Jeunesse'),
  ('d9ca57e8-eefc-4ffa-817a-b35f7bab1ed5', '2026-08-20', 'Révolution du Roi et du Peuple'),
  ('b2662a31-82cb-47ff-aadc-83da83b0cb68', '2026-11-06', 'Anniversaire de la Marche Verte'),
  ('27982825-217f-4d57-97e3-06cb51d28b25', '2026-11-18', 'Fête de l''Indépendance')
ON CONFLICT ("id") DO NOTHING;

-- Exceptions calendrier (3).
INSERT INTO "calendar_exceptions" ("id", "date", "label") VALUES
  ('c2d0e7e4-d9be-43d6-847e-1e0f2574f729', '2026-07-30', 'Fête du Trône (jour férié)'),
  ('25de2851-6062-4447-919e-2388c5568d7c', '2026-08-14', 'Fête de la Jeunesse (jour férié)'),
  ('6cfbd65b-938e-450a-8b3e-28255296b145', '2026-08-20', 'Révolution (jour férié)')
ON CONFLICT ("id") DO NOTHING;

-- Planifications (5).
INSERT INTO "planifications" ("id", "date", "time", "title", "detail", "tone") VALUES
  ('d94d54ed-776c-400d-afa0-8bb9a195a5a0', '2026-09-05', '09:00', 'Réunion de rentrée', 'Préparation année 2026/27', 'important'),
  ('fa07a7f1-1a55-4b05-9978-1358e715eec2', '2026-09-12', '10:00', 'Calendrier des examens', 'Validation du calendrier S1', 'urgent'),
  ('1b8ea226-0707-4c7a-b03d-d91a9c6d6ead', '2026-09-20', '14:00', 'Remise des diplômes', 'Cérémonie officielle', 'normal'),
  ('bde17add-f2f9-477d-aa16-8060e107eca2', '2026-10-01', '08:30', 'Début des cours S1', 'Rentrée académique', 'important'),
  ('dada1197-133f-4019-9b43-1fb76ef92630', '2026-10-15', '11:00', 'Commission pédagogique', 'Suivi des programmes', 'normal')
ON CONFLICT ("id") DO NOTHING;
