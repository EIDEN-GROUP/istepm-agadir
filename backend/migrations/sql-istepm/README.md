# Jeu de données ISTPM — SQL (remplace `backend/scripts/seed-istpm.ts`)

Contenu transcrit à l'identique du seed historique (`seed-istpm.ts`, supprimé :
source de vérité unique = ces fichiers) : **3 rôles, 3 comptes, 7 filières,
14 étudiants, 38 notes, 30 paiements, 8 formateurs, 10 examens, 10 bulletins,
9 stages, 10 séances, présences, 6 notes d'examen, vacances/fériés,
disponibilités, planifications, notifications, rendez-vous, centres, employés,
clients CRM + factures, support, divers**.

> Données de démonstration (personnes fictives). Ne pas charger en production
> réelle — usage : recette, VPS de préproduction, restauration d'un
> environnement de test vide.

## Ordre d'application (contraintes FK)

```
01_referentiel.sql   (settings, modules, levels — autonome)
02_comptes.sql       (roles, users, employees, centers, prefs)
03_etudiants.sql     (etudiants, notes, historique — après 02)
04_pedagogie.sql     (formateurs, examens, bulletins, stages, séances… — après 02+03)
05_calendrier.sql    (events, vacances, fériés, planifications — autonome)
06_crm_annexes.sql   (appointments, clients, support, divers — après 02)
```

## Exécution

Idempotent : ré-exécutable sans doublons (`ON CONFLICT` / `WHERE NOT EXISTS`).

```bash
# Local
psql "postgres://postgres:postgres@localhost:5432/school_crm" \
  -f 01_referentiel.sql -f 02_comptes.sql -f 03_etudiants.sql \
  -f 04_pedagogie.sql -f 05_calendrier.sql -f 06_crm_annexes.sql

# VPS (via le conteneur postgres du stack)
PG=$(docker ps --filter name=school-crm_postgres --format '{{.ID}}' | head -1)
for f in 01_referentiel 02_comptes 03_etudiants 04_pedagogie 05_calendrier 06_crm_annexes; do
  docker exec -i "$PG" psql -U postgres -d school_crm < "$f.sql"
done
```

Prérequis : migrations appliquées (`dist/db/migrate.js` via le deploy).

## Comptes de test (mots de passe faibles — changer après recette)

| Email | Mot de passe | Rôle |
|---|---|---|
| `direction@istpm-agadir.ma` | `directeur123` | directeur |
| `enseignant@istpm-agadir.ma` | `enseignant123` | enseignant |
| `responsable@istpm-agadir.ma` | `responsable123` | responsable |

Hashes bcrypt régénérés (coût 10) pour ces mots de passe — vérifiés compatibles
`bcrypt.compare` côté backend.

## Normalisations vs l'ancien seed TS

- `"Tranche 1   2025/26"` (triple espace, artefact) → `"Tranche 1 — 2025/26"`.
- `"CHR Hassan II   Agadir"` → `"CHR Hassan II — Agadir"` (idem).
- Dates/paiements « `" "` » (espace) → `CURRENT_DATE::text` / `''`.
- `settings` : clés `structures_accueil` (6 structures, capacités de démo),
  `services_stage` (8), `creneaux` (6 créneaux types), `semestres` (S1–S6),
  `salles` (10), `annees_universitaires`, `types_examen`, `institut_*`,
  `systeme_*`, `planning_*`, `bulletin_*`, `securite_*` (défauts de l'écran
  Paramètres). Ajuster les capacités en Paramètres › Structures.
- UUID stables et documentés par entité (préfixe logique, ex. `ET_*`) pour
  retrouver les lignes (liens des notifications, file de traitement…).
