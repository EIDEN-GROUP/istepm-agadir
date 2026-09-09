import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate, requireRole } from "@/middleware/auth";
import { getDb } from "@/db";
import { settings } from "@/db/schema/settings";
import { levels } from "@/db/schema/levels";
import { modules } from "@/db/schema/modules";
import { groupConfigs } from "@/db/schema/groupConfigs";
import { eq, desc, asc } from "drizzle-orm";

// La clé vient de l'URL (`PUT /settings/:key`) : le corps ne porte que la valeur.
const settingSchema = z.object({
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
    // Clés internes uniquement : bloque l'écrasement de clés arbitraires.
    if (!/^[a-z0-9_]{1,64}$/.test(key)) {
      return reply.status(400).send({ error: "Clé de paramètre invalide" });
    }
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

  /* ------------------------------------------------------------------ */
  /* Stage services (lieux de stage libres, créables depuis le front)     */
  /* ------------------------------------------------------------------ */
  function asStrings(v: unknown): string[] {
    if (!Array.isArray(v)) return [];
    return v.filter((s): s is string => typeof s === "string" && s.trim().length > 0);
  }

  app.get("/stage-services", { preHandler: [authenticate] }, async () => {
    const db = getDb();
    const [row] = await db
      .select()
      .from(settings)
      .where(eq(settings.key, "services_stage"))
      .limit(1);
    return asStrings(row?.value);
  });

  app.post("/stage-services", { preHandler: [authenticate, requireRole("directeur", "responsable")] }, async (request, reply) => {
    const { nom } = z.object({ nom: z.string().min(1).max(200) }).parse(request.body);
    const clean = nom.trim().replace(/\s+/g, " ");
    if (!clean) return reply.status(400).send({ error: "Nom de service requis" });
    const db = getDb();
    const [row] = await db
      .select()
      .from(settings)
      .where(eq(settings.key, "services_stage"))
      .limit(1);
    const list = asStrings(row?.value);
    if (list.some((s) => s.toLowerCase() === clean.toLowerCase())) {
      return reply.status(409).send({ error: "Ce service existe déjà" });
    }
    list.push(clean);
    list.sort((a, b) => a.localeCompare(b));
    if (row) {
      await db.update(settings).set({ value: list }).where(eq(settings.key, "services_stage"));
    } else {
      await db.insert(settings).values({ key: "services_stage", value: list });
    }
    return { services: list };
  });

  app.put("/stage-services/:nom", { preHandler: [authenticate, requireRole("directeur", "responsable")] }, async (request, reply) => {
    const { nom } = request.params as { nom: string };
    const body = z.object({ nouveauNom: z.string().trim().min(1).max(200).optional() }).parse(request.body);
    const db = getDb();
    const [row] = await db
      .select()
      .from(settings)
      .where(eq(settings.key, "services_stage"))
      .limit(1);
    if (!row) return reply.status(404).send({ error: "Aucun service enregistré" });
    const list = asStrings(row.value);
    const idx = list.findIndex((s) => s === nom);
    if (idx === -1) return reply.status(404).send({ error: "Service introuvable" });
    const newName = (body.nouveauNom ?? nom).trim().replace(/\s+/g, " ");
    if (newName !== nom && list.some((s) => s.toLowerCase() === newName.toLowerCase())) {
      return reply.status(409).send({ error: "Ce nom existe déjà" });
    }
    list[idx] = newName;
    list.sort((a, b) => a.localeCompare(b));
    await db.update(settings).set({ value: list }).where(eq(settings.key, "services_stage"));
    return { services: list };
  });

  app.delete("/stage-services/:nom", { preHandler: [authenticate, requireRole("directeur", "responsable")] }, async (request, reply) => {
    const { nom } = request.params as { nom: string };
    const db = getDb();
    const [row] = await db
      .select()
      .from(settings)
      .where(eq(settings.key, "services_stage"))
      .limit(1);
    if (!row) return reply.status(404).send({ error: "Aucun service enregistré" });
    const list = asStrings(row.value);
    const idx = list.findIndex((s) => s === nom);
    if (idx === -1) return reply.status(404).send({ error: "Service introuvable" });
    list.splice(idx, 1);
    await db.update(settings).set({ value: list }).where(eq(settings.key, "services_stage"));
    return { services: list };
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
    const parsed = structSchema.parse(request.body);
    const nom = parsed.nom.trim().replace(/\s+/g, " ");
    const capacite = parsed.capacite;
    if (!nom) return reply.status(400).send({ error: "Nom de structure requis" });
    const db = getDb();
    const [row] = await db
      .select()
      .from(settings)
      .where(eq(settings.key, "structures_accueil"))
      .limit(1);

    const list = asStructs(row?.value);
    const norm = nom.toLowerCase();
    if (list.some((s) => s.nom.toLowerCase() === norm)) {
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
  /* Modules management (table créée par la migration 0023)               */
  /* ------------------------------------------------------------------ */

  app.get("/modules", { preHandler: [authenticate] }, async (request) => {
    const db = getDb();
    const { filiere } = request.query as { filiere?: string };
    if (filiere) {
      return db.select().from(modules).where(eq(modules.filiere, filiere)).orderBy(asc(modules.nom));
    }
    return db.select().from(modules).orderBy(asc(modules.nom));
  });

  const moduleSchema = z.object({
    nom: z.string().trim().min(1, "Le nom du module est obligatoire.").max(150),
    filiere: z.string().trim().min(1, "La filière est obligatoire.").max(150),
    code: z.string().trim().max(30).nullable().optional(),
    description: z.string().trim().max(2000).nullable().optional(),
    volumeHoraire: z.number().int().min(0).max(1000).nullable().optional(),
    coefficient: z.union([z.number(), z.string()]).nullable().optional(),
  });

  app.post("/modules", { preHandler: [authenticate, requireRole("directeur", "responsable")] }, async (request) => {
    const body = moduleSchema.parse(request.body);
    const db = getDb();
    const [mod] = await db
      .insert(modules)
      .values({
        nom: body.nom,
        filiere: body.filiere,
        code: body.code ?? null,
        description: body.description ?? null,
        volumeHoraire: body.volumeHoraire ?? null,
        coefficient: body.coefficient != null ? String(body.coefficient) : null,
      })
      .returning();
    return mod;
  });

  app.put("/modules/:id", { preHandler: [authenticate, requireRole("directeur", "responsable")] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = moduleSchema.parse(request.body);
    const db = getDb();
    const [updated] = await db
      .update(modules)
      .set({
        nom: body.nom,
        filiere: body.filiere,
        code: body.code ?? null,
        description: body.description ?? null,
        volumeHoraire: body.volumeHoraire ?? null,
        coefficient: body.coefficient != null ? String(body.coefficient) : null,
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
    const { id } = request.params as { id: string };
    const db = getDb();
    const [deleted] = await db.delete(modules).where(eq(modules.id, id)).returning();
    if (!deleted) {
      return reply.status(404).send({ error: "Module introuvable" });
    }
    return { ok: true };
  });
}
