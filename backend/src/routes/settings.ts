import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate, requireRole } from "@/middleware/auth";
import { getDb, getPool } from "@/db";
import { settings } from "@/db/schema/settings";
import { levels } from "@/db/schema/levels";
import { modules } from "@/db/schema/modules";
import { etudiants } from "@/db/schema/etudiants";
import { formateurs } from "@/db/schema/formateurs";
import { examens } from "@/db/schema/examens";
import { bulletins } from "@/db/schema/bulletins";
import { stages } from "@/db/schema/stages";
import { historiquePaiements } from "@/db/schema/historique-paiements";
import { notesEtudiant } from "@/db/schema/notes-etudiant";
import { groupConfigs } from "@/db/schema/groupConfigs";
import { eq, desc, asc } from "drizzle-orm";

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

  /* ------------------------------------------------------------------ */
  /* Group Configs                                                        */
  /* ------------------------------------------------------------------ */
  const groupConfigSchema = z.object({
    name: z.string().min(1, "Nom du groupe requis"),
    semester: z.string().min(1, "Semestre requis"),
    studentCount: z.number().int().min(0).optional().default(0),
  });

  app.get("/groups", { preHandler: [authenticate] }, async () => {
    const db = getDb();
    return db.select().from(groupConfigs).orderBy(asc(groupConfigs.semester), asc(groupConfigs.name));
  });

  app.post("/groups", { preHandler: [authenticate, requireRole("directeur", "responsable")] }, async (request, reply) => {
    const input = groupConfigSchema.parse(request.body);
    const db = getDb();
    try {
      const [config] = await db.insert(groupConfigs).values(input).returning();
      return config;
    } catch {
      return reply.status(409).send({ error: "Ce groupe existe déjà" });
    }
  });

  app.put("/groups/:id", { preHandler: [authenticate, requireRole("directeur", "responsable")] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = groupConfigSchema.partial().parse(request.body);
    const db = getDb();
    const values: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(input)) {
      if (val !== undefined) values[key] = val;
    }
    const [updated] = await db
      .update(groupConfigs)
      .set(values)
      .where(eq(groupConfigs.id, id))
      .returning();
    if (!updated) return reply.status(404).send({ error: "Groupe introuvable" });
    return updated;
  });

  app.delete("/groups/:id", { preHandler: [authenticate, requireRole("directeur", "responsable")] }, async (request) => {
    const { id } = request.params as { id: string };
    const db = getDb();
    await db.delete(groupConfigs).where(eq(groupConfigs.id, id));
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

  const structSchema = z.object({
    nom: z.string().min(1),
    capacite: z.number().int().min(1).optional().default(5),
  });

  /** Normalise structures data: legacy string[] → { nom, capacite }[]. */
  function asStructs(v: unknown): { nom: string; capacite: number }[] {
    if (!Array.isArray(v)) return [];
    return v.map((s: unknown) => {
      if (typeof s === "string") return { nom: s, capacite: 5 };
      if (typeof s === "object" && s && "nom" in (s as Record<string, unknown>))
        return { nom: (s as Record<string, string>).nom, capacite: Number((s as Record<string, number>).capacite) || 5 };
      return { nom: "?", capacite: 5 };
    });
  }

  app.get("/structures", { preHandler: [authenticate] }, async () => {
    const db = getDb();
    const [row] = await db
      .select()
      .from(settings)
      .where(eq(settings.key, "structures_accueil"))
      .limit(1);
    return asStructs(row?.value);
  });

  app.post("/structures", { preHandler: [authenticate, requireRole("directeur", "responsable")] }, async (request, reply) => {
    const { nom, capacite } = structSchema.parse(request.body);
    const db = getDb();
    const [row] = await db
      .select()
      .from(settings)
      .where(eq(settings.key, "structures_accueil"))
      .limit(1);

    const list = asStructs(row?.value);
    if (list.some((s) => s.nom === nom)) {
      return reply.status(409).send({ error: "Cette structure existe déjà" });
    }
    list.push({ nom, capacite });
    list.sort((a, b) => a.nom.localeCompare(b.nom));

    if (row) {
      await db
        .update(settings)
        .set({ value: list })
        .where(eq(settings.key, "structures_accueil"));
    } else {
      await db.insert(settings).values({ key: "structures_accueil", value: list });
    }
    return { structures: list };
  });

  // Update: change name and/or capacity
  app.put("/structures/:nom", { preHandler: [authenticate, requireRole("directeur", "responsable")] }, async (request, reply) => {
    const { nom } = request.params as { nom: string };
    const body = z
      .object({ nouveauNom: z.string().min(1).optional(), capacite: z.number().int().min(1).optional() })
      .parse(request.body);
    const db = getDb();
    const [row] = await db
      .select()
      .from(settings)
      .where(eq(settings.key, "structures_accueil"))
      .limit(1);
    if (!row) return reply.status(404).send({ error: "Aucune structure enregistrée" });

    const list = asStructs(row.value);
    const idx = list.findIndex((s) => s.nom === nom);
    if (idx === -1) return reply.status(404).send({ error: "Structure introuvable" });

    const newName = body.nouveauNom ?? nom;
    if (newName !== nom && list.some((s) => s.nom === newName))
      return reply.status(409).send({ error: "Ce nom existe déjà" });

    list[idx] = { nom: newName, capacite: body.capacite ?? list[idx].capacite };
    list.sort((a, b) => a.nom.localeCompare(b.nom));

    await db
      .update(settings)
      .set({ value: list })
      .where(eq(settings.key, "structures_accueil"));
    return { structures: list };
  });

  app.delete("/structures/:nom", { preHandler: [authenticate, requireRole("directeur", "responsable")] }, async (request, reply) => {
    const { nom } = request.params as { nom: string };
    const db = getDb();
    const [row] = await db
      .select()
      .from(settings)
      .where(eq(settings.key, "structures_accueil"))
      .limit(1);
    if (!row) return reply.status(404).send({ error: "Aucune structure enregistrée" });

    const list = asStructs(row.value);
    const idx = list.findIndex((s) => s.nom === nom);
    if (idx === -1) return reply.status(404).send({ error: "Structure introuvable" });
    list.splice(idx, 1);

    await db
      .update(settings)
      .set({ value: list })
      .where(eq(settings.key, "structures_accueil"));
    return { structures: list };
  });

  /* ------------------------------------------------------------------ */
  /* Modules management                                                  */
  /* ------------------------------------------------------------------ */
  async function ensureModulesTableAndSeed() {
    const db = getDb();
    const pool = getPool();
    await pool.query(`
      CREATE TABLE IF NOT EXISTS modules (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        nom TEXT NOT NULL,
        filiere TEXT NOT NULL,
        code TEXT,
        description TEXT,
        volume_horaire INTEGER,
        coefficient NUMERIC,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    const existing = await db.select().from(modules).limit(1);
    if (existing.length === 0) {
      const defaultModules = [
        { nom: "Soins infirmiers en médecine", filiere: "Infirmier polyvalent" },
        { nom: "Hygiène hospitalière", filiere: "Infirmier polyvalent" },
        { nom: "Éthique et déontologie", filiere: "Infirmier polyvalent" },
        { nom: "Pharmacologie", filiere: "Infirmier polyvalent" },
        { nom: "Santé publique", filiere: "Infirmier polyvalent" },
        { nom: "Réanimation et soins intensifs", filiere: "Infirmier en anesthésie-réanimation" },
        { nom: "Anesthésie clinique", filiere: "Infirmier en anesthésie-réanimation" },
        { nom: "Obstétrique", filiere: "Sage-femme" },
        { nom: "Suivi de grossesse", filiere: "Sage-femme" },
        { nom: "Néonatologie", filiere: "Sage-femme" },
        { nom: "Rééducation fonctionnelle", filiere: "Kinésithérapie" },
        { nom: "Électrothérapie", filiere: "Kinésithérapie" },
        { nom: "Techniques de radiologie", filiere: "Radiologie / Imagerie médicale" },
        { nom: "Scanner et IRM", filiere: "Radiologie / Imagerie médicale" },
        { nom: "Radioprotection", filiere: "Radiologie / Imagerie médicale" },
        { nom: "Hématologie", filiere: "Laboratoire / Biologie médicale" },
        { nom: "Biochimie clinique", filiere: "Laboratoire / Biologie médicale" },
        { nom: "Microbiologie", filiere: "Laboratoire / Biologie médicale" },
        { nom: "Anatomie dentaire", filiere: "Prothèse dentaire" },
        { nom: "Prothèse fixe (TP)", filiere: "Prothèse dentaire" },
        { nom: "Occlusodontie", filiere: "Prothèse dentaire" },
      ];
      for (const m of defaultModules) {
        await db.insert(modules).values(m);
      }
    }
  }

  app.get("/modules", { preHandler: [authenticate] }, async (request) => {
    await ensureModulesTableAndSeed();
    const db = getDb();
    const { filiere } = request.query as { filiere?: string };
    if (filiere) {
      return db.select().from(modules).where(eq(modules.filiere, filiere)).orderBy(asc(modules.nom));
    }
    return db.select().from(modules).orderBy(asc(modules.nom));
  });

  app.post("/modules", { preHandler: [authenticate, requireRole("directeur", "responsable")] }, async (request, reply) => {
    await ensureModulesTableAndSeed();
    const body = request.body as any;
    if (!body || !body.filiere || typeof body.filiere !== "string" || !body.filiere.trim()) {
      return reply.status(400).send({ error: "La filière est obligatoire." });
    }
    if (!body.nom || typeof body.nom !== "string" || !body.nom.trim()) {
      return reply.status(400).send({ error: "Le nom du module est obligatoire." });
    }
    const db = getDb();
    const [mod] = await db
      .insert(modules)
      .values({
        nom: body.nom.trim(),
        filiere: body.filiere.trim(),
        code: body.code ?? null,
        description: body.description ?? null,
        volumeHoraire: body.volumeHoraire ? Number(body.volumeHoraire) : null,
        coefficient: body.coefficient ? String(body.coefficient) : null,
      })
      .returning();
    return mod;
  });

  app.put("/modules/:id", { preHandler: [authenticate, requireRole("directeur", "responsable")] }, async (request, reply) => {
    await ensureModulesTableAndSeed();
    const { id } = request.params as { id: string };
    const body = request.body as any;
    if (!body || !body.filiere || typeof body.filiere !== "string" || !body.filiere.trim()) {
      return reply.status(400).send({ error: "La filière est obligatoire." });
    }
    if (!body.nom || typeof body.nom !== "string" || !body.nom.trim()) {
      return reply.status(400).send({ error: "Le nom du module est obligatoire." });
    }
    const db = getDb();
    const [updated] = await db
      .update(modules)
      .set({
        nom: body.nom.trim(),
        filiere: body.filiere.trim(),
        code: body.code ?? null,
        description: body.description ?? null,
        volumeHoraire: body.volumeHoraire ? Number(body.volumeHoraire) : null,
        coefficient: body.coefficient ? String(body.coefficient) : null,
        updatedAt: new Date(),
      })
      .where(eq(modules.id, id))
      .returning();

    if (!updated) {
      return reply.status(404).send({ error: "Module introuvable" });
    }
    return updated;
  });

  app.delete("/modules/:id", { preHandler: [authenticate, requireRole("directeur", "responsable")] }, async (request, reply) => {
    await ensureModulesTableAndSeed();
    const { id } = request.params as { id: string };
    const db = getDb();
    const [deleted] = await db.delete(modules).where(eq(modules.id, id)).returning();
    if (!deleted) {
      return reply.status(404).send({ error: "Module introuvable" });
    }
    return { ok: true };
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
