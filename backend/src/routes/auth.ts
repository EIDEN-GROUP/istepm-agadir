import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate } from "@/middleware/auth";
import {
  login,
  createUser,
  listAllUsers,
  updateUser,
  deleteUser,
  findByEmail,
} from "@/services/auth";

const loginSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(1, "Mot de passe requis"),
});

const createUserSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(6, "Mot de passe trop court"),
  name: z.string().min(1, "Nom requis"),
  role: z.enum(["admin", "superadmin"]).optional().default("admin"),
});

const updateUserSchema = z.object({
  name: z.string().optional(),
  password: z.string().min(6).optional(),
});

export async function authRoutes(app: FastifyInstance) {
  app.post("/login", async (request, reply) => {
    const input = loginSchema.parse(request.body);
    const user = await login(input.email, input.password);
    if (!user) {
      return reply
        .status(401)
        .send({ error: "Email ou mot de passe incorrect" });
    }
    const token = app.jwt.sign({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as "admin" | "superadmin",
    });
    return { token, user };
  });

  app.get("/me", { preHandler: [authenticate] }, async (request) => {
    return request.user;
  });

  app.post(
    "/register",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const input = createUserSchema.parse(request.body);
      const existing = await findByEmail(input.email);
      if (existing) {
        return reply.status(409).send({ error: "Cet email est déjà utilisé" });
      }
      const user = await createUser(input);
      return user;
    },
  );

  app.get("/users", { preHandler: [authenticate] }, async () => {
    return listAllUsers();
  });

  app.put(
    "/users/:id",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const input = updateUserSchema.parse(request.body);
      const user = await updateUser(id, input);
      if (!user) {
        return reply.status(404).send({ error: "Utilisateur introuvable" });
      }
      return user;
    },
  );

  app.delete(
    "/users/:id",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      await deleteUser(id);
      return { success: true };
    },
  );
}
