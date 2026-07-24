import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate, requireRole } from "@/middleware/auth";
import { getDb } from "@/db";
import { notesEtudiant } from "@/db/schema/notes-etudiant";
import { etudiants } from "@/db/schema/etudiants";
import { eq, and } from "drizzle-orm";

const createNoteSchema = z.object({
  etudiantId: z.string().uuid(),
  module: z.string().min(1, "Module requis"),
  note: z.number().min(0).max(20, "La note doit être entre 0 et 20"),
  coef: z.number().min(0).optional().default(3),
  credits: z.number().min(0).optional().default(6),
  examen: z.string().optional().default(""),
});

function ponderee(
  notes: { note: string; coef: string }[],
): number {
  let total = 0;
  let totalCoef = 0;
  for (const n of notes) {
    total += Number(n.note) * Number(n.coef);
    totalCoef += Number(n.coef);
  }
  return totalCoef > 0 ? Math.round((total / totalCoef) * 100) / 100 : 0;
}

async function recalculerMoyenne(db: ReturnType<typeof getDb>, etudiantId: string) {
  const all = await db
    .select({ note: notesEtudiant.note, coef: notesEtudiant.coef })
    .from(notesEtudiant)
    .where(eq(notesEtudiant.etudiantId, etudiantId));
  const moyenne = ponderee(all);
  await db
    .update(etudiants)
    .set({ moyenne: String(moyenne) })
    .where(eq(etudiants.id, etudiantId));
  return moyenne;
}

export async function noteRoutes(app: FastifyInstance) {
  app.post(
    "/",
    { preHandler: [authenticate, requireRole("directeur", "enseignant", "responsable")] },
    async (request) => {
      const input = createNoteSchema.parse(request.body);
      const db = getDb();

      const [existing] = await db
        .select()
        .from(notesEtudiant)
        .where(
          and(
            eq(notesEtudiant.etudiantId, input.etudiantId),
            eq(notesEtudiant.module, input.module),
          ),
        )
        .limit(1);

      if (existing) {
        const [updated] = await db
          .update(notesEtudiant)
          .set({
            note: String(input.note),
            coef: String(input.coef),
            credits: String(input.credits),
            examen: input.examen,
          })
          .where(eq(notesEtudiant.id, existing.id))
          .returning();
        await recalculerMoyenne(db, input.etudiantId);
        return updated;
      }

      const [created] = await db
        .insert(notesEtudiant)
        .values({
          etudiantId: input.etudiantId,
          module: input.module,
          note: String(input.note),
          coef: String(input.coef),
          credits: String(input.credits),
          examen: input.examen,
        })
        .returning();

      await recalculerMoyenne(db, input.etudiantId);
      return created;
    },
  );

  app.delete(
    "/:id",
    { preHandler: [authenticate, requireRole("directeur", "enseignant", "responsable")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const db = getDb();

      const [note] = await db
        .select()
        .from(notesEtudiant)
        .where(eq(notesEtudiant.id, id))
        .limit(1);
      if (!note) return reply.status(404).send({ error: "Note introuvable" });

      await db.delete(notesEtudiant).where(eq(notesEtudiant.id, id));
      await recalculerMoyenne(db, note.etudiantId);
      return { ok: true };
    },
  );
}
