import { pgTable, uuid, text, numeric, timestamp } from "drizzle-orm/pg-core";
import { etudiants } from "./etudiants";

export const historiquePaiements = pgTable("historique_paiements", {
  id: uuid("id").primaryKey().defaultRandom(),
  etudiantId: uuid("etudiant_id")
    .notNull()
    .references(() => etudiants.id, { onDelete: "cascade" }),
  date: text("date").notNull(),
  montant: numeric("montant").notNull(),
  mode: text("mode").notNull().default("Especes"),
  periode: text("periode").notNull().default(""),
  recu: text("recu").notNull().default(""),
  statut: text("statut").notNull().default("paye"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
