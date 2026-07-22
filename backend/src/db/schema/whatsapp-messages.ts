import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";
import { clients } from "./clients";

export const whatsappMessages = pgTable("whatsapp_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id").references(() => clients.id, { onDelete: "set null" }),
  phone: text("phone").notNull(),
  direction: text("direction").notNull(),
  content: text("content").notNull(),
  status: text("status").notNull().default("pending"),
  waMessageId: text("wa_message_id").notNull().default(""),
  broadcastId: text("broadcast_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
