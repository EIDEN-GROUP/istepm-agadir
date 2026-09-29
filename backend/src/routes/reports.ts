import type { FastifyInstance } from "fastify";
import { authenticate, requireRole } from "@/middleware/auth";
import { getDb } from "@/db";
import { etudiants } from "@/db/schema/etudiants";
import { formateurs } from "@/db/schema/formateurs";
import { examens } from "@/db/schema/examens";
import { bulletins } from "@/db/schema/bulletins";
import { stages } from "@/db/schema/stages";
import { seances } from "@/db/schema/seances";
import { eq, ne, sql, desc } from "drizzle-orm";

export async function reportRoutes(app: FastifyInstance) {
  app.get("/operational", { preHandler: [authenticate, requireRole("directeur", "assistant_directeur")] }, async () => {
    const db = getDb();
    const today = new Date().toISOString().slice(0, 10);

    const [
      { count: totalEtudiants },
      { count: totalFormateurs },
      { count: examensPlanifies },
      { count: bulletinsAPublier },
      { count: stagesEnCours },
      { count: seancesAujourdhui },
      etuStats,
    ] = await Promise.all([
      db.select({ count: sql<number>`count(*)::int` }).from(etudiants).then(r => r[0]),
      db.select({ count: sql<number>`count(*)::int` }).from(formateurs).then(r => r[0]),
      db.select({ count: sql<number>`count(*)::int` }).from(examens).where(eq(examens.statut, "planifie")).then(r => r[0]),
      db.select({ count: sql<number>`count(*)::int` }).from(bulletins).where(ne(bulletins.statut, "publie")).then(r => r[0]),
      db.select({ count: sql<number>`count(*)::int` }).from(stages).where(sql`${stages.statut} IN ('en_cours','soutenance')`).then(r => r[0]),
      db.select({ count: sql<number>`count(*)::int` }).from(seances).where(eq(seances.date, today)).then(r => r[0]),
      db.select({ statut: etudiants.statut, count: sql<number>`count(*)::int` }).from(etudiants).groupBy(etudiants.statut),
    ]);

    const parStatut: Record<string, number> = {};
    for (const s of etuStats) parStatut[s.statut] = s.count;

    return {
      date: today,
      resume: {
        totalEtudiants: totalEtudiants,
        totalFormateurs: totalFormateurs,
        examensPlanifies: examensPlanifies,
        bulletinsAPublier: bulletinsAPublier,
        stagesEnCours: stagesEnCours,
        seancesAujourdhui: seancesAujourdhui,
      },
      repartitionEtudiants: parStatut,
    };
  });

  app.get("/academic", { preHandler: [authenticate, requireRole("directeur", "assistant_directeur", "responsable")] }, async () => {
    const db = getDb();

    const [examensData, bulletinsData, stagesData, seancesData] = await Promise.all([
      db.select({ statut: examens.statut, count: sql<number>`count(*)::int` }).from(examens).groupBy(examens.statut),
      db.select({ statut: bulletins.statut, count: sql<number>`count(*)::int` }).from(bulletins).groupBy(bulletins.statut),
      db.select({ statut: stages.statut, count: sql<number>`count(*)::int` }).from(stages).groupBy(stages.statut),
      db.select({ count: sql<number>`count(*)::int` }).from(seances),
    ]);

    const parExamen: Record<string, number> = {};
    for (const e of examensData) parExamen[e.statut] = e.count;
    const parBulletin: Record<string, number> = {};
    for (const b of bulletinsData) parBulletin[b.statut] = b.count;
    const parStage: Record<string, number> = {};
    for (const s of stagesData) parStage[s.statut] = s.count;

    return {
      examens: { total: examensData.reduce((s, e) => s + e.count, 0), parStatut: parExamen },
      bulletins: { total: bulletinsData.reduce((s, b) => s + b.count, 0), parStatut: parBulletin },
      stages: { total: stagesData.reduce((s, st) => s + st.count, 0), parStatut: parStage },
      seances: { total: seancesData[0]?.count ?? 0 },
    };
  });
}
