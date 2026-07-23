import { pgTable, uuid, text, numeric, boolean, timestamp } from "drizzle-orm/pg-core";
import { etudiants } from "./etudiants";

export const stages = pgTable("stages", {
  id: uuid("id").primaryKey().defaultRandom(),
  etudiantId: uuid("etudiant_id")
    .notNull()
    .references(() => etudiants.id, { onDelete: "cascade" }),
  cne: text("cne").notNull().default(""),
  prenom: text("prenom").notNull().default(""),
  nom: text("nom").notNull().default(""),
  filiere: text("filiere").notNull().default(""),
  niveau: text("niveau").notNull().default(""),
  structure: text("structure").notNull().default(""),
  service: text("service").notNull().default(""),
  encadrantClinique: text("encadrant_clinique").notNull().default(""),
  tuteurAcademique: text("tuteur_academique").notNull().default(""),
  debut: text("debut").notNull().default(""),
  fin: text("fin").notNull().default(""),
  statut: text("statut").notNull().default("recherche"),
  conventionSignee: boolean("convention_signee").notNull().default(false),
  noteSoutenance: numeric("note_soutenance"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
