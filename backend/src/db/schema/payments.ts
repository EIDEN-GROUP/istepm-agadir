import {
  pgTable,
  uuid,
  text,
  numeric,
  boolean,
  date,
  timestamp,
} from "drizzle-orm/pg-core";
import { clients } from "./clients";

export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id")
    .notNull()
    .references(() => clients.id, { onDelete: "cascade" }),
  amount: numeric("amount").notNull(),
  date: date("date").notNull().defaultNow(),
  mode: text("mode").notNull().default("especes"),
  period: text("period").notNull().default(""),
  receipt: text("receipt").notNull().default(""),
  invoiceSent: boolean("invoice_sent").notNull().default(false),
  notes: text("notes").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
