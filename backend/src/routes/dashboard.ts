import type { FastifyInstance } from "fastify";
import { authenticate } from "@/middleware/auth";
import { getDb } from "@/db";
import { clients } from "@/db/schema/clients";
import { payments } from "@/db/schema/payments";
import { and, gte, lte, eq, sql } from "drizzle-orm";

export async function dashboardRoutes(app: FastifyInstance) {
  app.get("/stats", { preHandler: [authenticate] }, async () => {
    const db = getDb();
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
    const lastOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];

    const [totalClients] = await db
      .select({ count: sql<number>`count(*)` })
      .from(clients);

    const paidRows = await db
      .select({ amount: payments.amount })
      .from(payments)
      .where(and(gte(payments.date, firstOfMonth), lte(payments.date, lastOfMonth)));

    const debtRows = await db
      .select({ debt: clients.debt })
      .from(clients);

    const allPayments = await db
      .select({ amount: payments.amount })
      .from(payments);

    const [activeCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(clients)
      .where(eq(clients.crmStage, "converti"));

    const [overdueCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(clients)
      .where(eq(clients.overdue, true));

    return {
      totalClients: Number(totalClients.count),
      paidThisMonth: paidRows.reduce((s, p) => s + Number(p.amount), 0),
      totalDebt: debtRows.reduce((s, c) => s + Number(c.debt), 0),
      totalRevenue: allPayments.reduce((s, p) => s + Number(p.amount), 0),
      activeClients: Number(activeCount.count),
      overdueCount: Number(overdueCount.count),
    };
  });

  app.get("/monthly-revenue", { preHandler: [authenticate] }, async () => {
    const db = getDb();
    const months = ["Sept", "Oct", "Nov", "Déc", "Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août"];
    const now = new Date();
    const results: Array<{ m: string; v: number }> = [];

    for (let i = 6; i >= 0; i--) {
      let m = now.getMonth() - i;
      let y = now.getFullYear();
      if (m < 0) { m += 12; y -= 1; }
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
}
