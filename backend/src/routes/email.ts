import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate, requireRole } from "@/middleware/auth";
import { getDb } from "@/db";
import { emailLogs } from "@/db/schema/email-logs";
import { settings } from "@/db/schema/settings";
import nodemailer from "nodemailer";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
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
  app.post("/send", { preHandler: [authenticate, requireRole("directeur", "responsable")] }, async (request) => {
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
      subject: input.subject,
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

  app.post("/send-receipt", { preHandler: [authenticate, requireRole("directeur", "responsable")] }, async (request) => {
    const input = receiptSchema.parse(request.body);
    const env = getEnv();
    const transporter = getTransporter();

    if (!transporter) {
      return { ok: false, error: "SMTP non configuré" };
    }

    const db = getDb();
    const settingsRows = await db.select().from(settings);
    const settingsMap: Record<string, any> = {};
    for (const r of settingsRows) settingsMap[r.key] = r.value;
    const stampImage = settingsMap.stamp_image as string | null;

    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const page = pdfDoc.addPage([595, 842]);
    const { height } = page.getSize();

    let y = height - 60;
    page.drawText("Reçu de paiement", { x: 50, y, size: 20, font: fontBold, color: rgb(0.01, 0.6, 0.58) });
    y -= 30;

    const lines: [string, string][] = [
      ["Reçu", input.receipt],
      ["Montant", `${input.amount.toLocaleString("fr-FR")} MAD`],
      ["Date", input.date],
      ["Mode", input.mode],
      ["Période", input.period],
    ];
    for (const [label, value] of lines) {
      page.drawText(label, { x: 50, y, size: 11, font, color: rgb(0.2, 0.2, 0.2) });
      page.drawText(value, { x: 200, y, size: 11, font, color: rgb(0, 0, 0) });
      y -= 20;
    }

    if (stampImage) {
      const comma = stampImage.indexOf(",");
      if (comma !== -1) {
        const raw = stampImage.slice(comma + 1);
        try {
          const bytes = Buffer.from(raw, "base64");
          const stampImg = await pdfDoc.embedPng(bytes);
          const BOX = 120;
          const aspect = stampImg.width / stampImg.height;
          let dw = BOX, dh = BOX;
          if (aspect > 1) dh = BOX / aspect;
          else dw = BOX * aspect;
          page.drawImage(stampImg, { x: 50, y: 100, width: dw, height: dh });
          page.drawText("Cachet de l'etablissement", {
            x: 50, y: 88, size: 8, font,
            color: rgb(0.4, 0.4, 0.4),
          });
        } catch {}
      }
    }

    const pdfBytes = await pdfDoc.save();
    const pdfBase64 = Buffer.from(pdfBytes).toString("base64");

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
        <p style="margin-top: 24px; color: #666;">Cordialement,<br>L'équipe de gestion</p>
      </div>
    `;

    try {
      await transporter.sendMail({
        from: env.FROM_EMAIL,
        to: input.to,
        subject: `Reçu de paiement ${input.receipt}`,
        html,
        attachments: [
          {
            filename: `recu-${input.receipt}.pdf`,
            content: pdfBase64,
            encoding: "base64",
            contentType: "application/pdf",
          },
        ],
      });

      await logEmail(input.to, `Reçu ${input.receipt}`, "receipt", "sent");
      return { ok: true };
    } catch (err) {
      await logEmail(
        input.to,
        `Reçu ${input.receipt}`,
        "receipt",
        "failed",
        err instanceof Error ? err.message : "Unknown",
      );
      return {
        ok: false,
        error: err instanceof Error ? err.message : "Erreur inconnue",
      };
    }
  });

  app.post("/send-demo", async (request) => {
    // Public endpoint (no auth required) for the landing page
    const input = z
      .object({
        visitor: sendSchema,
        admin: sendSchema,
      })
      .parse(request.body);

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
      return {
        ok: false,
        error: err instanceof Error ? err.message : "Erreur inconnue",
      };
    }
  });

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
