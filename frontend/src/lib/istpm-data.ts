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

/** CHU / hôpitaux / cliniques d'accueil (structures de stage réelles au Maroc). */
export const STRUCTURES_ACCUEIL = [
  "CHR Hassan II   Agadir",
  "CHU Ibn Rochd   Casablanca",
  "CHU Mohammed VI   Marrakech",
  "Hôpital Hassan II   Agadir",
  "Clinique Al Massira   Agadir",
  "Hôpital préfectoral Inezgane",
  "Clinique Ennakhil   Agadir",
] as const;

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
  archived: boolean;
};

export const ETUDIANTS: Etudiant[] = [
  {
    id: "et-1",
    cne: "G134567890",
    matricule: "ISTPM-23-0142",
    prenom: "Salma",
    nom: "El Amrani",
    filiere: "Infirmier polyvalent",
    niveau: "S5",
    annee: "3e année",
    groupe: "G1",
    statut: "inscrit",
    paiement: "paye",
    moyenne: 14.6,
    telephone: "+212 6 61 24 55 018",
    email: "salma.elamrani@istpm.ma",
    dateNaissance: "2003-04-12",
    ville: "Agadir",
    fraisMensuels: 3400,
    notes: [
      { module: "Soins infirmiers en médecine", note: 15.5, coef: 3, credits: 6 },
      { module: "Pharmacologie", note: 13.0, coef: 2, credits: 4 },
      { module: "Santé publique", note: 14.75, coef: 2, credits: 4 },
      { module: "Éthique et déontologie", note: 16.0, coef: 1, credits: 2 },
    ],
    historique: [
      { date: "2025-10-05", montant: 12000, mode: "Virement", periode: "Tranche 1   2025/26", recu: "ISTPM-R-2510-018", statut: "paye" },
      { date: "2026-01-14", montant: 11000, mode: "Chèque", periode: "Tranche 2   2025/26", recu: "ISTPM-R-2601-051", statut: "paye" },
      { date: "2026-04-10", montant: 11000, mode: "Virement", periode: "Tranche 3   2025/26", recu: "ISTPM-R-2604-077", statut: "paye" },
    ],
    paiementsMensuels: {
      "septembre 2025": "paye",
      "octobre 2025": "paye",
      "novembre 2025": "paye",
      "décembre 2025": "paye",
      "janvier 2026": "paye",
      "février 2026": "paye",
      "mars 2026": "paye",
      "avril 2026": "paye",
      "mai 2026": "paye",
      "juin 2026": "paye",
    },
    stageEnCours: "CHR Hassan II   Service de Médecine interne",
    archived: false,
  },
  {
    id: "et-2",
    cne: "J138245017",
    matricule: "ISTPM-23-0155",
    prenom: "Youssef",
    nom: "Ait Taleb",
    filiere: "Infirmier en anesthésie-réanimation",
    niveau: "S5",
    annee: "3e année",
    groupe: "G1",
    statut: "inscrit",
    paiement: "retard",
    moyenne: 12.3,
    telephone: "+212 6 70 11 42 88",
    email: "y.aittaleb@istpm.ma",
    dateNaissance: "2002-11-30",
    ville: "Inezgane",
    fraisMensuels: 3800,
    notes: [
      { module: "Réanimation et soins intensifs", note: 13.5, coef: 3, credits: 6 },
      { module: "Anesthésie clinique", note: 11.0, coef: 3, credits: 6 },
      { module: "Physiologie appliquée", note: 12.25, coef: 2, credits: 4 },
    ],
    historique: [
      { date: "2025-10-09", montant: 13000, mode: "Espèces", periode: "Tranche 1   2025/26", recu: "ISTPM-R-2510-033", statut: "paye" },
      { date: "2026-01-20", montant: 12000, mode: "Virement", periode: "Tranche 2   2025/26", recu: "ISTPM-R-2601-064", statut: "paye" },
      { date: " ", montant: 13000, mode: "Virement", periode: "Tranche 3   2025/26", recu: " ", statut: "retard" },
    ],
    paiementsMensuels: {
      "septembre 2025": "paye",
      "octobre 2025": "paye",
      "novembre 2025": "paye",
      "décembre 2025": "paye",
      "janvier 2026": "paye",
      "février 2026": "paye",
      "mars 2026": "paye",
      "avril 2026": "retard",
      "mai 2026": "retard",
      "juin 2026": "retard",
    },
    stageEnCours: "CHR Hassan II   Bloc opératoire",
    archived: false,
  },
  {
    id: "et-3",
    cne: "F145908712",
    matricule: "ISTPM-24-0203",
    prenom: "Imane",
    nom: "Benkirane",
    filiere: "Sage-femme",
    niveau: "S3",
    annee: "2e année",
    groupe: "G2",
    statut: "inscrit",
    paiement: "paye",
    moyenne: 15.9,
    telephone: "+212 6 55 78 90 12",
    email: "i.benkirane@istpm.ma",
    dateNaissance: "2004-02-18",
    ville: "Agadir",
    fraisMensuels: 3200,
    notes: [
      { module: "Obstétrique", note: 16.5, coef: 3, credits: 6 },
      { module: "Suivi de grossesse", note: 15.0, coef: 2, credits: 4 },
      { module: "Néonatologie", note: 16.25, coef: 2, credits: 4 },
    ],
    historique: [
      { date: "2025-09-28", montant: 16000, mode: "Virement", periode: "Tranche 1   2025/26", recu: "ISTPM-R-2509-004", statut: "paye" },
      { date: "2026-02-02", montant: 16000, mode: "Carte", periode: "Tranche 2   2025/26", recu: "ISTPM-R-2602-088", statut: "paye" },
    ],
    paiementsMensuels: {
      "septembre 2025": "paye",
      "octobre 2025": "paye",
      "novembre 2025": "paye",
      "décembre 2025": "paye",
      "janvier 2026": "paye",
      "février 2026": "paye",
      "mars 2026": "paye",
      "avril 2026": "paye",
      "mai 2026": "paye",
      "juin 2026": "paye",
    },
    stageEnCours: "Hôpital Hassan II   Maternité",
    archived: false,
  },
  {
    id: "et-4",
    cne: "M139874521",
    matricule: "ISTPM-24-0211",
    prenom: "Anas",
    nom: "Chafik",
    filiere: "Kinésithérapie",
    niveau: "S3",
    annee: "2e année",
    groupe: "G1",
    statut: "inscrit",
    paiement: "en_attente",
    moyenne: 11.2,
    telephone: "+212 6 12 34 56 78",
    email: "a.chafik@istpm.ma",
    dateNaissance: "2003-07-05",
    ville: "Taroudant",
    fraisMensuels: 3300,
    notes: [
      { module: "Rééducation fonctionnelle", note: 12.0, coef: 3, credits: 6 },
      { module: "Anatomie du mouvement", note: 10.5, coef: 2, credits: 4 },
      { module: "Kinésithérapie respiratoire", note: 11.0, coef: 2, credits: 4 },
    ],
    historique: [
      { date: "2025-10-15", montant: 16500, mode: "Chèque", periode: "Tranche 1   2025/26", recu: "ISTPM-R-2510-045", statut: "paye" },
      { date: " ", montant: 16500, mode: "Virement", periode: "Tranche 2   2025/26", recu: " ", statut: "en_attente" },
    ],
    paiementsMensuels: {
      "septembre 2025": "paye",
      "octobre 2025": "paye",
      "novembre 2025": "paye",
      "décembre 2025": "paye",
      "janvier 2026": "paye",
      "février 2026": "en_attente",
      "mars 2026": "en_attente",
      "avril 2026": "en_attente",
      "mai 2026": "en_attente",
      "juin 2026": "en_attente",
    },
    stageEnCours: "Clinique Al Massira   Rééducation",
    archived: false,
  },
  {
    id: "et-5",
    cne: "D141200983",
    matricule: "ISTPM-22-0098",
    prenom: "Khadija",
    nom: "Ouhssaine",
    filiere: "Radiologie / Imagerie médicale",
    niveau: "S6",
    annee: "3e année",
    groupe: "G1",
    statut: "inscrit",
    paiement: "paye",
    moyenne: 13.7,
    telephone: "+212 6 88 45 21 09",
    email: "k.ouhssaine@istpm.ma",
    dateNaissance: "2002-05-22",
    ville: "Agadir",
    fraisMensuels: 3500,
    notes: [
      { module: "Techniques de radiologie", note: 14.0, coef: 3, credits: 6 },
      { module: "Scanner et IRM", note: 13.5, coef: 3, credits: 6 },
      { module: "Radioprotection", note: 13.0, coef: 2, credits: 4 },
    ],
    historique: [
      { date: "2025-09-30", montant: 17500, mode: "Virement", periode: "Tranche 1   2025/26", recu: "ISTPM-R-2509-011", statut: "paye" },
      { date: "2026-01-30", montant: 17500, mode: "Virement", periode: "Tranche 2   2025/26", recu: "ISTPM-R-2601-072", statut: "paye" },
    ],
    paiementsMensuels: {
      "septembre 2025": "paye",
      "octobre 2025": "paye",
      "novembre 2025": "paye",
      "décembre 2025": "paye",
      "janvier 2026": "paye",
      "février 2026": "paye",
      "mars 2026": "paye",
      "avril 2026": "paye",
      "mai 2026": "paye",
      "juin 2026": "paye",
    },
    stageEnCours: "CHR Hassan II   Service d'imagerie",
    archived: false,
  },
  {
    id: "et-6",
    cne: "H137654210",
    matricule: "ISTPM-22-0104",
    prenom: "Omar",
    nom: "Bennani",
    filiere: "Laboratoire / Biologie médicale",
    niveau: "S6",
    annee: "3e année",
    groupe: "G2",
    statut: "inscrit",
    paiement: "impaye",
    moyenne: 9.4,
    telephone: "+212 6 33 90 18 45",
    email: "o.bennani@istpm.ma",
    dateNaissance: "2002-09-14",
    ville: "Agadir",
    fraisMensuels: 3300,
    notes: [
      { module: "Hématologie", note: 8.5, coef: 3, credits: 6 },
      { module: "Biochimie clinique", note: 10.0, coef: 3, credits: 6 },
      { module: "Microbiologie", note: 9.75, coef: 2, credits: 4 },
    ],
    historique: [
      { date: " ", montant: 16500, mode: "Virement", periode: "Tranche 1   2025/26", recu: " ", statut: "impaye" },
    ],
    paiementsMensuels: {
      "septembre 2025": "impaye",
      "octobre 2025": "impaye",
      "novembre 2025": "impaye",
      "décembre 2025": "impaye",
      "janvier 2026": "impaye",
      "février 2026": "impaye",
      "mars 2026": "impaye",
      "avril 2026": "impaye",
      "mai 2026": "impaye",
      "juin 2026": "impaye",
    },
    stageEnCours: "Hôpital Hassan II   Laboratoire d'analyses",
    archived: false,
  },
  {
    id: "et-7",
    cne: "S144210087",
    matricule: "ISTPM-24-0230",
    prenom: "Fatima Zahra",
    nom: "Lahlou",
    filiere: "Prothèse dentaire",
    niveau: "S1",
    annee: "1re année",
    groupe: "A",
    statut: "inscrit",
    paiement: "paye",
    moyenne: 13.1,
    telephone: "+212 6 47 22 88 90",
    email: "fz.lahlou@istpm.ma",
    dateNaissance: "2005-01-08",
    ville: "Aït Melloul",
    fraisMensuels: 3000,
    notes: [
      { module: "Anatomie dentaire", note: 14.0, coef: 2, credits: 4 },
      { module: "Matériaux de prothèse", note: 12.5, coef: 2, credits: 4 },
      { module: "Prothèse fixe (TP)", note: 13.0, coef: 3, credits: 6 },
    ],
    historique: [
      { date: "2025-10-02", montant: 15000, mode: "Espèces", periode: "Tranche 1   2025/26", recu: "ISTPM-R-2510-002", statut: "paye" },
      { date: "2026-02-10", montant: 15000, mode: "Carte", periode: "Tranche 2   2025/26", recu: "ISTPM-R-2602-095", statut: "paye" },
    ],
    paiementsMensuels: {
      "septembre 2025": "paye",
      "octobre 2025": "paye",
      "novembre 2025": "paye",
      "décembre 2025": "paye",
      "janvier 2026": "paye",
      "février 2026": "paye",
      "mars 2026": "paye",
      "avril 2026": "paye",
      "mai 2026": "paye",
      "juin 2026": "paye",
    },
    archived: false,
  },
  {
    id: "et-8",
    cne: "R142870031",
    matricule: "ISTPM-24-0245",
    prenom: "Mehdi",
    nom: "Sabri",
    filiere: "Infirmier polyvalent",
    niveau: "S1",
    annee: "1re année",
    groupe: "B",
    statut: "inscrit",
    paiement: "retard",
    moyenne: 10.8,
    telephone: "+212 6 90 34 12 67",
    email: "m.sabri@istpm.ma",
    dateNaissance: "2005-03-25",
    ville: "Agadir",
    fraisMensuels: 3400,
    notes: [
      { module: "Bases des soins infirmiers", note: 11.0, coef: 3, credits: 6 },
      { module: "Anatomie-physiologie", note: 10.5, coef: 2, credits: 4 },
      { module: "Hygiène hospitalière", note: 11.25, coef: 2, credits: 4 },
    ],
    historique: [
      { date: "2025-10-12", montant: 12000, mode: "Espèces", periode: "Tranche 1   2025/26", recu: "ISTPM-R-2510-058", statut: "paye" },
      { date: "2026-01-25", montant: 11000, mode: "Virement", periode: "Tranche 2   2025/26", recu: "ISTPM-R-2601-081", statut: "paye" },
      { date: " ", montant: 11000, mode: "Virement", periode: "Tranche 3   2025/26", recu: " ", statut: "retard" },
    ],
    paiementsMensuels: {
      "septembre 2025": "paye",
      "octobre 2025": "paye",
      "novembre 2025": "paye",
      "décembre 2025": "paye",
      "janvier 2026": "paye",
      "février 2026": "paye",
      "mars 2026": "paye",
      "avril 2026": "retard",
      "mai 2026": "retard",
      "juin 2026": "retard",
    },
    archived: false,
  },
  {
    id: "et-9",
    cne: "B140095512",
    matricule: "ISTPM-23-0167",
    prenom: "Hajar",
    nom: "Idrissi",
    filiere: "Sage-femme",
    niveau: "S4",
    annee: "2e année",
    groupe: "G1",
    statut: "inscrit",
    paiement: "paye",
    moyenne: 14.2,
    telephone: "+212 6 21 76 43 90",
    email: "h.idrissi@istpm.ma",
    dateNaissance: "2003-12-01",
    ville: "Agadir",
    fraisMensuels: 3200,
    notes: [
      { module: "Obstétrique avancée", note: 15.0, coef: 3, credits: 6 },
      { module: "Pathologies de la grossesse", note: 13.5, coef: 2, credits: 4 },
    ],
    historique: [
      { date: "2025-10-01", montant: 12000, mode: "Virement", periode: "Tranche 1   2025/26", recu: "ISTPM-R-2510-009", statut: "paye" },
      { date: "2026-01-18", montant: 12000, mode: "Chèque", periode: "Tranche 2   2025/26", recu: "ISTPM-R-2601-060", statut: "paye" },
      { date: " ", montant: 8000, mode: "Virement", periode: "Tranche 3   2025/26", recu: " ", statut: "en_attente" },
    ],
    paiementsMensuels: {
      "septembre 2025": "paye",
      "octobre 2025": "paye",
      "novembre 2025": "paye",
      "décembre 2025": "paye",
      "janvier 2026": "paye",
      "février 2026": "paye",
      "mars 2026": "paye",
      "avril 2026": "paye",
      "mai 2026": "en_attente",
      "juin 2026": "en_attente",
    },
    stageEnCours: "Hôpital préfectoral Inezgane   Maternité",
    archived: false,
  },
  {
    id: "et-10",
    cne: "K139001284",
    matricule: "ISTPM-23-0178",
    prenom: "Zakaria",
    nom: "Moutaouakil",
    filiere: "Kinésithérapie",
    niveau: "S4",
    annee: "2e année",
    groupe: "G2",
    statut: "inscrit",
    paiement: "paye",
    moyenne: 13.9,
    telephone: "+212 6 64 30 11 22",
    email: "z.moutaouakil@istpm.ma",
    dateNaissance: "2003-06-19",
    ville: "Ouarzazate",
    fraisMensuels: 3300,
    notes: [
      { module: "Kinésithérapie orthopédique", note: 14.5, coef: 3, credits: 6 },
      { module: "Électrothérapie", note: 13.0, coef: 2, credits: 4 },
    ],
    historique: [
      { date: "2025-09-29", montant: 16500, mode: "Virement", periode: "Tranche 1   2025/26", recu: "ISTPM-R-2509-007", statut: "paye" },
      { date: "2026-02-05", montant: 16500, mode: "Virement", periode: "Tranche 2   2025/26", recu: "ISTPM-R-2602-090", statut: "paye" },
    ],
    paiementsMensuels: {
      "septembre 2025": "paye",
      "octobre 2025": "paye",
      "novembre 2025": "paye",
      "décembre 2025": "paye",
      "janvier 2026": "paye",
      "février 2026": "paye",
      "mars 2026": "paye",
      "avril 2026": "paye",
      "mai 2026": "paye",
      "juin 2026": "paye",
    },
    archived: false,
  },
  {
    id: "et-11",
    cne: "T143562019",
    matricule: "ISTPM-24-0251",
    prenom: "Nisrine",
    nom: "Fadili",
    filiere: "Radiologie / Imagerie médicale",
    niveau: "S2",
    annee: "1re année",
    groupe: "A",
    statut: "inscrit",
    paiement: "en_attente",
    moyenne: 12.6,
    telephone: "+212 6 78 45 60 33",
    email: "n.fadili@istpm.ma",
    dateNaissance: "2005-08-11",
    ville: "Agadir",
    fraisMensuels: 3500,
    notes: [
      { module: "Physique des rayonnements", note: 12.0, coef: 2, credits: 4 },
      { module: "Introduction à l'imagerie", note: 13.25, coef: 2, credits: 4 },
    ],
    historique: [
      { date: "2025-10-18", montant: 17500, mode: "Chèque", periode: "Tranche 1   2025/26", recu: "ISTPM-R-2510-062", statut: "paye" },
      { date: " ", montant: 17500, mode: "Virement", periode: "Tranche 2   2025/26", recu: " ", statut: "en_attente" },
    ],
    paiementsMensuels: {
      "septembre 2025": "paye",
      "octobre 2025": "paye",
      "novembre 2025": "paye",
      "décembre 2025": "paye",
      "janvier 2026": "paye",
      "février 2026": "en_attente",
      "mars 2026": "en_attente",
      "avril 2026": "en_attente",
      "mai 2026": "en_attente",
      "juin 2026": "en_attente",
    },
    archived: false,
  },
  {
    id: "et-12",
    cne: "L138744120",
    matricule: "ISTPM-22-0087",
    prenom: "Ayoub",
    nom: "Naciri",
    filiere: "Infirmier en anesthésie-réanimation",
    niveau: "S6",
    annee: "3e année",
    groupe: "G1",
    statut: "diplome",
    paiement: "paye",
    moyenne: 15.4,
    telephone: "+212 6 55 12 90 84",
    email: "a.naciri@istpm.ma",
    dateNaissance: "2002-01-27",
    ville: "Agadir",
    fraisMensuels: 3800,
    notes: [
      { module: "Réanimation avancée", note: 16.0, coef: 3, credits: 6 },
      { module: "Prise en charge de la douleur", note: 15.0, coef: 2, credits: 4 },
    ],
    historique: [
      { date: "2025-09-25", montant: 19000, mode: "Virement", periode: "Tranche 1   2025/26", recu: "ISTPM-R-2509-001", statut: "paye" },
      { date: "2026-01-15", montant: 19000, mode: "Virement", periode: "Tranche 2   2025/26", recu: "ISTPM-R-2601-052", statut: "paye" },
    ],
    paiementsMensuels: {
      "septembre 2025": "paye",
      "octobre 2025": "paye",
      "novembre 2025": "paye",
      "décembre 2025": "paye",
      "janvier 2026": "paye",
      "février 2026": "paye",
      "mars 2026": "paye",
      "avril 2026": "paye",
      "mai 2026": "paye",
      "juin 2026": "paye",
    },
    archived: false,
  },
  {
    id: "et-13",
    cne: "N142008874",
    matricule: "ISTPM-24-0260",
    prenom: "Sara",
    nom: "El Ghazi",
    filiere: "Laboratoire / Biologie médicale",
    niveau: "S2",
    annee: "1re année",
    groupe: "B",
    statut: "en_attente",
    paiement: "impaye",
    moyenne: 8.7,
    telephone: "+212 6 41 55 78 20",
    email: "s.elghazi@istpm.ma",
    dateNaissance: "2005-10-03",
    ville: "Tiznit",
    fraisMensuels: 3300,
    notes: [
      { module: "Bases de biochimie", note: 9.0, coef: 2, credits: 4 },
      { module: "Techniques de laboratoire", note: 8.5, coef: 2, credits: 4 },
    ],
    historique: [
      { date: " ", montant: 16500, mode: "Virement", periode: "Tranche 1   2025/26", recu: " ", statut: "impaye" },
    ],
    paiementsMensuels: {
      "septembre 2025": "impaye",
      "octobre 2025": "impaye",
      "novembre 2025": "impaye",
      "décembre 2025": "impaye",
      "janvier 2026": "impaye",
      "février 2026": "impaye",
      "mars 2026": "impaye",
      "avril 2026": "impaye",
      "mai 2026": "impaye",
      "juin 2026": "impaye",
    },
    archived: false,
  },
  {
    id: "et-14",
    cne: "C139887654",
    matricule: "ISTPM-23-0190",
    prenom: "Bilal",
    nom: "Ramdani",
    filiere: "Prothèse dentaire",
    niveau: "S4",
    annee: "2e année",
    groupe: "A",
    statut: "abandon",
    paiement: "impaye",
    moyenne: 7.9,
    telephone: "+212 6 60 21 43 77",
    email: "b.ramdani@istpm.ma",
    dateNaissance: "2003-04-30",
    ville: "Agadir",
    fraisMensuels: 3000,
    notes: [
      { module: "Prothèse amovible (TP)", note: 8.0, coef: 3, credits: 6 },
      { module: "Occlusodontie", note: 7.5, coef: 2, credits: 4 },
    ],
    historique: [
      { date: "2025-10-08", montant: 8000, mode: "Espèces", periode: "Tranche 1   2025/26", recu: "ISTPM-R-2510-040", statut: "paye" },
      { date: " ", montant: 22000, mode: "Virement", periode: "Solde 2025/26", recu: " ", statut: "impaye" },
    ],
    paiementsMensuels: {
      "septembre 2025": "paye",
      "octobre 2025": "impaye",
      "novembre 2025": "impaye",
      "décembre 2025": "impaye",
      "janvier 2026": "impaye",
      "février 2026": "impaye",
      "mars 2026": "impaye",
      "avril 2026": "impaye",
      "mai 2026": "impaye",
      "juin 2026": "impaye",
    },
    archived: false,
  },
];

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

export type Formateur = {
  id: string;
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
};

export const FORMATEURS: Formateur[] = [
  {
    id: "fo-1",
    matricule: "ENS-014",
    cin: "JB145872",
    prenom: "Salma",
    nom: "El Idrissi",
    grade: "PES",
    departement: "Infirmier polyvalent",
    modules: ["Soins infirmiers en médecine", "Hygiène hospitalière", "Éthique et déontologie"],
    groupes: ["S5-G1", "S1-B"],
    statut: "permanent",
    telephone: "+212 6 61 45 22 10",
    email: "s.elidrissi@istpm.ma",
    notesSaisies: 128,
  },
  {
    id: "fo-2",
    matricule: "ENS-021",
    cin: "J409231",
    prenom: "Rachid",
    nom: "Benjelloun",
    grade: "PES",
    departement: "Infirmier en anesthésie-réanimation",
    modules: ["Réanimation et soins intensifs", "Anesthésie clinique"],
    groupes: ["S5-G1", "S6-G1"],
    statut: "permanent",
    telephone: "+212 6 70 88 41 05",
    email: "r.benjelloun@istpm.ma",
    notesSaisies: 96,
  },
  {
    id: "fo-3",
    matricule: "ENS-033",
    cin: "JC220514",
    prenom: "Naima",
    nom: "Ait Hammou",
    grade: "PES",
    departement: "Sage-femme",
    modules: ["Obstétrique", "Suivi de grossesse", "Néonatologie"],
    groupes: ["S3-G2", "S4-G1"],
    statut: "permanent",
    telephone: "+212 6 55 30 78 44",
    email: "n.aithammou@istpm.ma",
    notesSaisies: 142,
  },
  {
    id: "fo-4",
    matricule: "ENS-045",
    cin: "JE118064",
    prenom: "Hicham",
    nom: "Bouzid",
    grade: "vacataire",
    departement: "Kinésithérapie",
    modules: ["Rééducation fonctionnelle", "Électrothérapie"],
    groupes: ["S3-G1", "S4-G2"],
    statut: "vacataire",
    telephone: "+212 6 12 90 34 56",
    email: "h.bouzid@istpm.ma",
    notesSaisies: 54,
  },
  {
    id: "fo-5",
    matricule: "ENS-052",
    cin: "JB302977",
    prenom: "Loubna",
    nom: "Sekkat",
    grade: "PES",
    departement: "Radiologie / Imagerie médicale",
    modules: ["Techniques de radiologie", "Scanner et IRM", "Radioprotection"],
    groupes: ["S6-G1", "S2-A"],
    statut: "en_conge",
    telephone: "+212 6 88 12 44 90",
    email: "l.sekkat@istpm.ma",
    notesSaisies: 71,
  },
  {
    id: "fo-6",
    matricule: "ENS-060",
    cin: "J512403",
    prenom: "Karim",
    nom: "Tahiri",
    grade: "formateur_clinique",
    departement: "Laboratoire / Biologie médicale",
    modules: ["Hématologie", "Biochimie clinique", "Microbiologie"],
    groupes: ["S6-G2", "S2-B"],
    statut: "permanent",
    telephone: "+212 6 33 21 09 87",
    email: "k.tahiri@istpm.ma",
    notesSaisies: 88,
  },
  {
    id: "fo-7",
    matricule: "ENS-068",
    cin: "JC176390",
    prenom: "Amina",
    nom: "Rochdi",
    grade: "vacataire",
    departement: "Prothèse dentaire",
    modules: ["Anatomie dentaire", "Prothèse fixe (TP)", "Occlusodontie"],
    groupes: ["S1-A", "S4-A"],
    statut: "vacataire",
    telephone: "+212 6 47 66 21 08",
    email: "a.rochdi@istpm.ma",
    notesSaisies: 42,
  },
  {
    id: "fo-8",
    matricule: "ENS-074",
    cin: "JE240815",
    prenom: "Mustapha",
    nom: "El Khattabi",
    grade: "formateur_clinique",
    departement: "Infirmier polyvalent",
    modules: ["Pharmacologie", "Santé publique"],
    groupes: ["S5-G1", "S1-B"],
    statut: "permanent",
    telephone: "+212 6 90 55 12 34",
    email: "m.elkhattabi@istpm.ma",
    notesSaisies: 63,
  },
];

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
 * Le fichier lui-même n'est pas ici : il est conservé dans IndexedDB
 * (voir `doc-store.ts`), car un PDF ne tient pas dans le localStorage.
 * `id` est la clé qui relie les deux.
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

export const ANNEES_UNIVERSITAIRES = [
  "2025/2026",
  "2024/2025",
  "2023/2024",
] as const;
export type AnneeUniversitaire = (typeof ANNEES_UNIVERSITAIRES)[number];

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

export const EXAMENS: Examen[] = [
  {
    id: "ex-1",
    titre: "Examen final   Soins infirmiers en médecine",
    module: "Soins infirmiers en médecine",
    filiere: "Infirmier polyvalent",
    niveau: "S5",
    classe: "S5-G1",
    anneeUniversitaire: "2025/2026",
    type: "examen_theorique",
    date: "2026-07-28",
    heure: "09:00",
    duree: 120,
    salle: "Amphi A",
    surveillants: ["S. El Idrissi", "M. El Khattabi"],
    statut: "planifie",
    etudiantsConvoques: 32,
    composante: "Théorique + Pratique",
    description:
      "Épreuve théorique (2 h) suivie d'une mise en situation clinique au laboratoire de simulation.",
    createdBy: "fo-1",
    document: {
      id: "doc-ex-1",
      nom: "sujet-soins-infirmiers-S5.pdf",
      taille: 912,
      mime: "application/pdf",
      uploadedAt: "2026-07-20",
    },
  },
  {
    id: "ex-2",
    titre: "Évaluation pratique   Réanimation et soins intensifs",
    module: "Réanimation et soins intensifs",
    filiere: "Infirmier en anesthésie-réanimation",
    niveau: "S5",
    classe: "S5-G1",
    anneeUniversitaire: "2025/2026",
    type: "evaluation_pratique",
    date: "2026-07-29",
    heure: "08:30",
    duree: 90,
    salle: "Labo simulation 2",
    surveillants: ["R. Benjelloun"],
    statut: "planifie",
    etudiantsConvoques: 24,
    composante: "Pratique",
    description: "Prise en charge d'un arrêt cardiorespiratoire sur mannequin.",
    createdBy: "fo-2",
    document: {
      id: "doc-ex-2",
      nom: "grille-evaluation-reanimation.pdf",
      taille: 912,
      mime: "application/pdf",
      uploadedAt: "2026-07-21",
    },
  },
  {
    id: "ex-3",
    titre: "Contrôle continu   Obstétrique",
    module: "Obstétrique",
    filiere: "Sage-femme",
    niveau: "S3",
    classe: "S3-G2",
    anneeUniversitaire: "2025/2026",
    type: "controle_continu",
    date: "2026-07-24",
    heure: "10:00",
    duree: 60,
    salle: "Salle 12",
    surveillants: ["N. Ait Hammou"],
    statut: "en_cours",
    etudiantsConvoques: 28,
    composante: "Théorique",
    createdBy: "fo-3",
    document: {
      id: "doc-ex-3",
      nom: "cc-obstetrique-S3.pdf",
      taille: 912,
      mime: "application/pdf",
      uploadedAt: "2026-07-18",
    },
  },
  {
    id: "ex-4",
    titre: "Évaluation pratique   Rééducation fonctionnelle",
    module: "Rééducation fonctionnelle",
    filiere: "Kinésithérapie",
    niveau: "S3",
    classe: "S3-G1",
    anneeUniversitaire: "2025/2026",
    type: "evaluation_pratique",
    date: "2026-07-22",
    heure: "14:00",
    duree: 90,
    salle: "Salle de rééducation",
    surveillants: ["H. Bouzid"],
    statut: "notes_saisies",
    etudiantsConvoques: 26,
    composante: "Pratique",
    createdBy: "fo-4",
  },
  {
    id: "ex-5",
    titre: "Examen final   Techniques de radiologie",
    module: "Techniques de radiologie",
    filiere: "Radiologie / Imagerie médicale",
    niveau: "S6",
    classe: "S6-G1",
    anneeUniversitaire: "2025/2026",
    type: "examen_theorique",
    date: "2026-07-30",
    heure: "09:00",
    duree: 150,
    salle: "Amphi B",
    surveillants: ["L. Sekkat", "K. Tahiri"],
    statut: "planifie",
    etudiantsConvoques: 22,
    composante: "Théorique + Pratique",
    description: "Interprétation de clichés et radioprotection.",
    createdBy: "fo-5",
    document: {
      id: "doc-ex-5",
      nom: "sujet-radiologie-S6.pdf",
      taille: 912,
      mime: "application/pdf",
      uploadedAt: "2026-07-22",
    },
  },
  {
    id: "ex-6",
    titre: "Évaluation pratique   Hématologie",
    module: "Hématologie",
    filiere: "Laboratoire / Biologie médicale",
    niveau: "S6",
    classe: "S6-G2",
    anneeUniversitaire: "2025/2026",
    type: "evaluation_pratique",
    date: "2026-07-23",
    heure: "11:00",
    duree: 120,
    salle: "Labo biologie",
    surveillants: ["K. Tahiri"],
    statut: "en_cours",
    etudiantsConvoques: 20,
    composante: "Pratique",
    createdBy: "fo-6",
  },
  {
    id: "ex-7",
    titre: "Contrôle continu   Anatomie dentaire",
    module: "Anatomie dentaire",
    filiere: "Prothèse dentaire",
    niveau: "S1",
    classe: "S1-A",
    anneeUniversitaire: "2025/2026",
    type: "controle_continu",
    date: "2026-07-21",
    heure: "10:30",
    duree: 60,
    salle: "Salle 5",
    surveillants: ["A. Rochdi"],
    statut: "notes_saisies",
    etudiantsConvoques: 30,
    composante: "Théorique",
    createdBy: "fo-7",
    document: {
      id: "doc-ex-7",
      nom: "cc-anatomie-dentaire.pdf",
      taille: 912,
      mime: "application/pdf",
      uploadedAt: "2026-07-15",
    },
  },
  {
    id: "ex-8",
    titre: "Rattrapage   Biochimie clinique",
    module: "Biochimie clinique",
    filiere: "Laboratoire / Biologie médicale",
    niveau: "S6",
    classe: "S6-G2",
    anneeUniversitaire: "2025/2026",
    type: "rattrapage",
    date: "2026-09-08",
    heure: "09:00",
    duree: 120,
    salle: "Salle 9",
    surveillants: ["K. Tahiri"],
    statut: "planifie",
    etudiantsConvoques: 6,
    composante: "Théorique + Pratique",
    description: "Session de rattrapage réservée aux étudiants ajournés.",
    createdBy: "fo-6",
  },
  {
    id: "ex-9",
    titre: "Examen final   Anesthésie clinique",
    module: "Anesthésie clinique",
    filiere: "Infirmier en anesthésie-réanimation",
    niveau: "S5",
    classe: "S5-G1",
    anneeUniversitaire: "2025/2026",
    type: "examen_theorique",
    date: "2026-07-27",
    heure: "08:30",
    duree: 120,
    salle: "Amphi A",
    surveillants: ["R. Benjelloun", "S. El Idrissi"],
    statut: "planifie",
    etudiantsConvoques: 24,
    composante: "Théorique + Pratique",
    createdBy: "fo-2",
    document: {
      id: "doc-ex-9",
      nom: "sujet-anesthesie-clinique.pdf",
      taille: 912,
      mime: "application/pdf",
      uploadedAt: "2026-07-19",
    },
  },
  {
    id: "ex-10",
    titre: "Évaluation pratique   Prothèse fixe (TP)",
    module: "Prothèse fixe (TP)",
    filiere: "Prothèse dentaire",
    niveau: "S1",
    classe: "S1-A",
    anneeUniversitaire: "2025/2026",
    type: "evaluation_pratique",
    date: "2026-07-25",
    heure: "14:00",
    duree: 180,
    salle: "Atelier prothèse",
    surveillants: ["A. Rochdi"],
    statut: "planifie",
    etudiantsConvoques: 30,
    composante: "Pratique",
    createdBy: "fo-7",
  },
  {
    id: "ex-11",
    titre: "Contrôle continu   Hygiène hospitalière",
    module: "Hygiène hospitalière",
    filiere: "Infirmier polyvalent",
    niveau: "S5",
    classe: "S5-G1",
    anneeUniversitaire: "2025/2026",
    type: "controle_continu",
    date: "2026-07-26",
    heure: "11:00",
    duree: 60,
    salle: "Salle 8",
    surveillants: ["S. El Idrissi"],
    statut: "planifie",
    etudiantsConvoques: 32,
    composante: "Théorique",
    description:
      "QCM sur les précautions standard et la chaîne de stérilisation.",
    createdBy: "fo-1",
    document: {
      id: "doc-ex-11",
      nom: "cc-hygiene-hospitaliere.pdf",
      taille: 912,
      mime: "application/pdf",
      uploadedAt: "2026-07-23",
    },
  },
  {
    id: "ex-12",
    titre: "Contrôle continu   Éthique et déontologie",
    module: "Éthique et déontologie",
    filiere: "Infirmier polyvalent",
    niveau: "S1",
    classe: "S1-B",
    anneeUniversitaire: "2025/2026",
    type: "controle_continu",
    date: "2026-08-03",
    heure: "09:30",
    duree: 90,
    salle: "Salle 3",
    surveillants: ["S. El Idrissi"],
    statut: "planifie",
    etudiantsConvoques: 28,
    composante: "Théorique",
    createdBy: "fo-1",
  },
];

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

function mentionFor(moy: number): Mention {
  if (moy >= 16) return "Très bien";
  if (moy >= 14) return "Bien";
  if (moy >= 12) return "Assez bien";
  return "Passable";
}

export const BULLETINS: Bulletin[] = [
  {
    id: "bu-1",
    etudiantId: "et-1",
    cne: "G134567890",
    prenom: "Salma",
    nom: "El Amrani",
    filiere: "Infirmier polyvalent",
    niveau: "S5",
    session: "normale",
    moyenne: 14.6,
    mention: mentionFor(14.6),
    decision: "Admis",
    statut: "valide",
    notes: ETUDIANTS[0].notes,
    evaluationClinique: 15.5,
  },
  {
    id: "bu-2",
    etudiantId: "et-2",
    cne: "J138245017",
    prenom: "Youssef",
    nom: "Ait Taleb",
    filiere: "Infirmier en anesthésie-réanimation",
    niveau: "S5",
    session: "normale",
    moyenne: 12.3,
    mention: mentionFor(12.3),
    decision: "Admis avec dette",
    statut: "genere",
    notes: ETUDIANTS[1].notes,
    evaluationClinique: 13.0,
  },
  {
    id: "bu-3",
    etudiantId: "et-3",
    cne: "F145908712",
    prenom: "Imane",
    nom: "Benkirane",
    filiere: "Sage-femme",
    niveau: "S3",
    session: "normale",
    moyenne: 15.9,
    mention: mentionFor(15.9),
    decision: "Admis",
    statut: "publie",
    notes: ETUDIANTS[2].notes,
    evaluationClinique: 16.0,
  },
  {
    id: "bu-4",
    etudiantId: "et-4",
    cne: "M139874521",
    prenom: "Anas",
    nom: "Chafik",
    filiere: "Kinésithérapie",
    niveau: "S3",
    session: "normale",
    moyenne: 11.2,
    mention: mentionFor(11.2),
    decision: "Rattrapage",
    statut: "genere",
    notes: ETUDIANTS[3].notes,
    evaluationClinique: 11.5,
  },
  {
    id: "bu-5",
    etudiantId: "et-5",
    cne: "D141200983",
    prenom: "Khadija",
    nom: "Ouhssaine",
    filiere: "Radiologie / Imagerie médicale",
    niveau: "S6",
    session: "normale",
    moyenne: 13.7,
    mention: mentionFor(13.7),
    decision: "Admis",
    statut: "valide",
    notes: ETUDIANTS[4].notes,
    evaluationClinique: 14.0,
  },
  {
    id: "bu-6",
    etudiantId: "et-6",
    cne: "H137654210",
    prenom: "Omar",
    nom: "Bennani",
    filiere: "Laboratoire / Biologie médicale",
    niveau: "S6",
    session: "normale",
    moyenne: 9.4,
    mention: mentionFor(9.4),
    decision: "Ajourné",
    statut: "genere",
    notes: ETUDIANTS[5].notes,
    evaluationClinique: 9.0,
  },
  {
    id: "bu-7",
    etudiantId: "et-9",
    cne: "B140095512",
    prenom: "Hajar",
    nom: "Idrissi",
    filiere: "Sage-femme",
    niveau: "S4",
    session: "normale",
    moyenne: 14.2,
    mention: mentionFor(14.2),
    decision: "Admis",
    statut: "publie",
    notes: ETUDIANTS[8].notes,
    evaluationClinique: 14.5,
  },
  {
    id: "bu-8",
    etudiantId: "et-10",
    cne: "K139001284",
    prenom: "Zakaria",
    nom: "Moutaouakil",
    filiere: "Kinésithérapie",
    niveau: "S4",
    session: "normale",
    moyenne: 13.9,
    mention: mentionFor(13.9),
    decision: "Admis",
    statut: "valide",
    notes: ETUDIANTS[9].notes,
    evaluationClinique: 14.0,
  },
  {
    id: "bu-9",
    etudiantId: "et-14",
    cne: "C139887654",
    prenom: "Bilal",
    nom: "Ramdani",
    filiere: "Prothèse dentaire",
    niveau: "S4",
    session: "rattrapage",
    moyenne: 7.9,
    mention: mentionFor(7.9),
    decision: "Ajourné",
    statut: "genere",
    notes: ETUDIANTS[13].notes,
    evaluationClinique: 8.0,
  },
  {
    id: "bu-10",
    etudiantId: "et-12",
    cne: "L138744120",
    prenom: "Ayoub",
    nom: "Naciri",
    filiere: "Infirmier en anesthésie-réanimation",
    niveau: "S6",
    session: "normale",
    moyenne: 15.4,
    mention: mentionFor(15.4),
    decision: "Admis",
    statut: "publie",
    notes: ETUDIANTS[11].notes,
    evaluationClinique: 16.0,
  },
];

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

export const STAGES: Stage[] = [
  {
    id: "st-1",
    etudiantId: "et-1",
    cne: "G134567890",
    prenom: "Salma",
    nom: "El Amrani",
    filiere: "Infirmier polyvalent",
    niveau: "S5",
    structure: "CHR Hassan II   Agadir",
    service: "Médecine interne",
    encadrantClinique: "Dr. A. Bennis (Cadre infirmier)",
    tuteurAcademique: "S. El Idrissi",
    debut: "2026-06-01",
    fin: "2026-07-31",
    statut: "en_cours",
    conventionSignee: true,
  },
  {
    id: "st-2",
    etudiantId: "et-2",
    cne: "J138245017",
    prenom: "Youssef",
    nom: "Ait Taleb",
    filiere: "Infirmier en anesthésie-réanimation",
    niveau: "S5",
    structure: "CHR Hassan II   Agadir",
    service: "Bloc opératoire",
    encadrantClinique: "Dr. R. Mansouri (Médecin anesthésiste)",
    tuteurAcademique: "R. Benjelloun",
    debut: "2026-06-01",
    fin: "2026-07-31",
    statut: "en_cours",
    conventionSignee: true,
  },
  {
    id: "st-3",
    etudiantId: "et-3",
    cne: "F145908712",
    prenom: "Imane",
    nom: "Benkirane",
    filiere: "Sage-femme",
    niveau: "S3",
    structure: "Hôpital Hassan II   Agadir",
    service: "Maternité",
    encadrantClinique: "Mme F. Oubella (Sage-femme major)",
    tuteurAcademique: "N. Ait Hammou",
    debut: "2026-05-15",
    fin: "2026-07-15",
    statut: "soutenance",
    conventionSignee: true,
    noteSoutenance: 16,
  },
  {
    id: "st-4",
    etudiantId: "et-5",
    cne: "D141200983",
    prenom: "Khadija",
    nom: "Ouhssaine",
    filiere: "Radiologie / Imagerie médicale",
    niveau: "S6",
    structure: "CHR Hassan II   Agadir",
    service: "Service d'imagerie",
    encadrantClinique: "M. T. Fadel (Manipulateur en chef)",
    tuteurAcademique: "L. Sekkat",
    debut: "2026-04-01",
    fin: "2026-06-30",
    statut: "valide",
    conventionSignee: true,
    noteSoutenance: 15,
  },
  {
    id: "st-5",
    etudiantId: "et-6",
    cne: "H137654210",
    prenom: "Omar",
    nom: "Bennani",
    filiere: "Laboratoire / Biologie médicale",
    niveau: "S6",
    structure: "Hôpital Hassan II   Agadir",
    service: "Laboratoire d'analyses",
    encadrantClinique: "Dr. S. Haddad (Biologiste)",
    tuteurAcademique: "K. Tahiri",
    debut: "2026-06-01",
    fin: "2026-08-31",
    statut: "convention_signee",
    conventionSignee: true,
  },
  {
    id: "st-6",
    etudiantId: "et-9",
    cne: "B140095512",
    prenom: "Hajar",
    nom: "Idrissi",
    filiere: "Sage-femme",
    niveau: "S4",
    structure: "Hôpital préfectoral Inezgane",
    service: "Maternité",
    encadrantClinique: "Mme N. Sabil (Sage-femme major)",
    tuteurAcademique: "N. Ait Hammou",
    debut: "2026-06-15",
    fin: "2026-08-15",
    statut: "en_cours",
    conventionSignee: true,
  },
  {
    id: "st-7",
    etudiantId: "et-10",
    cne: "K139001284",
    prenom: "Zakaria",
    nom: "Moutaouakil",
    filiere: "Kinésithérapie",
    niveau: "S4",
    structure: "Clinique Al Massira   Agadir",
    service: "Rééducation fonctionnelle",
    encadrantClinique: "M. Y. Ouhadi (Kinésithérapeute chef)",
    tuteurAcademique: "H. Bouzid",
    debut: "2026-07-01",
    fin: "2026-09-30",
    statut: "recherche",
    conventionSignee: false,
  },
  {
    id: "st-8",
    etudiantId: "et-12",
    cne: "L138744120",
    prenom: "Ayoub",
    nom: "Naciri",
    filiere: "Infirmier en anesthésie-réanimation",
    niveau: "S6",
    structure: "CHU Ibn Rochd   Casablanca",
    service: "Réanimation polyvalente",
    encadrantClinique: "Pr. H. El Alaoui (Réanimateur)",
    tuteurAcademique: "R. Benjelloun",
    debut: "2026-03-01",
    fin: "2026-05-31",
    statut: "valide",
    conventionSignee: true,
    noteSoutenance: 17,
  },
  {
    id: "st-9",
    etudiantId: "et-4",
    cne: "M139874521",
    prenom: "Anas",
    nom: "Chafik",
    filiere: "Kinésithérapie",
    niveau: "S3",
    structure: "Clinique Ennakhil   Agadir",
    service: "Kinésithérapie respiratoire",
    encadrantClinique: "M. R. Belmekki (Kinésithérapeute)",
    tuteurAcademique: "H. Bouzid",
    debut: "2026-07-10",
    fin: "2026-09-10",
    statut: "recherche",
    conventionSignee: false,
  },
];

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

export const PAIEMENTS: PaiementLigne[] = ETUDIANTS.flatMap((e) =>
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
);

/* ------------------------------------------------------------------ */
/*  Agrégats   Tableau de bord                                         */
/* ------------------------------------------------------------------ */

const inscrits = ETUDIANTS.filter(
  (e) => e.statut === "inscrit" || e.statut === "diplome",
);

export const DASHBOARD = {
  totalInscrits: inscrits.length,
  deltaSemestre: 6,
  formateursActifs: FORMATEURS.filter((f) => f.statut !== "en_conge").length,
  tauxReussite: 78, // %
  totalARecouvrer: ETUDIANTS.reduce(
    (s, e) =>
      s +
      (Object.values(e.paiementsMensuels ?? {}).filter(
        (v) => v !== "paye",
      ).length *
        e.fraisMensuels),
    0,
  ),
};

/** Répartition des étudiants par filière (pour donut). */
export const REPARTITION_FILIERE = FILIERES.map((f) => ({
  name: FILIERE_COURT[f],
  filiere: f,
  value: ETUDIANTS.filter((e) => e.filiere === f).length,
}));

/** Répartition par niveau (pour barres). */
export const REPARTITION_NIVEAU = NIVEAUX.map((n) => ({
  name: n,
  value: ETUDIANTS.filter((e) => e.niveau === n).length,
}));

/** Taux de réussite par filière (%). */
export const REUSSITE_FILIERE = FILIERES.map((f) => {
  const map: Record<string, number> = {
    "Infirmier polyvalent": 82,
    "Infirmier en anesthésie-réanimation": 76,
    "Sage-femme": 88,
    Kinésithérapie: 74,
    "Radiologie / Imagerie médicale": 80,
    "Laboratoire / Biologie médicale": 68,
    "Prothèse dentaire": 71,
  };
  return { name: FILIERE_COURT[f], filiere: f, value: map[f] ?? 75 };
});

/** Étudiants à risque : moyenne < 10 ou décision ajourné. */
export const ETUDIANTS_A_RISQUE = ETUDIANTS.filter(
  (e) => e.moyenne < 10 || e.statut === "abandon",
);

/** Bloc financier. */
const encaisse = PAIEMENTS.filter((p) => p.statut === "paye").reduce(
  (s, p) => s + p.montant,
  0,
);
const unpaidForStatus = (
  students: Etudiant[],
  status: StatutPaiement,
): number =>
  students.reduce((s, e) => {
    const months = Object.values(e.paiementsMensuels ?? {});
    return s + months.filter((v) => v === status).length * e.fraisMensuels;
  }, 0);

const totalUnpaid = ETUDIANTS.reduce((s, e) => {
  const months = Object.values(e.paiementsMensuels ?? {});
  return s + months.filter((v) => v !== "paye").length * e.fraisMensuels;
}, 0);

export const FINANCIER = {
  encaisse,
  encaisseCeMois: 128500,
  enAttente: unpaidForStatus(ETUDIANTS, "en_attente"),
  impaye: unpaidForStatus(ETUDIANTS, "impaye"),
  retard: unpaidForStatus(ETUDIANTS, "retard"),
  tauxRecouvrement:
    encaisse + totalUnpaid === 0
      ? 100
      : Math.round((encaisse / (encaisse + totalUnpaid)) * 100),
};

/** À traiter. */
export const A_TRAITER = {
  examensAVenir: EXAMENS.filter((x) => x.statut === "planifie").length,
  bulletinsAPublier: BULLETINS.filter((b) => b.statut !== "publie").length,
  stagesAValider: STAGES.filter(
    (s) => s.statut === "soutenance" || s.statut === "recherche",
  ).length,
};

export type ActiviteItem = {
  type: "inscription" | "note" | "paiement";
  texte: string;
  date: string;
};

export const ACTIVITE_RECENTE: ActiviteItem[] = [
  { type: "inscription", texte: "Nouvelle inscription   Fatima Zahra Lahlou (Prothèse dentaire, S1)", date: "2026-07-21" },
  { type: "paiement", texte: "Paiement reçu   Salma El Amrani, 11 000 MAD (Tranche 3)", date: "2026-07-20" },
  { type: "note", texte: "Notes saisies   Anatomie dentaire (S1, Prothèse dentaire)", date: "2026-07-19" },
  { type: "note", texte: "Notes saisies   Rééducation fonctionnelle (S3, Kinésithérapie)", date: "2026-07-18" },
  { type: "paiement", texte: "Relance envoyée   Omar Bennani, solde 33 000 MAD", date: "2026-07-17" },
  { type: "inscription", texte: "Réinscription confirmée   Zakaria Moutaouakil (Kinésithérapie, S4)", date: "2026-07-16" },
];

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
export const SALLES = [
  "Amphi A",
  "Amphi B",
  "Salle 3",
  "Salle 5",
  "Salle 8",
  "Salle 9",
  "Salle 12",
  "Labo simulation 1",
  "Labo simulation 2",
  "Labo biologie",
  "Salle de rééducation",
  "Atelier prothèse",
] as const;

/** Groupes / classes constitués. */
export const GROUPES = [
  "S1-A",
  "S1-B",
  "S2-A",
  "S2-B",
  "S3-G1",
  "S3-G2",
  "S4-G1",
  "S4-G2",
  "S5-G1",
  "S5-G2",
  "S6-G1",
  "S6-G2",
] as const;

/** Créneaux horaires standards de l'emploi du temps. */
export const CRENEAUX = [
  { debut: "08:30", fin: "10:00" },
  { debut: "10:15", fin: "11:45" },
  { debut: "12:00", fin: "13:30" },
  { debut: "14:00", fin: "15:30" },
  { debut: "15:45", fin: "17:15" },
  { debut: "17:30", fin: "19:00" },
] as const;

/** Bornes de la grille horaire (heures pleines). */
export const PLANNING_HEURE_DEBUT = 8;
export const PLANNING_HEURE_FIN = 19;

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
 * Gabarit d'une semaine type : jour (0 = lundi) plutôt que date absolue.
 * Les dates réelles sont calculées à partir de la semaine courante, pour que
 * le planning soit toujours peuplé quelle que soit la date de consultation.
 */
const SEMAINE_TYPE: Array<
  Omit<Seance, "id" | "date" | "filiere"> & { jour: number }
> = [
  { jour: 0, module: "Soins infirmiers en médecine", professeurId: "fo-1", groupe: "S5-G1", salle: "Amphi A", debut: "08:30", fin: "10:00", anneeUniversitaire: "2025/2026", semestre: "S5", type: "cours" },
  { jour: 0, module: "Réanimation et soins intensifs", professeurId: "fo-2", groupe: "S5-G2", salle: "Labo simulation 2", debut: "10:15", fin: "11:45", anneeUniversitaire: "2025/2026", semestre: "S5", type: "tp" },
  { jour: 0, module: "Obstétrique", professeurId: "fo-3", groupe: "S3-G2", salle: "Salle 12", debut: "14:00", fin: "15:30", anneeUniversitaire: "2025/2026", semestre: "S3", type: "cours" },
  { jour: 0, module: "Anatomie dentaire", professeurId: "fo-7", groupe: "S1-A", salle: "Salle 5", debut: "15:45", fin: "17:15", anneeUniversitaire: "2025/2026", semestre: "S1", type: "cours" },

  { jour: 1, module: "Hygiène hospitalière", professeurId: "fo-1", groupe: "S5-G1", salle: "Salle 8", debut: "08:30", fin: "10:00", anneeUniversitaire: "2025/2026", semestre: "S5", type: "td" },
  { jour: 1, module: "Rééducation fonctionnelle", professeurId: "fo-4", groupe: "S3-G1", salle: "Salle de rééducation", debut: "10:15", fin: "11:45", anneeUniversitaire: "2025/2026", semestre: "S3", type: "tp" },
  { jour: 1, module: "Techniques de radiologie", professeurId: "fo-5", groupe: "S6-G1", salle: "Amphi B", debut: "14:00", fin: "15:30", anneeUniversitaire: "2025/2026", semestre: "S6", type: "cours" },
  { jour: 1, module: "Hématologie", professeurId: "fo-6", groupe: "S6-G2", salle: "Labo biologie", debut: "15:45", fin: "17:15", anneeUniversitaire: "2025/2026", semestre: "S6", type: "tp" },

  { jour: 2, module: "Éthique et déontologie", professeurId: "fo-1", groupe: "S1-B", salle: "Salle 3", debut: "08:30", fin: "10:00", anneeUniversitaire: "2025/2026", semestre: "S1", type: "cours" },
  { jour: 2, module: "Anesthésie clinique", professeurId: "fo-2", groupe: "S5-G1", salle: "Amphi A", debut: "10:15", fin: "11:45", anneeUniversitaire: "2025/2026", semestre: "S5", type: "cours" },
  { jour: 2, module: "Suivi de grossesse", professeurId: "fo-3", groupe: "S3-G2", salle: "Salle 12", debut: "12:00", fin: "13:30", anneeUniversitaire: "2025/2026", semestre: "S3", type: "td" },
  { jour: 2, module: "Prothèse fixe (TP)", professeurId: "fo-7", groupe: "S1-A", salle: "Atelier prothèse", debut: "14:00", fin: "17:15", anneeUniversitaire: "2025/2026", semestre: "S1", type: "tp" },

  { jour: 3, module: "Soins infirmiers en médecine", professeurId: "fo-1", groupe: "S5-G1", salle: "Amphi A", debut: "08:30", fin: "10:00", anneeUniversitaire: "2025/2026", semestre: "S5", type: "cours" },
  { jour: 3, module: "Physiologie appliquée", professeurId: "fo-2", groupe: "S5-G2", salle: "Salle 9", debut: "10:15", fin: "11:45", anneeUniversitaire: "2025/2026", semestre: "S5", type: "cours" },
  { jour: 3, module: "Néonatologie", professeurId: "fo-3", groupe: "S3-G2", salle: "Salle 12", debut: "14:00", fin: "15:30", anneeUniversitaire: "2025/2026", semestre: "S3", type: "cours" },
  { jour: 3, module: "Biochimie clinique", professeurId: "fo-6", groupe: "S6-G2", salle: "Labo biologie", debut: "15:45", fin: "17:15", anneeUniversitaire: "2025/2026", semestre: "S6", type: "td" },

  { jour: 4, module: "Kinésithérapie respiratoire", professeurId: "fo-4", groupe: "S4-G1", salle: "Salle de rééducation", debut: "08:30", fin: "10:00", anneeUniversitaire: "2025/2026", semestre: "S4", type: "tp" },
  { jour: 4, module: "Imagerie médicale avancée", professeurId: "fo-5", groupe: "S6-G1", salle: "Amphi B", debut: "10:15", fin: "11:45", anneeUniversitaire: "2025/2026", semestre: "S6", type: "cours" },
  { jour: 4, module: "Santé publique", professeurId: "fo-8", groupe: "S5-G1", salle: "Amphi A", debut: "14:00", fin: "15:30", anneeUniversitaire: "2025/2026", semestre: "S5", type: "cours" },
  { jour: 4, module: "Encadrement de stage", professeurId: "fo-1", groupe: "S5-G1", salle: "Salle 8", debut: "15:45", fin: "17:15", anneeUniversitaire: "2025/2026", semestre: "S5", type: "stage" },

  { jour: 5, module: "Pharmacologie", professeurId: "fo-8", groupe: "S5-G2", salle: "Salle 9", debut: "08:30", fin: "10:00", anneeUniversitaire: "2025/2026", semestre: "S5", type: "cours" },
  { jour: 5, module: "Anatomie dentaire", professeurId: "fo-7", groupe: "S1-B", salle: "Salle 5", debut: "10:15", fin: "11:45", anneeUniversitaire: "2025/2026", semestre: "S1", type: "td" },
];

/**
 * Génère les séances des deux prochaines semaines (courante + suivante).
 * Les dates sont calculées depuis le lundi de la semaine en cours, donc
 * l'appel est idempotent à l'intérieur de la même semaine.
 */
export function genererSeances(): Seance[] {
  const lundi = lundiDeLaSemaine(new Date());
  // La filière de chaque séance est déduite du département du formateur qui
  // l'assure : deux séances du même enseignant partagent toujours la filière,
  // sans champ redondant à maintenir dans le gabarit hebdomadaire.
  const filiereParProf = new Map<string, Filiere>(
    FORMATEURS.map((f) => [f.id, f.departement] as const),
  );
  const out: Seance[] = [];
  for (const semaine of [0, 1]) {
    SEMAINE_TYPE.forEach((s, i) => {
      const d = new Date(lundi);
      d.setDate(lundi.getDate() + s.jour + semaine * 7);
      const { jour: _jour, ...reste } = s;
      out.push({
        ...reste,
        filiere: filiereParProf.get(s.professeurId) ?? FILIERES[0],
        id: `se-${semaine}-${i}`,
        date: isoDate(d),
      });
    });
  }
  return out;
}

/** Séances de la semaine courante et de la suivante. */
export const SEANCES: Seance[] = genererSeances();
