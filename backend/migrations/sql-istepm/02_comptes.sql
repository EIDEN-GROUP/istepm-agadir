-- 02_comptes.sql — rôles, comptes de test, employés, centres (idempotent).

-- Rôles par défaut.
INSERT INTO "roles" ("name", "description", "permissions", "is_system") VALUES
  ('directeur', 'Accès complet à l''ensemble du système',
   '["etudiants.read", "etudiants.write", "etudiants.delete", "formateurs.read", "formateurs.write", "formateurs.delete", "examens.read", "examens.write", "examens.delete", "bulletins.read", "bulletins.write", "bulletins.delete", "stages.read", "stages.write", "stages.delete", "paiements.read", "paiements.write", "paiements.delete", "settings.read", "settings.write", "users.read", "users.write", "users.delete", "roles.read", "roles.manage", "dashboard.read"]'::jsonb,
   true),
  ('responsable', 'Gestion pédagogique et organisationnelle',
   '["etudiants.read", "etudiants.write", "formateurs.read", "formateurs.write", "examens.read", "examens.write", "bulletins.read", "bulletins.write", "stages.read", "stages.write", "paiements.read", "paiements.write", "settings.read", "settings.write", "dashboard.read"]'::jsonb,
   true),
  ('enseignant', 'Accès limité à ses modules, séances, et saisie de notes',
   '["etudiants.read", "examens.read", "examens.write", "bulletins.read", "dashboard.read"]'::jsonb,
   true)
ON CONFLICT ("name") DO NOTHING;

-- Comptes de test (mots de passe faibles — recette uniquement).
-- direction@istpm-agadir.ma / directeur123 · enseignant@… / enseignant123 · responsable@… / responsable123
INSERT INTO "users" ("email", "password_hash", "name", "role") VALUES
  ('direction@istpm-agadir.ma', '$2b$10$PAnZKRCQa.uKh92Bgf1TDeIYlEmRsRnMlR3tK3eH.1TuOzB/wuJ9C', 'Dr. Youssef Benali', 'directeur'),
  ('enseignant@istpm-agadir.ma', '$2b$10$W0xAH.9MgiR/rXH2UJX8Te7ujbUDVkG5mTKx/rEHq.BHJCfnJzSKO', 'Mme Salma Ait Taleb', 'enseignant'),
  ('responsable@istpm-agadir.ma', '$2b$10$FW.DWb7/.dx4JDsFHN3Nv.y2RxLQnRNZ1QiVXIrAMWrrtLUG/eA.m', 'M. Rachid El Ouafi', 'responsable')
ON CONFLICT ("email") DO UPDATE SET
  "password_hash" = EXCLUDED."password_hash",
  "name" = EXCLUDED."name",
  "role" = EXCLUDED."role";

-- Préférences des comptes de test.
INSERT INTO "user_preferences" ("user_id", "preferences")
SELECT id, '{"theme":"system","notifications":true,"language":"fr"}'::jsonb FROM "users"
WHERE "email" IN ('direction@istpm-agadir.ma', 'enseignant@istpm-agadir.ma', 'responsable@istpm-agadir.ma')
ON CONFLICT ("user_id") DO NOTHING;

-- Employés (fiches RH).
INSERT INTO "employees" ("id", "full_name", "position", "department", "email", "personal_email", "phone", "cin", "birth_date", "hire_date", "address", "contract_type", "salary", "status") VALUES
  ('441ae643-751a-4444-b77a-405232e7d664', 'Dr. Youssef Benali', 'Directeur', 'Direction', 'direction@istpm-agadir.ma', 'y.benali@email.ma', '+212 6 61 11 22 33', 'AB123456', '1975-03-15', '2018-09-01', '12 Rue Hassan II, Agadir', 'cdi', 25000, 'actif'),
  ('86191608-d575-46c9-b476-0ef098978777', 'M. Rachid El Ouafi', 'Responsable pédagogique', 'Pédagogie', 'responsable@istpm-agadir.ma', 'r.ouafi@email.ma', '+212 6 62 33 44 55', 'CD789012', '1985-07-22', '2019-10-01', '8 Rue Mohammed V, Agadir', 'cdi', 18000, 'actif'),
  ('1877f708-4efc-4106-ac41-fb8a473bf00c', 'Mme Salma Ait Taleb', 'Enseignante', 'Pédagogie', 'enseignant@istpm-agadir.ma', 's.ait taleb@email.ma', '+212 6 63 44 55 66', 'EF345678', '1990-11-10', '2020-02-15', '5 Rue Al Qods, Agadir', 'cdi', 14000, 'actif'),
  ('12f1b041-a286-4abc-93c0-987b4458a31a', 'Mme Fatima Hassani', 'Secrétaire générale', 'Administration', 'secretariat@istpm-agadir.ma', 'f.hassani@email.ma', '+212 6 64 55 66 77', 'GH901234', '1988-09-05', '2021-01-10', '3 Rue de la Liberté, Agadir', 'cdi', 12000, 'actif')
ON CONFLICT ("id") DO NOTHING;

-- Centres + rattachement du directeur au siège.
INSERT INTO "centers" ("id", "name", "city", "contact_email", "contact_phone", "plan", "status", "monthly_price", "students_count", "is_primary", "notes") VALUES
  ('ef814be7-603b-4276-b73c-a4a6cd97ae2c', 'ISTPM Agadir', 'Agadir', 'contact@istpm-agadir.ma', '+212 5 28 22 11 00', 'premium', 'active', 29900, 120, true, 'Siège principal'),
  ('434bec81-413c-4c13-bfb6-394632122f9f', 'ISTPM Inezgane', 'Inezgane', 'contact.inezgane@istpm-agadir.ma', '+212 5 28 33 22 11', 'standard', 'active', 19900, 65, false, 'Antenne Inezgane')
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "center_admins" ("center_id", "profile_id")
SELECT 'ef814be7-603b-4276-b73c-a4a6cd97ae2c', id FROM "users" WHERE "email" = 'direction@istpm-agadir.ma'
ON CONFLICT DO NOTHING;
