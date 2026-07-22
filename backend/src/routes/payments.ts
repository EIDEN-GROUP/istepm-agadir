import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate } from "@/middleware/auth";
import { getDb } from "@/db";
import { payments } from "@/db/schema/payments";
import { clients } from "@/db/schema/clients";
import { eq, desc, and, gte, lte } from "drizzle-orm";

const paymentSchema = z.object({
  clientId: z.string().uuid(),
  amount: z.number().min(0),
  date: z.string().optional(),
  mode: z.enum(["especes", "virement", "carte", "cheque"]).optional().default("especes"),
  period: z.string().optional(),
  notes: z.string().optional().default(""),
});

export async function paymentRoutes(app: FastifyInstance) {
  app.get("/", { preHandler: [authenticate] }, async (request) => {
    const db = getDb();
    const query = request.query as { clientId?: string };
    let result = db
      .select()
      .from(payments)
      .leftJoin(clients, eq(payments.clientId, clients.id))
      .orderBy(desc(payments.createdAt))
      .$dynamic();

    if (query.clientId) {
      result = result.where(eq(payments.clientId, query.clientId));
    }

    const rows = await result;
    return rows.map((r) => ({ ...r.payments, client: r.clients }));
  });

  app.post("/", { preHandler: [authenticate] }, async (request) => {
    const input = paymentSchema.parse(request.body);
    const now = new Date();
    const db = getDb();

    const dateStr = input.date ?? now.toISOString().split("T")[0];
    const period = input.period ?? `${now.toLocaleString("fr-FR", { month: "long" })} ${now.getFullYear()}`;

    const [payment] = await db
      .insert(payments)
      .values({
        clientId: input.clientId,
        amount: String(input.amount),
        date: dateStr,
        mode: input.mode,
        period,
        notes: input.notes,
      })
      .returning();

    await recalcClientDebt(db, input.clientId);

    return payment;
  });

  app.put("/:id/invoice-sent", { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const db = getDb();
    const [payment] = await db
      .update(payments)
      .set({ invoiceSent: true })
      .where(eq(payments.id, id))
      .returning();
    if (!payment) return reply.status(404).send({ error: "Paiement introuvable" });
    return payment;
  });

  app.delete("/:id", { preHandler: [authenticate] }, async (request) => {
    const { id } = request.params as { id: string };
    const db = getDb();
    const [payment] = await db
      .select({ clientId: payments.clientId })
      .from(payments)
      .where(eq(payments.id, id))
      .limit(1);

    await db.delete(payments).where(eq(payments.id, id));

    if (payment) {
      await recalcClientDebt(db, payment.clientId);
    }

    return { ok: true };
  });

  app.get("/stats", { preHandler: [authenticate] }, async (request) => {
    const query = request.query as { startDate?: string; endDate?: string };
    const db = getDb();
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
    const lastOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];

    const start = query.startDate ?? firstOfMonth;
    const end = query.endDate ?? lastOfMonth;

    const rows = await db
      .select()
      .from(payments)
      .where(and(gte(payments.date, start), lte(payments.date, end)));

    const total = rows.reduce((sum, p) => sum + Number(p.amount), 0);
    return { total, count: rows.length, startDate: start, endDate: end };
  });
}

async function recalcClientDebt(db: ReturnType<typeof getDb>, clientId: string) {
  const [client] = await db
    .select({ monthlyFee: clients.monthlyFee })
    .from(clients)
    .where(eq(clients.id, clientId))
    .limit(1);
  if (!client) return;

  const paidRows = await db
    .select({ total: payments.amount })
    .from(payments)
    .where(eq(payments.clientId, clientId));

  const totalPaid = paidRows.reduce((sum, p) => sum + Number(p.total), 0);
  const monthlyFee = Number(client.monthlyFee);
  const debt = Math.max(0, monthlyFee - totalPaid);

  await db
    .update(clients)
    .set({
      debt: String(debt),
      paymentStatus: totalPaid >= monthlyFee ? "paye" : "impaye",
      overdue: totalPaid < monthlyFee && monthlyFee > 0,
    })
    .where(eq(clients.id, clientId));
}
