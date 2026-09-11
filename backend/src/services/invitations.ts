import crypto from "node:crypto";
import nodemailer from "nodemailer";
import { getDb } from "@/db";
import { users } from "@/db/schema/users";
import { etudiants } from "@/db/schema/etudiants";
import { formateurs } from "@/db/schema/formateurs";
import { createUser, findByEmail, hashPassword } from "@/services/auth";
import { getEnv } from "@/config/env";
import { eq, and, desc, isNull, isNotNull, gt } from "drizzle-orm";
import { istpmEmailShell, istpmLogoAttachment, EMAIL_ROLE_LABELS } from "@/lib/email-brand";

/** Durée de validité d'un lien d'invitation : 24 heures, usage unique.
 *  30 minutes expiraient avant lecture (boîtes lentes, week-ends) ; le lien
 *  reste à usage unique et brûlé à l'acceptation. */
export const INVITATION_TTL_MS = 24 * 60 * 60 * 1000;

export type InvitationRole =
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

const escInvite = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Gabarit officiel (logo, carte blanche, bouton d'action) — coquille commune à `email-brand.ts`. */
function inviteHtml(name: string, role: string, inviteUrl: string) {
  const roleLabel = EMAIL_ROLE_LABELS[role] ?? role;
  const body = `
    <p style="margin:0 0 4px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;color:#029994;">Bienvenue</p>
    <h1 style="margin:0 0 18px;font-size:21px;line-height:1.3;color:#123b3a;">Bonjour ${escInvite(name)},</h1>
    <p style="margin:0 0 16px;">
      Un compte <strong>${escInvite(roleLabel)}</strong> vient d'être créé pour vous sur la
      plateforme de gestion scolaire de l'ISTEPM Agadir. Il vous donne accès à votre espace
      personnel — emploi du temps, notes, paiements et démarches administratives selon votre profil.
    </p>
    <p style="margin:0 0 26px;">
      Pour commencer, choisissez votre mot de passe en cliquant sur le bouton ci-dessous.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 26px;">
      <tr>
        <td style="border-radius:999px;background-color:#029994;">
          <a href="${inviteUrl}"
             style="display:inline-block;padding:13px 34px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:999px;">
            Définir mon mot de passe
          </a>
        </td>
      </tr>
    </table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#fbf6ec;border:1px solid #f0e2c0;border-radius:10px;margin:0 0 22px;">
      <tr>
        <td style="padding:12px 16px;font-size:12.5px;color:#7a5f1f;line-height:1.55;">
          ⏱ Ce lien est <strong>personnel, à usage unique</strong> et reste valable
          <strong>24 heures</strong>. Passé ce délai, demandez au secrétariat de vous
          renvoyer une invitation.
        </td>
      </tr>
    </table>
    <p style="margin:0;font-size:12px;color:#8b9a99;word-break:break-all;">
      Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br>
      <a href="${inviteUrl}" style="color:#029994;">${inviteUrl}</a>
    </p>
  `;
  return istpmEmailShell({
    preheader: `Votre accès ${roleLabel.toLowerCase()} à l'espace ISTEPM Agadir vous attend.`,
    bodyHtml: body,
  });
}

function buildInviteEmail(name: string, role: string, inviteUrl: string) {
  const roleLabel = EMAIL_ROLE_LABELS[role] ?? role;
  return {
    subject: "Créez votre mot de passe — ISTEPM Agadir",
    text:
      `Bonjour ${name},\n\n` +
      `Un compte ${roleLabel} a été créé pour vous sur la plateforme de gestion scolaire ISTEPM Agadir.\n` +
      `Définissez votre mot de passe en cliquant sur ce lien (valable 24 heures, utilisable une seule fois) :\n${inviteUrl}\n\n` +
      `Passé ce délai, demandez au secrétariat de vous renvoyer une invitation.`,
    html: inviteHtml(name, role, inviteUrl),
    attachments: [istpmLogoAttachment()],
  };
}

export function smtpConfigured(): boolean {
  return !!getEnv().SMTP_HOST;
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
  let emailError: string | null = "SMTP non configuré";
  const transporter = getTransporter();
  if (transporter) {
    try {
      const env = getEnv();
      const mail = buildInviteEmail(updated.name, updated.role, inviteUrl);
      await transporter.sendMail({ from: env.FROM_EMAIL, to: updated.email, ...mail });
      emailSent = true;
      emailError = null;
    } catch (err) {
      emailSent = false;
      emailError = err instanceof Error ? err.message : "Envoi impossible";
    }
  }
  return { user: updated, inviteUrl, emailSent, emailError };
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
  return { ok: true as const, user, inviteUrl: issued.inviteUrl, emailSent: issued.emailSent, emailError: issued.emailError };
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
/** Auto-renvoi par l'utilisateur (lien expiré) : même réponse publique dans
 *  tous les cas (anti-énumération), mais le détail est renvoyé à l'appelant
 *  pour journalisation. */
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
  if (!row) return { ok: true as const, sent: false, email: clean, error: "aucune invitation en attente" };
  const issued = await issueInvite(row.id);
  if (!issued) return { ok: true as const, sent: false, email: clean, error: "utilisateur introuvable" };
  return {
    ok: true as const,
    sent: issued.emailSent,
    email: clean,
    error: issued.emailSent ? null : (issued.emailError ?? "envoi impossible"),
  };
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
