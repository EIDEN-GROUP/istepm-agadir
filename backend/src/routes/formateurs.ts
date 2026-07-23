import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate } from "@/middleware/auth";
import { getDb } from "@/db";
import { formateurs } from "@/db/schema/formateurs";
import { eq, desc, sql, or } from "drizzle-orm";

const formateurSchema = z.object({
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
    };
    let result = db
      .select()
      .from(formateurs)
      .orderBy(desc(formateurs.createdAt))
      .$dynamic();

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

  app.post("/", { preHandler: [authenticate] }, async (request) => {
    const input = formateurSchema.parse(request.body);
    const db = getDb();
    const [formateur] = await db
      .insert(formateurs)
      .values(input)
      .returning();
    return formateur;
  });

  app.put("/:id", { preHandler: [authenticate] }, async (request, reply) => {
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

  app.delete("/:id", { preHandler: [authenticate] }, async (request) => {
    const { id } = request.params as { id: string };
    const db = getDb();
    await db.delete(formateurs).where(eq(formateurs.id, id));
    return { ok: true };
  });
}
