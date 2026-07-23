/**
 * Central sample data for the ISTPM CRM (Institut spécialisé des techniques
 * paramédicales — Agadir). Frontend-only, hardcoded placeholder data — no API.
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
  "CHR Hassan II — Agadir",
  "CHU Ibn Rochd — Casablanca",
  "CHU Mohammed VI — Marrakech",
  "Hôpital Hassan II — Agadir",
  "Clinique Al Massira — Agadir",
  "Hôpital préfectoral Inezgane",
  "Clinique Ennakhil — Agadir",
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
  module: string;
  note: number; // /20
  coef: number;
  credits: number;
};

export type LignePaiement = {
  date: string;
  montant: number;
  mode: "Espèces" | "Virement" | "Carte" | "Chèque";
  periode: string;
  recu: string;
  statut: StatutPaiement;
};

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
  fraisAnnuels: number;
  resteAPayer: number;
  notes: NoteModule[];
  historique: LignePaiement[];
  stageEnCours?: string;
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
    fraisAnnuels: 34000,
    resteAPayer: 0,
    notes: [
      { module: "Soins infirmiers en médecine", note: 15.5, coef: 3, credits: 6 },
      { module: "Pharmacologie", note: 13.0, coef: 2, credits: 4 },
      { module: "Santé publique", note: 14.75, coef: 2, credits: 4 },
      { module: "Éthique et déontologie", note: 16.0, coef: 1, credits: 2 },
    ],
    historique: [
      { date: "2025-10-05", montant: 12000, mode: "Virement", periode: "Tranche 1 — 2025/26", recu: "ISTPM-R-2510-018", statut: "paye" },
      { date: "2026-01-14", montant: 11000, mode: "Chèque", periode: "Tranche 2 — 2025/26", recu: "ISTPM-R-2601-051", statut: "paye" },
      { date: "2026-04-10", montant: 11000, mode: "Virement", periode: "Tranche 3 — 2025/26", recu: "ISTPM-R-2604-077", statut: "paye" },
    ],
    stageEnCours: "CHR Hassan II — Service de Médecine interne",
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
    fraisAnnuels: 38000,
    resteAPayer: 13000,
    notes: [
      { module: "Réanimation et soins intensifs", note: 13.5, coef: 3, credits: 6 },
      { module: "Anesthésie clinique", note: 11.0, coef: 3, credits: 6 },
      { module: "Physiologie appliquée", note: 12.25, coef: 2, credits: 4 },
    ],
    historique: [
      { date: "2025-10-09", montant: 13000, mode: "Espèces", periode: "Tranche 1 — 2025/26", recu: "ISTPM-R-2510-033", statut: "paye" },
      { date: "2026-01-20", montant: 12000, mode: "Virement", periode: "Tranche 2 — 2025/26", recu: "ISTPM-R-2601-064", statut: "paye" },
      { date: "—", montant: 13000, mode: "Virement", periode: "Tranche 3 — 2025/26", recu: "—", statut: "retard" },
    ],
    stageEnCours: "CHR Hassan II — Bloc opératoire",
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
    fraisAnnuels: 32000,
    resteAPayer: 0,
    notes: [
      { module: "Obstétrique", note: 16.5, coef: 3, credits: 6 },
      { module: "Suivi de grossesse", note: 15.0, coef: 2, credits: 4 },
      { module: "Néonatologie", note: 16.25, coef: 2, credits: 4 },
    ],
    historique: [
      { date: "2025-09-28", montant: 16000, mode: "Virement", periode: "Tranche 1 — 2025/26", recu: "ISTPM-R-2509-004", statut: "paye" },
      { date: "2026-02-02", montant: 16000, mode: "Carte", periode: "Tranche 2 — 2025/26", recu: "ISTPM-R-2602-088", statut: "paye" },
    ],
    stageEnCours: "Hôpital Hassan II — Maternité",
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
    fraisAnnuels: 33000,
    resteAPayer: 16500,
    notes: [
      { module: "Rééducation fonctionnelle", note: 12.0, coef: 3, credits: 6 },
      { module: "Anatomie du mouvement", note: 10.5, coef: 2, credits: 4 },
      { module: "Kinésithérapie respiratoire", note: 11.0, coef: 2, credits: 4 },
    ],
    historique: [
      { date: "2025-10-15", montant: 16500, mode: "Chèque", periode: "Tranche 1 — 2025/26", recu: "ISTPM-R-2510-045", statut: "paye" },
      { date: "—", montant: 16500, mode: "Virement", periode: "Tranche 2 — 2025/26", recu: "—", statut: "en_attente" },
    ],
    stageEnCours: "Clinique Al Massira — Rééducation",
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
    fraisAnnuels: 35000,
    resteAPayer: 0,
    notes: [
      { module: "Techniques de radiologie", note: 14.0, coef: 3, credits: 6 },
      { module: "Scanner et IRM", note: 13.5, coef: 3, credits: 6 },
      { module: "Radioprotection", note: 13.0, coef: 2, credits: 4 },
    ],
    historique: [
      { date: "2025-09-30", montant: 17500, mode: "Virement", periode: "Tranche 1 — 2025/26", recu: "ISTPM-R-2509-011", statut: "paye" },
      { date: "2026-01-30", montant: 17500, mode: "Virement", periode: "Tranche 2 — 2025/26", recu: "ISTPM-R-2601-072", statut: "paye" },
    ],
    stageEnCours: "CHR Hassan II — Service d'imagerie",
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
    fraisAnnuels: 33000,
    resteAPayer: 33000,
    notes: [
      { module: "Hématologie", note: 8.5, coef: 3, credits: 6 },
      { module: "Biochimie clinique", note: 10.0, coef: 3, credits: 6 },
      { module: "Microbiologie", note: 9.75, coef: 2, credits: 4 },
    ],
    historique: [
      { date: "—", montant: 16500, mode: "Virement", periode: "Tranche 1 — 2025/26", recu: "—", statut: "impaye" },
    ],
    stageEnCours: "Hôpital Hassan II — Laboratoire d'analyses",
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
    fraisAnnuels: 30000,
    resteAPayer: 0,
    notes: [
      { module: "Anatomie dentaire", note: 14.0, coef: 2, credits: 4 },
      { module: "Matériaux de prothèse", note: 12.5, coef: 2, credits: 4 },
      { module: "Prothèse fixe (TP)", note: 13.0, coef: 3, credits: 6 },
    ],
    historique: [
      { date: "2025-10-02", montant: 15000, mode: "Espèces", periode: "Tranche 1 — 2025/26", recu: "ISTPM-R-2510-002", statut: "paye" },
      { date: "2026-02-10", montant: 15000, mode: "Carte", periode: "Tranche 2 — 2025/26", recu: "ISTPM-R-2602-095", statut: "paye" },
    ],
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
    fraisAnnuels: 34000,
    resteAPayer: 11000,
    notes: [
      { module: "Bases des soins infirmiers", note: 11.0, coef: 3, credits: 6 },
      { module: "Anatomie-physiologie", note: 10.5, coef: 2, credits: 4 },
      { module: "Hygiène hospitalière", note: 11.25, coef: 2, credits: 4 },
    ],
    historique: [
      { date: "2025-10-12", montant: 12000, mode: "Espèces", periode: "Tranche 1 — 2025/26", recu: "ISTPM-R-2510-058", statut: "paye" },
      { date: "2026-01-25", montant: 11000, mode: "Virement", periode: "Tranche 2 — 2025/26", recu: "ISTPM-R-2601-081", statut: "paye" },
      { date: "—", montant: 11000, mode: "Virement", periode: "Tranche 3 — 2025/26", recu: "—", statut: "retard" },
    ],
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
    fraisAnnuels: 32000,
    resteAPayer: 8000,
    notes: [
      { module: "Obstétrique avancée", note: 15.0, coef: 3, credits: 6 },
      { module: "Pathologies de la grossesse", note: 13.5, coef: 2, credits: 4 },
    ],
    historique: [
      { date: "2025-10-01", montant: 12000, mode: "Virement", periode: "Tranche 1 — 2025/26", recu: "ISTPM-R-2510-009", statut: "paye" },
      { date: "2026-01-18", montant: 12000, mode: "Chèque", periode: "Tranche 2 — 2025/26", recu: "ISTPM-R-2601-060", statut: "paye" },
      { date: "—", montant: 8000, mode: "Virement", periode: "Tranche 3 — 2025/26", recu: "—", statut: "en_attente" },
    ],
    stageEnCours: "Hôpital préfectoral Inezgane — Maternité",
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
    fraisAnnuels: 33000,
    resteAPayer: 0,
    notes: [
      { module: "Kinésithérapie orthopédique", note: 14.5, coef: 3, credits: 6 },
      { module: "Électrothérapie", note: 13.0, coef: 2, credits: 4 },
    ],
    historique: [
      { date: "2025-09-29", montant: 16500, mode: "Virement", periode: "Tranche 1 — 2025/26", recu: "ISTPM-R-2509-007", statut: "paye" },
      { date: "2026-02-05", montant: 16500, mode: "Virement", periode: "Tranche 2 — 2025/26", recu: "ISTPM-R-2602-090", statut: "paye" },
    ],
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
    fraisAnnuels: 35000,
    resteAPayer: 17500,
    notes: [
      { module: "Physique des rayonnements", note: 12.0, coef: 2, credits: 4 },
      { module: "Introduction à l'imagerie", note: 13.25, coef: 2, credits: 4 },
    ],
    historique: [
      { date: "2025-10-18", montant: 17500, mode: "Chèque", periode: "Tranche 1 — 2025/26", recu: "ISTPM-R-2510-062", statut: "paye" },
      { date: "—", montant: 17500, mode: "Virement", periode: "Tranche 2 — 2025/26", recu: "—", statut: "en_attente" },
    ],
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
    fraisAnnuels: 38000,
    resteAPayer: 0,
    notes: [
      { module: "Réanimation avancée", note: 16.0, coef: 3, credits: 6 },
      { module: "Prise en charge de la douleur", note: 15.0, coef: 2, credits: 4 },
    ],
    historique: [
      { date: "2025-09-25", montant: 19000, mode: "Virement", periode: "Tranche 1 — 2025/26", recu: "ISTPM-R-2509-001", statut: "paye" },
      { date: "2026-01-15", montant: 19000, mode: "Virement", periode: "Tranche 2 — 2025/26", recu: "ISTPM-R-2601-052", statut: "paye" },
    ],
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
    fraisAnnuels: 33000,
    resteAPayer: 33000,
    notes: [
      { module: "Bases de biochimie", note: 9.0, coef: 2, credits: 4 },
      { module: "Techniques de laboratoire", note: 8.5, coef: 2, credits: 4 },
    ],
    historique: [
      { date: "—", montant: 16500, mode: "Virement", periode: "Tranche 1 — 2025/26", recu: "—", statut: "impaye" },
    ],
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
    fraisAnnuels: 30000,
    resteAPayer: 22000,
    notes: [
      { module: "Prothèse amovible (TP)", note: 8.0, coef: 3, credits: 6 },
      { module: "Occlusodontie", note: 7.5, coef: 2, credits: 4 },
    ],
    historique: [
      { date: "2025-10-08", montant: 8000, mode: "Espèces", periode: "Tranche 1 — 2025/26", recu: "ISTPM-R-2510-040", statut: "paye" },
      { date: "—", montant: 22000, mode: "Virement", periode: "Solde 2025/26", recu: "—", statut: "impaye" },
    ],
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

export type Examen = {
  id: string;
  module: string;
  filiere: Filiere;
  niveau: Niveau;
  type: TypeExamen;
  date: string;
  heure: string;
  salle: string;
  surveillants: string[];
  statut: StatutExamen;
  etudiantsConvoques: number;
  composante: "Théorique" | "Pratique" | "Théorique + Pratique";
};

export const EXAMENS: Examen[] = [
  {
    id: "ex-1",
    module: "Soins infirmiers en médecine",
    filiere: "Infirmier polyvalent",
    niveau: "S5",
    type: "examen_theorique",
    date: "2026-07-28",
    heure: "09:00",
    salle: "Amphi A",
    surveillants: ["S. El Idrissi", "M. El Khattabi"],
    statut: "planifie",
    etudiantsConvoques: 32,
    composante: "Théorique + Pratique",
  },
  {
    id: "ex-2",
    module: "Réanimation et soins intensifs",
    filiere: "Infirmier en anesthésie-réanimation",
    niveau: "S5",
    type: "evaluation_pratique",
    date: "2026-07-29",
    heure: "08:30",
    salle: "Labo simulation 2",
    surveillants: ["R. Benjelloun"],
    statut: "planifie",
    etudiantsConvoques: 24,
    composante: "Pratique",
  },
  {
    id: "ex-3",
    module: "Obstétrique",
    filiere: "Sage-femme",
    niveau: "S3",
    type: "controle_continu",
    date: "2026-07-24",
    heure: "10:00",
    salle: "Salle 12",
    surveillants: ["N. Ait Hammou"],
    statut: "en_cours",
    etudiantsConvoques: 28,
    composante: "Théorique",
  },
  {
    id: "ex-4",
    module: "Rééducation fonctionnelle",
    filiere: "Kinésithérapie",
    niveau: "S3",
    type: "evaluation_pratique",
    date: "2026-07-22",
    heure: "14:00",
    salle: "Salle de rééducation",
    surveillants: ["H. Bouzid"],
    statut: "notes_saisies",
    etudiantsConvoques: 26,
    composante: "Pratique",
  },
  {
    id: "ex-5",
    module: "Techniques de radiologie",
    filiere: "Radiologie / Imagerie médicale",
    niveau: "S6",
    type: "examen_theorique",
    date: "2026-07-30",
    heure: "09:00",
    salle: "Amphi B",
    surveillants: ["L. Sekkat", "K. Tahiri"],
    statut: "planifie",
    etudiantsConvoques: 22,
    composante: "Théorique + Pratique",
  },
  {
    id: "ex-6",
    module: "Hématologie",
    filiere: "Laboratoire / Biologie médicale",
    niveau: "S6",
    type: "evaluation_pratique",
    date: "2026-07-23",
    heure: "11:00",
    salle: "Labo biologie",
    surveillants: ["K. Tahiri"],
    statut: "en_cours",
    etudiantsConvoques: 20,
    composante: "Pratique",
  },
  {
    id: "ex-7",
    module: "Anatomie dentaire",
    filiere: "Prothèse dentaire",
    niveau: "S1",
    type: "controle_continu",
    date: "2026-07-21",
    heure: "10:30",
    salle: "Salle 5",
    surveillants: ["A. Rochdi"],
    statut: "notes_saisies",
    etudiantsConvoques: 30,
    composante: "Théorique",
  },
  {
    id: "ex-8",
    module: "Biochimie clinique",
    filiere: "Laboratoire / Biologie médicale",
    niveau: "S6",
    type: "rattrapage",
    date: "2026-09-08",
    heure: "09:00",
    salle: "Salle 9",
    surveillants: ["K. Tahiri"],
    statut: "planifie",
    etudiantsConvoques: 6,
    composante: "Théorique + Pratique",
  },
  {
    id: "ex-9",
    module: "Anesthésie clinique",
    filiere: "Infirmier en anesthésie-réanimation",
    niveau: "S5",
    type: "examen_theorique",
    date: "2026-07-27",
    heure: "08:30",
    salle: "Amphi A",
    surveillants: ["R. Benjelloun", "S. El Idrissi"],
    statut: "planifie",
    etudiantsConvoques: 24,
    composante: "Théorique + Pratique",
  },
  {
    id: "ex-10",
    module: "Prothèse fixe (TP)",
    filiere: "Prothèse dentaire",
    niveau: "S1",
    type: "evaluation_pratique",
    date: "2026-07-25",
    heure: "14:00",
    salle: "Atelier prothèse",
    surveillants: ["A. Rochdi"],
    statut: "planifie",
    etudiantsConvoques: 30,
    composante: "Pratique",
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
    structure: "CHR Hassan II — Agadir",
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
    structure: "CHR Hassan II — Agadir",
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
    structure: "Hôpital Hassan II — Agadir",
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
    structure: "CHR Hassan II — Agadir",
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
    structure: "Hôpital Hassan II — Agadir",
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
    structure: "Clinique Al Massira — Agadir",
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
    structure: "CHU Ibn Rochd — Casablanca",
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
    structure: "Clinique Ennakhil — Agadir",
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
  })),
);

/* ------------------------------------------------------------------ */
/*  Agrégats — Tableau de bord                                         */
/* ------------------------------------------------------------------ */

const inscrits = ETUDIANTS.filter(
  (e) => e.statut === "inscrit" || e.statut === "diplome",
);

export const DASHBOARD = {
  totalInscrits: inscrits.length,
  deltaSemestre: 6,
  formateursActifs: FORMATEURS.filter((f) => f.statut !== "en_conge").length,
  tauxReussite: 78, // %
  totalARecouvrer: ETUDIANTS.reduce((s, e) => s + e.resteAPayer, 0),
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
export const FINANCIER = {
  encaisse,
  encaisseCeMois: 128500,
  enAttente: ETUDIANTS.filter((e) => e.paiement === "en_attente").reduce(
    (s, e) => s + e.resteAPayer,
    0,
  ),
  impaye: ETUDIANTS.filter((e) => e.paiement === "impaye").reduce(
    (s, e) => s + e.resteAPayer,
    0,
  ),
  retard: ETUDIANTS.filter((e) => e.paiement === "retard").reduce(
    (s, e) => s + e.resteAPayer,
    0,
  ),
  tauxRecouvrement: Math.round(
    (encaisse / (encaisse + ETUDIANTS.reduce((s, e) => s + e.resteAPayer, 0))) *
      100,
  ),
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
  { type: "inscription", texte: "Nouvelle inscription — Fatima Zahra Lahlou (Prothèse dentaire, S1)", date: "2026-07-21" },
  { type: "paiement", texte: "Paiement reçu — Salma El Amrani, 11 000 MAD (Tranche 3)", date: "2026-07-20" },
  { type: "note", texte: "Notes saisies — Anatomie dentaire (S1, Prothèse dentaire)", date: "2026-07-19" },
  { type: "note", texte: "Notes saisies — Rééducation fonctionnelle (S3, Kinésithérapie)", date: "2026-07-18" },
  { type: "paiement", texte: "Relance envoyée — Omar Bennani, solde 33 000 MAD", date: "2026-07-17" },
  { type: "inscription", texte: "Réinscription confirmée — Zakaria Moutaouakil (Kinésithérapie, S4)", date: "2026-07-16" },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

export function fmtMAD(n: number): string {
  return `${n.toLocaleString("fr-FR")} MAD`;
}

export function fmtDate(iso: string): string {
  if (!iso || iso === "—") return "—";
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
