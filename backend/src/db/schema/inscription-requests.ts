import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Demandes d'inscription depuis la landing page (publique, sans compte).
 * - filiere : valeur VERBATIM de la clé settings `filieres` (validée à l'insertion).
 * - niveau : un des 5 libellés du formulaire (enum applicatif, voir routes/inscriptions.ts).
 * - statut : en_attente | en_cours | traite | rejete
 * Le staff traite via /api/inscriptions (rôle directeur/responsable) ; les
 * rendez-vous vivent dans `rendez_vous` ci-dessous.
 */
export const inscriptionRequests = pgTable("inscription_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  prenom: text("prenom").notNull(),
  nom: text("nom").notNull(),
  telephone: text("telephone").notNull().default(""),
  email: text("email").notNull().default(""),
  filiere: text("filiere").notNull().default(""),
  niveau: text("niveau").notNull().default(""),
  message: text("message").notNull().default(""),
  statut: text("statut").notNull().default("en_attente"),
  reponse: text("reponse").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/**
 * Rendez-vous proposé à un candidat (demande d'inscription).
 * Posé par le staff ; notifié par e-mail (best-effort) à la création.
 */
export const rendezVous = pgTable("rendez_vous", {
  id: uuid("id").primaryKey().defaultRandom(),
  inscriptionId: uuid("inscription_id")
    .notNull()
    .references(() => inscriptionRequests.id, { onDelete: "cascade" }),
  date: text("date").notNull(),
  heure: text("heure").notNull().default(""),
  message: text("message").notNull().default(""),
  createdBy: text("created_by").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
