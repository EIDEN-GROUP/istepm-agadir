import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate, requireRole } from "@/middleware/auth";
import { getDb } from "@/db";
import { seances } from "@/db/schema/seances";
import { formateurs } from "@/db/schema/formateurs";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";

const createSeanceSchema = z.object({
  date: z.string().min(1),
  debut: z.string().optional().default("08:00"),
  fin: z.string().optional().default("09:00"),
  professeurId: z.string().optional().default(""),
  module: z.string().min(1),
  filiere: z.string().min(1, "Filière requise"),
  salle: z.string().optional().default(""),
  groupe: z.string().optional().default(""),
  type: z.enum(["cours", "td", "tp", "examen", "stage", "soutenance"]).optional().default("cours"),
  statut: z.enum(["planifie", "en_cours", "termine", "annule"]).optional().default("planifie"),
  anneeUniversitaire: z.string().optional().default(""),
  semestre: z.string().optional().default(""),
  notes: z.string().optional().default(""),
});

const updateSeanceSchema = createSeanceSchema.partial();

export function enrichSeance(row: typeof seances.$inferSelect) {
  const year = row.date ? row.date.slice(0, 4) : "";
  return {
    ...row,
    anneeUniversitaire: row.anneeUniversitaire || (year ? `${year}/${Number(year) + 1}` : ""),
    semestre: row.semestre || "",
    notes: row.notes || undefined,
  };
}

function minutesDepuisMinuit(hhmm: string): number {
  const [h = "0", m = "0"] = hhmm.split(":");
  return Number(h) * 60 + Number(m);
}

/**
 * Conflit de ressources (professeur / salle / groupe) sur le même jour.
 * Le front affiche l'avertissement et peut forcer avec `?force=1`
 * (« Enregistrer malgré le conflit »).
 */
async function trouverConflit(
  db: ReturnType<typeof getDb>,
  c: { date: string; debut: string; fin: string; professeurId: string; salle: string; groupe: string },
  ignorerId?: string,
) {
  const rows = await db.select().from(seances).where(eq(seances.date, c.date));
  const debut = minutesDepuisMinuit(c.debut);
  const fin = minutesDepuisMinuit(c.fin);
  for (const s of rows) {
    if (s.id === ignorerId) continue;
    const d = minutesDepuisMinuit(s.debut);
    const f = minutesDepuisMinuit(s.fin);
    if (fin <= d || debut >= f) continue;
    if (c.professeurId && s.professeurId === c.professeurId)
      return { type: "professeur", seance: enrichSeance(s) };
    if (c.salle && s.salle === c.salle) return { type: "salle", seance: enrichSeance(s) };
    if (c.groupe && s.groupe === c.groupe) return { type: "groupe", seance: enrichSeance(s) };
  }
  return null;
}

export async function seanceRoutes(app: FastifyInstance) {
  app.get("/", { preHandler: [authenticate, requireRole("directeur", "responsable", "enseignant")] }, async (request) => {
    const query = request.query as { start?: string; end?: string; professeurId?: string; date?: string };
    const db = getDb();
    const conditions = [];
    if (request.user.role === "enseignant") {
      // Périmètre du compte : uniquement les séances de la fiche liée.
      // Sans fiche liée, rien (jamais tout l'établissement).
      const [fiche] = await db
        .select({ id: formateurs.id })
        .from(formateurs)
        .where(eq(formateurs.userId, request.user.id))
        .limit(1);
      if (!fiche) return [];
      conditions.push(eq(seances.professeurId, fiche.id));
    }
    if (query.start) conditions.push(gte(seances.date, query.start));
    if (query.end) conditions.push(lte(seances.date, query.end));
    if (query.professeurId) conditions.push(eq(seances.professeurId, query.professeurId));
    if (query.date) conditions.push(eq(seances.date, query.date));
    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const rows = await db.select().from(seances).where(where).orderBy(seances.date, seances.debut);
    return rows.map(enrichSeance);
  });

  app.get("/today", { preHandler: [authenticate, requireRole("directeur", "responsable")] }, async () => {
    const db = getDb();
    const today = new Date().toISOString().slice(0, 10);
    const rows = await db
      .select()
      .from(seances)
      .where(eq(seances.date, today))
      .orderBy(seances.debut);
    return rows.map(enrichSeance);
  });

  app.get("/:id", { preHandler: [authenticate, requireRole("directeur", "responsable")] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const db = getDb();
    const [seance] = await db.select().from(seances).where(eq(seances.id, id)).limit(1);
    if (!seance) return reply.status(404).send({ error: "Séance introuvable" });
    return enrichSeance(seance);
  });

  app.post("/", { preHandler: [authenticate, requireRole("directeur", "responsable")] }, async (request, reply) => {
    const input = createSeanceSchema.parse(request.body);
    const db = getDb();
    const query = request.query as { force?: string };
    if (query.force !== "1") {
      const conflit = await trouverConflit(db, input);
      if (conflit) return reply.status(409).send({ error: "Conflit de ressource", conflit });
    }
    const [seance] = await db.insert(seances).values(input).returning();
    return enrichSeance(seance);
  });

  app.post("/bulk", { preHandler: [authenticate, requireRole("directeur", "responsable")] }, async (request, reply) => {
    const schema = z.object({
      seances: z.array(createSeanceSchema).min(1).max(100),
    });
    const input = schema.parse(request.body);
    const db = getDb();
    const created = await db.insert(seances).values(input.seances).returning();
    return created.map(enrichSeance);
  });

  app.put("/:id", { preHandler: [authenticate, requireRole("directeur", "responsable")] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = updateSeanceSchema.parse(request.body);
    const db = getDb();
    const [existing] = await db.select().from(seances).where(eq(seances.id, id)).limit(1);
    if (!existing) return reply.status(404).send({ error: "Séance introuvable" });
    const merged = { ...existing, ...input };
    const query = request.query as { force?: string };
    if (query.force !== "1" && (input.date !== undefined || input.debut !== undefined || input.fin !== undefined || input.professeurId !== undefined || input.salle !== undefined || input.groupe !== undefined)) {
      const conflit = await trouverConflit(
        db,
        {
          date: merged.date,
          debut: merged.debut,
          fin: merged.fin,
          professeurId: merged.professeurId ?? "",
          salle: merged.salle ?? "",
          groupe: merged.groupe ?? "",
        },
        id,
      );
      if (conflit) return reply.status(409).send({ error: "Conflit de ressource", conflit });
    }
    const [updated] = await db
      .update(seances)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(seances.id, id))
      .returning();
    return enrichSeance(updated);
  });

  app.delete("/:id", { preHandler: [authenticate, requireRole("directeur", "responsable")] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const db = getDb();
    await db.delete(seances).where(eq(seances.id, id));
    return { ok: true };
  });
}
