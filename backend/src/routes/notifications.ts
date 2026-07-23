import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate, requireRole } from "@/middleware/auth";
import { getDb } from "@/db";
import { notifications } from "@/db/schema/notifications";
import { eq, and, desc } from "drizzle-orm";
import { sql } from "drizzle-orm";

export async function notificationRoutes(app: FastifyInstance) {
  app.get("/", { preHandler: [authenticate] }, async (request) => {
    const query = request.query as { unreadOnly?: string; limit?: string };
    const db = getDb();
    const conditions = [];
    if (query.unreadOnly === "true") conditions.push(eq(notifications.read, false));
    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const limit = query.limit ? parseInt(query.limit, 10) : 50;
    return db
      .select()
      .from(notifications)
      .where(where)
      .orderBy(desc(notifications.createdAt))
      .limit(limit);
  });

  app.get("/unread-count", { preHandler: [authenticate] }, async () => {
    const db = getDb();
    const [result] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(notifications)
      .where(eq(notifications.read, false));
    return { count: result.count };
  });

  app.put("/:id/read", { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const db = getDb();
    const [updated] = await db
      .update(notifications)
      .set({ read: true })
      .where(eq(notifications.id, id))
      .returning();
    if (!updated) return reply.status(404).send({ error: "Notification introuvable" });
    return updated;
  });

  app.put("/read-all", { preHandler: [authenticate] }, async () => {
    const db = getDb();
    await db.update(notifications).set({ read: true });
    return { ok: true };
  });

  app.post("/", { preHandler: [authenticate, requireRole("directeur", "superadmin")] }, async (request) => {
    const schema = z.object({
      userId: z.string().optional(),
      type: z.string().optional().default("info"),
      title: z.string().min(1),
      message: z.string().optional().default(""),
      link: z.string().optional().default(""),
    });
    const input = schema.parse(request.body);
    const db = getDb();
    const [notification] = await db.insert(notifications).values(input).returning();
    return notification;
  });

  app.delete("/:id", { preHandler: [authenticate, requireRole("directeur")] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const db = getDb();
    await db.delete(notifications).where(eq(notifications.id, id));
    return { ok: true };
  });
}
