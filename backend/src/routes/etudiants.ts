import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate, requireRole } from "@/middleware/auth";
import { getDb } from "@/db";
import { etudiants } from "@/db/schema/etudiants";
import { users } from "@/db/schema/users";
import { formateurs } from "@/db/schema/formateurs";
import { notesEtudiant } from "@/db/schema/notes-etudiant";
import { historiquePaiements } from "@/db/schema/historique-paiements";
import { stages } from "@/db/schema/stages";
import { bulletins } from "@/db/schema/bulletins";
import { ownEtudiantId, teacherScope, etudiantInScope } from "@/lib/scope";
import { escCsvCell as escCsv } from "@/lib/csv";
import { eq, desc, sql, or, and, inArray } from "drizzle-orm";

const etudiantSchema = z.object({
  cne: z.string().optional().default(""),
  matricule: z.string().optional().default(""),
  prenom: z.string().min(1, "Prénom requis"),
  nom: z.string().min(1, "Nom requis"),
  filiere: z.string().min(1, "Filière requise"),
  niveau: z.string().min(1, "Niveau requis"),
  annee: z.string().optional().default(""),
  groupe: z.string().optional().default(""),
  statut: z.string().optional().default("inscrit"),
  paiement: z.string().optional().default("en_attente"),
  telephone: z.string().optional().default(""),
  email: z.string().optional().default(""),
  dateNaissance: z.string().optional().default(""),
  ville: z.string().optional().default(""),
  // Même plafond que Mon profil (auth.ts) : une photo 512px encodée en
  // data URL pèse 15–40 Ko ; l'ancienne limite (2000) rejetait toute photo.
  photoUrl: z.string().max(3_000_000, "Image trop volumineuse").optional().default(""),
  // NOTE (sécurité) : la liaison de compte (userId) ne passe jamais par ici —
  // inscription/invitation avec CNE (voir services/auth.ts, routes/invitations.ts).
  fraisMensuels: z.number().optional().default(0),
  resteAPayer: z.number().optional().default(0),
  paiementsMensuels: z.record(z.string(), z.enum(["paye", "en_attente", "retard", "impaye"])).optional(),
});

export async function etudiantRoutes(app: FastifyInstance) {
  app.get("/export/csv", { preHandler: [authenticate, requireRole("directeur", "responsable")] }, async (request, reply) => {
    request.log.info({ by: request.user.id }, "Export CSV étudiants");
    const db = getDb();
    const query = request.query as {
      ids?: string;
      filiere?: string;
      niveau?: string;
      statut?: string;
      search?: string;
    };

    let result = db
      .select({
        cne: etudiants.cne,
        matricule: etudiants.matricule,
        prenom: etudiants.prenom,
        nom: etudiants.nom,
        filiere: etudiants.filiere,
        niveau: etudiants.niveau,
        annee: etudiants.annee,
        groupe: etudiants.groupe,
        statut: etudiants.statut,
        paiement: etudiants.paiement,
        telephone: etudiants.telephone,
        email: etudiants.email,
        dateNaissance: etudiants.dateNaissance,
        ville: etudiants.ville,
        fraisAnnuels: etudiants.fraisAnnuels,
      })
      .from(etudiants)
      .orderBy(etudiants.nom, etudiants.prenom)
      .$dynamic();

    if (query.ids) {
      const ids = query.ids.split(",").map((s) => s.trim()).filter(Boolean);
      if (ids.length > 0) {
        result = result.where(inArray(etudiants.id, ids));
      }
    }

    if (query.filiere) {
      result = result.where(eq(etudiants.filiere, query.filiere));
    }
    if (query.niveau) {
      result = result.where(eq(etudiants.niveau, query.niveau));
    }
    if (query.statut) {
      result = result.where(eq(etudiants.statut, query.statut));
    }
    if (query.search) {
      const q = `%${query.search}%`;
      result = result.where(
        or(
          sql`${etudiants.prenom} ILIKE ${q}`,
          sql`${etudiants.nom} ILIKE ${q}`,
          sql`${etudiants.cne} ILIKE ${q}`,
          sql`${etudiants.matricule} ILIKE ${q}`,
        ),
      );
    }

    const rows = await result;

    const headers = [
      "cne", "matricule", "prenom", "nom", "filiere", "niveau",
      "annee", "groupe", "statut", "paiement",
      "telephone", "email", "dateNaissance", "ville", "fraisMensuels",
    ];

    const headerLine = headers.join(",");
    const dataLines = rows.map((r) =>
      headers
        .map((h) => {
          if (h === "fraisMensuels") return escCsv(String(Math.round(Number(r.fraisAnnuels) / 10)));
          return escCsv(String((r as Record<string, unknown>)[h] ?? ""));
        })
        .join(","),
    );

    const csv = "\uFEFF" + headerLine + "\n" + dataLines.join("\n");

    reply.header("Content-Type", "text/csv; charset=utf-8");
    reply.header("Content-Disposition", `attachment; filename="etudiants-${new Date().toISOString().slice(0, 10)}.csv"`);
    return reply.send(csv);
  });

  app.get("/", { preHandler: [authenticate] }, async (request, reply) => {
    // Les comptes étudiants passent par /api/student/me (fiche unique).
    if (request.user.role === "etudiant") {
      return reply.status(404).send({ error: "Introuvable" });
    }
    const db = getDb();
    const query = request.query as {
      search?: string;
      filiere?: string;
      niveau?: string;
      statut?: string;
      archived?: string;
    };
    let result = db
      .select()
      .from(etudiants)
      .orderBy(desc(etudiants.createdAt))
      .$dynamic();

    if (request.user.role === "enseignant") {
      const [formateur] = await db
        .select({ groupes: formateurs.groupes, departement: formateurs.departement })
        .from(formateurs)
        .where(eq(formateurs.userId, request.user.id))
        .limit(1);
      if (formateur) {
        if (formateur.groupes.length > 0) {
          const g = formateur.groupes;
          result = result.where(sql`${etudiants.groupe} = ANY(${g}::text[])`);
        }
        if (formateur.departement) {
          result = result.where(eq(etudiants.filiere, formateur.departement));
        }
      }
    }

    if (query.archived === "true") {
      result = result.where(eq(etudiants.archived, true));
    } else if (query.archived !== "all") {
      result = result.where(eq(etudiants.archived, false));
    }

    if (query.search) {
      const q = `%${query.search}%`;
      result = result.where(
        or(
          sql`${etudiants.prenom} ILIKE ${q}`,
          sql`${etudiants.nom} ILIKE ${q}`,
          sql`${etudiants.cne} ILIKE ${q}`,
          sql`${etudiants.matricule} ILIKE ${q}`,
        ),
      );
    }

    if (query.filiere) {
      result = result.where(eq(etudiants.filiere, query.filiere));
    }

    if (query.niveau) {
      result = result.where(eq(etudiants.niveau, query.niveau));
    }

    if (query.statut) {
      result = result.where(eq(etudiants.statut, query.statut));
    }

    const rows = await result;
    const ids = rows.map((e) => e.id);
    // Enrichissement groupé : 3 requêtes au total au lieu de 3 par étudiant
    // (le N+1 prenait ~11 s pour 800+ fiches).
    const [allNotes, allPaiements, allStages]: [
      (typeof notesEtudiant.$inferSelect)[],
      (typeof historiquePaiements.$inferSelect)[],
      (typeof stages.$inferSelect)[],
    ] = await Promise.all([
      ids.length
        ? db.select().from(notesEtudiant).where(inArray(notesEtudiant.etudiantId, ids))
        : [],
      ids.length
        ? db
            .select()
            .from(historiquePaiements)
            .where(inArray(historiquePaiements.etudiantId, ids))
            .orderBy(desc(historiquePaiements.date))
        : [],
      ids.length
        ? db
            .select()
            .from(stages)
            .where(
              and(
                inArray(stages.etudiantId, ids),
                sql`${stages.statut} IN ('en_cours', 'convention_signee', 'soutenance')`,
              ),
            )
        : [],
    ]);
    const notesByEtudiant = new Map<string, typeof allNotes>();
    for (const n of allNotes) {
      const list = notesByEtudiant.get(n.etudiantId);
      if (list) list.push(n);
      else notesByEtudiant.set(n.etudiantId, [n]);
    }
    const paiementsByEtudiant = new Map<string, typeof allPaiements>();
    for (const p of allPaiements) {
      const list = paiementsByEtudiant.get(p.etudiantId);
      if (list) list.push(p);
      else paiementsByEtudiant.set(p.etudiantId, [p]);
    }
    const stageByEtudiant = new Map<string, (typeof allStages)[number]>();
    for (const s of allStages) {
      if (!stageByEtudiant.has(s.etudiantId)) stageByEtudiant.set(s.etudiantId, s);
    }
    const enriched = rows.map((e) => {
      const notes = notesByEtudiant.get(e.id) ?? [];
      const paiements = paiementsByEtudiant.get(e.id) ?? [];
      const stageEnCours = stageByEtudiant.get(e.id) ?? null;
      {
        return {
          id: e.id,
          cne: e.cne,
          matricule: e.matricule,
          prenom: e.prenom,
          nom: e.nom,
          filiere: e.filiere,
          niveau: e.niveau,
          annee: e.annee,
          groupe: e.groupe,
          statut: e.statut,
          paiement: e.paiement,
          moyenne: Number(e.moyenne),
          telephone: e.telephone,
          email: e.email,
          dateNaissance: e.dateNaissance,
          ville: e.ville,
          photoUrl: (e as { photoUrl?: string }).photoUrl ?? "",
          userId: (e as { userId?: string | null }).userId ?? null,
          fraisAnnuels: Number(e.fraisAnnuels),
          fraisMensuels: Math.round(Number(e.fraisAnnuels) / 10),
          resteAPayer: Number(e.resteAPayer),
          archived: e.archived,
          paiementsMensuels: e.paiementsMensuels ?? {},
          notes: notes.map((n) => ({
            id: n.id,
            module: n.module,
            note: Number(n.note),
            coef: Number(n.coef),
            credits: Number(n.credits),
            examen: n.examen || undefined,
          })),
          historique: paiements.map((p) => ({
            id: p.id,
            date: p.date,
            montant: Number(p.montant),
            mode: p.mode,
            periode: p.periode,
            recu: p.recu,
            statut: p.statut,
            mois: p.mois || undefined,
          })),
          stageEnCours: stageEnCours
            ? `${stageEnCours.structure}   ${stageEnCours.service}`
            : undefined,
        };
      }
    });
    return enriched;
  });

  app.get("/:id", { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const db = getDb();
    const [etudiant] = await db
      .select()
      .from(etudiants)
      .where(eq(etudiants.id, id))
      .limit(1);
    if (!etudiant) return reply.status(404).send({ error: "Étudiant introuvable" });

    // Autorisation objet (404 volontaire pour ne pas révéler l'existence).
    if (request.user.role === "etudiant") {
      const own = await ownEtudiantId(request.user.id);
      if (own !== etudiant.id) return reply.status(404).send({ error: "Étudiant introuvable" });
    } else if (request.user.role === "enseignant") {
      const scope = await teacherScope(request.user.id);
      if (!scope || !etudiantInScope(etudiant, scope)) {
        return reply.status(404).send({ error: "Étudiant introuvable" });
      }
    }

    const notes = await db
      .select()
      .from(notesEtudiant)
      .where(eq(notesEtudiant.etudiantId, id));

    const paiements = await db
      .select()
      .from(historiquePaiements)
      .where(eq(historiquePaiements.etudiantId, id))
      .orderBy(desc(historiquePaiements.date));

    const [stageEnCours] = await db
      .select()
      .from(stages)
      .where(
        and(
          eq(stages.etudiantId, id),
          sql`${stages.statut} IN ('en_cours', 'convention_signee', 'soutenance')`,
        ),
      )
      .limit(1);

    return {
      ...etudiant,
      fraisAnnuels: Number(etudiant.fraisAnnuels),
      fraisMensuels: Math.round(Number(etudiant.fraisAnnuels) / 10),
      resteAPayer: Number(etudiant.resteAPayer),
      paiementsMensuels: etudiant.paiementsMensuels ?? {},
      notes,
      historique: paiements,
      stageEnCours: stageEnCours ?? null,
    };
  });

  app.post("/", { preHandler: [authenticate, requireRole("directeur", "responsable")], bodyLimit: 2_000_000 }, async (request, reply) => {
    const input = etudiantSchema.parse(request.body);
    const db = getDb();

    // Anti-doublon : un même CNE (ou, à défaut, un même e-mail) ne peut pas
    // être ré-inscrit tant que la fiche active existe. Bloque les double-clics
    // sur « Inscrire » et les créations en double depuis deux postes.
    const cne = input.cne.trim();
    const email = input.email.trim().toLowerCase();
    if (cne || email) {
      const clauses = [];
      if (cne) clauses.push(sql`lower(${etudiants.cne}) = ${cne.toLowerCase()}`);
      if (email) clauses.push(sql`lower(${etudiants.email}) = ${email}`);
      const [dup] = await db
        .select({
          cne: etudiants.cne,
          email: etudiants.email,
          prenom: etudiants.prenom,
          nom: etudiants.nom,
        })
        .from(etudiants)
        .where(and(eq(etudiants.archived, false), or(...clauses)))
        .limit(1);
      if (dup) {
        const parCne = cne && dup.cne.toLowerCase() === cne.toLowerCase();
        return reply.status(409).send({
          error: `Un étudiant avec ${
            parCne ? `le CNE « ${cne} »` : `l'e-mail « ${input.email.trim()} »`
          } est déjà inscrit (${dup.prenom} ${dup.nom}).`,
        });
      }
    }

    try {
      const fraisAnnuels = input.fraisMensuels * 10;
      const insertValues: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(input)) {
        if (val !== undefined && key !== "fraisMensuels" && key !== "fraisAnnuels") {
          if (key === "moyenne") {
            insertValues[key] = String(val);
          } else {
            insertValues[key] = val;
          }
        }
      }
      insertValues.fraisAnnuels = String(fraisAnnuels);
      insertValues.resteAPayer = String(fraisAnnuels);
      const [etudiant] = await db
        .insert(etudiants)
        .values(insertValues as typeof etudiants.$inferInsert)
        .returning();
      return etudiant;
    } catch (err) {
      request.log.error(err, "Échec création étudiant");
      if (err instanceof Error && "code" in err && (err as { code?: string }).code === "23505") {
        return reply.status(409).send({ error: "Un étudiant avec ce CNE existe déjà" });
      }
      return reply.status(500).send({ error: "Échec création étudiant" });
    }
  });

  app.put("/:id", { preHandler: [authenticate, requireRole("directeur", "responsable")], bodyLimit: 2_000_000 }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = etudiantSchema.partial().parse(request.body);
    const db = getDb();
    const values: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(input)) {
      if (val !== undefined) {
        if (key === "fraisMensuels") {
          values.fraisAnnuels = String(Number(val) * 10);
        } else if (key === "fraisAnnuels") {
          values.fraisAnnuels = String(val);
        } else if (key === "resteAPayer" || key === "moyenne") {
          values[key] = String(val);
        } else {
          values[key] = val;
        }
      }
    }
    const [etudiant] = await db
      .update(etudiants)
      .set(values)
      .where(eq(etudiants.id, id))
      .returning();
    if (!etudiant) return reply.status(404).send({ error: "Étudiant introuvable" });
    // La photo d'identité est gérée ici (affaires estudiantines) : on la
    // recopie sur le compte lié pour qu'elle s'affiche dans l'espace étudiant
    // (avatar du rail, page « Mon profil »).
    if (values.photoUrl !== undefined && etudiant.userId) {
      await db
        .update(users)
        .set({ photoUrl: String(values.photoUrl), updatedAt: new Date() })
        .where(eq(users.id, etudiant.userId));
    }
    return etudiant;
  });

  app.delete("/:id", { preHandler: [authenticate, requireRole("directeur", "responsable")] }, async (request) => {
    const { id } = request.params as { id: string };
    const db = getDb();
    await db.update(etudiants).set({ archived: true }).where(eq(etudiants.id, id));
    return { ok: true };
  });

  app.post("/:id/restore", { preHandler: [authenticate, requireRole("directeur", "responsable")] }, async (request) => {
    const { id } = request.params as { id: string };
    const db = getDb();
    await db.update(etudiants).set({ archived: false }).where(eq(etudiants.id, id));
    return { ok: true };
  });

  /** Reconstitue un historique des semestres passés.
   *
   * Le modèle de données ne conserve pas les relevés antérieurs : cet
   * aperçu est dérivé du niveau courant et des notes existantes.
   * Chaque semestre montre les modules notés avec leur note moyenne.
   */
  app.get(
    "/:id/semestres",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const db = getDb();

      const [etudiant] = await db
        .select()
        .from(etudiants)
        .where(eq(etudiants.id, id))
        .limit(1);
      if (!etudiant) return reply.status(404).send({ error: "Étudiant introuvable" });

      if (request.user.role === "etudiant") {
        const own = await ownEtudiantId(request.user.id);
        if (own !== etudiant.id) return reply.status(404).send({ error: "Étudiant introuvable" });
      } else if (request.user.role === "enseignant") {
        const scope = await teacherScope(request.user.id);
        if (!scope || !etudiantInScope(etudiant, scope)) {
          return reply.status(404).send({ error: "Étudiant introuvable" });
        }
      }

      const NIVEAUX = [
        "S1", "S2", "S3", "S4", "S5", "S6",
      ] as const;
      const idx = NIVEAUX.indexOf(etudiant.niveau as typeof NIVEAUX[number]);
      if (idx <= 0) return [];

      const notes = await db
        .select()
        .from(notesEtudiant)
        .where(eq(notesEtudiant.etudiantId, id));

      const semestres: {
        semestre: string;
        modules: { module: string; note: number }[];
        moyenne: number;
        resultat: string;
      }[] = [];

      for (let i = 0; i < idx; i += 1) {
        const semestre = NIVEAUX[i];
        const semestreNotes = notes.filter(
          (n) => n.module.startsWith(semestre) || i < idx - 1,
        );

        // Relevés réels uniquement : un semestre sans note enregistrée
        // n'apparaît pas (jamais de notes fabriquées).
        const seen = new Set<string>();
        const modules: { module: string; note: number }[] = [];
        for (const n of semestreNotes) {
          if (!seen.has(n.module)) {
            seen.add(n.module);
            modules.push({ module: n.module, note: Number(n.note) });
          }
        }
        if (modules.length === 0) continue;

        const moyenne =
          Math.round(
            (modules.reduce((s, m) => s + m.note, 0) / modules.length) * 100,
          ) / 100;
        const resultat =
          moyenne >= 12 ? "Admis" : moyenne >= 10 ? "Rattrapage" : "Ajourné";
        semestres.push({ semestre, modules, moyenne, resultat });
      }

      return semestres;
    },
  );
}
