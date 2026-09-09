/**
 * Central sample data for the ISTPM CRM (Institut spécialisé des techniques
 * paramédicales   Agadir). Frontend-only, hardcoded placeholder data   no API.
 *
 * All money is in MAD. All labels in French.
 */

/* ------------------------------------------------------------------ */
/*  Référentiels                                                       */
/* ------------------------------------------------------------------ */

export const FILIERES = [
  "Infirmier polyvalent",
  "Infirmier en anesthésie-réanimation",
  "Sage-femme",
  "Kinésithérapie",
  "Radiologie / Imagerie médicale",
  "Laboratoire / Biologie médicale",
  "Prothèse dentaire",
] as const;

export type Filiere = (typeof FILIERES)[number];

/** Abréviation courte d'une filière (pour graphiques / colonnes étroites). */
export const FILIERE_COURT: Record<Filiere, string> = {
  "Infirmier polyvalent": "IP",
  "Infirmier en anesthésie-réanimation": "IADE",
  "Sage-femme": "SF",
  Kinésithérapie: "KINÉ",
  "Radiologie / Imagerie médicale": "RADIO",
  "Laboratoire / Biologie médicale": "LABO",
  "Prothèse dentaire": "PROTH",
};

export const NIVEAUX = ["S1", "S2", "S3", "S4", "S5", "S6"] as const;
export type Niveau = (typeof NIVEAUX)[number];

export const ANNEES_ETUDE = ["1ère année", "2ème année", "3ème année"] as const;
export type AnneeEtude = (typeof ANNEES_ETUDE)[number];

export function anneeEtude(niveau: Niveau): AnneeEtude {
  const n = Number(niveau.slice(1));
  return ANNEES_ETUDE[Math.min(Math.ceil(n / 2), 3) - 1];
}

/** CHU / hôpitaux / cliniques d'accueil (structures de stage réelles au Maroc). */
export type StructureAccueil = {
  nom: string;
  capacite: number;
};


/* ------------------------------------------------------------------ */
/*  Modules   chaque module est rattaché à une filière                 */
/* ------------------------------------------------------------------ */

export type ModuleRecord = {
  id: string;
  nom: string;
  /** Filière de rattachement (obligatoire)   clé par nom, comme partout. */
  filiere: string;
  code?: string | null;
  description?: string | null;
  volumeHoraire?: number | null;
  coefficient?: string | number | null;
};

/** Jeu par défaut, aligné sur le seed du backend (Paramètres › Modules). */

/* ------------------------------------------------------------------ */
/*  Tonalités de badge (mappées vers dash-ui)                          */
/* ------------------------------------------------------------------ */

export type BadgeTone = "teal" | "red" | "amber" | "blue" | "neutral";

/* ------------------------------------------------------------------ */
/*  Étudiants                                                          */
/* ------------------------------------------------------------------ */

export type StatutEtudiant = "inscrit" | "en_attente" | "diplome" | "abandon";
export type StatutPaiement = "paye" | "en_attente" | "retard" | "impaye";

export const STATUT_ETUDIANT_LABEL: Record<StatutEtudiant, string> = {
  inscrit: "Inscrit",
  en_attente: "En attente",
  diplome: "Diplômé",
  abandon: "Abandon",
};

export const STATUT_ETUDIANT_TONE: Record<StatutEtudiant, BadgeTone> = {
  inscrit: "teal",
  en_attente: "amber",
  diplome: "blue",
  abandon: "red",
};

export const STATUT_PAIEMENT_LABEL: Record<StatutPaiement, string> = {
  paye: "Payé",
  en_attente: "En attente",
  retard: "Retard",
  impaye: "Impayé",
};

export const STATUT_PAIEMENT_TONE: Record<StatutPaiement, BadgeTone> = {
  paye: "teal",
  en_attente: "amber",
  retard: "red",
  impaye: "red",
};

export type NoteModule = {
  id?: string;
  module: string;
  note: number; // /20
  coef: number;
  credits: number;
  /** Examen d'origine de la note (facultatif, pour la saisie des notes). */
  examen?: string;
};

export type LignePaiement = {
  date: string;
  montant: number;
  mode: "Espèces" | "Virement" | "Carte" | "Chèque";
  periode: string;
  recu: string;
  statut: StatutPaiement;
  /** Mois de scolarité réglé (« septembre 2025 » … « juin 2026 ») */
  mois?: string;
};

export type PaiementMensuel = {
  id: string;
  etudiantId: string;
  mois: string;
  montantDu: number;
  montantPaye: number;
  datePaiement: string;
  mode: "Espèces" | "Virement" | "Carte" | "Chèque";
  recu: string;
  statut: StatutPaiement;
  notes: string;
};

/** Mois de l'année scolaire, dans l'ordre académique (septembre → juin), sans année. */
export const MOIS_ACADEMIQUE = [
  "septembre",
  "octobre",
  "novembre",
  "décembre",
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
] as const;

export type MoisAcademique = (typeof MOIS_ACADEMIQUE)[number];

/**
 * Génère la liste des mois avec année pour une année universitaire donnée.
 * Exemple : "2025/2026" → ["septembre 2025", …, "juin 2026"]
 */
export function getAcademicYearMonths(academicYear: string): string[] {
  const parts = academicYear.split("/");
  const start = Number.parseInt(parts[0], 10);
  const end = Number.parseInt(parts[1], 10);
  return MOIS_ACADEMIQUE.map((mois, i) => {
    const year = i < 4 ? start : end;
    return `${mois} ${year}`;
  });
}

/** Détermine l'année universitaire courante à partir de la date du jour. */
export function getCurrentAcademicYear(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  return month >= 8 ? `${year}/${year + 1}` : `${year - 1}/${year}`;
}

/** Renvoie le mois académique correspondant à la date du jour. */
export function getDefaultMois(academicYear: string): string {
  const months = getAcademicYearMonths(academicYear);
  const now = new Date();
  const m = now.getMonth();
  let idx: number;
  if (m >= 8 && m <= 11) idx = m - 8;
  else if (m >= 0 && m <= 5) idx = m + 4;
  else idx = 9; // juillet/août → juin
  return months[idx];
}

export type Etudiant = {
  id: string;
  cne: string;
  matricule: string;
  prenom: string;
  nom: string;
  filiere: Filiere;
  niveau: Niveau;
  annee: string;
  groupe: string;
  statut: StatutEtudiant;
  paiement: StatutPaiement;
  moyenne: number; // /20
  /** Photo d'identité (data URL ou URL). Téléversée par l'étudiant depuis son espace. */
  photoUrl?: string;
  // Fiche
  telephone: string;
  email: string;
  dateNaissance: string;
  ville: string;
  fraisMensuels: number;
  notes: NoteModule[];
  historique: LignePaiement[];
  stageEnCours?: string;
  /**
   * Statut de paiement mois par mois (scolarité mensuelle).
   * Clé = mois (« septembre 2025 » … « juin 2026 »), valeur = statut du règlement.
   */
  paiementsMensuels?: Partial<Record<string, StatutPaiement>>;
  paiementsMensuelsRecords: PaiementMensuel[];
  archived: boolean;
};


/* ------------------------------------------------------------------ */
/*  Formateurs                                                         */
/* ------------------------------------------------------------------ */

export type GradeFormateur = "PES" | "vacataire" | "formateur_clinique";
export type StatutFormateur = "permanent" | "vacataire" | "en_conge";

export const GRADE_LABEL: Record<GradeFormateur, string> = {
  PES: "PES",
  vacataire: "Vacataire",
  formateur_clinique: "Formateur clinique",
};

export const STATUT_FORMATEUR_LABEL: Record<StatutFormateur, string> = {
  permanent: "Permanent",
  vacataire: "Vacataire",
  en_conge: "En congé",
};

export const STATUT_FORMATEUR_TONE: Record<StatutFormateur, BadgeTone> = {
  permanent: "teal",
  vacataire: "blue",
  en_conge: "amber",
};

export type GroupConfig = {
  id: string;
  name: string;
  semester: string;
  studentCount: number;
};


export type Formateur = {
  id: string;
  /** Compte lié (`users.id`), posé par le serveur ; absent des fiches orphelines. */
  userId?: string;
  matricule: string;
  cin: string;
  prenom: string;
  nom: string;
  grade: GradeFormateur;
  departement: Filiere;
  modules: string[];
  groupes: string[];
  statut: StatutFormateur;
  telephone: string;
  email: string;
  notesSaisies: number;
  archived?: boolean;
};


/* ------------------------------------------------------------------ */
/*  Examens                                                            */
/* ------------------------------------------------------------------ */

export type TypeExamen =
  | "controle_continu"
  | "examen_theorique"
  | "evaluation_pratique"
  | "rattrapage";
export type StatutExamen = "planifie" | "en_cours" | "notes_saisies";

export const TYPE_EXAMEN_LABEL: Record<TypeExamen, string> = {
  controle_continu: "Contrôle continu",
  examen_theorique: "Examen théorique",
  evaluation_pratique: "Évaluation pratique (TP)",
  rattrapage: "Rattrapage",
};

export const STATUT_EXAMEN_LABEL: Record<StatutExamen, string> = {
  planifie: "Planifié",
  en_cours: "En cours",
  notes_saisies: "Notes saisies",
};

export const STATUT_EXAMEN_TONE: Record<StatutExamen, BadgeTone> = {
  planifie: "blue",
  en_cours: "amber",
  notes_saisies: "teal",
};

/**
 * Métadonnées du sujet d'examen déposé par le formateur.
 *
 * Le fichier lui-même vit côté serveur (MinIO, via
 * `GET /api/examens/:id/document`) ; seuls `nom`/`taille`/`mime` sont
 * persistés en base (`examens.document_*`). `id` est la clé objet serveur.
 */
export type ExamDocument = {
  id: string;
  nom: string;
  /** Taille en octets. */
  taille: number;
  mime: string;
  /** ISO   date de dépôt. */
  uploadedAt: string;
};

export type AnneeUniversitaire = string;

export type Examen = {
  id: string;
  titre: string;
  module: string;
  filiere: Filiere;
  /** Le niveau tient lieu de semestre (S1–S6). */
  niveau: Niveau;
  /** Classe / groupe convoqué, ex. « S5-G1 ». */
  classe: string;
  anneeUniversitaire: string;
  type: TypeExamen;
  date: string;
  heure: string;
  /** Durée en minutes. */
  duree: number;
  salle: string;
  surveillants: string[];
  statut: StatutExamen;
  etudiantsConvoques: number;
  composante: "Théorique" | "Pratique" | "Théorique + Pratique";
  description?: string;
  /** Identifiant du formateur auteur   renseigné automatiquement. */
  createdBy: string;
  document?: ExamDocument;
};

/** Durées proposées à la création (minutes). */
export const DUREES_EXAMEN = [30, 45, 60, 90, 120, 150, 180, 240] as const;

export function fmtDuree(minutes: number): string {
  if (!minutes) return " ";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m} min`;
  return m ? `${h} h ${String(m).padStart(2, "0")}` : `${h} h`;
}

export function fmtTaille(octets: number): string {
  if (octets < 1024) return `${octets} o`;
  if (octets < 1024 * 1024) return `${Math.round(octets / 1024)} Ko`;
  return `${(octets / (1024 * 1024)).toFixed(1)} Mo`;
}


/* ------------------------------------------------------------------ */
/*  Bulletins                                                          */
/* ------------------------------------------------------------------ */

export type Mention = "Passable" | "Assez bien" | "Bien" | "Très bien";
export type Decision =
  | "Admis"
  | "Ajourné"
  | "Rattrapage"
  | "Admis avec dette";
export type SessionType = "normale" | "rattrapage";
export type StatutBulletin = "genere" | "valide" | "publie";

export const DECISION_TONE: Record<Decision, BadgeTone> = {
  Admis: "teal",
  "Admis avec dette": "amber",
  Rattrapage: "amber",
  Ajourné: "red",
};

export const MENTION_TONE: Record<Mention, BadgeTone> = {
  "Très bien": "teal",
  Bien: "teal",
  "Assez bien": "blue",
  Passable: "neutral",
};

export const STATUT_BULLETIN_LABEL: Record<StatutBulletin, string> = {
  genere: "Généré",
  valide: "Validé",
  publie: "Publié",
};

export const STATUT_BULLETIN_TONE: Record<StatutBulletin, BadgeTone> = {
  genere: "neutral",
  valide: "blue",
  publie: "teal",
};

export type Bulletin = {
  id: string;
  etudiantId: string;
  cne: string;
  prenom: string;
  nom: string;
  filiere: Filiere;
  niveau: Niveau;
  session: SessionType;
  moyenne: number;
  mention: Mention;
  decision: Decision;
  statut: StatutBulletin;
  notes: NoteModule[];
  evaluationClinique: number;
};



/* ------------------------------------------------------------------ */
/*  Stages cliniques                                                   */
/* ------------------------------------------------------------------ */

export type StatutStage =
  | "recherche"
  | "convention_signee"
  | "en_cours"
  | "soutenance"
  | "valide";

export const STATUT_STAGE_LABEL: Record<StatutStage, string> = {
  recherche: "Recherche",
  convention_signee: "Convention signée",
  en_cours: "En cours",
  soutenance: "Soutenance",
  valide: "Validé",
};

export const STATUT_STAGE_TONE: Record<StatutStage, BadgeTone> = {
  recherche: "amber",
  convention_signee: "blue",
  en_cours: "blue",
  soutenance: "amber",
  valide: "teal",
};

export type Stage = {
  id: string;
  etudiantId: string;
  cne: string;
  prenom: string;
  nom: string;
  filiere: Filiere;
  niveau: Niveau;
  structure: string;
  service: string;
  encadrantClinique: string;
  tuteurAcademique: string;
  debut: string;
  fin: string;
  statut: StatutStage;
  conventionSignee: boolean;
  noteSoutenance?: number;
};


/* ------------------------------------------------------------------ */
/*  Paiements (agrégés depuis les étudiants)                           */
/* ------------------------------------------------------------------ */

export type PaiementLigne = {
  id: string;
  etudiantId: string;
  cne: string;
  etudiant: string;
  filiere: Filiere;
  niveau: Niveau;
  date: string;
  montant: number;
  mode: LignePaiement["mode"];
  periode: string;
  recu: string;
  statut: StatutPaiement;
  mois?: string;
};

/**
 * Entrée du fil « activité récente » du tableau de bord.
 *
 * Dérivé à l'affichage depuis les lignes serveur (examens, stages,
 * paiements) — jamais persisté, jamais en session seule.
 */
export type ActiviteItem = {
  type: "inscription" | "note" | "paiement";
  texte: string;
  date: string;
};


/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

export function fmtMAD(n: number | null | undefined): string {
  const val = typeof n === "number" && Number.isFinite(n) ? n : 0;
  return `${val.toLocaleString("fr-FR")} MAD`;
}

export function fmtDate(iso: string): string {
  if (!iso || iso === " ") return " ";
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/* ------------------------------------------------------------------ */
/*  Planning   séances d'enseignement                                  */
/* ------------------------------------------------------------------ */

/** Salles et espaces pédagogiques de l'institut. */

/** Groupes / classes constitués. */

/** Créneaux horaires standards de l'emploi du temps. */
/** Plage horaire officielle de l'emploi du temps. */
export type Creneau = { debut: string; fin: string };

export const CRENEAUX: readonly Creneau[] = [
  { debut: "08:30", fin: "10:00" },
  { debut: "10:15", fin: "11:45" },
  { debut: "12:00", fin: "13:30" },
  { debut: "14:00", fin: "15:30" },
  { debut: "15:45", fin: "17:15" },
  { debut: "17:30", fin: "19:00" },
];

/** Bornes de repli de la grille horaire, si aucun créneau n'est paramétré. */
export const PLANNING_HEURE_DEBUT = 8;
export const PLANNING_HEURE_FIN = 19;

/** Libellé éditable d'un créneau, tel qu'affiché dans les Paramètres. */
export function formatCreneau(c: Creneau): string {
  return `${c.debut} – ${c.fin}`;
}


/**
 * Relit les créneaux saisis dans les Paramètres.
 *
 * Le réglage est stocké en texte libre (« 08:30 – 10:00 »), saisi à la main :
 * le séparateur peut être un tiret court, long ou cadratin, et les espaces
 * sont variables. Les lignes illisibles sont ignorées plutôt que de casser la
 * grille, et le résultat est trié par heure de début.
 */
export function parseCreneaux(labels: readonly string[]): Creneau[] {
  const out: Creneau[] = [];
  for (const label of labels) {
    const m = String(label).match(
      /(\d{1,2})\s*[:hH]\s*(\d{2}).*?[-–—]\s*(\d{1,2})\s*[:hH]\s*(\d{2})/,
    );
    if (!m) continue;
    const pad = (n: string) => n.padStart(2, "0");
    const debut = `${pad(m[1])}:${m[2]}`;
    const fin = `${pad(m[3])}:${m[4]}`;
    if (minutesDepuisMinuit(fin) <= minutesDepuisMinuit(debut)) continue;
    out.push({ debut, fin });
  }
  return out.sort(
    (a, b) => minutesDepuisMinuit(a.debut) - minutesDepuisMinuit(b.debut),
  );
}

/**
 * Bornes de la grille horaire déduites des créneaux paramétrés : l'heure pleine
 * juste avant le premier créneau, l'heure pleine juste après le dernier. La
 * grille suit ainsi les Paramètres au lieu d'une plage figée.
 */
export function bornesGrilleHoraire(creneaux: readonly Creneau[]): {
  debut: number;
  fin: number;
} {
  if (!creneaux.length)
    return { debut: PLANNING_HEURE_DEBUT, fin: PLANNING_HEURE_FIN };
  const min = Math.min(...creneaux.map((c) => minutesDepuisMinuit(c.debut)));
  const max = Math.max(...creneaux.map((c) => minutesDepuisMinuit(c.fin)));
  const debut = Math.floor(min / 60);
  const fin = Math.ceil(max / 60);
  // Une grille d'au moins deux heures reste lisible même avec un seul créneau.
  return { debut, fin: Math.max(fin, debut + 2) };
}

export type TypeSeance = "cours" | "td" | "tp" | "stage";

export const TYPE_SEANCE_LABEL: Record<TypeSeance, string> = {
  cours: "Cours",
  td: "TD",
  tp: "TP",
  stage: "Encadrement stage",
};

export type Seance = {
  id: string;
  module: string;
  /** Identifiant du formateur (voir FORMATEURS). */
  professeurId: string;
  /** Filière / département concerné. */
  filiere: Filiere;
  groupe: string;
  salle: string;
  /** ISO `YYYY-MM-DD`. */
  date: string;
  /** `HH:MM` sur 24 h. */
  debut: string;
  fin: string;
  anneeUniversitaire: string;
  semestre: Niveau;
  type: TypeSeance;
  notes?: string;
};

/**
 * Palette des séances   une teinte stable par module.
 *
 * La couleur est dérivée du nom du module plutôt que stockée : deux séances du
 * même module se ressemblent toujours, sans champ à maintenir.
 */
export const SEANCE_COULEURS = [
  { bg: "#029994", soft: "#d6efee", text: "#015b58" },
  { bg: "#2f6fb0", soft: "#dfeaf6", text: "#1d4a78" },
  { bg: "#7b5ea7", soft: "#ece5f5", text: "#523d73" },
  { bg: "#d98324", soft: "#fbebd6", text: "#8f5413" },
  { bg: "#2f8f5b", soft: "#daf0e4", text: "#1d5c3a" },
  { bg: "#c2436b", soft: "#f8dde5", text: "#8a2b49" },
  { bg: "#0f7b8a", soft: "#d5eef1", text: "#0a505a" },
  { bg: "#8a6d3b", soft: "#efe6d4", text: "#5c4826" },
] as const;

export function couleurSeance(module: string) {
  let hash = 0;
  for (let i = 0; i < module.length; i += 1) {
    hash = (hash * 31 + module.charCodeAt(i)) >>> 0;
  }
  return SEANCE_COULEURS[hash % SEANCE_COULEURS.length];
}

/** Minutes écoulées depuis minuit, pour positionner une séance. */
export function minutesDepuisMinuit(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + (m || 0);
}

export function ajouterMinutes(hhmm: string, delta: number): string {
  const total = Math.max(0, minutesDepuisMinuit(hhmm) + delta);
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Lundi de la semaine contenant `d` (semaine ISO, lundi = premier jour). */
export function lundiDeLaSemaine(d: Date): Date {
  const copie = new Date(d);
  const jour = (copie.getDay() + 6) % 7;
  copie.setDate(copie.getDate() - jour);
  copie.setHours(0, 0, 0, 0);
  return copie;
}

export function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

/**
 * Bornes de l'année universitaire : du 1er septembre au 30 juin.
 *
 * Juillet et août sont hors année scolaire — aucune séance n'y est planifiée.
 */
export function bornesAnneeUniversitaire(annee = getCurrentAcademicYear()): {
  debut: Date;
  fin: Date;
} {
  const [an1, an2] = annee.split("/").map((y) => Number.parseInt(y, 10));
  return { debut: new Date(an1, 8, 1), fin: new Date(an2, 5, 30) };
}

/* ------------------------------------------------------------------ */
/*  Jours chômés   fêtes nationales, fêtes religieuses, vacances        */
/* ------------------------------------------------------------------ */

export type TypeJourChome = "ferie" | "vacances";
/** Jour sans cours : fête légale ou période de vacances scolaires. */
export type JourChome = { nom: string; type: TypeJourChome };

/**
 * Fêtes nationales marocaines à date fixe (calendrier grégorien).
 *
 * La Fête du Trône (30 juillet), l'Allégeance Oued Eddahab (14 août), la
 * Révolution du Roi et du Peuple (20 août) et la Fête de la Jeunesse (21 août)
 * ne figurent pas ici : elles tombent hors année scolaire.
 */
