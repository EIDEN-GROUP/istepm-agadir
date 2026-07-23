import { pgTable, uuid, text, timestamp, date, time } from "drizzle-orm/pg-core";

export const seances = pgTable("seances", {
  id: uuid("id").defaultRandom().primaryKey(),
  date: date("date").notNull(),
  debut: text("debut").notNull().default("08:00"),
  fin: text("fin").notNull().default("09:00"),
  professeurId: text("professeur_id").notNull().default(""),
  module: text("module").notNull(),
  salle: text("salle").notNull().default(""),
  groupe: text("groupe").notNull().default(""),
  type: text("type").notNull().default("cours"),
  statut: text("statut").notNull().default("planifie"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
