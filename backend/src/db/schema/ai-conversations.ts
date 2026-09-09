import { pgTable, uuid, text, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";
import { users } from "./users";

/**
 * Conversations de l'assistant IA, persistées en base (plus de miroir local).
 * `messages` : [{ role: "user"|"assistant", content }] plafonné à 100.
 * `isActive` : une seule conversation active par utilisateur (gérée en code).
 */
export const aiConversations = pgTable("ai_conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull().default("Nouvelle conversation"),
  messages: jsonb("messages").notNull().default([]),
  isActive: boolean("is_active").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
