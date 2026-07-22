import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";

export const appointments = pgTable("appointments", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull().default(""),
  phone: text("phone").notNull().default(""),
  subject: text("subject").notNull().default(""),
  type: text("type").notNull().default("contact"),
  status: text("status").notNull().default("nouveau"),
  age: text("age").notNull().default(""),
  message: text("message").notNull().default(""),
  dateTable: text("date_table").notNull().default(""),
  dateDetail: text("date_detail").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
