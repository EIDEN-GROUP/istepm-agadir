import { pgTable, uuid, timestamp } from "drizzle-orm/pg-core";
import { centers } from "./centers";
import { users } from "./users";

export const centerAdmins = pgTable("center_admins", {
  centerId: uuid("center_id").notNull().references(() => centers.id, { onDelete: "cascade" }),
  profileId: uuid("profile_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
