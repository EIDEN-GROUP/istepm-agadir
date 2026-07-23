import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate, requireRole } from "@/middleware/auth";
import { getDb } from "@/db";
import { seances } from "@/db/schema/seances";
import { formateurs } from "@/db/schema/formateurs";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";

const createSeanceSchema = z.object({
  date: z.string().min(1),
  debut: z.string().optional().default("08:00"),
  fin: z.string().optional().default("09:00"),
  professeurId: z.string().optional().default(""),
  module: z.string().min(1),
  salle: z.string().optional().default(""),
  groupe: z.string().optional().default(""),
  type: z.enum(["cours", "td", "tp", "examen", "soutenance"]).optional().default("cours"),
  statut: z.enum(["planifie", "en_cours", "termine", "annule"]).optional().default("planifie"),
});

const updateSeanceSchema = createSeanceSchema.partial();

export async function seanceRoutes(app: FastifyInstance) {
  app.get("/", { preHandler: [authenticate] }, async (request) => {
    const query = request.query as { start?: string; end?: string; professeurId?: string; date?: string };
    const db = getDb();
    const conditions = [];
    if (query.start) conditions.push(gte(seances.date, query.start));
    if (query.end) conditions.push(lte(seances.date, query.end));
    if (query.professeurId) conditions.push(eq(seances.professeurId, query.professeurId));
    if (query.date) conditions.push(eq(seances.date, query.date));
    const where = conditions.length > 0 ? and(...conditions) : undefined;
    return db.select().from(seances).where(where).orderBy(seances.date, seances.debut);
  });

  app.get("/today", { preHandler: [authenticate] }, async () => {
    const db = getDb();
    const today = new Date().toISOString().slice(0, 10);
    return db
      .select()
      .from(seances)
      .where(eq(seances.date, today))
      .orderBy(seances.debut);
  });

  app.get("/:id", { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const db = getDb();
    const [seance] = await db.select().from(seances).where(eq(seances.id, id)).limit(1);
    if (!seance) return reply.status(404).send({ error: "Séance introuvable" });
    return seance;
  });

  app.post("/", { preHandler: [authenticate, requireRole("directeur", "responsable")] }, async (request) => {
    const input = createSeanceSchema.parse(request.body);
    const db = getDb();
    const [seance] = await db.insert(seances).values(input).returning();
    return seance;
  });

  app.post("/bulk", { preHandler: [authenticate, requireRole("directeur", "responsable")] }, async (request, reply) => {
    const schema = z.object({
      seances: z.array(createSeanceSchema).min(1).max(100),
    });
    const input = schema.parse(request.body);
    const db = getDb();
    const created = await db.insert(seances).values(input.seances).returning();
    return created;
  });

  app.put("/:id", { preHandler: [authenticate, requireRole("directeur", "responsable")] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = updateSeanceSchema.parse(request.body);
    const db = getDb();
    const [existing] = await db.select().from(seances).where(eq(seances.id, id)).limit(1);
    if (!existing) return reply.status(404).send({ error: "Séance introuvable" });
    const [updated] = await db
      .update(seances)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(seances.id, id))
      .returning();
    return updated;
  });

  app.delete("/:id", { preHandler: [authenticate, requireRole("directeur", "responsable")] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const db = getDb();
    await db.delete(seances).where(eq(seances.id, id));
    return { ok: true };
  });
}
