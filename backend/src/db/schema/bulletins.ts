import { pgTable, uuid, text, numeric, timestamp } from "drizzle-orm/pg-core";
import { etudiants } from "./etudiants";

export const bulletins = pgTable("bulletins", {
  id: uuid("id").primaryKey().defaultRandom(),
  etudiantId: uuid("etudiant_id")
    .notNull()
    .references(() => etudiants.id, { onDelete: "cascade" }),
  cne: text("cne").notNull().default(""),
  prenom: text("prenom").notNull().default(""),
  nom: text("nom").notNull().default(""),
  filiere: text("filiere").notNull().default(""),
  niveau: text("niveau").notNull().default(""),
  session: text("session").notNull().default("normale"),
  moyenne: numeric("moyenne").notNull().default("0"),
  mention: text("mention").notNull().default("Passable"),
  decision: text("decision").notNull().default("Admis"),
  statut: text("statut").notNull().default("genere"),
  evaluationClinique: numeric("evaluation_clinique").notNull().default("0"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
