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
  app.get("/", { preHandler: [authenticate, requireRole("directeur", "superadmin")] }, async () => {
    const db = getDb();
    return db.select().from(roles).orderBy(roles.createdAt);
  });

  app.get("/:id", { preHandler: [authenticate, requireRole("directeur", "superadmin")] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const db = getDb();
    const [role] = await db.select().from(roles).where(eq(roles.id, id)).limit(1);
    if (!role) return reply.status(404).send({ error: "Rôle introuvable" });
    return role;
  });

  app.post("/", { preHandler: [authenticate, requireRole("directeur", "superadmin")] }, async (request, reply) => {
    const input = createRoleSchema.parse(request.body);
    const db = getDb();
    const [existing] = await db.select().from(roles).where(eq(roles.name, input.name)).limit(1);
    if (existing) return reply.status(409).send({ error: "Ce rôle existe déjà" });
    const [role] = await db.insert(roles).values(input).returning();
    return role;
  });

  app.put("/:id", { preHandler: [authenticate, requireRole("directeur", "superadmin")] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = updateRoleSchema.parse(request.body);
    const db = getDb();
    const [existing] = await db.select().from(roles).where(eq(roles.id, id)).limit(1);
    if (!existing) return reply.status(404).send({ error: "Rôle introuvable" });
    const [updated] = await db.update(roles).set({ ...input, updatedAt: new Date() }).where(eq(roles.id, id)).returning();
    return updated;
  });

  app.delete("/:id", { preHandler: [authenticate, requireRole("directeur", "superadmin")] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const db = getDb();
    const [existing] = await db.select().from(roles).where(eq(roles.id, id)).limit(1);
    if (!existing) return reply.status(404).send({ error: "Rôle introuvable" });
    if (existing.isSystem) return reply.status(403).send({ error: "Impossible de supprimer un rôle système" });
    await db.delete(roles).where(eq(roles.id, id));
    return { ok: true };
  });

  app.get("/permissions/list", { preHandler: [authenticate] }, async () => {
    return PERMISSIONS_LIST;
  });
}
