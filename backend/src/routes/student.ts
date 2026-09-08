import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate, requireRole } from "@/middleware/auth";
import { getDb } from "@/db";
import { etudiants } from "@/db/schema/etudiants";
import { users } from "@/db/schema/users";
import { formateurs } from "@/db/schema/formateurs";
import { stages } from "@/db/schema/stages";
import { seances } from "@/db/schema/seances";
import { enrichSeance } from "./seances";
import { examens } from "@/db/schema/examens";
import { notesEtudiant } from "@/db/schema/notes-etudiant";
import { bulletins } from "@/db/schema/bulletins";
import { studentRequests } from "@/db/schema/student-requests";
import { holidays } from "@/db/schema/holidays";
import { schoolVacations } from "@/db/schema/vacations";
import { calendarExceptions } from "@/db/schema/calendar-exceptions";
import { attendance } from "@/db/schema/attendance";
import { historiquePaiements } from "@/db/schema/historique-paiements";
import { eq, and, ne, desc, gte, lte, sql, count } from "drizzle-orm";

const createRequestSchema = z.object({
  type: z.enum(["libre", "predefini"]).optional().default("libre"),
  titre: z.string().trim().min(3, "Titre trop court").max(120, "Titre trop long"),
  description: z.string().trim().max(2000, "Description trop longue").optional().default(""),
});

// Une photo est soit une URL courte, soit un data:image/... (base64) : le
// front réduit l'image avant l'envoi, mais un data URL reste ~50–150 Ko.
const photoSchema = z.object({
  photoUrl: z.string().max(1_500_000).optional().default(""),
});

async function resolveEtudiant(db: ReturnType<typeof getDb>, userId: string) {
  const [row] = await db.select().from(etudiants).where(eq(etudiants.userId, userId)).limit(1);
  return row ?? null;
}

export async function studentRoutes(app: FastifyInstance) {
  // ── Profil complet : fiche + enseignants + stage + notes + paiements ──
  app.get("/me", { preHandler: [authenticate] }, async (request, reply) => {
    const db = getDb();
    const userId = request.user.id;
    let etudiant = await resolveEtudiant(db, userId);

    // Le staff peut prévisualiser via ?etudiantId= (support / debug).
    const q = request.query as { etudiantId?: string };
    if (!etudiant && (request.user.role === "directeur" || request.user.role === "responsable") && q.etudiantId) {
      const [row] = await db.select().from(etudiants).where(eq(etudiants.id, q.etudiantId)).limit(1);
      etudiant = row ?? null;
    }
    if (!etudiant) return reply.status(404).send({ error: "Fiche étudiant introuvable pour ce compte" });

    const [teachers, stageRows, notes, bulletinRows, paiements, attRows] = await Promise.all([
      db.select().from(formateurs).where(eq(formateurs.archived, false)),
      db.select().from(stages).where(eq(stages.etudiantId, etudiant.id)).orderBy(desc(stages.createdAt)),
      db.select().from(notesEtudiant).where(eq(notesEtudiant.etudiantId, etudiant.id)),
      db.select().from(bulletins).where(eq(bulletins.etudiantId, etudiant.id)).orderBy(desc(bulletins.createdAt)),
      db.select().from(historiquePaiements).where(eq(historiquePaiements.etudiantId, etudiant.id)).orderBy(desc(historiquePaiements.date)),
      db.select().from(attendance).where(eq(attendance.etudiantId, etudiant.id)),
    ]);

    // Enseignants : même filière ET groupe enseigné (groupes "NIVEAU-GroupeX" ou nom brut).
    const mesEnseignants = teachers.filter((f) => {
      const sameFiliere = !f.departement || !etudiant.filiere || f.departement === etudiant.filiere;
      const groupes: string[] = Array.isArray(f.groupes) ? f.groupes : [];
      const sameGroupe =
        groupes.length === 0 ||
        groupes.some((g) => g === etudiant.groupe || g.split("-")[0] === etudiant.niveau || g === etudiant.niveau);
      return sameFiliere && sameGroupe;
    });

    const stageEnCours =
      stageRows.find((s) => ["en_cours", "convention_signee", "soutenance"].includes(s.statut)) ?? null;

    const presents = attRows.filter((a) => a.present).length;
    const tauxPresence = attRows.length ? Math.round((presents / attRows.length) * 100) : 100;

    return {
      etudiant: {
        ...etudiant,
        moyenne: Number(etudiant.moyenne),
        fraisAnnuels: Number(etudiant.fraisAnnuels),
        resteAPayer: Number(etudiant.resteAPayer),
      },
      enseignants: mesEnseignants,
      stageEnCours,
      stages: stageRows,
      notes: notes.map((n) => ({ ...n, note: Number(n.note), coef: Number(n.coef), credits: Number(n.credits) })),
      bulletins: bulletinRows,
      paiements,
      presence: { total: attRows.length, presents, taux: tauxPresence },
    };
  });

  // ── Photo de profil (URL http(s) ou data:image, 2 Mo max côté front) ──
  app.put("/me/photo", { preHandler: [authenticate], bodyLimit: 2_000_000 }, async (request, reply) => {
    const input = photoSchema.parse(request.body);
    const url = input.photoUrl.trim();
    if (url && !(url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:image/"))) {
      return reply.status(400).send({ error: "URL de photo invalide" });
    }
    const db = getDb();
    const etudiant = await resolveEtudiant(db, request.user.id);
    if (!etudiant) return reply.status(404).send({ error: "Fiche étudiant introuvable pour ce compte" });
    const [updated] = await db.update(etudiants).set({ photoUrl: url }).where(eq(etudiants.id, etudiant.id)).returning();
    // Garde la photo du compte synchrone : l'avatar du rail et la page profil
    // lisent `users.photo_url`.
    await db.update(users).set({ photoUrl: url, updatedAt: new Date() }).where(eq(users.id, request.user.id));
    return { photoUrl: updated.photoUrl };
  });

  // ── Calendrier personnel : séances du groupe + examens du niveau + fériés ──
  app.get("/calendar", { preHandler: [authenticate] }, async (request, reply) => {
    const query = request.query as { start?: string; end?: string };
    const start = query.start ?? new Date(new Date().getFullYear(), 8, 1).toISOString().slice(0, 10);
    const end = query.end ?? new Date(new Date().getFullYear() + 1, 5, 30).toISOString().slice(0, 10);
    const db = getDb();
    const etudiant = await resolveEtudiant(db, request.user.id);
    if (!etudiant) return reply.status(404).send({ error: "Fiche étudiant introuvable pour ce compte" });

    const seanceConds = [gte(seances.date, start), lte(seances.date, end)];
    const [mesSeances, mesExamens, joursFeries, vacances, exceptions] = await Promise.all([
      db.select().from(seances).where(and(...seanceConds)).orderBy(seances.date, seances.debut),
      db.select().from(examens).where(and(gte(examens.date, start), lte(examens.date, end))).orderBy(examens.date),
      db.select().from(holidays).where(and(gte(holidays.date, start), lte(holidays.date, end))).orderBy(holidays.date),
      db.select().from(schoolVacations).orderBy(schoolVacations.startDate),
      db.select().from(calendarExceptions).where(and(gte(calendarExceptions.date, start), lte(calendarExceptions.date, end))).orderBy(calendarExceptions.date),
    ]);

    const seancesFiltrees = mesSeances
      .filter((s) => {
        if (etudiant.filiere && s.filiere && s.filiere !== etudiant.filiere) return false;
        if (!s.groupe) return true;
        return s.groupe === etudiant.groupe || s.groupe.split("-")[0] === etudiant.niveau || s.groupe === etudiant.niveau;
      })
      .map(enrichSeance);

    const examensFiltres = mesExamens.filter((e) => {
      if (etudiant.filiere && (e as { filiere?: string }).filiere && (e as { filiere?: string }).filiere !== etudiant.filiere) return false;
      const niv = (e as { niveau?: string }).niveau;
      if (etudiant.niveau && niv && niv !== etudiant.niveau) return false;
      return true;
    });

    return { seances: seancesFiltrees, examens: examensFiltres, holidays: joursFeries, vacations: vacances, exceptions };
  });

  // ── Demandes : liste perso ──
  app.get("/requests", { preHandler: [authenticate] }, async (request, reply) => {
    const db = getDb();
    const etudiant = await resolveEtudiant(db, request.user.id);
    if (!etudiant) return reply.status(404).send({ error: "Fiche étudiant introuvable pour ce compte" });
    return db.select().from(studentRequests).where(eq(studentRequests.etudiantId, etudiant.id)).orderBy(desc(studentRequests.createdAt));
  });

  // ── Demandes : création (anti-spam 10/jour) ──
  app.post("/requests", { preHandler: [authenticate] }, async (request, reply) => {
    const input = createRequestSchema.parse(request.body);
    const db = getDb();
    const etudiant = await resolveEtudiant(db, request.user.id);
    if (!etudiant) return reply.status(404).send({ error: "Fiche étudiant introuvable pour ce compte" });

    const today = new Date().toISOString().slice(0, 10);
    const [row] = await db
      .select({ n: count() })
      .from(studentRequests)
      .where(and(eq(studentRequests.etudiantId, etudiant.id), sql`DATE(${studentRequests.createdAt}) = ${today}`));
    if (Number(row?.n ?? 0) >= 10) {
      return reply.status(429).send({ error: "Limite de 10 demandes par jour atteinte" });
    }

    const [created] = await db
      .insert(studentRequests)
      .values({ etudiantId: etudiant.id, type: input.type, titre: input.titre.trim(), description: (input.description ?? "").trim(), luParEtudiant: true })
      .returning();
    return reply.status(201).send(created);
  });

  // ── Notifications : réponses du staff (non lues + lues récentes, non masquées) ──
  app.get("/notifications", { preHandler: [authenticate] }, async (request, reply) => {
    const db = getDb();
    const etudiant = await resolveEtudiant(db, request.user.id);
    if (!etudiant) return reply.status(404).send({ error: "Fiche étudiant introuvable pour ce compte" });
    const visibles = and(
      eq(studentRequests.etudiantId, etudiant.id),
      ne(studentRequests.statut, "en_attente"),
      eq(studentRequests.masqueParEtudiant, false),
    );
    const [total, items] = await Promise.all([
      db
        .select({ n: count() })
        .from(studentRequests)
        .where(and(visibles, eq(studentRequests.luParEtudiant, false))),
      db
        .select({
          id: studentRequests.id,
          titre: studentRequests.titre,
          description: studentRequests.description,
          statut: studentRequests.statut,
          reponse: studentRequests.reponse,
          luParEtudiant: studentRequests.luParEtudiant,
          updatedAt: studentRequests.updatedAt,
        })
        .from(studentRequests)
        .where(visibles)
        .orderBy(desc(studentRequests.updatedAt))
        .limit(10),
    ]);
    return { unread: Number(total[0]?.n ?? 0), items };
  });

  // ── Notifications : tout marquer comme lu ──
  app.post("/notifications/lu", { preHandler: [authenticate] }, async (request, reply) => {
    const db = getDb();
    const etudiant = await resolveEtudiant(db, request.user.id);
    if (!etudiant) return reply.status(404).send({ error: "Fiche étudiant introuvable pour ce compte" });
    const lues = await db
      .update(studentRequests)
      .set({ luParEtudiant: true })
      .where(and(eq(studentRequests.etudiantId, etudiant.id), eq(studentRequests.luParEtudiant, false)))
      .returning({ id: studentRequests.id });
    return { ok: true, lues: lues.length };
  });

  // ── Notifications : marquer UNE demande comme lue (reste visible, grisée) ──
  app.post("/notifications/:id/lu", { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const db = getDb();
    const etudiant = await resolveEtudiant(db, request.user.id);
    if (!etudiant) return reply.status(404).send({ error: "Fiche étudiant introuvable pour ce compte" });
    const [updated] = await db
      .update(studentRequests)
      .set({ luParEtudiant: true })
      .where(and(eq(studentRequests.id, id), eq(studentRequests.etudiantId, etudiant.id)))
      .returning({ id: studentRequests.id });
    if (!updated) return reply.status(404).send({ error: "Demande introuvable" });
    return { ok: true };
  });

  // ── Notifications : effacer UNE notification (cachée, jamais supprimée) ──
  app.post("/notifications/:id/masquer", { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const db = getDb();
    const etudiant = await resolveEtudiant(db, request.user.id);
    if (!etudiant) return reply.status(404).send({ error: "Fiche étudiant introuvable pour ce compte" });
    const [updated] = await db
      .update(studentRequests)
      .set({ masqueParEtudiant: true })
      .where(and(eq(studentRequests.id, id), eq(studentRequests.etudiantId, etudiant.id)))
      .returning({ id: studentRequests.id });
    if (!updated) return reply.status(404).send({ error: "Demande introuvable" });
    return { ok: true };
  });

  // ── Staff : toutes les demandes + traitement ──
  app.get(
    "/requests/all",
    { preHandler: [authenticate, requireRole("directeur", "responsable")] },
    async (request) => {
      const db = getDb();
      const query = request.query as { statut?: string; search?: string };
      // Jointure sur la fiche étudiant : la file du staff a besoin du nom, du
      // CNE et de la photo du demandeur, pas seulement de son id.
      let rows = await db
        .select({
          id: studentRequests.id,
          etudiantId: studentRequests.etudiantId,
          type: studentRequests.type,
          titre: studentRequests.titre,
          description: studentRequests.description,
          statut: studentRequests.statut,
          reponse: studentRequests.reponse,
          createdAt: studentRequests.createdAt,
          updatedAt: studentRequests.updatedAt,
          etudiantPrenom: etudiants.prenom,
          etudiantNom: etudiants.nom,
          etudiantCne: etudiants.cne,
          etudiantPhotoUrl: etudiants.photoUrl,
          etudiantFiliere: etudiants.filiere,
        })
        .from(studentRequests)
        .leftJoin(etudiants, eq(studentRequests.etudiantId, etudiants.id))
        .orderBy(desc(studentRequests.createdAt));
      if (query.statut) rows = rows.filter((r) => r.statut === query.statut);
      if (query.search) {
        const q = query.search.toLowerCase();
        rows = rows.filter(
          (r) =>
            r.titre.toLowerCase().includes(q) ||
            r.description.toLowerCase().includes(q) ||
            `${r.etudiantPrenom ?? ""} ${r.etudiantNom ?? ""} ${r.etudiantCne ?? ""}`
              .toLowerCase()
              .includes(q),
        );
      }
      return rows;
    },
  );

  app.patch(
    "/requests/:id",
    { preHandler: [authenticate, requireRole("directeur", "responsable")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const input = z
        .object({
          statut: z.enum(["en_attente", "en_cours", "traite", "rejete"]),
          reponse: z.string().max(2000).optional().default(""),
        })
        .refine((v) => v.statut !== "rejete" || v.reponse.trim().length >= 3, {
          message: "Un motif de refus est requis (3 caractères min)",
        })
        .parse(request.body);
      const db = getDb();
      const [updated] = await db
        .update(studentRequests)
        .set({ statut: input.statut, reponse: input.reponse ?? "", luParEtudiant: false, updatedAt: new Date() })
        .where(eq(studentRequests.id, id))
        .returning();
      if (!updated) return reply.status(404).send({ error: "Demande introuvable" });
      return updated;
    },
  );
}
