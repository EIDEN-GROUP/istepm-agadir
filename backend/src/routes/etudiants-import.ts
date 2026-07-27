import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate, requireRole } from "@/middleware/auth";
import { getDb } from "@/db";
import { etudiants } from "@/db/schema/etudiants";
import { settings } from "@/db/schema/settings";
import { eq, or, sql } from "drizzle-orm";

const NIVEAUX = ["S1", "S2", "S3", "S4", "S5", "S6"] as const;

const STATUTS_ETUDIANT = ["inscrit", "en_attente", "diplome", "abandon"] as const;
const STATUTS_PAIEMENT = ["paye", "en_attente", "retard", "impaye"] as const;

const STATUT_LABELS: Record<string, string> = {
  inscrit: "Inscrit",
  en_attente: "En attente",
  diplome: "Diplômé",
  abandon: "Abandon",
};

const PAIEMENT_LABELS: Record<string, string> = {
  paye: "Payé",
  en_attente: "En attente",
  retard: "Retard",
  impaye: "Impayé",
};

function parseCsv(text: string): string[][] {
  const lignes: string[][] = [];
  let current: string[] = [];
  let champ = "";
  let dansGuillemets = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i + 1];

    if (dansGuillemets) {
      if (c === '"' && next === '"') { champ += '"'; i++; }
      else if (c === '"') { dansGuillemets = false; }
      else { champ += c; }
    } else {
      if (c === '"') { dansGuillemets = true; }
      else if (c === ",") { current.push(champ.trim()); champ = ""; }
      else if (c === "\n" || (c === "\r" && next === "\n")) {
        if (c === "\r") i++;
        current.push(champ.trim()); champ = "";
        if (current.length > 0 && current.some((s) => s !== "")) lignes.push(current);
        current = [];
      } else if (c === "\r") {
        current.push(champ.trim()); champ = "";
        if (current.some((s) => s !== "")) lignes.push(current);
        current = [];
      } else { champ += c; }
    }
  }
  if (champ.trim() || current.length > 0) {
    current.push(champ.trim());
    if (current.some((s) => s !== "")) lignes.push(current);
  }
  return lignes;
}

const COLUMNS = [
  { key: "cne", label: "CNE", required: true },
  { key: "matricule", label: "Matricule", required: true },
  { key: "prenom", label: "Prénom", required: true },
  { key: "nom", label: "Nom", required: true },
  { key: "filiere", label: "Filière", required: true },
  { key: "niveau", label: "Niveau", required: true },
  { key: "annee", label: "Année", required: true },
  { key: "groupe", label: "Groupe", required: false },
  { key: "statut", label: "Statut", required: false },
  { key: "paiement", label: "Paiement", required: false },
  { key: "telephone", label: "Téléphone", required: false },
  { key: "email", label: "E-mail", required: false },
  { key: "dateNaissance", label: "Date de naissance", required: false },
  { key: "ville", label: "Ville", required: false },
  { key: "fraisMensuels", label: "Frais mensuels", required: false },
] as const;

const ALIASES: Record<string, string[]> = {
  statut: ["statut étudiant", "statut_etudiant"],
  paiement: ["statut paiement", "statut_paiement"],
  dateNaissance: ["date_naissance", "date naissance"],
  fraisMensuels: ["frais_mensuels"],
  telephone: ["téléphone", "tel"],
};

function buildAliasMap(): Record<string, string> {
  const map: Record<string, string> = {};
  const norm = (s: string) => s.toLowerCase().replace(/[_\s-]+/g, " ");
  for (const col of COLUMNS) {
    map[norm(col.key)] = col.key;
    map[norm(col.label)] = col.key;
    const aliases = ALIASES[col.key];
    if (aliases) { for (const a of aliases) map[norm(a)] = col.key; }
  }
  return map;
}

function autoMapHeaders(entetes: string[], aliasMap: Record<string, string>): Record<string, string> {
  const mapping: Record<string, string> = {};
  for (const h of entetes) {
    const key = h.toLowerCase().trim().replace(/[_\s-]+/g, " ");
    const target = aliasMap[key];
    if (target) mapping[target] = h;
  }
  return mapping;
}

function matchLabel<T extends string>(value: string, values: readonly T[], labels: Record<T, string>): T | null {
  if (values.includes(value as T)) return value as T;
  for (const k of values) {
    if (labels[k].toLowerCase() === value.toLowerCase()) return k;
  }
  return null;
}

function isValidDate(dateStr: string): boolean {
  if (!dateStr) return true;
  const re = /^\d{4}-\d{2}-\d{2}$/;
  if (!re.test(dateStr)) return false;
  const d = new Date(dateStr + "T00:00:00");
  return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === dateStr;
}

function isValidEmail(email: string): boolean {
  if (!email) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhone(phone: string): boolean {
  if (!phone) return true;
  return /^[\d\s\-\+\(\)]{6,20}$/.test(phone);
}

export async function etudiantImportRoutes(app: FastifyInstance) {
  app.post("/import/preview", { preHandler: [authenticate, requireRole("directeur", "responsable")] }, async (request, reply) => {
    const { csvText } = z.object({ csvText: z.string().min(1, "CSV text is required") }).parse(request.body);

    if (csvText.length > 10 * 1024 * 1024) {
      return reply.status(413).send({ error: "Le fichier ne doit pas dépasser 10 Mo" });
    }

    const db = getDb();

    const [filieresRow] = await db
      .select()
      .from(settings)
      .where(eq(settings.key, "filieres"))
      .limit(1);
    const filieres: string[] = (filieresRow?.value as string[]) ?? [];

    const existingStudents = await db
      .select({ cne: etudiants.cne, matricule: etudiants.matricule, email: etudiants.email })
      .from(etudiants);

    const existingCnes = new Set(existingStudents.map((s) => s.cne.toLowerCase()));
    const existingMatricules = new Set(existingStudents.map((s) => s.matricule.toLowerCase()));
    const existingEmails = new Set(existingStudents.map((s) => s.email.toLowerCase()));

    const aliasMap = buildAliasMap();

    const clean = csvText.replace(/^\uFEFF/, "");
    const toutes = parseCsv(clean);

    if (toutes.length < 2) {
      return reply.status(400).send({ error: "Le fichier doit contenir au moins une ligne d'en-tête et une ligne de données" });
    }

    const entetes = toutes[0].map((h) => h.trim());
    const mapping = autoMapHeaders(entetes, aliasMap);

    const missingColumns: string[] = [];
    const unknownColumns: string[] = [];
    const mappedColumns = new Set(Object.values(mapping));

    for (const col of COLUMNS) {
      if (col.required && !mapping[col.key]) missingColumns.push(col.key);
    }

    for (const h of entetes) {
      const key = h.toLowerCase().trim().replace(/[_\s-]+/g, " ");
      if (!aliasMap[key]) unknownColumns.push(h);
    }

    const rows = toutes.slice(1);
    const results: Array<{
      index: number;
      data: Record<string, string>;
      errors: string[];
      warnings: string[];
      valid: boolean;
    }> = [];

    let totalWarnings = 0;

    for (let i = 0; i < rows.length; i++) {
      const raw = rows[i];
      const obj: Record<string, string> = {};
      entetes.forEach((h, j) => { obj[h] = raw[j] ?? ""; });

      const row: Record<string, string> = {};
      for (const [key, header] of Object.entries(mapping)) {
        row[key] = (obj[header] ?? "").trim();
      }

      const errors: string[] = [];
      const warnings: string[] = [];

      if (!row.cne) errors.push("CNE requis");
      if (!row.matricule) errors.push("Matricule requis");
      if (!row.prenom) errors.push("Prénom requis");
      if (!row.nom) errors.push("Nom requis");
      if (!row.filiere) errors.push("Filière requise");
      else if (filieres.length > 0 && !filieres.includes(row.filiere)) warnings.push(`Filière « ${row.filiere} » non reconnue (sera créée dans la liste des filières)`);
      if (!row.niveau) errors.push("Niveau requis");
      else if (!(NIVEAUX as readonly string[]).includes(row.niveau)) errors.push(`Niveau « ${row.niveau} » invalide. Valeurs attendues : ${NIVEAUX.join(", ")}`);
      if (!row.annee) errors.push("Année requise");
      if (!row.groupe) warnings.push("Groupe manquant (sera laissé vide)");
      if (row.statut && !matchLabel(row.statut, STATUTS_ETUDIANT, STATUT_LABELS)) errors.push(`Statut « ${row.statut} » invalide. Valeurs attendues : ${STATUTS_ETUDIANT.join(", ")}`);
      if (row.paiement && !matchLabel(row.paiement, STATUTS_PAIEMENT, PAIEMENT_LABELS)) errors.push(`Paiement « ${row.paiement} » invalide. Valeurs attendues : ${STATUTS_PAIEMENT.join(", ")}`);
      if (row.email && !isValidEmail(row.email)) errors.push("E-mail invalide");
      if (row.telephone && !isValidPhone(row.telephone)) warnings.push("Téléphone au format inhabituel");
      if (row.dateNaissance && !isValidDate(row.dateNaissance)) errors.push("Date de naissance invalide (format attendu : YYYY-MM-DD)");
      if (row.fraisMensuels && (isNaN(Number(row.fraisMensuels)) || Number(row.fraisMensuels) < 0)) errors.push("Frais mensuels doit être un nombre positif");
      if (row.cne && existingCnes.has(row.cne.toLowerCase())) warnings.push(`CNE « ${row.cne} » déjà existant`);
      if (row.matricule && existingMatricules.has(row.matricule.toLowerCase())) warnings.push(`Matricule « ${row.matricule} » déjà existant`);
      if (row.email && existingEmails.has(row.email.toLowerCase())) warnings.push(`E-mail « ${row.email} » déjà existant`);

      totalWarnings += warnings.length;

      results.push({
        index: i + 2,
        data: row,
        errors,
        warnings,
        valid: errors.length === 0,
      });
    }

    const validCount = results.filter((r) => r.valid).length;
    const invalidCount = results.filter((r) => !r.valid).length;

    return {
      columns: entetes,
      columnMapping: mapping,
      missingColumns,
      unknownColumns,
      rows: results,
      summary: {
        total: rows.length,
        valid: validCount,
        invalid: invalidCount,
        warnings: totalWarnings,
      },
    };
  });

  app.post("/import/execute", { preHandler: [authenticate, requireRole("directeur", "responsable")] }, async (request, reply) => {
    const schema = z.object({
      rows: z.array(z.object({
        cne: z.string(),
        matricule: z.string(),
        prenom: z.string(),
        nom: z.string(),
        filiere: z.string(),
        niveau: z.string(),
        annee: z.string(),
        groupe: z.string().optional().default(""),
        statut: z.string().optional().default("inscrit"),
        paiement: z.string().optional().default("en_attente"),
        telephone: z.string().optional().default(""),
        email: z.string().optional().default(""),
        dateNaissance: z.string().optional().default(""),
        ville: z.string().optional().default(""),
        fraisMensuels: z.string().optional().default("0"),
      })),
    });

    const { rows } = schema.parse(request.body);
    const db = getDb();
    const startTime = Date.now();

    const errors: Array<{ index: number; message: string }> = [];
    let imported = 0;
    let skipped = 0;

    const newFilieres = new Set<string>();

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      try {
        const cneLower = r.cne.toLowerCase();
        const matriculeLower = r.matricule.toLowerCase();

        const [existing] = await db
          .select({ id: etudiants.id })
          .from(etudiants)
          .where(
            or(
              sql`LOWER(${etudiants.cne}) = ${cneLower}`,
              sql`LOWER(${etudiants.matricule}) = ${matriculeLower}`,
            ),
          )
          .limit(1);

        if (existing) {
          skipped++;
          errors.push({ index: i + 2, message: `Doublon détecté (CNE ou matricule déjà existant)` });
          continue;
        }

        const statutMapped = matchLabel(r.statut, STATUTS_ETUDIANT, STATUT_LABELS) ?? "inscrit";
        const paiementMapped = matchLabel(r.paiement, STATUTS_PAIEMENT, PAIEMENT_LABELS) ?? "en_attente";

        const fraisMensuels = r.fraisMensuels ? Number(r.fraisMensuels) : 0;
        const fraisAnnuels = fraisMensuels * 10;
        const resteAPayer = fraisAnnuels;

        await db.insert(etudiants).values({
          cne: r.cne,
          matricule: r.matricule,
          prenom: r.prenom,
          nom: r.nom,
          filiere: r.filiere,
          niveau: r.niveau,
          annee: r.annee,
          groupe: r.groupe || "",
          statut: statutMapped,
          paiement: paiementMapped,
          telephone: r.telephone || "",
          email: r.email || "",
          dateNaissance: r.dateNaissance || "",
          ville: r.ville || "",
          fraisAnnuels: String(fraisAnnuels),
          resteAPayer: String(resteAPayer),
          paiementsMensuels: {},
        });

        newFilieres.add(r.filiere);
        imported++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Erreur inconnue";
        errors.push({ index: i + 2, message: msg });
      }
    }

    if (newFilieres.size > 0) {
      try {
        const [row] = await db
          .select()
          .from(settings)
          .where(eq(settings.key, "filieres"))
          .limit(1);
        const list: string[] = (row?.value as string[]) ?? [];
        let changed = false;
        for (const f of newFilieres) {
          if (!list.includes(f)) { list.push(f); changed = true; }
        }
        if (changed) {
          list.sort();
          if (row) {
            await db.update(settings).set({ value: list }).where(eq(settings.key, "filieres"));
          } else {
            await db.insert(settings).values({ key: "filieres", value: list });
          }
        }
      } catch {
        // Silently ignore filiere sync errors   not critical
      }
    }

    const processingTimeMs = Date.now() - startTime;

    return {
      imported,
      failed: errors.length,
      skipped: errors.filter((e) => e.message.includes("Doublon")).length,
      processingTimeMs,
      errors,
    };
  });
}
