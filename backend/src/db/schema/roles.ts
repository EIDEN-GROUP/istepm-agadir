import { pgTable, uuid, text, jsonb, boolean, timestamp } from "drizzle-orm/pg-core";

export const roles = pgTable("roles", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description").notNull().default(""),
  permissions: jsonb("permissions").notNull().default([]),
  isSystem: boolean("is_system").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
