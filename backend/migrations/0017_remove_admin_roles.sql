-- Les rôles "admin" / "superadmin" n'existent plus : les comptes concernés
-- (accès complet) deviennent "directeur". Idempotent, ré-exécutable sans risque.
UPDATE "users" SET "role" = 'directeur', "updated_at" = NOW() WHERE "role" IN ('admin', 'superadmin');
