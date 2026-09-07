import crypto from "node:crypto";
import nodemailer from "nodemailer";
import { getDb } from "@/db";
import { users } from "@/db/schema/users";
import { etudiants } from "@/db/schema/etudiants";
import { formateurs } from "@/db/schema/formateurs";
import { createUser, findByEmail, hashPassword } from "@/services/auth";
import { getEnv } from "@/config/env";
import { eq, and, desc, isNull, isNotNull, gt } from "drizzle-orm";

/** Durée de validité d'un lien d'invitation : 30 minutes, usage unique. */
export const INVITATION_TTL_MS = 30 * 60 * 1000;

export type InvitationRole =
  | "admin"
  | "superadmin"
  | "directeur"
  | "enseignant"
  | "responsable"
  | "etudiant";

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function frontendBaseUrl(): string {
  const env = getEnv();
  if (env.FRONTEND_URL) return env.FRONTEND_URL.replace(/\/$/, "");
  return env.CORS_ORIGIN.split(",")[0].trim().replace(/\/$/, "");
}

let _transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (!_transporter) {
    const env = getEnv();
    if (env.SMTP_HOST) {
      _transporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_PORT === 465,
        auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
      });
    }
  }
  return _transporter;
}

function buildInviteEmail(name: string, role: string, inviteUrl: string) {
  return {
    subject: "Créez votre mot de passe — ISTPM Agadir",
    text:
      `Bonjour ${name},\n\n` +
      `Un compte ${role} a été créé pour vous sur la plateforme ISTPM Agadir.\n` +
      `Définissez votre mot de passe en cliquant sur ce lien (valable 30 minutes, utilisable une seule fois) :\n${inviteUrl}\n\n` +
      `Passé ce délai, demandez au secrétariat de vous renvoyer une invitation.`,
    html:
      `<p>Bonjour ${name},</p>` +
      `<p>Un compte <strong>${role}</strong> a été créé pour vous sur la plateforme ISTPM Agadir.</p>` +
      `<p><a href="${inviteUrl}">Définir mon mot de passe</a> <em>(lien valable 30 minutes, utilisable une seule fois)</em>.</p>` +
      `<p>Passé ce délai, demandez au secrétariat de vous renvoyer une invitation.</p>`,
  };
}

/** Émet (ou réémet) un lien pour un utilisateur existant. */
async function issueInvite(userId: string) {
  const db = getDb();
  const token = crypto.randomBytes(32).toString("hex");
  const [updated] = await db
    .update(users)
    .set({
      inviteTokenHash: hashToken(token),
      inviteExpiresAt: new Date(Date.now() + INVITATION_TTL_MS),
      inviteUsedAt: null,
    })
    .where(eq(users.id, userId))
    .returning({ id: users.id, email: users.email, name: users.name, role: users.role });
  if (!updated) return null;

  const inviteUrl = `${frontendBaseUrl()}/definir-mot-de-passe?token=${token}`;
  let emailSent = false;
  const transporter = getTransporter();
  if (transporter) {
    try {
      const env = getEnv();
      const mail = buildInviteEmail(updated.name, updated.role, inviteUrl);
      await transporter.sendMail({ from: env.FROM_EMAIL, to: updated.email, ...mail });
      emailSent = true;
    } catch {
      emailSent = false;
    }
  }
  return { user: updated, inviteUrl, emailSent };
}

/**
 * Crée le compte (mot de passe aléatoire inutilisable) puis émet le lien.
 * La liaison à la fiche se fait à l'acceptation (via invite_cne / e-mail),
 * donc l'ordre fiche ↔ compte n'a pas d'importance.
 */
export async function registerWithInvite(input: {
  email: string;
  name: string;
  role: InvitationRole;
  cne?: string;
  etudiantId?: string;
  filiere?: string;
  groupe?: string;
}) {
  const db = getDb();
  const email = input.email.trim().toLowerCase();
  if (await findByEmail(email)) {
    return { ok: false as const, error: "Cet email est déjà utilisé" };
  }
  const randomPassword = crypto.randomBytes(24).toString("hex");
  // Pas d'auto-création ici : la fiche est créée par son propre formulaire
  // (ou n'existe pas pour le staff) ; la liaison a lieu à l'acceptation.
  const user = await createUser({
    email,
    password: randomPassword,
    name: input.name.trim(),
    role: input.role,
    skipAutoCreate: true,
    etudiantId: input.etudiantId,
    cne: input.cne,
    filiere: input.filiere,
    groupe: input.groupe,
  });
  if (input.cne) {
    await db.update(users).set({ inviteCne: input.cne.trim() }).where(eq(users.id, user.id));
  }
  const issued = await issueInvite(user.id);
  if (!issued) return { ok: false as const, error: "Compte créé mais lien impossible" };
  return { ok: true as const, user, inviteUrl: issued.inviteUrl, emailSent: issued.emailSent };
}

export async function verifyInvite(token: string) {
  const db = getDb();
  const [row] = await db
    .select({ email: users.email, name: users.name, role: users.role })
    .from(users)
    .where(
      and(
        eq(users.inviteTokenHash, hashToken(token)),
        isNull(users.inviteUsedAt),
        gt(users.inviteExpiresAt, new Date()),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function acceptInvite(token: string, password: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(users)
    .where(eq(users.inviteTokenHash, hashToken(token)))
    .limit(1);
  if (!row) return { ok: false as const, error: "Lien invalide" };
  if (row.inviteUsedAt || !row.inviteExpiresAt || row.inviteExpiresAt.getTime() < Date.now()) {
    return { ok: false as const, error: "Lien déjà utilisé ou expiré" };
  }

  // Liaison à la fiche existante (créée avant ou après le compte, peu importe).
  if (row.role === "etudiant") {
    const cne = (row.inviteCne || "").trim();
    if (cne) {
      await db.update(etudiants).set({ userId: row.id }).where(eq(etudiants.cne, cne));
    } else {
      await db.update(etudiants).set({ userId: row.id }).where(eq(etudiants.email, row.email));
    }
  } else if (row.role === "enseignant") {
    await db.update(formateurs).set({ userId: row.id }).where(eq(formateurs.email, row.email));
  }

  // Usage unique : mot de passe défini + lien brûlé atomiquement.
  const [updated] = await db
    .update(users)
    .set({
      passwordHash: await hashPassword(password),
      inviteTokenHash: null,
      inviteExpiresAt: null,
      inviteUsedAt: new Date(),
      inviteCne: "",
    })
    .where(and(eq(users.id, row.id), isNull(users.inviteUsedAt)))
    .returning({ id: users.id, email: users.email, name: users.name, role: users.role });
  if (!updated) return { ok: false as const, error: "Lien déjà utilisé ou expiré" };
  return { ok: true as const, user: updated };
}

/** Comptes dont l'invitation est en attente (lien émis, non utilisé). */
export async function listPendingInvites() {
  const db = getDb();
  return db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      expiresAt: users.inviteExpiresAt,
    })
    .from(users)
    .where(and(isNotNull(users.inviteTokenHash), isNull(users.inviteUsedAt)))
    .orderBy(desc(users.createdAt))
    .limit(50);
}

/** Renvoyer : nouveau lien 30 min (l'ancien est invalidé). */
export async function resendInvite(userId: string) {
  const issued = await issueInvite(userId);
  if (!issued) return { ok: false as const, error: "Utilisateur introuvable" };
  return { ok: true as const, ...issued };
}

/** Auto-renvoi par l'utilisateur (lien expiré) : même réponse dans tous les cas. */
export async function resendInviteByEmail(email: string) {
  const db = getDb();
  const clean = email.trim().toLowerCase();
  const [row] = await db
    .select({ id: users.id })
    .from(users)
    .where(
      and(
        eq(users.email, clean),
        isNotNull(users.inviteTokenHash),
        isNull(users.inviteUsedAt),
      ),
    )
    .limit(1);
  if (row) await issueInvite(row.id);
  return { ok: true };
}

/** Révoquer : le lien meurt, le compte reste verrouillé (mot de passe aléatoire). */
export async function revokeInvite(userId: string) {
  const db = getDb();
  await db
    .update(users)
    .set({ inviteTokenHash: null, inviteExpiresAt: null, inviteUsedAt: null })
    .where(eq(users.id, userId));
  return { ok: true };
}
