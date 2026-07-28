import {
  pgTable,
  uuid,
  text,
  integer,
  numeric,
  timestamp,
} from "drizzle-orm/pg-core";

export const modules = pgTable("modules", {
  id: uuid("id").primaryKey().defaultRandom(),
  nom: text("nom").notNull(),
  filiere: text("filiere").notNull(),
  code: text("code"),
  description: text("description"),
  volumeHoraire: integer("volume_horaire"),
  coefficient: numeric("coefficient"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
