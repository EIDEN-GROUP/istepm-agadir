import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate, requireRole } from "@/middleware/auth";
import { getDb } from "@/db";
import { examens } from "@/db/schema/examens";
import { notesExamen } from "@/db/schema/notes-examen";
import { etudiants } from "@/db/schema/etudiants";
import { notesEtudiant } from "@/db/schema/notes-etudiant";
import { formateurs } from "@/db/schema/formateurs";
import { eq, desc, sql } from "drizzle-orm";
import { uploadDocument, getDocument, deleteDocument } from "@/lib/minio";

const examenSchema = z.object({
  module: z.string().min(1, "Module requis"),
  filiere: z.string().min(1, "Fili\u00e8re requise"),
  niveau: z.string().min(1, "Niveau requis"),
  type: z.string().min(1, "Type requis"),
  date: z.string().min(1, "Date requise"),
  heure: z.string().optional().default(""),
  salle: z.string().optional().default(""),
  surveillants: z.array(z.string()).optional().default([]),
  statut: z.string().optional().default("planifie"),
  groupe: z.string().optional().default(""),
  etudiantsConvoques: z.number().optional().default(0),
  composante: z.string().optional().default("Theorique"),
  duree: z.number().min(0).optional().default(120),
  description: z.string().optional().default(""),
  createdBy: z.string().optional().default(""),
});

const saisieNoteSchema = z.object({
  etudiantId: z.string().uuid(),
  theorique: z.number().min(0).max(20).optional(),
  pratique: z.number().min(0).max(20).optional(),
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

const saveNotesSchema = z.object({
  saisies: z.array(saisieNoteSchema).min(1),
});

function ponderee(notes: { note: string; coef: string }[]): number {
  let total = 0;
  let totalCoef = 0;
  for (const n of notes) {
    total += Number(n.note) * Number(n.coef);
    totalCoef += Number(n.coef);
  }
  return totalCoef > 0 ? Math.round((total / totalCoef) * 100) / 100 : 0;
}

export async function examenRoutes(app: FastifyInstance) {
  function enrichExamen(row: typeof examens.$inferSelect) {
    const annee = row.date ? `${new Date(row.date).getFullYear()}/${new Date(row.date).getFullYear() + 1}` : "";
    const typeLabel = row.type.charAt(0).toUpperCase() + row.type.slice(1);
    return {
      ...row,
      titre: row.module ? `${typeLabel} \u2014 ${row.module}` : "",
      classe: row.niveau && row.groupe ? `${row.niveau}-${row.groupe}` : "",
      anneeUniversitaire: annee,
      duree: row.duree ?? 120,
      createdBy: row.createdBy ?? "",
      description: row.description ?? "",
      etudiantsConvoques: row.etudiantsConvoques ?? 0,
      document: row.documentId
        ? {
            id: row.documentId,
            nom: row.documentNom ?? "",
            taille: row.documentTaille ?? 0,
            mime: row.documentMime ?? "",
            uploadedAt: row.documentUploadedAt ?? "",
          }
        : null,
    };
  }

  app.get("/", { preHandler: [authenticate] }, async (request) => {
    const db = getDb();
    const query = request.query as {
      filiere?: string;
      niveau?: string;
      statut?: string;
      module?: string;
    };
    let result = db
      .select()
      .from(examens)
      .orderBy(desc(examens.date))
      .$dynamic();

    if (query.filiere) {
      result = result.where(eq(examens.filiere, query.filiere));
    }
    if (query.niveau) {
      result = result.where(eq(examens.niveau, query.niveau));
    }
    if (query.statut) {
      result = result.where(eq(examens.statut, query.statut));
    }
    if (query.module) {
      result = result.where(eq(examens.module, query.module));
    }

    const rows = await result;
    return rows.map(enrichExamen);
  });

  app.get("/:id", { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const db = getDb();
    const [examen] = await db
      .select()
      .from(examens)
      .where(eq(examens.id, id))
      .limit(1);
    if (!examen) return reply.status(404).send({ error: "Examen introuvable" });
    return enrichExamen(examen);
  });

  app.post("/", { preHandler: [authenticate, requireRole("directeur", "responsable")] }, async (request, reply) => {
    const input = examenSchema.parse(request.body);
    const db = getDb();
    const [examen] = await db
      .insert(examens)
      .values(input)
      .returning();
    return enrichExamen(examen);
  });

  app.put("/:id", { preHandler: [authenticate, requireRole("directeur", "responsable")] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = examenSchema.partial().parse(request.body);
    const db = getDb();
    const values: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(input)) {
      if (val !== undefined) values[key] = val;
    }
    const [examen] = await db
      .update(examens)
      .set(values)
      .where(eq(examens.id, id))
      .returning();
    if (!examen) return reply.status(404).send({ error: "Examen introuvable" });
    return enrichExamen(examen);
  });

  app.delete("/:id", { preHandler: [authenticate, requireRole("directeur", "responsable")] }, async (request) => {
    const { id } = request.params as { id: string };
    const db = getDb();
    // Delete document from MinIO if it exists
    const [examen] = await db
      .select()
      .from(examens)
      .where(eq(examens.id, id))
      .limit(1);
    if (examen?.documentId) {
      await deleteDocument(examen.documentId).catch(() => {});
    }
    await db.delete(examens).where(eq(examens.id, id));
    return { ok: true };
  });

  /** Upload a document for an examen. */
  app.post(
    "/:id/document",
    { preHandler: [authenticate, requireRole("directeur", "responsable", "enseignant")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const db = getDb();

      const [examen] = await db
        .select()
        .from(examens)
        .where(eq(examens.id, id))
        .limit(1);
      if (!examen) return reply.status(404).send({ error: "Examen introuvable" });

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
      if (examen.documentId) {
        await deleteDocument(examen.documentId).catch(() => {});
      }

      // Upload new document to MinIO (MIME vérifié, pas déclaré).
      const { objectKey, size } = await uploadDocument(buffer, nom, verifiedMime);

      // Update DB with document metadata
      const [updated] = await db
        .update(examens)
        .set({
          documentId: objectKey,
          documentNom: nom,
          documentTaille: size,
          documentMime: verifiedMime,
          documentUploadedAt: new Date().toISOString(),
        })
        .where(eq(examens.id, id))
        .returning();

      return enrichExamen(updated);
    },
  );

  /** Download the document for an examen (staff only — sujets confidentiels). */
  app.get(
    "/:id/document",
    { preHandler: [authenticate, requireRole("directeur", "responsable", "enseignant")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const db = getDb();

      const [examen] = await db
        .select()
        .from(examens)
        .where(eq(examens.id, id))
        .limit(1);
      if (!examen) return reply.status(404).send({ error: "Examen introuvable" });
      if (!examen.documentId) return reply.status(404).send({ error: "Aucun document associ\u00e9 \u00e0 cet examen" });

      const data = await getDocument(examen.documentId);
      if (!data) return reply.status(404).send({ error: "Document introuvable sur le stockage" });

      return reply
        .header("Content-Type", examen.documentMime ?? "application/octet-stream")
        .header("X-Content-Type-Options", "nosniff")
        .header("Content-Disposition", safeDownloadName(examen.documentNom ?? "document"))
        .send(data);
    },
  );

  /** Delete the document for an examen. */
  app.delete(
    "/:id/document",
    { preHandler: [authenticate, requireRole("directeur", "responsable", "enseignant")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const db = getDb();

      const [examen] = await db
        .select()
        .from(examens)
        .where(eq(examens.id, id))
        .limit(1);
      if (!examen) return reply.status(404).send({ error: "Examen introuvable" });
      if (!examen.documentId) return reply.status(404).send({ error: "Aucun document associ\u00e9 \u00e0 cet examen" });

      await deleteDocument(examen.documentId);

      await db
        .update(examens)
        .set({
          documentId: null,
          documentNom: null,
          documentTaille: null,
          documentMime: null,
          documentUploadedAt: null,
        })
        .where(eq(examens.id, id));

      return { ok: true };
    },
  );

  app.post(
    "/:id/notes",
    { preHandler: [authenticate, requireRole("directeur", "enseignant")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const { saisies } = saveNotesSchema.parse(request.body);
      const db = getDb();

      const [examen] = await db
        .select()
        .from(examens)
        .where(eq(examens.id, id))
        .limit(1);
      if (!examen) return reply.status(404).send({ error: "Examen introuvable" });

      for (const s of saisies) {
        await db
          .insert(notesExamen)
          .values({
            examenId: id,
            etudiantId: s.etudiantId,
            theorique: s.theorique !== undefined ? String(s.theorique) : null,
            pratique: s.pratique !== undefined ? String(s.pratique) : null,
          })
          .onConflictDoUpdate({
            target: [
              notesExamen.examenId,
              notesExamen.etudiantId,
            ],
            set: {
              theorique: s.theorique !== undefined ? String(s.theorique) : undefined,
              pratique: s.pratique !== undefined ? String(s.pratique) : undefined,
            },
          });

        const allNotes = await db
          .select()
          .from(notesEtudiant)
          .where(eq(notesEtudiant.etudiantId, s.etudiantId));

        const examNotes = await db
          .select()
          .from(notesExamen)
          .where(eq(notesExamen.etudiantId, s.etudiantId));

        const allAvg: { note: string; coef: string }[] = allNotes.map((n) => ({
          note: n.note,
          coef: n.coef,
        }));
        for (const en of examNotes) {
          const v = en.theorique ?? en.pratique ?? "0";
          allAvg.push({ note: v, coef: "1" });
        }

        const moyPonderee = ponderee(allAvg);
        await db
          .update(etudiants)
          .set({ moyenne: String(moyPonderee) })
          .where(eq(etudiants.id, s.etudiantId));
      }

      for (const surveillant of examen.surveillants) {
        const [formateur] = await db
          .select()
          .from(formateurs)
          .where(sql`${formateurs.nom} ILIKE ${`%${surveillant}%`}`)
          .limit(1);
        if (formateur) {
          await db
            .update(formateurs)
            .set({ notesSaisies: formateur.notesSaisies + 1 })
            .where(eq(formateurs.id, formateur.id));
        }
      }

      await db
        .update(examens)
        .set({ statut: "notes_saisies" })
        .where(eq(examens.id, id));

      // Fetch updated exam with all notes
      const [updatedExamen] = await db
        .select()
        .from(examens)
        .where(eq(examens.id, id))
        .limit(1);

      return {
        ok: true,
        examen: enrichExamen(updatedExamen),
      };
    },
  );
}

