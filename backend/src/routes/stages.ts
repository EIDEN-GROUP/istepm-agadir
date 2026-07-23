import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate } from "@/middleware/auth";
import { getDb } from "@/db";
import { stages } from "@/db/schema/stages";
import { eq, desc, sql, or } from "drizzle-orm";

const stageSchema = z.object({
  etudiantId: z.string().uuid(),
  cne: z.string().optional().default(""),
  prenom: z.string().optional().default(""),
  nom: z.string().optional().default(""),
  filiere: z.string().optional().default(""),
  niveau: z.string().optional().default(""),
  structure: z.string().optional().default(""),
  service: z.string().optional().default(""),
  encadrantClinique: z.string().optional().default(""),
  tuteurAcademique: z.string().optional().default(""),
  debut: z.string().optional().default(""),
  fin: z.string().optional().default(""),
  statut: z.string().optional().default("recherche"),
  conventionSignee: z.boolean().optional().default(false),
  noteSoutenance: z.number().min(0).max(20).optional().nullable(),
});

export async function stageRoutes(app: FastifyInstance) {
  app.get("/", { preHandler: [authenticate] }, async (request) => {
    const db = getDb();
    const query = request.query as {
      filiere?: string;
      niveau?: string;
      statut?: string;
      search?: string;
    };
    let result = db
      .select()
      .from(stages)
      .orderBy(desc(stages.createdAt))
      .$dynamic();

    if (query.filiere) {
      result = result.where(eq(stages.filiere, query.filiere));
    }
    if (query.niveau) {
      result = result.where(eq(stages.niveau, query.niveau));
    }
    if (query.statut) {
      result = result.where(eq(stages.statut, query.statut));
    }
    if (query.search) {
      const q = `%${query.search}%`;
      result = result.where(
        or(
          sql`${stages.prenom} ILIKE ${q}`,
          sql`${stages.nom} ILIKE ${q}`,
          sql`${stages.cne} ILIKE ${q}`,
          sql`${stages.structure} ILIKE ${q}`,
        ),
      );
    }

    return result;
  });

  app.get("/:id", { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const db = getDb();
    const [stage] = await db
      .select()
      .from(stages)
      .where(eq(stages.id, id))
      .limit(1);
    if (!stage) return reply.status(404).send({ error: "Stage introuvable" });
    return stage;
  });

  app.post("/", { preHandler: [authenticate] }, async (request) => {
    const input = stageSchema.parse(request.body);
    const db = getDb();
    const [stage] = await db
      .insert(stages)
      .values({
        ...input,
        noteSoutenance:
          input.noteSoutenance !== null && input.noteSoutenance !== undefined
            ? String(input.noteSoutenance)
            : null,
      })
      .returning();
    return stage;
  });

  app.put("/:id", { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = stageSchema.partial().parse(request.body);
    const db = getDb();
    const values: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(input)) {
      if (val !== undefined) {
        if (key === "noteSoutenance") {
          values[key] = val !== null ? String(val) : null;
        } else {
          values[key] = val;
        }
      }
    }
    const [stage] = await db
      .update(stages)
      .set(values as any)
      .where(eq(stages.id, id))
      .returning();
    if (!stage) return reply.status(404).send({ error: "Stage introuvable" });
    return stage;
  });

  app.delete("/:id", { preHandler: [authenticate] }, async (request) => {
    const { id } = request.params as { id: string };
    const db = getDb();
    await db.delete(stages).where(eq(stages.id, id));
    return { ok: true };
  });

  app.post(
    "/:id/valider",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const db = getDb();
      const [stage] = await db
        .update(stages)
        .set({ statut: "valide" })
        .where(eq(stages.id, id))
        .returning();
      if (!stage) return reply.status(404).send({ error: "Stage introuvable" });
      return stage;
    },
  );
}
