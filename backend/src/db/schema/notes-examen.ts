import { pgTable, uuid, numeric, unique } from "drizzle-orm/pg-core";
import { examens } from "./examens";
import { etudiants } from "./etudiants";

export const notesExamen = pgTable(
  "notes_examen",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    examenId: uuid("examen_id")
      .notNull()
      .references(() => examens.id, { onDelete: "cascade" }),
    etudiantId: uuid("etudiant_id")
      .notNull()
      .references(() => etudiants.id, { onDelete: "cascade" }),
    theorique: numeric("theorique"),
    pratique: numeric("pratique"),
  },
  (table) => [unique().on(table.examenId, table.etudiantId)],
);
