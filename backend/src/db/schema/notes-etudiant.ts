import { pgTable, uuid, text, numeric, timestamp } from "drizzle-orm/pg-core";
import { etudiants } from "./etudiants";

export const notesEtudiant = pgTable("notes_etudiant", {
  id: uuid("id").primaryKey().defaultRandom(),
  etudiantId: uuid("etudiant_id")
    .notNull()
    .references(() => etudiants.id, { onDelete: "cascade" }),
  module: text("module").notNull(),
  note: numeric("note").notNull().default("0"),
  coef: numeric("coef").notNull().default("1"),
  credits: numeric("credits").notNull().default("0"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
