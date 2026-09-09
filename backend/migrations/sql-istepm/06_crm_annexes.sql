-- 06_crm_annexes.sql — rendez-vous, clients CRM, support, divers (idempotent).
-- Prérequis : 02_comptes.sql.

-- Rendez-vous / demandes de contact (3).
INSERT INTO "appointments" ("id", "name", "email", "phone", "subject", "type", "status", "age", "message", "date_table") VALUES
  ('180890b4-25df-40e2-84c2-e09d2a1c7076', 'Ahmed Benali', 'ahmed.benali@email.ma', '+212 6 11 22 33 44', 'Inscription Infirmier polyvalent', 'inscription', 'confirme', '19', 'Souhaite s''inscrire pour la rentrée 2026/27', '2026-08-15'),
  ('05b85d94-f2b8-4a64-aa9b-75052dcdda87', 'Nadia Oubella', 'nadia.oubella@email.ma', '+212 6 55 66 77 88', 'Réorientation Sage-femme', 'information', 'nouveau', '22', 'Étudiante en 2e année souhaite des informations sur la filière Sage-femme', '2026-08-20'),
  ('9beaf45b-cadc-4939-9918-ff70c32afcb4', 'Dr. Karim Hassani', 'k.hassani@chu-agadir.ma', '+212 6 99 88 77 66', 'Convention de stage', 'partenariat', 'en_cours', '', 'Propose une convention de stage pour 3 étudiants en anesthésie', '2026-07-25')
ON CONFLICT ("id") DO NOTHING;

-- Clients CRM (module familles, 2).
INSERT INTO "clients" ("id", "parent_name", "child_name", "child_age", "email", "email2", "phone", "phone2", "cin", "address", "child_names", "subscribed_frais", "dob", "level", "crm_stage", "payment_status", "monthly_fee", "debt", "overdue", "payment_day", "notes", "whatsapp_optin", "transport", "cantine", "garderie", "activites", "fratrie", "remise", "subscribed_services") VALUES
  ('e9a2a912-38fd-4770-8e38-c4721c2e7f68', 'M. Hassan El Fassi', 'Amine El Fassi', '4', 'h.elfassi@email.ma', 'amine.ecole@email.ma', '+212 6 11 22 33 44', '', 'AA123456', '15 Av. des FAR, Agadir', '[{"name": "Amine", "age": 4}]'::jsonb, '[{"name": "Mensualité", "montant": 2500}]'::jsonb, '2022-03-10', 'PS', 'actif', 'a_jour', 2500, 0, false, 5, 'Famille recommandée par Dr. Benali', true, true, true, false, true, 0, 0, '[{"name": "Transport", "montant": 500}, {"name": "Cantine", "montant": 400}]'::jsonb),
  ('2fd05b74-5061-46b1-94c6-eb3524e43001', 'Mme Nadia Oubella', 'Sara Oubella', '5', 'n.oubella@email.ma', '', '+212 6 55 66 77 88', '', 'BB789012', '8 Rue Al Qods, Agadir', '[{"name": "Sara", "age": 5}]'::jsonb, '[{"name": "Mensualité", "montant": 2500}]'::jsonb, '2021-06-15', 'MS', 'actif', 'retard', 2500, 2500, true, 10, 'Retard de paiement de 1 mois', true, false, true, false, false, 0, 0, '[{"name": "Cantine", "montant": 400}]'::jsonb)
ON CONFLICT ("id") DO NOTHING;

-- Factures + règlement CRM.
INSERT INTO "invoices" ("client_id", "period", "amount_due", "amount_paid", "due_date", "status")
SELECT 'e9a2a912-38fd-4770-8e38-c4721c2e7f68', '2026-07', 2500, 2500, '2026-07-05', 'payee'
WHERE NOT EXISTS (SELECT 1 FROM "invoices" WHERE "client_id" = 'e9a2a912-38fd-4770-8e38-c4721c2e7f68' AND "period" = '2026-07');

INSERT INTO "invoices" ("client_id", "period", "amount_due", "amount_paid", "due_date", "status")
SELECT '2fd05b74-5061-46b1-94c6-eb3524e43001', v."period", v."due", 0, v."due_date", 'impayee'
FROM (VALUES ('2026-07', 2500, '2026-07-10'), ('2026-08', 2900, '2026-08-10')) AS v("period", "due", "due_date")
WHERE NOT EXISTS (SELECT 1 FROM "invoices" i WHERE i."client_id" = '2fd05b74-5061-46b1-94c6-eb3524e43001' AND i."period" = v."period");

INSERT INTO "payments" ("client_id", "amount", "date", "mode", "period", "receipt")
SELECT 'e9a2a912-38fd-4770-8e38-c4721c2e7f68', 2500, '2026-07-05', 'Virement', '2026-07', 'REC-2026-07-001'
WHERE NOT EXISTS (SELECT 1 FROM "payments" WHERE "receipt" = 'REC-2026-07-001');

-- Support : 2 sessions + 2 messages (session ouverte).
INSERT INTO "support_sessions" ("id", "status") VALUES
  ('1bb7eb99-cc44-48eb-9961-7bd919373735', 'open'),
  ('b5fbd2ba-9a95-4110-9f53-5dd501d419b3', 'resolved')
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "support_messages" ("session_id", "sender_id", "sender_role", "content")
SELECT '1bb7eb99-cc44-48eb-9961-7bd919373735', id, 'directeur', 'Bonjour, je rencontre un problème avec l''export PDF des bulletins.'
FROM "users" WHERE "email" = 'direction@istpm-agadir.ma'
ON CONFLICT DO NOTHING;

INSERT INTO "support_messages" ("session_id", "sender_id", "sender_role", "content")
SELECT '1bb7eb99-cc44-48eb-9961-7bd919373735', id, 'support', 'Bonjour Dr. Benali. Pouvez-vous préciser le problème ?'
FROM "users" WHERE "email" = 'direction@istpm-agadir.ma'
ON CONFLICT DO NOTHING;

-- Notifications génériques (5).
INSERT INTO "notifications" ("id", "type", "title", "message", "link") VALUES
  ('670b0339-feae-4120-bf04-b04151dbb9b8', 'info', 'Nouvel étudiant inscrit', 'Fatima Zahra Lahlou a été inscrite en Prothèse dentaire S1', '/dashboard/etudiants/6bb2440a-a63c-4318-a449-8fd0750ba151'),
  ('f41dd1ba-4b26-4285-964c-e09d214edff3', 'warning', 'Paiement en retard', 'Youssef Ait Taleb a un retard de paiement de 13 000 DH', '/dashboard/etudiants/20f78796-a1f0-4feb-8d8c-6ad7b2029616'),
  ('c7017734-f0d9-4d12-9cae-d16b8dc8c998', 'success', 'Stages validés', 'Ayoub Naciri a validé son stage avec une note de 17/20', '/dashboard/stages/4747acb3-02b5-4a7a-8caf-a3d678ed78eb'),
  ('93adfe5c-82f8-4cbb-85a5-2af410107b3c', 'info', 'Examen programmé', 'Examen de Soins infirmiers programmé le 28/07/2026 à 09:00', '/dashboard/examens/a310d123-dc09-4e4e-9ef3-06a9711b8d32'),
  ('5a6086f6-b85e-40ac-872d-0046a7fa6e01', 'warning', 'Doublon potentiel', 'Un étudiant avec le CNE C139887654 est déjà inscrit', '/dashboard/etudiants')
ON CONFLICT ("id") DO NOTHING;

-- Divers : 1 demande de démo entrante, 1 log email, 1 rappel, 1 message WhatsApp.
INSERT INTO "demo_requests" ("center", "email", "phone", "preferred_date", "message")
SELECT 'Clinique Al Massira', 'contact@almassira.ma', '+212 5 28 44 55 66', '2026-08-10', 'Souhaite une démonstration du logiciel pour notre clinique'
WHERE NOT EXISTS (SELECT 1 FROM "demo_requests" WHERE "email" = 'contact@almassira.ma' AND "preferred_date" = '2026-08-10');

INSERT INTO "email_logs" ("recipient", "subject", "type", "status", "error_msg")
SELECT 'direction@istpm-agadir.ma', 'Bienvenue sur ISTPM', 'welcome', 'envoye', ''
WHERE NOT EXISTS (SELECT 1 FROM "email_logs" WHERE "recipient" = 'direction@istpm-agadir.ma' AND "subject" = 'Bienvenue sur ISTPM');

INSERT INTO "reminders" ("title", "message", "remind_at", "sent", "method")
SELECT 'Soutenance de stage', 'Rappel : soutenance des étudiants S6 demain à 08:30', NOW() + INTERVAL '1 day', false, 'email'
WHERE NOT EXISTS (SELECT 1 FROM "reminders" WHERE "title" = 'Soutenance de stage');

INSERT INTO "whatsapp_messages" ("phone", "direction", "content", "status")
SELECT '+212 6 11 22 33 44', 'sortant', 'Votre facture ISTPM du mois est disponible.', 'envoye'
WHERE NOT EXISTS (SELECT 1 FROM "whatsapp_messages" WHERE "phone" = '+212 6 11 22 33 44' AND "content" = 'Votre facture ISTPM du mois est disponible.');
