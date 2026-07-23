import { pgTable, uuid, text, jsonb, timestamp } from "drizzle-orm/pg-core";

export const userPreferences = pgTable("user_preferences", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().unique(),
  preferences: jsonb("preferences").notNull().default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
