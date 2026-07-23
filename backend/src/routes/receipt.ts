import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate, requireRole } from "@/middleware/auth";
import { getDb } from "@/db";
import { settings } from "@/db/schema/settings";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { getEnv } from "@/config/env";

const generateSchema = z.object({
  clientId: z.string(),
  paymentId: z.string(),
  data: z.record(z.string(), z.string()),
});

export async function receiptRoutes(app: FastifyInstance) {
  app.post("/generate", { preHandler: [authenticate, requireRole("directeur", "responsable")] }, async (request) => {
    const input = generateSchema.parse(request.body);
    const db = getDb();

    const settingsRows = await db.select().from(settings);
    const settingsMap: Record<string, any> = {};
    for (const r of settingsRows) settingsMap[r.key] = r.value;

    const templateMeta = settingsMap.pdf_template as
      { url?: string } | undefined;
    const fieldSource = settingsMap.active_field_source as string | undefined;
    const fields: Array<{ key: string; x: number; y: number }> =
      fieldSource === "ai"
        ? ((settingsMap.receipt_fields_ai as any[]) ?? [])
        : ((settingsMap.receipt_fields as any[]) ?? []);

    if (!templateMeta?.url) {
      // Generate a simple PDF without template
      const pdfDoc = await PDFDocument.create();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const page = pdfDoc.addPage([595, 842]);
      const { width, height } = page.getSize();

      let y = height - 60;
      page.drawText("Reçu de paiement", {
        x: 50,
        y,
        size: 20,
        font,
        color: rgb(0, 0, 0),
      });
      y -= 40;

      for (const [key, value] of Object.entries(input.data)) {
        page.drawText(`${key}: ${value}`, {
          x: 50,
          y,
          size: 12,
          font,
          color: rgb(0.2, 0.2, 0.2),
        });
        y -= 20;
      }

      const pdfBytes = await pdfDoc.save();
      const base64 = Buffer.from(pdfBytes).toString("base64");
      return { base64, contentType: "application/pdf" };
    }

    // Fetch template PDF
    const tmplRes = await fetch(templateMeta.url);
    const tmplBytes = new Uint8Array(await tmplRes.arrayBuffer());
    const pdfDoc = await PDFDocument.load(tmplBytes);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const pages = pdfDoc.getPages();
    const firstPage = pages[0];

    for (const field of fields) {
      const value = input.data[field.key] ?? "";
      if (value) {
        firstPage.drawText(value, {
          x: field.x,
          y: field.y,
          size: 11,
          font,
          color: rgb(0, 0, 0),
        });
      }
    }

    const pdfBytes = await pdfDoc.save();
    const base64 = Buffer.from(pdfBytes).toString("base64");
    return { base64, contentType: "application/pdf" };
  });
}
