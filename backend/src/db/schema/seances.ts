import { pgTable, uuid, text, timestamp, date, time, integer } from "drizzle-orm/pg-core";

export const seances = pgTable("seances", {
  id: uuid("id").defaultRandom().primaryKey(),
  date: date("date").notNull(),
  debut: text("debut").notNull().default("08:00"),
  fin: text("fin").notNull().default("09:00"),
  professeurId: text("professeur_id").notNull().default(""),
  module: text("module").notNull(),
  filiere: text("filiere").notNull().default(""),
  salle: text("salle").notNull().default(""),
  groupe: text("groupe").notNull().default(""),
  type: text("type").notNull().default("cours"),
  statut: text("statut").notNull().default("planifie"),
  anneeUniversitaire: text("annee_universitaire").notNull().default(""),
  semestre: text("semestre").notNull().default(""),
  notes: text("notes").notNull().default(""),
  /** Compte-rendu de séance (le fichier vit dans MinIO, comme les examens). */
  documentId: text("document_id"),
  documentNom: text("document_nom"),
  documentTaille: integer("document_taille"),
  documentMime: text("document_mime"),
  documentUploadedAt: text("document_uploaded_at"),
  /** Motif du rejet (direction), obligatoire quand statut = rejete. */
  motifRejet: text("motif_rejet").notNull().default(""),
  /** Direction : auteur et date de la dernière validation / rejet. */
  validatedBy: text("validated_by"),
  validatedAt: timestamp("validated_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
