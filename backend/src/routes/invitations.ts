import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate, requireRole } from "@/middleware/auth";
import {
  registerWithInvite,
  verifyInvite,
  acceptInvite,
  listPendingInvites,
  resendInvite,
  resendInviteByEmail,
  revokeInvite,
  smtpConfigured,
  type InvitationRole,
} from "@/services/invitations";

const INVITE_ROLES = ["directeur", "enseignant", "responsable", "etudiant"] as const;

const createInviteSchema = z.object({
  email: z.string().email("Email invalide"),
  name: z.string().min(1, "Nom requis"),
  role: z.enum(INVITE_ROLES).optional().default("etudiant"),
  cne: z.string().optional(),
  etudiantId: z.string().uuid().optional(),
  filiere: z.string().optional(),
  groupe: z.string().optional(),
});

export async function invitationRoutes(app: FastifyInstance) {
  // Crée le compte + envoie le lien (staff uniquement).
  app.post(
    "/",
    { preHandler: [authenticate, requireRole("directeur", "responsable")] },
    async (request, reply) => {
      const input = createInviteSchema.parse(request.body);
      const result = await registerWithInvite({
        email: input.email,
        name: input.name,
        role: input.role as InvitationRole,
        cne: input.cne,
        etudiantId: input.etudiantId,
        filiere: input.filiere,
        groupe: input.groupe,
      });
      if (!result.ok) return reply.status(409).send({ error: result.error });
      if (!result.emailSent) {
        request.log.error({ email: input.email, reason: result.emailError }, "Échec envoi e-mail d'invitation");
      }
      return { user: result.user, emailSent: result.emailSent, emailError: result.emailError, inviteUrl: result.inviteUrl };
    },
  );

  // État SMTP (staff) : l'UI affiche « configuré » ou invite au partage manuel.
  app.get("/smtp", { preHandler: [authenticate, requireRole("directeur", "responsable")] }, async () => {
    return { configured: smtpConfigured() };
  });

  // Invitations en attente (staff).
  app.get("/", { preHandler: [authenticate, requireRole("directeur", "responsable")] }, async () => {
    return listPendingInvites();
  });

  // Renvoyer : nouveau lien 30 min (staff).
  app.post(
    "/:userId/resend",
    { preHandler: [authenticate, requireRole("directeur", "responsable")] },
    async (request, reply) => {
      const { userId } = request.params as { userId: string };
      const result = await resendInvite(userId);
      if (!result.ok) return reply.status(404).send({ error: result.error });
      if (!result.emailSent) {
        request.log.error({ userId, reason: result.emailError }, "Échec renvoi e-mail d'invitation");
      }
      return { emailSent: result.emailSent, emailError: result.emailError, inviteUrl: result.inviteUrl };
    },
  );

  // Révoquer : tue le lien, le compte reste verrouillé (staff).
  app.delete(
    "/:userId",
    { preHandler: [authenticate, requireRole("directeur", "responsable")] },
    async (request) => {
      const { userId } = request.params as { userId: string };
      return revokeInvite(userId);
    },
  );

  // Vérifier un lien (public, pour afficher la page de définition).
  app.get(
    "/verify",
    { config: { rateLimit: { max: 30, timeWindow: "15 minutes" } } },
    async (request) => {
      const { token } = request.query as { token?: string };
      if (!token) return { valid: false };
      const found = await verifyInvite(token);
      if (!found) return { valid: false };
      return { valid: true, ...found };
    },
  );

  // Accepter : définit le mot de passe (usage unique, 30 min), connecte directement.
  app.post(
    "/accept",
    { config: { rateLimit: { max: 10, timeWindow: "15 minutes" } } },
    async (request, reply) => {
      const input = z
        .object({
          token: z.string().min(1, "Lien manquant"),
          password: z.string().min(8, "Mot de passe trop court (8 caractères min)"),
        })
        .parse(request.body);
      const result = await acceptInvite(input.token, input.password);
      if (!result.ok) return reply.status(400).send({ error: result.error });
      reply.header("Cache-Control", "no-store");
    reply.header("Cache-Control", "no-store");
      const token = app.jwt.sign({
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        role: result.user.role as InvitationRole,
      });
      return { token, user: result.user };
    },
  );

  // Auto-renvoi public (lien expiré / non reçu). Réponse identique dans tous
  // les cas pour ne pas révéler les e-mails enregistrés.
  app.post(
    "/renvoyer",
    { config: { rateLimit: { max: 10, timeWindow: "15 minutes" } } },
    async (request) => {
      const input = z.object({ email: z.string().email("Email invalide") }).parse(request.body);
      await resendInviteByEmail(input.email);
      return { ok: true };
    },
  );
}
