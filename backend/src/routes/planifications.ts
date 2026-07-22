import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate } from "@/middleware/auth";
import { getDb } from "@/db";
import { planifications } from "@/db/schema/planifications";
import { eq, desc } from "drizzle-orm";

const planifSchema = z.object({
  date: z.string(),
  time: z.string(),
  title: z.string().min(1),
  detail: z.string().optional().default(""),
  tone: z
    .enum(["violet", "emerald", "amber", "zinc"])
    .optional()
    .default("zinc"),
});

export async function planificationRoutes(app: FastifyInstance) {
  app.get("/", { preHandler: [authenticate] }, async () => {
    const db = getDb();
    return db.select().from(planifications).orderBy(desc(planifications.date));
  });

  app.post("/", { preHandler: [authenticate] }, async (request) => {
    const input = planifSchema.parse(request.body);
    const db = getDb();
    const [plan] = await db.insert(planifications).values(input).returning();
    return plan;
  });

  app.put("/:id", { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = planifSchema.partial().parse(request.body);
    const db = getDb();
    const [plan] = await db
      .update(planifications)
      .set(input)
      .where(eq(planifications.id, id))
      .returning();
    if (!plan)
      return reply.status(404).send({ error: "Planification introuvable" });
    return plan;
  });

  app.delete("/:id", { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const db = getDb();
    await db.delete(planifications).where(eq(planifications.id, id));
    return { ok: true };
  });
}
