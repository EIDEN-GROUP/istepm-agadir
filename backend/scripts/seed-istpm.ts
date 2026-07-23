import bcrypt from "bcrypt";
import pg from "pg";
import "dotenv/config";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/school_crm",
});

async function seed() {
  console.log("Seeding ISTPM data...");

  /* ------------------------------------------------------------------ */
  /*  1. Demo users                                                      */
  /* ------------------------------------------------------------------ */
  const users = [
    { email: "direction@istpm-agadir.ma", password: "directeur123", name: "Dr. Youssef Benali", role: "directeur" },
    { email: "enseignant@istpm-agadir.ma", password: "enseignant123", name: "Mme Salma Ait Taleb", role: "enseignant" },
    { email: "responsable@istpm-agadir.ma", password: "responsable123", name: "M. Rachid El Ouafi", role: "responsable" },
  ];

  for (const u of users) {
    const hash = bcrypt.hashSync(u.password, 10);
    await pool.query(
      `INSERT INTO users (email, password_hash, name, role)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO NOTHING`,
      [u.email, hash, u.name, u.role],
    );
  }
  console.log("  ✓ 3 demo users created");

  /* ------------------------------------------------------------------ */
  /*  2. Filieres (settings table)                                       */
  /* ------------------------------------------------------------------ */
  const filieres = [
    "Infirmier polyvalent",
    "Infirmier en anesthésie-réanimation",
    "Sage-femme",
    "Kinésithérapie",
    "Radiologie / Imagerie médicale",
    "Laboratoire / Biologie médicale",
    "Prothèse dentaire",
  ];
  await pool.query(
    `INSERT INTO settings (key, value)
     VALUES ('filieres', $1::jsonb)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
    [JSON.stringify(filieres)],
  );
  console.log("  ✓ 7 filieres registered");

  /* ------------------------------------------------------------------ */
  /*  3. Étudiants (14)                                                  */
  /* ------------------------------------------------------------------ */
  const etudiantsData: Array<{
    id: string; cne: string; matricule: string; prenom: string; nom: string;
    filiere: string; niveau: string; annee: string; groupe: string;
    statut: string; paiement: string; moyenne: number;
    telephone: string; email: string; dateNaissance: string; ville: string;
    fraisAnnuels: number; resteAPayer: number;
  }> = [
    { id: "et-1", cne: "G134567890", matricule: "ISTPM-23-0142", prenom: "Salma", nom: "El Amrani", filiere: "Infirmier polyvalent", niveau: "S5", annee: "3e année", groupe: "G1", statut: "inscrit", paiement: "paye", moyenne: 14.6, telephone: "+212 6 61 24 55 018", email: "salma.elamrani@istpm.ma", dateNaissance: "2003-04-12", ville: "Agadir", fraisAnnuels: 34000, resteAPayer: 0 },
    { id: "et-2", cne: "J138245017", matricule: "ISTPM-23-0155", prenom: "Youssef", nom: "Ait Taleb", filiere: "Infirmier en anesthésie-réanimation", niveau: "S5", annee: "3e année", groupe: "G1", statut: "inscrit", paiement: "retard", moyenne: 12.3, telephone: "+212 6 70 11 42 88", email: "y.aittaleb@istpm.ma", dateNaissance: "2002-11-30", ville: "Inezgane", fraisAnnuels: 38000, resteAPayer: 13000 },
    { id: "et-3", cne: "F145908712", matricule: "ISTPM-24-0203", prenom: "Imane", nom: "Benkirane", filiere: "Sage-femme", niveau: "S3", annee: "2e année", groupe: "G2", statut: "inscrit", paiement: "paye", moyenne: 15.9, telephone: "+212 6 55 78 90 12", email: "i.benkirane@istpm.ma", dateNaissance: "2004-02-18", ville: "Agadir", fraisAnnuels: 32000, resteAPayer: 0 },
    { id: "et-4", cne: "M139874521", matricule: "ISTPM-24-0211", prenom: "Anas", nom: "Chafik", filiere: "Kinésithérapie", niveau: "S3", annee: "2e année", groupe: "G1", statut: "inscrit", paiement: "en_attente", moyenne: 11.2, telephone: "+212 6 12 34 56 78", email: "a.chafik@istpm.ma", dateNaissance: "2003-07-05", ville: "Taroudant", fraisAnnuels: 33000, resteAPayer: 16500 },
    { id: "et-5", cne: "D141200983", matricule: "ISTPM-22-0098", prenom: "Khadija", nom: "Ouhssaine", filiere: "Radiologie / Imagerie médicale", niveau: "S6", annee: "3e année", groupe: "G1", statut: "inscrit", paiement: "paye", moyenne: 13.7, telephone: "+212 6 88 45 21 09", email: "k.ouhssaine@istpm.ma", dateNaissance: "2002-05-22", ville: "Agadir", fraisAnnuels: 35000, resteAPayer: 0 },
    { id: "et-6", cne: "H137654210", matricule: "ISTPM-22-0104", prenom: "Omar", nom: "Bennani", filiere: "Laboratoire / Biologie médicale", niveau: "S6", annee: "3e année", groupe: "G2", statut: "inscrit", paiement: "impaye", moyenne: 9.4, telephone: "+212 6 33 90 18 45", email: "o.bennani@istpm.ma", dateNaissance: "2002-09-14", ville: "Agadir", fraisAnnuels: 33000, resteAPayer: 33000 },
    { id: "et-7", cne: "S144210087", matricule: "ISTPM-24-0230", prenom: "Fatima Zahra", nom: "Lahlou", filiere: "Prothèse dentaire", niveau: "S1", annee: "1re année", groupe: "A", statut: "inscrit", paiement: "paye", moyenne: 13.1, telephone: "+212 6 47 22 88 90", email: "fz.lahlou@istpm.ma", dateNaissance: "2005-01-08", ville: "Aït Melloul", fraisAnnuels: 30000, resteAPayer: 0 },
    { id: "et-8", cne: "R142870031", matricule: "ISTPM-24-0245", prenom: "Mehdi", nom: "Sabri", filiere: "Infirmier polyvalent", niveau: "S1", annee: "1re année", groupe: "B", statut: "inscrit", paiement: "retard", moyenne: 10.8, telephone: "+212 6 90 34 12 67", email: "m.sabri@istpm.ma", dateNaissance: "2005-03-25", ville: "Agadir", fraisAnnuels: 34000, resteAPayer: 11000 },
    { id: "et-9", cne: "B140095512", matricule: "ISTPM-23-0167", prenom: "Hajar", nom: "Idrissi", filiere: "Sage-femme", niveau: "S4", annee: "2e année", groupe: "G1", statut: "inscrit", paiement: "paye", moyenne: 14.2, telephone: "+212 6 21 76 43 90", email: "h.idrissi@istpm.ma", dateNaissance: "2003-12-01", ville: "Agadir", fraisAnnuels: 32000, resteAPayer: 8000 },
    { id: "et-10", cne: "K139001284", matricule: "ISTPM-23-0178", prenom: "Zakaria", nom: "Moutaouakil", filiere: "Kinésithérapie", niveau: "S4", annee: "2e année", groupe: "G2", statut: "inscrit", paiement: "paye", moyenne: 13.9, telephone: "+212 6 64 30 11 22", email: "z.moutaouakil@istpm.ma", dateNaissance: "2003-06-19", ville: "Ouarzazate", fraisAnnuels: 33000, resteAPayer: 0 },
    { id: "et-11", cne: "T143562019", matricule: "ISTPM-24-0251", prenom: "Nisrine", nom: "Fadili", filiere: "Radiologie / Imagerie médicale", niveau: "S2", annee: "1re année", groupe: "A", statut: "inscrit", paiement: "en_attente", moyenne: 12.6, telephone: "+212 6 78 45 60 33", email: "n.fadili@istpm.ma", dateNaissance: "2005-08-11", ville: "Agadir", fraisAnnuels: 35000, resteAPayer: 17500 },
    { id: "et-12", cne: "L138744120", matricule: "ISTPM-22-0087", prenom: "Ayoub", nom: "Naciri", filiere: "Infirmier en anesthésie-réanimation", niveau: "S6", annee: "3e année", groupe: "G1", statut: "diplome", paiement: "paye", moyenne: 15.4, telephone: "+212 6 55 12 90 84", email: "a.naciri@istpm.ma", dateNaissance: "2002-01-27", ville: "Agadir", fraisAnnuels: 38000, resteAPayer: 0 },
    { id: "et-13", cne: "N142008874", matricule: "ISTPM-24-0260", prenom: "Sara", nom: "El Ghazi", filiere: "Laboratoire / Biologie médicale", niveau: "S2", annee: "1re année", groupe: "B", statut: "en_attente", paiement: "impaye", moyenne: 8.7, telephone: "+212 6 41 55 78 20", email: "s.elghazi@istpm.ma", dateNaissance: "2005-10-03", ville: "Tiznit", fraisAnnuels: 33000, resteAPayer: 33000 },
    { id: "et-14", cne: "C139887654", matricule: "ISTPM-23-0190", prenom: "Bilal", nom: "Ramdani", filiere: "Prothèse dentaire", niveau: "S4", annee: "2e année", groupe: "A", statut: "abandon", paiement: "impaye", moyenne: 7.9, telephone: "+212 6 60 21 43 77", email: "b.ramdani@istpm.ma", dateNaissance: "2003-04-30", ville: "Agadir", fraisAnnuels: 30000, resteAPayer: 22000 },
  ];

  for (const e of etudiantsData) {
    await pool.query(
      `INSERT INTO etudiants (id, cne, matricule, prenom, nom, filiere, niveau, annee, groupe, statut, paiement, moyenne, telephone, email, date_naissance, ville, frais_annuels, reste_a_payer)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
       ON CONFLICT (id) DO UPDATE SET
         cne=EXCLUDED.cne, prenom=EXCLUDED.prenom, nom=EXCLUDED.nom,
         filiere=EXCLUDED.filiere, niveau=EXCLUDED.niveau, statut=EXCLUDED.statut,
         paiement=EXCLUDED.paiement, moyenne=EXCLUDED.moyenne, reste_a_payer=EXCLUDED.reste_a_payer`,
      [e.id, e.cne, e.matricule, e.prenom, e.nom, e.filiere, e.niveau, e.annee, e.groupe,
       e.statut, e.paiement, String(e.moyenne), e.telephone, e.email, e.dateNaissance,
       e.ville, String(e.fraisAnnuels), String(e.resteAPayer)],
    );
  }
  console.log("  ✓ 14 etudiants created");

  /* ------------------------------------------------------------------ */
  /*  4. Notes étudiant                                                  */
  /* ------------------------------------------------------------------ */
  type NoteRow = { etudiantId: string; module: string; note: number; coef: number; credits: number };
  const allNotes: NoteRow[] = [
    { etudiantId: "et-1", module: "Soins infirmiers en médecine", note: 15.5, coef: 3, credits: 6 },
    { etudiantId: "et-1", module: "Pharmacologie", note: 13.0, coef: 2, credits: 4 },
    { etudiantId: "et-1", module: "Santé publique", note: 14.75, coef: 2, credits: 4 },
    { etudiantId: "et-1", module: "Éthique et déontologie", note: 16.0, coef: 1, credits: 2 },
    { etudiantId: "et-2", module: "Réanimation et soins intensifs", note: 13.5, coef: 3, credits: 6 },
    { etudiantId: "et-2", module: "Anesthésie clinique", note: 11.0, coef: 3, credits: 6 },
    { etudiantId: "et-2", module: "Physiologie appliquée", note: 12.25, coef: 2, credits: 4 },
    { etudiantId: "et-3", module: "Obstétrique", note: 16.5, coef: 3, credits: 6 },
    { etudiantId: "et-3", module: "Suivi de grossesse", note: 15.0, coef: 2, credits: 4 },
    { etudiantId: "et-3", module: "Néonatologie", note: 16.25, coef: 2, credits: 4 },
    { etudiantId: "et-4", module: "Rééducation fonctionnelle", note: 12.0, coef: 3, credits: 6 },
    { etudiantId: "et-4", module: "Anatomie du mouvement", note: 10.5, coef: 2, credits: 4 },
    { etudiantId: "et-4", module: "Kinésithérapie respiratoire", note: 11.0, coef: 2, credits: 4 },
    { etudiantId: "et-5", module: "Techniques de radiologie", note: 14.0, coef: 3, credits: 6 },
    { etudiantId: "et-5", module: "Scanner et IRM", note: 13.5, coef: 3, credits: 6 },
    { etudiantId: "et-5", module: "Radioprotection", note: 13.0, coef: 2, credits: 4 },
    { etudiantId: "et-6", module: "Hématologie", note: 8.5, coef: 3, credits: 6 },
    { etudiantId: "et-6", module: "Biochimie clinique", note: 10.0, coef: 3, credits: 6 },
    { etudiantId: "et-6", module: "Microbiologie", note: 9.75, coef: 2, credits: 4 },
    { etudiantId: "et-7", module: "Anatomie dentaire", note: 14.0, coef: 2, credits: 4 },
    { etudiantId: "et-7", module: "Matériaux de prothèse", note: 12.5, coef: 2, credits: 4 },
    { etudiantId: "et-7", module: "Prothèse fixe (TP)", note: 13.0, coef: 3, credits: 6 },
    { etudiantId: "et-8", module: "Bases des soins infirmiers", note: 11.0, coef: 3, credits: 6 },
    { etudiantId: "et-8", module: "Anatomie-physiologie", note: 10.5, coef: 2, credits: 4 },
    { etudiantId: "et-8", module: "Hygiène hospitalière", note: 11.25, coef: 2, credits: 4 },
    { etudiantId: "et-9", module: "Obstétrique avancée", note: 15.0, coef: 3, credits: 6 },
    { etudiantId: "et-9", module: "Pathologies de la grossesse", note: 13.5, coef: 2, credits: 4 },
    { etudiantId: "et-10", module: "Kinésithérapie orthopédique", note: 14.5, coef: 3, credits: 6 },
    { etudiantId: "et-10", module: "Électrothérapie", note: 13.0, coef: 2, credits: 4 },
    { etudiantId: "et-11", module: "Physique des rayonnements", note: 12.0, coef: 2, credits: 4 },
    { etudiantId: "et-11", module: "Introduction à l'imagerie", note: 13.25, coef: 2, credits: 4 },
    { etudiantId: "et-12", module: "Réanimation avancée", note: 16.0, coef: 3, credits: 6 },
    { etudiantId: "et-12", module: "Prise en charge de la douleur", note: 15.0, coef: 2, credits: 4 },
    { etudiantId: "et-13", module: "Bases de biochimie", note: 9.0, coef: 2, credits: 4 },
    { etudiantId: "et-13", module: "Techniques de laboratoire", note: 8.5, coef: 2, credits: 4 },
    { etudiantId: "et-14", module: "Prothèse amovible (TP)", note: 8.0, coef: 3, credits: 6 },
    { etudiantId: "et-14", module: "Occlusodontie", note: 7.5, coef: 2, credits: 4 },
  ];

  for (const n of allNotes) {
    await pool.query(
      `INSERT INTO notes_etudiant (etudiant_id, module, note, coef, credits)
       VALUES ($1, $2, $3, $4, $5)`,
      [n.etudiantId, n.module, String(n.note), String(n.coef), String(n.credits)],
    );
  }
  console.log("  ✓ 38 student-grade records created");

  /* ------------------------------------------------------------------ */
  /*  5. Historique de paiements                                         */
  /* ------------------------------------------------------------------ */
  type HistoRow = { etudiantId: string; date: string; montant: number; mode: string; periode: string; recu: string; statut: string };
  const historiques: HistoRow[] = [
    { etudiantId: "et-1", date: "2025-10-05", montant: 12000, mode: "Virement", periode: "Tranche 1   2025/26", recu: "ISTPM-R-2510-018", statut: "paye" },
    { etudiantId: "et-1", date: "2026-01-14", montant: 11000, mode: "Chèque", periode: "Tranche 2   2025/26", recu: "ISTPM-R-2601-051", statut: "paye" },
    { etudiantId: "et-1", date: "2026-04-10", montant: 11000, mode: "Virement", periode: "Tranche 3   2025/26", recu: "ISTPM-R-2604-077", statut: "paye" },
    { etudiantId: "et-2", date: "2025-10-09", montant: 13000, mode: "Espèces", periode: "Tranche 1   2025/26", recu: "ISTPM-R-2510-033", statut: "paye" },
    { etudiantId: "et-2", date: "2026-01-20", montant: 12000, mode: "Virement", periode: "Tranche 2   2025/26", recu: "ISTPM-R-2601-064", statut: "paye" },
    { etudiantId: "et-2", date: " ", montant: 13000, mode: "Virement", periode: "Tranche 3   2025/26", recu: " ", statut: "retard" },
    { etudiantId: "et-3", date: "2025-09-28", montant: 16000, mode: "Virement", periode: "Tranche 1   2025/26", recu: "ISTPM-R-2509-004", statut: "paye" },
    { etudiantId: "et-3", date: "2026-02-02", montant: 16000, mode: "Carte", periode: "Tranche 2   2025/26", recu: "ISTPM-R-2602-088", statut: "paye" },
    { etudiantId: "et-4", date: "2025-10-15", montant: 16500, mode: "Chèque", periode: "Tranche 1   2025/26", recu: "ISTPM-R-2510-045", statut: "paye" },
    { etudiantId: "et-4", date: " ", montant: 16500, mode: "Virement", periode: "Tranche 2   2025/26", recu: " ", statut: "en_attente" },
    { etudiantId: "et-5", date: "2025-09-30", montant: 17500, mode: "Virement", periode: "Tranche 1   2025/26", recu: "ISTPM-R-2509-011", statut: "paye" },
    { etudiantId: "et-5", date: "2026-01-30", montant: 17500, mode: "Virement", periode: "Tranche 2   2025/26", recu: "ISTPM-R-2601-072", statut: "paye" },
    { etudiantId: "et-6", date: " ", montant: 16500, mode: "Virement", periode: "Tranche 1   2025/26", recu: " ", statut: "impaye" },
    { etudiantId: "et-7", date: "2025-10-02", montant: 15000, mode: "Espèces", periode: "Tranche 1   2025/26", recu: "ISTPM-R-2510-002", statut: "paye" },
    { etudiantId: "et-7", date: "2026-02-10", montant: 15000, mode: "Carte", periode: "Tranche 2   2025/26", recu: "ISTPM-R-2602-095", statut: "paye" },
    { etudiantId: "et-8", date: "2025-10-12", montant: 12000, mode: "Espèces", periode: "Tranche 1   2025/26", recu: "ISTPM-R-2510-058", statut: "paye" },
    { etudiantId: "et-8", date: "2026-01-25", montant: 11000, mode: "Virement", periode: "Tranche 2   2025/26", recu: "ISTPM-R-2601-081", statut: "paye" },
    { etudiantId: "et-8", date: " ", montant: 11000, mode: "Virement", periode: "Tranche 3   2025/26", recu: " ", statut: "retard" },
    { etudiantId: "et-9", date: "2025-10-01", montant: 12000, mode: "Virement", periode: "Tranche 1   2025/26", recu: "ISTPM-R-2510-009", statut: "paye" },
    { etudiantId: "et-9", date: "2026-01-18", montant: 12000, mode: "Chèque", periode: "Tranche 2   2025/26", recu: "ISTPM-R-2601-060", statut: "paye" },
    { etudiantId: "et-9", date: " ", montant: 8000, mode: "Virement", periode: "Tranche 3   2025/26", recu: " ", statut: "en_attente" },
    { etudiantId: "et-10", date: "2025-09-29", montant: 16500, mode: "Virement", periode: "Tranche 1   2025/26", recu: "ISTPM-R-2509-007", statut: "paye" },
    { etudiantId: "et-10", date: "2026-02-05", montant: 16500, mode: "Virement", periode: "Tranche 2   2025/26", recu: "ISTPM-R-2602-090", statut: "paye" },
    { etudiantId: "et-11", date: "2025-10-18", montant: 17500, mode: "Chèque", periode: "Tranche 1   2025/26", recu: "ISTPM-R-2510-062", statut: "paye" },
    { etudiantId: "et-11", date: " ", montant: 17500, mode: "Virement", periode: "Tranche 2   2025/26", recu: " ", statut: "en_attente" },
    { etudiantId: "et-12", date: "2025-09-25", montant: 19000, mode: "Virement", periode: "Tranche 1   2025/26", recu: "ISTPM-R-2509-001", statut: "paye" },
    { etudiantId: "et-12", date: "2026-01-15", montant: 19000, mode: "Virement", periode: "Tranche 2   2025/26", recu: "ISTPM-R-2601-052", statut: "paye" },
    { etudiantId: "et-13", date: " ", montant: 16500, mode: "Virement", periode: "Tranche 1   2025/26", recu: " ", statut: "impaye" },
    { etudiantId: "et-14", date: "2025-10-08", montant: 8000, mode: "Espèces", periode: "Tranche 1   2025/26", recu: "ISTPM-R-2510-040", statut: "paye" },
    { etudiantId: "et-14", date: " ", montant: 22000, mode: "Virement", periode: "Solde 2025/26", recu: " ", statut: "impaye" },
  ];

  for (const h of historiques) {
    const dt = h.date === " " ? new Date().toISOString().split("T")[0] : h.date;
    await pool.query(
      `INSERT INTO historique_paiements (etudiant_id, date, montant, mode, periode, recu, statut)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [h.etudiantId, dt, String(h.montant), h.mode, h.periode, h.recu, h.statut],
    );
  }
  console.log("  ✓ 30 payment-history records created");

  /* ------------------------------------------------------------------ */
  /*  6. Formateurs (8)                                                  */
  /* ------------------------------------------------------------------ */
  const formateursData = [
    { id: "fo-1", matricule: "ENS-014", cin: "JB145872", prenom: "Salma", nom: "El Idrissi", grade: "PES", departement: "Infirmier polyvalent", modules: ["Soins infirmiers en médecine", "Hygiène hospitalière", "Éthique et déontologie"], groupes: ["S5-G1", "S1-B"], statut: "permanent", telephone: "+212 6 61 45 22 10", email: "s.elidrissi@istpm.ma", notesSaisies: 128 },
    { id: "fo-2", matricule: "ENS-021", cin: "J409231", prenom: "Rachid", nom: "Benjelloun", grade: "PES", departement: "Infirmier en anesthésie-réanimation", modules: ["Réanimation et soins intensifs", "Anesthésie clinique"], groupes: ["S5-G1", "S6-G1"], statut: "permanent", telephone: "+212 6 70 88 41 05", email: "r.benjelloun@istpm.ma", notesSaisies: 96 },
    { id: "fo-3", matricule: "ENS-033", cin: "JC220514", prenom: "Naima", nom: "Ait Hammou", grade: "PES", departement: "Sage-femme", modules: ["Obstétrique", "Suivi de grossesse", "Néonatologie"], groupes: ["S3-G2", "S4-G1"], statut: "permanent", telephone: "+212 6 55 30 78 44", email: "n.aithammou@istpm.ma", notesSaisies: 142 },
    { id: "fo-4", matricule: "ENS-045", cin: "JE118064", prenom: "Hicham", nom: "Bouzid", grade: "vacataire", departement: "Kinésithérapie", modules: ["Rééducation fonctionnelle", "Électrothérapie"], groupes: ["S3-G1", "S4-G2"], statut: "vacataire", telephone: "+212 6 12 90 34 56", email: "h.bouzid@istpm.ma", notesSaisies: 54 },
    { id: "fo-5", matricule: "ENS-052", cin: "JB302977", prenom: "Loubna", nom: "Sekkat", grade: "PES", departement: "Radiologie / Imagerie médicale", modules: ["Techniques de radiologie", "Scanner et IRM", "Radioprotection"], groupes: ["S6-G1", "S2-A"], statut: "en_conge", telephone: "+212 6 88 12 44 90", email: "l.sekkat@istpm.ma", notesSaisies: 71 },
    { id: "fo-6", matricule: "ENS-060", cin: "J512403", prenom: "Karim", nom: "Tahiri", grade: "formateur_clinique", departement: "Laboratoire / Biologie médicale", modules: ["Hématologie", "Biochimie clinique", "Microbiologie"], groupes: ["S6-G2", "S2-B"], statut: "permanent", telephone: "+212 6 33 21 09 87", email: "k.tahiri@istpm.ma", notesSaisies: 88 },
    { id: "fo-7", matricule: "ENS-068", cin: "JC176390", prenom: "Amina", nom: "Rochdi", grade: "vacataire", departement: "Prothèse dentaire", modules: ["Anatomie dentaire", "Prothèse fixe (TP)", "Occlusodontie"], groupes: ["S1-A", "S4-A"], statut: "vacataire", telephone: "+212 6 47 66 21 08", email: "a.rochdi@istpm.ma", notesSaisies: 42 },
    { id: "fo-8", matricule: "ENS-074", cin: "JE240815", prenom: "Mustapha", nom: "El Khattabi", grade: "formateur_clinique", departement: "Infirmier polyvalent", modules: ["Pharmacologie", "Santé publique"], groupes: ["S5-G1", "S1-B"], statut: "permanent", telephone: "+212 6 90 55 12 34", email: "m.elkhattabi@istpm.ma", notesSaisies: 63 },
  ];

  for (const f of formateursData) {
    await pool.query(
      `INSERT INTO formateurs (id, matricule, cin, prenom, nom, grade, departement, modules, groupes, statut, telephone, email, notes_saisies)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       ON CONFLICT (id) DO UPDATE SET
         prenom=EXCLUDED.prenom, nom=EXCLUDED.nom, grade=EXCLUDED.grade,
         departement=EXCLUDED.departement, statut=EXCLUDED.statut, notes_saisies=EXCLUDED.notes_saisies`,
      [f.id, f.matricule, f.cin, f.prenom, f.nom, f.grade, f.departement,
       JSON.stringify(f.modules), JSON.stringify(f.groupes), f.statut,
       f.telephone, f.email, f.notesSaisies],
    );
  }
  console.log("  ✓ 8 formateurs created");

  /* ------------------------------------------------------------------ */
  /*  7. Examens (10)                                                    */
  /* ------------------------------------------------------------------ */
  const examensData = [
    { id: "ex-1", module: "Soins infirmiers en médecine", filiere: "Infirmier polyvalent", niveau: "S5", type: "examen_theorique", date: "2026-07-28", heure: "09:00", salle: "Amphi A", surveillants: ["S. El Idrissi", "M. El Khattabi"], statut: "planifie", etudiantsConvoques: 32, composante: "Théorique + Pratique" },
    { id: "ex-2", module: "Réanimation et soins intensifs", filiere: "Infirmier en anesthésie-réanimation", niveau: "S5", type: "evaluation_pratique", date: "2026-07-29", heure: "08:30", salle: "Labo simulation 2", surveillants: ["R. Benjelloun"], statut: "planifie", etudiantsConvoques: 24, composante: "Pratique" },
    { id: "ex-3", module: "Obstétrique", filiere: "Sage-femme", niveau: "S3", type: "controle_continu", date: "2026-07-24", heure: "10:00", salle: "Salle 12", surveillants: ["N. Ait Hammou"], statut: "en_cours", etudiantsConvoques: 28, composante: "Théorique" },
    { id: "ex-4", module: "Rééducation fonctionnelle", filiere: "Kinésithérapie", niveau: "S3", type: "evaluation_pratique", date: "2026-07-22", heure: "14:00", salle: "Salle de rééducation", surveillants: ["H. Bouzid"], statut: "notes_saisies", etudiantsConvoques: 26, composante: "Pratique" },
    { id: "ex-5", module: "Techniques de radiologie", filiere: "Radiologie / Imagerie médicale", niveau: "S6", type: "examen_theorique", date: "2026-07-30", heure: "09:00", salle: "Amphi B", surveillants: ["L. Sekkat", "K. Tahiri"], statut: "planifie", etudiantsConvoques: 22, composante: "Théorique + Pratique" },
    { id: "ex-6", module: "Hématologie", filiere: "Laboratoire / Biologie médicale", niveau: "S6", type: "evaluation_pratique", date: "2026-07-23", heure: "11:00", salle: "Labo biologie", surveillants: ["K. Tahiri"], statut: "en_cours", etudiantsConvoques: 20, composante: "Pratique" },
    { id: "ex-7", module: "Anatomie dentaire", filiere: "Prothèse dentaire", niveau: "S1", type: "controle_continu", date: "2026-07-21", heure: "10:30", salle: "Salle 5", surveillants: ["A. Rochdi"], statut: "notes_saisies", etudiantsConvoques: 30, composante: "Théorique" },
    { id: "ex-8", module: "Biochimie clinique", filiere: "Laboratoire / Biologie médicale", niveau: "S6", type: "rattrapage", date: "2026-09-08", heure: "09:00", salle: "Salle 9", surveillants: ["K. Tahiri"], statut: "planifie", etudiantsConvoques: 6, composante: "Théorique + Pratique" },
    { id: "ex-9", module: "Anesthésie clinique", filiere: "Infirmier en anesthésie-réanimation", niveau: "S5", type: "examen_theorique", date: "2026-07-27", heure: "08:30", salle: "Amphi A", surveillants: ["R. Benjelloun", "S. El Idrissi"], statut: "planifie", etudiantsConvoques: 24, composante: "Théorique + Pratique" },
    { id: "ex-10", module: "Prothèse fixe (TP)", filiere: "Prothèse dentaire", niveau: "S1", type: "evaluation_pratique", date: "2026-07-25", heure: "14:00", salle: "Atelier prothèse", surveillants: ["A. Rochdi"], statut: "planifie", etudiantsConvoques: 30, composante: "Pratique" },
  ];

  for (const ex of examensData) {
    await pool.query(
      `INSERT INTO examens (id, module, filiere, niveau, type, date, heure, salle, surveillants, statut, etudiants_convoques, composante)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       ON CONFLICT (id) DO UPDATE SET
         module=EXCLUDED.module, statut=EXCLUDED.statut`,
      [ex.id, ex.module, ex.filiere, ex.niveau, ex.type, ex.date, ex.heure, ex.salle,
       JSON.stringify(ex.surveillants), ex.statut, ex.etudiantsConvoques, ex.composante],
    );
  }
  console.log("  ✓ 10 examens created");

  /* ------------------------------------------------------------------ */
  /*  8. Bulletins (10)                                                  */
  /* ------------------------------------------------------------------ */
  const bulletinsData = [
    { id: "bu-1", etudiantId: "et-1", cne: "G134567890", prenom: "Salma", nom: "El Amrani", filiere: "Infirmier polyvalent", niveau: "S5", session: "normale", moyenne: 14.6, mention: "Bien", decision: "Admis", statut: "valide", evaluationClinique: 15.5 },
    { id: "bu-2", etudiantId: "et-2", cne: "J138245017", prenom: "Youssef", nom: "Ait Taleb", filiere: "Infirmier en anesthésie-réanimation", niveau: "S5", session: "normale", moyenne: 12.3, mention: "Assez bien", decision: "Admis avec dette", statut: "genere", evaluationClinique: 13.0 },
    { id: "bu-3", etudiantId: "et-3", cne: "F145908712", prenom: "Imane", nom: "Benkirane", filiere: "Sage-femme", niveau: "S3", session: "normale", moyenne: 15.9, mention: "Bien", decision: "Admis", statut: "publie", evaluationClinique: 16.0 },
    { id: "bu-4", etudiantId: "et-4", cne: "M139874521", prenom: "Anas", nom: "Chafik", filiere: "Kinésithérapie", niveau: "S3", session: "normale", moyenne: 11.2, mention: "Passable", decision: "Rattrapage", statut: "genere", evaluationClinique: 11.5 },
    { id: "bu-5", etudiantId: "et-5", cne: "D141200983", prenom: "Khadija", nom: "Ouhssaine", filiere: "Radiologie / Imagerie médicale", niveau: "S6", session: "normale", moyenne: 13.7, mention: "Assez bien", decision: "Admis", statut: "valide", evaluationClinique: 14.0 },
    { id: "bu-6", etudiantId: "et-6", cne: "H137654210", prenom: "Omar", nom: "Bennani", filiere: "Laboratoire / Biologie médicale", niveau: "S6", session: "normale", moyenne: 9.4, mention: "Passable", decision: "Ajourné", statut: "genere", evaluationClinique: 9.0 },
    { id: "bu-7", etudiantId: "et-9", cne: "B140095512", prenom: "Hajar", nom: "Idrissi", filiere: "Sage-femme", niveau: "S4", session: "normale", moyenne: 14.2, mention: "Bien", decision: "Admis", statut: "publie", evaluationClinique: 14.5 },
    { id: "bu-8", etudiantId: "et-10", cne: "K139001284", prenom: "Zakaria", nom: "Moutaouakil", filiere: "Kinésithérapie", niveau: "S4", session: "normale", moyenne: 13.9, mention: "Assez bien", decision: "Admis", statut: "valide", evaluationClinique: 14.0 },
    { id: "bu-9", etudiantId: "et-14", cne: "C139887654", prenom: "Bilal", nom: "Ramdani", filiere: "Prothèse dentaire", niveau: "S4", session: "rattrapage", moyenne: 7.9, mention: "Passable", decision: "Ajourné", statut: "genere", evaluationClinique: 8.0 },
    { id: "bu-10", etudiantId: "et-12", cne: "L138744120", prenom: "Ayoub", nom: "Naciri", filiere: "Infirmier en anesthésie-réanimation", niveau: "S6", session: "normale", moyenne: 15.4, mention: "Bien", decision: "Admis", statut: "publie", evaluationClinique: 16.0 },
  ];

  for (const b of bulletinsData) {
    await pool.query(
      `INSERT INTO bulletins (id, etudiant_id, cne, prenom, nom, filiere, niveau, session, moyenne, mention, decision, statut, evaluation_clinique)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       ON CONFLICT (id) DO UPDATE SET
         statut=EXCLUDED.statut, decision=EXCLUDED.decision`,
      [b.id, b.etudiantId, b.cne, b.prenom, b.nom, b.filiere, b.niveau, b.session,
       String(b.moyenne), b.mention, b.decision, b.statut, String(b.evaluationClinique)],
    );
  }
  console.log("  ✓ 10 bulletins created");

  /* ------------------------------------------------------------------ */
  /*  9. Stages (9)                                                      */
  /* ------------------------------------------------------------------ */
  const stagesData = [
    { id: "st-1", etudiantId: "et-1", cne: "G134567890", prenom: "Salma", nom: "El Amrani", filiere: "Infirmier polyvalent", niveau: "S5", structure: "CHR Hassan II   Agadir", service: "Médecine interne", encadrantClinique: "Dr. A. Bennis (Cadre infirmier)", tuteurAcademique: "S. El Idrissi", debut: "2026-06-01", fin: "2026-07-31", statut: "en_cours", conventionSignee: true, noteSoutenance: null },
    { id: "st-2", etudiantId: "et-2", cne: "J138245017", prenom: "Youssef", nom: "Ait Taleb", filiere: "Infirmier en anesthésie-réanimation", niveau: "S5", structure: "CHR Hassan II   Agadir", service: "Bloc opératoire", encadrantClinique: "Dr. R. Mansouri (Médecin anesthésiste)", tuteurAcademique: "R. Benjelloun", debut: "2026-06-01", fin: "2026-07-31", statut: "en_cours", conventionSignee: true, noteSoutenance: null },
    { id: "st-3", etudiantId: "et-3", cne: "F145908712", prenom: "Imane", nom: "Benkirane", filiere: "Sage-femme", niveau: "S3", structure: "Hôpital Hassan II   Agadir", service: "Maternité", encadrantClinique: "Mme F. Oubella (Sage-femme major)", tuteurAcademique: "N. Ait Hammou", debut: "2026-05-15", fin: "2026-07-15", statut: "soutenance", conventionSignee: true, noteSoutenance: 16 },
    { id: "st-4", etudiantId: "et-5", cne: "D141200983", prenom: "Khadija", nom: "Ouhssaine", filiere: "Radiologie / Imagerie médicale", niveau: "S6", structure: "CHR Hassan II   Agadir", service: "Service d'imagerie", encadrantClinique: "M. T. Fadel (Manipulateur en chef)", tuteurAcademique: "L. Sekkat", debut: "2026-04-01", fin: "2026-06-30", statut: "valide", conventionSignee: true, noteSoutenance: 15 },
    { id: "st-5", etudiantId: "et-6", cne: "H137654210", prenom: "Omar", nom: "Bennani", filiere: "Laboratoire / Biologie médicale", niveau: "S6", structure: "Hôpital Hassan II   Agadir", service: "Laboratoire d'analyses", encadrantClinique: "Dr. S. Haddad (Biologiste)", tuteurAcademique: "K. Tahiri", debut: "2026-06-01", fin: "2026-08-31", statut: "convention_signee", conventionSignee: true, noteSoutenance: null },
    { id: "st-6", etudiantId: "et-9", cne: "B140095512", prenom: "Hajar", nom: "Idrissi", filiere: "Sage-femme", niveau: "S4", structure: "Hôpital préfectoral Inezgane", service: "Maternité", encadrantClinique: "Mme N. Sabil (Sage-femme major)", tuteurAcademique: "N. Ait Hammou", debut: "2026-06-15", fin: "2026-08-15", statut: "en_cours", conventionSignee: true, noteSoutenance: null },
    { id: "st-7", etudiantId: "et-10", cne: "K139001284", prenom: "Zakaria", nom: "Moutaouakil", filiere: "Kinésithérapie", niveau: "S4", structure: "Clinique Al Massira   Agadir", service: "Rééducation fonctionnelle", encadrantClinique: "M. Y. Ouhadi (Kinésithérapeute chef)", tuteurAcademique: "H. Bouzid", debut: "2026-07-01", fin: "2026-09-30", statut: "recherche", conventionSignee: false, noteSoutenance: null },
    { id: "st-8", etudiantId: "et-12", cne: "L138744120", prenom: "Ayoub", nom: "Naciri", filiere: "Infirmier en anesthésie-réanimation", niveau: "S6", structure: "CHU Ibn Rochd   Casablanca", service: "Réanimation polyvalente", encadrantClinique: "Pr. H. El Alaoui (Réanimateur)", tuteurAcademique: "R. Benjelloun", debut: "2026-03-01", fin: "2026-05-31", statut: "valide", conventionSignee: true, noteSoutenance: 17 },
    { id: "st-9", etudiantId: "et-4", cne: "M139874521", prenom: "Anas", nom: "Chafik", filiere: "Kinésithérapie", niveau: "S3", structure: "Clinique Ennakhil   Agadir", service: "Kinésithérapie respiratoire", encadrantClinique: "M. R. Belmekki (Kinésithérapeute)", tuteurAcademique: "H. Bouzid", debut: "2026-07-10", fin: "2026-09-10", statut: "recherche", conventionSignee: false, noteSoutenance: null },
  ];

  for (const s of stagesData) {
    await pool.query(
      `INSERT INTO stages (id, etudiant_id, cne, prenom, nom, filiere, niveau, structure, service, encadrant_clinique, tuteur_academique, debut, fin, statut, convention_signee, note_soutenance)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
       ON CONFLICT (id) DO UPDATE SET
         statut=EXCLUDED.statut, convention_signee=EXCLUDED.convention_signee, note_soutenance=EXCLUDED.note_soutenance`,
      [s.id, s.etudiantId, s.cne, s.prenom, s.nom, s.filiere, s.niveau,
       s.structure, s.service, s.encadrantClinique, s.tuteurAcademique,
       s.debut, s.fin, s.statut, s.conventionSignee,
       s.noteSoutenance !== null ? String(s.noteSoutenance) : null],
    );
  }
  console.log("  ✓ 9 stages created");

  console.log("\n✅ Seed complete!");
  console.log("Demo accounts:");
  console.log("  direction@istpm-agadir.ma / directeur123  (directeur)");
  console.log("  enseignant@istpm-agadir.ma / enseignant123 (enseignant)");
  console.log("  responsable@istpm-agadir.ma / responsable123 (responsable)");

  await pool.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
