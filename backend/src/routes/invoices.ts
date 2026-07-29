import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate, requireRole } from "@/middleware/auth";
import { getDb } from "@/db";
import { invoices } from "@/db/schema/invoices";
import { clients } from "@/db/schema/clients";
import { payments } from "@/db/schema/payments";
import { settings } from "@/db/schema/settings";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

const generateSchema = z.object({
  period: z.string(),
});

export async function invoiceRoutes(app: FastifyInstance) {
  app.get("/", { preHandler: [authenticate] }, async () => {
    const db = getDb();
    const rows = await db
      .select()
      .from(invoices)
      .leftJoin(clients, eq(invoices.clientId, clients.id))
      .orderBy(desc(invoices.createdAt));
    return rows.map((r) => ({ ...r.invoices, client: r.clients }));
  });

  app.get("/outstanding", { preHandler: [authenticate] }, async () => {
    const db = getDb();
    const rows = await db
      .select()
      .from(invoices)
      .where(sql`${invoices.amountPaid} < ${invoices.amountDue}`);

    const totalDue = rows.reduce((s, r) => s + Number(r.amountDue), 0);
    const totalPaid = rows.reduce((s, r) => s + Number(r.amountPaid), 0);
    return {
      totalDue,
      totalPaid,
      outstanding: totalDue - totalPaid,
      count: rows.length,
    };
  });

  app.get("/years", { preHandler: [authenticate] }, async () => {
    const db = getDb();
    const rows = await db
      .select({ period: invoices.period })
      .from(invoices)
      .groupBy(invoices.period);
    const years = [
      ...new Set(rows.map((r) => r.period?.split("/")[1]).filter(Boolean)),
    ];
    return years.sort();
  });

  app.get("/analytics", { preHandler: [authenticate] }, async (request) => {
    const query = request.query as { grain?: string; year?: string };
    const db = getDb();
    const now = new Date();
    const months = [
      "Sept",
      "Oct",
      "Nov",
      "Déc",
      "Jan",
      "Fév",
      "Mar",
      "Avr",
      "Mai",
      "Juin",
      "Juil",
      "Août",
    ];
    const results: Array<{ m: string; v: number }> = [];

    for (let i = 6; i >= 0; i--) {
      let m = now.getMonth() - i;
      let y = now.getFullYear();
      if (m < 0) {
        m += 12;
        y -= 1;
      }
      const first = new Date(y, m, 1).toISOString().split("T")[0];
      const last = new Date(y, m + 1, 0).toISOString().split("T")[0];

      const rows = await db
        .select({ amount: payments.amount })
        .from(payments)
        .where(and(gte(payments.date, first), lte(payments.date, last)));

      const total = rows.reduce((sum, p) => sum + Number(p.amount), 0);
      results.push({ m: months[m], v: total });
    }

    return results;
  });

  app.post("/generate", { preHandler: [authenticate, requireRole("directeur", "responsable")] }, async (request) => {
    const { period } = generateSchema.parse(request.body);
    const db = getDb();

    const allClients = await db.select().from(clients);
    let created = 0;

    for (const client of allClients) {
      const [existing] = await db
        .select()
        .from(invoices)
        .where(
          and(eq(invoices.clientId, client.id), eq(invoices.period, period)),
        )
        .limit(1);

      if (!existing) {
        await db.insert(invoices).values({
          clientId: client.id,
          period,
          amountDue: String(client.monthlyFee),
          amountPaid: "0",
        });
        created++;
      }
    }

    return { created, period };
  });

  app.get("/:id/pdf", { preHandler: [authenticate] }, async (request) => {
    const { id } = request.params as { id: string };
    const db = getDb();

    const [row] = await db
      .select()
      .from(invoices)
      .leftJoin(clients, eq(invoices.clientId, clients.id))
      .where(eq(invoices.id, id))
      .limit(1);

    if (!row) {
      return { statusCode: 404, error: "Facture introuvable" };
    }

    const inv = row.invoices;
    const cli = row.clients;

    const settingsRows = await db.select().from(settings);
    const settingsMap: Record<string, any> = {};
    for (const r of settingsRows) settingsMap[r.key] = r.value;
    const stampImage = settingsMap.stamp_image as string | null;

    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const page = pdfDoc.addPage([595, 842]);
    const { width, height } = page.getSize();

    let y = height - 50;
    page.drawText("FACTURE", { x: 50, y, size: 24, font: fontBold, color: rgb(0.01, 0.6, 0.58) });
    y -= 30;
    page.drawText(`N° ${inv.id.slice(0, 8)}`, { x: 50, y, size: 11, font, color: rgb(0.4, 0.4, 0.4) });
    y -= 20;
    page.drawText(`Période : ${inv.period}`, { x: 50, y, size: 11, font, color: rgb(0.4, 0.4, 0.4) });
    y -= 30;

    page.drawText("Client", { x: 50, y, size: 14, font: fontBold, color: rgb(0, 0, 0) });
    y -= 22;
    page.drawText(`Nom : ${cli?.parentName ?? "—"}`, { x: 50, y, size: 11, font, color: rgb(0.2, 0.2, 0.2) });
    y -= 18;
    page.drawText(`Email : ${cli?.email ?? "—"}`, { x: 50, y, size: 11, font, color: rgb(0.2, 0.2, 0.2) });
    y -= 18;
    page.drawText(`Tél : ${cli?.phone ?? "—"}`, { x: 50, y, size: 11, font, color: rgb(0.2, 0.2, 0.2) });
    y -= 18;
    page.drawText(`Adresse : ${cli?.address ?? "—"}`, { x: 50, y, size: 11, font, color: rgb(0.2, 0.2, 0.2) });
    y -= 30;

    const statusLabel: Record<string, string> = {
      en_attente: "En attente",
      payee: "Payée",
      partielle: "Partielle",
      impayee: "Impayée",
    };

    page.drawText("Détails de la facture", { x: 50, y, size: 14, font: fontBold, color: rgb(0, 0, 0) });
    y -= 22;

    const details = [
      ["Montant dû", `${Number(inv.amountDue).toLocaleString("fr-FR")} MAD`],
      ["Montant payé", `${Number(inv.amountPaid).toLocaleString("fr-FR")} MAD`],
      ["Reste à payer", `${(Number(inv.amountDue) - Number(inv.amountPaid)).toLocaleString("fr-FR")} MAD`],
      ["Statut", statusLabel[inv.status] ?? inv.status],
    ];
    if (inv.dueDate) details.push(["Date d'échéance", inv.dueDate]);

    for (const [label, value] of details) {
      page.drawText(label, { x: 50, y, size: 11, font, color: rgb(0.2, 0.2, 0.2) });
      page.drawText(value, { x: 300, y, size: 11, font, color: rgb(0, 0, 0) });
      y -= 18;
    }

    const stampImg = await (async () => {
      if (!stampImage) return null;
      const comma = stampImage.indexOf(",");
      if (comma === -1) return null;
      const raw = stampImage.slice(comma + 1);
      try {
        const bytes = Buffer.from(raw, "base64");
        try { return await pdfDoc.embedPng(bytes); } catch { return null; }
      } catch { return null; }
    })();

    if (stampImg) {
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
    }

    page.drawText("Document genere par la plateforme ISTEPM Agadir - usage interne.", {
      x: 50, y: 60, size: 8, font, color: rgb(0.4, 0.4, 0.4),
    });
    page.drawText(`Edite le ${new Date().toLocaleDateString("fr-FR")}`, {
      x: 50, y: 48, size: 8, font, color: rgb(0.4, 0.4, 0.4),
    });

    const pdfBytes = await pdfDoc.save();
    const base64 = Buffer.from(pdfBytes).toString("base64");
    return { base64, contentType: "application/pdf" };
  });
}
