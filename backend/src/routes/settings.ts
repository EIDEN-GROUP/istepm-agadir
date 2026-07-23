import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate, requireRole } from "@/middleware/auth";
import { getDb } from "@/db";
import { settings } from "@/db/schema/settings";
import { levels } from "@/db/schema/levels";
import { etudiants } from "@/db/schema/etudiants";
import { formateurs } from "@/db/schema/formateurs";
import { examens } from "@/db/schema/examens";
import { bulletins } from "@/db/schema/bulletins";
import { stages } from "@/db/schema/stages";
import { historiquePaiements } from "@/db/schema/historique-paiements";
import { notesEtudiant } from "@/db/schema/notes-etudiant";
import { eq, desc } from "drizzle-orm";

const settingSchema = z.object({
  key: z.string().min(1),
  value: z.any(),
});

const levelSchema = z.object({
  name: z.string().min(1),
  cycle: z.string().optional().default(""),
  monthlyFee: z.number().optional().default(0),
  maxStudents: z.number().optional().default(0),
});

export async function settingsRoutes(app: FastifyInstance) {
  app.get("/", { preHandler: [authenticate] }, async () => {
    const db = getDb();
    const rows = await db.select().from(settings);
    const map: Record<string, unknown> = {};
    for (const r of rows) map[r.key] = r.value;
    return map;
  });

  app.put("/:key", { preHandler: [authenticate, requireRole("directeur", "responsable")] }, async (request, reply) => {
    const { key } = request.params as { key: string };
    const { value } = settingSchema.parse(request.body);
    const db = getDb();
    const [existing] = await db
      .select()
      .from(settings)
      .where(eq(settings.key, key))
      .limit(1);

    if (existing) {
      const [updated] = await db
        .update(settings)
        .set({ value })
        .where(eq(settings.key, key))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(settings)
        .values({ key, value })
        .returning();
      return created;
    }
  });

  app.get("/levels", { preHandler: [authenticate] }, async () => {
    const db = getDb();
    return db.select().from(levels).orderBy(desc(levels.createdAt));
  });

  app.post("/levels", { preHandler: [authenticate, requireRole("directeur", "responsable")] }, async (request) => {
    const input = levelSchema.parse(request.body);
    const db = getDb();
    const [level] = await db
      .insert(levels)
      .values({
        ...input,
        monthlyFee: String(input.monthlyFee),
      })
      .returning();
    return level;
  });

  app.put(
    "/levels/:id",
    { preHandler: [authenticate, requireRole("directeur", "responsable")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const input = levelSchema.partial().parse(request.body);
      const db = getDb();
      const values: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(input)) {
        if (val !== undefined) {
          values[key] = key === "monthlyFee" ? String(val) : val;
        }
      }
      const [level] = await db
        .update(levels)
        .set(values)
        .where(eq(levels.id, id))
        .returning();
      if (!level)
        return reply.status(404).send({ error: "Niveau introuvable" });
      return level;
    },
  );

  app.delete("/levels/:id", { preHandler: [authenticate, requireRole("directeur", "responsable")] }, async (request) => {
    const { id } = request.params as { id: string };
    const db = getDb();
    await db.delete(levels).where(eq(levels.id, id));
    return { ok: true };
  });

  app.get("/filieres", { preHandler: [authenticate] }, async () => {
    const db = getDb();
    const [row] = await db
      .select()
      .from(settings)
      .where(eq(settings.key, "filieres"))
      .limit(1);
    return row?.value ?? [];
  });

  app.post("/filieres", { preHandler: [authenticate, requireRole("directeur", "responsable")] }, async (request, reply) => {
    const { nom } = z.object({ nom: z.string().min(1) }).parse(request.body);
    const db = getDb();
    const [row] = await db
      .select()
      .from(settings)
      .where(eq(settings.key, "filieres"))
      .limit(1);

    const list: string[] = (row?.value as string[]) ?? [];
    if (list.includes(nom)) {
      return reply.status(409).send({ error: "Cette filière existe déjà" });
    }
    list.push(nom);
    list.sort();

    if (row) {
      await db
        .update(settings)
        .set({ value: list })
        .where(eq(settings.key, "filieres"));
    } else {
      await db.insert(settings).values({ key: "filieres", value: list });
    }
    return { filieres: list };
  });

  app.delete("/filieres/:nom", { preHandler: [authenticate, requireRole("directeur", "responsable")] }, async (request, reply) => {
    const { nom } = request.params as { nom: string };
    const db = getDb();
    const [row] = await db
      .select()
      .from(settings)
      .where(eq(settings.key, "filieres"))
      .limit(1);
    if (!row) return reply.status(404).send({ error: "Aucune filière enregistrée" });

    const list: string[] = (row.value as string[]) ?? [];
    const idx = list.indexOf(nom);
    if (idx === -1) return reply.status(404).send({ error: "Filière introuvable" });
    list.splice(idx, 1);

    await db
      .update(settings)
      .set({ value: list })
      .where(eq(settings.key, "filieres"));
    return { filieres: list };
  });

  app.post("/reset", { preHandler: [authenticate, requireRole("directeur")] }, async () => {
    const db = getDb();
    await db.delete(historiquePaiements);
    await db.delete(notesEtudiant);
    await db.delete(bulletins);
    await db.delete(stages);
    await db.delete(examens);
    await db.delete(formateurs);
    await db.delete(etudiants);
    return { ok: true };
  });
}
