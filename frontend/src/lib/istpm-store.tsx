/**
 * Store de données ISTPM — source unique : le backend.
 *
 * Chaque collection est chargée depuis l'API au montage (`refresh()`), et
 * chaque écriture attend la réponse serveur avant d'être appliquée : aucun
 * contenu de démonstration, aucun miroir localStorage, aucune écriture
 * fantôme. Les agrégats (dashboard, financier, répartitions) sont dérivés
 * des lignes serveur. En cas d'échec réseau, `syncFailed` permet d'afficher
 * un bandeau explicite au lieu de données inventées.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import {
  FILIERE_COURT,
  type Etudiant,
  type Filiere,
  type Formateur,
  type GroupConfig,
  type Examen,
  type Bulletin,
  type Stage,
  type Seance,
  parseCreneaux,
  type Creneau,
  minutesDepuisMinuit,
  ajouterMinutes,
  type ModuleRecord,
  type LignePaiement,
  type NoteModule,
  type PaiementLigne,
  type StatutPaiement,
  type PaiementMensuel,
  type Mention,
  type Decision,
  type ExamDocument,
  type StructureAccueil,
} from "@/lib/istpm-data";
import {
  fetchEtudiants as apiFetchEtudiants,
  createEtudiant as apiCreateEtudiant,
  updateEtudiant as apiUpdateEtudiant,
  deleteEtudiant as apiDeleteEtudiant,
  restoreEtudiant as apiRestoreEtudiant,
  fetchFormateurs as apiFetchFormateurs,
  createFormateur as apiCreateFormateur,
  updateFormateur as apiUpdateFormateur,
  deleteFormateur as apiDeleteFormateur,
  archiveFormateur as apiArchiveFormateur,
  restoreFormateur as apiRestoreFormateur,
  fetchGroupConfigs as apiFetchGroupConfigs,
  createGroupConfig as apiCreateGroupConfig,
  updateGroupConfig as apiUpdateGroupConfig,
  deleteGroupConfig as apiDeleteGroupConfig,
  fetchExamens as apiFetchExamens,
  createExamen as apiCreateExamen,
  updateExamen as apiUpdateExamen,
  deleteExamen as apiDeleteExamen,
  saveNotesExamenApi,
  uploadExamenDocumentApi,
  deleteExamenDocumentApi,
  fetchBulletins as apiFetchBulletins,
  updateBulletin as apiUpdateBulletin,
  publierBulletinApi,
  publierTousBulletinsApi,
  fetchStages as apiFetchStages,
  createStage as apiCreateStage,
  updateStage as apiUpdateStage,
  deleteStage as apiDeleteStage,
  createPaiementsMensuels as apiCreatePaiementsMensuels,
  updatePaiementMensuel as apiUpdatePaiementMensuel,
  fetchPaiementsMensuels as apiFetchPaiementsMensuels,
  createNote as apiCreateNote,
  deleteNote as apiDeleteNote,
  createFiliereApi,
  fetchFilieres as apiFetchFilieres,
  deleteFiliereApi,
  createStructureApi,
  updateStructureApi,
  deleteStructureApi,
  fetchStructuresApi as apiFetchStructures,
  fetchStageServicesApi as apiFetchStageServices,
  createStageServiceApi as apiCreateStageService,
  updateStageServiceApi as apiUpdateStageService,
  deleteStageServiceApi as apiDeleteStageService,
  fetchModulesApi,
  createModuleApi,
  updateModuleApi,
  deleteModuleApi,
  fetchSeances as apiFetchSeances,
  fetchSettings,
  updateSetting,
  createSeance as apiCreateSeance,
  updateSeance as apiUpdateSeance,
  deleteSeance as apiDeleteSeance,
  fetchHolidays as apiFetchHolidays,
  fetchVacations as apiFetchVacations,
  fetchExceptions as apiFetchExceptions,
  openAttendanceSession as apiOpenAttendanceSession,
  fetchAttendanceSession as apiFetchAttendanceSession,
  closeAttendanceSession as apiCloseAttendanceSession,
  fetchSeanceAttendance as apiFetchSeanceAttendance,
  saveAttendanceBulk as apiSaveAttendanceBulk,
  type PaiementMensuelApi,
  type HolidayRow,
  type VacationRow,
  type CalendarExceptionRow,
  type AttendanceEntry,
} from "@/lib/istpm-api";
import { useAuth, getStoredRole } from "@/lib/auth";

/* ------------------------------------------------------------------ */
/*  Instantané (toujours issu du serveur, jamais de démonstration)      */
/* ------------------------------------------------------------------ */

type Snapshot = {
  etudiants: Etudiant[];
  formateurs: Formateur[];
  examens: Examen[];
  bulletins: Bulletin[];
  stages: Stage[];
  seances: Seance[];
  filieres: string[];
  structuresAccueil: StructureAccueil[];
  /** Services de stage libres (créables depuis le formulaire de stage). */
  servicesStage: string[];
  modules: ModuleRecord[];
  groupConfigs: GroupConfig[];
  /** Créneaux horaires, au format libellé des Paramètres (« 08:30 – 10:00 »). */
  creneaux: string[];
  /** Jours chômés (fériés + vacances + exceptions) issus de l'API. */
  joursChomes: { date: string; nom: string; type: "ferie" | "vacances" }[];
};

/** Collections vides : l'unique source est le backend (`refresh()` au montage). */
function emptySnapshot(): Snapshot {
  return {
    etudiants: [],
    formateurs: [],
    examens: [],
    bulletins: [],
    stages: [],
    seances: [],
    filieres: [],
    structuresAccueil: [],
    servicesStage: [],
    modules: [],
    groupConfigs: [],
    creneaux: [],
    joursChomes: [],
  };
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Moyenne pondérée par coefficient, arrondie au centième. */
export function moyennePonderee(notes: NoteModule[]): number {
  const totalCoef = notes.reduce((s, n) => s + n.coef, 0);
  if (!totalCoef) return 0;
  const somme = notes.reduce((s, n) => s + n.note * n.coef, 0);
  return Math.round((somme / totalCoef) * 100) / 100;
}

export function mentionFor(moy: number): Mention {
  if (moy >= 16) return "Très bien";
  if (moy >= 14) return "Bien";
  if (moy >= 12) return "Assez bien";
  return "Passable";
}

export function decisionFor(moy: number, notes: NoteModule[]): Decision {
  if (moy < 10) return "Ajourné";
  const echecs = notes.filter((n) => n.note < 10).length;
  if (echecs === 0) return "Admis";
  return echecs <= 1 ? "Admis avec dette" : "Rattrapage";
}

/* ------------------------------------------------------------------ */
/*  Normalisation des lignes serveur (numeric → number, valeurs sûres)  */
/* ------------------------------------------------------------------ */

function num(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function normNoteModule(n: Record<string, unknown>): NoteModule {
  return {
    id: String(n.id ?? ""),
    module: String(n.module ?? ""),
    note: num(n.note),
    coef: num(n.coef, 1),
    credits: num(n.credits),
    examen: (n.examen as string) || undefined,
  };
}

function normPaiementRecord(r: PaiementMensuelApi): PaiementMensuel {
  const mode = ["Espèces", "Virement", "Carte", "Chèque"].includes(String(r.mode))
    ? (r.mode as PaiementMensuel["mode"])
    : "Espèces";
  const statut = (["paye", "en_attente", "retard", "impaye"] as const).includes(
    r.statut as PaiementMensuel["statut"],
  )
    ? (r.statut as PaiementMensuel["statut"])
    : "en_attente";
  return {
    id: String(r.id),
    etudiantId: String(r.etudiantId),
    mois: String(r.mois ?? ""),
    montantDu: num(r.montantDu),
    montantPaye: num(r.montantPaye),
    datePaiement: String(r.datePaiement ?? ""),
    mode,
    recu: String(r.recu ?? ""),
    statut,
    notes: String(r.notes ?? ""),
  };
}

function historiqueDepuisRecords(records: PaiementMensuel[]): LignePaiement[] {
  return records.map((r) => ({
    id: r.id,
    date: r.datePaiement,
    montant: r.montantPaye,
    mode: r.mode as LignePaiement["mode"],
    periode: r.mois,
    recu: r.recu,
    statut: r.statut as LignePaiement["statut"],
    mois: r.mois,
  }));
}

/** Statut global déduit des lignes canoniques (jamais inventé). */
function statutPaiementGlobal(statuts: StatutPaiement[]): StatutPaiement {
  if (statuts.length > 0 && statuts.every((s) => s === "paye")) return "paye";
  if (statuts.some((s) => s === "retard")) return "retard";
  if (statuts.some((s) => s === "impaye")) return "impaye";
  return "en_attente";
}

function normEtudiant(raw: Record<string, unknown>, records: PaiementMensuel[]): Etudiant {
  const notes = Array.isArray(raw.notes)
    ? (raw.notes as Record<string, unknown>[]).map(normNoteModule)
    : [];
  const histo = Array.isArray(raw.historique) ? raw.historique as Record<string, unknown>[] : [];
  const historique: LignePaiement[] = histo.length
    ? histo.map((h) => ({
        id: String(h.id ?? ""),
        date: String(h.date ?? ""),
        montant: num(h.montant),
        mode: String(h.mode ?? "") as LignePaiement["mode"],
        periode: String(h.periode ?? h.mois ?? ""),
        recu: String(h.recu ?? ""),
        statut: String(h.statut ?? "") as LignePaiement["statut"],
        mois: h.mois !== undefined ? String(h.mois) : "",
      }))
    : historiqueDepuisRecords(records);
  return {
    id: String(raw.id ?? ""),
    cne: String(raw.cne ?? ""),
    matricule: String(raw.matricule ?? ""),
    prenom: String(raw.prenom ?? ""),
    nom: String(raw.nom ?? ""),
    filiere: String(raw.filiere ?? ""),
    niveau: String(raw.niveau ?? ""),
    annee: String(raw.annee ?? ""),
    groupe: String(raw.groupe ?? ""),
    statut: String(raw.statut ?? "inscrit"),
    paiement: String(raw.paiement ?? "en_attente"),
    moyenne: num(raw.moyenne),
    telephone: String(raw.telephone ?? ""),
    email: String(raw.email ?? ""),
    dateNaissance: String(raw.dateNaissance ?? raw.date_naissance ?? ""),
    ville: String(raw.ville ?? ""),
    photoUrl: String(raw.photoUrl ?? (raw as { photo_url?: string }).photo_url ?? ""),
    fraisMensuels: num(raw.fraisMensuels ?? Math.round(num(raw.fraisAnnuels) / 10)),
    notes,
    historique,
    paiementsMensuels: (raw.paiementsMensuels ?? {}) as Etudiant["paiementsMensuels"],
    paiementsMensuelsRecords: records,
    archived: raw.archived === true,
    stageEnCours: (raw.stageEnCours as string | undefined) ?? undefined,
  } as Etudiant;
}

function normStage(raw: Record<string, unknown>): Stage {
  return {
    ...(raw as unknown as Stage),
    id: String(raw.id ?? ""),
    noteSoutenance: raw.noteSoutenance == null || raw.noteSoutenance === "" ? undefined : num(raw.noteSoutenance),
  } as Stage;
}

function normExamen(raw: Record<string, unknown>): Examen {
  const doc = raw.document as Record<string, unknown> | null | undefined;
  return {
    ...(raw as unknown as Examen),
    id: String(raw.id ?? ""),
    duree: num(raw.duree, 120),
    etudiantsConvoques: num(raw.etudiantsConvoques),
    document: doc
      ? {
          id: String(doc.id ?? ""),
          nom: String(doc.nom ?? ""),
          taille: num(doc.taille),
          mime: String(doc.mime ?? ""),
          uploadedAt: String(doc.uploadedAt ?? ""),
        }
      : undefined,
  } as Examen;
}

function normBulletin(raw: Record<string, unknown>): Bulletin {
  return {
    ...(raw as unknown as Bulletin),
    id: String(raw.id ?? ""),
    moyenne: num(raw.moyenne),
    evaluationClinique: num(raw.evaluationClinique),
    notes: Array.isArray(raw.notes)
      ? (raw.notes as Record<string, unknown>[]).map(normNoteModule)
      : [],
  } as Bulletin;
}

function normModule(raw: Record<string, unknown>): ModuleRecord {
  return {
    id: String(raw.id ?? ""),
    nom: String(raw.nom ?? ""),
    filiere: String(raw.filiere ?? ""),
    code: (raw.code as string) ?? null,
    description: (raw.description as string) ?? null,
    volumeHoraire: raw.volumeHoraire == null ? null : num(raw.volumeHoraire),
    coefficient: (raw.coefficient as string | number) ?? null,
  } as ModuleRecord;
}

/** Jours chômés : fériés + vacances (plages éclatées) + exceptions. */
function construireJoursChomes(
  holidays: HolidayRow[],
  vacations: VacationRow[],
  exceptions: CalendarExceptionRow[],
): Snapshot["joursChomes"] {
  const out: Snapshot["joursChomes"] = [];
  const seen = new Set<string>();
  const push = (date: string, nom: string, type: "ferie" | "vacances") => {
    const d = date.slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || seen.has(d)) return;
    seen.add(d);
    out.push({ date: d, nom, type });
  };
  for (const h of holidays ?? []) push(String(h.date ?? ""), String(h.label ?? ""), "ferie");
  for (const v of vacations ?? []) {
    const debut = String(v.startDate ?? "").slice(0, 10);
    const fin = String(v.endDate ?? "").slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(debut) || !/^\d{4}-\d{2}-\d{2}$/.test(fin)) continue;
    // Itère en UTC pour éviter les décalages de fuseau, plafonné à 120 jours.
    let t = Date.parse(`${debut}T00:00:00Z`);
    const end = Date.parse(`${fin}T00:00:00Z`);
    for (let i = 0; i < 120 && t <= end; i += 1, t += 86_400_000) {
      push(new Date(t).toISOString().slice(0, 10), String(v.label ?? ""), "vacances");
    }
  }
  for (const x of exceptions ?? []) push(String(x.date ?? ""), String(x.label ?? ""), "vacances");
  return out;
}

/* ------------------------------------------------------------------ */
/*  Types d'entrée (création)                                          */
/* ------------------------------------------------------------------ */

export type NouvelEtudiant = Omit<
  Etudiant,
  "id" | "moyenne" | "notes" | "historique" | "paiementsMensuels" | "paiementsMensuelsRecords" | "archived"
>;
export type NouveauFormateur = Omit<Formateur, "id" | "notesSaisies">;
/** `createdBy` et `document` sont posés par le store, pas par le formulaire. */
export type NouvelExamen = Omit<Examen, "id" | "createdBy" | "document">;
export type NouveauStage = Omit<Stage, "id">;

/** Une note saisie pour un examen, par étudiant. */
export type SaisieNote = {
  etudiantId: string;
  theorique?: number;
  pratique?: number;
};

/* ------------------------------------------------------------------ */
/*  Contexte                                                           */
/* ------------------------------------------------------------------ */

export type NouvelleSeance = Omit<Seance, 'id'>;

/** Ressource déjà occupée sur le créneau visé. */
export type Conflit = { type: 'professeur' | 'salle' | 'groupe'; seance: Seance };

/** Séance projetée, avant enregistrement. */
export type ConflitCandidate = Pick<
  Seance,
  'date' | 'debut' | 'fin' | 'professeurId' | 'salle' | 'groupe'
>;

type IstpmCtx = {
  etudiants: Etudiant[];
  formateurs: Formateur[];
  examens: Examen[];
  bulletins: Bulletin[];
  stages: Stage[];
  seances: Seance[];
  filieres: string[];
  structuresAccueil: StructureAccueil[];
  /** Services de stage libres (créables depuis le formulaire de stage). */
  servicesStage: string[];
  modules: ModuleRecord[];
  groupConfigs: GroupConfig[];
  /** Libellés bruts des créneaux, tels qu'édités dans les Paramètres. */
  creneauxLabels: string[];
  /** Créneaux exploitables, triés par heure de début. */
  creneaux: Creneau[];
  setCreneaux: (labels: string[]) => Promise<void>;
  /** Jours chômés issus de l'API (fériés + vacances + exceptions). */
  joursChomes: { date: string; nom: string; type: "ferie" | "vacances" }[];
  /** Chargement initial en cours. */
  loading: boolean;
  /** Dernier rafraîchissement en échec (backend injoignable) : afficher un bandeau, pas des données. */
  syncFailed: boolean;
  /** Recharge tout depuis le backend (remplace l'ancien `reset()` de démo). */
  refresh: () => Promise<void>;

  /** Photo d'identité d'un étudiant, résolue par id ou par CNE (ou `undefined`). */
  photoDe: (cleOuCne: string | undefined | null) => string | undefined;

  /* Dérivés */
  paiements: PaiementLigne[];
  dashboard: {
    totalInscrits: number;
    deltaSemestre: number;
    formateursActifs: number;
    tauxReussite: number;
    totalARecouvrer: number;
  };
  financier: {
    encaisse: number;
    encaisseCeMois: number;
    enAttente: number;
    impaye: number;
    retard: number;
    tauxRecouvrement: number;
  };
  repartitionFiliere: { name: string; filiere: string; value: number }[];
  repartitionNiveau: { name: string; value: number }[];
  reussiteFiliere: { name: string; filiere: string; value: number }[];
  etudiantsARisque: Etudiant[];
  aRelancer: Etudiant[];
  aTraiter: {
    examensAVenir: number;
    bulletinsAPublier: number;
    stagesAValider: number;
  };

  /* Actions (toutes attendent le serveur ; rejet = erreur à afficher) */
  addEtudiant: (data: NouvelEtudiant) => Promise<Etudiant>;
  updateEtudiant: (id: string, patch: Partial<Etudiant>) => Promise<Etudiant>;
  deleteEtudiant: (id: string) => Promise<void>;
  restoreEtudiant: (id: string) => Promise<void>;

  addFormateur: (data: NouveauFormateur) => Promise<Formateur>;
  updateFormateur: (id: string, patch: Partial<Formateur>) => Promise<Formateur>;
  deleteFormateur: (id: string) => Promise<void>;
  archiveFormateur: (id: string, groupReassignments: Array<{ groupName: string; targetFormateurId: string }>, filiereReassignment?: { targetFormateurId: string }) => Promise<void>;
  restoreFormateur: (id: string) => Promise<void>;

  addGroupConfig: (data: { name: string; semester: string; studentCount?: number }) => Promise<GroupConfig>;
  updateGroupConfig: (id: string, patch: { name?: string; semester?: string; studentCount?: number }) => Promise<GroupConfig>;
  deleteGroupConfig: (id: string) => Promise<void>;

  /** `createdBy` reçoit `auteurId`   l'auteur est toujours enregistré. */
  addExamen: (data: NouvelExamen, auteurId: string) => Promise<Examen>;
  updateExamen: (id: string, patch: Partial<Examen>) => Promise<Examen>;
  deleteExamen: (id: string) => Promise<void>;
  saveNotesExamen: (examenId: string, saisies: SaisieNote[]) => Promise<number>;
  /** Dépose le sujet sur le serveur (MinIO) ; l'aperçu relit le serveur. */
  attachDocument: (examenId: string, file: File) => Promise<void>;
  removeDocument: (examenId: string) => Promise<void>;

  updateBulletin: (id: string, patch: Partial<Bulletin>) => Promise<void>;
  publierBulletin: (id: string) => Promise<void>;
  publierTousBulletins: () => Promise<number>;

  addStage: (data: NouveauStage) => Promise<Stage>;
  updateStage: (id: string, patch: Partial<Stage>) => Promise<Stage>;
  deleteStage: (id: string) => Promise<void>;

  payerMois: (
    etudiantId: string,
    mois: string[],
    details: {
      montant: number;
      mode: "Espèces" | "Virement" | "Carte" | "Chèque";
      date: string;
      recu?: string;
      notes?: string;
    },
  ) => Promise<void>;

  updatePaiementMensuel: (
    id: string,
    etudiantId: string,
    patch: Partial<{
      montantPaye: number;
      datePaiement: string;
      mode: "Espèces" | "Virement" | "Carte" | "Chèque";
      recu: string;
      statut: StatutPaiement;
      notes: string;
    }>,
  ) => Promise<void>;

  /** Enregistre une note (module + examen) pour un étudiant et recalcule sa moyenne. */
  addNote: (etudiantId: string, note: NoteModule) => Promise<void>;
  deleteNote: (id: string, etudiantId: string) => Promise<void>;

  addFiliere: (nom: string) => Promise<void>;
  deleteFiliere: (nom: string) => Promise<void>;

  addStructureAccueil: (nom: string, capacite?: number) => Promise<void>;
  updateStructureAccueil: (oldName: string, body: { nouveauNom?: string; capacite?: number }) => Promise<void>;
  deleteStructureAccueil: (nom: string) => Promise<void>;

  /** Persiste un service de stage libre (dropdown créable). */
  addServiceStage: (nom: string) => Promise<void>;
  updateServiceStage: (nom: string, body: { nouveauNom?: string }) => Promise<void>;
  deleteServiceStage: (nom: string) => Promise<void>;

  addModule: (data: Omit<ModuleRecord, "id">) => Promise<ModuleRecord>;
  updateModule: (id: string, data: Omit<ModuleRecord, "id">) => Promise<ModuleRecord>;
  deleteModule: (id: string) => Promise<void>;

  addSeance: (data: NouvelleSeance, force?: boolean) => Promise<Seance>;
  updateSeance: (id: string, patch: Partial<Seance>, force?: boolean) => Promise<Seance>;
  deleteSeance: (id: string) => Promise<void>;
  /** Glisser-déposer : conserve la durée, ne change que le départ. */
  moveSeance: (id: string, date: string, debut: string, force?: boolean) => Promise<void>;
  conflitsSeance: (c: ConflitCandidate, ignorerId?: string) => Conflit[];

  /* Appel en séance (roll-call) */
  openSession: (seanceId: string) => Promise<{ id: string }>;
  fetchSession: (seanceId: string) => Promise<{ id: string } | null>;
  closeSession: (sessionId: string) => Promise<void>;
  fetchPresences: (seanceId: string) => Promise<AttendanceEntry[]>;
  savePresences: (seanceId: string, entries: AttendanceEntry[]) => Promise<void>;
};

const Ctx = createContext<IstpmCtx | null>(null);

export function IstpmProvider({ children }: { children: ReactNode }) {
  // Source unique : le backend. L'état démarre vide ; `refresh()` le remplit
  // au montage. Aucun seed, aucun miroir localStorage.
  const [snap, setSnap] = useState<Snapshot>(emptySnapshot);
  const [loading, setLoading] = useState(true);
  const [syncFailed, setSyncFailed] = useState(false);
  // Miroir lecture pour les actions async (lecture avant `await`, sans écrire).
  const snapRef = useRef(snap);
  snapRef.current = snap;

  // Synchronisation serveur : remplacement intégral, jamais de fusion locale.
  // Échec réseau = `syncFailed` (bandeau explicite), jamais de données inventées.
  const refresh = useCallback(async () => {
    setLoading(true);
    setSyncFailed(false);
    try {
      const [
        etudiantsRaw,
        formateursRaw,
        examensRaw,
        bulletinsRaw,
        stagesRaw,
        seancesRaw,
        structuresRaw,
        servicesRaw,
        reglages,
        mensuelsRaw,
        holidaysRaw,
        vacationsRaw,
        exceptionsRaw,
        modulesRaw,
        filieresRaw,
        groupsRaw,
      ] = await Promise.all([
        apiFetchEtudiants(),
        apiFetchFormateurs(),
        apiFetchExamens(),
        apiFetchBulletins(),
        apiFetchStages(),
        apiFetchSeances(),
        apiFetchStructures(),
        apiFetchStageServices(),
        fetchSettings().catch(() => ({}) as Record<string, unknown>),
        apiFetchPaiementsMensuels().catch(() => [] as PaiementMensuelApi[]),
        apiFetchHolidays().catch(() => [] as HolidayRow[]),
        apiFetchVacations().catch(() => [] as VacationRow[]),
        apiFetchExceptions().catch(() => [] as CalendarExceptionRow[]),
        fetchModulesApi().catch(() => [] as ModuleRecord[]),
        apiFetchFilieres().catch(() => [] as string[]),
        apiFetchGroupConfigs().catch(() => [] as GroupConfig[]),
      ]);

      const recordsByEtudiant = new Map<string, PaiementMensuel[]>();
      for (const r of mensuelsRaw as PaiementMensuelApi[]) {
        const rec = normPaiementRecord(r);
        const list = recordsByEtudiant.get(rec.etudiantId) ?? [];
        list.push(rec);
        recordsByEtudiant.set(rec.etudiantId, list);
      }

      const etudiants = (etudiantsRaw as unknown as Record<string, unknown>[]).map((raw) => {
        const id = String(raw.id ?? "");
        return normEtudiant(raw, recordsByEtudiant.get(id) ?? []);
      });

      setSnap({
        etudiants,
        formateurs: (formateursRaw as unknown as Record<string, unknown>[]).map((f) => ({
          ...(f as unknown as Formateur),
          id: String(f.id ?? ""),
          notesSaisies: num((f as { notesSaisies?: unknown }).notesSaisies),
          archived: (f as { archived?: unknown }).archived === true,
        })),
        examens: (examensRaw as unknown as Record<string, unknown>[]).map(normExamen),
        bulletins: (bulletinsRaw as unknown as Record<string, unknown>[]).map(normBulletin),
        stages: (stagesRaw as unknown as Record<string, unknown>[]).map(normStage),
        seances: (seancesRaw as unknown as Record<string, unknown>[]).map((s) => ({
          ...(s as unknown as Seance),
          id: String(s.id ?? ""),
        })),
        filieres: (filieresRaw as string[]).map(String),
        structuresAccueil: (structuresRaw as StructureAccueil[]) ?? [],
        servicesStage: [...(servicesRaw as string[])].sort((a, b) => a.localeCompare(b)),
        modules: (modulesRaw as unknown as Record<string, unknown>[]).map(normModule),
        groupConfigs: (groupsRaw as GroupConfig[]) ?? [],
        creneaux: Array.isArray(reglages.creneaux) ? (reglages.creneaux as string[]) : [],
        joursChomes: construireJoursChomes(
          holidaysRaw as HolidayRow[],
          vacationsRaw as VacationRow[],
          exceptionsRaw as CalendarExceptionRow[],
        ),
      });
    } catch {
      setSyncFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Re-synchronise les photos d'identité étudiant en tâche de fond : la
  // synchro principale ne tourne qu'au montage, donc une photo téléversée
  // depuis l'espace étudiant n'apparaissait côté staff qu'après un rechargement
  // complet. On la ré-applique quand l'onglet redevient actif et toutes les
  // ~45 s. Léger : un seul GET, on ne touche que `photoUrl`.
  useEffect(() => {
    let stop = false;
    let last = 0;
    const resyncPhotos = async () => {
      if (stop || Date.now() - last < 30_000) return;
      // Réservé au staff : `GET /etudiants` répond 404 pour un étudiant.
      if (getStoredRole() === "etudiant") return;
      if (typeof document !== "undefined" && document.visibilityState === "hidden")
        return;
      last = Date.now();
      try {
        const rows = (await apiFetchEtudiants()) as Record<string, unknown>[];
        const byKey = new Map<string, string>();
        for (const r of rows) {
          const url = String(
            (r as { photoUrl?: string }).photoUrl ??
              (r as { photo_url?: string }).photo_url ??
              "",
          ).trim();
          if (!url) continue;
          if (r.id) byKey.set(String(r.id), url);
          if (r.cne) byKey.set(`cne:${String(r.cne)}`, url);
        }
        if (!byKey.size || stop) return;
        setSnap((s) => {
          let changed = false;
          const etudiants = s.etudiants.map((e) => {
            const u =
              byKey.get(e.id) ?? (e.cne ? byKey.get(`cne:${e.cne}`) : undefined);
            if (u && u !== e.photoUrl) {
              changed = true;
              return { ...e, photoUrl: u };
            }
            return e;
          });
          return changed ? { ...s, etudiants } : s;
        });
      } catch {
        /* hors ligne : on garde ce qu'on a */
      }
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") void resyncPhotos();
    };
    const onFocus = () => void resyncPhotos();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onFocus);
    const id = window.setInterval(() => void resyncPhotos(), 45_000);
    return () => {
      stop = true;
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onFocus);
      window.clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------------- Étudiants ---------------- */

  const addEtudiant = useCallback(
    async (data: NouvelEtudiant) => {
      const saved = await apiCreateEtudiant(data as unknown as Record<string, unknown>);
      const etudiant = normEtudiant(saved as unknown as Record<string, unknown>, []);
      setSnap((s) => ({ ...s, etudiants: [etudiant, ...s.etudiants] }));
      return etudiant;
    },
    [],
  );

  const updateEtudiant = useCallback(async (id: string, patch: Partial<Etudiant>) => {
    const saved = await apiUpdateEtudiant(id, patch as unknown as Record<string, unknown>);
    const etudiant = normEtudiant(
      { ...(saved as unknown as Record<string, unknown>), id },
      [],
    );
    // Conserve les lignes de paiement/notes déjà chargées (le PUT ne les renvoie pas).
    setSnap((s) => ({
      ...s,
      etudiants: s.etudiants.map((e) =>
        e.id === id
          ? {
              ...etudiant,
              notes: e.notes,
              historique: e.historique,
              paiementsMensuels: e.paiementsMensuels,
              paiementsMensuelsRecords: e.paiementsMensuelsRecords,
            }
          : e,
      ),
    }));
    return etudiant;
  }, []);

  const deleteEtudiant = useCallback(async (id: string) => {
    await apiDeleteEtudiant(id);
    setSnap((s) => ({
      ...s,
      etudiants: s.etudiants.map((e) => (e.id === id ? { ...e, archived: true } : e)),
    }));
  }, []);

  const restoreEtudiant = useCallback(async (id: string) => {
    await apiRestoreEtudiant(id);
    setSnap((s) => ({
      ...s,
      etudiants: s.etudiants.map((e) => (e.id === id ? { ...e, archived: false } : e)),
    }));
  }, []);

  /* ---------------- Formateurs ---------------- */

  const addFormateur = useCallback(async (data: NouveauFormateur) => {
    const saved = await apiCreateFormateur(data as unknown as Record<string, unknown>);
    const formateur = saved as unknown as Formateur;
    setSnap((s) => ({ ...s, formateurs: [formateur, ...s.formateurs] }));
    return formateur;
  }, []);

  const updateFormateur = useCallback(async (id: string, patch: Partial<Formateur>) => {
    const saved = await apiUpdateFormateur(id, patch as unknown as Record<string, unknown>);
    const formateur = saved as unknown as Formateur;
    setSnap((s) => ({
      ...s,
      formateurs: s.formateurs.map((f) => (f.id === id ? formateur : f)),
    }));
    return formateur;
  }, []);

  const deleteFormateur = useCallback(async (id: string) => {
    await apiDeleteFormateur(id);
    setSnap((s) => ({
      ...s,
      formateurs: s.formateurs.filter((f) => f.id !== id),
    }));
  }, []);

  const archiveFormateur = useCallback(
    async (
      id: string,
      groupReassignments: Array<{ groupName: string; targetFormateurId: string }>,
      filiereReassignment?: { targetFormateurId: string },
    ) => {
      // Le serveur réassigne dans la même transaction ; on miroite le résultat.
      await apiArchiveFormateur(id, { groupReassignments, filiereReassignment });
      setSnap((s) => {
        let formateurs = s.formateurs.map((f) =>
          f.id === id ? { ...f, archived: true } : f,
        );
        // Reassign groups in the store
        for (const r of groupReassignments) {
          const target = formateurs.find((f) => f.id === r.targetFormateurId);
          if (target && !target.groupes.includes(r.groupName)) {
            formateurs = formateurs.map((f) =>
              f.id === r.targetFormateurId
                ? { ...f, groupes: [...f.groupes, r.groupName] }
                : f,
            );
          }
          formateurs = formateurs.map((f) =>
            f.id === id
              ? { ...f, groupes: f.groupes.filter((g) => g !== r.groupName) }
              : f,
          );
        }
        return { ...s, formateurs };
      });
    },
    [],
  );

  const restoreFormateur = useCallback(async (id: string) => {
    await apiRestoreFormateur(id);
    setSnap((s) => ({
      ...s,
      formateurs: s.formateurs.map((f) =>
        f.id === id ? { ...f, archived: false } : f,
      ),
    }));
  }, []);

  /* ---------------- Group Configs ---------------- */

  const addGroupConfig = useCallback(
    async (data: { name: string; semester: string; studentCount?: number }) => {
      const saved = await apiCreateGroupConfig(data);
      const config = saved as unknown as GroupConfig;
      setSnap((s) => ({ ...s, groupConfigs: [...s.groupConfigs, config] }));
      return config;
    },
    [],
  );

  const updateGroupConfig = useCallback(
    async (id: string, patch: { name?: string; semester?: string; studentCount?: number }) => {
      const saved = await apiUpdateGroupConfig(id, patch);
      const config = saved as unknown as GroupConfig;
      setSnap((s) => ({
        ...s,
        groupConfigs: s.groupConfigs.map((g) => (g.id === id ? config : g)),
      }));
      return config;
    },
    [],
  );

  const deleteGroupConfig = useCallback(async (id: string) => {
    await apiDeleteGroupConfig(id);
    setSnap((s) => ({
      ...s,
      groupConfigs: s.groupConfigs.filter((g) => g.id !== id),
    }));
  }, []);

  /* ---------------- Examens ---------------- */

  const addExamen = useCallback(async (data: NouvelExamen, auteurId: string) => {
    const saved = await apiCreateExamen({ ...(data as unknown as Record<string, unknown>), createdBy: auteurId });
    const examen = normExamen(saved as unknown as Record<string, unknown>);
    setSnap((s) => ({ ...s, examens: [examen, ...s.examens] }));
    return examen;
  }, []);

  const updateExamen = useCallback(async (id: string, patch: Partial<Examen>) => {
    const saved = await apiUpdateExamen(id, patch as unknown as Record<string, unknown>);
    const examen = normExamen(saved as unknown as Record<string, unknown>);
    setSnap((s) => ({
      ...s,
      examens: s.examens.map((x) => (x.id === id ? examen : x)),
    }));
    return examen;
  }, []);

  const deleteExamen = useCallback(async (id: string) => {
    await apiDeleteExamen(id);
    setSnap((s) => ({ ...s, examens: s.examens.filter((x) => x.id !== id) }));
  }, []);

  const MAX_DOC_OCTETS = 10 * 1024 * 1024;

  const attachDocument = useCallback(async (examenId: string, file: File) => {
    if (file.size > MAX_DOC_OCTETS) {
      throw new Error(
        `Fichier trop volumineux (max ${Math.round(MAX_DOC_OCTETS / 1024 / 1024)} Mo)`,
      );
    }
    // Le serveur persiste dans MinIO et renvoie les métadonnées canoniques.
    const saved = await uploadExamenDocumentApi(examenId, file);
    setSnap((s) => ({
      ...s,
      examens: s.examens.map((x) =>
        x.id === examenId ? normExamen(saved as unknown as Record<string, unknown>) : x,
      ),
    }));
  }, []);

  const removeDocument = useCallback(async (examenId: string) => {
    await deleteExamenDocumentApi(examenId);
    setSnap((s) => ({
      ...s,
      examens: s.examens.map((x) =>
        x.id === examenId ? { ...x, document: undefined } : x,
      ),
    }));
  }, []);

  /**
   * Persist note entry for an exam.
   *
   * Writes one `NoteModule` per student (theory and practical averaged when
   * the exam assesses both), recomputes each student's overall average, marks
   * the exam as `notes_saisies`, and credits the entry to the surveilling
   * formateurs. Returns how many students were recorded.
   */
  const saveNotesExamen = useCallback(
    async (examenId: string, saisies: SaisieNote[]) => {
      const retenues = saisies.filter(
        (s) => s.theorique !== undefined || s.pratique !== undefined,
      );
      if (!retenues.length) return 0;

      // Le serveur enregistre et recalcule ; le miroir local suit après succès.
      await saveNotesExamenApi(
        examenId,
        retenues.map((s) => ({ etudiantId: s.etudiantId, theorique: s.theorique, pratique: s.pratique })),
      );

      setSnap((s) => {
        const examen = s.examens.find((x) => x.id === examenId);
        if (!examen) return s;

        const etudiants = s.etudiants.map((e) => {
          const saisie = retenues.find((r) => r.etudiantId === e.id);
          if (!saisie) return e;

          const parts = [saisie.theorique, saisie.pratique].filter(
            (n): n is number => n !== undefined,
          );
          const note =
            Math.round(
              (parts.reduce((a, b) => a + b, 0) / parts.length) * 100,
            ) / 100;

          const existante = e.notes.find((n) => n.module === examen.module);
          const notes = existante
            ? e.notes.map((n) =>
                n.module === examen.module ? { ...n, note } : n,
              )
            : [...e.notes, { module: examen.module, note, coef: 3, credits: 6 }];

          return { ...e, notes, moyenne: moyennePonderee(notes) };
        });

        return {
          ...s,
          etudiants,
          examens: s.examens.map((x) =>
            x.id === examenId ? { ...x, statut: "notes_saisies" as const } : x,
          ),
          formateurs: s.formateurs.map((f) => {
            const svName = `${f.prenom[0]}. ${f.nom}`;
            return examen.surveillants.includes(svName)
              ? { ...f, notesSaisies: f.notesSaisies + retenues.length }
              : f;
          }),
        };
      });

      return retenues.length;
    },
    [],
  );

  /* ---------------- Bulletins ---------------- */

  const updateBulletin = useCallback(async (id: string, patch: Partial<Bulletin>) => {
    await apiUpdateBulletin(id, patch as unknown as Record<string, unknown>);
    setSnap((s) => ({
      ...s,
      bulletins: s.bulletins.map((b) =>
        b.id === id ? { ...b, ...patch } : b,
      ),
    }));
  }, []);

  const publierBulletin = useCallback(async (id: string) => {
    await publierBulletinApi(id);
    setSnap((s) => ({
      ...s,
      bulletins: s.bulletins.map((b) =>
        b.id === id ? { ...b, statut: "publie" as const } : b,
      ),
    }));
  }, []);

  const publierTousBulletins = useCallback(async () => {
    const count = snap.bulletins.filter((b) => b.statut !== "publie").length;
    await publierTousBulletinsApi();
    setSnap((s) => ({
      ...s,
      bulletins: s.bulletins.map((b) => ({ ...b, statut: "publie" as const })),
    }));
    return count;
  }, [snap.bulletins]);

  /* ---------------- Stages ---------------- */

  const addStage = useCallback(async (data: NouveauStage) => {
    const saved = await apiCreateStage(data as unknown as Record<string, unknown>);
    const stage = normStage(saved as unknown as Record<string, unknown>);
    setSnap((s) => ({ ...s, stages: [stage, ...s.stages] }));
    return stage;
  }, []);

  const updateStage = useCallback(async (id: string, patch: Partial<Stage>) => {
    const saved = await apiUpdateStage(id, patch as unknown as Record<string, unknown>);
    const stage = normStage({ ...(saved as unknown as Record<string, unknown>), id });
    setSnap((s) => ({
      ...s,
      stages: s.stages.map((st) => (st.id === id ? stage : st)),
    }));
    return stage;
  }, []);

  const deleteStage = useCallback(async (id: string) => {
    await apiDeleteStage(id);
    setSnap((s) => ({ ...s, stages: s.stages.filter((st) => st.id !== id) }));
  }, []);

  /* ---------------- Paiements mensuels ---------------- */

  /** Recharge les lignes canoniques et reconstruit fiches + statuts. */
  const refreshPaiements = useCallback(async () => {
    const rows = (await apiFetchPaiementsMensuels()) as PaiementMensuelApi[];
    const byEtudiant = new Map<string, PaiementMensuel[]>();
    for (const r of rows) {
      const rec = normPaiementRecord(r);
      const list = byEtudiant.get(rec.etudiantId) ?? [];
      list.push(rec);
      byEtudiant.set(rec.etudiantId, list);
    }
    setSnap((s) => ({
      ...s,
      etudiants: s.etudiants.map((e) => {
        const records = byEtudiant.get(e.id) ?? [];
        return {
          ...e,
          paiementsMensuelsRecords: records,
          historique: e.historique.length ? e.historique : historiqueDepuisRecords(records),
          paiement: statutPaiementGlobal(records.map((r) => r.statut)),
        };
      }),
    }));
  }, []);

  const payerMois = useCallback(
    async (
      etudiantId: string,
      mois: string[],
      details: {
        montant: number;
        mode: "Espèces" | "Virement" | "Carte" | "Chèque";
        date: string;
        recu?: string;
        notes?: string;
      },
    ) => {
      await apiCreatePaiementsMensuels({
        etudiantId,
        mois,
        montant: details.montant,
        mode: details.mode,
        date: details.date,
        recu: details.recu,
        notes: details.notes,
      });
      await refreshPaiements();
    },
    [refreshPaiements],
  );

  const updatePaiementMensuel = useCallback(
    async (
      id: string,
      etudiantId: string,
      patch: Partial<{
        montantPaye: number;
        datePaiement: string;
        mode: "Espèces" | "Virement" | "Carte" | "Chèque";
        recu: string;
        statut: StatutPaiement;
        notes: string;
      }>,
    ) => {
      await apiUpdatePaiementMensuel(id, patch);
      await refreshPaiements();
      void etudiantId;
    },
    [refreshPaiements],
  );

  /**
   * Enregistre une note ponctuelle pour un étudiant (persistée côté serveur).
   *
   * Si le module existe déjà, la note est mise à jour ; sinon elle est ajoutée.
   * La moyenne pondérée de l'étudiant est recalculée à chaque saisie.
   */
  const addNote = useCallback(
    async (etudiantId: string, note: NoteModule) => {
      // Le serveur renvoie la ligne créée : son `id` canonique est repris
      // tel quel (un id local empêcherait toute suppression ultérieure).
      const created = (await apiCreateNote({
        etudiantId,
        module: note.module,
        note: note.note,
        coef: note.coef,
        credits: note.credits,
        examen: note.examen,
      })) as unknown as {
        id?: string;
        note?: string | number;
        coef?: string | number;
        credits?: string | number;
      };

      setSnap((s) => {
        const etudiant = s.etudiants.find((e) => e.id === etudiantId);
        if (!etudiant) return s;
        const saved: NoteModule = {
          id: String(created.id ?? note.id ?? crypto.randomUUID()),
          module: note.module,
          note: Number(created.note ?? note.note),
          coef: Number(created.coef ?? note.coef),
          credits: Number(created.credits ?? note.credits),
          examen: note.examen,
        };
        const existante = etudiant.notes.find((n) => n.module === saved.module);
        const notes = existante
          ? etudiant.notes.map((n) =>
              n.module === saved.module ? saved : n,
            )
          : [...etudiant.notes, saved];
        return {
          ...s,
          etudiants: s.etudiants.map((e) =>
            e.id === etudiantId
              ? { ...e, notes, moyenne: moyennePonderee(notes) }
              : e,
          ),
        };
      });
    },
    [],
  );

  const deleteNote = useCallback(async (id: string, etudiantId: string) => {
    await apiDeleteNote(id);
    setSnap((s) => {
      const etudiant = s.etudiants.find((e) => e.id === etudiantId);
      if (!etudiant) return s;
      const notes = etudiant.notes.filter(
        (n) => n.id !== id && !(n.module === id),
      );
      return {
        ...s,
        etudiants: s.etudiants.map((e) =>
          e.id === etudiantId ? { ...e, notes, moyenne: moyennePonderee(notes) } : e,
        ),
      };
    });
  }, []);

  /* ---------------- Créneaux horaires ---------------- */

  /**
   * Les créneaux vivent dans le store (et non dans l'état local de la page
   * Paramètres) : l'emploi du temps en dérive sa grille horaire, il doit donc
   * voir la même valeur.
   */
  const setCreneaux = useCallback(async (labels: string[]) => {
    await updateSetting("creneaux", labels);
    setSnap((s) => ({ ...s, creneaux: labels }));
  }, []);

  const creneaux = useMemo(
    () => parseCreneaux(snap.creneaux),
    [snap.creneaux],
  );

  const addFiliere = useCallback(async (nom: string) => {
    const clean = nom.trim();
    if (!clean) return;
    const { filieres } = await createFiliereApi(clean);
    setSnap((s) => ({ ...s, filieres }));
  }, []);

  const deleteFiliere = useCallback(async (nom: string) => {
    const { filieres } = await deleteFiliereApi(nom);
    setSnap((s) => ({ ...s, filieres }));
  }, []);

  /* ---------------- Structures d'accueil ---------------- */

  const addStructureAccueil = useCallback(async (nom: string, capacite = 5) => {
    const clean = nom.trim().replace(/\s+/g, " ");
    if (!clean) return;
    const { structures } = await createStructureApi(clean, capacite);
    setSnap((s) => ({ ...s, structuresAccueil: structures }));
  }, []);

  const updateStructureAccueil = useCallback(
    async (oldName: string, body: { nouveauNom?: string; capacite?: number }) => {
      const { structures } = await updateStructureApi(oldName, body);
      setSnap((s) => ({ ...s, structuresAccueil: structures }));
    },
    [],
  );

  const deleteStructureAccueil = useCallback(async (nom: string) => {
    const { structures } = await deleteStructureApi(nom);
    setSnap((s) => ({ ...s, structuresAccueil: structures }));
  }, []);

  const addServiceStage = useCallback(async (nom: string) => {
    const clean = nom.trim().replace(/\s+/g, " ");
    if (!clean) return;
    const { services } = await apiCreateStageService(clean);
    setSnap((s) => ({ ...s, servicesStage: services }));
  }, []);

  const updateServiceStage = useCallback(async (nom: string, body: { nouveauNom?: string }) => {
    const { services } = await apiUpdateStageService(nom, body);
    setSnap((s) => ({ ...s, servicesStage: services }));
  }, []);

  const deleteServiceStage = useCallback(async (nom: string) => {
    const { services } = await apiDeleteStageService(nom);
    setSnap((s) => ({ ...s, servicesStage: services }));
  }, []);

  /* ---------------- Modules ---------------- */

  // Hydrate depuis le backend : le diagnostique modules vit sur le serveur
  // (voir `refresh()`), ce passage ne fait que rafraîchir en tâche de fond.
  useEffect(() => {
    fetchModulesApi()
      .then((rows) => {
        if (Array.isArray(rows) && rows.length) {
          setSnap((s) => ({ ...s, modules: (rows as unknown as Record<string, unknown>[]).map(normModule) }));
        }
      })
      .catch(() => {});
  }, []);

  const addModule = useCallback(async (data: Omit<ModuleRecord, "id">) => {
    const saved = await createModuleApi(data);
    const module = normModule(saved as unknown as Record<string, unknown>);
    setSnap((s) => ({ ...s, modules: [...s.modules, module] }));
    return module;
  }, []);

  const updateModule = useCallback(async (id: string, data: Omit<ModuleRecord, "id">) => {
    const saved = await updateModuleApi(id, data);
    const module = normModule(saved as unknown as Record<string, unknown>);
    setSnap((s) => ({
      ...s,
      modules: s.modules.map((m) => (m.id === id ? module : m)),
    }));
    return module;
  }, []);

  const deleteModule = useCallback(async (id: string) => {
    await deleteModuleApi(id);
    setSnap((s) => ({ ...s, modules: s.modules.filter((m) => m.id !== id) }));
  }, []);
  /* ---------------- Planning ---------------- */

  const addSeance = useCallback(async (data: NouvelleSeance, force = false) => {
    const saved = await apiCreateSeance(data as unknown as Record<string, unknown>, force);
    const seance = { ...(saved as unknown as Seance), id: String((saved as { id?: unknown })?.id ?? "") };
    setSnap((s) => ({ ...s, seances: [...s.seances, seance] }));
    return seance;
  }, []);

  const updateSeance = useCallback(async (id: string, patch: Partial<Seance>, force = false) => {
    const saved = await apiUpdateSeance(id, patch as unknown as Record<string, unknown>, force);
    const seance = { ...(saved as unknown as Seance), id };
    setSnap((s) => ({
      ...s,
      seances: s.seances.map((x) => (x.id === id ? seance : x)),
    }));
    return seance;
  }, []);

  const deleteSeance = useCallback(async (id: string) => {
    await apiDeleteSeance(id);
    setSnap((s) => ({ ...s, seances: s.seances.filter((x) => x.id !== id) }));
  }, []);

  /** Déplacement par glisser-déposer : nouvelle date et/ou nouvel horaire. */
  const moveSeance = useCallback(async (id: string, date: string, debut: string, force = false) => {
    const current = snapRef.current.seances.find((x) => x.id === id);
    if (!current) return;
    // La durée est préservée : on ne déplace que le point de départ.
    const duree = minutesDepuisMinuit(current.fin) - minutesDepuisMinuit(current.debut);
    const fin = ajouterMinutes(debut, duree);
    // Le dépôt peut chevaucher : le serveur répond 409, la page affiche
    // l'avertissement et propose de forcer (voir `handleDrop` du planning).
    const saved = await apiUpdateSeance(id, { date, debut, fin } as unknown as Record<string, unknown>, force);
    const seance = { ...(saved as unknown as Seance), id };
    setSnap((s) => ({
      ...s,
      seances: s.seances.map((x) => (x.id === id ? seance : x)),
    }));
  }, []);
  /**
   * Conflits d'une séance projetée.
   *
   * Trois ressources ne peuvent pas être à deux endroits en même temps : le
   * professeur, la salle et le groupe. `ignorerId` exclut la séance en cours
   * d'édition, sinon elle entrerait en conflit avec elle-même.
   */
  /**
   * Séances indexées par jour.
   *
   * Deux séances ne peuvent se gêner que le même jour : depuis que le planning
   * couvre l'année scolaire entière (~950 séances), balayer toute la liste à
   * chaque appel rendait le calcul des conflits quadratique sur la page
   * Planning. L'index ramène chaque appel aux seules séances du jour visé.
   */
  const seancesParJour = useMemo(() => {
    const map = new Map<string, Seance[]>();
    for (const s of snap.seances) {
      const jour = map.get(s.date);
      if (jour) jour.push(s);
      else map.set(s.date, [s]);
    }
    return map;
  }, [snap.seances]);

  const conflitsSeance = useCallback(
    (candidate: ConflitCandidate, ignorerId?: string): Conflit[] => {
      const debut = minutesDepuisMinuit(candidate.debut);
      const fin = minutesDepuisMinuit(candidate.fin);
      const out: Conflit[] = [];

      for (const s of seancesParJour.get(candidate.date) ?? []) {
        if (s.id === ignorerId) continue;
        // Chevauchement strict : deux séances qui se touchent ne gênent pas.
        const d = minutesDepuisMinuit(s.debut);
        const f = minutesDepuisMinuit(s.fin);
        if (fin <= d || debut >= f) continue;

        if (s.professeurId === candidate.professeurId) {
          out.push({ type: "professeur", seance: s });
        }
        if (s.salle === candidate.salle) {
          out.push({ type: "salle", seance: s });
        }
        if (s.groupe === candidate.groupe) {
          out.push({ type: "groupe", seance: s });
        }
      }
      return out;
    },
    [seancesParJour],
  );

  /* ---------------- Appel en séance (roll-call) ---------------- */

  const openSession = useCallback(async (seanceId: string) => {
    const session = await apiOpenAttendanceSession(seanceId);
    return { id: String((session as { id?: unknown })?.id ?? "") };
  }, []);

  const fetchSession = useCallback(async (seanceId: string) => {
    try {
      const session = await apiFetchAttendanceSession(seanceId);
      return { id: String((session as { id?: unknown })?.id ?? "") };
    } catch {
      return null;
    }
  }, []);

  const closeSession = useCallback(async (sessionId: string) => {
    await apiCloseAttendanceSession(sessionId);
  }, []);

  const fetchPresences = useCallback(async (seanceId: string) => {
    const rows = (await apiFetchSeanceAttendance(seanceId)) as AttendanceEntry[];
    return rows.map((r) => ({
      etudiantId: String(r.etudiantId ?? ""),
      present: r.present === true,
      justifie: r.justifie === true,
      note: String(r.note ?? ""),
    }));
  }, []);

  const savePresences = useCallback(async (seanceId: string, entries: AttendanceEntry[]) => {
    await apiSaveAttendanceBulk(seanceId, entries);
  }, []);

  /* ---------------- Dérivés ---------------- */

  const paiements = useMemo<PaiementLigne[]>(
    () =>
      snap.etudiants.flatMap((e) =>
        e.paiementsMensuelsRecords.map((r) => ({
          id: r.id,
          etudiantId: e.id,
          cne: e.cne,
          etudiant: `${e.prenom} ${e.nom}`,
          filiere: e.filiere,
          niveau: e.niveau,
          date: r.datePaiement,
          montant: r.montantPaye,
          mode: r.mode,
          periode: r.mois,
          recu: r.recu,
          statut: r.statut,
          mois: r.mois,
        })),
      ),
    [snap.etudiants],
  );

  const totalUnpaidMonths = useMemo(
    () =>
      snap.etudiants.reduce((s, e) => {
        const unpaid = e.paiementsMensuelsRecords
          .filter((r) => r.statut !== "paye")
          .reduce((sum, r) => sum + (r.montantDu - r.montantPaye), 0);
        return s + unpaid;
      }, 0),
    [snap.etudiants],
  );

  const financier = useMemo(() => {
    const encaisse = snap.etudiants.reduce((sum, e) => {
      const paye = e.paiementsMensuelsRecords
        .filter((r) => r.statut === "paye")
        .reduce((s, r) => s + r.montantPaye, 0);
      return sum + paye;
    }, 0);

    const now = new Date();
    const encaisseCeMois = snap.etudiants.reduce((sum, e) => {
      const paye = e.paiementsMensuelsRecords
        .filter(
          (r) =>
            r.statut === "paye" &&
            r.datePaiement &&
            new Date(r.datePaiement).getMonth() === now.getMonth() &&
            new Date(r.datePaiement).getFullYear() === now.getFullYear(),
        )
        .reduce((s, r) => s + r.montantPaye, 0);
      return sum + paye;
    }, 0);

    let enAttente = 0;
    let impaye = 0;
    let retard = 0;
    for (const e of snap.etudiants) {
      for (const r of e.paiementsMensuelsRecords) {
        const reste = r.montantDu - r.montantPaye;
        if (reste <= 0) continue;
        if (r.statut === "en_attente") enAttente += reste;
        else if (r.statut === "impaye") impaye += reste;
        else if (r.statut === "retard") retard += reste;
      }
    }

    return {
      encaisse,
      encaisseCeMois,
      enAttente,
      impaye,
      retard,
      tauxRecouvrement:
        encaisse + totalUnpaidMonths === 0
          ? 100
          : Math.round((encaisse / (encaisse + totalUnpaidMonths)) * 100),
    };
  }, [snap.etudiants, totalUnpaidMonths]);

  const dashboard = useMemo(() => {
    const inscrits = snap.etudiants.filter(
      (e) => e.statut === "inscrit" || e.statut === "diplome",
    );
    const notes = snap.etudiants.filter((e) => e.moyenne > 0);
    return {
      totalInscrits: inscrits.length,
      deltaSemestre: 6,
      formateursActifs: snap.formateurs.filter((f) => f.statut !== "en_conge")
        .length,
      tauxReussite: notes.length
        ? Math.round(
            (notes.filter((e) => e.moyenne >= 10).length / notes.length) * 100,
          )
        : 0,
      totalARecouvrer: totalUnpaidMonths,
    };
  }, [snap.etudiants, snap.formateurs, totalUnpaidMonths]);

  const repartitionFiliere = useMemo(
    () => {
      const counts = new Map<string, number>();
      for (const e of snap.etudiants) {
        const f = e.filiere || "Sans filière";
        counts.set(f, (counts.get(f) ?? 0) + 1);
      }
      return [...counts.entries()]
        .map(([filiere, value]) => ({
          name: (FILIERE_COURT as Record<string, string>)[filiere] ?? filiere,
          filiere,
          value,
        }))
        .sort((a, b) => b.value - a.value);
    },
    [snap.etudiants],
  );

  const repartitionNiveau = useMemo(
    () => {
      const counts = new Map<string, number>();
      for (const e of snap.etudiants) {
        const n = e.niveau || "—";
        counts.set(n, (counts.get(n) ?? 0) + 1);
      }
      return [...counts.entries()]
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => a.name.localeCompare(b.name));
    },
    [snap.etudiants],
  );

  const etudiantsARisque = useMemo(
    () =>
      snap.etudiants.filter(
        (e) => (e.moyenne > 0 && e.moyenne < 10) || e.statut === "abandon",
      ),
    [snap.etudiants],
  );

  const aRelancer = useMemo(
    () =>
      snap.etudiants.filter((e) => {
        const moisNonPayes = e.paiementsMensuelsRecords.filter(
          (r) => r.statut !== "paye" && r.montantPaye < r.montantDu,
        );
        return moisNonPayes.length > 0;
      }),
    [snap.etudiants],
  );

  const aTraiter = useMemo(
    () => ({
      examensAVenir: snap.examens.filter((x) => x.statut === "planifie").length,
      bulletinsAPublier: snap.bulletins.filter((b) => b.statut !== "publie")
        .length,
      stagesAValider: snap.stages.filter(
        (s) => s.statut === "soutenance" || s.statut === "recherche",
      ).length,
    }),
    [snap.examens, snap.bulletins, snap.stages],
  );

  const reussiteFiliere = useMemo(
    () => {
      const byFiliere = new Map<string, { inscrits: number; admis: number }>();
      for (const e of snap.etudiants) {
        if (!e.filiere || !(e.moyenne > 0)) continue;
        const row = byFiliere.get(e.filiere) ?? { inscrits: 0, admis: 0 };
        row.inscrits += 1;
        if (e.moyenne >= 10) row.admis += 1;
        byFiliere.set(e.filiere, row);
      }
      return [...byFiliere.entries()]
        .map(([filiere, r]) => ({
          name: (FILIERE_COURT as Record<string, string>)[filiere] ?? filiere,
          filiere,
          value: r.inscrits ? Math.round((r.admis / r.inscrits) * 100) : 0,
        }))
        .sort((a, b) => b.value - a.value);
    },
    [snap.etudiants],
  );

  // Résolution de la photo d'identité d'un étudiant par id OU par CNE : les
  // enregistrements bulletins / stages / paiements ne portent que le CNE, mais
  // la photo (téléversée depuis l'espace étudiant) vit sur la fiche.
  const photoParCle = useMemo(() => {
    const m = new Map<string, string>();
    for (const e of snap.etudiants) {
      const url = (e.photoUrl ?? "").trim();
      if (!url) continue;
      if (e.id) m.set(e.id, url);
      if (e.cne) m.set(e.cne, url);
    }
    return m;
  }, [snap.etudiants]);
  const photoDe = useCallback(
    (cleOuCne: string | undefined | null) =>
      cleOuCne ? photoParCle.get(cleOuCne) : undefined,
    [photoParCle],
  );

  const value: IstpmCtx = {
    ...snap,
    photoDe,
    // `snap.creneaux` porte les libellés bruts ; le contexte expose en plus la
    // version analysée, d'où l'écrasement après le spread.
    creneauxLabels: snap.creneaux,
    creneaux,
    setCreneaux,
    loading,
    syncFailed,
    refresh,
    paiements,
    dashboard,
    financier,
    repartitionFiliere,
    repartitionNiveau,
    reussiteFiliere,
    etudiantsARisque,
    aRelancer,
    aTraiter,
    addEtudiant,
    updateEtudiant,
    deleteEtudiant,
    restoreEtudiant,
    addFormateur,
    updateFormateur,
    deleteFormateur,
    archiveFormateur,
    restoreFormateur,
    addGroupConfig,
    updateGroupConfig,
    deleteGroupConfig,
    addExamen,
    updateExamen,
    deleteExamen,
    saveNotesExamen,
    attachDocument,
    removeDocument,
    updateBulletin,
    publierBulletin,
    publierTousBulletins,
    addSeance,
    updateSeance,
    deleteSeance,
    moveSeance,
    conflitsSeance,
    openSession,
    closeSession,
    fetchSession,
    fetchPresences,
    savePresences,
    addStage,
    updateStage,
    deleteStage,
    payerMois,
    updatePaiementMensuel,
    addNote,
    deleteNote,
    addFiliere,
    deleteFiliere,
    addStructureAccueil,
    updateStructureAccueil,
    deleteStructureAccueil,
    addServiceStage,
    updateServiceStage,
    deleteServiceStage,
    addModule,
    updateModule,
    deleteModule,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useIstpm() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useIstpm must be used within an IstpmProvider");
  return ctx;
}

/**
 * Formateur « courant » pour le rôle enseignant.
 *
 * Résolu depuis le référentiel **serveur** : d'abord la fiche liée au compte
 * (`formateurs.user_id`), sinon la sélection manuelle du sélecteur, sinon la
 * première fiche. Plus aucun identifiant de démonstration.
 */
export function useCurrentFormateur(): Formateur | null {
  const { formateurs } = useIstpm();
  const { user, selectedFormateurId } = useAuth();
  return useMemo(() => {
    if (formateurs.length === 0) return null;
    if (selectedFormateurId) {
      return formateurs.find((f) => f.id === selectedFormateurId) ?? null;
    }
    if (user?.role === "enseignant" && user?.id) {
      const liee = formateurs.find((f) => f.userId === user.id);
      if (liee) return liee;
    }
    return formateurs[0];
  }, [formateurs, selectedFormateurId, user]);
}
