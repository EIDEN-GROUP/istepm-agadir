import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate, requireRole } from "@/middleware/auth";
import { getDb } from "@/db";
import { users } from "@/db/schema/users";
import { eq } from "drizzle-orm";
import {
  login,
  createUser,
  listAllUsers,
  updateUser,
  deleteUser,
  findByEmail,
  findById,
  verifyPassword,
  updateSelfProfile,
} from "@/services/auth";

const loginSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(1, "Mot de passe requis"),
});
const createUserSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(8, "Mot de passe trop court (8 caractères min)"),
  name: z.string().min(1, "Nom requis"),
  role: z
    .enum(["directeur", "enseignant", "responsable", "etudiant"])
    .optional()
    .default("directeur"),
  filiere: z.string().optional(),
  niveau: z.string().optional(),
  groupe: z.string().optional(),
  etudiantId: z.string().uuid().optional(),
  cne: z.string().optional(),
});

const updateUserSchema = z.object({
  name: z.string().optional(),
  password: z.string().min(8, "Mot de passe trop court (8 caractères min)").optional(),
});

/**
 * Modification self-service du compte courant. Le nom et le rôle sont
 * volontairement absents : seul un directeur/responsable les change.
 * Changer l'email ou le mot de passe exige `currentPassword` ; changer la
 * seule photo ne le demande pas.
 */
const PHOTO_MAX = 3_000_000; // ~2 Mo d'image en base64
const updateSelfSchema = z
  .object({
    email: z.string().email("Email invalide").optional(),
    currentPassword: z.string().min(1).optional(),
    newPassword: z
      .string()
      .min(8, "Mot de passe trop court (8 caractères min)")
      .optional(),
    photoUrl: z
      .string()
      .max(PHOTO_MAX, "Image trop volumineuse")
      .refine(
        (v) =>
          v === "" ||
          v.startsWith("http://") ||
          v.startsWith("https://") ||
          v.startsWith("data:image/"),
        { message: "URL de photo invalide" },
      )
      .optional(),
  })
  .refine(
    (d) =>
      d.email !== undefined ||
      d.newPassword !== undefined ||
      d.photoUrl !== undefined,
    { message: "Aucune modification fournie" },
  );

const ROLES_ENUM = ["directeur", "enseignant", "responsable", "etudiant"] as const;
const assignRoleSchema = z.object({
  role: z.enum(ROLES_ENUM),
});

export async function authRoutes(app: FastifyInstance) {
  app.post(
    "/login",
    { config: { rateLimit: { max: 15, timeWindow: "15 minutes" } } },
    async (request, reply) => {
      const input = loginSchema.parse(request.body);
      const user = await login(input.email, input.password);
      if (!user) {
        request.log.warn({ email: input.email, ip: request.ip }, "Échec connexion");
        return reply
          .status(401)
          .send({ error: "Email ou mot de passe incorrect" });
      }
    const token = app.jwt.sign({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as "directeur" | "enseignant" | "responsable" | "etudiant",
    });
    return { token, user };
  });

  app.get("/me", { preHandler: [authenticate] }, async (request) => {
    return request.user;
  });

  app.patch(
    "/me",
    {
      preHandler: [authenticate],
      bodyLimit: PHOTO_MAX + 100_000,
      config: { rateLimit: { max: 20, timeWindow: "15 minutes" } },
    },
    async (request, reply) => {
      const input = updateSelfSchema.parse(request.body);
      const me = await findById(request.user.id);
      if (!me) {
        return reply.status(404).send({ error: "Utilisateur introuvable" });
      }

      const nextEmail = input.email?.trim().toLowerCase();
      const emailChanged = !!nextEmail && nextEmail !== me.email.toLowerCase();
      const passwordChanged = input.newPassword !== undefined;
      const photoChanged =
        input.photoUrl !== undefined && input.photoUrl !== me.photoUrl;

      // L'email et le mot de passe sont sensibles : on réauthentifie.
      // La photo seule ne le demande pas.
      if (emailChanged || passwordChanged) {
        if (!input.currentPassword) {
          return reply
            .status(400)
            .send({ error: "Mot de passe actuel requis" });
        }
        const ok = await verifyPassword(input.currentPassword, me.passwordHash);
        if (!ok) {
          // 403 et non 401 : le client traite tout 401 comme une session expirée.
          return reply
            .status(403)
            .send({ error: "Mot de passe actuel incorrect" });
        }
      }

      if (emailChanged) {
        const taken = await findByEmail(nextEmail!);
        if (taken && taken.id !== me.id) {
          return reply
            .status(409)
            .send({ error: "Cet email est déjà utilisé" });
        }
      }

      if (!emailChanged && !passwordChanged && !photoChanged) {
        return reply.status(400).send({ error: "Aucune modification fournie" });
      }

      const updated = await updateSelfProfile(me.id, {
        email: emailChanged ? nextEmail : undefined,
        newPassword: input.newPassword,
        photoUrl: photoChanged ? input.photoUrl : undefined,
      });
      if (!updated) {
        return reply.status(404).send({ error: "Utilisateur introuvable" });
      }

      // L'ancien jeton encode l'email périmé : on en renvoie un neuf pour que
      // la session reste valide sans reconnexion. La photo n'est pas dans le JWT.
      const token = app.jwt.sign({
        id: updated.id,
        email: updated.email,
        name: updated.name,
        role: updated.role as
          | "directeur"
          | "enseignant"
          | "responsable"
          | "etudiant",
      });
      return { token, user: updated };
    },
  );

  app.post(
    "/register",
    { preHandler: [authenticate, requireRole("directeur", "responsable")] },
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

  app.get("/users", { preHandler: [authenticate, requireRole("directeur", "responsable")] }, async () => {
    return listAllUsers();
  });

  app.put(
    "/users/:id",
    { preHandler: [authenticate, requireRole("directeur", "responsable")] },
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
    { preHandler: [authenticate, requireRole("directeur", "responsable")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      await deleteUser(id);
      return { success: true };
    },
  );

  app.put(
    "/users/:id/role",
    { preHandler: [authenticate, requireRole("directeur")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const { role } = assignRoleSchema.parse(request.body);
      const db = getDb();
      const [updated] = await db
        .update(users)
        .set({ role, updatedAt: new Date() })
        .where(eq(users.id, id))
        .returning({ id: users.id, email: users.email, name: users.name, role: users.role });
      if (!updated) return reply.status(404).send({ error: "Utilisateur introuvable" });
      return updated;
    },
  );
}
