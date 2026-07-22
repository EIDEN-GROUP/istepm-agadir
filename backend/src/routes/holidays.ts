import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate } from "@/middleware/auth";
import { getDb } from "@/db";
import { holidays } from "@/db/schema/holidays";
import { schoolVacations } from "@/db/schema/vacations";
import { calendarExceptions } from "@/db/schema/calendar-exceptions";
import { eq, desc } from "drizzle-orm";

const holidaySchema = z.object({
  date: z.string(),
  label: z.string().min(1),
});

const vacationSchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
  label: z.string().min(1),
});

const exceptionSchema = z.object({
  date: z.string(),
  label: z.string().min(1),
});

const syncSchema = z.object({
  years: z.array(z.number()),
});

export async function holidayRoutes(app: FastifyInstance) {
  app.get("/", { preHandler: [authenticate] }, async () => {
    const db = getDb();
    return db.select().from(holidays).orderBy(desc(holidays.date));
  });

  app.post("/", { preHandler: [authenticate] }, async (request) => {
    const input = holidaySchema.parse(request.body);
    const db = getDb();
    const [holiday] = await db.insert(holidays).values(input).returning();
    return holiday;
  });

  app.delete("/:id", { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const db = getDb();
    await db.delete(holidays).where(eq(holidays.id, id));
    return { ok: true };
  });

  app.post("/sync", { preHandler: [authenticate] }, async (request) => {
    const { years } = syncSchema.parse(request.body);
    const db = getDb();
    let imported = 0;

    for (const year of years) {
      try {
        const res = await fetch(`https://date.nager.at/api/v3/publicholidays/${year}/MA`);
        const data = await res.json() as Array<{ date: string; localName: string }>;
        for (const h of data) {
          const [existing] = await db
            .select()
            .from(holidays)
            .where(eq(holidays.date, h.date))
            .limit(1);
          if (!existing) {
            await db.insert(holidays).values({ date: h.date, label: h.localName });
            imported++;
          }
        }
      } catch {
        // Skip failed years
      }
    }

    return { imported };
  });

  app.get("/vacations", { preHandler: [authenticate] }, async () => {
    const db = getDb();
    return db.select().from(schoolVacations).orderBy(desc(schoolVacations.startDate));
  });

  app.post("/vacations", { preHandler: [authenticate] }, async (request) => {
    const input = vacationSchema.parse(request.body);
    const db = getDb();
    const [vacation] = await db.insert(schoolVacations).values(input).returning();
    return vacation;
  });

  app.delete("/vacations/:id", { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const db = getDb();
    await db.delete(schoolVacations).where(eq(schoolVacations.id, id));
    return { ok: true };
  });

  app.get("/exceptions", { preHandler: [authenticate] }, async () => {
    const db = getDb();
    return db.select().from(calendarExceptions).orderBy(desc(calendarExceptions.date));
  });

  app.post("/exceptions", { preHandler: [authenticate] }, async (request) => {
    const input = exceptionSchema.parse(request.body);
    const db = getDb();
    const [exc] = await db.insert(calendarExceptions).values(input).returning();
    return exc;
  });

  app.delete("/exceptions/:id", { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const db = getDb();
    await db.delete(calendarExceptions).where(eq(calendarExceptions.id, id));
    return { ok: true };
  });
}
