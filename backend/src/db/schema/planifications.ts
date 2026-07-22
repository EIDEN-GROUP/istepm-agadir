import { pgTable, uuid, text, time, date, timestamp } from "drizzle-orm/pg-core";

export const planifications = pgTable("planifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  date: date("date").notNull(),
  time: time("time").notNull(),
  title: text("title").notNull(),
  detail: text("detail").notNull().default(""),
  tone: text("tone").notNull().default("zinc"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
