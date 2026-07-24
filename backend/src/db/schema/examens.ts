import { pgTable, uuid, text, integer, timestamp } from "drizzle-orm/pg-core";

export const examens = pgTable("examens", {
  id: uuid("id").primaryKey().defaultRandom(),
  module: text("module").notNull(),
  filiere: text("filiere").notNull(),
  niveau: text("niveau").notNull(),
  type: text("type").notNull(),
  date: text("date").notNull(),
  heure: text("heure").notNull().default(""),
  salle: text("salle").notNull().default(""),
  surveillants: text("surveillants").array().notNull().default([]),
  statut: text("statut").notNull().default("planifie"),
  groupe: text("groupe").notNull().default(""),
  etudiantsConvoques: integer("etudiants_convoques").notNull().default(0),
  composante: text("composante").notNull().default("Theorique"),
  duree: integer("duree").notNull().default(120),
  description: text("description").notNull().default(""),
  createdBy: text("created_by").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
