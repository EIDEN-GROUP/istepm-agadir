import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";

export const supportSessions = pgTable("support_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  centerId: uuid("center_id"),
  adminId: uuid("admin_id"),
  adminName: text("admin_name").notNull().default(""),
  status: text("status").notNull().default("open"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
