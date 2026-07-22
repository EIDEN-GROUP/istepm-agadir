import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate } from "@/middleware/auth";
import { getDb } from "@/db";
import { settings } from "@/db/schema/settings";
import { levels } from "@/db/schema/levels";
import { eq, desc } from "drizzle-orm";

const settingSchema = z.object({
  key: z.string().min(1),
  value: z.any(),
});

const levelSchema = z.object({
  name: z.string().min(1),
  cycle: z.string().optional().default(""),
  monthlyFee: z.number().optional().default(0),
  maxStudents: z.number().optional().default(0),
});

export async function settingsRoutes(app: FastifyInstance) {
  app.get("/", { preHandler: [authenticate] }, async () => {
    const db = getDb();
    const rows = await db.select().from(settings);
    const map: Record<string, unknown> = {};
    for (const r of rows) map[r.key] = r.value;
    return map;
  });

  app.put("/:key", { preHandler: [authenticate] }, async (request, reply) => {
    const { key } = request.params as { key: string };
    const { value } = settingSchema.parse(request.body);
    const db = getDb();
    const [existing] = await db
      .select()
      .from(settings)
      .where(eq(settings.key, key))
      .limit(1);

    if (existing) {
      const [updated] = await db
        .update(settings)
        .set({ value })
        .where(eq(settings.key, key))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(settings)
        .values({ key, value })
        .returning();
      return created;
    }
  });

  app.get("/levels", { preHandler: [authenticate] }, async () => {
    const db = getDb();
    return db.select().from(levels).orderBy(desc(levels.createdAt));
  });

  app.post("/levels", { preHandler: [authenticate] }, async (request) => {
    const input = levelSchema.parse(request.body);
    const db = getDb();
    const [level] = await db.insert(levels).values({
      ...input,
      monthlyFee: String(input.monthlyFee),
    }).returning();
    return level;
  });

  app.put("/levels/:id", { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = levelSchema.partial().parse(request.body);
    const db = getDb();
    const values: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(input)) {
      if (val !== undefined) {
        values[key] = key === "monthlyFee" ? String(val) : val;
      }
    }
    const [level] = await db.update(levels).set(values).where(eq(levels.id, id)).returning();
    if (!level) return reply.status(404).send({ error: "Niveau introuvable" });
    return level;
  });

  app.delete("/levels/:id", { preHandler: [authenticate] }, async (request) => {
    const { id } = request.params as { id: string };
    const db = getDb();
    await db.delete(levels).where(eq(levels.id, id));
    return { ok: true };
  });
}
