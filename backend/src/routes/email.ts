import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate, requireRole } from "@/middleware/auth";
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
  attachments: z
    .array(
      z.object({
        filename: z.string(),
        content: z.string(), // base64-encoded
        contentType: z.string().optional(),
      }),
    )
    .optional(),
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
  app.post("/send", { preHandler: [authenticate, requireRole("directeur", "assistant_directeur", "responsable")] }, async (request) => {
    const input = sendSchema.parse(request.body);
    const env = getEnv();
    const transporter = getTransporter();

    if (!transporter) {
      return { ok: false, error: "SMTP non configuré" };
    }

    const html = input.html ?? input.message ?? input.text ?? "";
    const text = input.text ?? input.message ?? "";

    const mailOptions: nodemailer.SendMailOptions = {
      from: env.FROM_EMAIL,
      to: input.to,
      // Anti header-injection : le sujet ne doit jamais contenir de retour ligne.
      subject: input.subject.replace(/[\r\n]+/g, " "),
      html,
      text,
    };

    if (input.attachments?.length) {
      mailOptions.attachments = input.attachments.map((a) => ({
        filename: a.filename,
        content: Buffer.from(a.content, "base64"),
        contentType: a.contentType ?? "application/pdf",
      }));
    }

    try {
      await transporter.sendMail(mailOptions);

      await logEmail(input.to, input.subject, "custom", "sent");

      return { ok: true };
    } catch (err) {
      await logEmail(
        input.to,
        input.subject,
        "custom",
        "failed",
        err instanceof Error ? err.message : "Unknown",
      );
      return {
        ok: false,
        error: err instanceof Error ? err.message : "Erreur inconnue",
      };
    }
  });

  app.post(
    "/send-demo",
    { config: { rateLimit: { max: 5, timeWindow: "1 hour" } } },
    async (request) => {
      // Endpoint public (page de contact) : gabarit FIXE côté serveur.
      // Aucun HTML/sujet/destinataire libre n'est accepté (anti-relais SMTP).
      const input = z
        .object({
          name: z.string().trim().min(1).max(100),
          phone: z.string().trim().min(1).max(30),
          email: z.string().email().optional(),
          message: z.string().trim().max(2000).optional().default(""),
        })
        .parse(request.body);

      const env = getEnv();
      const transporter = getTransporter();

      if (!transporter) {
        return { ok: false, error: "SMTP non configuré" };
      }

      const esc = (s: string) =>
        s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
      const bodyHtml =
        `<p><strong>Nom :</strong> ${esc(input.name)}</p>` +
        `<p><strong>Téléphone :</strong> ${esc(input.phone)}</p>` +
        (input.email ? `<p><strong>E-mail :</strong> ${esc(input.email)}</p>` : "") +
        (input.message ? `<p><strong>Message :</strong><br>${esc(input.message).replace(/\n/g, "<br>")}</p>` : "");
      const bodyText =
        `Nom : ${input.name}\nTéléphone : ${input.phone}\n` +
        (input.email ? `E-mail : ${input.email}\n` : "") +
        (input.message ? `Message : ${input.message}\n` : "");

      try {
        await transporter.sendMail({
          from: env.FROM_EMAIL,
          to: env.ADMIN_EMAIL,
          subject: "ISTPM · Demande de démo",
          html: bodyHtml,
          text: bodyText,
          replyTo: input.email,
        });
        await logEmail(env.ADMIN_EMAIL, "ISTPM · Demande de démo", "demo", "sent");

        if (input.email) {
          await transporter.sendMail({
            from: env.FROM_EMAIL,
            to: input.email,
            subject: "ISTPM Agadir · Demande bien reçue",
            html: `<p>Bonjour ${esc(input.name)},</p><p>Nous avons bien reçu votre demande de démonstration. Notre équipe vous recontactera très vite.</p>`,
            text: `Bonjour ${input.name},\n\nNous avons bien reçu votre demande de démonstration. Notre équipe vous recontactera très vite.`,
          });
        }

        return { ok: true };
      } catch (err) {
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Erreur inconnue",
        };
      }
    },
  );

  app.get("/logs", { preHandler: [authenticate] }, async () => {
    const db = getDb();
    return db.select().from(emailLogs).orderBy(emailLogs.createdAt).limit(100);
  });
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
    // Don't throw if logging fails
  }
}
