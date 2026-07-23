# ISTPM — Formules de calcul, Architecture & Workflow

## 1. Architecture générale

```
frontend/                          backend/
├── src/                           ├── src/
│   ├── lib/                       │   ├── db/
│   │   ├── istpm-store.tsx        │   │   ├── schema/    (36 tables)
│   │   ├── istpm-api.ts           │   │   ├── index.ts
│   │   ├── istpm-data.ts          │   │   └── migrate.ts
│   │   ├── auth.ts                │   ├── routes/       (21 route files)
│   │   └── api.ts                 │   ├── middleware/
│   ├── routes/                    │   │   ├── auth.ts         (authenticate, requireRole)
│   │   ├── dashboard.index.tsx    │   │   └── permissions.ts  (requirePermission)
│   │   ├── dashboard.settings.tsx │   ├── services/
│   │   ├── dashboard.etudiants.tsx│   ├── config/
│   │   ├── ...                    │   └── app.ts
│   └── components/                ├── migrations/
└── package.json                   │   ├── 0000_concerned_slayback.sql
                                   │   ├── 0001_noisy_lady_deathstrike.sql
                                   │   ├── 0002_wet_captain_cross.sql
                                   │   ├── 0003_huge_photon.sql
                                   │   ├── 0004_hesitant_reptil.sql
                                   │   ├── 0005_sad_purple_man.sql
                                   │   └── 0006_clever_jack_flag.sql
                                   ├── scripts/
                                   │   └── seed-istpm.ts
                                   └── drizzle.config.ts
```

**Total : 36 tables, 21 fichiers de routes, 7 migrations, 0 erreurs TypeScript.**

---

## 2. Formules de calcul — Dashboard

### 2.1 KPIs principaux (`/api/dashboard/istpm-stats`)

| KPI | Formule | Source |
|-----|---------|--------|
| **totalInscrits** | `COUNT(*) FROM etudiants` | `dashboard.ts:106-108` |
| **deltaSemestre** | `6` (constant) | `dashboard.ts:135` |
| **formateursActifs** | `COUNT(*) FROM formateurs WHERE statut != 'en_conge'` | `dashboard.ts:110-113` |
| **tauxReussite** | `ROUND((COUNT WHERE moyenne >= 10 / MAX(total, 1)) * 100)` | `dashboard.ts:115-123` |
| **totalARecouvrer** | `SUM(etudiants.reste_a_payer)` | `dashboard.ts:125-131` |

### 2.2 KPIs financiers (`/api/dashboard/istpm-financier`)

| KPI | Formule |
|-----|---------|
| **encaisse** | `SUM(historique_paiements.montant)` (tous) |
| **encaisseCeMois** | `SUM(montant) WHERE date >= premierJourDuMois` |
| **enAttente** | `SUM(etudiants.reste_a_payer) WHERE paiement = 'en_attente'` |
| **impaye** | `SUM(etudiants.reste_a_payer) WHERE paiement = 'impaye'` |
| **retard** | `SUM(etudiants.reste_a_payer) WHERE paiement = 'retard'` |
| **tauxRecouvrement** | `encaisse + totalARecouvrer > 0 ? ROUND((encaisse / (encaisse + totalARecouvrer)) * 100) : 0` |

### 2.3 Éléments à traiter (`/api/dashboard/istpm-a-traiter`)

| Champ | Formule |
|-------|---------|
| **examensAVenir** | `COUNT(*) FROM examens WHERE statut = 'planifie'` |
| **bulletinsAPublier** | `COUNT(*) FROM bulletins WHERE statut != 'publie'` |
| **stagesAValider** | `COUNT(*) FROM stages WHERE statut IN ('soutenance','recherche')` |

### 2.4 Répartitions

| Endpoint | Formule |
|----------|---------|
| `/istpm-repartition-filiere` | `SELECT filiere, COUNT(*) FROM etudiants GROUP BY filiere` |
| `/istpm-repartition-niveau` | `SELECT niveau, COUNT(*) FROM etudiants GROUP BY niveau` |
| `/istpm-reussite-filiere` | `SELECT filiere, COUNT(*) FILTER (WHERE moyenne >= 10) / COUNT(*) * 100` |

---

## 3. Formules de calcul — Étudiants

### 3.1 Moyenne pondérée

```
moyenne = ROUND((Σ note × coef) / Σ coef × 100) / 100
```

- Calculée côté store (`istpm-store.tsx:167-172`)
- Déclenchée après chaque saisie de notes d'examen
- Note composite d'examen : `(théorique + pratique) / nbParts` (si les 2 présents)

### 3.2 Mention

| Condition | Mention |
|-----------|---------|
| `moyenne >= 16` | Très bien |
| `moyenne >= 14` | Bien |
| `moyenne >= 12` | Assez bien |
| `else` | Passable |

### 3.3 Décision

| Condition | Décision |
|-----------|----------|
| `moyenne < 10` | Ajourné |
| `moyenne >= 10 && aucune note < 10` | Admis |
| `moyenne >= 10 && 1 module < 10` | Admis avec dette |
| `moyenne >= 10 && > 1 module < 10` | Rattrapage |

---

## 4. Formules de calcul — Paiements

### 4.1 Réduction du solde après paiement

```
resteAPayer = MAX(0, resteAPayerAvant - montantPaiement)
```

- Si `resteAPayer === 0` → statut passe à `"paye"`
- Sinon le statut reste inchangé

### 4.2 Numéro de reçu

```
ISTPM-R-{YY}{MM}-{seq}
```

- `YY` = 2 derniers chiffres de l'année
- `MM` = mois sur 2 chiffres
- `seq` = nombre d'historiques + 1

### 4.3 Progression du paiement (UI)

```
montantPaye = fraisAnnuels - resteAPayer
progression = fraisAnnuels > 0 ? ROUND((montantPaye / fraisAnnuels) * 100) : 0
largeurBarre = MIN(100, MAX(0, progression))%
```

---

## 5. Formules de calcul — Présence (Attendance)

### 5.1 Taux de présence (par séance ou étudiant)

```
total = nbEnregistrements
présents = nb où present = true
absents = total - présents
justifiés = nb où justifie = true
taux = total > 0 ? ROUND((présents / total) * 100) : 0
```

---

## 6. Rapports consolidés (`/api/reports`)

### 6.1 Rapport opérationnel (`GET /operational`)

| Champ | Formule |
|-------|---------|
| totalEtudiants | `COUNT(*) FROM etudiants` |
| totalFormateurs | `COUNT(*) FROM formateurs` |
| examensPlanifies | `COUNT(*) FROM examens WHERE statut = 'planifie'` |
| bulletinsAPublier | `COUNT(*) FROM bulletins WHERE statut != 'publie'` |
| stagesEnCours | `COUNT(*) FROM stages WHERE statut IN ('en_cours','soutenance')` |
| seancesAujourdhui | `COUNT(*) FROM seances WHERE date = today` |
| encaisseCeMois | `SUM(montant) FROM historique_paiements WHERE date >= 1er du mois` |
| repartitionEtudiants | `GROUP BY statut` |

### 6.2 Rapport financier (`GET /financial`)

| Champ | Formule |
|-------|---------|
| totalEncaisse | `SUM(historique_paiements.montant)` |
| totalDu | `SUM(etudiants.frais_annuels)` |
| totalReste | `SUM(etudiants.reste_a_payer)` |
| tauxRecouvrement | `totalDu > 0 ? ROUND((totalEncaisse / totalDu) * 100) : 0` |

> **Note :** Ce taux diffère de celui du dashboard qui utilise `encaisse / (encaisse + totalReste)`.

### 6.3 Rapport académique (`GET /academic`)

- Examens : total + ventilation par statut (`GROUP BY statut`)
- Bulletins : total + ventilation par statut
- Stages : total + ventilation par statut
- Séances : total

---

## 7. Flux de données (Workflow)

### 7.1 Synchronisation Frontend → Backend

```
Composant React
    │
    ▼
istpm-store.tsx (Zustand store)
    │  ├── état local (snap)
    │  ├── mutations → API (fire-and-forget)
    │  └── fetch au montage ← API
    │
    ▼
istpm-api.ts (typed API client)
    │
    ▼
api.ts (base HTTP client, token JWT)
    │
    ▼
Backend (/api/*)
    │  ├── middleware/auth.ts   → vérifie JWT + rechargé depuis DB
    │  ├── middleware/permissions.ts → vérifie permissions granularies
    │  └── routes/*.ts          → logique métier + requêtes DB
    │
    ▼
PostgreSQL (36 tables)
```

### 7.2 Cycle de vie d'un étudiant

```
1. Création   → POST /api/etudiants
2. Paiements  → POST /api/paiements-istpm (réduit resteAPayer)
3. Examens    → POST /api/examens → POST /api/examens/:id/notes
4. Notes      → moyennePonderee recalculée
5. Bulletin   → POST /api/bulletins (basé sur moyenne + mentions)
6. Publication→ POST /api/bulletins/:id/publier
7. Stage      → POST /api/stages → POST /api/stages/:id/valider
```

### 7.3 Cycle de vie d'une séance (présence)

```
1. Planification → POST /api/seances
2. Ouverture appel → POST /api/attendance/session/open
3. Marquage présence → POST /api/attendance/bulk
4. Fermeture appel → POST /api/attendance/session/:id/close
5. Consultation → GET /api/attendance/summary/seance/:seanceId
```

### 7.4 Cycle de vie d'un événement (rappel)

```
1. Création événement → POST /api/events
2. Création rappel → POST /api/reminders/from-event/:eventId
   (minutesBefore: 15, 30, 60, 1440…)
3. Traitement → POST /api/reminders/process
   (crée notification in-app si méthode = "in_app", marque sent = true)
4. Consultation → GET /api/notifications
```

### 7.5 Rôles & Permissions

```
Rôle → Permissions (JSONB)
─────────────────────────────────────
directeur   → toutes les permissions
responsable → lecture/écriture sur pédagogique
enseignant  → lecture étudiants + écriture examens
```

Validation à deux niveaux :
1. `requireRole("directeur", "responsable")` — vérification rapide par rôle
2. `requirePermission("etudiants.write")` — vérification granulaire par permission

---

## 8. Liste complète des tables (36)

| # | Table | Usage |
|---|-------|-------|
| 1 | `attendance` | Présence individuelle par séance |
| 2 | `attendance_session` | Session d'appel ouverte/fermée |
| 3 | `bulletins` | Bulletins de notes |
| 4 | `calendar_exceptions` | Jours dérogatoires |
| 5 | `center_admins` | Administrateurs de centres |
| 6 | `centers` | Centres de formation |
| 7 | `clients` | CRM — prospects |
| 8 | `demo_requests` | Demandes de démo |
| 9 | `email_logs` | Historique des envois email |
| 10 | `employees` | Employés (RH) |
| 11 | `etudiants` | Étudiants ISTPM |
| 12 | `events` | Événements calendrier |
| 13 | `examens` | Examens planifiés |
| 14 | `formateurs` | Formateurs/enseignants |
| 15 | `historique_paiements` | Historique des paiements ISTPM |
| 16 | `holidays` | Jours fériés |
| 17 | `invoices` | Factures CRM |
| 18 | `levels` | Niveaux d'études |
| 19 | `notes_etudiant` | Notes par module |
| 20 | `notes_examen` | Notes détaillées d'examen |
| 21 | `notifications` | Notifications in-app |
| 22 | `payments` | Paiements CRM |
| 23 | `planifications` | Planifications/événements simples |
| 24 | `reminders` | Rappels programmés |
| 25 | `roles` | Rôles et permissions |
| 26 | `school_vacations` | Vacances scolaires |
| 27 | `seances` | Séances de cours |
| 28 | `settings` | Configuration clé-valeur |
| 29 | `stages` | Stages cliniques |
| 30 | `support_messages` | Messages du support |
| 31 | `support_sessions` | Sessions de support |
| 32 | `teacher_availability` | Disponibilités des formateurs |
| 33 | `user_preferences` | Préférences utilisateur |
| 34 | `users` | Comptes utilisateur |
| 35 | `whatsapp_messages` | Messages WhatsApp |
| 36 | `appointments` | Rendez-vous CRM |

---

## 9. Endpoints API (100+)

| Groupe | Préfixe | Endpoints |
|--------|---------|-----------|
| Auth | `/api/auth` | login, me, register, users CRUD, users/:id/role |
| Clients (CRM) | `/api/clients` | CRUD + import-csv |
| Paiements (CRM) | `/api/payments` | CRUD + stats |
| Factures | `/api/invoices` | CRUD + generate |
| Rendez-vous | `/api/appointments` | CRUD |
| Employés | `/api/employees` | CRUD + import-csv |
| Planifications | `/api/planifications` | CRUD |
| Dashboard | `/api/dashboard` | stats, monthly-revenue + 8 ISTPM endpoints + activities |
| Paramètres | `/api/settings` | KV store, filieres, levels, reset |
| Jours fériés | `/api/holidays` | holidays, vacations, exceptions |
| Admin | `/api/admin` | health, info, stats, tenants, users |
| Support | `/api/support` | sessions + messages |
| WhatsApp | `/api/whatsapp` | send, broadcast, messages |
| Email | `/api/email` | send, send-receipt, logs |
| Reçus | `/api/receipts` | generate PDF |
| Étudiants (ISTPM) | `/api/etudiants` | CRUD |
| Formateurs | `/api/formateurs` | CRUD |
| Examens | `/api/examens` | CRUD + notes |
| Bulletins | `/api/bulletins` | CRUD + publier |
| Stages | `/api/stages` | CRUD + valider |
| Paiements (ISTPM) | `/api/paiements-istpm` | CRUD + stats |
| Rôles | `/api/roles` | CRUD + permissions/list |
| Événements | `/api/events` | CRUD + feed |
| Notifications | `/api/notifications` | CRUD + read-all + unread-count |
| Séances | `/api/seances` | CRUD + today + bulk |
| Enseignant | `/api/teacher` | dashboard, seances, examens, etudiants, availability |
| Préférences | `/api/preferences` | GET/PUT |
| Présence | `/api/attendance` | session, bulk, summary |
| Rappels | `/api/reminders` | CRUD + from-event + process |
| Rapports | `/api/reports` | operational, financial, academic |

---

## 10. Commandes utiles

```bash
# Backend
cd backend
npm run dev              # Démarrer le serveur
npx drizzle-kit generate # Générer une migration
npm run seed             # Peupler la base de données de démo

# Frontend
cd frontend
npm run dev              # Démarrer Vite
npm run build            # Build + typecheck (tsc --noEmit)
npm run lint             # ESLint

# Typecheck seulement
cd backend && npx tsc --noEmit
cd frontend && npx tsc --noEmit
```
