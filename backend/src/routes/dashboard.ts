import type { FastifyInstance } from "fastify";
import { authenticate } from "@/middleware/auth";
import { getDb } from "@/db";
import { clients } from "@/db/schema/clients";
import { payments } from "@/db/schema/payments";
import { etudiants } from "@/db/schema/etudiants";
import { formateurs } from "@/db/schema/formateurs";
import { examens } from "@/db/schema/examens";
import { bulletins } from "@/db/schema/bulletins";
import { stages } from "@/db/schema/stages";
import { and, gte, lte, eq, sql, ne, desc } from "drizzle-orm";

export async function dashboardRoutes(app: FastifyInstance) {
  app.get("/stats", { preHandler: [authenticate] }, async () => {
    const db = getDb();
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .split("T")[0];
    const lastOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      .toISOString()
      .split("T")[0];

    const [totalClients] = await db
      .select({ count: sql<number>`count(*)` })
      .from(clients);

    const paidRows = await db
      .select({ amount: payments.amount })
      .from(payments)
      .where(
        and(gte(payments.date, firstOfMonth), lte(payments.date, lastOfMonth)),
      );

    const debtRows = await db.select({ debt: clients.debt }).from(clients);

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
    const now = new Date();
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

  app.get("/istpm-stats", { preHandler: [authenticate] }, async () => {
    const db = getDb();

    const [totalInscrits] = await db
      .select({ count: sql<number>`count(*)` })
      .from(etudiants);

    const [formateursActifs] = await db
      .select({ count: sql<number>`count(*)` })
      .from(formateurs)
      .where(ne(formateurs.statut, "en_conge"));

    const [totalReussite] = await db
      .select({ count: sql<number>`count(*)` })
      .from(etudiants)
      .where(sql`${etudiants.moyenne} >= 10`);

    const totalEtudiantsVal = Number(totalInscrits.count) || 1;
    const tauxReussite = Math.round(
      (Number(totalReussite.count) / totalEtudiantsVal) * 100,
    );

    return {
      totalInscrits: Number(totalInscrits.count),
      deltaSemestre: 6,
      formateursActifs: Number(formateursActifs.count),
      tauxReussite,
    };
  });

  app.get("/istpm-repartition-filiere", { preHandler: [authenticate] }, async () => {
    const db = getDb();
    const rows = await db
      .select({
        filiere: etudiants.filiere,
        count: sql<number>`count(*)::int`,
      })
      .from(etudiants)
      .where(eq(etudiants.archived, false))
      .groupBy(etudiants.filiere)
      .orderBy(etudiants.filiere);
    return rows;
  });

  app.get("/istpm-repartition-niveau", { preHandler: [authenticate] }, async () => {
    const db = getDb();
    const rows = await db
      .select({
        niveau: etudiants.niveau,
        count: sql<number>`count(*)::int`,
      })
      .from(etudiants)
      .where(eq(etudiants.archived, false))
      .groupBy(etudiants.niveau)
      .orderBy(etudiants.niveau);
    return rows;
  });

  app.get("/istpm-reussite-filiere", { preHandler: [authenticate] }, async () => {
    const db = getDb();
    const rows = await db
      .select({
        filiere: etudiants.filiere,
        total: sql<number>`count(*)::int`,
        reussite: sql<number>`count(*) FILTER (WHERE moyenne::numeric >= 10)::int`,
      })
      .from(etudiants)
      .where(eq(etudiants.archived, false))
      .groupBy(etudiants.filiere)
      .orderBy(etudiants.filiere);

    return rows.map((r) => ({
      filiere: r.filiere,
      taux: r.total > 0 ? Math.round((r.reussite / r.total) * 100) : 0,
    }));
  });

  app.get("/istpm-a-traiter", { preHandler: [authenticate] }, async () => {
    const db = getDb();

    const [examensAVenir] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(examens)
      .where(eq(examens.statut, "planifie"));

    const [bulletinsAPublier] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(bulletins)
      .where(ne(bulletins.statut, "publie"));

    const [stagesAValider] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(stages)
      .where(
        sql`${stages.statut} IN ('soutenance', 'recherche')`,
      );

    return {
      examensAVenir: examensAVenir.count,
      bulletinsAPublier: bulletinsAPublier.count,
      stagesAValider: stagesAValider.count,
    };
  });

  app.get("/istpm-etudiants-a-risque", { preHandler: [authenticate] }, async () => {
    const db = getDb();
    const rows = await db
      .select()
      .from(etudiants)
      .where(
        sql`${etudiants.moyenne}::numeric < 10 OR ${etudiants.statut} = 'abandon'`,
      )
      .orderBy(etudiants.moyenne);
    return rows;
  });

  app.get("/activities", { preHandler: [authenticate] }, async () => {
    const db = getDb();
    const [recentExamens, recentBulletins, recentStages, recentEtudiants] =
      await Promise.all([
        db
          .select({
            id: examens.id,
            type: sql<string>`'examen'`,
            message: sql<string>`'Examen ' || ${examens.module} || ' ' || ${examens.statut}`,
            date: examens.date,
            createdAt: examens.createdAt,
          })
          .from(examens)
          .orderBy(desc(examens.createdAt))
          .limit(10),
        db
          .select({
            id: bulletins.id,
            type: sql<string>`'bulletin'`,
            message: sql<string>`'Bulletin ' || ${bulletins.prenom} || ' ' || ${bulletins.nom} || ' ' || ${bulletins.statut}`,
            date: sql<string>`''`,
            createdAt: bulletins.createdAt,
          })
          .from(bulletins)
          .orderBy(desc(bulletins.createdAt))
          .limit(10),
        db
          .select({
            id: stages.id,
            type: sql<string>`'stage'`,
            message: sql<string>`'Stage ' || ${stages.prenom} || ' ' || ${stages.nom} || ' ' || ${stages.statut}`,
            date: sql<string>`''`,
            createdAt: stages.createdAt,
          })
          .from(stages)
          .orderBy(desc(stages.createdAt))
          .limit(10),
        db
          .select({
            id: etudiants.id,
            type: sql<string>`'etudiant'`,
            message: sql<string>`'Étudiant ' || ${etudiants.prenom} || ' ' || ${etudiants.nom} || ' inscrit en ' || ${etudiants.filiere}`,
            date: sql<string>`''`,
            createdAt: etudiants.createdAt,
          })
          .from(etudiants)
          .orderBy(desc(etudiants.createdAt))
          .limit(10),
      ]);

    const all = [
      ...recentExamens,
      ...recentBulletins,
      ...recentStages,
      ...recentEtudiants,
    ].sort((a, b) => {
      const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return db - da;
    });

    return all.slice(0, 30);
  });
}
