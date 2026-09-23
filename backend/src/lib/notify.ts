import nodemailer from "nodemailer";
import { getDb } from "@/db";
import { emailLogs } from "@/db/schema/email-logs";
import { getEnv } from "@/config/env";

let _transporter: nodemailer.Transporter | null = null;

/** Transport SMTP partagé (null si non configuré — envois ignorés). */
function getTransporter() {
  if (!_transporter) {
    const env = getEnv();
    if (env.SMTP_HOST) {
      _transporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_PORT === 465,
        auth: {
          user: env.SMTP_USER,
          pass: env.SMTP_PASS,
        },
      });
    }
  }
  return _transporter;
}

/** Échappement HTML minimal (gabarits fixes, anti-injection). */
export function escHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function logEmail(
  recipient: string,
  subject: string,
  type: string,
  status: "sent" | "failed",
  errorMsg?: string,
) {
  try {
    const db = getDb();
    await db
      .insert(emailLogs)
      .values({ recipient, subject, type, status, errorMsg: errorMsg ?? "" });
  } catch {
    // Le logging ne doit jamais faire échouer l'appelant.
  }
}

/**
 * Envoi best-effort (jamais d'exception) : `false` si SMTP absent ou échec,
 * avec trace dans `email_logs` dans tous les cas.
 */
export async function notifyBestEffort(
  to: string,
  subject: string,
  html: string,
  text: string,
  type: string,
): Promise<boolean> {
  const env = getEnv();
  const transporter = getTransporter();
  if (!transporter) {
    await logEmail(to, subject, type, "failed", "SMTP non configuré");
    return false;
  }
  try {
    await transporter.sendMail({ from: env.FROM_EMAIL, to, subject, html, text });
    await logEmail(to, subject, type, "sent");
    return true;
  } catch (err) {
    await logEmail(
      to,
      subject,
      type,
      "failed",
      err instanceof Error ? err.message : "Unknown",
    );
    return false;
  }
}
