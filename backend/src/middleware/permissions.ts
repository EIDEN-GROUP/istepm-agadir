import type { FastifyRequest, FastifyReply } from "fastify";
import { getDb } from "@/db";
import { roles } from "@/db/schema/roles";
import { eq } from "drizzle-orm";

export function requirePermission(...required: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const userRole = request.user?.role;
    if (!userRole) {
      return reply.status(401).send({ error: "Non authentifié" });
    }
    const db = getDb();
    const [role] = await db
      .select({ permissions: roles.permissions })
      .from(roles)
      .where(eq(roles.name, userRole))
      .limit(1);
    if (!role) {
      return reply.status(403).send({ error: "Rôle introuvable", missingPermissions: required });
    }
    const userPermissions: string[] = role.permissions as string[];
    const missing = required.filter((p) => !userPermissions.includes(p));
    if (missing.length > 0) {
      return reply.status(403).send({
        error: "Permissions insuffisantes",
        missingPermissions: missing,
      });
    }
  };
}
