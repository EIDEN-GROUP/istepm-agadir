import type { FastifyInstance } from "fastify";
import { getDb } from "@/db";
import { centers } from "@/db/schema/centers";
import { centerAdmins } from "@/db/schema/center-admins";
import { users } from "@/db/schema/users";
import { clients } from "@/db/schema/clients";
import { payments } from "@/db/schema/payments";
import { demoRequests } from "@/db/schema/demo-requests";
import { eq, desc, sql, and, gte, lte } from "drizzle-orm";
import { getEnv } from "@/config/env";

async function verifyApiKey(request: any, reply: any) {
  const key = request.headers["x-api-key"];
  if (!key || key !== getEnv().ADMIN_API_KEY) {
    return reply.status(401).send({ error: "Invalid API key" });
  }
}

export async function adminRoutes(app: FastifyInstance) {
  app.addHook("preHandler", verifyApiKey);

  app.get("/health", async () => ({
    status: "ok",
    timestamp: new Date().toISOString(),
  }));

  app.get("/info", async () => ({
    name: "School-CRM",
    version: "1.0.0",
    environment: getEnv().NODE_ENV,
  }));

  app.get("/stats", async () => {
    const db = getDb();
    const [centerRows, adminCount, clientCount, paymentRows, demoCount] =
      await Promise.all([
        db
          .select({
            status: centers.status,
            monthlyPrice: centers.monthlyPrice,
            studentsCount: centers.studentsCount,
            isPrimary: centers.isPrimary,
          })
          .from(centers),
        db
          .select({ count: sql<number>`count(*)` })
          .from(users)
          .where(eq(users.role, "admin")),
        db.select({ count: sql<number>`count(*)` }).from(clients),
        db.select({ amount: payments.amount }).from(payments),
        db.select({ count: sql<number>`count(*)` }).from(demoRequests),
      ]);

    const liveClients = Number(clientCount[0]?.count ?? 0);
    const declared = centerRows.reduce(
      (sum, c) => sum + (c.isPrimary ? liveClients : Number(c.studentsCount)),
      0,
    );

    return {
      totalCenters: centerRows.length,
      activeCenters: centerRows.filter((c) => c.status === "actif").length,
      suspendedCenters: centerRows.filter((c) => c.status === "suspendu")
        .length,
      totalAdmins: Number(adminCount[0]?.count ?? 0),
      totalStudents: declared,
      platformRevenue: paymentRows.reduce((s, p) => s + Number(p.amount), 0),
      mrr: centerRows
        .filter((c) => c.status === "actif")
        .reduce((s, c) => s + Number(c.monthlyPrice), 0),
      pendingDemoRequests: Number(demoCount[0]?.count ?? 0),
    };
  });

  app.get("/tenants", async () => {
    const db = getDb();
    const rows = await db
      .select()
      .from(centers)
      .leftJoin(centerAdmins, eq(centers.id, centerAdmins.centerId))
      .leftJoin(users, eq(centerAdmins.profileId, users.id))
      .orderBy(desc(centers.createdAt));

    const grouped: Record<string, any> = {};
    for (const r of rows as any[]) {
      if (!grouped[r.centers.id]) {
        grouped[r.centers.id] = { ...r.centers, centerAdmins: [] };
      }
      if (r.users) {
        grouped[r.centers.id].centerAdmins.push({
          profileId: r.center_admins?.profileId,
          profiles: { name: r.users.name, email: r.users.email },
        });
      }
    }
    return Object.values(grouped);
  });

  app.get("/users", async () => {
    const db = getDb();
    return db
      .select()
      .from(users)
      .leftJoin(centerAdmins, eq(users.id, centerAdmins.profileId))
      .leftJoin(centers, eq(centerAdmins.centerId, centers.id))
      .orderBy(desc(users.createdAt));
  });

  app.get("/demo-requests", async () => {
    const db = getDb();
    return db.select().from(demoRequests).orderBy(desc(demoRequests.createdAt));
  });

  app.get("/revenue-history", async () => {
    const db = getDb();
    const months = [
      "Jan",
      "Fév",
      "Mar",
      "Avr",
      "Mai",
      "Juin",
      "Juil",
      "Août",
      "Sept",
      "Oct",
      "Nov",
      "Déc",
    ];
    const now = new Date();
    const results: Array<{ m: string; v: number; mrr: number }> = [];

    const centerRows = await db
      .select({
        status: centers.status,
        monthlyPrice: centers.monthlyPrice,
        createdAt: centers.createdAt,
      })
      .from(centers);
    const activeCenters = centerRows.filter((c) => c.status === "actif");

    for (let i = 6; i >= 0; i--) {
      let m = now.getMonth() - i;
      let y = now.getFullYear();
      if (m < 0) {
        m += 12;
        y -= 1;
      }
      const first = new Date(y, m, 1).toISOString().split("T")[0];
      const last = new Date(y, m + 1, 0).toISOString().split("T")[0];

      const paymentRows = await db
        .select({ amount: payments.amount })
        .from(payments)
        .where(and(gte(payments.date, first), lte(payments.date, last)));

      const total = paymentRows.reduce((s, p) => s + Number(p.amount), 0);
      const monthEnd = new Date(y, m + 1, 0, 23, 59, 59);
      const mrr = activeCenters
        .filter((c) => new Date(c.createdAt) <= monthEnd)
        .reduce((s, c) => s + Number(c.monthlyPrice), 0);

      results.push({ m: months[m], v: total, mrr });
    }

    return results;
  });
}
