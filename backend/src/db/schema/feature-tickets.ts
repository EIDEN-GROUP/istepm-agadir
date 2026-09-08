import { pgTable, uuid, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { users } from "./users";

/**
 * Tickets de demande de fonctionnalité, créés via l'assistant IA.
 * Table lue aussi par le BMS (pull via /api/feature-tickets/feed) :
 * garder des clés plates et stables — le BMS construit ses colonnes
 * dynamiquement depuis la première ligne.
 */
export const featureTickets = pgTable("feature_tickets", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  priority: text("priority").notNull().default("medium"),
  status: text("status").notNull().default("open"),
  /** Verdict renvoyé par le BMS (DONE/REJECT + motif) via /inbox. */
  resolution: text("resolution").notNull().default(""),
  resolvedAt: timestamp("resolved_at"),
  /** Faux dès qu'un verdict arrive → cloche du demandeur. */
  vuParDemandeur: boolean("vu_par_demandeur").notNull().default(true),
  requestedBy: uuid("requested_by").references(() => users.id, { onDelete: "set null" }),
  requestedName: text("requested_name").notNull().default(""),
  requestedEmail: text("requested_email").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
