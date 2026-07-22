import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate } from "@/middleware/auth";
import { getDb } from "@/db";
import { supportSessions } from "@/db/schema/support-sessions";
import { supportMessages } from "@/db/schema/support-messages";
import { eq, desc, isNull, and, sql } from "drizzle-orm";

const messageSchema = z.object({
  sessionId: z.string(),
  content: z.string().min(1),
});

const createSessionSchema = z.object({
  centerId: z.string().optional(),
  adminName: z.string().optional().default(""),
});

export async function supportRoutes(app: FastifyInstance) {
  app.get("/sessions/open", { preHandler: [authenticate] }, async (request) => {
    const db = getDb();
    const isSuperadmin = request.user?.role === "superadmin";

    let query = db
      .select()
      .from(supportSessions)
      .where(eq(supportSessions.status, "open"))
      .orderBy(desc(supportSessions.createdAt))
      .$dynamic();

    if (!isSuperadmin && request.user) {
      query = query.where(eq(supportSessions.adminId, request.user.id));
    }

    const sessions = await query;

    // Attach last message
    const enriched = await Promise.all(
      sessions.map(async (s) => {
        const [lastMsg] = await db
          .select({ content: supportMessages.content, senderRole: supportMessages.senderRole, createdAt: supportMessages.createdAt })
          .from(supportMessages)
          .where(eq(supportMessages.sessionId, s.id))
          .orderBy(desc(supportMessages.createdAt))
          .limit(1);
        return { ...s, lastMessage: lastMsg ?? null };
      }),
    );

    return enriched;
  });

  app.post("/sessions", { preHandler: [authenticate] }, async (request) => {
    const { centerId, adminName } = createSessionSchema.parse(request.body);
    const db = getDb();

    const [session] = await db
      .insert(supportSessions)
      .values({
        centerId: centerId ?? null,
        adminId: request.user!.id,
        adminName: adminName || request.user!.name,
      })
      .returning();

    return session;
  });

  app.get("/sessions/:id/messages", { preHandler: [authenticate] }, async (request) => {
    const { id } = request.params as { id: string };
    const db = getDb();
    return db
      .select()
      .from(supportMessages)
      .where(eq(supportMessages.sessionId, id))
      .orderBy(supportMessages.createdAt);
  });

  app.post("/sessions/:id/messages", { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { content } = z.object({ content: z.string().min(1) }).parse(request.body);
    const db = getDb();

    const [session] = await db
      .select()
      .from(supportSessions)
      .where(eq(supportSessions.id, id))
      .limit(1);
    if (!session) return reply.status(404).send({ error: "Session introuvable" });

    const [msg] = await db
      .insert(supportMessages)
      .values({
        sessionId: id,
        senderId: request.user!.id,
        senderRole: request.user!.role,
        content,
      })
      .returning();

    return msg;
  });

  app.post("/sessions/:id/close", { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const db = getDb();
    const [session] = await db
      .update(supportSessions)
      .set({ status: "closed" })
      .where(eq(supportSessions.id, id))
      .returning();
    if (!session) return reply.status(404).send({ error: "Session introuvable" });
    return session;
  });
}
