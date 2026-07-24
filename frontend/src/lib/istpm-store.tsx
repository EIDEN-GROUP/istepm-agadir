/**
 * Mutable, frontend-only data store for the ISTPM CRM.
 *
 * `istpm-data.ts` provides the immutable seed (sample records + reference
 * lists). This provider copies that seed into React state so the UI can
 * actually create, edit and delete records, and recomputes every dashboard
 * aggregate from the live state   so adding a student immediately moves the
 * KPIs, the donut and the "à traiter" counters.
 *
 * There is no backend: state lives in memory and is mirrored to localStorage
 * so a refresh keeps your edits. `reset()` restores the pristine sample data.
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
  ETUDIANTS,
  FORMATEURS,
  EXAMENS,
  BULLETINS,
  STAGES,
  ACTIVITE_RECENTE,
  FILIERES,
  NIVEAUX,
  REUSSITE_FILIERE,
  FILIERE_COURT,
  type Etudiant,
  type Formateur,
  type Examen,
  type Bulletin,
  type Stage,
  type ActiviteItem,
  type Seance,
  SEANCES,
  lundiDeLaSemaine,
  genererSeances,
  minutesDepuisMinuit,
  ajouterMinutes,
  STRUCTURES_ACCUEIL,
  type LignePaiement,
  type NoteModule,
  type PaiementLigne,
  type StatutPaiement,
  type Mention,
  type Decision,
  type ExamDocument,
} from "@/lib/istpm-data";
import {
  deleteDoc,
  ensureSeedDocuments,
  putDoc,
  MAX_DOC_SIZE,
} from "@/lib/doc-store";
import {
  fetchEtudiants as apiFetchEtudiants,
  createEtudiant as apiCreateEtudiant,
  updateEtudiant as apiUpdateEtudiant,
  deleteEtudiant as apiDeleteEtudiant,
  fetchFormateurs as apiFetchFormateurs,
  createFormateur as apiCreateFormateur,
  updateFormateur as apiUpdateFormateur,
  deleteFormateur as apiDeleteFormateur,
  fetchExamens as apiFetchExamens,
  createExamen as apiCreateExamen,
  updateExamen as apiUpdateExamen,
  deleteExamen as apiDeleteExamen,
  saveNotesExamenApi,
  fetchBulletins as apiFetchBulletins,
  createBulletin as apiCreateBulletin,
  updateBulletin as apiUpdateBulletin,
  deleteBulletin as apiDeleteBulletin,
  publierBulletinApi,
  publierTousBulletinsApi,
  fetchStages as apiFetchStages,
  createStage as apiCreateStage,
  updateStage as apiUpdateStage,
  deleteStage as apiDeleteStage,
  validerStageApi,
  createPaiement as apiCreatePaiement,
  createNote as apiCreateNote,
  deleteNote as apiDeleteNote,
  createFiliereApi,
  deleteFiliereApi,
} from "@/lib/istpm-api";

/* ------------------------------------------------------------------ */
/*  Persistance                                                        */
/* ------------------------------------------------------------------ */

/** Bump when the record shape changes: stored data on an old version is
 *  discarded rather than loaded into a UI that no longer understands it. */
const STORAGE_KEY = "istpm-data-v4";

type Snapshot = {
  etudiants: Etudiant[];
  formateurs: Formateur[];
  examens: Examen[];
  bulletins: Bulletin[];
  stages: Stage[];
  activite: ActiviteItem[];
  seances: Seance[];
  filieres: string[];
  structuresAccueil: string[];
};

function seed(): Snapshot {
  // Deep clone so edits never mutate the imported seed arrays.
  return structuredClone({
    etudiants: ETUDIANTS,
    formateurs: FORMATEURS,
    examens: EXAMENS,
    bulletins: BULLETINS,
    stages: STAGES,
    activite: ACTIVITE_RECENTE,
    seances: SEANCES,
    filieres: [...FILIERES],
    structuresAccueil: [...STRUCTURES_ACCUEIL],
  }) as Snapshot;
}

function load(): Snapshot {
  if (typeof window === "undefined") return seed();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return seed();
    const parsed = JSON.parse(raw) as Snapshot;
    // Guard against a truncated or hand-edited payload.
    if (!Array.isArray(parsed?.etudiants)) return seed();

    // Rebase seance dates to the current week.
    // Seed‑pattern seances ("se-0-…", "se-1-…") have dates frozen at save
    // time; regenerate them so the planning always shows the present week.
    const expectedLundi = lundiDeLaSemaine(new Date()).toISOString().slice(0, 10);
    const storedLundi = parsed.seances?.[0]?.date?.slice(0, 10);
    if (storedLundi && storedLundi !== expectedLundi) {
      const hasSeedIds = parsed.seances.some(
        (s) => /^se-\d+-\d+$/.test(s.id),
      );
      if (hasSeedIds) {
        parsed.seances = genererSeances();
      }
    }

    return parsed;
  } catch {
    return seed();
  }
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

let counter = 0;
/** Collision-free id for records created during this session. */
function uid(prefix: string) {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}${counter}`;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

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
/*  Types d'entrée (création)                                          */
/* ------------------------------------------------------------------ */

export type NouvelEtudiant = Omit<
  Etudiant,
  "id" | "moyenne" | "notes" | "historique"
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
  activite: ActiviteItem[];
  seances: Seance[];
  filieres: string[];
  structuresAccueil: string[];

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
  reussiteFiliere: typeof REUSSITE_FILIERE;
  etudiantsARisque: Etudiant[];
  aRelancer: Etudiant[];
  aTraiter: {
    examensAVenir: number;
    bulletinsAPublier: number;
    stagesAValider: number;
  };

  /* Actions */
  addEtudiant: (data: NouvelEtudiant) => Etudiant;
  updateEtudiant: (id: string, patch: Partial<Etudiant>) => void;
  deleteEtudiant: (id: string) => void;

  addFormateur: (data: NouveauFormateur) => Formateur;
  updateFormateur: (id: string, patch: Partial<Formateur>) => void;
  deleteFormateur: (id: string) => void;

  /** `createdBy` reçoit `auteurId`   l'auteur est toujours enregistré. */
  addExamen: (data: NouvelExamen, auteurId: string) => Examen;
  updateExamen: (id: string, patch: Partial<Examen>) => void;
  deleteExamen: (id: string) => void;
  saveNotesExamen: (examenId: string, saisies: SaisieNote[]) => number;
  /** Dépose le sujet : le fichier va dans IndexedDB, les métadonnées ici. */
  attachDocument: (examenId: string, file: File) => Promise<void>;
  removeDocument: (examenId: string) => Promise<void>;

  updateBulletin: (id: string, patch: Partial<Bulletin>) => void;
  publierBulletin: (id: string) => void;
  publierTousBulletins: () => number;

  addStage: (data: NouveauStage) => Stage;
  updateStage: (id: string, patch: Partial<Stage>) => void;
  deleteStage: (id: string) => void;

  addPaiement: (etudiantId: string, ligne: Omit<LignePaiement, "recu">) => void;

  /** Fixe le statut de règlement d'un mois donné pour un étudiant (suivi mensuel). */
  setMoisPaiementStatut: (
    etudiantId: string,
    mois: string,
    statut: StatutPaiement,
  ) => void;

  /** Enregistre une note (module + examen) pour un étudiant et recalcule sa moyenne. */
  addNote: (etudiantId: string, note: NoteModule) => void;

  addFiliere: (nom: string) => void;
  deleteFiliere: (nom: string) => void;

  addStructureAccueil: (nom: string) => void;
  updateStructureAccueil: (oldName: string, newName: string) => void;
  deleteStructureAccueil: (nom: string) => void;

  addSeance: (data: NouvelleSeance) => Seance;
  updateSeance: (id: string, patch: Partial<Seance>) => void;
  deleteSeance: (id: string) => void;
  /** Glisser-déposer : conserve la durée, ne change que le départ. */
  moveSeance: (id: string, date: string, debut: string) => void;
  conflitsSeance: (c: ConflitCandidate, ignorerId?: string) => Conflit[];

  reset: () => void;
};

const Ctx = createContext<IstpmCtx | null>(null);

export function IstpmProvider({ children }: { children: ReactNode }) {
  // Initialise straight from storage via lazy state rather than in an effect.
  //
  // The effect-based variant loses data: on the first commit the persist effect
  // below runs with the *seed* still in state and overwrites the stored
  // snapshot, and under StrictMode's double-invoked effects the subsequent read
  // then loads that seed back. This is a client-only SPA with no SSR, so
  // reading storage during render carries none of the hydration risk that makes
  // the effect pattern worthwhile in the locale and role providers.
  const [snap, setSnap] = useState<Snapshot>(load);

  // Crée les fichiers des sujets de démonstration absents d'IndexedDB, puis
  // aligne la taille affichée sur celle du fichier réellement écrit.
  useEffect(() => {
    let cancelled = false;
    ensureSeedDocuments(snap.examens).then((sizes) => {
      if (cancelled || !Object.keys(sizes).length) return;
      setSnap((s) => {
        const stale = s.examens.some(
          (x) => x.document && sizes[x.document.id] !== undefined
            && sizes[x.document.id] !== x.document.taille,
        );
        if (!stale) return s;
        return {
          ...s,
          examens: s.examens.map((x) =>
            x.document && sizes[x.document.id] !== undefined
              ? { ...x, document: { ...x.document, taille: sizes[x.document.id] } }
              : x,
          ),
        };
      });
    });
    return () => {
      cancelled = true;
    };
    // Une seule passe au montage : les dépôts ultérieurs gèrent leur fichier.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync from the backend API on mount, replacing localStorage data.
  // If the API is unreachable the existing localStorage data stays in place.
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [etudiants, formateurs, examens, bulletins, stages] =
          await Promise.all([
            apiFetchEtudiants(),
            apiFetchFormateurs(),
            apiFetchExamens(),
            apiFetchBulletins(),
            apiFetchStages(),
          ]);
        if (!mounted) return;
        const derivePaiementsMensuels = (e: Etudiant): Etudiant => {
          if (!e.historique || e.paiementsMensuels) return e;
          const pm: Record<string, StatutPaiement> = {};
          for (const h of e.historique) {
            if (h.mois) pm[h.mois] = h.statut as StatutPaiement;
          }
          return { ...e, paiementsMensuels: pm };
        };
        setSnap((s) => ({
          ...s,
          etudiants: (etudiants as Etudiant[]).map(derivePaiementsMensuels),
          formateurs: formateurs as Formateur[],
          examens: examens as Examen[],
          bulletins: bulletins as Bulletin[],
          stages: stages as Stage[],
        }));
      } catch {
        // Backend not available — keep localStorage data.
      }
    })();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Skip the write triggered by the initial state, which would only rewrite
  // what was just read.
  const hydrated = useRef(false);
  useEffect(() => {
    if (!hydrated.current) {
      hydrated.current = true;
      return;
    }
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snap));
    } catch {
      // Quota exceeded or private mode: keep working in memory.
    }
  }, [snap]);

  /** Prepend an entry to the "activité récente" feed. */
  const log = useCallback((type: ActiviteItem["type"], texte: string) => {
    setSnap((s) => ({
      ...s,
      activite: [{ type, texte, date: today() }, ...s.activite].slice(0, 30),
    }));
  }, []);

  /* ---------------- Étudiants ---------------- */

  const addEtudiant = useCallback(
    (data: NouvelEtudiant) => {
      const etudiant: Etudiant = {
        ...data,
        id: uid("et"),
        moyenne: 0,
        notes: [],
        historique: [],
      };
      apiCreateEtudiant(data as unknown as Record<string, unknown>).catch(() => {});
      setSnap((s) => ({ ...s, etudiants: [etudiant, ...s.etudiants] }));
      log(
        "inscription",
        `Nouvelle inscription   ${etudiant.prenom} ${etudiant.nom} (${etudiant.filiere}, ${etudiant.niveau})`,
      );
      return etudiant;
    },
    [log],
  );

  const updateEtudiant = useCallback(
    (id: string, patch: Partial<Etudiant>) => {
      apiUpdateEtudiant(id, patch as unknown as Record<string, unknown>).catch(() => {});
      setSnap((s) => ({
        ...s,
        etudiants: s.etudiants.map((e) =>
          e.id === id ? { ...e, ...patch } : e,
        ),
      }));
    },
    [],
  );

  const deleteEtudiant = useCallback(
    (id: string) => {
      apiDeleteEtudiant(id).catch(() => {});
      setSnap((s) => ({
        ...s,
        etudiants: s.etudiants.filter((e) => e.id !== id),
        bulletins: s.bulletins.filter((b) => b.etudiantId !== id),
        stages: s.stages.filter((st) => st.etudiantId !== id),
      }));
    },
    [],
  );

  /* ---------------- Formateurs ---------------- */

  const addFormateur = useCallback(
    (data: NouveauFormateur) => {
      const formateur: Formateur = { ...data, id: uid("fo"), notesSaisies: 0 };
      apiCreateFormateur(data as unknown as Record<string, unknown>).catch(() => {});
      setSnap((s) => ({ ...s, formateurs: [formateur, ...s.formateurs] }));
      return formateur;
    },
    [],
  );

  const updateFormateur = useCallback(
    (id: string, patch: Partial<Formateur>) => {
      apiUpdateFormateur(id, patch as unknown as Record<string, unknown>).catch(() => {});
      setSnap((s) => ({
        ...s,
        formateurs: s.formateurs.map((f) =>
          f.id === id ? { ...f, ...patch } : f,
        ),
      }));
    },
    [],
  );

  const deleteFormateur = useCallback(
    (id: string) => {
      apiDeleteFormateur(id).catch(() => {});
      setSnap((s) => ({
        ...s,
        formateurs: s.formateurs.filter((f) => f.id !== id),
      }));
    },
    [],
  );

  /* ---------------- Examens ---------------- */

  const addExamen = useCallback((data: NouvelExamen, auteurId: string) => {
    const examen: Examen = { ...data, id: uid("ex"), createdBy: auteurId };
    apiCreateExamen(data as unknown as Record<string, unknown>).catch(() => {});
    setSnap((s) => ({ ...s, examens: [examen, ...s.examens] }));
    return examen;
  }, []);

  const updateExamen = useCallback(
    (id: string, patch: Partial<Examen>) => {
      apiUpdateExamen(id, patch as unknown as Record<string, unknown>).catch(() => {});
      setSnap((s) => ({
        ...s,
        examens: s.examens.map((x) => (x.id === id ? { ...x, ...patch } : x)),
      }));
    },
    [],
  );

  const deleteExamen = useCallback(
    (id: string) => {
      apiDeleteExamen(id).catch(() => {});
      setSnap((s) => {
        const doc = s.examens.find((x) => x.id === id)?.document;
        if (doc) void deleteDoc(doc.id).catch(() => {});
        return { ...s, examens: s.examens.filter((x) => x.id !== id) };
      });
    },
    [],
  );

  const attachDocument = useCallback(async (examenId: string, file: File) => {
    if (file.size > MAX_DOC_SIZE) {
      throw new Error(
        `Fichier trop volumineux (max ${Math.round(MAX_DOC_SIZE / 1024 / 1024)} Mo)`,
      );
    }
    // Une clé neuve à chaque dépôt : remplacer un sujet n'écrase pas l'ancien
    // fichier tant que le nouveau n'est pas écrit sans erreur.
    const docId = uid("doc");
    await putDoc(docId, file);

    const ext = file.name.split(".").pop()?.toLowerCase();
    const detectedMime =
      file.type ||
      (ext === "pdf"
        ? "application/pdf"
        : ext === "doc"
          ? "application/msword"
          : ext === "docx"
            ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            : "application/octet-stream");

    const meta: ExamDocument = {
      id: docId,
      nom: file.name,
      taille: file.size,
      mime: detectedMime,
      uploadedAt: today(),
    };

    setSnap((s) => {
      const previous = s.examens.find((x) => x.id === examenId)?.document;
      if (previous) void deleteDoc(previous.id).catch(() => {});
      return {
        ...s,
        examens: s.examens.map((x) =>
          x.id === examenId ? { ...x, document: meta } : x,
        ),
      };
    });
  }, []);

  // L'id est lu sur l'instantané de rendu, pas dans l'updater : React peut
  // rejouer un updater (StrictMode), une valeur capturée dedans n'est pas fiable.
  const removeDocument = useCallback(
    async (examenId: string) => {
      const docId = snap.examens.find((x) => x.id === examenId)?.document?.id;
      setSnap((s) => ({
        ...s,
        examens: s.examens.map((x) =>
          x.id === examenId ? { ...x, document: undefined } : x,
        ),
      }));
      if (docId) await deleteDoc(docId).catch(() => {});
    },
    [snap.examens],
  );

  /**
   * Persist note entry for an exam.
   *
   * Writes one `NoteModule` per student (theory and practical averaged when
   * the exam assesses both), recomputes each student's overall average, marks
   * the exam as `notes_saisies`, and credits the entry to the surveilling
   * formateurs. Returns how many students were recorded.
   */
  const saveNotesExamen = useCallback(
    (examenId: string, saisies: SaisieNote[]) => {
      const retenues = saisies.filter(
        (s) => s.theorique !== undefined || s.pratique !== undefined,
      );
      if (!retenues.length) return 0;

      saveNotesExamenApi(
        examenId,
        retenues.map((s) => ({ etudiantId: s.etudiantId, theorique: s.theorique, pratique: s.pratique })),
      ).catch(() => {});

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
          activite: [
            {
              type: "note" as const,
              texte: `Notes saisies   ${examen.module} (${examen.niveau}, ${examen.filiere})`,
              date: today(),
            },
            ...s.activite,
          ].slice(0, 30),
        };
      });

      return retenues.length;
    },
    [],
  );

  /* ---------------- Bulletins ---------------- */

  const updateBulletin = useCallback(
    (id: string, patch: Partial<Bulletin>) => {
      apiUpdateBulletin(id, patch as unknown as Record<string, unknown>).catch(() => {});
      setSnap((s) => ({
        ...s,
        bulletins: s.bulletins.map((b) =>
          b.id === id ? { ...b, ...patch } : b,
        ),
      }));
    },
    [],
  );

  const publierBulletin = useCallback(
    (id: string) => {
      publierBulletinApi(id).catch(() => {});
      setSnap((s) => ({
        ...s,
        bulletins: s.bulletins.map((b) =>
          b.id === id ? { ...b, statut: "publie" as const } : b,
        ),
      }));
    },
    [],
  );

  const publierTousBulletins = useCallback(() => {
    const count = snap.bulletins.filter((b) => b.statut !== "publie").length;
    publierTousBulletinsApi().catch(() => {});
    setSnap((s) => ({
      ...s,
      bulletins: s.bulletins.map((b) => ({ ...b, statut: "publie" as const })),
    }));
    return count;
  }, [snap.bulletins]);

  /* ---------------- Stages ---------------- */

  const addStage = useCallback((data: NouveauStage) => {
    const stage: Stage = { ...data, id: uid("st") };
    apiCreateStage(data as unknown as Record<string, unknown>).catch(() => {});
    setSnap((s) => ({ ...s, stages: [stage, ...s.stages] }));
    return stage;
  }, []);

  const updateStage = useCallback(
    (id: string, patch: Partial<Stage>) => {
      apiUpdateStage(id, patch as unknown as Record<string, unknown>).catch(() => {});
      setSnap((s) => ({
        ...s,
        stages: s.stages.map((st) => (st.id === id ? { ...st, ...patch } : st)),
      }));
    },
    [],
  );

  const deleteStage = useCallback(
    (id: string) => {
      apiDeleteStage(id).catch(() => {});
      setSnap((s) => ({ ...s, stages: s.stages.filter((st) => st.id !== id) }));
    },
    [],
  );

  /* ---------------- Paiements ---------------- */

  /**
   * Record a payment against a student: appends to their history, reduces the
   * outstanding balance and re-derives their payment status.
   */
  const addPaiement = useCallback(
    (etudiantId: string, ligne: Omit<LignePaiement, "recu">) => {
      apiCreatePaiement({
        etudiantId,
        montant: ligne.montant,
        mode: ligne.mode,
        periode: ligne.periode,
        date: ligne.date,
        // Envoyé au backend pour le suivi mensuel ; ignoré tant que l'API ne le
        // persiste pas (voir la note de passation).
        mois: ligne.mois,
      }).catch(() => {});
      setSnap((s) => {
        const etudiant = s.etudiants.find((e) => e.id === etudiantId);
        if (!etudiant) return s;

        const recu = `ISTPM-R-${new Date().getFullYear().toString().slice(2)}${String(
          new Date().getMonth() + 1,
        ).padStart(2, "0")}-${String(etudiant.historique.length + 1).padStart(3, "0")}`;

        const reste = Math.max(0, etudiant.resteAPayer - ligne.montant);

        return {
          ...s,
          etudiants: s.etudiants.map((e) =>
            e.id !== etudiantId
              ? e
              : {
                  ...e,
                  historique: [...e.historique, { ...ligne, recu }],
                  resteAPayer: reste,
                  paiement: reste === 0 ? ("paye" as const) : e.paiement,
                  // Le règlement met à jour le suivi mensuel du mois concerné.
                  paiementsMensuels: ligne.mois
                    ? { ...e.paiementsMensuels, [ligne.mois]: ligne.statut }
                    : e.paiementsMensuels,
                },
          ),
          activite: [
            {
              type: "paiement" as const,
              texte: `Paiement reçu   ${etudiant.prenom} ${etudiant.nom}, ${ligne.montant.toLocaleString("fr-FR")} MAD (${ligne.periode})`,
              date: today(),
            },
            ...s.activite,
          ].slice(0, 30),
        };
      });
    },
    [],
  );

  const setMoisPaiementStatut = useCallback(
    (etudiantId: string, mois: string, statut: StatutPaiement) => {
      setSnap((s) => ({
        ...s,
        etudiants: s.etudiants.map((e) =>
          e.id === etudiantId
            ? {
                ...e,
                paiementsMensuels: { ...e.paiementsMensuels, [mois]: statut },
              }
            : e,
        ),
      }));
    },
    [],
  );

  /**
   * Enregistre une note ponctuelle pour un étudiant (persistée côté serveur).
   *
   * Si le module existe déjà, la note est mise à jour ; sinon elle est ajoutée.
   * La moyenne pondérée de l'étudiant est recalculée à chaque saisie.
   */
  const addNote = useCallback(
    (etudiantId: string, note: NoteModule) => {
      apiCreateNote({
        etudiantId,
        module: note.module,
        note: note.note,
        coef: note.coef,
        credits: note.credits,
        examen: note.examen,
      })
        .then((created) => {
          setSnap((s) => {
            const etudiant = s.etudiants.find((e) => e.id === etudiantId);
            if (!etudiant) return s;
            const saved: NoteModule = {
              id: created.id,
              module: created.module,
              note: Number(created.note),
              coef: Number(created.coef),
              credits: Number(created.credits),
              examen: created.examen || undefined,
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
              activite: [
                {
                  type: "note" as const,
                  texte: `Note saisie   ${note.module} : ${note.note.toFixed(2)}/20 (${etudiant.prenom} ${etudiant.nom})`,
                  date: today(),
                },
                ...s.activite,
              ].slice(0, 30),
            };
          });
        })
        .catch(() => {
          toast.error("Erreur lors de l'enregistrement de la note");
        });
    },
    [],
  );

  const addFiliere = useCallback(
    (nom: string) => {
      createFiliereApi(nom).catch(() => {});
      setSnap((s) => ({
        ...s,
        filieres: s.filieres.includes(nom) ? s.filieres : [...s.filieres, nom],
      }));
    },
    [],
  );

  const deleteFiliere = useCallback(
    (nom: string) => {
      deleteFiliereApi(nom).catch(() => {});
      setSnap((s) => ({
        ...s,
        filieres: s.filieres.filter((f) => f !== nom),
      }));
    },
    [],
  );

  /* ---------------- Structures d'accueil ---------------- */

  const addStructureAccueil = useCallback(
    (nom: string) => {
      setSnap((s) => ({
        ...s,
        structuresAccueil: s.structuresAccueil.includes(nom)
          ? s.structuresAccueil
          : [...s.structuresAccueil, nom],
      }));
    },
    [],
  );

  const updateStructureAccueil = useCallback(
    (oldName: string, newName: string) => {
      setSnap((s) => ({
        ...s,
        structuresAccueil: s.structuresAccueil.map((st) =>
          st === oldName ? newName : st,
        ),
      }));
    },
    [],
  );

  const deleteStructureAccueil = useCallback(
    (nom: string) => {
      setSnap((s) => ({
        ...s,
        structuresAccueil: s.structuresAccueil.filter((st) => st !== nom),
      }));
    },
    [],
  );

  /* ---------------- Planning ---------------- */

  const addSeance = useCallback((data: NouvelleSeance) => {
    const seance: Seance = { ...data, id: uid("se") };
    setSnap((s) => ({ ...s, seances: [...s.seances, seance] }));
    return seance;
  }, []);

  const updateSeance = useCallback(
    (id: string, patch: Partial<Seance>) =>
      setSnap((s) => ({
        ...s,
        seances: s.seances.map((x) => (x.id === id ? { ...x, ...patch } : x)),
      })),
    [],
  );

  const deleteSeance = useCallback(
    (id: string) =>
      setSnap((s) => ({ ...s, seances: s.seances.filter((x) => x.id !== id) })),
    [],
  );

  /** Déplacement par glisser-déposer : nouvelle date et/ou nouvel horaire. */
  const moveSeance = useCallback(
    (id: string, date: string, debut: string) =>
      setSnap((s) => ({
        ...s,
        seances: s.seances.map((x) => {
          if (x.id !== id) return x;
          // La durée est préservée : on ne déplace que le point de départ.
          const duree = minutesDepuisMinuit(x.fin) - minutesDepuisMinuit(x.debut);
          return { ...x, date, debut, fin: ajouterMinutes(debut, duree) };
        }),
      })),
    [],
  );

  /**
   * Conflits d'une séance projetée.
   *
   * Trois ressources ne peuvent pas être à deux endroits en même temps : le
   * professeur, la salle et le groupe. `ignorerId` exclut la séance en cours
   * d'édition, sinon elle entrerait en conflit avec elle-même.
   */
  const conflitsSeance = useCallback(
    (candidate: ConflitCandidate, ignorerId?: string): Conflit[] => {
      const debut = minutesDepuisMinuit(candidate.debut);
      const fin = minutesDepuisMinuit(candidate.fin);
      const out: Conflit[] = [];

      for (const s of snap.seances) {
        if (s.id === ignorerId) continue;
        if (s.date !== candidate.date) continue;
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
    [snap.seances],
  );

  const reset = useCallback(() => {
    window.localStorage.removeItem(STORAGE_KEY);
    setSnap(seed());
  }, []);

  /* ---------------- Dérivés ---------------- */

  const paiements = useMemo<PaiementLigne[]>(
    () =>
      snap.etudiants.flatMap((e) =>
        e.historique.map((h, i) => ({
          id: `${e.id}-p${i}`,
          etudiantId: e.id,
          cne: e.cne,
          etudiant: `${e.prenom} ${e.nom}`,
          filiere: e.filiere,
          niveau: e.niveau,
          date: h.date,
          montant: h.montant,
          mode: h.mode,
          periode: h.periode,
          recu: h.recu,
          statut: h.statut,
          mois: h.mois,
        })),
      ),
    [snap.etudiants],
  );

  const financier = useMemo(() => {
    const encaisse = paiements
      .filter((p) => p.statut === "paye")
      .reduce((s, p) => s + p.montant, 0);
    const sommeReste = (statut: Etudiant["paiement"]) =>
      snap.etudiants
        .filter((e) => e.paiement === statut)
        .reduce((s, e) => s + e.resteAPayer, 0);
    const totalReste = snap.etudiants.reduce((s, e) => s + e.resteAPayer, 0);

    const ceMois = paiements
      .filter(
        (p) =>
          p.statut === "paye" &&
          new Date(p.date).getMonth() === new Date().getMonth() &&
          new Date(p.date).getFullYear() === new Date().getFullYear(),
      )
      .reduce((s, p) => s + p.montant, 0);

    return {
      encaisse,
      encaisseCeMois: ceMois,
      enAttente: sommeReste("en_attente"),
      impaye: sommeReste("impaye"),
      retard: sommeReste("retard"),
      tauxRecouvrement:
        encaisse + totalReste === 0
          ? 100
          : Math.round((encaisse / (encaisse + totalReste)) * 100),
    };
  }, [paiements, snap.etudiants]);

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
      totalARecouvrer: snap.etudiants.reduce((s, e) => s + e.resteAPayer, 0),
    };
  }, [snap.etudiants, snap.formateurs]);

  const repartitionFiliere = useMemo(
    () =>
      FILIERES.map((f) => ({
        name: FILIERE_COURT[f],
        filiere: f,
        value: snap.etudiants.filter((e) => e.filiere === f).length,
      })),
    [snap.etudiants],
  );

  const repartitionNiveau = useMemo(
    () =>
      NIVEAUX.map((n) => ({
        name: n,
        value: snap.etudiants.filter((e) => e.niveau === n).length,
      })),
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
      snap.etudiants.filter((e) => e.resteAPayer > 0 && e.paiement !== "paye"),
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
    () =>
      FILIERES.map((f) => {
        const inscrits = snap.etudiants.filter(
          (e) => e.filiere === f && e.moyenne > 0,
        );
        const reussite = inscrits.length
          ? Math.round(
              (inscrits.filter((e) => e.moyenne >= 10).length /
                inscrits.length) *
                100,
            )
          : 0;
        return { name: FILIERE_COURT[f], filiere: f, value: reussite };
      }),
    [snap.etudiants],
  );

  const value: IstpmCtx = {
    ...snap,
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
    addFormateur,
    updateFormateur,
    deleteFormateur,
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
    addStage,
    updateStage,
    deleteStage,
    addPaiement,
    setMoisPaiementStatut,
    addNote,
    addFiliere,
    deleteFiliere,
    addStructureAccueil,
    updateStructureAccueil,
    deleteStructureAccueil,
    reset,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useIstpm() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useIstpm must be used within an IstpmProvider");
  return ctx;
}
