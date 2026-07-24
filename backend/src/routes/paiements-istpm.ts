import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate, requireRole } from "@/middleware/auth";
import { getDb } from "@/db";
import { etudiants } from "@/db/schema/etudiants";
import { historiquePaiements } from "@/db/schema/historique-paiements";
import { eq, desc } from "drizzle-orm";

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

    await db
      .update(etudiants)
      .set({
        resteAPayer: String(nouveauReste),
        paiement: nouveauStatut,
      })
      .where(eq(etudiants.id, input.etudiantId));

    return {
      ok: true,
      recu,
      nouveauReste,
      statut: nouveauStatut,
    };
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
        paiement: etudiants.paiement,
        resteAPayer: etudiants.resteAPayer,
      })
      .from(etudiants);

    const enAttente = etudiantsRows
      .filter((e) => e.paiement === "en_attente")
      .reduce((s, e) => s + Number(e.resteAPayer), 0);
    const impaye = etudiantsRows
      .filter((e) => e.paiement === "impaye")
      .reduce((s, e) => s + Number(e.resteAPayer), 0);
    const retard = etudiantsRows
      .filter((e) => e.paiement === "retard")
      .reduce((s, e) => s + Number(e.resteAPayer), 0);

    const totalARecouvrer = etudiantsRows.reduce(
      (s, e) => s + Number(e.resteAPayer),
      0,
    );
    const tauxRecouvrement =
      totalMontant + totalARecouvrer > 0
        ? Math.round((totalMontant / (totalMontant + totalARecouvrer)) * 100)
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
