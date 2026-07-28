import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate, requireRole } from "@/middleware/auth";
import { getDb, getPool } from "@/db";
import { formateurs } from "@/db/schema/formateurs";
import { eq, desc, asc, sql, or } from "drizzle-orm";

const formateurSchema = z.object({
  userId: z.string().optional(),
  matricule: z.string().optional().default(""),
  cin: z.string().optional().default(""),
  prenom: z.string().min(1, "Prénom requis"),
  nom: z.string().min(1, "Nom requis"),
  grade: z.string().optional().default("vacataire"),
  departement: z.string().optional().default(""),
  modules: z.array(z.string()).optional().default([]),
  groupes: z.array(z.string()).optional().default([]),
  statut: z.string().optional().default("permanent"),
  telephone: z.string().optional().default(""),
  email: z.string().optional().default(""),
});

export async function formateurRoutes(app: FastifyInstance) {
  app.get("/", { preHandler: [authenticate] }, async (request) => {
    const db = getDb();
    const query = request.query as {
      search?: string;
      departement?: string;
      grade?: string;
      archived?: string;
    };
    let result = db
      .select()
      .from(formateurs)
      .orderBy(asc(formateurs.archived), desc(formateurs.createdAt))
      .$dynamic();

    if (query.archived === "true") {
      result = result.where(eq(formateurs.archived, true));
    } else if (query.archived !== "all") {
      result = result.where(eq(formateurs.archived, false));
    }

    if (query.search) {
      const q = `%${query.search}%`;
      result = result.where(
        or(
          sql`${formateurs.prenom} ILIKE ${q}`,
          sql`${formateurs.nom} ILIKE ${q}`,
          sql`${formateurs.matricule} ILIKE ${q}`,
          sql`${formateurs.cin} ILIKE ${q}`,
        ),
      );
    }

    if (query.departement) {
      result = result.where(eq(formateurs.departement, query.departement));
    }

    if (query.grade) {
      result = result.where(eq(formateurs.grade, query.grade));
    }

    return result;
  });

  app.get("/user/me", { preHandler: [authenticate] }, async (request, reply) => {
    const db = getDb();
    const [formateur] = await db
      .select()
      .from(formateurs)
      .where(eq(formateurs.userId, request.user.id))
      .limit(1);
    if (!formateur) return reply.status(404).send({ error: "Aucun formateur lié à ce compte" });
    return formateur;
  });

  app.get("/:id", { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const db = getDb();
    const [formateur] = await db
      .select()
      .from(formateurs)
      .where(eq(formateurs.id, id))
      .limit(1);
    if (!formateur) return reply.status(404).send({ error: "Formateur introuvable" });
    return formateur;
  });

  app.post("/", { preHandler: [authenticate, requireRole("directeur", "responsable")] }, async (request) => {
    const input = formateurSchema.parse(request.body);
    const db = getDb();
    const [formateur] = await db
      .insert(formateurs)
      .values(input)
      .returning();
    return formateur;
  });

  app.put("/:id", { preHandler: [authenticate, requireRole("directeur", "responsable")] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = formateurSchema.partial().parse(request.body);
    const db = getDb();
    const values: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(input)) {
      if (val !== undefined) values[key] = val;
    }
    const [formateur] = await db
      .update(formateurs)
      .set(values)
      .where(eq(formateurs.id, id))
      .returning();
    if (!formateur) return reply.status(404).send({ error: "Formateur introuvable" });
    return formateur;
  });

  /* ------------------------------------------------------------------ */
  /* Archive & Restore                                                    */
  /* ------------------------------------------------------------------ */

  const archiveSchema = z.object({
    groupReassignments: z.array(
      z.object({
        groupName: z.string().min(1),
        targetFormateurId: z.string().min(1),
      }),
    ).optional().default([]),
    filiereReassignment: z.object({
      targetFormateurId: z.string().min(1),
    }).optional(),
  });

  app.post("/:id/archive", { preHandler: [authenticate, requireRole("directeur", "responsable")] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = archiveSchema.parse(request.body);
    const db = getDb();
    const pool = getPool();

    const [formateur] = await db
      .select()
      .from(formateurs)
      .where(eq(formateurs.id, id))
      .limit(1);
    if (!formateur) return reply.status(404).send({ error: "Formateur introuvable" });
    if (formateur.archived) return reply.status(400).send({ error: "Formateur déjà archivé" });

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Reassign groups: remove from archived formateur, add to target
      for (const reassign of input.groupReassignments) {
        // Remove group from archived formateur's groupes
        await client.query(
          `UPDATE formateurs SET groupes = array_remove(groupes, $1) WHERE id = $2`,
          [reassign.groupName, id],
        );
        // Add group to target formateur's groupes
        await client.query(
          `UPDATE formateurs SET groupes = array_append(groupes, $1) WHERE id = $2 AND NOT ($1 = ANY(groupes))`,
          [reassign.groupName, reassign.targetFormateurId],
        );
      }

      // Reassign filiere: update target formateur's departement if they don't have one
      if (input.filiereReassignment) {
        const targetId = input.filiereReassignment.targetFormateurId;
        await client.query(
          `UPDATE formateurs SET departement = COALESCE(NULLIF(departement, ''), (SELECT departement FROM formateurs WHERE id = $1)) WHERE id = $2`,
          [id, targetId],
        );
      }

      // Archive the formateur
      await client.query(
        `UPDATE formateurs SET archived = true WHERE id = $1`,
        [id],
      );

      await client.query("COMMIT");

      const [updated] = await db
        .select()
        .from(formateurs)
        .where(eq(formateurs.id, id))
        .limit(1);
      return updated;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  });

  app.post("/:id/restore", { preHandler: [authenticate, requireRole("directeur", "responsable")] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const db = getDb();
    const [formateur] = await db
      .update(formateurs)
      .set({ archived: false })
      .where(eq(formateurs.id, id))
      .returning();
    if (!formateur) return reply.status(404).send({ error: "Formateur introuvable" });
    return formateur;
  });

  app.delete("/:id", { preHandler: [authenticate, requireRole("directeur", "responsable")] }, async (request) => {
    const { id } = request.params as { id: string };
    const db = getDb();
    await db.delete(formateurs).where(eq(formateurs.id, id));
    return { ok: true };
  });
}
