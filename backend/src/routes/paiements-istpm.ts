import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate, requireRole } from "@/middleware/auth";
import { getDb } from "@/db";
import { etudiants } from "@/db/schema/etudiants";
import { paiementsMensuels } from "@/db/schema/paiements-mensuels";
import { eq, and, desc, sql } from "drizzle-orm";

const paiementMensuelSchema = z.object({
  etudiantId: z.string().uuid(),
  mois: z.array(z.string().min(1)).min(1, "Au moins un mois requis"),
  montant: z.number().min(1, "Le montant doit être positif"),
  mode: z
    .enum(["Espèces", "Virement", "Carte", "Chèque"])
    .optional()
    .default("Espèces"),
  date: z.string().optional(),
  recu: z.string().optional().default(""),
  notes: z.string().optional().default(""),
});

const updateMensuelSchema = z.object({
  montantPaye: z.number().min(0).optional(),
  datePaiement: z.string().optional(),
  mode: z.enum(["Espèces", "Virement", "Carte", "Chèque"]).optional(),
  recu: z.string().optional(),
  statut: z.enum(["paye", "en_attente", "retard", "impaye"]).optional(),
  notes: z.string().optional(),
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
        id: paiementsMensuels.id,
        etudiantId: paiementsMensuels.etudiantId,
        mois: paiementsMensuels.mois,
        montantDu: paiementsMensuels.montantDu,
        montantPaye: paiementsMensuels.montantPaye,
        datePaiement: paiementsMensuels.datePaiement,
        mode: paiementsMensuels.mode,
        recu: paiementsMensuels.recu,
        statut: paiementsMensuels.statut,
        notes: paiementsMensuels.notes,
        etudiantPrenom: etudiants.prenom,
        etudiantNom: etudiants.nom,
        etudiantCne: etudiants.cne,
        etudiantFiliere: etudiants.filiere,
        etudiantNiveau: etudiants.niveau,
        etudiantFraisAnnuels: etudiants.fraisAnnuels,
      })
      .from(paiementsMensuels)
      .leftJoin(etudiants, eq(paiementsMensuels.etudiantId, etudiants.id))
      .orderBy(desc(paiementsMensuels.createdAt))
      .$dynamic();

    if (query.etudiantId) {
      rows.where(eq(paiementsMensuels.etudiantId, query.etudiantId));
    }

    return rows;
  });

  app.post("/", { preHandler: [authenticate, requireRole("directeur", "responsable")] }, async (request, reply) => {
    const input = paiementMensuelSchema.parse(request.body);
    const db = getDb();

    const [etudiant] = await db
      .select()
      .from(etudiants)
      .where(eq(etudiants.id, input.etudiantId))
      .limit(1);
    if (!etudiant) return reply.status(404).send({ error: "Étudiant introuvable" });

    const fraisMensuels = Math.round(Number(etudiant.fraisAnnuels) / 10);
    const dateStr = input.date ?? new Date().toISOString().split("T")[0];
    const recu = input.recu || genererRecu();

    const result: Array<{ mois: string; statut: string }> = [];

    for (const mois of input.mois) {
      const montantParMois = Math.round(input.montant / input.mois.length);

      const [existing] = await db
        .select()
        .from(paiementsMensuels)
        .where(
          and(
            eq(paiementsMensuels.etudiantId, input.etudiantId),
            eq(paiementsMensuels.mois, mois),
          ),
        )
        .limit(1);

      if (existing) {
        const nouveauPaye = Number(existing.montantPaye) + montantParMois;
        const nouveauStatut = nouveauPaye >= fraisMensuels ? "paye" : "en_attente";

        await db
          .update(paiementsMensuels)
          .set({
            montantPaye: String(nouveauPaye),
            datePaiement: dateStr,
            mode: input.mode,
            recu,
            statut: nouveauStatut,
            notes: input.notes,
            updatedAt: sql`now()`,
          })
          .where(eq(paiementsMensuels.id, existing.id));

        result.push({ mois, statut: nouveauStatut });
      } else {
        const nouveauStatut = montantParMois >= fraisMensuels ? "paye" : "en_attente";

        await db.insert(paiementsMensuels).values({
          etudiantId: input.etudiantId,
          mois,
          montantDu: String(fraisMensuels),
          montantPaye: String(montantParMois),
          datePaiement: dateStr,
          mode: input.mode,
          recu,
          statut: nouveauStatut,
          notes: input.notes,
        });

        result.push({ mois, statut: nouveauStatut });
      }
    }

    const tousMois = await db
      .select()
      .from(paiementsMensuels)
      .where(eq(paiementsMensuels.etudiantId, input.etudiantId));

    const totalPaye = tousMois.reduce((s, m) => s + Number(m.montantPaye), 0);
    const totalDu = tousMois.reduce((s, m) => s + Number(m.montantDu), 0);
    const reste = totalDu - totalPaye;

    return {
      ok: true,
      recu,
      result,
      reste,
    };
  });

  app.put("/:id", { preHandler: [authenticate, requireRole("directeur", "responsable")] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = updateMensuelSchema.parse(request.body);
    const db = getDb();

    const [existing] = await db
      .select()
      .from(paiementsMensuels)
      .where(eq(paiementsMensuels.id, id))
      .limit(1);
    if (!existing) return reply.status(404).send({ error: "Enregistrement introuvable" });

    const patch: Record<string, string> = {};
    if (input.montantPaye !== undefined) patch.montantPaye = String(input.montantPaye);
    if (input.datePaiement !== undefined) patch.datePaiement = input.datePaiement;
    if (input.mode !== undefined) patch.mode = input.mode;
    if (input.recu !== undefined) patch.recu = input.recu;
    if (input.statut !== undefined) patch.statut = input.statut;
    if (input.notes !== undefined) patch.notes = input.notes;
    patch.updatedAt = sql`now()` as unknown as string;

    await db
      .update(paiementsMensuels)
      .set(patch)
      .where(eq(paiementsMensuels.id, id));

    return { ok: true };
  });

  app.get("/stats", { preHandler: [authenticate] }, async () => {
    const db = getDb();

    const rows = await db.select().from(paiementsMensuels);

    const total = rows.reduce((s, p) => s + Number(p.montantPaye), 0);

    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .split("T")[0];

    const ceMois = rows.filter(
      (p) =>
        p.datePaiement &&
        p.datePaiement >= firstOfMonth &&
        p.datePaiement <= now.toISOString().split("T")[0],
    );
    const encaisseCeMois = ceMois.reduce((s, p) => s + Number(p.montantPaye), 0);

    let enAttente = 0;
    let impaye = 0;
    let retard = 0;
    for (const r of rows) {
      const reste = Number(r.montantDu) - Number(r.montantPaye);
      if (r.statut === "en_attente") enAttente += reste;
      else if (r.statut === "impaye") impaye += reste;
      else if (r.statut === "retard") retard += reste;
    }

    const totalARecouvrer = enAttente + impaye + retard;
    const totalPotentiel = total + totalARecouvrer;
    const tauxRecouvrement =
      totalPotentiel > 0
        ? Math.round((total / totalPotentiel) * 100)
        : total > 0
          ? 100
          : 0;

    return {
      total,
      count: rows.length,
      encaisseCeMois,
      enAttente,
      impaye,
      retard,
      tauxRecouvrement,
    };
  });
}
