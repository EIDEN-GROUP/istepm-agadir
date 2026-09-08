import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate, requireRole } from "@/middleware/auth";
import { getDb } from "@/db";
import { featureTickets } from "@/db/schema/feature-tickets";
import { TICKET_ALLOWED_ROLES } from "@/lib/agent/actions";
import { getEnv } from "@/config/env";
import { eq, and, desc, sql } from "drizzle-orm";

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

export async function featureTicketRoutes(app: FastifyInstance) {
  // Crée un ticket (via assistant IA, après confirmation explicite).
  app.post(
    "/",
    { preHandler: [authenticate, requireRole(...TICKET_ALLOWED_ROLES)] },
    async (request, reply) => {
      const input = createTicketSchema.parse(request.body);
      const db = getDb();
      const normTitle = input.title.trim().replace(/\s+/g, " ");

      // Anti-doublon : même demandeur + même titre (24 h) → renvoie l'existant
      // plutôt que de créer/spammer un doublon (et un double toast côté BMS).
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const [existing] = await db
        .select()
        .from(featureTickets)
        .where(
          and(
            eq(featureTickets.requestedBy, request.user.id),
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
        requested_by: t.requestedName || t.requestedEmail,
        requested_at: t.createdAt instanceof Date ? t.createdAt.toISOString().slice(0, 10) : String(t.createdAt ?? ""),
      }));
    },
  );
}
