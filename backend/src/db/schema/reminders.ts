import { pgTable, uuid, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";

export const reminders = pgTable("reminders", {
  id: uuid("id").defaultRandom().primaryKey(),
  eventId: uuid("event_id"),
  targetType: text("target_type").notNull().default("user"),
  targetId: text("target_id").notNull().default(""),
  title: text("title").notNull(),
  message: text("message").notNull().default(""),
  remindAt: timestamp("remind_at").notNull(),
  sent: boolean("sent").notNull().default(false),
  method: text("method").notNull().default("in_app"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
