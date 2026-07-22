// Static mirror data for the landing page hero
// These are hardcoded sample values, not from any API

export type DashboardMiniaturePageId = "dashboard" | "familles" | "paiements" | "calendar" | "affiches" | "planifications" | "rapports" | "settings" | "superadmin";

export const MIRROR_PAGE_SIZE = 5;

// Dashboard metrics as cards array
export const mirrorDashboardMetrics = [
  { k: "total", label: "Total familles", value: "128", sub: "Depuis le début", tint: "#C9DCF2", accent: "#28396C", icon: ({ className: _ }: { className?: string }) => null, to: "/dashboard/familles", extra: null },
  { k: "paye", label: "Payé ce mois", value: "45 600 MAD", sub: "+12% vs mars", tint: "#B5E18B", accent: "#3E6420", icon: ({ className: _ }: { className?: string }) => null, to: "/dashboard/paiements", extra: null },
  { k: "retard", label: "En retard", value: "18 200 MAD", sub: "14 familles", tint: "#F6D8D8", accent: "#9A2F2F", icon: ({ className: _ }: { className?: string }) => null, to: "/dashboard/paiements", extra: null },
  { k: "impaye", label: "Impayés", value: "14", sub: "Montant total 6 700 MAD", tint: "#F4E3C0", accent: "#8A5A16", icon: ({ className: _ }: { className?: string }) => null, to: "/dashboard/clients", extra: "6 700 MAD" },
];

// Revenue chart series
export const mirrorStatSeries = [
  { mois: "Sept", encaisse: 42, paiements: 38 },
  { mois: "Oct", encaisse: 38, paiements: 35 },
  { mois: "Nov", encaisse: 41, paiements: 40 },
  { mois: "Déc", encaisse: 32, paiements: 30 },
  { mois: "Jan", encaisse: 40, paiements: 39 },
  { mois: "Fév", encaisse: 45, paiements: 42 },
  { mois: "Mar", encaisse: 44, paiements: 43 },
];

// KPI column
export const mirrorStatKpis = [
  { label: "Nouveaux", value: "8", up: true, delta: "+2" },
  { label: "Taux actif", value: "75%", up: true, delta: "+5%" },
  { label: "Revenu/mois", value: "43 600", up: true, delta: "+8%" },
];

// Last payments (also used as mirrorPaymentRows)
export const mirrorLastPayments = [
  { id: "1", who: "Karim El Fassi / Youssef", note: "CP - Mensuel mars 2026", amount: 1200, mode: "Espèces", date: "2026-03-15", status: "paye", statut: "paye", parent: "Karim El Fassi", enfant: "Youssef", niveau: "CP", montant: 1200, recu: "EDU-20260315-0001", facture: "envoye" },
  { id: "2", who: "Amina Benali / Lina", note: "CE1 - Mensuel mars 2026", amount: 900, mode: "Virement", date: "2026-03-14", status: "en_attente", statut: "paye", parent: "Amina Benali", enfant: "Lina", niveau: "CE1", montant: 900, recu: "EDU-20260314-0002", facture: "envoye" },
  { id: "3", who: "Driss Alaoui / Sofia", note: "CE2 - Mensuel mars 2026", amount: 1500, mode: "Carte", date: "2026-03-14", status: "paye", statut: "paye", parent: "Driss Alaoui", enfant: "Sofia", niveau: "CE2", montant: 1500, recu: "EDU-20260314-0003", facture: "envoye" },
  { id: "4", who: "Fatima Zahra / Omar", note: "CM1 - Mensuel mars 2026", amount: 1200, mode: "Chèque", date: "2026-03-13", status: "retard", statut: "paye", parent: "Fatima Zahra", enfant: "Omar", niveau: "CM1", montant: 1200, recu: "EDU-20260313-0004", facture: "non_envoye" },
  { id: "5", who: "Hassan Ouazzani / Aya", note: "GS - Mensuel mars 2026", amount: 600, mode: "Espèces", date: "2026-03-13", status: "impaye", statut: "paye", parent: "Hassan Ouazzani", enfant: "Aya", niveau: "GS", montant: 600, recu: "EDU-20260313-0005", facture: "non_envoye" },
];

export const mirrorPaymentRows = mirrorLastPayments;

export const mirrorPaymentsEncaisse = 45600;

// Clients list
export const mirrorClients = [
  { id: "1", parent: "Karim El Fassi", eleves: ["Youssef"], niveau: "CP", services: ["Transport"], remise: 0, mensuel: 1200, payment: "paye", dette: 0, parentName: "Karim El Fassi", childName: "Youssef", level: "CP", monthlyFee: 1200, paymentStatus: "paye" },
  { id: "2", parent: "Amina Benali", eleves: ["Lina"], niveau: "CE1", services: [], remise: 5, mensuel: 855, payment: "impaye", dette: 855, parentName: "Amina Benali", childName: "Lina", level: "CE1", monthlyFee: 900, paymentStatus: "en_attente" },
  { id: "3", parent: "Driss Alaoui", eleves: ["Sofia"], niveau: "CE2", services: ["Cantine", "Garderie"], remise: 0, mensuel: 1500, payment: "paye", dette: 0, parentName: "Driss Alaoui", childName: "Sofia", level: "CE2", monthlyFee: 1500, paymentStatus: "paye" },
  { id: "4", parent: "Fatima Zahra", eleves: ["Omar"], niveau: "CM1", services: ["Transport", "Cantine"], remise: 10, mensuel: 1080, payment: "retard", dette: 1080, parentName: "Fatima Zahra", childName: "Omar", level: "CM1", monthlyFee: 1200, paymentStatus: "retard" },
  { id: "5", parent: "Hassan Ouazzani", eleves: ["Aya"], niveau: "GS", services: [], remise: 0, mensuel: 600, payment: "impaye", dette: 1800, parentName: "Hassan Ouazzani", childName: "Aya", level: "GS", monthlyFee: 600, paymentStatus: "impaye" },
];

// Level split
export const mirrorLevelSplit = [
  { name: "CP", value: 18, color: "#28396C" },
  { name: "CE1", value: 22, color: "#B5E18B" },
  { name: "CE2", value: 15, color: "#D2624A" },
  { name: "CM1", value: 20, color: "#F4C542" },
  { name: "CM2", value: 25, color: "#7BA5D9" },
  { name: "GS", value: 28, color: "#E8A87C" },
];

export const mirrorLevelSplitTotal = mirrorLevelSplit.reduce((s, d) => s + d.value, 0);

// Payment modes
export const mirrorPaymentModes = [
  { name: "Espèces", value: 45, color: "#28396C" },
  { name: "Virement", value: 28, color: "#B5E18B" },
  { name: "Carte", value: 18, color: "#7BA5D9" },
  { name: "Chèque", value: 9, color: "#F4C542" },
];

// Pending dues
export const mirrorPendingDues = [
  { id: "p1", name: "Fatima Zahra", amount: 1200, period: "Mars 2026", status: "retard", days: 8, level: "CM1" },
  { id: "p2", name: "Hassan Ouazzani", amount: 1800, period: "Jan-Mar 2026", status: "retard", days: 21, level: "GS" },
  { id: "p3", name: "Amina Benali", amount: 855, period: "Mars 2026", status: "attente", days: 0, level: "CE1" },
];

export const mirrorPendingTotal = mirrorPendingDues.reduce((s, d) => s + d.amount, 0);

// Service revenue
export const mirrorServiceRevenue = [
  { name: "Transport", value: 14400, color: "#28396C" },
  { name: "Cantine", value: 21600, color: "#B5E18B" },
  { name: "Garderie", value: 7200, color: "#7BA5D9" },
];

export const mirrorServiceRevenueTotal = mirrorServiceRevenue.reduce((s, d) => s + d.value, 0);

// Calendar
export const mirrorCalendar = {
  month: "Mars",
  year: "2026",
  startOffset: 1,
  daysInMonth: 31,
  holidays: [2, 20],
  vacations: [15, 16, 17],
  planifications: [10, 24],
  weekDays: ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"],
  today: 15,
};

// Employees
export const mirrorEmployes = [
  { id: "1", nomComplet: "Nadia Tazi", poste: "Enseignante", departement: "Primaire", email: "n.tazi@school-crm.ma", tel: "+212 6 12 34 56 78", salaire: 6500, statut: "actif" },
  { id: "2", nomComplet: "Mohamed Amrani", poste: "Enseignant", departement: "Maternelle", email: "m.amrani@school-crm.ma", tel: "+212 6 23 45 67 89", salaire: 5800, statut: "actif" },
  { id: "3", nomComplet: "Sara Bennis", poste: "Administratrice", departement: "Admin", email: "s.bennis@school-crm.ma", tel: "+212 6 34 56 78 90", salaire: 7200, statut: "actif" },
];

// Settings sections
export const mirrorSettingsSections = [
  { title: "Général", desc: "Nom du centre, adresse, email, téléphone", rows: [{ label: "Nom du centre", value: "Isteqm Agadir" }, { label: "Adresse", value: "Agadir, Maroc" }] },
  { title: "Niveaux", desc: "CP, CE1, CE2, CM1, CM2, GS", rows: [{ label: "Niveaux actifs", value: "6" }] },
  { title: "Services", desc: "Transport, Cantine, Garderie", rows: [{ label: "Services actifs", value: "3" }] },
  { title: "Paiement", desc: "Espèces, Virement, Carte, Chèque", rows: [{ label: "Modes de paiement", value: "4" }] },
];
