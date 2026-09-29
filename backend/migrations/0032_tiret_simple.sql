-- 0032 : normalise le tiret long (—) en trait d'union (-) dans les données
-- textuelles (même règle que le code). Ciblé colonne par colonne, idempotent
-- (REPLACE sans occurrence = no-op).
--> statement-breakpoint
UPDATE "settings" SET "value" = replace("value"::text, '—', '-')::jsonb WHERE "value"::text LIKE '%—%';
--> statement-breakpoint
UPDATE "etudiants" SET "prenom" = replace("prenom", '—', '-'), "nom" = replace("nom", '—', '-'), "ville" = replace("ville", '—', '-') WHERE "prenom" LIKE '%—%' OR "nom" LIKE '%—%' OR "ville" LIKE '%—%';
--> statement-breakpoint
UPDATE "formateurs" SET "prenom" = replace("prenom", '—', '-'), "nom" = replace("nom", '—', '-') WHERE "prenom" LIKE '%—%' OR "nom" LIKE '%—%';
--> statement-breakpoint
UPDATE "users" SET "name" = replace("name", '—', '-') WHERE "name" LIKE '%—%';
--> statement-breakpoint
UPDATE "modules" SET "nom" = replace("nom", '—', '-'), "description" = replace("description", '—', '-') WHERE "nom" LIKE '%—%' OR COALESCE("description", '') LIKE '%—%';
--> statement-breakpoint
UPDATE "stages" SET "prenom" = replace("prenom", '—', '-'), "nom" = replace("nom", '—', '-'), "structure" = replace("structure", '—', '-'), "service" = replace("service", '—', '-'), "encadrant_clinique" = replace("encadrant_clinique", '—', '-'), "tuteur_academique" = replace("tuteur_academique", '—', '-') WHERE "prenom" LIKE '%—%' OR "nom" LIKE '%—%' OR "structure" LIKE '%—%' OR "service" LIKE '%—%' OR "encadrant_clinique" LIKE '%—%' OR "tuteur_academique" LIKE '%—%';
--> statement-breakpoint
UPDATE "examens" SET "module" = replace("module", '—', '-'), "description" = replace("description", '—', '-') WHERE "module" LIKE '%—%' OR COALESCE("description", '') LIKE '%—%';
--> statement-breakpoint
UPDATE "seances" SET "module" = replace("module", '—', '-'), "salle" = replace("salle", '—', '-'), "groupe" = replace("groupe", '—', '-'), "notes" = replace("notes", '—', '-') WHERE "module" LIKE '%—%' OR "salle" LIKE '%—%' OR "groupe" LIKE '%—%' OR "notes" LIKE '%—%';
--> statement-breakpoint
UPDATE "bulletins" SET "prenom" = replace("prenom", '—', '-'), "nom" = replace("nom", '—', '-') WHERE "prenom" LIKE '%—%' OR "nom" LIKE '%—%';
--> statement-breakpoint
UPDATE "inscription_requests" SET "prenom" = replace("prenom", '—', '-'), "nom" = replace("nom", '—', '-'), "message" = replace("message", '—', '-') WHERE "prenom" LIKE '%—%' OR "nom" LIKE '%—%' OR "message" LIKE '%—%';
--> statement-breakpoint
UPDATE "notifications" SET "title" = replace("title", '—', '-'), "message" = replace("message", '—', '-') WHERE "title" LIKE '%—%' OR "message" LIKE '%—%';
