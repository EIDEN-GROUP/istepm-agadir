import type { FastifyInstance } from "fastify";
import { authenticate, requireRole } from "@/middleware/auth";
import { getDb } from "@/db";
import { etudiants } from "@/db/schema/etudiants";
import { formateurs } from "@/db/schema/formateurs";
import { examens } from "@/db/schema/examens";
import { bulletins } from "@/db/schema/bulletins";
import { stages } from "@/db/schema/stages";
import { seances } from "@/db/schema/seances";
import { historiquePaiements } from "@/db/schema/historique-paiements";
import { eq, ne, sql, desc, and, gte, lte } from "drizzle-orm";

export async function reportRoutes(app: FastifyInstance) {
  app.get("/operational", { preHandler: [authenticate, requireRole("directeur", "superadmin")] }, async () => {
    const db = getDb();
    const today = new Date().toISOString().slice(0, 10);
    const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);

    const [
      { count: totalEtudiants },
      { count: totalFormateurs },
      { count: examensPlanifies },
      { count: bulletinsAPublier },
      { count: stagesEnCours },
      { count: seancesAujourdhui },
      paiementsDuMois,
      etuStats,
    ] = await Promise.all([
      db.select({ count: sql<number>`count(*)::int` }).from(etudiants).then(r => r[0]),
      db.select({ count: sql<number>`count(*)::int` }).from(formateurs).then(r => r[0]),
      db.select({ count: sql<number>`count(*)::int` }).from(examens).where(eq(examens.statut, "planifie")).then(r => r[0]),
      db.select({ count: sql<number>`count(*)::int` }).from(bulletins).where(ne(bulletins.statut, "publie")).then(r => r[0]),
      db.select({ count: sql<number>`count(*)::int` }).from(stages).where(sql`${stages.statut} IN ('en_cours','soutenance')`).then(r => r[0]),
      db.select({ count: sql<number>`count(*)::int` }).from(seances).where(eq(seances.date, today)).then(r => r[0]),
      db.select({ montant: historiquePaiements.montant }).from(historiquePaiements).where(gte(historiquePaiements.date, firstOfMonth)).then(r => r),
      db.select({ statut: etudiants.statut, count: sql<number>`count(*)::int` }).from(etudiants).groupBy(etudiants.statut),
    ]);

    const paiementsMois = paiementsDuMois.reduce((s, p) => s + Number(p.montant), 0);
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
        encaisseCeMois: paiementsMois,
      },
      repartitionEtudiants: parStatut,
    };
  });

  app.get("/financial", { preHandler: [authenticate, requireRole("directeur", "superadmin")] }, async () => {
    const db = getDb();
    const allPaiements = await db.select().from(historiquePaiements).orderBy(desc(historiquePaiements.date));
    const allEtudiants = await db.select({ fraisAnnuels: etudiants.fraisAnnuels, resteAPayer: etudiants.resteAPayer, statut: etudiants.statut, paiement: etudiants.paiement }).from(etudiants);

    const totalEncaisse = allPaiements.reduce((s, p) => s + Number(p.montant), 0);
    const totalDu = allEtudiants.reduce((s, e) => s + Number(e.fraisAnnuels), 0);
    const totalReste = allEtudiants.reduce((s, e) => s + Number(e.resteAPayer), 0);
    const tauxRecouvrement = totalDu > 0 ? Math.round((totalEncaisse / totalDu) * 100) : 0;

    const paiementsParMois: Record<string, number> = {};
    for (const p of allPaiements) {
      const mois = p.date.slice(0, 7);
      paiementsParMois[mois] = (paiementsParMois[mois] || 0) + Number(p.montant);
    }

    return {
      totalEncaisse,
      totalDu,
      totalReste,
      tauxRecouvrement,
      paiementsParMois,
      etudiants: {
        total: allEtudiants.length,
        aJour: allEtudiants.filter((e) => e.paiement === "paye").length,
        enRetard: allEtudiants.filter((e) => e.paiement === "retard").length,
        impaye: allEtudiants.filter((e) => e.paiement === "impaye").length,
      },
    };
  });

  app.get("/academic", { preHandler: [authenticate, requireRole("directeur", "superadmin", "responsable")] }, async () => {
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
