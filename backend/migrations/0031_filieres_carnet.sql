-- 0031 : les 5 filières retirées sont réassignées aux 4 du carnet.
-- Attribution déterministe (stable au rejeu, documentée ci-dessous) :
--   'Infirmier en anesthésie-réanimation' -> 'Infirmier(e) Auxiliaire'
--   'Kinésithérapie'                      -> 'Aide-Soignant(e)'
--   'Radiologie / Imagerie médicale'      -> 'Sage-femme'
--   'Laboratoire / Biologie médicale'     -> 'Infirmier(e) Auxiliaire'
--   'Prothèse dentaire'                   -> 'Aide-Soignant(e)'
-- Les 4 filières elles-mêmes et toute autre valeur sont intouchées.
--> statement-breakpoint
UPDATE "etudiants" SET "filiere" = 'Infirmier(e) Auxiliaire', "updated_at" = now() WHERE "filiere" = 'Infirmier en anesthésie-réanimation';
--> statement-breakpoint
UPDATE "etudiants" SET "filiere" = 'Aide-Soignant(e)', "updated_at" = now() WHERE "filiere" IN ('Kinésithérapie', 'Prothèse dentaire');
--> statement-breakpoint
UPDATE "etudiants" SET "filiere" = 'Sage-femme', "updated_at" = now() WHERE "filiere" = 'Radiologie / Imagerie médicale';
--> statement-breakpoint
UPDATE "etudiants" SET "filiere" = 'Infirmier(e) Auxiliaire', "updated_at" = now() WHERE "filiere" = 'Laboratoire / Biologie médicale';
--> statement-breakpoint
UPDATE "formateurs" SET "departement" = 'Infirmier(e) Auxiliaire', "updated_at" = now() WHERE "departement" = 'Infirmier en anesthésie-réanimation';
--> statement-breakpoint
UPDATE "formateurs" SET "departement" = 'Aide-Soignant(e)', "updated_at" = now() WHERE "departement" IN ('Kinésithérapie', 'Prothèse dentaire');
--> statement-breakpoint
UPDATE "formateurs" SET "departement" = 'Sage-femme', "updated_at" = now() WHERE "departement" = 'Radiologie / Imagerie médicale';
--> statement-breakpoint
UPDATE "formateurs" SET "departement" = 'Infirmier(e) Auxiliaire', "updated_at" = now() WHERE "departement" = 'Laboratoire / Biologie médicale';
--> statement-breakpoint
UPDATE "modules" SET "filiere" = 'Infirmier(e) Auxiliaire', "updated_at" = now() WHERE "filiere" = 'Infirmier en anesthésie-réanimation';
--> statement-breakpoint
UPDATE "modules" SET "filiere" = 'Aide-Soignant(e)', "updated_at" = now() WHERE "filiere" IN ('Kinésithérapie', 'Prothèse dentaire');
--> statement-breakpoint
UPDATE "modules" SET "filiere" = 'Sage-femme', "updated_at" = now() WHERE "filiere" = 'Radiologie / Imagerie médicale';
--> statement-breakpoint
UPDATE "modules" SET "filiere" = 'Infirmier(e) Auxiliaire', "updated_at" = now() WHERE "filiere" = 'Laboratoire / Biologie médicale';
--> statement-breakpoint
UPDATE "examens" SET "filiere" = 'Infirmier(e) Auxiliaire', "updated_at" = now() WHERE "filiere" = 'Infirmier en anesthésie-réanimation';
--> statement-breakpoint
UPDATE "examens" SET "filiere" = 'Aide-Soignant(e)', "updated_at" = now() WHERE "filiere" IN ('Kinésithérapie', 'Prothèse dentaire');
--> statement-breakpoint
UPDATE "examens" SET "filiere" = 'Sage-femme', "updated_at" = now() WHERE "filiere" = 'Radiologie / Imagerie médicale';
--> statement-breakpoint
UPDATE "examens" SET "filiere" = 'Infirmier(e) Auxiliaire', "updated_at" = now() WHERE "filiere" = 'Laboratoire / Biologie médicale';
--> statement-breakpoint
UPDATE "seances" SET "filiere" = 'Infirmier(e) Auxiliaire', "updated_at" = now() WHERE "filiere" = 'Infirmier en anesthésie-réanimation';
--> statement-breakpoint
UPDATE "seances" SET "filiere" = 'Aide-Soignant(e)', "updated_at" = now() WHERE "filiere" IN ('Kinésithérapie', 'Prothèse dentaire');
--> statement-breakpoint
UPDATE "seances" SET "filiere" = 'Sage-femme', "updated_at" = now() WHERE "filiere" = 'Radiologie / Imagerie médicale';
--> statement-breakpoint
UPDATE "seances" SET "filiere" = 'Infirmier(e) Auxiliaire', "updated_at" = now() WHERE "filiere" = 'Laboratoire / Biologie médicale';
--> statement-breakpoint
UPDATE "stages" SET "filiere" = 'Infirmier(e) Auxiliaire', "updated_at" = now() WHERE "filiere" = 'Infirmier en anesthésie-réanimation';
--> statement-breakpoint
UPDATE "stages" SET "filiere" = 'Aide-Soignant(e)', "updated_at" = now() WHERE "filiere" IN ('Kinésithérapie', 'Prothèse dentaire');
--> statement-breakpoint
UPDATE "stages" SET "filiere" = 'Sage-femme', "updated_at" = now() WHERE "filiere" = 'Radiologie / Imagerie médicale';
--> statement-breakpoint
UPDATE "stages" SET "filiere" = 'Infirmier(e) Auxiliaire', "updated_at" = now() WHERE "filiere" = 'Laboratoire / Biologie médicale';
--> statement-breakpoint
UPDATE "bulletins" SET "filiere" = 'Infirmier(e) Auxiliaire', "updated_at" = now() WHERE "filiere" = 'Infirmier en anesthésie-réanimation';
--> statement-breakpoint
UPDATE "bulletins" SET "filiere" = 'Aide-Soignant(e)', "updated_at" = now() WHERE "filiere" IN ('Kinésithérapie', 'Prothèse dentaire');
--> statement-breakpoint
UPDATE "bulletins" SET "filiere" = 'Sage-femme', "updated_at" = now() WHERE "filiere" = 'Radiologie / Imagerie médicale';
--> statement-breakpoint
UPDATE "bulletins" SET "filiere" = 'Infirmier(e) Auxiliaire', "updated_at" = now() WHERE "filiere" = 'Laboratoire / Biologie médicale';
--> statement-breakpoint
UPDATE "inscription_requests" SET "filiere" = 'Infirmier(e) Auxiliaire', "updated_at" = now() WHERE "filiere" = 'Infirmier en anesthésie-réanimation';
--> statement-breakpoint
UPDATE "inscription_requests" SET "filiere" = 'Aide-Soignant(e)', "updated_at" = now() WHERE "filiere" IN ('Kinésithérapie', 'Prothèse dentaire');
--> statement-breakpoint
UPDATE "inscription_requests" SET "filiere" = 'Sage-femme', "updated_at" = now() WHERE "filiere" = 'Radiologie / Imagerie médicale';
--> statement-breakpoint
UPDATE "inscription_requests" SET "filiere" = 'Infirmier(e) Auxiliaire', "updated_at" = now() WHERE "filiere" = 'Laboratoire / Biologie médicale';
