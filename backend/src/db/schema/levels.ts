import {
  pgTable,
  uuid,
  text,
  numeric,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";

export const levels = pgTable("levels", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  cycle: text("cycle").notNull().default(""),
  monthlyFee: numeric("monthly_fee").notNull().default("0"),
  maxStudents: integer("max_students").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
