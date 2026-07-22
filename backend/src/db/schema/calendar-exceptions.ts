import { pgTable, uuid, text, date, timestamp } from "drizzle-orm/pg-core";

export const calendarExceptions = pgTable("calendar_exceptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  date: date("date").notNull(),
  label: text("label").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
