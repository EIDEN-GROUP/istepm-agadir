import bcrypt from "bcrypt";
import pg from "pg";
import "dotenv/config";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/school_crm",
});

async function seed() {
  console.log("Seeding ISTPM data...");

  /* ------------------------------------------------------------------ */
  /*  0. Default roles                                                   */
  /* ------------------------------------------------------------------ */
  const defaultRoles = [
    {
      name: "directeur",
      description: "Accès complet à l'ensemble du système",
      permissions: [
        "etudiants.read", "etudiants.write", "etudiants.delete",
        "formateurs.read", "formateurs.write", "formateurs.delete",
        "examens.read", "examens.write", "examens.delete",
        "bulletins.read", "bulletins.write", "bulletins.delete",
        "stages.read", "stages.write", "stages.delete",
        "paiements.read", "paiements.write", "paiements.delete",
        "settings.read", "settings.write",
        "users.read", "users.write", "users.delete",
        "roles.read", "roles.manage",
        "dashboard.read",
      ],
      isSystem: true,
    },
    {
      name: "responsable",
      description: "Gestion pédagogique et organisationnelle",
      permissions: [
        "etudiants.read", "etudiants.write",
        "formateurs.read", "formateurs.write",
        "examens.read", "examens.write",
        "bulletins.read", "bulletins.write",
        "stages.read", "stages.write",
        "paiements.read", "paiements.write",
        "settings.read", "settings.write",
        "dashboard.read",
      ],
      isSystem: true,
    },
    {
      name: "enseignant",
      description: "Accès limité à ses modules, séances, et saisie de notes",
      permissions: [
        "etudiants.read",
        "examens.read", "examens.write",
        "bulletins.read",
        "dashboard.read",
      ],
      isSystem: true,
    },
  ];

  for (const r of defaultRoles) {
    await pool.query(
      `INSERT INTO roles (name, description, permissions, is_system)
       VALUES ($1, $2, $3::jsonb, $4)
       ON CONFLICT (name) DO NOTHING`,
      [r.name, r.description, JSON.stringify(r.permissions), r.isSystem],
    );
  }
  console.log("  ✓ 3 default roles created");

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
    const existing = await pool.query(
      `SELECT id FROM users WHERE email = $1`,
      [u.email],
    );
    if (existing.rows.length === 0) {
      await pool.query(
        `INSERT INTO users (email, password_hash, name, role)
         VALUES ($1, $2, $3, $4)`,
        [u.email, hash, u.name, u.role],
      );
    }
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
     ON CONFLICT (key) DO NOTHING`,
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
    const { rows: userRows } = await pool.query(
      `SELECT id FROM users WHERE email = $1`,
      [f.email],
    );
    const userId = userRows.length > 0 ? userRows[0].id : null;
    await pool.query(
      `INSERT INTO formateurs (id, matricule, cin, prenom, nom, grade, departement, modules, groupes, statut, telephone, email, notes_saisies, user_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       ON CONFLICT (id) DO UPDATE SET
         prenom=EXCLUDED.prenom, nom=EXCLUDED.nom, grade=EXCLUDED.grade,
         departement=EXCLUDED.departement, statut=EXCLUDED.statut, notes_saisies=EXCLUDED.notes_saisies,
         user_id=EXCLUDED.user_id`,
      [f.id, f.matricule, f.cin, f.prenom, f.nom, f.grade, f.departement,
       JSON.stringify(f.modules), JSON.stringify(f.groupes), f.statut,
       f.telephone, f.email, f.notesSaisies, userId],
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

  /* ------------------------------------------------------------------ */
  /*  10. Events (calendar)                                              */
  /* ------------------------------------------------------------------ */
  const eventsData = [
    { id: "ev-1", title: "Réunion pédagogique de rentrée", description: "Préparation de l'année universitaire 2026/27 avec l'équipe pédagogique", date: "2026-09-05", startTime: "09:00", endTime: "12:00", allDay: false, type: "reunion", color: "#3b82f6", location: "Salle de conférence", status: "confirme" },
    { id: "ev-2", title: "Soutenance de stage", description: "Soutenance des étudiants S6 - session juillet", date: "2026-07-30", startTime: "08:30", endTime: "17:00", allDay: false, type: "soutenance", color: "#ef4444", location: "Amphi A", status: "confirme" },
    { id: "ev-3", title: "Conseil de discipline", description: "", date: "2026-08-12", startTime: "10:00", endTime: "11:30", allDay: false, type: "reunion", color: "#f59e0b", location: "Bureau du directeur", status: "planifie" },
    { id: "ev-4", title: "Journée portes ouvertes", description: "Présentation des filières aux futurs étudiants", date: "2026-07-19", startTime: "09:00", endTime: "16:00", allDay: false, type: "evenement", color: "#8b5cf6", location: "Hall principal", status: "confirme" },
    { id: "ev-5", title: "Remise des diplômes", description: "Cérémonie de remise des diplômes 2025/26", date: "2026-09-20", startTime: "14:00", endTime: "18:00", allDay: false, type: "evenement", color: "#10b981", location: "Amphi A", status: "planifie" },
    { id: "ev-6", title: "Vacances d'été", description: "Fermeture annuelle de l'établissement", date: "2026-08-01", startTime: "", endTime: "", allDay: true, type: "vacance", color: "#6b7280", location: "", status: "confirme" },
    { id: "ev-7", title: "Réunion parents-enseignants", description: "Bilan du 1er semestre", date: "2026-12-15", startTime: "10:00", endTime: "13:00", allDay: false, type: "reunion", color: "#3b82f6", location: "Hall principal", status: "planifie" },
    { id: "ev-8", title: "Examen de rattrapage", description: "Session de septembre", date: "2026-09-08", startTime: "09:00", endTime: "16:00", allDay: false, type: "examen", color: "#ef4444", location: "Toutes les salles", status: "confirme" },
    { id: "ev-9", title: "Conférence : Éthique médicale", description: "Conférence animée par Pr. Alami sur l'éthique dans les soins", date: "2026-07-25", startTime: "10:00", endTime: "12:00", allDay: false, type: "evenement", color: "#8b5cf6", location: "Amphi B", status: "confirme" },
    { id: "ev-10", title: "Atelier simulation", description: "Atelier de simulation en soins d'urgence", date: "2026-07-22", startTime: "14:00", endTime: "17:00", allDay: false, type: "formation", color: "#14b8a6", location: "Labo simulation", status: "confirme" },
  ];
  for (const ev of eventsData) {
    await pool.query(
      `INSERT INTO events (id, title, description, date, start_time, end_time, all_day, type, color, location, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT (id) DO NOTHING`,
      [ev.id, ev.title, ev.description, ev.date, ev.startTime, ev.endTime, ev.allDay, ev.type, ev.color, ev.location, ev.status],
    );
  }
  console.log("  ✓ 10 events created");

  /* ------------------------------------------------------------------ */
  /*  11. Levels (academic levels)                                       */
  /* ------------------------------------------------------------------ */
  const levelsData = [
    { id: "lv-1", name: "S1", cycle: "Licence", monthlyFee: 3400, maxStudents: 60 },
    { id: "lv-2", name: "S2", cycle: "Licence", monthlyFee: 3400, maxStudents: 55 },
    { id: "lv-3", name: "S3", cycle: "Licence", monthlyFee: 3200, maxStudents: 55 },
    { id: "lv-4", name: "S4", cycle: "Licence", monthlyFee: 3200, maxStudents: 50 },
    { id: "lv-5", name: "S5", cycle: "Licence", monthlyFee: 3500, maxStudents: 45 },
    { id: "lv-6", name: "S6", cycle: "Licence", monthlyFee: 3500, maxStudents: 40 },
  ];
  for (const lv of levelsData) {
    await pool.query(
      `INSERT INTO levels (id, name, cycle, monthly_fee, max_students)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (id) DO NOTHING`,
      [lv.id, lv.name, lv.cycle, lv.monthlyFee, lv.maxStudents],
    );
  }
  console.log("  ✓ 6 levels created");

  /* ------------------------------------------------------------------ */
  /*  12. Séances (class sessions)                                       */
  /* ------------------------------------------------------------------ */
  const seancesData = [
    { id: "sc-1", date: "2026-07-21", debut: "08:30", fin: "10:30", professeurId: "fo-1", module: "Soins infirmiers en médecine", filiere: "Infirmier polyvalent", salle: "Salle 101", groupe: "S5-G1", type: "cours_magistral", statut: "termine", anneeUniversitaire: "2025/26", semestre: "S5" },
    { id: "sc-2", date: "2026-07-21", debut: "10:45", fin: "12:45", professeurId: "fo-3", module: "Obstétrique", filiere: "Sage-femme", salle: "Salle 102", groupe: "S3-G2", type: "tp", statut: "termine", anneeUniversitaire: "2025/26", semestre: "S3" },
    { id: "sc-3", date: "2026-07-21", debut: "14:00", fin: "16:00", professeurId: "fo-4", module: "Rééducation fonctionnelle", filiere: "Kinésithérapie", salle: "Salle de rééducation", groupe: "S3-G1", type: "td", statut: "termine", anneeUniversitaire: "2025/26", semestre: "S3" },
    { id: "sc-4", date: "2026-07-22", debut: "08:30", fin: "10:30", professeurId: "fo-2", module: "Anesthésie clinique", filiere: "Infirmier en anesthésie-réanimation", salle: "Salle 103", groupe: "S5-G1", type: "cours_magistral", statut: "termine", anneeUniversitaire: "2025/26", semestre: "S5" },
    { id: "sc-5", date: "2026-07-22", debut: "10:45", fin: "12:45", professeurId: "fo-5", module: "Techniques de radiologie", filiere: "Radiologie / Imagerie médicale", salle: "Amphi B", groupe: "S6-G1", type: "cours_magistral", statut: "termine", anneeUniversitaire: "2025/26", semestre: "S6" },
    { id: "sc-6", date: "2026-07-22", debut: "14:00", fin: "17:00", professeurId: "fo-6", module: "Hématologie", filiere: "Laboratoire / Biologie médicale", salle: "Labo biologie", groupe: "S6-G2", type: "tp", statut: "en_cours", anneeUniversitaire: "2025/26", semestre: "S6" },
    { id: "sc-7", date: "2026-07-23", debut: "08:30", fin: "10:30", professeurId: "fo-7", module: "Prothèse fixe (TP)", filiere: "Prothèse dentaire", salle: "Atelier prothèse", groupe: "S1-A", type: "tp", statut: "planifie", anneeUniversitaire: "2025/26", semestre: "S1" },
    { id: "sc-8", date: "2026-07-23", debut: "10:45", fin: "12:45", professeurId: "fo-8", module: "Pharmacologie", filiere: "Infirmier polyvalent", salle: "Salle 104", groupe: "S5-G1", type: "cours_magistral", statut: "planifie", anneeUniversitaire: "2025/26", semestre: "S5" },
    { id: "sc-9", date: "2026-07-23", debut: "14:00", fin: "16:00", professeurId: "fo-1", module: "Hygiène hospitalière", filiere: "Infirmier polyvalent", salle: "Salle 101", groupe: "S1-B", type: "cours_magistral", statut: "planifie", anneeUniversitaire: "2025/26", semestre: "S1" },
    { id: "sc-10", date: "2026-07-24", debut: "08:30", fin: "12:00", professeurId: "fo-2", module: "Réanimation et soins intensifs", filiere: "Infirmier en anesthésie-réanimation", salle: "Labo simulation 2", groupe: "S5-G1", type: "tp", statut: "planifie", anneeUniversitaire: "2025/26", semestre: "S5" },
  ];
  for (const sc of seancesData) {
    await pool.query(
      `INSERT INTO seances (id, date, debut, fin, professeur_id, module, filiere, salle, groupe, type, statut, annee_universitaire, semestre)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       ON CONFLICT (id) DO NOTHING`,
      [sc.id, sc.date, sc.debut, sc.fin, sc.professeurId, sc.module, sc.filiere, sc.salle, sc.groupe, sc.type, sc.statut, sc.anneeUniversitaire, sc.semestre],
    );
  }
  console.log("  ✓ 10 seances created");

  /* ------------------------------------------------------------------ */
  /*  13. Attendance sessions & attendance records                        */
  /* ------------------------------------------------------------------ */
  const attendanceSessionData = [
    { id: "as-1", seanceId: "sc-1", date: "2026-07-21", statut: "termine" },
    { id: "as-2", seanceId: "sc-2", date: "2026-07-21", statut: "termine" },
    { id: "as-3", seanceId: "sc-3", date: "2026-07-21", statut: "termine" },
    { id: "as-4", seanceId: "sc-4", date: "2026-07-22", statut: "termine" },
    { id: "as-5", seanceId: "sc-5", date: "2026-07-22", statut: "termine" },
  ];
  for (const a of attendanceSessionData) {
    await pool.query(
      `INSERT INTO attendance_session (id, seance_id, date, statut)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (id) DO NOTHING`,
      [a.id, a.seanceId, a.date, a.statut],
    );
  }
  const attendanceRecords = [
    { seanceId: "sc-1", etudiantId: "et-1", present: true, justifie: false },
    { seanceId: "sc-1", etudiantId: "et-8", present: false, justifie: true, note: "Rendez-vous médical" },
    { seanceId: "sc-2", etudiantId: "et-3", present: true, justifie: false },
    { seanceId: "sc-2", etudiantId: "et-9", present: true, justifie: false },
    { seanceId: "sc-3", etudiantId: "et-4", present: false, justifie: false },
    { seanceId: "sc-3", etudiantId: "et-10", present: true, justifie: false },
    { seanceId: "sc-4", etudiantId: "et-2", present: true, justifie: false },
    { seanceId: "sc-4", etudiantId: "et-12", present: true, justifie: false },
  ];
  for (const ar of attendanceRecords) {
    await pool.query(
      `INSERT INTO attendance (seance_id, etudiant_id, present, justifie, note)
       VALUES ($1,$2,$3,$4,$5)`,
      [ar.seanceId, ar.etudiantId, ar.present, ar.justifie, ar.note ?? null],
    );
  }
  console.log("  ✓ 5 attendance sessions + 8 attendance records created");

  /* ------------------------------------------------------------------ */
  /*  14. Notes_examen (exam-level grades)                                */
  /* ------------------------------------------------------------------ */
  const notesExamenData = [
    { examenId: "ex-4", etudiantId: "et-4", theorique: 12.0, pratique: 11.5 },
    { examenId: "ex-4", etudiantId: "et-10", theorique: 14.5, pratique: 13.5 },
    { examenId: "ex-7", etudiantId: "et-7", theorique: 14.0, pratique: 12.5 },
    { examenId: "ex-7", etudiantId: "et-8", theorique: 11.0, pratique: 10.5 },
    { examenId: "ex-6", etudiantId: "et-6", theorique: 8.5, pratique: 9.0 },
    { examenId: "ex-6", etudiantId: "et-13", theorique: 9.0, pratique: 8.0 },
  ];
  for (const ne of notesExamenData) {
    await pool.query(
      `INSERT INTO notes_examen (examen_id, etudiant_id, theorique, pratique)
       VALUES ($1,$2,$3,$4)`,
      [ne.examenId, ne.etudiantId, String(ne.theorique), String(ne.pratique)],
    );
  }
  console.log("  ✓ 6 exam-grade records created");

  /* ------------------------------------------------------------------ */
  /*  15. School vacations & holidays                                    */
  /* ------------------------------------------------------------------ */
  const vacationsData = [
    { id: "va-1", startDate: "2026-08-01", endDate: "2026-08-31", label: "Vacances d'été" },
    { id: "va-2", startDate: "2026-12-22", endDate: "2027-01-05", label: "Vacances d'hiver" },
    { id: "va-3", startDate: "2027-04-10", endDate: "2027-04-25", label: "Vacances de printemps" },
  ];
  for (const v of vacationsData) {
    await pool.query(
      `INSERT INTO school_vacations (id, start_date, end_date, label)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (id) DO NOTHING`,
      [v.id, v.startDate, v.endDate, v.label],
    );
  }
  const holidaysData = [
    { id: "ho-1", date: "2026-07-30", label: "Fête du Trône" },
    { id: "ho-2", date: "2026-08-14", label: "Fête de la Jeunesse" },
    { id: "ho-3", date: "2026-08-20", label: "Révolution du Roi et du Peuple" },
    { id: "ho-4", date: "2026-11-06", label: "Anniversaire de la Marche Verte" },
    { id: "ho-5", date: "2026-11-18", label: "Fête de l'Indépendance" },
  ];
  for (const h of holidaysData) {
    await pool.query(
      `INSERT INTO holidays (id, date, label)
       VALUES ($1,$2,$3)
       ON CONFLICT (id) DO NOTHING`,
      [h.id, h.date, h.label],
    );
  }
  const calendarExceptionsData = [
    { id: "ce-1", date: "2026-07-30", label: "Fête du Trône (jour férié)" },
    { id: "ce-2", date: "2026-08-14", label: "Fête de la Jeunesse (jour férié)" },
    { id: "ce-3", date: "2026-08-20", label: "Révolution (jour férié)" },
  ];
  for (const ce of calendarExceptionsData) {
    await pool.query(
      `INSERT INTO calendar_exceptions (id, date, label)
       VALUES ($1,$2,$3)
       ON CONFLICT (id) DO NOTHING`,
      [ce.id, ce.date, ce.label],
    );
  }
  console.log("  ✓ 3 vacations + 5 holidays + 3 calendar exceptions created");

  /* ------------------------------------------------------------------ */
  /*  16. Teacher availability                                            */
  /* ------------------------------------------------------------------ */
  const availData = [
    { teacherId: "fo-1", dayOfWeek: 1, startTime: "08:30", endTime: "16:30" },
    { teacherId: "fo-1", dayOfWeek: 2, startTime: "08:30", endTime: "16:30" },
    { teacherId: "fo-1", dayOfWeek: 3, startTime: "08:30", endTime: "12:30" },
    { teacherId: "fo-1", dayOfWeek: 4, startTime: "08:30", endTime: "16:30" },
    { teacherId: "fo-2", dayOfWeek: 1, startTime: "10:00", endTime: "18:00" },
    { teacherId: "fo-2", dayOfWeek: 3, startTime: "08:30", endTime: "12:30" },
    { teacherId: "fo-2", dayOfWeek: 5, startTime: "08:30", endTime: "14:00" },
    { teacherId: "fo-3", dayOfWeek: 2, startTime: "08:30", endTime: "16:30" },
    { teacherId: "fo-3", dayOfWeek: 4, startTime: "08:30", endTime: "12:30" },
    { teacherId: "fo-4", dayOfWeek: 1, startTime: "14:00", endTime: "18:00" },
    { teacherId: "fo-4", dayOfWeek: 3, startTime: "14:00", endTime: "18:00" },
    { teacherId: "fo-5", dayOfWeek: 2, startTime: "08:30", endTime: "14:00" },
    { teacherId: "fo-5", dayOfWeek: 5, startTime: "08:30", endTime: "12:30" },
  ];
  for (const av of availData) {
    await pool.query(
      `INSERT INTO teacher_availability (teacher_id, day_of_week, start_time, end_time)
       VALUES ($1,$2,$3,$4)`,
      [av.teacherId, av.dayOfWeek, av.startTime, av.endTime],
    );
  }
  console.log("  ✓ 14 teacher-availability slots created");

  /* ------------------------------------------------------------------ */
  /*  17. Planifications                                                 */
  /* ------------------------------------------------------------------ */
  const planificationsData = [
    { id: "pl-1", date: "2026-09-05", time: "09:00", title: "Réunion de rentrée", detail: "Préparation année 2026/27", tone: "important" },
    { id: "pl-2", date: "2026-09-12", time: "10:00", title: "Calendrier des examens", detail: "Validation du calendrier S1", tone: "urgent" },
    { id: "pl-3", date: "2026-09-20", time: "14:00", title: "Remise des diplômes", detail: "Cérémonie officielle", tone: "normal" },
    { id: "pl-4", date: "2026-10-01", time: "08:30", title: "Début des cours S1", detail: "Rentrée académique", tone: "important" },
    { id: "pl-5", date: "2026-10-15", time: "11:00", title: "Commission pédagogique", detail: "Suivi des programmes", tone: "normal" },
  ];
  for (const pl of planificationsData) {
    await pool.query(
      `INSERT INTO planifications (id, date, time, title, detail, tone)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (id) DO NOTHING`,
      [pl.id, pl.date, pl.time, pl.title, pl.detail, pl.tone],
    );
  }
  console.log("  ✓ 5 planifications created");

  /* ------------------------------------------------------------------ */
  /*  18. Notifications                                                   */
  /* ------------------------------------------------------------------ */
  const notificationsData = [
    { id: "nt-1", type: "info", title: "Nouvel étudiant inscrit", message: "Fatima Zahra Lahlou a été inscrite en Prothèse dentaire S1", link: "/dashboard/etudiants/et-7" },
    { id: "nt-2", type: "warning", title: "Paiement en retard", message: "Youssef Ait Taleb a un retard de paiement de 13 000 DH", link: "/dashboard/etudiants/et-2" },
    { id: "nt-3", type: "success", title: "Stages validés", message: "Ayoub Naciri a validé son stage avec une note de 17/20", link: "/dashboard/stages/st-8" },
    { id: "nt-4", type: "info", title: "Examen programmé", message: "Examen de Soins infirmiers programmé le 28/07/2026 à 09:00", link: "/dashboard/examens/ex-1" },
    { id: "nt-5", type: "warning", title: "Doublon potentiel", message: "Un étudiant avec le CNE C139887654 est déjà inscrit", link: "/dashboard/etudiants" },
  ];
  for (const n of notificationsData) {
    await pool.query(
      `INSERT INTO notifications (id, type, title, message, link)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (id) DO NOTHING`,
      [n.id, n.type, n.title, n.message, n.link],
    );
  }
  console.log("  ✓ 5 notifications created");

  /* ------------------------------------------------------------------ */
  /*  19. Appointments                                                   */
  /* ------------------------------------------------------------------ */
  const appointmentsData = [
    { id: "ap-1", name: "Ahmed Benali", email: "ahmed.benali@email.ma", phone: "+212 6 11 22 33 44", subject: "Inscription Infirmier polyvalent", type: "inscription", status: "confirme", age: "19", message: "Souhaite s'inscrire pour la rentrée 2026/27", dateTable: "2026-08-15" },
    { id: "ap-2", name: "Nadia Oubella", email: "nadia.oubella@email.ma", phone: "+212 6 55 66 77 88", subject: "Réorientation Sage-femme", type: "information", status: "nouveau", age: "22", message: "Étudiante en 2e année souhaite des informations sur la filière Sage-femme", dateTable: "2026-08-20" },
    { id: "ap-3", name: "Dr. Karim Hassani", email: "k.hassani@chu-agadir.ma", phone: "+212 6 99 88 77 66", subject: "Convention de stage", type: "partenariat", status: "en_cours", age: "", message: "Propose une convention de stage pour 3 étudiants en anesthésie", dateTable: "2026-07-25" },
  ];
  for (const ap of appointmentsData) {
    await pool.query(
      `INSERT INTO appointments (id, name, email, phone, subject, type, status, age, message, date_table)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT (id) DO NOTHING`,
      [ap.id, ap.name, ap.email, ap.phone, ap.subject, ap.type, ap.status, ap.age, ap.message, ap.dateTable],
    );
  }
  console.log("  ✓ 3 appointments created");

  /* ------------------------------------------------------------------ */
  /*  20. Centers & center admins (multi-center support)                  */
  /* ------------------------------------------------------------------ */
  const centersData = [
    { id: "ct-1", name: "ISTPM Agadir", city: "Agadir", contactEmail: "contact@istpm-agadir.ma", contactPhone: "+212 5 28 22 11 00", plan: "premium", status: "active", monthlyPrice: 29900, studentsCount: 120, isPrimary: true, notes: "Siège principal" },
    { id: "ct-2", name: "ISTPM Inezgane", city: "Inezgane", contactEmail: "contact.inezgane@istpm-agadir.ma", contactPhone: "+212 5 28 33 22 11", plan: "standard", status: "active", monthlyPrice: 19900, studentsCount: 65, isPrimary: false, notes: "Antenne Inezgane" },
  ];
  for (const c of centersData) {
    await pool.query(
      `INSERT INTO centers (id, name, city, contact_email, contact_phone, plan, status, monthly_price, students_count, is_primary, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT (id) DO NOTHING`,
      [c.id, c.name, c.city, c.contactEmail, c.contactPhone, c.plan, c.status, c.monthlyPrice, c.studentsCount, c.isPrimary, c.notes],
    );
  }
  // center admins — link the directeur user to the primary center
  await pool.query(
    `INSERT INTO center_admins (center_id, profile_id)
     SELECT $1, id FROM users WHERE email = 'direction@istpm-agadir.ma'
     ON CONFLICT DO NOTHING`,
    ["ct-1"],
  );
  console.log("  ✓ 2 centers + 1 center admin created");

  /* ------------------------------------------------------------------ */
  /*  21. Employees (staff records)                                       */
  /* ------------------------------------------------------------------ */
  const employeesData = [
    { id: "em-1", fullName: "Dr. Youssef Benali", position: "Directeur", department: "Direction", email: "direction@istpm-agadir.ma", personalEmail: "y.benali@email.ma", phone: "+212 6 61 11 22 33", cin: "AB123456", birthDate: "1975-03-15", hireDate: "2018-09-01", address: "12 Rue Hassan II, Agadir", contractType: "cdi", salary: 25000, status: "actif" },
    { id: "em-2", fullName: "M. Rachid El Ouafi", position: "Responsable pédagogique", department: "Pédagogie", email: "responsable@istpm-agadir.ma", personalEmail: "r.ouafi@email.ma", phone: "+212 6 62 33 44 55", cin: "CD789012", birthDate: "1985-07-22", hireDate: "2019-10-01", address: "8 Rue Mohammed V, Agadir", contractType: "cdi", salary: 18000, status: "actif" },
    { id: "em-3", fullName: "Mme Salma Ait Taleb", position: "Enseignante", department: "Pédagogie", email: "enseignant@istpm-agadir.ma", personalEmail: "s.ait taleb@email.ma", phone: "+212 6 63 44 55 66", cin: "EF345678", birthDate: "1990-11-10", hireDate: "2020-02-15", address: "5 Rue Al Qods, Agadir", contractType: "cdi", salary: 14000, status: "actif" },
    { id: "em-4", fullName: "Mme Fatima Hassani", position: "Secrétaire générale", department: "Administration", email: "secretariat@istpm-agadir.ma", personalEmail: "f.hassani@email.ma", phone: "+212 6 64 55 66 77", cin: "GH901234", birthDate: "1988-09-05", hireDate: "2021-01-10", address: "3 Rue de la Liberté, Agadir", contractType: "cdi", salary: 12000, status: "actif" },
  ];
  for (const em of employeesData) {
    await pool.query(
      `INSERT INTO employees (id, full_name, position, department, email, personal_email, phone, cin, birth_date, hire_date, address, contract_type, salary, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       ON CONFLICT (id) DO NOTHING`,
      [em.id, em.fullName, em.position, em.department, em.email, em.personalEmail, em.phone, em.cin, em.birthDate, em.hireDate, em.address, em.contractType, String(em.salary), em.status],
    );
  }
  console.log("  ✓ 4 employees created");

  /* ------------------------------------------------------------------ */
  /*  22. CRM clients (famille / crèche module)                          */
  /* ------------------------------------------------------------------ */
  const clientsData = [
    { id: "cl-1", parentName: "M. Hassan El Fassi", childName: "Amine El Fassi", childAge: "4", email: "h.elfassi@email.ma", email2: "amine.ecole@email.ma", phone: "+212 6 11 22 33 44", phone2: "", cin: "AA123456", address: "15 Av. des FAR, Agadir", childNames: [{ name: "Amine", age: 4 }], subscribedFrais: [{ name: "Mensualité", montant: 2500 }], dob: "2022-03-10", level: "PS", crmStage: "actif", paymentStatus: "a_jour", monthlyFee: 2500, debt: 0, overdue: false, paymentDay: 5, notes: "Famille recommandée par Dr. Benali", whatsappOptin: true, transport: true, cantine: true, garderie: false, activites: true, fratrie: 0, remise: 0, subscribedServices: [{ name: "Transport", montant: 500 }, { name: "Cantine", montant: 400 }] },
    { id: "cl-2", parentName: "Mme Nadia Oubella", childName: "Sara Oubella", childAge: "5", email: "n.oubella@email.ma", phone: "+212 6 55 66 77 88", cin: "BB789012", address: "8 Rue Al Qods, Agadir", childNames: [{ name: "Sara", age: 5 }], subscribedFrais: [{ name: "Mensualité", montant: 2500 }], dob: "2021-06-15", level: "MS", crmStage: "actif", paymentStatus: "retard", monthlyFee: 2500, debt: 2500, overdue: true, paymentDay: 10, notes: "Retard de paiement de 1 mois", whatsappOptin: true, transport: false, cantine: true, garderie: false, activites: false, fratrie: 0, remise: 0, subscribedServices: [{ name: "Cantine", montant: 400 }] },
  ];
  for (const cl of clientsData) {
    await pool.query(
      `INSERT INTO clients (id, parent_name, child_name, child_age, email, email2, phone, phone2, cin, address, child_names, subscribed_frais, dob, level, crm_stage, payment_status, monthly_fee, debt, overdue, payment_day, notes, whatsapp_optin, transport, cantine, garderie, activites, fratrie, remise, subscribed_services)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12::jsonb,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29::jsonb)
       ON CONFLICT (id) DO NOTHING`,
      [cl.id, cl.parentName, cl.childName, cl.childAge, cl.email, cl.email2, cl.phone, cl.phone2, cl.cin, cl.address,
       JSON.stringify(cl.childNames), JSON.stringify(cl.subscribedFrais), cl.dob, cl.level, cl.crmStage,
       cl.paymentStatus, cl.monthlyFee, cl.debt, cl.overdue, cl.paymentDay, cl.notes,
       cl.whatsappOptin, cl.transport, cl.cantine, cl.garderie, cl.activites, cl.fratrie, cl.remise,
       JSON.stringify(cl.subscribedServices)],
    );
  }
  // Invoices + payments for CRM
  await pool.query(
    `INSERT INTO invoices (client_id, period, amount_due, amount_paid, due_date, status)
     VALUES ($1,'2026-07',2500,2500,'2026-07-05','payee')
     ON CONFLICT DO NOTHING`,
    ["cl-1"],
  );
  await pool.query(
    `INSERT INTO invoices (client_id, period, amount_due, amount_paid, due_date, status)
     VALUES ($1,'2026-07',2500,0,'2026-07-10','impayee'),
            ($1,'2026-08',2900,0,'2026-08-10','impayee')
     ON CONFLICT DO NOTHING`,
    ["cl-2"],
  );
  await pool.query(
    `INSERT INTO payments (client_id, amount, date, mode, period, receipt)
     VALUES ($1,2500,'2026-07-05','Virement','2026-07','REC-2026-07-001')
     ON CONFLICT DO NOTHING`,
    ["cl-1"],
  );
  console.log("  ✓ 2 CRM clients + 3 invoices + 1 payment created");

  /* ------------------------------------------------------------------ */
  /*  23. Support sessions & messages                                     */
  /* ------------------------------------------------------------------ */
  const supportSessionsData = [
    { id: "ss-1", status: "open" },
    { id: "ss-2", status: "resolved" },
  ];
  for (const ss of supportSessionsData) {
    await pool.query(
      `INSERT INTO support_sessions (id, status)
       VALUES ($1,$2)
       ON CONFLICT (id) DO NOTHING`,
      [ss.id, ss.status],
    );
  }
  await pool.query(
    `INSERT INTO support_messages (session_id, sender_id, sender_role, content)
     SELECT 'ss-1', id, 'directeur', 'Bonjour, je rencontre un problème avec l''export PDF des bulletins.'
     FROM users WHERE email = 'direction@istpm-agadir.ma'`,
  );
  await pool.query(
    `INSERT INTO support_messages (session_id, sender_role, content)
     VALUES ('ss-1', 'support', 'Bonjour Dr. Benali. Pouvez-vous préciser le problème ?')`,
  );
  console.log("  ✓ 2 support sessions + 2 messages created");

  /* ------------------------------------------------------------------ */
  /*  24. User preferences, demo requests, email logs, reminders, WhatsApp */
  /* ------------------------------------------------------------------ */
  // User preferences
  await pool.query(
    `INSERT INTO user_preferences (user_id, preferences)
     SELECT id, '{"theme":"system","notifications":true,"language":"fr"}'::jsonb
     FROM users
     ON CONFLICT DO NOTHING`,
  );
  // Demo requests
  await pool.query(
    `INSERT INTO demo_requests (center, email, phone, preferred_date, message)
     VALUES ('Clinique Al Massira','contact@almassira.ma','+212 5 28 44 55 66','2026-08-10','Souhaite une démonstration du logiciel pour notre clinique')`,
  );
  // Email log
  await pool.query(
    `INSERT INTO email_logs (recipient, subject, type, status, error_msg)
     VALUES ('direction@istpm-agadir.ma','Bienvenue sur ISTPM','welcome','envoye',NULL)`,
  );
  // Reminder
  await pool.query(
    `INSERT INTO reminders (title, message, remind_at, sent, method)
     VALUES ('Soutenance de stage','Rappel : soutenance des étudiants S6 demain à 08:30',NOW() + INTERVAL '1 day',false,'email')`,
  );
  // WhatsApp message
  await pool.query(
    `INSERT INTO whatsapp_messages (phone, direction, content, status)
     VALUES ('+212 6 11 22 33 44','sortant','Votre facture ISTPM du mois est disponible.','envoye')`,
  );
  console.log("  ✓ preferences, demo request, email log, reminder, WhatsApp message created");

  console.log("\n✅ Seed complete!");
  console.log("Demo accounts:");
  console.log("  direction@istpm-agadir.ma / directeur123  (directeur)");
  console.log("  enseignant@istpm-agadir.ma / enseignant123 (enseignant)");
  console.log("  responsable@istpm-agadir.ma / responsable123 (responsable)");
  console.log("");
  console.log("Created entities:");
  console.log("  3 roles · 3 users · 7 filieres · 14 etudiants · 38 notes");
  console.log("  30 paiements · 8 formateurs · 10 examens · 10 bulletins · 9 stages");
  console.log("  10 events · 6 levels · 10 seances · 5+8 attendance · 6 notes_examen");
  console.log("  3 vacations · 5 holidays · 3 calendar exceptions · 14 availabilities");
  console.log("  5 planifications · 5 notifications · 3 appointments");
  console.log("  2 centers · 4 employees · 2 CRM clients · 3 invoices · 1 payment");
  console.log("  2 support sessions · preferences · demo request · email · reminder · WhatsApp");

  await pool.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
