-- 08_effectif_realiste.sql — effectif cohérent à grande échelle (idempotent).
-- 820 étudiants aux NOMS UNIQUES par construction (paire (g%96, (g//96+g%96)%60)
-- injective sur 1..820, preuve en commentaire du commit), 48 formateurs
-- (ratio ~1:15), 84 examens + notes, 45 séances + présences, demandes.
-- UUID stables (préfixe e81x) + ON CONFLICT / WHERE NOT EXISTS : ré-exécutable.
-- Usage recette uniquement.

-- ── 0. Bassins de noms (96 prénoms M/F + 60 noms) ───────────────────
CREATE TEMP TABLE IF NOT EXISTS gen_p96 (i int PRIMARY KEY, v text, g text);
CREATE TEMP TABLE IF NOT EXISTS gen_n60 (i int PRIMARY KEY, v text);
TRUNCATE gen_p96, gen_n60;

INSERT INTO gen_p96 (i, v, g) VALUES
(0,'Youssef','M'),(1,'Omar','M'),(2,'Anas','M'),(3,'Mehdi','M'),(4,'Bilal','M'),
(5,'Ayoub','M'),(6,'Zakaria','M'),(7,'Hicham','M'),(8,'Rachid','M'),(9,'Karim','M'),
(10,'Mustapha','M'),(11,'Hassan','M'),(12,'Ali','M'),(13,'Mohamed','M'),(14,'Amin','M'),
(15,'Imad','M'),(16,'Kamal','M'),(17,'Nabil','M'),(18,'Othmane','M'),(19,'Reda','M'),
(20,'Saad','M'),(21,'Taha','M'),(22,'Walid','M'),(23,'Yassine','M'),
(24,'Adil','M'),(25,'Amine','M'),(26,'Aziz','M'),(27,'Driss','M'),(28,'Faiçal','M'),
(29,'Ghali','M'),(30,'Hamza','M'),(31,'Ilyas','M'),(32,'Jawad','M'),(33,'Khalid','M'),
(34,'Lotfi','M'),(35,'Mahdi','M'),(36,'Riyad','M'),(37,'Nassim','M'),(38,'Oussama','M'),
(39,'Rayan','M'),(40,'Salim','M'),(41,'Sofiane','M'),(42,'Tarik','M'),(43,'Aymane','M'),
(44,'Marouane','M'),(45,'El Mehdi','M'),(46,'Abdelilah','M'),(47,'Anass','M'),
(48,'Salma','F'),(49,'Imane','F'),(50,'Khadija','F'),(51,'Hajar','F'),(52,'Sara','F'),
(53,'Nisrine','F'),(54,'Fatima','F'),(55,'Zahra','F'),(56,'Amina','F'),(57,'Loubna','F'),
(58,'Naima','F'),(59,'Aicha','F'),(60,'Bouchra','F'),(61,'Chaimae','F'),(62,'Doha','F'),
(63,'Ghita','F'),(64,'Hiba','F'),(65,'Ikram','F'),(66,'Jamila','F'),(67,'Karima','F'),
(68,'Lamia','F'),(69,'Meryem','F'),(70,'Nadia','F'),(71,'Oumaima','F'),(72,'Rania','F'),
(73,'Rim','F'),(74,'Safae','F'),(75,'Salwa','F'),(76,'Wiam','F'),(77,'Zineb','F'),
(78,'Asmae','F'),(79,'Btissam','F'),(80,'Chaymae','F'),(81,'Dounia','F'),(82,'Fadoua','F'),
(83,'Hafsa','F'),(84,'Ines','F'),(85,'Jihane','F'),(86,'Kawtar','F'),(87,'Lina','F'),
(88,'Majda','F'),(89,'Nada','F'),(90,'Ouiam','F'),(91,'Rajaa','F'),(92,'Sanae','F'),
(93,'Siham','F'),(94,'Wafae','F'),(95,'Yasmine','F');

INSERT INTO gen_n60 (i, v) VALUES
(0,'El Amrani'),(1,'Ait Taleb'),(2,'Benkirane'),(3,'Bennani'),(4,'Chafik'),
(5,'El Ghazi'),(6,'Fadili'),(7,'Idrissi'),(8,'Lahlou'),(9,'Moutaouakil'),
(10,'Naciri'),(11,'Ouhssaine'),(12,'Ramdani'),(13,'Sabri'),(14,'Ait Hammou'),
(15,'Benjelloun'),(16,'Bouzid'),(17,'El Idrissi'),(18,'El Khattabi'),(19,'Rochdi'),
(20,'Sekkat'),(21,'Tahiri'),(22,'El Fassi'),(23,'Benali'),(24,'El Ouafi'),
(25,'Hassani'),(26,'Oubella'),(27,'Alaoui'),(28,'Berrada'),(29,'Chakir'),
(30,'Douiri'),(31,'El Mansouri'),(32,'Fassi'),(33,'Guedira'),(34,'Hakam'),
(35,'Iraqi'),(36,'Jamai'),(37,'Kabbaj'),(38,'Sqalli'),(39,'Tazi'),
(40,'Bennis'),(41,'Cherkaoui'),(42,'Drissi'),(43,'Essafi'),(44,'Filali'),
(45,'Guessous'),(46,'Haddad'),(47,'Jennane'),(48,'Kettani'),(49,'Laraqui'),
(50,'Mernissi'),(51,'Ouazzani'),(52,'Radi'),(53,'Skalli'),(54,'Amzil'),
(55,'Chtouki'),(56,'Demnati'),(57,'El Harti'),(58,'Ziani'),(59,'Amrani');

-- ── 1. Base 820 étudiants (paires (prénom,nom) uniques par construction)
CREATE TEMP TABLE gen_base AS
WITH f AS (
  SELECT * FROM (VALUES
    (0,'Infirmier polyvalent','P',34000),
    (1,'Infirmier en anesthésie-réanimation','R',36000),
    (2,'Sage-femme','S',32000),
    (3,'Kinésithérapie','K',33000),
    (4,'Radiologie / Imagerie médicale','X',35000),
    (5,'Laboratoire / Biologie médicale','L',31000),
    (6,'Prothèse dentaire','D',30000)
  ) AS t(fi, filiere, cne_l, frais)
),
s AS (
  SELECT g AS seq,
    (g % 7) AS fi,
    (SELECT filiere FROM f WHERE f.fi = g % 7) AS filiere,
    (SELECT frais FROM f WHERE f.fi = g % 7) AS frais,
    (SELECT cne_l FROM f WHERE f.fi = g % 7) AS cne_l,
    ('S' || ((g % 6) + 1)) AS niveau,
    (g % 96) AS fi96,
    (((g / 96) + (g % 96)) % 60) AS li60
  FROM generate_series(1, 820) AS g
),
n AS (
  SELECT s.*,
    (SELECT v FROM gen_p96 WHERE i = s.fi96) AS prenom,
    (SELECT v FROM gen_n60 WHERE i = s.li60) AS nom
  FROM s
),
m AS (
  SELECT n.*,
    CASE niveau WHEN 'S1' THEN '1re année' WHEN 'S2' THEN '1re année'
      WHEN 'S3' THEN '2e année' WHEN 'S4' THEN '2e année' ELSE '3e année' END AS annee,
    CASE niveau
      WHEN 'S1' THEN CASE WHEN seq % 2 = 0 THEN 'S1-A' ELSE 'S1-B' END
      WHEN 'S2' THEN 'S2-A'
      WHEN 'S3' THEN CASE WHEN seq % 2 = 0 THEN 'S3-G1' ELSE 'S3-G2' END
      WHEN 'S4' THEN 'S4-A'
      WHEN 'S5' THEN 'S5-G1'
      ELSE CASE WHEN seq % 2 = 0 THEN 'S6-G1' ELSE 'S6-G2' END
    END AS groupe,
    CASE WHEN seq % 29 = 0 THEN 'en_attente' WHEN seq % 53 = 0 THEN 'abandon' ELSE 'inscrit' END AS statut,
    ('e8100000-0000-4000-8000-' || lpad(to_hex(seq), 12, '0'))::uuid AS id,
    (cne_l || lpad(((seq * 7919) % 900000000)::text, 9, '0')) AS cne,
    ('ISTPM-24-' || lpad(seq::text, 4, '0')) AS matricule
  FROM n
),
e AS (
  SELECT m.*,
    lower(left(prenom, 1) || '.' || replace(nom, ' ', '')) AS mailbase,
    row_number() OVER (PARTITION BY lower(left(prenom, 1) || '.' || replace(nom, ' ', '')) ORDER BY seq) AS mrn
  FROM m
)
SELECT id, seq, cne, matricule, prenom, nom, filiere, niveau, annee, groupe, statut,
  frais,
  (mailbase || CASE WHEN mrn > 1 THEN mrn::text ELSE '' END || '@istpm.ma') AS email,
  ('+212 6 ' || substring(lpad(((seq * 104729) % 100000000)::text, 8, '0'), 1, 2) || ' '
    || substring(lpad(((seq * 104729) % 100000000)::text, 8, '0'), 3, 2) || ' '
    || substring(lpad(((seq * 104729) % 100000000)::text, 8, '0'), 5, 2) || ' '
    || substring(lpad(((seq * 104729) % 100000000)::text, 8, '0'), 7, 2)) AS telephone,
  ((2000 + (seq % 7))::text || '-' || lpad((((seq * 7) % 12) + 1)::text, 2, '0')
    || '-' || lpad((((seq * 13) % 28) + 1)::text, 2, '0')) AS naissance,
  (ARRAY['Agadir','Inezgane','Tiznit','Taroudant','Guelmim','Essaouira','Marrakech','Casablanca','Dakhla','Ait Melloul'])[(seq % 10) + 1] AS ville
FROM e;

INSERT INTO "etudiants"
  ("id","cne","matricule","prenom","nom","filiere","niveau","annee","groupe",
   "statut","paiement","moyenne","telephone","email","date_naissance","ville",
   "frais_annuels","reste_a_payer")
SELECT id, cne, matricule, prenom, nom, filiere, niveau, annee, groupe,
  statut, 'en_attente', 0, telephone, email, naissance, ville,
  frais, frais
FROM gen_base
ON CONFLICT ("id") DO NOTHING;

-- ── 2. Notes (modules de la filière) ───────────────────────────────
WITH mods AS (
  SELECT nom, filiere, row_number() OVER (PARTITION BY filiere ORDER BY nom) AS mrn
  FROM modules
)
INSERT INTO "notes_etudiant" ("id","etudiant_id","module","note","coef","credits","examen")
SELECT ('e8110000-0000-4000-8000-' || lpad(to_hex(b.seq * 10 + mo.mrn), 12, '0'))::uuid,
  b.id, mo.nom,
  ROUND((8 + (((b.seq * 37) + mo.mrn * 53) % 96) / 10.0)::numeric, 2),
  (1 + ((b.seq + mo.mrn) % 3)), (1 + ((b.seq + mo.mrn) % 3)) * 2, ''
FROM gen_base b
JOIN mods mo ON mo.filiere = b.filiere AND mo.mrn <= 3
WHERE NOT EXISTS (
  SELECT 1 FROM "notes_etudiant" n
  WHERE n."etudiant_id" = b.id AND n."module" = mo.nom
);

-- ── 3. Paiements (T1+T2 payées, T3 selon profil) ───────────────────
WITH s AS (SELECT g.*, row_number() OVER (ORDER BY g.cne) AS sseq FROM gen_base g)
INSERT INTO "historique_paiements" ("id","etudiant_id","date","montant","mode","mois","periode","recu","statut")
SELECT ('e8120000-0000-4000-8000-' || lpad(to_hex(t.seq * 10 + t.tr), 12, '0'))::uuid,
  id, d, mnt, md, ms, pr, rc, st
FROM (
  SELECT b.id,
    s.sseq AS seq, v.t AS tr,
    CASE v.t WHEN 1 THEN '2025-10-05' WHEN 2 THEN '2026-01-15' ELSE CURRENT_DATE::text END AS d,
    CASE v.t WHEN 1 THEN ROUND((b.frais * 0.4)) WHEN 2 THEN ROUND((b.frais * 0.35)) ELSE ROUND((b.frais * 0.25)) END AS mnt,
    (ARRAY['Virement','Espèces','Chèque','Carte'])[(s.sseq + v.t) % 4 + 1] AS md,
    CASE v.t WHEN 1 THEN '2025-10' WHEN 2 THEN '2026-01' ELSE to_char(CURRENT_DATE, 'YYYY-MM') END AS ms,
    CASE v.t WHEN 1 THEN 'Tranche 1 — 2025/26' WHEN 2 THEN 'Tranche 2 — 2025/26' ELSE 'Tranche 3 — 2025/26' END AS pr,
    CASE WHEN v.t < 3 OR (s.sseq % 4) = 0 THEN 'ISTPM-R-25' || lpad(((s.sseq * 10) + v.t)::text, 6, '0') ELSE '' END AS rc,
    CASE WHEN v.t < 3 THEN 'paye'
      ELSE (ARRAY['paye','en_attente','retard','impaye'])[(s.sseq % 4) + 1] END AS st
  FROM gen_base b JOIN s ON s.id = b.id
  CROSS JOIN (VALUES (1),(2),(3)) AS v(t)
) t
WHERE NOT EXISTS (
  SELECT 1 FROM "historique_paiements" h
  WHERE h."etudiant_id" = t.id AND h."periode" = t.pr
);

-- ── 4. Cohérence fiches ────────────────────────────────────────────
UPDATE "etudiants" e SET "moyenne" = sub.m
FROM (SELECT etudiant_id, ROUND(AVG(note), 2) AS m FROM "notes_etudiant"
      WHERE etudiant_id IN (SELECT id FROM gen_base) GROUP BY 1) sub
WHERE e.id = sub.etudiant_id;

UPDATE "etudiants" e SET "reste_a_payer" = GREATEST(0, e."frais_annuels" - COALESCE(sub.p, 0))
FROM (SELECT etudiant_id, SUM(montant) AS p FROM "historique_paiements"
      WHERE etudiant_id IN (SELECT id FROM gen_base) AND statut = 'paye' GROUP BY 1) sub
WHERE e.id = sub.etudiant_id;

UPDATE "etudiants" SET "paiement" =
  CASE WHEN "reste_a_payer" <= 0 THEN 'paye'
       WHEN "reste_a_payer" >= "frais_annuels" THEN 'en_attente'
       ELSE (ARRAY['retard','impaye'])[(ascii(substring(cne, 2, 1)) % 2) + 1] END
WHERE id IN (SELECT id FROM gen_base);

-- ── 5. Bulletins ───────────────────────────────────────────────────
INSERT INTO "bulletins"
  ("id","etudiant_id","cne","prenom","nom","filiere","niveau","session",
   "moyenne","mention","decision","evaluation_clinique","statut")
SELECT ('e8140000-0000-4000-8000-' || lpad(to_hex(e.seq), 12, '0'))::uuid,
  e.id, e.cne, e.prenom, e.nom, e.filiere, e.niveau, 'normale', e.moyenne,
  CASE WHEN e.moyenne >= 16 THEN 'Très Bien' WHEN e.moyenne >= 14 THEN 'Bien'
    WHEN e.moyenne >= 12 THEN 'Assez Bien' WHEN e.moyenne >= 10 THEN 'Passable'
    ELSE 'Ajourné' END,
  CASE WHEN e.moyenne >= 10 THEN 'Admis' WHEN e.moyenne >= 8 THEN 'Rattrapage' ELSE 'Ajourné' END,
  LEAST(20, GREATEST(0, e.moyenne + ((e.seq % 5) - 2))), 'publie'
FROM (SELECT et.*, row_number() OVER (ORDER BY cne) AS seq FROM "etudiants" et
      WHERE et.id IN (SELECT id FROM gen_base)) e
WHERE NOT EXISTS (
  SELECT 1 FROM "bulletins" b
  WHERE b."etudiant_id" = e.id AND b."session" = 'normale'
);

-- ── 6. Stages S5/S6 ────────────────────────────────────────────────
INSERT INTO "stages"
  ("id","etudiant_id","cne","prenom","nom","filiere","niveau","structure",
   "service","debut","fin","statut","tuteur_academique","encadrant_clinique","convention_signee")
SELECT ('e8130000-0000-4000-8000-' || lpad(to_hex(e.seq), 12, '0'))::uuid,
  e.id, e.cne, e.prenom, e.nom, e.filiere, e.niveau,
  (ARRAY['CHR Hassan II — Agadir','Hôpital Al Hassani','Clinique Les Fleurs',
    'CHU Souss Massa','Centre de Santé Al Amal','Polyclinique CNSS'])[(e.seq % 6) + 1],
  (ARRAY['Urgences','Médecine interne','Pédiatrie','Bloc opératoire',
    'Laboratoire','Radiologie','Maternité','Réanimation'])[(e.seq % 8) + 1],
  '2026-03-02', '2026-05-29',
  (ARRAY['recherche','en_cours','convention_signee','soutenance','valide'])[(e.seq % 5) + 1],
  'Dr. Youssef Benali', 'Mme Salma Ait Taleb',
  ((e.seq % 5) + 1) >= 3
FROM (SELECT et.*, row_number() OVER (ORDER BY cne) AS seq FROM "etudiants" et
      WHERE et.id IN (SELECT id FROM gen_base) AND et.niveau IN ('S5','S6')) e
WHERE NOT EXISTS (SELECT 1 FROM "stages" s WHERE s."etudiant_id" = e.id);

-- ── 7. Formateurs : 48 nouveaux (ratio ~1:15 avec 834 étudiants) ───
-- Paires ((t*2)%96, (t*7)%60) injectives sur t=1..48 (7 premier avec 60).
WITH t AS (
  SELECT tt AS t,
    (SELECT v FROM gen_p96 WHERE i = (tt * 2) % 96) AS prenom,
    (SELECT v FROM gen_n60 WHERE i = (tt * 7) % 60) AS nom,
    (SELECT filiere FROM (VALUES
      (0,'Infirmier polyvalent'),(1,'Infirmier en anesthésie-réanimation'),
      (2,'Sage-femme'),(3,'Kinésithérapie'),(4,'Radiologie / Imagerie médicale'),
      (5,'Laboratoire / Biologie médicale'),(6,'Prothèse dentaire')) AS f(fi, filiere)
      WHERE fi = tt % 7) AS dept
  FROM generate_series(1, 48) AS tt
),
g9 AS (
  SELECT * FROM (VALUES
    (0,'S1-A'),(1,'S1-B'),(2,'S2-A'),(3,'S3-G1'),(4,'S3-G2'),
    (5,'S4-A'),(6,'S5-G1'),(7,'S6-G1'),(8,'S6-G2')) AS v(gi, groupe)
),
te AS (
  SELECT t.*,
    lower(left(prenom, 1) || '.' || replace(nom, ' ', '')) AS mailbase,
    row_number() OVER (PARTITION BY lower(left(prenom, 1) || '.' || replace(nom, ' ', '')) ORDER BY t) AS mrn,
    ('e8160000-0000-4000-8000-' || lpad(to_hex(t), 12, '0'))::uuid AS id
  FROM t
)
INSERT INTO "formateurs"
  ("id","matricule","cin","prenom","nom","grade","departement","modules",
   "groupes","statut","telephone","email","notes_saisies","archived")
SELECT te.id,
  ('ENS-1' || lpad(te.t::text, 2, '0')),
  (chr(65 + (te.t % 26)) || chr(65 + ((te.t * 3) % 26)) || lpad(((te.t * 137) % 1000000)::text, 6, '0')),
  te.prenom, te.nom,
  (ARRAY['PES','formateur_clinique','vacataire'])[(te.t % 3) + 1],
  te.dept,
  ARRAY(SELECT mo.nom FROM (SELECT mo2.nom, row_number() OVER (ORDER BY mo2.nom) AS mrn
    FROM modules mo2 WHERE mo2.filiere = te.dept) mo WHERE mo.mrn <= 2),
  CASE WHEN te.t % 2 = 0
    THEN ARRAY[(SELECT groupe FROM g9 WHERE gi = te.t % 9)]
    ELSE ARRAY[(SELECT groupe FROM g9 WHERE gi = te.t % 9),
               (SELECT groupe FROM g9 WHERE gi = (te.t + 4) % 9)] END,
  CASE WHEN te.t % 17 = 0 THEN 'en_conge' ELSE 'permanent' END,
  ('+212 6 ' || substring(lpad(((te.t * 6113) % 100000000)::text, 8, '0'), 1, 2) || ' '
    || substring(lpad(((te.t * 6113) % 100000000)::text, 8, '0'), 3, 2) || ' '
    || substring(lpad(((te.t * 6113) % 100000000)::text, 8, '0'), 5, 2) || ' '
    || substring(lpad(((te.t * 6113) % 100000000)::text, 8, '0'), 7, 2)),
  (te.mailbase || CASE WHEN te.mrn > 1 THEN te.mrn::text ELSE '' END || '@istpm.ma'),
  (te.t % 7), false
FROM te
ON CONFLICT ("id") DO NOTHING;

-- ── 8. Examens : 2 par (filière × niveau) = 84 ─────────────────────
WITH grid AS (
  SELECT f.filiere, n.niveau, k, ((row_number() OVER (ORDER BY f.filiere, n.niveau, k)) ) AS r
  FROM (VALUES ('Infirmier polyvalent'),('Infirmier en anesthésie-réanimation'),
    ('Sage-femme'),('Kinésithérapie'),('Radiologie / Imagerie médicale'),
    ('Laboratoire / Biologie médicale'),('Prothèse dentaire')) AS f(filiere)
  CROSS JOIN (VALUES ('S1'),('S2'),('S3'),('S4'),('S5'),('S6')) AS n(niveau)
  CROSS JOIN (VALUES (1),(2)) AS k(k)
),
gx AS (
  SELECT g.*,
    (SELECT mo.nom FROM (SELECT mo2.nom, row_number() OVER (ORDER BY mo2.nom) AS mrn,
        count(*) OVER () AS cnt
      FROM modules mo2 WHERE mo2.filiere = g.filiere) mo
      WHERE mo.mrn = ((g.r - 1) % mo.cnt) + 1) AS module,
    CASE g.niveau WHEN 'S1' THEN 'S1-A' WHEN 'S2' THEN 'S2-A'
      WHEN 'S3' THEN 'S3-G1' WHEN 'S4' THEN 'S4-A'
      WHEN 'S5' THEN 'S5-G1' ELSE 'S6-G1' END AS groupe
  FROM grid g
)
INSERT INTO "examens"
  ("id","module","filiere","niveau","type","date","heure","salle",
   "surveillants","statut","etudiants_convoques","composante","groupe",
   "duree","description","created_by")
SELECT ('e8170000-0000-4000-8000-' || lpad(to_hex(gx.r), 12, '0'))::uuid,
  gx.module, gx.filiere, gx.niveau,
  (ARRAY['examen_theorique','evaluation_pratique','controle_continu','rattrapage'])[(gx.r % 4) + 1],
  CASE WHEN gx.k = 1 THEN ('2026-05-' || lpad((((gx.r * 3) % 27) + 1)::text, 2, '0'))
    ELSE ('2026-10-' || lpad((((gx.r * 5) % 27) + 1)::text, 2, '0')) END,
  (ARRAY['08:30','10:45','14:00'])[(gx.r % 3) + 1],
  (ARRAY['Amphi A','Amphi B','Salle 5','Salle 9','Salle 12','Labo biologie'])[(gx.r % 6) + 1],
  '{}',
  CASE WHEN gx.k = 1 THEN 'notes_saisies' WHEN gx.r = 2 THEN 'en_cours' ELSE 'planifie' END,
  (SELECT count(*) FROM etudiants e
    WHERE e.filiere = gx.filiere AND e.niveau = gx.niveau),
  ('Semestre ' || substring(gx.niveau, 2, 1)), gx.groupe,
  (ARRAY[90, 120])[(gx.r % 2) + 1], '', 'system'
FROM gx
ON CONFLICT ("id") DO NOTHING;

-- ── 9. Notes d'examen (examens passés × étudiants convoqués) ───────
WITH past AS (
  SELECT id, type, filiere, niveau,
    row_number() OVER (ORDER BY filiere, niveau, module) AS prn
  FROM examens WHERE statut = 'notes_saisies' AND id::text LIKE 'e817%'
),
stu AS (
  SELECT e.id, e.filiere, e.niveau,
    row_number() OVER (PARTITION BY e.filiere, e.niveau ORDER BY e.cne) AS srn
  FROM etudiants e
  WHERE e.filiere IN (SELECT DISTINCT filiere FROM past)
    AND e.niveau IN (SELECT DISTINCT niveau FROM past)
),
pairs AS (
  SELECT p.id AS exid, p.type, s.id AS etid,
    row_number() OVER (ORDER BY p.id, s.id) AS rn
  FROM past p JOIN stu s ON s.filiere = p.filiere AND s.niveau = p.niveau
)
INSERT INTO "notes_examen" ("id","examen_id","etudiant_id","theorique","pratique")
SELECT ('e8180000-0000-4000-8000-' || lpad(to_hex(p.rn), 12, '0'))::uuid,
  p.exid, p.etid,
  ROUND((8 + ((p.rn * 29) % 96) / 10.0)::numeric, 2),
  CASE WHEN p.type = 'evaluation_pratique'
    THEN ROUND((8 + ((p.rn * 41) % 96) / 10.0)::numeric, 2) END
FROM pairs p
WHERE NOT EXISTS (
  SELECT 1 FROM "notes_examen" x
  WHERE x."examen_id" = p.exid AND x."etudiant_id" = p.etid
);

-- ── 10. Séances : 5 par groupe (9 groupes) = 45 ────────────────────
WITH g9 AS (
  SELECT * FROM (VALUES
    (0,'S1-A'),(1,'S1-B'),(2,'S2-A'),(3,'S3-G1'),(4,'S3-G2'),
    (5,'S4-A'),(6,'S5-G1'),(7,'S6-G1'),(8,'S6-G2')) AS v(gi, groupe)
),
fl AS (
  SELECT * FROM (VALUES
    (0,'Infirmier polyvalent'),(1,'Infirmier en anesthésie-réanimation'),
    (2,'Sage-femme'),(3,'Kinésithérapie'),(4,'Radiologie / Imagerie médicale'),
    (5,'Laboratoire / Biologie médicale'),(6,'Prothèse dentaire')) AS v(fi, filiere)
),
dt AS (
  SELECT id, departement,
    row_number() OVER (PARTITION BY departement ORDER BY matricule) AS trn,
    count(*) OVER (PARTITION BY departement) AS tn
  FROM formateurs
),
sx AS (
  SELECT g.groupe, g.gi, k.k, f.filiere,
    (g.gi * 5 + k) AS srn,
    (SELECT mo.nom FROM (SELECT mo2.nom, row_number() OVER (ORDER BY mo2.nom) AS mrn,
        count(*) OVER () AS cnt
      FROM modules mo2 WHERE mo2.filiere = f.filiere) mo
      WHERE mo.mrn = (((g.gi * 5 + k) % mo.cnt) + 1)) AS module,
    (SELECT dt.id::text FROM dt
      WHERE dt.departement = f.filiere
      ORDER BY ((dt.trn + g.gi + k) % dt.tn) LIMIT 1) AS prof
  FROM g9 g CROSS JOIN (VALUES (0),(1),(2),(3),(4)) AS k(k)
  CROSS JOIN LATERAL (SELECT fl.filiere FROM fl WHERE fl.fi = (g.gi + k) % 7) AS f
)
INSERT INTO "seances"
  ("id","date","debut","fin","professeur_id","module","salle","groupe",
   "type","statut","filiere","annee_universitaire","semestre","notes")
SELECT ('e8190000-0000-4000-8000-' || lpad(to_hex(sx.srn), 12, '0'))::uuid,
  ('2026-09-14'::date + ((sx.srn * 3) % 45)),
  (ARRAY['08:30','10:45','14:00','16:15'])[(sx.srn % 4) + 1],
  (ARRAY['10:30','12:45','16:00','18:15'])[(sx.srn % 4) + 1],
  sx.prof, sx.module,
  (ARRAY['Salle 101','Salle 104','Salle 12','Labo biologie','Labo simulation 2',
    'Atelier prothèse','Salle de rééducation','Amphi A'])[(sx.srn % 8) + 1],
  sx.groupe,
  (ARRAY['cours_magistral','td','tp'])[(sx.srn % 3) + 1],
  CASE WHEN sx.srn = 0 THEN 'en_cours' ELSE 'planifie' END,
  sx.filiere, '2025/26',
  left(sx.groupe, 2), ''
FROM sx
ON CONFLICT ("id") DO NOTHING;

-- ── 11. Présences des nouvelles séances (élèves du même groupe) ───
WITH sn AS (
  SELECT id, groupe, row_number() OVER (ORDER BY date, debut, groupe) AS rn
  FROM seances WHERE id::text LIKE 'e819%'
),
pairs AS (
  SELECT sn.id AS seid, e.id AS etid,
    row_number() OVER (ORDER BY sn.id, e.id) AS rn
  FROM sn JOIN etudiants e ON e.groupe = sn.groupe
)
INSERT INTO "attendance" ("id","seance_id","etudiant_id","present","justifie","note")
SELECT ('e81a0000-0000-4000-8000-' || lpad(to_hex(p.rn), 12, '0'))::uuid,
  p.seid, p.etid::text,
  ((p.rn * 7) % 10) < 8,
  ((p.rn * 7) % 10) = 8,
  CASE WHEN ((p.rn * 7) % 10) = 8 THEN 'Absence justifiée' ELSE '' END
FROM pairs p
ON CONFLICT ("id") DO NOTHING;

-- ── 12. Demandes étudiants (échantillon vivant, 60) ────────────────
WITH sb AS (
  SELECT id, cne, row_number() OVER (ORDER BY cne) AS seq FROM gen_base
)
INSERT INTO "student_requests" ("id","etudiant_id","type","titre","description","statut","reponse")
SELECT ('e81b0000-0000-4000-8000-' || lpad(to_hex(sb.seq), 12, '0'))::uuid,
  sb.id, 'predefini',
  (ARRAY['Attestation de scolarité','Relevé de notes','Convention de stage',
    'Attestation de stage','Duplicata de reçu','Changement de groupe',
    'Justificatif d''absence'])[(sb.seq % 7) + 1],
  'Demande générée pour recette.',
  (ARRAY['en_attente','en_cours','traite'])[(sb.seq % 3) + 1],
  CASE WHEN (sb.seq % 3) = 2 THEN 'Votre demande a été traitée.' ELSE '' END
FROM sb WHERE sb.seq % 13 = 0
ON CONFLICT ("id") DO NOTHING;

-- ── 13. Déduplication e-mails (suffixe matricule si collision) ─────
WITH d AS (
  SELECT email AS base FROM etudiants WHERE email<>'' GROUP BY 1 HAVING count(*)>1
)
UPDATE etudiants e
SET email = regexp_replace(e.email, '[0-9]*@istpm\.ma$', '')
  || substring(e.matricule from '[0-9]+$') || '@istpm.ma'
FROM d WHERE d.base = e.email AND e.id::text LIKE 'e81%';

DROP TABLE gen_base;
DROP TABLE gen_p96; DROP TABLE gen_n60;
