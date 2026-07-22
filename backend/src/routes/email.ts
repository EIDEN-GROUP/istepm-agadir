import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate } from "@/middleware/auth";
import { getDb } from "@/db";
import { emailLogs } from "@/db/schema/email-logs";
import nodemailer from "nodemailer";
import { getEnv } from "@/config/env";

const sendSchema = z.object({
  to: z.string().email(),
  subject: z.string().min(1),
  html: z.string().optional(),
  text: z.string().optional(),
  message: z.string().optional(),
  parentName: z.string().optional(),
});

const receiptSchema = z.object({
  to: z.string().email(),
  parentName: z.string(),
  receipt: z.string(),
  amount: z.number(),
  date: z.string(),
  mode: z.string(),
  period: z.string(),
  pdfUrl: z.string().optional(),
});

let _transporter: nodemailer.Transporter | null = null;

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

export async function emailRoutes(app: FastifyInstance) {
  app.post("/send", { preHandler: [authenticate] }, async (request) => {
    const input = sendSchema.parse(request.body);
    const env = getEnv();
    const transporter = getTransporter();

    if (!transporter) {
      return { ok: false, error: "SMTP non configuré" };
    }

    const html = input.html ?? input.message ?? input.text ?? "";
    const text = input.text ?? input.message ?? "";

    try {
      await transporter.sendMail({
        from: env.FROM_EMAIL,
        to: input.to,
        subject: input.subject,
        html,
        text,
      });

      await logEmail(input.to, input.subject, "custom", "sent");

      return { ok: true };
    } catch (err) {
      await logEmail(input.to, input.subject, "custom", "failed", err instanceof Error ? err.message : "Unknown");
      return { ok: false, error: err instanceof Error ? err.message : "Erreur inconnue" };
    }
  });

  app.post("/send-receipt", { preHandler: [authenticate] }, async (request) => {
    const input = receiptSchema.parse(request.body);
    const env = getEnv();
    const transporter = getTransporter();

    if (!transporter) {
      return { ok: false, error: "SMTP non configuré" };
    }

    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Reçu de paiement</h2>
        <p>Bonjour ${input.parentName},</p>
        <p>Nous vous remercions pour votre règlement.</p>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;">Reçu</td><td style="padding: 8px; border-bottom: 1px solid #ddd; font-weight: bold;">${input.receipt}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;">Montant</td><td style="padding: 8px; border-bottom: 1px solid #ddd; font-weight: bold;">${input.amount.toLocaleString("fr-FR")} MAD</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;">Date</td><td style="padding: 8px; border-bottom: 1px solid #ddd;">${input.date}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;">Mode</td><td style="padding: 8px; border-bottom: 1px solid #ddd;">${input.mode}</td></tr>
          <tr><td style="padding: 8px;">Période</td><td style="padding: 8px;">${input.period}</td></tr>
        </table>
        ${input.pdfUrl ? `<p>Votre reçu PDF est joint ci-dessous.</p>` : ""}
        <p style="margin-top: 24px; color: #666;">Cordialement,<br>L'équipe de gestion</p>
      </div>
    `;

    try {
      await transporter.sendMail({
        from: env.FROM_EMAIL,
        to: input.to,
        subject: `Reçu de paiement ${input.receipt}`,
        html,
      });

      await logEmail(input.to, `Reçu ${input.receipt}`, "receipt", "sent");
      return { ok: true };
    } catch (err) {
      await logEmail(input.to, `Reçu ${input.receipt}`, "receipt", "failed", err instanceof Error ? err.message : "Unknown");
      return { ok: false, error: err instanceof Error ? err.message : "Erreur inconnue" };
    }
  });

  app.post("/send-demo", async (request) => {
    // Public endpoint (no auth required) for the landing page
    const input = z.object({
      visitor: sendSchema,
      admin: sendSchema,
    }).parse(request.body);

    const env = getEnv();
    const transporter = getTransporter();

    if (!transporter) {
      return { ok: false, error: "SMTP non configuré" };
    }

    try {
      await Promise.all([
        transporter.sendMail({
          from: env.FROM_EMAIL,
          to: input.visitor.to,
          subject: input.visitor.subject,
          html: input.visitor.html,
          text: input.visitor.text,
        }),
        transporter.sendMail({
          from: env.FROM_EMAIL,
          to: input.admin.to,
          subject: input.admin.subject,
          html: input.admin.html,
          text: input.admin.text,
          replyTo: input.visitor.to,
        }),
      ]);

      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "Erreur inconnue" };
    }
  });

  app.get("/logs", { preHandler: [authenticate] }, async () => {
    const db = getDb();
    return db.select().from(emailLogs).orderBy(emailLogs.createdAt).limit(100);
  });
}

async function logEmail(recipient: string, subject: string, type: string, status: "sent" | "failed", errorMsg?: string) {
  try {
    const db = getDb();
    await db.insert(emailLogs).values({ recipient, subject, type, status, errorMsg: errorMsg ?? "" });
  } catch {
    // Don't throw if logging fails
  }
}
