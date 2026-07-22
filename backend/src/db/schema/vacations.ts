import { pgTable, uuid, text, date, timestamp } from "drizzle-orm/pg-core";

export const schoolVacations = pgTable("school_vacations", {
  id: uuid("id").primaryKey().defaultRandom(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  label: text("label").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
