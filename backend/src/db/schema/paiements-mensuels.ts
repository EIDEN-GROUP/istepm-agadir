import { pgTable, uuid, text, numeric, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { etudiants } from "./etudiants";

export const paiementsMensuels = pgTable(
  "paiements_mensuels",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    etudiantId: uuid("etudiant_id")
      .notNull()
      .references(() => etudiants.id, { onDelete: "cascade" }),
    mois: text("mois").notNull(),
    montantDu: numeric("montant_du").notNull().default("0"),
    montantPaye: numeric("montant_paye").notNull().default("0"),
    datePaiement: text("date_paiement"),
    mode: text("mode").default("Espèces"),
    recu: text("recu").default(""),
    statut: text("statut").notNull().default("impaye"),
    notes: text("notes").default(""),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    uniqueEtudiantMois: uniqueIndex("unique_etudiant_mois").on(
      table.etudiantId,
      table.mois,
    ),
  }),
);
