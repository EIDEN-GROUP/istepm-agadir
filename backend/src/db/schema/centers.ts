import {
  pgTable,
  uuid,
  text,
  numeric,
  boolean,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";

export const centers = pgTable("centers", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  city: text("city").notNull().default(""),
  contactEmail: text("contact_email").notNull().default(""),
  contactPhone: text("contact_phone").notNull().default(""),
  plan: text("plan").notNull().default("essai"),
  status: text("status").notNull().default("actif"),
  monthlyPrice: numeric("monthly_price").notNull().default("0"),
  studentsCount: integer("students_count").notNull().default(0),
  isPrimary: boolean("is_primary").notNull().default(false),
  notes: text("notes").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
