import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate, requireRole } from "@/middleware/auth";
import { getDb } from "@/db";
import { seances } from "@/db/schema/seances";
import { formateurs } from "@/db/schema/formateurs";
import { notifications } from "@/db/schema/notifications";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import { uploadDocument, getDocument, deleteDocument } from "@/lib/minio";

const SEANCE_DIRECTIONS = ["directeur", "assistant_directeur", "responsable"] as const;

const createSeanceSchema = z.object({
  date: z.string().min(1),
  debut: z.string().optional().default("08:00"),
  fin: z.string().optional().default("09:00"),
  professeurId: z.string().optional().default(""),
  module: z.string().min(1),
  filiere: z.string().min(1, "Filière requise"),
  salle: z.string().optional().default(""),
  groupe: z.string().optional().default(""),
  type: z.enum(["cours", "td", "tp", "examen", "stage", "soutenance"]).optional().default("cours"),
  statut: z.enum(["planifie", "en_cours", "termine", "annule", "valide", "rejete"]).optional().default("planifie"),
  anneeUniversitaire: z.string().optional().default(""),
  semestre: z.string().optional().default(""),
  notes: z.string().optional().default(""),
});

const updateSeanceSchema = createSeanceSchema.partial().extend({
  /** Motif du rejet (direction uniquement, voir PUT /:id). */
  motifRejet: z.string().trim().max(2000).optional(),
});

const documentSchema = z.object({
  nom: z.string().min(1, "Nom de fichier requis"),
  mime: z.string().min(1, "Type MIME requis"),
  content: z.string().min(1, "Contenu (base64) requis"),
});

function isValidMime(mime: string): boolean {
  const allowed = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];
  return allowed.includes(mime);
}

/**
 * Détecte le vrai type par octets magiques (le `mime` déclaré par le client
 * ne fait pas foi : un HTML/JS déguisé en PDF deviendrait du stored-XSS).
 * Retourne le MIME vérifié ou `null`.
 */
function detectMime(buffer: Buffer, declared: string): string | null {
  const pdf = buffer.length >= 5 && buffer.subarray(0, 5).toString("ascii") === "%PDF-";
  const zip = buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04;
  const ole = buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]));
  if (declared === "application/pdf") return pdf ? declared : null;
  if (declared === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    if (!zip) return null;
    // DOCX = ZIP contenant [Content_Types].xml (rejette les ZIP quelconques).
    const head = buffer.subarray(0, Math.min(buffer.length, 65536)).toString("binary");
    return head.includes("[Content_Types].xml") ? declared : null;
  }
  if (declared === "application/msword") return ole ? declared : null;
  return null;
}

/** Nom sûr pour l'en-tête Content-Disposition (anti injection d'en-tête). */
function safeDownloadName(nom: string): string {
  const clean = nom.replace(/[\r\n"]+/g, "").trim().slice(0, 120) || "document";
  return `attachment; filename="${clean}"; filename*=UTF-8''${encodeURIComponent(clean)}`;
}

/**
 * Fiche formateur liée au compte (périmètre enseignant). `formateurs.user_id`
 * porte l'`users.id` en texte (voir `services/auth.ts`).
 */
async function ficheEnseignant(db: ReturnType<typeof getDb>, userId: string) {
  const [fiche] = await db
    .select({ id: formateurs.id, userId: formateurs.userId })
    .from(formateurs)
    .where(eq(formateurs.userId, userId))
    .limit(1);
  return fiche ?? null;
}

export function enrichSeance(row: typeof seances.$inferSelect) {
  const year = row.date ? row.date.slice(0, 4) : "";
  return {
    ...row,
    anneeUniversitaire: row.anneeUniversitaire || (year ? `${year}/${Number(year) + 1}` : ""),
    semestre: row.semestre || "",
    notes: row.notes || undefined,
  };
}

function minutesDepuisMinuit(hhmm: string): number {
  const [h = "0", m = "0"] = hhmm.split(":");
  return Number(h) * 60 + Number(m);
}

/**
 * Conflit de ressources (professeur / salle / groupe) sur le même jour.
 * Le front affiche l'avertissement et peut forcer avec `?force=1`
 * (« Enregistrer malgré le conflit »).
 */
async function trouverConflit(
  db: ReturnType<typeof getDb>,
  c: { date: string; debut: string; fin: string; professeurId: string; salle: string; groupe: string },
  ignorerId?: string,
) {
  const rows = await db.select().from(seances).where(eq(seances.date, c.date));
  const debut = minutesDepuisMinuit(c.debut);
  const fin = minutesDepuisMinuit(c.fin);
  for (const s of rows) {
    if (s.id === ignorerId) continue;
    const d = minutesDepuisMinuit(s.debut);
    const f = minutesDepuisMinuit(s.fin);
    if (fin <= d || debut >= f) continue;
    if (c.professeurId && s.professeurId === c.professeurId)
      return { type: "professeur", seance: enrichSeance(s) };
    if (c.salle && s.salle === c.salle) return { type: "salle", seance: enrichSeance(s) };
    if (c.groupe && s.groupe === c.groupe) return { type: "groupe", seance: enrichSeance(s) };
  }
  return null;
}

export async function seanceRoutes(app: FastifyInstance) {
  app.get("/", { preHandler: [authenticate, requireRole("directeur", "assistant_directeur", "responsable", "enseignant")] }, async (request) => {
    const query = request.query as { start?: string; end?: string; professeurId?: string; date?: string };
    const db = getDb();
    const conditions = [];
    if (request.user.role === "enseignant") {
      // Périmètre du compte : uniquement les séances de la fiche liée.
      // Sans fiche liée, rien (jamais tout l'établissement).
      const [fiche] = await db
        .select({ id: formateurs.id })
        .from(formateurs)
        .where(eq(formateurs.userId, request.user.id))
        .limit(1);
      if (!fiche) return [];
      conditions.push(eq(seances.professeurId, fiche.id));
    }
    if (query.start) conditions.push(gte(seances.date, query.start));
    if (query.end) conditions.push(lte(seances.date, query.end));
    if (query.professeurId) conditions.push(eq(seances.professeurId, query.professeurId));
    if (query.date) conditions.push(eq(seances.date, query.date));
    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const rows = await db.select().from(seances).where(where).orderBy(seances.date, seances.debut);
    return rows.map(enrichSeance);
  });

  app.get("/today", { preHandler: [authenticate, requireRole("directeur", "assistant_directeur", "responsable")] }, async () => {
    const db = getDb();
    const today = new Date().toISOString().slice(0, 10);
    const rows = await db
      .select()
      .from(seances)
      .where(eq(seances.date, today))
      .orderBy(seances.debut);
    return rows.map(enrichSeance);
  });

  app.get("/:id", { preHandler: [authenticate, requireRole("directeur", "assistant_directeur", "responsable", "enseignant")] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const db = getDb();
    const [seance] = await db.select().from(seances).where(eq(seances.id, id)).limit(1);
    if (!seance) return reply.status(404).send({ error: "Séance introuvable" });
    // Périmètre enseignant : uniquement ses propres séances.
    if (request.user.role === "enseignant") {
      const fiche = await ficheEnseignant(db, request.user.id);
      if (!fiche || seance.professeurId !== fiche.id) {
        return reply.status(403).send({ error: "Séance introuvable" });
      }
    }
    return enrichSeance(seance);
  });

  app.post("/", { preHandler: [authenticate, requireRole("directeur", "assistant_directeur", "responsable")] }, async (request, reply) => {
    const input = createSeanceSchema.parse(request.body);
    const db = getDb();
    const query = request.query as { force?: string };
    if (query.force !== "1") {
      const conflit = await trouverConflit(db, input);
      if (conflit) return reply.status(409).send({ error: "Conflit de ressource", conflit });
    }
    const [seance] = await db.insert(seances).values(input).returning();
    return enrichSeance(seance);
  });

  app.post("/bulk", { preHandler: [authenticate, requireRole("directeur", "assistant_directeur", "responsable")] }, async (request, reply) => {
    const schema = z.object({
      seances: z.array(createSeanceSchema).min(1).max(100),
    });
    const input = schema.parse(request.body);
    const db = getDb();
    const created = await db.insert(seances).values(input.seances).returning();
    return created.map(enrichSeance);
  });

  /**
   * Workflow de validation des séances :
   * - enseignant (ses séances uniquement) : `termine` (compte-rendu exigé)
   *   ou `planifie` (« vu », uniquement depuis `rejete`) ;
   * - direction : `valide` (depuis `termine`, efface le motif) ou `rejete`
   *   (depuis `termine`, motif obligatoire + cloche enseignant) ;
   * - sinon : édition classique des champs (direction uniquement).
   */
  app.put("/:id", { preHandler: [authenticate, requireRole("directeur", "assistant_directeur", "responsable", "enseignant")] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = updateSeanceSchema.parse(request.body);
    const db = getDb();
    const [existing] = await db.select().from(seances).where(eq(seances.id, id)).limit(1);
    if (!existing) return reply.status(404).send({ error: "Séance introuvable" });

    const isTeacher = request.user.role === "enseignant";
    if (isTeacher) {
      const fiche = await ficheEnseignant(db, request.user.id);
      if (!fiche || existing.professeurId !== fiche.id) {
        return reply.status(403).send({ error: "Séance introuvable" });
      }
      const keys = Object.keys(input).filter((k) => (input as Record<string, unknown>)[k] !== undefined);
      const onlyStatut = keys.length === 1 && keys[0] === "statut";
      if (!onlyStatut) {
        return reply.status(403).send({ error: "Un enseignant ne peut que marquer sa séance faite ou vue" });
      }
      if (input.statut === "termine") {
        if (!existing.documentId) {
          return reply.status(422).send({ error: "Déposez le compte-rendu (PDF/DOC) avant de marquer la séance faite" });
        }
      } else if (input.statut === "planifie") {
        if (existing.statut !== "rejete") {
          return reply.status(422).send({ error: "Seule une séance rejetée peut être marquée comme vue" });
        }
      } else {
        return reply.status(403).send({ error: "Transition non autorisée" });
      }
      const [updated] = await db
        .update(seances)
        .set({ statut: input.statut, updatedAt: new Date() })
        .where(eq(seances.id, id))
        .returning();
      return enrichSeance(updated);
    }

    // ——— Direction ———
    if (input.statut === "valide" || input.statut === "rejete") {
      if (existing.statut !== "termine") {
        return reply.status(422).send({ error: "Seule une séance terminée peut être validée ou rejetée" });
      }
      const motif = (input.motifRejet ?? "").trim() || existing.motifRejet || "";
      if (input.statut === "rejete" && !motif) {
        return reply.status(400).send({ error: "Un motif de rejet est requis" });
      }
      const [updated] = await db
        .update(seances)
        .set({
          statut: input.statut,
          motifRejet: input.statut === "valide" ? "" : motif,
          validatedBy: request.user.id,
          validatedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(seances.id, id))
        .returning();
      if (input.statut === "rejete") {
        // Cloche enseignant (best-effort) : fiche liée, sinon rien.
        try {
          const [fiche] = await db
            .select({ userId: formateurs.userId })
            .from(formateurs)
            .where(eq(formateurs.id, existing.professeurId))
            .limit(1);
          if (fiche?.userId) {
            await db.insert(notifications).values({
              userId: fiche.userId,
              type: "seance-rejet",
              title: "Séance rejetée",
              message: `Votre séance « ${existing.module} » du ${existing.date} a été rejetée. Motif : ${motif}`,
              link: "/dashboard/calendar",
              read: false,
            });
          }
        } catch {
          // La validation ne doit jamais échouer à cause de la cloche.
        }
      }
      return enrichSeance(updated);
    }

    // Édition classique (direction) : le motif ne transite que par le
    // flux de rejet ci-dessus, jamais par l'édition libre.
    const { motifRejet: _motif, ...champs } = input;
    void _motif;
    const merged = { ...existing, ...champs };
    const query = request.query as { force?: string };
    if (query.force !== "1" && (input.date !== undefined || input.debut !== undefined || input.fin !== undefined || input.professeurId !== undefined || input.salle !== undefined || input.groupe !== undefined)) {
      const conflit = await trouverConflit(
        db,
        {
          date: merged.date,
          debut: merged.debut,
          fin: merged.fin,
          professeurId: merged.professeurId ?? "",
          salle: merged.salle ?? "",
          groupe: merged.groupe ?? "",
        },
        id,
      );
      if (conflit) return reply.status(409).send({ error: "Conflit de ressource", conflit });
    }
    const [updated] = await db
      .update(seances)
      .set({ ...champs, updatedAt: new Date() })
      .where(eq(seances.id, id))
      .returning();
    return enrichSeance(updated);
  });

  /** Compte-rendu de séance (enseignant propriétaire ou direction). */
  app.post(
    "/:id/document",
    { preHandler: [authenticate, requireRole("directeur", "assistant_directeur", "responsable", "enseignant")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const db = getDb();

      const [seance] = await db
        .select()
        .from(seances)
        .where(eq(seances.id, id))
        .limit(1);
      if (!seance) return reply.status(404).send({ error: "Séance introuvable" });

      if (request.user.role === "enseignant") {
        const fiche = await ficheEnseignant(db, request.user.id);
        if (!fiche || seance.professeurId !== fiche.id) {
          return reply.status(403).send({ error: "Séance d'un autre formateur" });
        }
      }

      const { nom, mime, content } = documentSchema.parse(request.body);

      if (!isValidMime(mime)) {
        return reply
          .status(400)
          .send({ error: "Type de fichier non accepté. Formats acceptés : PDF, DOC, DOCX" });
      }

      // Limite pré-décodage (base64 ≈ +33 %) contre les payloads mémoire.
      if (content.length > 14 * 1024 * 1024) {
        return reply.status(400).send({ error: "Fichier trop volumineux (max 10 Mo)" });
      }

      // Decode base64 → Buffer
      const buffer = Buffer.from(content, "base64");
      const maxSize = 10 * 1024 * 1024;
      if (buffer.length > maxSize) {
        return reply.status(400).send({ error: "Fichier trop volumineux (max 10 Mo)" });
      }

      // Le contenu doit correspondre au type déclaré (anti stored-XSS).
      const verifiedMime = detectMime(buffer, mime);
      if (!verifiedMime) {
        return reply
          .status(400)
          .send({ error: "Le contenu du fichier ne correspond pas à son type déclaré" });
      }

      // Remove old document from MinIO if it exists
      if (seance.documentId) {
        await deleteDocument(seance.documentId).catch(() => {});
      }

      // Upload new document to MinIO (MIME vérifié, pas déclaré).
      const { objectKey, size } = await uploadDocument(buffer, nom, verifiedMime);

      // Update DB with document metadata
      const [updated] = await db
        .update(seances)
        .set({
          documentId: objectKey,
          documentNom: nom,
          documentTaille: size,
          documentMime: verifiedMime,
          documentUploadedAt: new Date().toISOString(),
          updatedAt: new Date(),
        })
        .where(eq(seances.id, id))
        .returning();

      return enrichSeance(updated);
    },
  );

  /** Téléchargement du compte-rendu (enseignant propriétaire ou direction). */
  app.get(
    "/:id/document",
    { preHandler: [authenticate, requireRole("directeur", "assistant_directeur", "responsable", "enseignant")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const db = getDb();

      const [seance] = await db
        .select()
        .from(seances)
        .where(eq(seances.id, id))
        .limit(1);
      if (!seance) return reply.status(404).send({ error: "Séance introuvable" });
      // Même périmètre que l'upload : un enseignant ne télécharge que ses comptes-rendus.
      if (request.user.role === "enseignant") {
        const fiche = await ficheEnseignant(db, request.user.id);
        if (!fiche || seance.professeurId !== fiche.id) {
          return reply.status(403).send({ error: "Séance d'un autre formateur" });
        }
      }
      if (!seance.documentId) return reply.status(404).send({ error: "Aucun document associé à cette séance" });

      const data = await getDocument(seance.documentId);
      if (!data) return reply.status(404).send({ error: "Document introuvable sur le stockage" });

      return reply
        .header("Content-Type", seance.documentMime ?? "application/octet-stream")
        .header("X-Content-Type-Options", "nosniff")
        .header("Content-Disposition", safeDownloadName(seance.documentNom ?? "document"))
        .send(data);
    },
  );

  /** Suppression du compte-rendu (direction uniquement). */
  app.delete(
    "/:id/document",
    { preHandler: [authenticate, requireRole("directeur", "assistant_directeur", "responsable")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const db = getDb();

      const [seance] = await db
        .select()
        .from(seances)
        .where(eq(seances.id, id))
        .limit(1);
      if (!seance) return reply.status(404).send({ error: "Séance introuvable" });
      if (!seance.documentId) return reply.status(404).send({ error: "Aucun document associé à cette séance" });

      await deleteDocument(seance.documentId);

      await db
        .update(seances)
        .set({
          documentId: null,
          documentNom: null,
          documentTaille: null,
          documentMime: null,
          documentUploadedAt: null,
          updatedAt: new Date(),
        })
        .where(eq(seances.id, id));

      return { ok: true };
    },
  );

  app.delete("/:id", { preHandler: [authenticate, requireRole("directeur", "assistant_directeur", "responsable")] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const db = getDb();
    await db.delete(seances).where(eq(seances.id, id));
    return { ok: true };
  });
}
