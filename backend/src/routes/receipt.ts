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

/**
 * Hôtes interdits pour les récupérations serveur (SSRF) : littéraux IP de
 * loopback, réseaux privés, lien-local (dont 169.254.169.254 métadonnées cloud)
 * et IPv6 locales. Les noms d'hôtes passent (résolution DNS hors scope ici —
 * la source est un réglage staff, pas une entrée utilisateur quelconque).
 */
export function isPrivateHost(host: string): boolean {
  const h = host.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");
  if (["localhost", "0.0.0.0"].includes(h)) return true;
  if (h === "::1" || h === "::") return true;
  const v4 = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const o = v4.slice(1).map(Number);
    if (o.some((n) => n > 255)) return false;
    if (o[0] === 10 || o[0] === 127) return true;
    if (o[0] === 172 && o[1] >= 16 && o[1] <= 31) return true;
    if (o[0] === 192 && o[1] === 168) return true;
    if (o[0] === 169 && o[1] === 254) return true;
    if (o[0] === 0) return true;
    return false;
  }
  if (h.includes(":")) {
    const low = h.split("%")[0];
    return (
      low === "::1" ||
      low.startsWith("fc") || low.startsWith("fd") ||
      low.startsWith("fe80") || low.startsWith("fe90") || low.startsWith("fea") ||
      low.startsWith("feb") || low === "::ffff:127.0.0.1"
    );
  }
  return false;
}

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
  app.post("/generate", { preHandler: [authenticate, requireRole("directeur", "responsable")] }, async (request, reply) => {
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

    // L'URL du gabarit vient des réglages (staff) : on la confine quand même
    // au web public — jamais de loopback, réseau privé ou protocole exotique.
    let tmplUrl: URL;
    try {
      tmplUrl = new URL(templateMeta.url);
    } catch {
      return reply.status(400).send({ error: "URL de gabarit invalide" });
    }
    if (!["http:", "https:"].includes(tmplUrl.protocol) || isPrivateHost(tmplUrl.hostname)) {
      return reply.status(400).send({ error: "URL de gabarit non autorisée" });
    }
    const tmplRes = await fetch(tmplUrl.toString());
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
