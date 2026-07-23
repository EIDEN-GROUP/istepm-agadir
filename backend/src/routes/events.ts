import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate, requireRole } from "@/middleware/auth";
import { getDb } from "@/db";
import { events } from "@/db/schema/events";
import { planifications } from "@/db/schema/planifications";
import { holidays } from "@/db/schema/holidays";
import { schoolVacations } from "@/db/schema/vacations";
import { calendarExceptions } from "@/db/schema/calendar-exceptions";
import { examens } from "@/db/schema/examens";
import { eq, and, gte, lte, or, sql } from "drizzle-orm";

const createEventSchema = z.object({
  title: z.string().min(1, "Titre requis"),
  description: z.string().optional().default(""),
  date: z.string().min(1, "Date requise"),
  startTime: z.string().optional().default("08:00"),
  endTime: z.string().optional().default("09:00"),
  allDay: z.boolean().optional().default(false),
  type: z.enum(["event", "meeting", "deadline", "reminder", "task"]).optional().default("event"),
  color: z.string().optional().default("blue"),
  location: z.string().optional().default(""),
  recurrence: z.any().optional(),
  status: z.enum(["confirmed", "tentative", "cancelled"]).optional().default("confirmed"),
});

const updateEventSchema = createEventSchema.partial();

export async function eventRoutes(app: FastifyInstance) {
  app.get("/", { preHandler: [authenticate] }, async (request) => {
    const query = request.query as { start?: string; end?: string; type?: string };
    const db = getDb();

    let conditions = [];
    if (query.start) conditions.push(gte(events.date, query.start));
    if (query.end) conditions.push(lte(events.date, query.end));
    if (query.type) conditions.push(eq(events.type, query.type));

    const allEvents = await db
      .select()
      .from(events)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(events.date, events.startTime);

    return allEvents;
  });

  app.get("/feed", { preHandler: [authenticate] }, async (request) => {
    const query = request.query as { start?: string; end?: string };
    const db = getDb();

    const start = query.start ?? new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10);
    const end = query.end ?? new Date(new Date().getFullYear() + 1, 0, 1).toISOString().slice(0, 10);

    const dateFilter = and(gte(events.date, start), lte(events.date, end));

    const [allEvents, allPlanifications, allHolidays, allVacations, allExceptions, allExamens] =
      await Promise.all([
        db.select().from(events).where(dateFilter).orderBy(events.date),
        db.select().from(planifications).where(and(gte(planifications.date, start), lte(planifications.date, end))).orderBy(planifications.date),
        db.select().from(holidays).where(and(gte(holidays.date, start), lte(holidays.date, end))).orderBy(holidays.date),
        db.select().from(schoolVacations).orderBy(schoolVacations.startDate),
        db.select().from(calendarExceptions).where(and(gte(calendarExceptions.date, start), lte(calendarExceptions.date, end))).orderBy(calendarExceptions.date),
        db.select({ id: examens.id, module: examens.module, date: examens.date, heure: examens.heure, salle: examens.salle, type: examens.type, statut: examens.statut, filiere: examens.filiere, niveau: examens.niveau }).from(examens).where(and(gte(examens.date, start), lte(examens.date, end))).orderBy(examens.date),
      ]);

    const planificationEvents = allPlanifications.map((p) => ({
      id: `planif-${p.id}`,
      source: "planification",
      title: p.title,
      description: p.detail,
      date: String(p.date).slice(0, 10),
      startTime: String(p.time).slice(0, 5),
      endTime: String(p.time).slice(0, 5),
      allDay: false,
      type: "event",
      color: p.tone ?? "zinc",
      location: "",
    }));

    const holidayEvents = allHolidays.map((h) => ({
      id: `holiday-${h.id}`,
      source: "holiday",
      title: `Férié: ${h.label}`,
      description: "",
      date: String(h.date).slice(0, 10),
      startTime: "00:00",
      endTime: "23:59",
      allDay: true,
      type: "holiday",
      color: "red",
      location: "",
    }));

    const vacationEvents: Array<{
      id: string; source: string; title: string; description: string;
      date: string; startTime: string; endTime: string; allDay: boolean;
      type: string; color: string; location: string;
    }> = [];
    for (const v of allVacations) {
      const startDate = String(v.startDate).slice(0, 10);
      vacationEvents.push({
        id: `vacation-${v.id}`,
        source: "vacation",
        title: `Vacances: ${v.label}`,
        description: "",
        date: startDate,
        startTime: "00:00",
        endTime: "23:59",
        allDay: true,
        type: "vacation",
        color: "amber",
        location: "",
      });
    }

    const exceptionEvents = allExceptions.map((e) => ({
      id: `exception-${e.id}`,
      source: "exception",
      title: `Exception: ${e.label}`,
      description: "",
      date: String(e.date).slice(0, 10),
      startTime: "00:00",
      endTime: "23:59",
      allDay: true,
      type: "exception",
      color: "purple",
      location: "",
    }));

    const examenEvents = allExamens.map((ex) => ({
      id: `examen-${ex.id}`,
      source: "examen",
      title: `${ex.module} (${ex.filiere})`,
      description: `Salle: ${ex.salle} · ${ex.niveau} · ${ex.type}`,
      date: ex.date,
      startTime: ex.heure.slice(0, 5),
      endTime: "",
      allDay: false,
      type: "exam",
      color: "blue",
      location: ex.salle,
    }));

    return {
      events: allEvents,
      planifications: planificationEvents,
      holidays: holidayEvents,
      vacations: vacationEvents,
      exceptions: exceptionEvents,
      examens: examenEvents,
      feed: [
        ...planificationEvents,
        ...holidayEvents,
        ...vacationEvents,
        ...exceptionEvents,
        ...examenEvents,
        ...allEvents.map((e) => ({
          id: `event-${e.id}`,
          source: "event" as const,
          title: e.title,
          description: e.description,
          date: e.date,
          startTime: e.startTime,
          endTime: e.endTime,
          allDay: e.allDay,
          type: e.type,
          color: e.color,
          location: e.location,
        })),
      ].sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime)),
    };
  });

  app.get("/:id", { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const db = getDb();
    const [event] = await db.select().from(events).where(eq(events.id, id)).limit(1);
    if (!event) return reply.status(404).send({ error: "Événement introuvable" });
    return event;
  });

  app.post("/", { preHandler: [authenticate, requireRole("directeur", "responsable")] }, async (request, reply) => {
    const input = createEventSchema.parse(request.body);
    const db = getDb();
    const [event] = await db.insert(events).values(input).returning();
    return event;
  });

  app.put("/:id", { preHandler: [authenticate, requireRole("directeur", "responsable")] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = updateEventSchema.parse(request.body);
    const db = getDb();
    const [existing] = await db.select().from(events).where(eq(events.id, id)).limit(1);
    if (!existing) return reply.status(404).send({ error: "Événement introuvable" });
    const [updated] = await db
      .update(events)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(events.id, id))
      .returning();
    return updated;
  });

  app.delete("/:id", { preHandler: [authenticate, requireRole("directeur", "responsable")] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const db = getDb();
    const [existing] = await db.select().from(events).where(eq(events.id, id)).limit(1);
    if (!existing) return reply.status(404).send({ error: "Événement introuvable" });
    await db.delete(events).where(eq(events.id, id));
    return { ok: true };
  });
}
