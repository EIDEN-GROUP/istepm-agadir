import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate, requireRole } from "@/middleware/auth";
import { getDb } from "@/db";
import { roles } from "@/db/schema/roles";
import { eq } from "drizzle-orm";

const createRoleSchema = z.object({
  name: z.string().min(1, "Nom requis"),
  description: z.string().optional().default(""),
  permissions: z.array(z.string()).optional().default([]),
});

const updateRoleSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  permissions: z.array(z.string()).optional(),
});

/**
 * Noms de rôles canoniques : seuls ceux-ci sont créables/renommables
 * (fini la saisie libre). Le rôle `directeur` n'est gérable que par un
 * directeur : les autres rôles gestionnaires ne le voient même pas.
 */
const ROLE_NAMES = ["directeur", "responsable", "comptable", "enseignant", "etudiant"] as const;

/** Rôles autorisés à GÉRER les rôles (le directeur garde un accès complet). */
const ROLE_MANAGERS = ["directeur", "responsable", "comptable", "enseignant"] as const;

function estDirecteur(request: { user: { role: string } }): boolean {
  return request.user.role === "directeur";
}

const PERMISSIONS_LIST = [
  "etudiants.read", "etudiants.write", "etudiants.delete",
  "formateurs.read", "formateurs.write", "formateurs.delete",
  "examens.read", "examens.write", "examens.delete",
  "bulletins.read", "bulletins.write", "bulletins.delete",
  "stages.read", "stages.write", "stages.delete",
  "paiements.read", "paiements.write", "paiements.delete",
  "settings.read", "settings.write",
  "users.read", "users.write", "users.delete",
  "roles.read", "roles.manage",
  "dashboard.read",
] as const;

export { PERMISSIONS_LIST };
export type Permission = (typeof PERMISSIONS_LIST)[number];

export async function roleRoutes(app: FastifyInstance) {
  app.get("/", { preHandler: [authenticate, requireRole(...ROLE_MANAGERS)] }, async (request) => {
    const db = getDb();
    const rows = await db.select().from(roles).orderBy(roles.createdAt);
    // Hors directeur, la fiche `directeur` est invisible (pas seulement inactionnable).
    return estDirecteur(request) ? rows : rows.filter((r) => r.name !== "directeur");
  });

  app.get("/:id", { preHandler: [authenticate, requireRole(...ROLE_MANAGERS)] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const db = getDb();
    const [role] = await db.select().from(roles).where(eq(roles.id, id)).limit(1);
    if (!role) return reply.status(404).send({ error: "Rôle introuvable" });
    if (role.name === "directeur" && !estDirecteur(request)) {
      return reply.status(403).send({ error: "Accès réservé au directeur" });
    }
    return role;
  });

  app.post("/", { preHandler: [authenticate, requireRole(...ROLE_MANAGERS)] }, async (request, reply) => {
    const input = createRoleSchema.parse(request.body);
    const nom = input.name.trim();
    if (!(ROLE_NAMES as readonly string[]).includes(nom)) {
      return reply.status(400).send({ error: `Nom de rôle invalide (attendu : ${ROLE_NAMES.join(", ")})` });
    }
    if (nom === "directeur" && !estDirecteur(request)) {
      return reply.status(403).send({ error: "Accès réservé au directeur" });
    }
    const db = getDb();
    const [existing] = await db.select().from(roles).where(eq(roles.name, nom)).limit(1);
    if (existing) return reply.status(409).send({ error: "Ce rôle existe déjà" });
    const [role] = await db.insert(roles).values({ ...input, name: nom }).returning();
    return role;
  });

  app.put("/:id", { preHandler: [authenticate, requireRole(...ROLE_MANAGERS)] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = updateRoleSchema.parse(request.body);
    const db = getDb();
    const [existing] = await db.select().from(roles).where(eq(roles.id, id)).limit(1);
    if (!existing) return reply.status(404).send({ error: "Rôle introuvable" });
    if (existing.name === "directeur" && !estDirecteur(request)) {
      return reply.status(403).send({ error: "Accès réservé au directeur" });
    }
    if (input.name !== undefined) {
      const nom = input.name.trim();
      if (!(ROLE_NAMES as readonly string[]).includes(nom)) {
        return reply.status(400).send({ error: `Nom de rôle invalide (attendu : ${ROLE_NAMES.join(", ")})` });
      }
      if (nom === "directeur" && !estDirecteur(request)) {
        return reply.status(403).send({ error: "Accès réservé au directeur" });
      }
      const [conflit] = await db.select().from(roles).where(eq(roles.name, nom)).limit(1);
      if (conflit && conflit.id !== id) {
        return reply.status(409).send({ error: "Ce nom de rôle est déjà utilisé" });
      }
      input.name = nom;
    }
    const [updated] = await db.update(roles).set({ ...input, updatedAt: new Date() }).where(eq(roles.id, id)).returning();
    return updated;
  });

  app.delete("/:id", { preHandler: [authenticate, requireRole(...ROLE_MANAGERS)] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const db = getDb();
    const [existing] = await db.select().from(roles).where(eq(roles.id, id)).limit(1);
    if (!existing) return reply.status(404).send({ error: "Rôle introuvable" });
    if (existing.isSystem) return reply.status(403).send({ error: "Impossible de supprimer un rôle système" });
    if (existing.name === "directeur" && !estDirecteur(request)) {
      return reply.status(403).send({ error: "Accès réservé au directeur" });
    }
    await db.delete(roles).where(eq(roles.id, id));
    return { ok: true };
  });

  app.get("/permissions/list", { preHandler: [authenticate] }, async () => {
    return PERMISSIONS_LIST;
  });
}
