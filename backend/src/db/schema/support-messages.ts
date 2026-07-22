import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";
import { supportSessions } from "./support-sessions";

export const supportMessages = pgTable("support_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id")
    .notNull()
    .references(() => supportSessions.id, { onDelete: "cascade" }),
  senderId: uuid("sender_id").notNull(),
  senderRole: text("sender_role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
