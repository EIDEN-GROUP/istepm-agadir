# ISTEPM Agadir — Rapport de travaux (session de septembre 2026)

Document de référence des travaux réalisés sur le projet : structure du
système, processus suivis, corrections de données, logique métier touchée et
état final. Complète — sans le remplacer — le `README.md` (architecture) et
le `SESSION_LOG.md` (journal chronologique).

> **Portée** : ce document décrit ce qui a réellement été fait et vérifié.
> Là où une vérification n'a pas pu être faite (ou a été faite statiquement
> seulement), c'est écrit explicitement. Aucune affirmation de test runtime
> n'est faite pour du travail qui n'a pas été exécuté.

---

## 1. Le système en bref

| Couche | Technologie | Où |
|---|---|---|
| Frontend SPA | React + Vite + TanStack Router, Tailwind | `frontend/` |
| Landing publique | React + Vite (séparée) | `landing-page/` |
| API | Fastify + Drizzle ORM | `backend/src/` |
| Base | PostgreSQL 16 | conteneur `school-crm_postgres` |
| Cache / files | Redis, BullMQ worker | `school-crm_redis`, `backend-worker` |
| Stockage objet | MinIO (documents d'examen) | `school-crm_minio` |
| Observabilité | Prometheus, Grafana, Loki, Promtail, cAdvisor | stack swarm |
| Hébergement | Docker Swarm sur VPS Hostinger (1 cœur / 4 Go) | `76.13.58.6` |
| CI/CD | GitHub Actions → GHCR → `docker stack deploy` | `.github/workflows/ci-cd.yml` |

Le VPS héberge **deux stacks clients distincts** : `school-crm_*` (ISTEPM) et
`eiden-*` (BMS d'un autre client). `eiden-nginx` est partagé entre les deux —
ne jamais le gérer via un `docker compose up` d'un seul des deux projets.

### Modèle de données central

`etudiants` est le registre pivot. Points à connaître :

- `niveau` = **année d'étude** (`1ère année` / `2ème année` / `3ème année`).
- `annee` = **année scolaire** (`2025/2026`) — colonne distincte, souvent
  confondue avec la précédente : c'est la source de deux bugs corrigés ici.
- `groupe` = identifiant **bare** (`G1`, `A`…), jamais préfixé (`S5-G1`).
  Un groupe n'est unique que dans le couple (filière, niveau).
- `frais_annuels` = MAD **annuels**. Règle backend : `fraisAnnuels =
  fraisMensuels × 10` (10 mois, septembre → juin).
- `photo_url` = texte libre ; le composant `PersonAvatar` n'accepte que les
  schémas `https://`, `data:image/(png|jpeg|webp);base64,` et `blob:`.

### Rôles et permissions

5 rôles (`backend/src/routes/roles.ts`) : `directeur`, `responsable`,
`comptable`, `enseignant`, `etudiant`.

Mécanique critique (`backend/src/lib/permissions.ts`) : `rolePermissions()`
**ne fusionne pas** la fiche `roles` en base avec le repli `ROLE_FALLBACKS`.
Si une ligne existe en base pour ce rôle, **elle est utilisée seule**. Une
fiche incomplète prive donc silencieusement le rôle de tout le reste, sans
retomber sur le repli. Cache mémoire de 30 s.

---

## 2. Anomalies trouvées et corrigées

### 2.1 `etudiants.annee` contenait le niveau d'étude (production)

**Symptôme** : le filtre « Année scolaire » de la page Étudiants proposait un
mélange de vraies années (`2025/2026`) et de libellés de niveau
(`1ère année`…), et sélectionner une vraie année ne renvoyait aucun résultat.

**Cause racine** — pas un bug d'affichage : le modèle CSV d'import
(`frontend/src/components/import-etudiants-dialog.tsx`) montrait `3e annee`
dans la colonne `annee`, apprenant aux utilisateurs à y saisir le niveau ; et
`backend/src/routes/etudiants-import.ts` ne validait que « non vide ». Les
300 fiches réelles portaient donc toutes la même erreur systématique.

**Corrections** :
- Modèle CSV corrigé (`2025/2026` dans la colonne `annee`).
- Validation backend : `annee` doit désormais matcher `AAAA/AAAA`, avec un
  message explicite disant que ce n'est pas le niveau d'étude.
- Données : 299 puis 2 lignes tardives corrigées en base de production.

### 2.2 Année universitaire calculée sans la bascule de septembre

`anneeUniversitaire` était calculée en `année/année+1` à partir de la date
civile, dans **trois** implémentations dupliquées. Une séance ou un examen de
janvier–août se retrouvait donc étiqueté sur la mauvaise année scolaire.

Corrigé via un helper unique `academicYearOf()` (`mois ≥ septembre ?
AAAA/AAAA+1 : AAAA-1/AAAA`), plus 56 lignes `seances` réparées en base
(10 lignes de juillet étaient sur `2026/2027` au lieu de `2025/2026`).

### 2.3 Fiches `roles` obsolètes en production

Les fiches en base dataient d'avant le système de permissions actuel et,
puisque la fiche écrase le repli, **le staff était sous-permissionné sans
message d'erreur** :

| Rôle | Avant | Après (= `ROLE_FALLBACKS`) |
|---|---|---|
| directeur | 26 | 52 (catalogue complet) |
| responsable | 15 | 40 |
| enseignant | 5 | 8 |
| comptable | *(aucune fiche)* | 7 |
| etudiant | *(aucune fiche)* | 1 |

### 2.4 MinIO en crash-loop (fonctionnalité morte en production)

`school-crm_minio` redémarrait en boucle sur `No such image:
minio/minio:latest`. Cause : **MinIO ne publie plus sur Docker Hub**, les
images ont migré vers `quay.io`. Conséquence réelle : tout dépôt /
téléchargement / suppression de sujet d'examen renvoyait une 500
(`examens.ts` appelle `uploadDocument()` sans try/catch). Corrigé en
repointant les deux images vers `quay.io/minio/*`.

### 2.5 Divers

- `bulletins.ts` : gardes de périmètre `etudiant`/`enseignant` exécutées
  **après** l'écriture et ne filtrant que la réponse — code mort (le
  `preHandler` exclut déjà ces rôles). Supprimé.
- `examens` du jeu de données : colonne `groupe` jamais renseignée → aucune
  « classe » affichée. Renseignée, tracée sur de vrais étudiants.
- Séance Pharmacologie : `groupe` (`S5-G1`) incohérent avec son propre
  `semestre` (`S1`). Corrigé.
- `08_effectif_realiste.sql` : le générateur écrivait le libellé de niveau
  dans `annee`. Corrigé (`2025/2026`).

---

## 3. Migration du modèle S1–S6 → années d'étude

Mapping (`backend/src/lib/niveaux.ts`, miroir front dans `istpm-data.ts`) :

| Ancien | Nouveau |
|---|---|
| S1, S2 | `1ère année` |
| S3, S4 | `2ème année` |
| S5, S6 | `3ème année` |

Appliqué **en production** (sauvegardes `bk_*_20260923` avant écriture) :

| Table | Lignes converties |
|---|---|
| `etudiants` | 300 (`niveau` + `groupe` débarrassé du préfixe) |
| `bulletins` | 290 |
| `stages` | 218 |
| `examens` | 96 |
| `formateurs` | 57 (`groupes[]` : préfixe retiré + dédoublonné) |
| `seances` | 56 (`groupe` + `semestre`) |
| `levels` | 6 lignes S1–S6 → 3 années d'étude |
| `settings.semestres` | supprimée (aucun consommateur backend/front) |

**Vérification finale** : 0 valeur S1–S6 restante, 0 groupe composite,
0 format d'année court, 0 rôle `admin`/`superadmin`.

---

## 4. Attribution des 95 photos de profil

95 JPG (`~/Downloads/output`, `prenom-nom.jpg`) attribués à 95 étudiants
distincts de la base de production.

**Processus** :
1. Genre déduit du prénom du fichier via un dictionnaire de prénoms
   marocains → **43 masculins / 52 féminins**.
2. Même classification appliquée aux 300 étudiants ; exclusion des 9 fiches
   ayant **déjà** une photo (dont de vrais téléversements par les étudiants
   eux-mêmes — jamais écrasés).
3. Tirage aléatoire (graine fixe 42) dans le vivier du même genre :
   162 étudiants masculins et 129 féminins disponibles, donc aucune pénurie.
4. Assertions bloquantes : 95 photos uniques, 95 étudiants uniques.

**Stockage** : `data:image/jpeg;base64,…` en base, **pas** une URL MinIO —
MinIO n'est pas exposé publiquement pour cette app (aucune route nginx ne le
proxifie), une URL MinIO aurait donc affiché une image cassée. Le schéma
`data:` est lui nativement supporté par `PersonAvatar`. Poids : ~60 Ko par
image, 5,7 Mo au total.

**Résultat vérifié** : 104 étudiants avec photo (9 préexistantes + 95),
dont exactement 95 en `data:image/jpeg`. Sauvegarde : `bk_photourl_20260923`.

---

## 5. Interface — corrections

### Tableau de bord Responsable, onglet Analyse
- Hauteur des graphiques 220 → 340 px (11 salles / 8 formateurs illisibles).
- Palette monochrome teal → `BRAND_CHART_COLORS` (catégoriel).
- « Charge des formateurs » : sur 54 formateurs actifs mais seulement
  56 séances planifiées, la plupart étaient à 0 → mur de barres vides. Le
  graphique ne trace plus que les 12 premiers ayant une charge réelle,
  hauteur proportionnelle au nombre de barres, sous-titre indiquant combien
  sont exclus (« Top 12 · 42 sans séance »).

### « Heures modules restantes »
Filtre *enseignant* remplacé par un filtre *filière*, avec cascade : choisir
une filière restreint la liste des modules à ceux de cette filière, et le
filtre module se réinitialise s'il sort du périmètre. Colonne Enseignant
conservée. La filière d'une ligne vient du **module** (registre Paramètres),
pas du département du formateur — un enseignant peut intervenir hors de son
département.

Données réelles au moment du développement : 122 couples enseignant-module,
tous résolus dans le registre (0 orphelin).

| Filière | Lignes | Enseignants | Modules |
|---|---|---|---|
| Aide-Soignant(e) | 58 | 33 | 8 |
| Sage-femme | 28 | 17 | 5 |
| Infirmier polyvalent | 19 | 9 | 5 |
| Infirmier(e) Auxiliaire | 17 | 9 | 3 |

---

## 6. Documentation produite

- `ISTEPM-Agadir-Memo-Utilisation.pdf` (9 p.) et
  `ISTEPM-Agadir-Guide-Utilisation.pdf` (32 p.), régénérés en v1.1 :
  rôle Comptable intégré partout, règle de l'année universitaire explicitée,
  **logo ISTEPM réel** embarqué (le fichier SVG d'origine est en UTF-16 :
  converti en UTF-8 pour le rendu, contenu inchangé).
- Affirmation obsolète retirée des deux documents : « les données vivent dans
  le navigateur / les sujets d'examen restent locaux au poste » — faux,
  l'app est un client-serveur classique et les sujets sont sur MinIO.
- `backend/migrations/sql-istepm/credentials.md` (nouveau) et `README.md` du
  jeu de données réécrits.

Génération : HTML → PDF via Chromium headless (puppeteer temporaire, désinstallé après).

---

## 7. Méthode de travail

1. **Le code fait foi.** Sur chaque valeur disputée : lire le schéma Drizzle
   et la logique backend avant de trancher. Exemple concret : la consigne de
   retirer `formateurs.*`/`examens.*` du rôle `responsable` était erronée —
   `ROLE_FALLBACKS.responsable` les **contient** ; le jeu de données a été
   aligné sur le code, pas sur la consigne.
2. **Sauvegarde avant toute écriture en production** (`bk_*` + CSV hors
   conteneur), systématiquement.
3. **Preuve, pas affirmation** : chaque conversion suivie d'un `GROUP BY` de
   contrôle et de `grep` prouvant l'absence de valeurs résiduelles.
4. **Corriger la cause, pas le symptôme** : une correction de données est
   toujours doublée d'une correction du code qui l'a produite (sinon la
   dérive revient — c'est exactement ce qui s'est passé : 2 fiches créées
   avec l'ancien format entre la correction des données et le déploiement du
   correctif).

---

## 8. État connu au terme de la session

**En production, fonctionnel** : modèle années d'étude partout, permissions
alignées, MinIO opérationnel, 95 photos en place, correctifs UI déployés.

**Points ouverts, non traités** :

| Sujet | Détail |
|---|---|
| Pression mémoire VPS | 172 Mo libres sur 3,8 Go, 1 Go de swap utilisé. Deux stacks + monitoring sur 1 cœur. Aucun OOM constaté (`dmesg` propre), mais marge faible. |
| Disque | 81 % (9,3 Go libres) ; ~2,75 Go récupérables via `docker image prune`. |
| Couverture de tests | 1 seul fichier de test backend (sécurité / rate-limiting) pour 36 fichiers de routes ; 0 test frontend. Les bugs corrigés ici étaient tous invisibles à `tsc`. |
| Types front/back dupliqués | Pas de package partagé : ~25 interfaces réécrites à la main côté front. Une dérive de contrat ne serait détectée ni d'un côté ni de l'autre. |
| Fiches de test résiduelles | Quelques lignes `etudiants` non réelles (`test test`, `maro ak`…) créées pendant des essais, à nettoyer. |
| Travail mis de côté | Le durcissement du jeu de données `sql-istepm` est dans `git stash@{0}` : les mêmes fichiers ont été réécrits en amont entre-temps, l'appliquer écraserait ce travail. À arbitrer avant de le reprendre. |
