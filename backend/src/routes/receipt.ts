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

const STAMP_BOX = 120;
const STAMP_X = 50;
const STAMP_Y = 100;

function dataUrlToBytes(dataUrl: string): Uint8Array | null {
  const comma = dataUrl.indexOf(",");
  if (comma === -1) return null;
  const raw = dataUrl.slice(comma + 1);
  try {
    return Buffer.from(raw, "base64");
  } catch {
    return null;
  }
}

async function embedStamp(
  pdfDoc: PDFDocument,
  stampBase64: string | null,
) {
  if (!stampBase64) return null;
  const bytes = dataUrlToBytes(stampBase64);
  if (!bytes) return null;
  try {
    const img = await pdfDoc.embedPng(bytes);
    return img;
  } catch {
    try {
      const img = await pdfDoc.embedJpg(bytes);
      return img;
    } catch {
      return null;
    }
  }
}

function drawStampOnPage(
  page: import("pdf-lib").PDFPage,
  img: import("pdf-lib").PDFImage | null,
) {
  if (!img) return;
  const { width: pw } = page.getSize();
  const aspect = img.width / img.height;
  let dw = STAMP_BOX;
  let dh = STAMP_BOX;
  if (aspect > 1) dh = STAMP_BOX / aspect;
  else dw = STAMP_BOX * aspect;
  const sx = STAMP_X;
  const sy = STAMP_Y;
  page.drawImage(img, { x: sx, y: sy, width: dw, height: dh });
  page.drawText("Cachet de l'etablissement", {
    x: sx,
    y: sy - 12,
    size: 8,
    font: undefined,
    color: rgb(0.4, 0.4, 0.4),
  });
}

async function embedFontWithFallback(doc: PDFDocument) {
  try {
    return await doc.embedFont(StandardFonts.Helvetica);
  } catch {
    return await doc.embedFont(StandardFonts.Helvetica);
  }
}

export async function receiptRoutes(app: FastifyInstance) {
  app.post("/generate", { preHandler: [authenticate, requireRole("directeur", "responsable")] }, async (request) => {
    const input = generateSchema.parse(request.body);
    const db = getDb();

    const settingsRows = await db.select().from(settings);
    const settingsMap: Record<string, any> = {};
    for (const r of settingsRows) settingsMap[r.key] = r.value;

    const stampImage = settingsMap.stamp_image as string | null;

    const templateMeta = settingsMap.pdf_template as
      { url?: string } | undefined;
    const fieldSource = settingsMap.active_field_source as string | undefined;
    const fields: Array<{ key: string; x: number; y: number }> =
      fieldSource === "ai"
        ? ((settingsMap.receipt_fields_ai as any[]) ?? [])
        : ((settingsMap.receipt_fields as any[]) ?? []);

    if (!templateMeta?.url) {
      const pdfDoc = await PDFDocument.create();
      const font = await embedFontWithFallback(pdfDoc);
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

      const stampImg = await embedStamp(pdfDoc, stampImage);
      drawStampOnPage(page, stampImg);

      const pdfBytes = await pdfDoc.save();
      const base64 = Buffer.from(pdfBytes).toString("base64");
      return { base64, contentType: "application/pdf" };
    }

    const tmplRes = await fetch(templateMeta.url);
    const tmplBytes = new Uint8Array(await tmplRes.arrayBuffer());
    const pdfDoc = await PDFDocument.load(tmplBytes);
    const font = await embedFontWithFallback(pdfDoc);
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

    const stampImg = await embedStamp(pdfDoc, stampImage);
    for (const page of pages) {
      drawStampOnPage(page, stampImg);
    }

    const pdfBytes = await pdfDoc.save();
    const base64 = Buffer.from(pdfBytes).toString("base64");
    return { base64, contentType: "application/pdf" };
  });
}
