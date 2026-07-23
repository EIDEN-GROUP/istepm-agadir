import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate, requireRole } from "@/middleware/auth";
import { getDb } from "@/db";
import { attendance, attendanceSession } from "@/db/schema/attendance";
import { seances } from "@/db/schema/seances";
import { eq, and, inArray, desc, sql } from "drizzle-orm";

export async function attendanceRoutes(app: FastifyInstance) {
  app.post("/session/open", { preHandler: [authenticate, requireRole("directeur", "responsable", "enseignant")] }, async (request, reply) => {
    const schema = z.object({ seanceId: z.string().min(1) });
    const { seanceId } = schema.parse(request.body);
    const db = getDb();
    const [existing] = await db
      .select()
      .from(attendanceSession)
      .where(eq(attendanceSession.seanceId, seanceId))
      .limit(1);
    if (existing) return reply.status(409).send({ error: "Session déjà ouverte" });
    const [seance] = await db.select().from(seances).where(eq(seances.id, seanceId)).limit(1);
    if (!seance) return reply.status(404).send({ error: "Séance introuvable" });
    const [session] = await db
      .insert(attendanceSession)
      .values({ seanceId, date: seance.date })
      .returning();
    return session;
  });

  app.post("/session/:id/close", { preHandler: [authenticate, requireRole("directeur", "responsable", "enseignant")] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const db = getDb();
    const [updated] = await db
      .update(attendanceSession)
      .set({ statut: "fermee", updatedAt: new Date() })
      .where(eq(attendanceSession.id, id))
      .returning();
    if (!updated) return reply.status(404).send({ error: "Session introuvable" });
    return updated;
  });

  app.get("/session/:seanceId", { preHandler: [authenticate] }, async (request, reply) => {
    const { seanceId } = request.params as { seanceId: string };
    const db = getDb();
    const [session] = await db
      .select()
      .from(attendanceSession)
      .where(eq(attendanceSession.seanceId, seanceId))
      .limit(1);
    if (!session) return reply.status(404).send({ error: "Aucune session d'appel" });
    return session;
  });

  app.post("/bulk", { preHandler: [authenticate, requireRole("directeur", "responsable", "enseignant")] }, async (request) => {
    const schema = z.object({
      seanceId: z.string().min(1),
      entries: z.array(
        z.object({
          etudiantId: z.string().min(1),
          present: z.boolean(),
          justifie: z.boolean().optional().default(false),
          note: z.string().optional().default(""),
        }),
      ),
    });
    const input = schema.parse(request.body);
    const db = getDb();
    await db.delete(attendance).where(eq(attendance.seanceId, input.seanceId));
    const inserted = await db.insert(attendance).values(
      input.entries.map((e) => ({ seanceId: input.seanceId, ...e })),
    ).returning();
    return inserted;
  });

  app.get("/seance/:seanceId", { preHandler: [authenticate] }, async (request) => {
    const { seanceId } = request.params as { seanceId: string };
    const db = getDb();
    return db
      .select()
      .from(attendance)
      .where(eq(attendance.seanceId, seanceId))
      .orderBy(attendance.etudiantId);
  });

  app.get("/etudiant/:etudiantId", { preHandler: [authenticate] }, async (request) => {
    const { etudiantId } = request.params as { etudiantId: string };
    const db = getDb();
    return db
      .select()
      .from(attendance)
      .where(eq(attendance.etudiantId, etudiantId))
      .orderBy(desc(attendance.createdAt));
  });

  app.get("/summary/seance/:seanceId", { preHandler: [authenticate] }, async (request) => {
    const { seanceId } = request.params as { seanceId: string };
    const db = getDb();
    const rows = await db
      .select()
      .from(attendance)
      .where(eq(attendance.seanceId, seanceId));
    const total = rows.length;
    const presents = rows.filter((r) => r.present).length;
    const justifies = rows.filter((r) => r.justifie).length;
    const absents = total - presents;
    return { total, presents, absents, justifies, taux: total > 0 ? Math.round((presents / total) * 100) : 0 };
  });

  app.get("/summary/etudiant/:etudiantId", { preHandler: [authenticate] }, async (request) => {
    const { etudiantId } = request.params as { etudiantId: string };
    const db = getDb();
    const rows = await db
      .select()
      .from(attendance)
      .where(eq(attendance.etudiantId, etudiantId));
    const total = rows.length;
    const presents = rows.filter((r) => r.present).length;
    const justifies = rows.filter((r) => r.justifie).length;
    const absents = total - presents;
    return { total, presents, absents, justifies, taux: total > 0 ? Math.round((presents / total) * 100) : 0 };
  });
}
