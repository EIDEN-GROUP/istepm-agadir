import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate, requireRole } from "@/middleware/auth";
import { getDb } from "@/db";
import { featureTickets } from "@/db/schema/feature-tickets";
import { TICKET_ALLOWED_ROLES } from "@/lib/agent/actions";
import { getEnv } from "@/config/env";
import { eq, and, desc, sql, count, ne } from "drizzle-orm";

const createTicketSchema = z.object({
  title: z.string().trim().min(3, "Titre trop court (3 caractères min)").max(150),
  description: z.string().trim().max(2000).optional().default(""),
  priority: z.enum(["low", "medium", "high"]).optional().default("medium"),
});

/** Vérifie la clé BMS (jamais journalisée). */
function checkFeedKey(request: { headers: Record<string, string | string[] | undefined> }): boolean {
  const configured = getEnv().FEATURE_TICKETS_API_KEY;
  if (!configured) return false;
  const provided = request.headers["x-api-key"];
  const key = Array.isArray(provided) ? provided[0] : provided;
  return !!key && key === configured;
}

const UUID_RE = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

/**
 * Verdict renvoyé par le BMS via son bouton Push ({title, description}).
 * Convention de titre : "DONE <id>" ou "REJECT <id>" (insensible à la casse
 * et aux accents : TERMINÉ, REJETÉ… acceptés), motif dans `description`.
 */
function parseVerdict(title: string): { status: "done" | "rejected"; id: string } | null {
  const norm = title
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .trim();
  // Note : le titre est normalisé en majuscules, donc l'UUID exige le flag `i`.
  const m = norm.match(new RegExp(`^(DONE|TERMINEE?|REJECT|REJETER|REJETEE?|REJET|REFUSE)\\s+(${UUID_RE})$`, "i"));
  if (!m) return null;
  const word = m[1];
  return {
    status: word === "DONE" || word === "TERMINE" || word === "TERMINEE" ? "done" : "rejected",
    id: m[2].toLowerCase(),
  };
}

export async function featureTicketRoutes(app: FastifyInstance) {
  // Crée un ticket (via assistant IA, création immédiate sans confirmation :
  // l'IA annonce la prise en charge et prévient du verdict dans le chat).
  // Limite d'écriture : 30/min (l'anti-doublon absorbe les doubles envois).
  app.post(
    "/",
    {
      preHandler: [authenticate, requireRole(...TICKET_ALLOWED_ROLES)],
      config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
    },
    async (request, reply) => {
      const input = createTicketSchema.parse(request.body);
      const db = getDb();
      const normTitle = input.title.trim().replace(/\s+/g, " ");

      // Anti-doublon : même demandeur + même titre, ticket encore ouvert (24 h).
      // Un ticket déjà tranché (done/rejected) ne bloque pas un nouveau dépôt.
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const [existing] = await db
        .select()
        .from(featureTickets)
        .where(
          and(
            eq(featureTickets.requestedBy, request.user.id),
            eq(featureTickets.status, "open"),
            sql`lower(${featureTickets.title}) = lower(${normTitle})`,
            sql`${featureTickets.createdAt} >= ${since.toISOString()}`,
          ),
        )
        .limit(1);
      if (existing) {
        return reply.status(200).send({ ticket: existing, deduped: true });
      }

      const [ticket] = await db
        .insert(featureTickets)
        .values({
          title: normTitle,
          description: input.description,
          priority: input.priority,
          requestedBy: request.user.id,
          requestedName: request.user.name,
          requestedEmail: request.user.email,
        })
        .returning();
      return reply.status(201).send({ ticket, deduped: false });
    },
  );

  // Miroir local (suivi).
  app.get(
    "/",
    { preHandler: [authenticate, requireRole(...TICKET_ALLOWED_ROLES)] },
    async () => {
      const db = getDb();
      return db
        .select()
        .from(featureTickets)
        .orderBy(desc(featureTickets.createdAt))
        .limit(200);
    },
  );

  // Flux lu par le BMS (pull, sans JWT) : tableau nu, 200 derniers, stable.
  // Les clés ci-dessous construisent les colonnes côté BMS : ne jamais les renommer.
  app.get(
    "/feed",
    { config: { rateLimit: { max: 60, timeWindow: "1 minute" } } },
    async (request, reply) => {
      if (!getEnv().FEATURE_TICKETS_API_KEY) {
        return reply.status(503).send({ error: "Flux tickets non configuré" });
      }
      if (!checkFeedKey(request)) {
        return reply.status(401).send({ error: "Clé API invalide" });
      }
      const db = getDb();
      const rows = await db
        .select()
        .from(featureTickets)
        .orderBy(desc(featureTickets.createdAt))
        .limit(200);
      return rows.map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        priority: t.priority,
        status: t.status,
        resolution: t.resolution,
        requested_by: t.requestedName || t.requestedEmail,
        requested_at: t.createdAt instanceof Date ? t.createdAt.toISOString().slice(0, 10) : String(t.createdAt ?? ""),
      }));
    },
  );

  // Boîte de retour BMS : le bouton Push de leur onglet envoie {title, description}.
  // Titre attendu : "DONE <id>" ou "REJECT <id>", motif dans `description`
  // (obligatoire pour un rejet). Exemple : { "title": "DONE a1b2…", "description": "" }.
  app.post(
    "/inbox",
    { config: { rateLimit: { max: 60, timeWindow: "1 minute" } } },
    async (request, reply) => {
      if (!getEnv().FEATURE_TICKETS_API_KEY) {
        return reply.status(503).send({ error: "Flux tickets non configuré" });
      }
      if (!checkFeedKey(request)) {
        return reply.status(401).send({ error: "Clé API invalide" });
      }
      const input = z
        .object({
          title: z.string().trim().min(1).max(200),
          description: z.string().trim().max(2000).optional().default(""),
        })
        .parse(request.body);
      const verdict = parseVerdict(input.title);
      if (!verdict) {
        return reply.status(400).send({
          error: "Titre attendu : \"DONE <id>\" ou \"REJECT <id>\" (motif dans description)",
        });
      }
      if (verdict.status === "rejected" && input.description.length < 3) {
        return reply.status(400).send({ error: "Un motif de refus est requis (3 caractères min)" });
      }
      const db = getDb();
      const [updated] = await db
        .update(featureTickets)
        .set({
          status: verdict.status,
          resolution: input.description,
          resolvedAt: new Date(),
          updatedAt: new Date(),
          vuParDemandeur: false,
        })
        .where(eq(featureTickets.id, verdict.id))
        .returning({ id: featureTickets.id, title: featureTickets.title, status: featureTickets.status });
      if (!updated) {
        return reply.status(404).send({ error: `Ticket introuvable : ${verdict.id}` });
      }
      return { ok: true, ticket: updated };
    },
  );

  // Notifications du demandeur : verdicts BMS non encore vus.
  app.get("/notifications", { preHandler: [authenticate] }, async (request) => {
    const db = getDb();
    const visibles = and(
      eq(featureTickets.requestedBy, request.user.id),
      ne(featureTickets.status, "open"),
    );
    const [total, items] = await Promise.all([
      db
        .select({ n: count() })
        .from(featureTickets)
        .where(and(visibles, eq(featureTickets.vuParDemandeur, false))),
      db
        .select({
          id: featureTickets.id,
          titre: featureTickets.title,
          statut: featureTickets.status,
          reponse: featureTickets.resolution,
          luParDemandeur: featureTickets.vuParDemandeur,
          updatedAt: featureTickets.updatedAt,
        })
        .from(featureTickets)
        .where(visibles)
        .orderBy(desc(featureTickets.updatedAt))
        .limit(10),
    ]);
    return { unread: Number(total[0]?.n ?? 0), items };
  });

  // Tout marquer comme lu.
  app.post("/notifications/lu", { preHandler: [authenticate] }, async (request) => {
    const db = getDb();
    const lues = await db
      .update(featureTickets)
      .set({ vuParDemandeur: true })
      .where(and(eq(featureTickets.requestedBy, request.user.id), eq(featureTickets.vuParDemandeur, false)))
      .returning({ id: featureTickets.id });
    return { ok: true, lues: lues.length };
  });

  // Marquer UN verdict comme lu (reste visible, sans badge).
  app.post("/notifications/:id/lu", { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const db = getDb();
    const where =
      request.user.role === "directeur"
        ? eq(featureTickets.id, id)
        : and(eq(featureTickets.id, id), eq(featureTickets.requestedBy, request.user.id));
    const [updated] = await db
      .update(featureTickets)
      .set({ vuParDemandeur: true })
      .where(where)
      .returning({ id: featureTickets.id });
    if (!updated) return reply.status(404).send({ error: "Notification introuvable" });
    return { ok: true };
  });
}
