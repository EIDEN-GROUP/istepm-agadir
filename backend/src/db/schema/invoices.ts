import {
  pgTable,
  uuid,
  text,
  numeric,
  date,
  timestamp,
} from "drizzle-orm/pg-core";
import { clients } from "./clients";

export const invoices = pgTable("invoices", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id")
    .notNull()
    .references(() => clients.id, { onDelete: "cascade" }),
  period: text("period").notNull(),
  amountDue: numeric("amount_due").notNull().default("0"),
  amountPaid: numeric("amount_paid").notNull().default("0"),
  dueDate: date("due_date"),
  status: text("status").notNull().default("en_attente"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
