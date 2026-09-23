import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";

export const groupConfigs = pgTable("group_configs", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  /** Niveaux couverts (ex. ["1ère année", "2ème année"]) — remplace l'ancien `semester` unique (migration 0025). */
  semesters: text("semesters").array().notNull().default([]),
  studentCount: integer("student_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});