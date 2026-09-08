import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull().default(""),
  role: text("role").notNull().default("directeur"),
  /** Invitation : seul le hash du lien est stocké (usage unique, 30 min). */
  inviteTokenHash: text("invite_token_hash"),
  inviteExpiresAt: timestamp("invite_expires_at"),
  inviteUsedAt: timestamp("invite_used_at"),
  /** CNE à lier à l'acceptation (compte étudiant créé avant/après la fiche). */
  inviteCne: text("invite_cne").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
