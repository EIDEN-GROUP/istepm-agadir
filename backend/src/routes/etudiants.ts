import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate, requireRole } from "@/middleware/auth";
import { getDb } from "@/db";
import { etudiants } from "@/db/schema/etudiants";
import { notesEtudiant } from "@/db/schema/notes-etudiant";
import { historiquePaiements } from "@/db/schema/historique-paiements";
import { stages } from "@/db/schema/stages";
import { bulletins } from "@/db/schema/bulletins";
import { eq, desc, sql, or, and } from "drizzle-orm";

const etudiantSchema = z.object({
  cne: z.string().optional().default(""),
  matricule: z.string().optional().default(""),
  prenom: z.string().min(1, "Prénom requis"),
  nom: z.string().min(1, "Nom requis"),
  filiere: z.string().min(1, "Filière requise"),
  niveau: z.string().min(1, "Niveau requis"),
  annee: z.string().optional().default(""),
  groupe: z.string().optional().default(""),
  statut: z.string().optional().default("inscrit"),
  paiement: z.string().optional().default("en_attente"),
  telephone: z.string().optional().default(""),
  email: z.string().optional().default(""),
  dateNaissance: z.string().optional().default(""),
  ville: z.string().optional().default(""),
  fraisAnnuels: z.number().optional().default(0),
  resteAPayer: z.number().optional().default(0),
});

export async function etudiantRoutes(app: FastifyInstance) {
  app.get("/", { preHandler: [authenticate] }, async (request) => {
    const db = getDb();
    const query = request.query as {
      search?: string;
      filiere?: string;
      niveau?: string;
      statut?: string;
    };
    let result = db
      .select()
      .from(etudiants)
      .orderBy(desc(etudiants.createdAt))
      .$dynamic();

    if (query.search) {
      const q = `%${query.search}%`;
      result = result.where(
        or(
          sql`${etudiants.prenom} ILIKE ${q}`,
          sql`${etudiants.nom} ILIKE ${q}`,
          sql`${etudiants.cne} ILIKE ${q}`,
          sql`${etudiants.matricule} ILIKE ${q}`,
        ),
      );
    }

    if (query.filiere) {
      result = result.where(eq(etudiants.filiere, query.filiere));
    }

    if (query.niveau) {
      result = result.where(eq(etudiants.niveau, query.niveau));
    }

    if (query.statut) {
      result = result.where(eq(etudiants.statut, query.statut));
    }

    return result;
  });

  app.get("/:id", { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const db = getDb();
    const [etudiant] = await db
      .select()
      .from(etudiants)
      .where(eq(etudiants.id, id))
      .limit(1);
    if (!etudiant) return reply.status(404).send({ error: "Étudiant introuvable" });

    const notes = await db
      .select()
      .from(notesEtudiant)
      .where(eq(notesEtudiant.etudiantId, id));

    const paiements = await db
      .select()
      .from(historiquePaiements)
      .where(eq(historiquePaiements.etudiantId, id))
      .orderBy(desc(historiquePaiements.date));

    const [stageEnCours] = await db
      .select()
      .from(stages)
      .where(
        and(
          eq(stages.etudiantId, id),
          sql`${stages.statut} IN ('en_cours', 'convention_signee', 'soutenance')`,
        ),
      )
      .limit(1);

    return {
      ...etudiant,
      notes,
      historique: paiements,
      stageEnCours: stageEnCours ?? null,
    };
  });

  app.post("/", { preHandler: [authenticate, requireRole("directeur", "responsable")] }, async (request) => {
    const input = etudiantSchema.parse(request.body);
    const db = getDb();
    const [etudiant] = await db
      .insert(etudiants)
      .values({
        ...input,
        fraisAnnuels: String(input.fraisAnnuels),
        resteAPayer: String(input.resteAPayer),
      })
      .returning();
    return etudiant;
  });

  app.put("/:id", { preHandler: [authenticate, requireRole("directeur", "responsable")] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = etudiantSchema.partial().parse(request.body);
    const db = getDb();
    const values: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(input)) {
      if (val !== undefined) {
        values[key] =
          key === "fraisAnnuels" || key === "resteAPayer" ? String(val) : val;
      }
    }
    const [etudiant] = await db
      .update(etudiants)
      .set(values)
      .where(eq(etudiants.id, id))
      .returning();
    if (!etudiant) return reply.status(404).send({ error: "Étudiant introuvable" });
    return etudiant;
  });

  app.delete("/:id", { preHandler: [authenticate, requireRole("directeur", "responsable")] }, async (request) => {
    const { id } = request.params as { id: string };
    const db = getDb();
    await db.delete(bulletins).where(eq(bulletins.etudiantId, id));
    await db.delete(stages).where(eq(stages.etudiantId, id));
    await db.delete(etudiants).where(eq(etudiants.id, id));
    return { ok: true };
  });
}
