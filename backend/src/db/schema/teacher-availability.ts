import { pgTable, uuid, text, integer, timestamp } from "drizzle-orm/pg-core";

export const teacherAvailability = pgTable("teacher_availability", {
  id: uuid("id").defaultRandom().primaryKey(),
  teacherId: text("teacher_id").notNull(),
  dayOfWeek: integer("day_of_week").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
