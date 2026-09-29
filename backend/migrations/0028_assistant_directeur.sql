-- 0028 : rôle assistant_directeur (remplace comptable, supprimé).
-- Les comptes comptables existants deviennent assistants ; la fiche
-- assistant_directeur reçoit toutes les permissions (DO NOTHING : ne jamais
-- écraser une fiche déjà personnalisée).
--> statement-breakpoint
UPDATE "users" SET "role" = 'assistant_directeur', "updated_at" = now() WHERE "role" = 'comptable';
--> statement-breakpoint
INSERT INTO "roles" ("name", "description", "permissions", "is_system") VALUES
  ('assistant_directeur', 'Assistant du directeur — mêmes droits que le directeur, sauf la gestion du rôle et des comptes directeur',
   '["etudiants.read", "etudiants.write", "etudiants.delete", "formateurs.read", "formateurs.write", "formateurs.delete", "examens.read", "examens.write", "examens.delete", "bulletins.read", "bulletins.write", "bulletins.delete", "stages.read", "stages.write", "stages.delete", "settings.read", "settings.write", "users.read", "users.write", "users.delete", "roles.read", "roles.manage", "dashboard.read", "settings.annees.read", "settings.annees.write", "settings.groupes.read", "settings.groupes.write", "settings.modules.read", "settings.modules.write", "settings.salles.read", "settings.salles.write", "settings.creneaux.read", "settings.creneaux.write", "settings.planning.read", "settings.planning.write", "settings.filieres.read", "settings.filieres.write", "settings.niveaux_etudes.read", "settings.niveaux_etudes.write", "settings.examens.read", "settings.examens.write", "settings.bulletins.read", "settings.bulletins.write", "settings.institut.read", "settings.institut.write", "settings.securite.read", "settings.securite.write", "settings.cachet.read", "settings.cachet.write", "settings.structures.read", "settings.structures.write"]'::jsonb,
   true)
ON CONFLICT ("name") DO NOTHING;
