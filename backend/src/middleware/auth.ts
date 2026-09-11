import type { FastifyRequest, FastifyReply } from "fastify";
import { getDb } from "@/db";
import { users } from "@/db/schema/users";
import { etudiants } from "@/db/schema/etudiants";
import { formateurs } from "@/db/schema/formateurs";
import { eq } from "drizzle-orm";

export interface AuthUserPayload {
  id: string;
  email: string;
  name: string;
  role: "directeur" | "enseignant" | "responsable" | "etudiant";
  /** Absent du JWT (trop volumineux) : renseigné par `authenticate` depuis la BDD. */
  photoUrl?: string;
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: AuthUserPayload;
    user: AuthUserPayload;
  }
}

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    await request.jwtVerify();
    const payload = request.user;
    if (!payload?.id) {
      return reply.status(401).send({ error: "Non authentifié" });
    }
    const db = getDb();
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        photoUrl: users.photoUrl,
      })
      .from(users)
      .where(eq(users.id, payload.id))
      .limit(1);
    if (!user) {
      return reply.status(401).send({ error: "Utilisateur introuvable" });
    }
    // Coupe aussi les sessions en cours : un compte archivé pendant sa
    // session est rejeté dès la requête suivante (réactivé au désarchivage).
    // Sans fiche liée : comportement inchangé (connexion autorisée).
    if (user.role === "etudiant" || user.role === "enseignant") {
      const archived =
        user.role === "etudiant"
          ? (
              await db
                .select({ archived: etudiants.archived })
                .from(etudiants)
                .where(eq(etudiants.userId, user.id))
                .limit(1)
            )[0]?.archived
          : (
              await db
                .select({ archived: formateurs.archived })
                .from(formateurs)
                .where(eq(formateurs.userId, user.id))
                .limit(1)
            )[0]?.archived;
      if (archived) {
        return reply.status(401).send({ error: "Compte désactivé — contactez le secrétariat." });
      }
    }
    request.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as AuthUserPayload["role"],
      photoUrl: user.photoUrl ?? "",
    };
  } catch {
    return reply.status(401).send({ error: "Token invalide ou expiré" });
  }
}

/** Restrict access to one or more roles. Must be chained after `authenticate`. */
export function requireRole(...roles: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const userRole = request.user?.role;
    if (!userRole || !roles.includes(userRole)) {
      return reply.status(403).send({
        error: "Accès refusé : rôle insuffisant",
        allowedRoles: roles,
      });
    }
  };
}
