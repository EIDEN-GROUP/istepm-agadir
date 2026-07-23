import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate, requireRole } from "@/middleware/auth";
import { getDb } from "@/db";
import { examens } from "@/db/schema/examens";
import { notesExamen } from "@/db/schema/notes-examen";
import { etudiants } from "@/db/schema/etudiants";
import { notesEtudiant } from "@/db/schema/notes-etudiant";
import { formateurs } from "@/db/schema/formateurs";
import { eq, desc, and, sql } from "drizzle-orm";

const examenSchema = z.object({
  module: z.string().min(1, "Module requis"),
  filiere: z.string().min(1, "Filière requise"),
  niveau: z.string().min(1, "Niveau requis"),
  type: z.string().min(1, "Type requis"),
  date: z.string().min(1, "Date requise"),
  heure: z.string().optional().default(""),
  salle: z.string().optional().default(""),
  surveillants: z.array(z.string()).optional().default([]),
  statut: z.string().optional().default("planifie"),
  etudiantsConvoques: z.number().optional().default(0),
  composante: z.string().optional().default("Theorique"),
});

const saisieNoteSchema = z.object({
  etudiantId: z.string().uuid(),
  theorique: z.number().min(0).max(20).optional(),
  pratique: z.number().min(0).max(20).optional(),
});

const saveNotesSchema = z.object({
  saisies: z.array(saisieNoteSchema).min(1),
});

function ponderee(notes: { note: string; coef: string }[]): number {
  let total = 0;
  let totalCoef = 0;
  for (const n of notes) {
    total += Number(n.note) * Number(n.coef);
    totalCoef += Number(n.coef);
  }
  return totalCoef > 0 ? Math.round((total / totalCoef) * 100) / 100 : 0;
}

export async function examenRoutes(app: FastifyInstance) {
  app.get("/", { preHandler: [authenticate] }, async (request) => {
    const db = getDb();
    const query = request.query as {
      filiere?: string;
      niveau?: string;
      statut?: string;
      module?: string;
    };
    let result = db
      .select()
      .from(examens)
      .orderBy(desc(examens.date))
      .$dynamic();

    if (query.filiere) {
      result = result.where(eq(examens.filiere, query.filiere));
    }
    if (query.niveau) {
      result = result.where(eq(examens.niveau, query.niveau));
    }
    if (query.statut) {
      result = result.where(eq(examens.statut, query.statut));
    }
    if (query.module) {
      result = result.where(eq(examens.module, query.module));
    }

    return result;
  });

  app.get("/:id", { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const db = getDb();
    const [examen] = await db
      .select()
      .from(examens)
      .where(eq(examens.id, id))
      .limit(1);
    if (!examen) return reply.status(404).send({ error: "Examen introuvable" });

    const notes = await db
      .select({
        id: notesExamen.id,
        etudiantId: notesExamen.etudiantId,
        theorique: notesExamen.theorique,
        pratique: notesExamen.pratique,
        etudiantPrenom: etudiants.prenom,
        etudiantNom: etudiants.nom,
        etudiantCne: etudiants.cne,
        etudiantFiliere: etudiants.filiere,
      })
      .from(notesExamen)
      .leftJoin(etudiants, eq(notesExamen.etudiantId, etudiants.id))
      .where(eq(notesExamen.examenId, id));

    return { ...examen, notes };
  });

  app.post("/", { preHandler: [authenticate, requireRole("directeur", "responsable")] }, async (request) => {
    const input = examenSchema.parse(request.body);
    const db = getDb();
    const [examen] = await db
      .insert(examens)
      .values(input)
      .returning();
    return examen;
  });

  app.put("/:id", { preHandler: [authenticate, requireRole("directeur", "responsable")] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = examenSchema.partial().parse(request.body);
    const db = getDb();
    const values: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(input)) {
      if (val !== undefined) values[key] = val;
    }
    const [examen] = await db
      .update(examens)
      .set(values)
      .where(eq(examens.id, id))
      .returning();
    if (!examen) return reply.status(404).send({ error: "Examen introuvable" });
    return examen;
  });

  app.delete("/:id", { preHandler: [authenticate, requireRole("directeur", "responsable")] }, async (request) => {
    const { id } = request.params as { id: string };
    const db = getDb();
    await db.delete(examens).where(eq(examens.id, id));
    return { ok: true };
  });

  app.post(
    "/:id/notes",
    { preHandler: [authenticate, requireRole("directeur", "enseignant")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const { saisies } = saveNotesSchema.parse(request.body);
      const db = getDb();

      const [examen] = await db
        .select()
        .from(examens)
        .where(eq(examens.id, id))
        .limit(1);
      if (!examen) return reply.status(404).send({ error: "Examen introuvable" });

      for (const s of saisies) {
        const noteMoy =
          s.theorique !== undefined && s.pratique !== undefined
            ? Math.round(((s.theorique + s.pratique) / 2) * 100) / 100
            : s.theorique ?? s.pratique ?? 0;

        await db
          .insert(notesExamen)
          .values({
            examenId: id,
            etudiantId: s.etudiantId,
            theorique: s.theorique !== undefined ? String(s.theorique) : null,
            pratique: s.pratique !== undefined ? String(s.pratique) : null,
          })
          .onConflictDoUpdate({
            target: [
              notesExamen.examenId,
              notesExamen.etudiantId,
            ],
            set: {
              theorique: s.theorique !== undefined ? String(s.theorique) : undefined,
              pratique: s.pratique !== undefined ? String(s.pratique) : undefined,
            },
          });

        const allNotes = await db
          .select()
          .from(notesEtudiant)
          .where(eq(notesEtudiant.etudiantId, s.etudiantId));

        const examNotes = await db
          .select()
          .from(notesExamen)
          .where(eq(notesExamen.etudiantId, s.etudiantId));

        const allAvg: { note: string; coef: string }[] = allNotes.map((n) => ({
          note: n.note,
          coef: n.coef,
        }));
        for (const en of examNotes) {
          const v = en.theorique ?? en.pratique ?? "0";
          allAvg.push({ note: v, coef: "1" });
        }

        const moyPonderee = ponderee(allAvg);
        await db
          .update(etudiants)
          .set({ moyenne: String(moyPonderee) })
          .where(eq(etudiants.id, s.etudiantId));
      }

      for (const surveillant of examen.surveillants) {
        const [formateur] = await db
          .select()
          .from(formateurs)
          .where(sql`${formateurs.nom} ILIKE ${`%${surveillant}%`}`)
          .limit(1);
        if (formateur) {
          await db
            .update(formateurs)
            .set({ notesSaisies: formateur.notesSaisies + 1 })
            .where(eq(formateurs.id, formateur.id));
        }
      }

      await db
        .update(examens)
        .set({ statut: "notes_saisies" })
        .where(eq(examens.id, id));

      return { ok: true };
    },
  );
}
