import { pgTable, uuid, text, boolean, timestamp, date } from "drizzle-orm/pg-core";

export const attendance = pgTable("attendance", {
  id: uuid("id").defaultRandom().primaryKey(),
  seanceId: uuid("seance_id").notNull(),
  etudiantId: text("etudiant_id").notNull(),
  present: boolean("present").notNull().default(false),
  justifie: boolean("justifie").notNull().default(false),
  note: text("note").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const attendanceSession = pgTable("attendance_session", {
  id: uuid("id").defaultRandom().primaryKey(),
  seanceId: uuid("seance_id").notNull().unique(),
  date: date("date").notNull(),
  statut: text("statut").notNull().default("ouverte"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
