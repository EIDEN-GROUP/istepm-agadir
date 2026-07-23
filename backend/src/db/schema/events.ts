import { pgTable, uuid, text, timestamp, date, boolean, jsonb } from "drizzle-orm/pg-core";

export const events = pgTable("events", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  date: date("date").notNull(),
  startTime: text("start_time").notNull().default("08:00"),
  endTime: text("end_time").notNull().default("09:00"),
  allDay: boolean("all_day").notNull().default(false),
  type: text("type").notNull().default("event"),
  color: text("color").notNull().default("blue"),
  location: text("location").notNull().default(""),
  createdBy: text("created_by").notNull().default(""),
  recurrence: jsonb("recurrence"),
  status: text("status").notNull().default("confirmed"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
