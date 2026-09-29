-- 0029 : workflow de validation des séances (compte-rendu + confirm/rejet).
-- document_* : compte-rendu déposé par l'enseignant (fichier dans MinIO,
-- comme les examens). motif_rejet : motif obligatoire en cas de rejet.
-- validated_by/at : auteur et date de la dernière décision de direction.
--> statement-breakpoint
ALTER TABLE "seances" ADD COLUMN "document_id" text;
--> statement-breakpoint
ALTER TABLE "seances" ADD COLUMN "document_nom" text;
--> statement-breakpoint
ALTER TABLE "seances" ADD COLUMN "document_taille" integer;
--> statement-breakpoint
ALTER TABLE "seances" ADD COLUMN "document_mime" text;
--> statement-breakpoint
ALTER TABLE "seances" ADD COLUMN "document_uploaded_at" text;
--> statement-breakpoint
ALTER TABLE "seances" ADD COLUMN "motif_rejet" text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE "seances" ADD COLUMN "validated_by" text;
--> statement-breakpoint
ALTER TABLE "seances" ADD COLUMN "validated_at" timestamp;
