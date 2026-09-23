import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate, requireRole } from "@/middleware/auth";
import { getDb } from "@/db";
import { inscriptionRequests, rendezVous } from "@/db/schema/inscription-requests";
import { settings } from "@/db/schema/settings";
import { eq, desc, and, sql } from "drizzle-orm";
import { getEnv } from "@/config/env";
import { escHtml, notifyBestEffort } from "@/lib/notify";

/**
 * Demandes d'inscription de la landing page + traitement staff.
 *
 * Public (sans jeton) : `GET /filieres` (référentiel du select) et
 * `POST /` (dépôt, limité comme /send-demo). Tout le reste exige
 * directeur/responsable. E-mails best-effort (gabarits fixes côté serveur,
 * jamais de relais libre) : staff à chaque dépôt, candidat à chaque
 * réponse / rendez-vous.
 */
export const NIVEAUX_INSCRIPTION = [
  "Terminale (bac en cours)",
  "Baccalauréat obtenu",
  "Bac +1 / Bac +2",
  "Licence ou plus",
  "Autre",
] as const;

const depotSchema = z.object({
  prenom: z.string().trim().min(1, "Prénom requis").max(100),
  nom: z.string().trim().min(1, "Nom requis").max(100),
  telephone: z.string().trim().min(1, "Téléphone requis").max(30),
  email: z.string().trim().email("E-mail invalide").max(150),
  filiere: z.string().trim().min(1, "Filière requise"),
  niveau: z.enum(NIVEAUX_INSCRIPTION),
  message: z.string().trim().max(2000).optional().default(""),
});

const statutSchema = z.enum(["en_attente", "en_cours", "traite", "rejete"]);

const reponseSchema = z
  .object({
    statut: statutSchema,
    reponse: z.string().trim().max(2000).optional().default(""),
  })
  .refine((v) => v.statut !== "rejete" || v.reponse.trim().length >= 3, {
    message: "Un motif de refus est requis (3 caractères min)",
  });

const rendezvousSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide (AAAA-MM-JJ)"),
  heure: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Heure invalide (HH:MM)")
    .optional()
    .default(""),
  message: z.string().trim().max(2000).optional().default(""),
});

/** Filières de référence (clé settings `filieres`, éditée dans Paramètres). */
async function filieresReference(): Promise<string[]> {
  const db = getDb();
  const [row] = await db
    .select({ value: settings.value })
    .from(settings)
    .where(eq(settings.key, "filieres"))
    .limit(1);
  const v = row?.value;
  return Array.isArray(v) ? (v as unknown[]).filter((x): x is string => typeof x === "string") : [];
}

export async function inscriptionRoutes(app: FastifyInstance) {
  // Référentiel public du select Filière (landing page, sans jeton).
  app.get("/filieres", async () => {
    return { filieres: await filieresReference() };
  });

  // Dépôt public (landing page) : gabarit fixe, anti-relais, anti-spam.
  app.post(
    "/",
    { config: { rateLimit: { max: 5, timeWindow: "1 hour" } } },
    async (request, reply) => {
      const input = depotSchema.parse(request.body);
      const filieres = await filieresReference();
      if (!filieres.includes(input.filiere)) {
        return reply.status(400).send({ error: "Filière inconnue" });
      }
      const db = getDb();
      const [row] = await db.insert(inscriptionRequests).values(input).returning();
      const env = getEnv();
      const ligne = (k: string, v: string) => `<p><strong>${k} :</strong> ${escHtml(v)}</p>`;
      const html =
        ligne("Prénom", row.prenom) +
        ligne("Nom", row.nom) +
        ligne("Téléphone", row.telephone) +
        ligne("E-mail", row.email) +
        ligne("Filière", row.filiere) +
        ligne("Niveau", row.niveau) +
        (row.message ? `<p><strong>Message :</strong><br>${escHtml(row.message).replace(/\n/g, "<br>")}</p>` : "");
      const text =
        `Prénom : ${row.prenom}\nNom : ${row.nom}\nTéléphone : ${row.telephone}\n` +
        `E-mail : ${row.email}\nFilière : ${row.filiere}\nNiveau : ${row.niveau}\n` +
        (row.message ? `Message : ${row.message}\n` : "");
      // Best-effort : la demande est enregistrée même sans SMTP.
      await notifyBestEffort(
        env.ADMIN_EMAIL,
        `ISTPM · Demande d'inscription — ${row.prenom} ${row.nom}`,
        html,
        text,
        "inscription",
      );
      return reply.status(201).send({ ok: true, id: row.id });
    },
  );

  // Liste staff (recherche + filtre statut), dernier rendez-vous joint.
  app.get(
    "/",
    { preHandler: [authenticate, requireRole("directeur", "responsable")] },
    async (request) => {
      const q = request.query as { statut?: string; search?: string };
      const db = getDb();
      const conds = [];
      if (q.statut) conds.push(eq(inscriptionRequests.statut, q.statut));
      if (q.search) {
        const like = `%${q.search.toLowerCase()}%`;
        conds.push(
          sql`lower(${inscriptionRequests.prenom} || ' ' || ${inscriptionRequests.nom} || ' ' || ${inscriptionRequests.email} || ' ' || ${inscriptionRequests.filiere}) LIKE ${like}`,
        );
      }
      const rows = await db
        .select()
        .from(inscriptionRequests)
        .where(conds.length ? and(...conds) : undefined)
        .orderBy(desc(inscriptionRequests.createdAt));
      if (rows.length === 0) return [];
      const ids = rows.map((r) => r.id);
      const rdvs = await db
        .select()
        .from(rendezVous)
        .where(sql`${rendezVous.inscriptionId} IN (${sql.join(ids.map((id) => sql`${id}::uuid`), sql`, `)})`)
        .orderBy(desc(rendezVous.createdAt));
      const dernierParDemande = new Map<string, typeof rdvs[number]>();
      for (const r of rdvs) {
        if (!dernierParDemande.has(r.inscriptionId)) dernierParDemande.set(r.inscriptionId, r);
      }
      return rows.map((r) => ({ ...r, rendezVous: dernierParDemande.get(r.id) ?? null }));
    },
  );

  // Réponse staff (motif exigé en cas de rejet) + e-mail au candidat.
  app.patch(
    "/:id",
    { preHandler: [authenticate, requireRole("directeur", "responsable")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const input = reponseSchema.parse(request.body);
      const db = getDb();
      const [updated] = await db
        .update(inscriptionRequests)
        .set({ statut: input.statut, reponse: input.reponse ?? "", updatedAt: new Date() })
        .where(eq(inscriptionRequests.id, id))
        .returning();
      if (!updated) return reply.status(404).send({ error: "Demande introuvable" });
      const statutLabel =
        input.statut === "traite" ? "retenue" : input.statut === "rejete" ? "non retenue" : "bien reçue";
      await notifyBestEffort(
        updated.email,
        `ISTPM Agadir · Votre demande d'inscription (${updated.filiere})`,
        `<p>Bonjour ${escHtml(updated.prenom)} ${escHtml(updated.nom)},</p>` +
          `<p>Votre demande d'inscription en <strong>${escHtml(updated.filiere)}</strong> a été ${statutLabel}.</p>` +
          (input.reponse
            ? `<p><strong>Message de l'institut :</strong><br>${escHtml(input.reponse).replace(/\n/g, "<br>")}</p>`
            : "") +
          `<p>Cordialement,<br>L'équipe ISTEPM Agadir</p>`,
        `Bonjour ${updated.prenom} ${updated.nom},\nVotre demande d'inscription en ${updated.filiere} a été ${statutLabel}.\n` +
          (input.reponse ? `Message de l'institut : ${input.reponse}\n` : "") +
          `Cordialement,\nL'équipe ISTEPM Agadir`,
        "inscription-reponse",
      );
      return updated;
    },
  );

  // Rendez-vous staff (passe en « en cours ») + e-mail au candidat.
  app.post(
    "/:id/rendez-vous",
    { preHandler: [authenticate, requireRole("directeur", "responsable")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const input = rendezvousSchema.parse(request.body);
      const db = getDb();
      const [demande] = await db
        .select()
        .from(inscriptionRequests)
        .where(eq(inscriptionRequests.id, id))
        .limit(1);
      if (!demande) return reply.status(404).send({ error: "Demande introuvable" });
      const [rdv] = await db
        .insert(rendezVous)
        .values({
          inscriptionId: id,
          date: input.date,
          heure: input.heure ?? "",
          message: input.message ?? "",
          createdBy: request.user.id,
        })
        .returning();
      await db
        .update(inscriptionRequests)
        .set({ statut: "en_cours", updatedAt: new Date() })
        .where(eq(inscriptionRequests.id, id));
      const quand = `le ${input.date}${input.heure ? ` à ${input.heure}` : ""}`;
      await notifyBestEffort(
        demande.email,
        `ISTPM Agadir · Rendez-vous ${quand} (${demande.filiere})`,
        `<p>Bonjour ${escHtml(demande.prenom)} ${escHtml(demande.nom)},</p>` +
          `<p>L'institut vous propose un rendez-vous <strong>${escHtml(quand)}</strong> au sujet de votre demande d'inscription en <strong>${escHtml(demande.filiere)}</strong>.</p>` +
          (input.message
            ? `<p><strong>Message :</strong><br>${escHtml(input.message).replace(/\n/g, "<br>")}</p>`
            : "") +
          `<p>Merci de confirmer votre venue en répondant à cet e-mail.<br>Cordialement,<br>L'équipe ISTEPM Agadir</p>`,
        `Bonjour ${demande.prenom} ${demande.nom},\nL'institut vous propose un rendez-vous ${quand} au sujet de votre demande d'inscription en ${demande.filiere}.\n` +
          (input.message ? `Message : ${input.message}\n` : "") +
          `Merci de confirmer votre venue en répondant à cet e-mail.\nCordialement,\nL'équipe ISTEPM Agadir`,
        "inscription-rdv",
      );
      return rdv;
    },
  );
}
