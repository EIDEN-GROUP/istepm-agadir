import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";

export const emailLogs = pgTable("email_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  recipient: text("recipient").notNull(),
  subject: text("subject").notNull(),
  type: text("type").notNull().default("custom"),
  status: text("status").notNull().default("sent"),
  errorMsg: text("error_msg").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
