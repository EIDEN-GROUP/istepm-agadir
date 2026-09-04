import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";
import { etudiants } from "./etudiants";

/**
 * Demandes des étudiants depuis leur espace personnel.
 * - type "libre" : titre + description saisis librement.
 * - type "predefini" : titre choisi dans le catalogue, description modifiable.
 * - statut : en_attente | en_cours | traite | rejete
 */
export const studentRequests = pgTable("student_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  etudiantId: uuid("etudiant_id")
    .notNull()
    .references(() => etudiants.id, { onDelete: "cascade" }),
  type: text("type").notNull().default("libre"),
  titre: text("titre").notNull(),
  description: text("description").notNull().default(""),
  statut: text("statut").notNull().default("en_attente"),
  reponse: text("reponse").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
