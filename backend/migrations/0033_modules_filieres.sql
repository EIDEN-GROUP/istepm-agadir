-- 0033 : réassigne les modules des 5 filières retirées (même attribution
-- documentée qu'en 0031) : anesthésie -> Auxiliaire, Kiné/Prothèse ->
-- Aide-Soignant(e), Radio -> Sage-femme, Labo -> Auxiliaire.
--> statement-breakpoint
UPDATE "modules" SET "filiere" = 'Infirmier(e) Auxiliaire', "updated_at" = now() WHERE "filiere" = 'Infirmier en anesthésie-réanimation';
--> statement-breakpoint
UPDATE "modules" SET "filiere" = 'Aide-Soignant(e)', "updated_at" = now() WHERE "filiere" IN ('Kinésithérapie', 'Prothèse dentaire');
--> statement-breakpoint
UPDATE "modules" SET "filiere" = 'Sage-femme', "updated_at" = now() WHERE "filiere" = 'Radiologie / Imagerie médicale';
--> statement-breakpoint
UPDATE "modules" SET "filiere" = 'Infirmier(e) Auxiliaire', "updated_at" = now() WHERE "filiere" = 'Laboratoire / Biologie médicale';
