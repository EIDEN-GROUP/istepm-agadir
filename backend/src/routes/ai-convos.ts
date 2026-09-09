import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate } from "@/middleware/auth";
import { getDb } from "@/db";
import { aiConversations } from "@/db/schema/ai-conversations";
import { eq, and, desc } from "drizzle-orm";

const MAX_CONVOS = 20;
const MAX_MESSAGES = 100;

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().max(20000),
});

const saveSchema = z.object({
  title: z.string().trim().max(120).optional(),
  messages: z.array(messageSchema).max(MAX_MESSAGES * 2).optional(),
});

function toListItem(c: typeof aiConversations.$inferSelect) {
  const messages = (c.messages ?? []) as { role: string; content: string }[];
  return {
    id: c.id,
    title: c.title,
    updatedAt: c.updatedAt,
    messageCount: messages.length,
  };
}

export async function aiConvoRoutes(app: FastifyInstance) {
  // Liste + conversation active (sans le contenu, léger).
  app.get("/convos", { preHandler: [authenticate] }, async (request) => {
    const db = getDb();
    const rows = await db
      .select()
      .from(aiConversations)
      .where(eq(aiConversations.userId, request.user.id))
      .orderBy(desc(aiConversations.updatedAt))
      .limit(MAX_CONVOS);
    const active = rows.find((r) => r.isActive) ?? rows[0] ?? null;
    return { convos: rows.map(toListItem), activeId: active?.id ?? null };
  });

  // Détail d'une conversation (propriété vérifiée).
  app.get("/convos/:id", { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const db = getDb();
    const [row] = await db
      .select()
      .from(aiConversations)
      .where(and(eq(aiConversations.id, id), eq(aiConversations.userId, request.user.id)))
      .limit(1);
    if (!row) return reply.status(404).send({ error: "Conversation introuvable" });
    return {
      convo: {
        id: row.id,
        title: row.title,
        messages: row.messages ?? [],
        updatedAt: row.updatedAt,
      },
    };
  });

  // Créer (devient l'active).
  app.post("/convos", { preHandler: [authenticate] }, async (request) => {
    const input = saveSchema.parse(request.body);
    const db = getDb();
    const messages = (input.messages ?? []).slice(-MAX_MESSAGES);
    await db
      .update(aiConversations)
      .set({ isActive: false })
      .where(eq(aiConversations.userId, request.user.id));
    const [row] = await db
      .insert(aiConversations)
      .values({
        userId: request.user.id,
        title: (input.title ?? "Nouvelle conversation").slice(0, 120),
        messages,
        isActive: true,
      })
      .returning();
    // Plafond : supprime les plus anciennes (jamais l'active).
    const olds = await db
      .select({ id: aiConversations.id })
      .from(aiConversations)
      .where(eq(aiConversations.userId, request.user.id))
      .orderBy(desc(aiConversations.updatedAt))
      .limit(1000);
    const drop = olds.slice(MAX_CONVOS).filter((o) => o.id !== row.id);
    for (const o of drop) {
      await db.delete(aiConversations).where(eq(aiConversations.id, o.id));
    }
    return { convo: { id: row.id, title: row.title, messages: row.messages ?? [], updatedAt: row.updatedAt } };
  });

  // Sauvegarder titre + messages.
  app.put("/convos/:id", { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = saveSchema.parse(request.body);
    const db = getDb();
    const values: Record<string, unknown> = { updatedAt: new Date() };
    if (input.title !== undefined) values.title = input.title.slice(0, 120);
    if (input.messages !== undefined) values.messages = input.messages.slice(-MAX_MESSAGES);
    const [row] = await db
      .update(aiConversations)
      .set(values)
      .where(and(eq(aiConversations.id, id), eq(aiConversations.userId, request.user.id)))
      .returning();
    if (!row) return reply.status(404).send({ error: "Conversation introuvable" });
    return { convo: { id: row.id, title: row.title, messages: row.messages ?? [], updatedAt: row.updatedAt } };
  });

  // Supprimer (réactive la plus récente si c'était l'active).
  app.delete("/convos/:id", { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const db = getDb();
    const [row] = await db
      .select({ isActive: aiConversations.isActive })
      .from(aiConversations)
      .where(and(eq(aiConversations.id, id), eq(aiConversations.userId, request.user.id)))
      .limit(1);
    if (!row) return reply.status(404).send({ error: "Conversation introuvable" });
    await db.delete(aiConversations).where(eq(aiConversations.id, id));
    if (row.isActive) {
      const [next] = await db
        .select({ id: aiConversations.id })
        .from(aiConversations)
        .where(eq(aiConversations.userId, request.user.id))
        .orderBy(desc(aiConversations.updatedAt))
        .limit(1);
      if (next) {
        await db.update(aiConversations).set({ isActive: true }).where(eq(aiConversations.id, next.id));
      }
      return { ok: true, activeId: next?.id ?? null };
    }
    return { ok: true, activeId: undefined };
  });

  // Définir l'active.
  app.post("/convos/active", { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.body);
    const db = getDb();
    const [row] = await db
      .select({ id: aiConversations.id })
      .from(aiConversations)
      .where(and(eq(aiConversations.id, id), eq(aiConversations.userId, request.user.id)))
      .limit(1);
    if (!row) return reply.status(404).send({ error: "Conversation introuvable" });
    await db
      .update(aiConversations)
      .set({ isActive: false })
      .where(eq(aiConversations.userId, request.user.id));
    await db.update(aiConversations).set({ isActive: true }).where(eq(aiConversations.id, id));
    return { ok: true, activeId: id };
  });

  // Import unique depuis l'ancien stockage local.
  app.post("/convos/import", { preHandler: [authenticate] }, async (request) => {
    const input = z
      .object({
        convos: z
          .array(
            z.object({
              title: z.string().trim().max(120).optional(),
              messages: z.array(messageSchema).max(MAX_MESSAGES * 2),
            }),
          )
          .max(MAX_CONVOS),
      })
      .parse(request.body);
    const db = getDb();
    const created: { id: string }[] = [];
    for (const c of input.convos) {
      const [row] = await db
        .insert(aiConversations)
        .values({
          userId: request.user.id,
          title: (c.title ?? "Conversation importée").slice(0, 120),
          messages: c.messages.slice(-MAX_MESSAGES),
          isActive: false,
        })
        .returning({ id: aiConversations.id });
      created.push({ id: row.id });
    }
    if (created.length) {
      await db
        .update(aiConversations)
        .set({ isActive: false })
        .where(eq(aiConversations.userId, request.user.id));
      const last = created[created.length - 1];
      await db.update(aiConversations).set({ isActive: true }).where(eq(aiConversations.id, last.id));
      return { ok: true, activeId: last.id, count: created.length };
    }
    return { ok: true, activeId: null, count: 0 };
  });
}
