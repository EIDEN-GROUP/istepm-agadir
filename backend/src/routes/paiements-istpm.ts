import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate, requireRole } from "@/middleware/auth";
import { getDb } from "@/db";
import { etudiants } from "@/db/schema/etudiants";
import { historiquePaiements } from "@/db/schema/historique-paiements";
import { eq, desc, sql } from "drizzle-orm";

const paiementSchema = z.object({
  etudiantId: z.string().uuid(),
  montant: z.number().min(1, "Le montant doit être positif"),
  mode: z
    .enum(["Especes", "Virement", "Carte", "Cheque"])
    .optional()
    .default("Especes"),
  periode: z.string().optional().default(""),
  mois: z.string().optional().default(""),
  date: z.string().optional(),
});

const STATUTS_PAIEMENT = ["paye", "en_attente", "retard", "impaye"] as const;

const moisPaiementSchema = z.object({
  statut: z.enum(STATUTS_PAIEMENT),
});

let recuCounter = Date.now();

function genererRecu(): string {
  recuCounter++;
  return `R-${recuCounter.toString(36).toUpperCase()}`;
}

export async function paiementIstpmRoutes(app: FastifyInstance) {
  app.get("/", { preHandler: [authenticate] }, async (request) => {
    const db = getDb();
    const query = request.query as { etudiantId?: string };

    const rows = db
      .select({
        id: historiquePaiements.id,
        etudiantId: historiquePaiements.etudiantId,
        date: historiquePaiements.date,
        montant: historiquePaiements.montant,
        mode: historiquePaiements.mode,
        periode: historiquePaiements.periode,
        mois: historiquePaiements.mois,
        recu: historiquePaiements.recu,
        statut: historiquePaiements.statut,
        etudiantPrenom: etudiants.prenom,
        etudiantNom: etudiants.nom,
        etudiantCne: etudiants.cne,
        etudiantFiliere: etudiants.filiere,
        etudiantNiveau: etudiants.niveau,
      })
      .from(historiquePaiements)
      .leftJoin(etudiants, eq(historiquePaiements.etudiantId, etudiants.id))
      .orderBy(desc(historiquePaiements.date))
      .$dynamic();

    if (query.etudiantId) {
      rows.where(eq(historiquePaiements.etudiantId, query.etudiantId));
    }

    return rows;
  });

  app.post("/", { preHandler: [authenticate, requireRole("directeur", "responsable")] }, async (request, reply) => {
    const input = paiementSchema.parse(request.body);
    const db = getDb();

    const [etudiant] = await db
      .select()
      .from(etudiants)
      .where(eq(etudiants.id, input.etudiantId))
      .limit(1);
    if (!etudiant) return reply.status(404).send({ error: "Étudiant introuvable" });

    const reste = Number(etudiant.resteAPayer);
    if (input.montant > reste) {
      return reply.status(400).send({
        error: "Le montant ne peut pas dépasser le solde restant",
        solde: reste,
      });
    }

    const dateStr = input.date ?? new Date().toISOString().split("T")[0];
    const recu = genererRecu();

    const nouveauReste = reste - input.montant;
    const nouveauStatut = nouveauReste <= 0 ? "paye" : "en_attente";

    await db.insert(historiquePaiements).values({
      etudiantId: input.etudiantId,
      date: dateStr,
      montant: String(input.montant),
      mode: input.mode,
      periode: input.periode,
      mois: input.mois,
      recu,
      statut: "paye",
    });

    const paiementsMensuels = (etudiant.paiementsMensuels ?? {}) as Record<string, string>;
    if (input.mois) {
      paiementsMensuels[input.mois] = "paye";
    }

    await db
      .update(etudiants)
      .set({
        resteAPayer: String(nouveauReste),
        paiement: nouveauStatut,
        paiementsMensuels: paiementsMensuels,
      })
      .where(eq(etudiants.id, input.etudiantId));

    return {
      ok: true,
      recu,
      nouveauReste,
      statut: nouveauStatut,
    };
  });

  app.put("/:etudiantId/mois/:mois", { preHandler: [authenticate, requireRole("directeur", "responsable")] }, async (request, reply) => {
    const { etudiantId, mois } = request.params as { etudiantId: string; mois: string };
    const { statut } = moisPaiementSchema.parse(request.body);
    const db = getDb();

    const [etudiant] = await db
      .select()
      .from(etudiants)
      .where(eq(etudiants.id, etudiantId))
      .limit(1);
    if (!etudiant) return reply.status(404).send({ error: "Étudiant introuvable" });

    const paiementsMensuels = (etudiant.paiementsMensuels ?? {}) as Record<string, string>;
    paiementsMensuels[mois] = statut;

    await db
      .update(etudiants)
      .set({ paiementsMensuels })
      .where(eq(etudiants.id, etudiantId));

    return { ok: true, mois, statut };
  });

  app.get("/stats", { preHandler: [authenticate] }, async () => {
    const db = getDb();
    const rows = await db.select().from(historiquePaiements);

    const totalMontant = rows.reduce((s, p) => s + Number(p.montant), 0);

    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .split("T")[0];

    const ceMois = rows.filter(
      (p) => p.date >= firstOfMonth && p.date <= now.toISOString().split("T")[0],
    );
    const encaisseCeMois = ceMois.reduce((s, p) => s + Number(p.montant), 0);

    const etudiantsRows = await db
      .select({
        fraisAnnuels: etudiants.fraisAnnuels,
        paiementsMensuels: etudiants.paiementsMensuels,
      })
      .from(etudiants);

    const fm = (e: { fraisAnnuels: string }) =>
      Math.round(Number(e.fraisAnnuels) / 10);

    let enAttente = 0;
    let impaye = 0;
    let retard = 0;
    for (const e of etudiantsRows) {
      const pm = (e.paiementsMensuels ?? {}) as Record<string, string>;
      for (const st of Object.values(pm)) {
        if (st === "en_attente") enAttente += fm(e);
        else if (st === "impaye") impaye += fm(e);
        else if (st === "retard") retard += fm(e);
      }
    }

    const totalARecouvrer = enAttente + impaye + retard;
    const totalPotentiel = totalMontant + totalARecouvrer;
    const tauxRecouvrement =
      totalPotentiel > 0
        ? Math.round((totalMontant / totalPotentiel) * 100)
        : totalMontant > 0
        ? 100
        : 0;

    return {
      total: totalMontant,
      count: rows.length,
      encaisseCeMois,
      enAttente,
      impaye,
      retard,
      tauxRecouvrement,
    };
  });
}
