import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate, requireRole } from "@/middleware/auth";
import { getDb } from "@/db";
import { bulletins } from "@/db/schema/bulletins";
import { eq, desc, sql } from "drizzle-orm";

const bulletinSchema = z.object({
  etudiantId: z.string().uuid(),
  cne: z.string().optional().default(""),
  prenom: z.string().optional().default(""),
  nom: z.string().optional().default(""),
  filiere: z.string().optional().default(""),
  niveau: z.string().optional().default(""),
  session: z.string().optional().default("normale"),
  moyenne: z.number().optional().default(0),
  mention: z.string().optional().default("Passable"),
  decision: z.string().optional().default("Admis"),
  statut: z.string().optional().default("genere"),
  evaluationClinique: z.number().optional().default(0),
});

const bulletinUpdateSchema = z.object({
  session: z.string().optional(),
  moyenne: z.number().optional(),
  mention: z.string().optional(),
  decision: z.string().optional(),
  statut: z.string().optional(),
  evaluationClinique: z.number().optional(),
});

export async function bulletinRoutes(app: FastifyInstance) {
  app.get("/", { preHandler: [authenticate] }, async (request) => {
    const db = getDb();
    const query = request.query as {
      filiere?: string;
      niveau?: string;
      statut?: string;
      session?: string;
      search?: string;
    };
    let result = db
      .select()
      .from(bulletins)
      .orderBy(desc(bulletins.createdAt))
      .$dynamic();

    if (query.filiere) {
      result = result.where(eq(bulletins.filiere, query.filiere));
    }
    if (query.niveau) {
      result = result.where(eq(bulletins.niveau, query.niveau));
    }
    if (query.statut) {
      result = result.where(eq(bulletins.statut, query.statut));
    }
    if (query.session) {
      result = result.where(eq(bulletins.session, query.session));
    }
    if (query.search) {
      const q = `%${query.search}%`;
      result = result.where(
        sql`${bulletins.prenom} ILIKE ${q} OR ${bulletins.nom} ILIKE ${q} OR ${bulletins.cne} ILIKE ${q}`,
      );
    }

    return result;
  });

  app.get("/:id", { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const db = getDb();
    const [bulletin] = await db
      .select()
      .from(bulletins)
      .where(eq(bulletins.id, id))
      .limit(1);
    if (!bulletin) return reply.status(404).send({ error: "Bulletin introuvable" });
    return bulletin;
  });

  app.post("/", { preHandler: [authenticate, requireRole("directeur", "responsable")] }, async (request) => {
    const input = bulletinSchema.parse(request.body);
    const db = getDb();
    const [bulletin] = await db
      .insert(bulletins)
      .values({
        ...input,
        moyenne: String(input.moyenne),
        evaluationClinique: String(input.evaluationClinique),
      })
      .returning();
    return bulletin;
  });

  app.put("/:id", { preHandler: [authenticate, requireRole("directeur", "responsable")] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = bulletinUpdateSchema.parse(request.body);
    const db = getDb();
    const values: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(input)) {
      if (val !== undefined) {
        values[key] =
          key === "moyenne" || key === "evaluationClinique" ? String(val) : val;
      }
    }
    const [bulletin] = await db
      .update(bulletins)
      .set(values)
      .where(eq(bulletins.id, id))
      .returning();
    if (!bulletin) return reply.status(404).send({ error: "Bulletin introuvable" });
    return bulletin;
  });

  app.delete("/:id", { preHandler: [authenticate, requireRole("directeur", "responsable")] }, async (request) => {
    const { id } = request.params as { id: string };
    const db = getDb();
    await db.delete(bulletins).where(eq(bulletins.id, id));
    return { ok: true };
  });

  app.post(
    "/:id/publier",
    { preHandler: [authenticate, requireRole("directeur", "responsable")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const db = getDb();
      const [bulletin] = await db
        .update(bulletins)
        .set({ statut: "publie" })
        .where(eq(bulletins.id, id))
        .returning();
      if (!bulletin) return reply.status(404).send({ error: "Bulletin introuvable" });
      return bulletin;
    },
  );

  app.post(
    "/publier-tout",
    { preHandler: [authenticate, requireRole("directeur", "responsable")] },
    async () => {
      const db = getDb();
      const result = await db
        .update(bulletins)
        .set({ statut: "publie" })
        .where(sql`${bulletins.statut} != 'publie'`)
        .returning({ id: bulletins.id });
      return { publies: result.length };
    },
  );
}
