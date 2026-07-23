import { pgTable, uuid, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const notifications = pgTable("notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id"),
  type: text("type").notNull().default("info"),
  title: text("title").notNull(),
  message: text("message").notNull().default(""),
  link: text("link").notNull().default(""),
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
