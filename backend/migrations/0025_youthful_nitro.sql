-- 0025 : group_configs.semester (texte unique) -> semesters (text[]).
-- Les valeurs existantes sont conservées (chaque niveau devient un tableau
-- à un élément) : aucun groupe géré n'est perdu ni réassigné.
--> statement-breakpoint
ALTER TABLE "group_configs" RENAME COLUMN "semester" TO "semesters";
--> statement-breakpoint
ALTER TABLE "group_configs" ALTER COLUMN "semesters" TYPE text[] USING ARRAY["semesters"];
--> statement-breakpoint
ALTER TABLE "group_configs" ALTER COLUMN "semesters" SET DEFAULT '{}';
--> statement-breakpoint
ALTER TABLE "group_configs" ALTER COLUMN "semesters" SET NOT NULL;
