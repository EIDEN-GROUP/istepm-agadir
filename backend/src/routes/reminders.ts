import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate, requireRole } from "@/middleware/auth";
import { getDb } from "@/db";
import { reminders } from "@/db/schema/reminders";
import { notifications } from "@/db/schema/notifications";
import { events } from "@/db/schema/events";
import { eq, and, lt, desc } from "drizzle-orm";

export async function reminderRoutes(app: FastifyInstance) {
  app.get("/", { preHandler: [authenticate] }, async (request) => {
    const query = request.query as { pending?: string };
    const db = getDb();
    if (query.pending === "true") {
      return db
        .select()
        .from(reminders)
        .where(eq(reminders.sent, false))
        .orderBy(desc(reminders.remindAt));
    }
    return db.select().from(reminders).orderBy(desc(reminders.createdAt));
  });

  app.post("/", { preHandler: [authenticate, requireRole("directeur", "responsable")] }, async (request, reply) => {
    const schema = z.object({
      eventId: z.string().optional(),
      targetType: z.string().optional().default("user"),
      targetId: z.string().optional().default(""),
      title: z.string().min(1),
      message: z.string().optional().default(""),
      remindAt: z.string().min(1),
      method: z.enum(["in_app", "email"]).optional().default("in_app"),
    });
    const input = schema.parse(request.body);
    const db = getDb();
    const [reminder] = await db
      .insert(reminders)
      .values({ ...input, remindAt: new Date(input.remindAt) })
      .returning();
    return reminder;
  });

  app.post("/from-event/:eventId", { preHandler: [authenticate, requireRole("directeur", "responsable")] }, async (request, reply) => {
    const { eventId } = request.params as { eventId: string };
    const schema = z.object({
      minutesBefore: z.number().min(1).max(10080),
      method: z.enum(["in_app", "email"]).optional().default("in_app"),
    });
    const input = schema.parse(request.body);
    const db = getDb();
    const [event] = await db.select().from(events).where(eq(events.id, eventId)).limit(1);
    if (!event) return reply.status(404).send({ error: "Événement introuvable" });
    const eventDate = new Date(`${event.date}T${event.startTime}`);
    const remindAt = new Date(eventDate.getTime() - input.minutesBefore * 60000);
    const [reminder] = await db
      .insert(reminders)
      .values({
        eventId,
        title: `Rappel: ${event.title}`,
        message: `L'événement "${event.title}" commence dans ${input.minutesBefore} minutes.`,
        remindAt,
        method: input.method,
      })
      .returning();
    return reminder;
  });

  app.post("/process", { preHandler: [authenticate, requireRole("directeur", "superadmin")] }, async () => {
    const db = getDb();
    const now = new Date();
    const due = await db
      .select()
      .from(reminders)
      .where(and(eq(reminders.sent, false), lt(reminders.remindAt, now)))
      .limit(50);

    for (const r of due) {
      if (r.method === "in_app") {
        await db.insert(notifications).values({
          userId: r.targetId || undefined,
          type: "reminder",
          title: r.title,
          message: r.message,
          link: `/dashboard/calendar`,
        });
      }
      await db
        .update(reminders)
        .set({ sent: true })
        .where(eq(reminders.id, r.id));
    }

    return { processed: due.length };
  });

  app.delete("/:id", { preHandler: [authenticate, requireRole("directeur")] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const db = getDb();
    await db.delete(reminders).where(eq(reminders.id, id));
    return { ok: true };
  });
}
