import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate, requireRole } from "@/middleware/auth";
import { getDb } from "@/db";
import { notifications } from "@/db/schema/notifications";
import { eq, and, desc, or, isNull } from "drizzle-orm";
import { sql } from "drizzle-orm";

/**
 * Périmètre de visibilité : les directeurs supervisent tout (légitime),
 * les autres rôles ne voient que leurs notifications + la diffusion
 * (userId NULL). Sans ceci, tout compte authentifié lisait/modifiait les
 * notifications de tout le monde (IDOR/BOLA).
 */
export function scopeCondition(userId: string, role?: string) {
  if (role === "directeur") return undefined;
  return or(eq(notifications.userId, userId), isNull(notifications.userId));
}

export async function notificationRoutes(app: FastifyInstance) {
  app.get("/", { preHandler: [authenticate] }, async (request) => {
    const query = request.query as { unreadOnly?: string; limit?: string };
    const db = getDb();
    const conditions = [];
    const scope = scopeCondition(request.user.id, request.user.role);
    if (scope) conditions.push(scope);
    if (query.unreadOnly === "true") conditions.push(eq(notifications.read, false));
    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const asked = query.limit ? parseInt(query.limit, 10) : 50;
    const limit = Number.isFinite(asked) ? Math.min(Math.max(asked, 1), 100) : 50;
    return db
      .select()
      .from(notifications)
      .where(where)
      .orderBy(desc(notifications.createdAt))
      .limit(limit);
  });

  app.get("/unread-count", { preHandler: [authenticate] }, async (request) => {
    const db = getDb();
    const conditions = [eq(notifications.read, false)];
    const scope = scopeCondition(request.user.id, request.user.role);
    if (scope) conditions.push(scope);
    const [result] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(notifications)
      .where(and(...conditions));
    return { count: result.count };
  });

  app.put("/:id/read", { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const db = getDb();
    const conditions = [eq(notifications.id, id)];
    const scope = scopeCondition(request.user.id, request.user.role);
    if (scope) conditions.push(scope);
    const [updated] = await db
      .update(notifications)
      .set({ read: true })
      .where(and(...conditions))
      .returning();
    if (!updated) return reply.status(404).send({ error: "Notification introuvable" });
    return updated;
  });

  app.put("/read-all", { preHandler: [authenticate] }, async (request) => {
    const db = getDb();
    const scope = scopeCondition(request.user.id, request.user.role);
    await db.update(notifications).set({ read: true }).where(scope);
    return { ok: true };
  });

  app.post("/", { preHandler: [authenticate, requireRole("directeur")] }, async (request) => {
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
