import type { FastifyRequest, FastifyReply } from "fastify";
import { getDb } from "@/db";
import { users } from "@/db/schema/users";
import { eq } from "drizzle-orm";

export interface AuthUserPayload {
  id: string;
  email: string;
  name: string;
  role: "admin" | "superadmin";
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: AuthUserPayload;
    user: AuthUserPayload;
  }
}

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
    const payload = request.user;
    if (!payload?.id) {
      return reply.status(401).send({ error: "Non authentifié" });
    }
    const db = getDb();
    const [user] = await db
      .select({ id: users.id, email: users.email, name: users.name, role: users.role })
      .from(users)
      .where(eq(users.id, payload.id))
      .limit(1);
    if (!user) {
      return reply.status(401).send({ error: "Utilisateur introuvable" });
    }
    request.user = { id: user.id, email: user.email, name: user.name, role: user.role as "admin" | "superadmin" };
  } catch {
    return reply.status(401).send({ error: "Token invalide ou expiré" });
  }
}


