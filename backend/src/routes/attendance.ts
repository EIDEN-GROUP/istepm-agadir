import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate, requireRole } from "@/middleware/auth";
import { getDb } from "@/db";
import { attendance, attendanceSession } from "@/db/schema/attendance";
import { seances } from "@/db/schema/seances";
import { ownEtudiantId, teacherScope } from "@/lib/scope";
import { eq, and, inArray, desc, sql } from "drizzle-orm";

/** Un enseignant ne gère que ses propres séances (sauf direction). */
async function assertSeanceOwnership(
  db: ReturnType<typeof getDb>,
  user: { id: string; role: string },
  seanceId: string,
): Promise<{ ok: boolean; error?: string }> {
  if (user.role === "directeur" || user.role === "responsable") return { ok: true };
  if (user.role !== "enseignant") return { ok: false, error: "Accès refusé : rôle insuffisant" };
  const scope = await teacherScope(user.id);
  const [seance] = await db.select().from(seances).where(eq(seances.id, seanceId)).limit(1);
  if (!seance) return { ok: false, error: "Séance introuvable" };
  if (!scope || seance.professeurId !== scope.id) {
    return { ok: false, error: "Séance introuvable" };
  }
  return { ok: true };
}

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
    const ownership = await assertSeanceOwnership(db, request.user, seanceId);
    if (!ownership.ok) return reply.status(404).send({ error: ownership.error ?? "Séance introuvable" });
    const [session] = await db
      .insert(attendanceSession)
      .values({ seanceId, date: seance.date })
      .returning();
    return session;
  });

  app.post("/session/:id/close", { preHandler: [authenticate, requireRole("directeur", "responsable", "enseignant")] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const db = getDb();
    const [session] = await db
      .select()
      .from(attendanceSession)
      .where(eq(attendanceSession.id, id))
      .limit(1);
    if (!session) return reply.status(404).send({ error: "Session introuvable" });
    const ownership = await assertSeanceOwnership(db, request.user, session.seanceId);
    if (!ownership.ok) return reply.status(404).send({ error: ownership.error ?? "Session introuvable" });
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

  app.post("/bulk", { preHandler: [authenticate, requireRole("directeur", "responsable", "enseignant")] }, async (request, reply) => {
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
    const ownership = await assertSeanceOwnership(db, request.user, input.seanceId);
    if (!ownership.ok) return reply.status(404).send({ error: ownership.error ?? "Séance introuvable" });
    await db.delete(attendance).where(eq(attendance.seanceId, input.seanceId));
    const inserted = await db.insert(attendance).values(
      input.entries.map((e) => ({ seanceId: input.seanceId, ...e })),
    ).returning();
    return inserted;
  });

  app.get("/seance/:seanceId", { preHandler: [authenticate] }, async (request, reply) => {
    const { seanceId } = request.params as { seanceId: string };
    const db = getDb();
    if (request.user.role === "etudiant") {
      const own = await ownEtudiantId(request.user.id);
      if (!own) return reply.status(404).send({ error: "Introuvable" });
      return db
        .select()
        .from(attendance)
        .where(and(eq(attendance.seanceId, seanceId), eq(attendance.etudiantId, own)))
        .orderBy(attendance.etudiantId);
    }
    return db
      .select()
      .from(attendance)
      .where(eq(attendance.seanceId, seanceId))
      .orderBy(attendance.etudiantId);
  });

  app.get("/etudiant/:etudiantId", { preHandler: [authenticate] }, async (request, reply) => {
    const { etudiantId } = request.params as { etudiantId: string };
    const db = getDb();
    if (request.user.role === "etudiant") {
      const own = await ownEtudiantId(request.user.id);
      if (!own || own !== etudiantId) return reply.status(404).send({ error: "Introuvable" });
    }
    return db
      .select()
      .from(attendance)
      .where(eq(attendance.etudiantId, etudiantId))
      .orderBy(desc(attendance.createdAt));
  });

  app.get("/summary/seance/:seanceId", { preHandler: [authenticate] }, async (request, reply) => {
    const { seanceId } = request.params as { seanceId: string };
    const db = getDb();
    const conditions = [eq(attendance.seanceId, seanceId)];
    if (request.user.role === "etudiant") {
      const own = await ownEtudiantId(request.user.id);
      if (!own) return reply.status(404).send({ error: "Introuvable" });
      conditions.push(eq(attendance.etudiantId, own));
    }
    const rows = await db
      .select()
      .from(attendance)
      .where(and(...conditions));
    const total = rows.length;
    const presents = rows.filter((r) => r.present).length;
    const justifies = rows.filter((r) => r.justifie).length;
    const absents = total - presents;
    return { total, presents, absents, justifies, taux: total > 0 ? Math.round((presents / total) * 100) : 0 };
  });

  app.get("/summary/etudiant/:etudiantId", { preHandler: [authenticate] }, async (request, reply) => {
    const { etudiantId } = request.params as { etudiantId: string };
    const db = getDb();
    if (request.user.role === "etudiant") {
      const own = await ownEtudiantId(request.user.id);
      if (!own || own !== etudiantId) return reply.status(404).send({ error: "Introuvable" });
    }
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
