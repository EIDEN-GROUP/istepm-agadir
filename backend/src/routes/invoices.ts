import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate, requireRole } from "@/middleware/auth";
import { getDb } from "@/db";
import { invoices } from "@/db/schema/invoices";
import { clients } from "@/db/schema/clients";
import { payments } from "@/db/schema/payments";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";

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
}
