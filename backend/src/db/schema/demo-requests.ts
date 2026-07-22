import { pgTable, serial, text, date, timestamp } from "drizzle-orm/pg-core";

export const demoRequests = pgTable("demo_requests", {
  id: serial("id").primaryKey(),
  center: text("center").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  preferredDate: date("preferred_date").notNull(),
  message: text("message"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
