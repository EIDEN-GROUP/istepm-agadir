-- 0027 : scelle le référentiel éditable des niveaux d'études (landing page).
-- Les 5 valeurs reprennent à l'identique NIVEAUX_INSCRIPTION (jamais modifiées
-- côté code) : le formulaire public et la validation POST les lisent depuis
-- settings (`niveaux_etudes`), le staff les édite dans Paramètres comme les
-- filières. Idempotent : n'écrase jamais une liste déjà gérée.
--> statement-breakpoint
INSERT INTO "settings" ("key", "value")
SELECT 'niveaux_etudes', '["Terminale (bac en cours)", "Baccalauréat obtenu", "Bac +1 / Bac +2", "Licence ou plus", "Autre"]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM "settings" WHERE "key" = 'niveaux_etudes');
