import { pgTable, uuid, text, integer, timestamp } from "drizzle-orm/pg-core";

export const formateurs = pgTable("formateurs", {
  id: uuid("id").primaryKey().defaultRandom(),
  matricule: text("matricule").notNull().default(""),
  cin: text("cin").notNull().default(""),
  prenom: text("prenom").notNull(),
  nom: text("nom").notNull(),
  grade: text("grade").notNull().default("vacataire"),
  departement: text("departement").notNull().default(""),
  modules: text("modules").array().notNull().default([]),
  groupes: text("groupes").array().notNull().default([]),
  statut: text("statut").notNull().default("permanent"),
  telephone: text("telephone").notNull().default(""),
  email: text("email").notNull().default(""),
  notesSaisies: integer("notes_saisies").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
