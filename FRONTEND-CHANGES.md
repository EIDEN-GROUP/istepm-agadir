# ISTEPM Agadir   Frontend changes (handoff to backend)

**Date:** 2026-07-24
**Scope:** Frontend-only feature work. No backend code, database schema, routing,
authentication, or design system was modified. This document lists every change
and flags the points where **backend support is required** to make the new
frontend features fully persistent (today they work against the in-memory /
`localStorage` store and degrade gracefully when the API is unavailable).

> **How data flows today:** the UI reads/writes the React store in
> `src/lib/istpm-store.tsx`, which mirrors to `localStorage` and *optimistically*
> calls the API client in `src/lib/istpm-api.ts`. API failures are swallowed
> (`.catch(() => {})`) so the demo keeps working offline. New fields described
> below are already **sent** to the API but will be **ignored** until the backend
> persists them.

---

## 1. Dashboard   "Active Students" KPI

- **What changed:** The director dashboard KPI card **"Étudiants inscrits"** was
  replaced by **"Étudiants actifs"**, showing only the count of students whose
  `statut === "inscrit"` (excludes `diplome`, `en_attente`, `abandon`). The
  "+N ce semestre" hint was removed so the card shows a single number.
- **Files:** `src/routes/dashboard.index.tsx`
- **Backend support:** None required. Uses the existing `etudiants[].statut`
  field. *Optional:* a dedicated `activeCount` in any dashboard-stats endpoint
  would avoid client-side counting.

## 2. Schedule (Emploi du temps) access restriction

- **What changed:** The Schedule module (`/dashboard/calendar`) is now reachable
  only by **Directeur** and **Responsable** (interpreted as the department
  manager). The **Enseignant** role no longer sees the "Planning" nav item, and a
  route guard redirects any disallowed role to `/dashboard`. The two calendar
  links previously shown on the teacher dashboard were removed.
- **Files:** `src/lib/dashboard-i18n.tsx` (removed `/dashboard/calendar` from the
  `enseignant` entry of `NAV_BY_ROLE`), `src/routes/dashboard.calendar.tsx`
  (`beforeLoad` guard using `canAccess`), `src/routes/dashboard.index.tsx`.
- **Backend support:** The frontend `NAV_BY_ROLE` gate is **UI-only** and is *not*
  a security boundary. **The backend must enforce the same role restriction** on
  any schedule/séances endpoints (only `directeur` + `responsable` may read/write
  the timetable). Please confirm the canonical role name that represents
  "department manager" (frontend roles are `directeur`, `enseignant`,
  `responsable`).

## 3. Session (Séance) creation   required "Filière (département)" field

- **What changed:** The new-session form now has a **required** `Filière`
  (department) select. Selecting a formateur pre-fills the filière from that
  teacher's department, but it stays editable. The filière is shown in the
  session detail panel.
- **Data model:** `Seance` already carried `filiere: Filiere` (added in a prior
  uncommitted edit). `genererSeances()` was fixed to actually populate it
  (derived from `FORMATEURS[].departement`).
- **Files:** `src/lib/istpm-data.ts`, `src/routes/dashboard.calendar.tsx`
- **Backend support required:** The séances/timetable endpoints must **accept,
  store and return a `filiere` field** on each session. Validation should reject
  session creation without a filière. `filiere` values come from the `FILIERES`
  reference list.

## 4. Schedule   Export CSV

- **What changed:** An **"Exporter CSV"** action on the Schedule page downloads the
  **currently displayed** (filtered) sessions. Columns: Date, Début, Fin, Module,
  Filière, Type, Groupe, Salle, Formateur, Semestre, Année universitaire. Export
  is generated fully client-side (UTF-8 + BOM for Excel).
- **Files:** `src/routes/dashboard.calendar.tsx`
- **Backend support:** None required (client-side export). *Optional:* a
  server-side export endpoint if exports should include data beyond what the
  client currently holds.

## 5. New Payment form   searchable student autocomplete

- **What changed:** In the "Nouveau paiement" form, the student `<select>` was
  replaced with a **searchable autocomplete** (search by name / CNE, instant
  filtering). A reusable `ComboBoxField` was added to `src/components/dash-form.tsx`
  (built on the existing `cmdk` Command + Popover primitives).
- **Files:** `src/components/dash-form.tsx` (new `ComboBoxField`),
  `src/routes/dashboard.paiements.tsx`
- **Backend support:** None required.

## 6. Payment form   "Mois réglé" (month) selector

- **What changed:** The payment form gained a **required "Mois réglé"** select
  (janvier … décembre), defaulting to the current month. The chosen month is
  stored on the payment line and displayed in the payment detail panel.
- **Data model:** `LignePaiement` and `PaiementLigne` gained an optional
  `mois?: string`; a `MOIS_PAIEMENT` constant (12 French month names) was added.
- **Files:** `src/lib/istpm-data.ts`, `src/routes/dashboard.paiements.tsx`,
  `src/lib/istpm-store.tsx`, `src/lib/istpm-api.ts`
- **Backend support required:** `POST /paiements-istpm` now receives an extra
  **`mois`** field (see `createPaiement` in `src/lib/istpm-api.ts`). The backend
  should **persist `mois`** on the payment record and **return it** when listing
  payments/students, so the monthly view (below) survives a reload from the API.
  Until then, `mois` only lives in the client store / `localStorage`.

## 7. Monthly payment tracking view

- **What changed:** The Payments page has a new **"Suivi mensuel   Paiements par
  mois"** panel: pick a student and see a 12-month grid, each month marked
  **Réglé / Non réglé** with the paid amount. Status is derived from payment lines
  carrying a `mois` value.
- **Files:** `src/routes/dashboard.paiements.tsx` (`MonthlyTracker` component)
- **Backend support required:** Same as #6   depends on `mois` being persisted and
  returned by the payments API. *Optional (recommended):* a per-student
  **monthly payment status** endpoint (e.g. `{ mois, statut, montant }[]`) so the
  view does not have to infer status client-side. Historical payments created
  before this change have no `mois` and show as "Non réglé".

## 8. Student grades   CRUD ("Saisie des notes")

- **What changed:** A new **"Saisie des notes"** panel on the Examens page
  (teacher space) lets a user **record a grade** with **Group, Module, Exam,
  Student, Grade (/20)**, following the existing list + dialog CRUD pattern.
  Selecting an exam pre-fills its module/group and filters the student list to the
  exam's filière + semester. Recorded grades are listed and can be deleted; the
  student's overall average is recomputed on each change.
- **Data model:** `NoteModule` carries an optional `examen?: string` (added in a
  prior uncommitted edit) to link a grade to its exam. A new store action
  `addNote(etudiantId, note)` appends/updates a note and recomputes the average.
- **Files:** `src/lib/istpm-store.tsx` (`addNote`), `src/routes/dashboard.examens.tsx`
  (`SaisieNotesPanel`, `NoteForm`)
- **Backend support required:** There is currently **no dedicated endpoint** for a
  single grade. `addNote` is **local only** (it does not call the API yet).
  To persist grades, the backend should expose grade CRUD, e.g.:
  - `POST /notes` `{ etudiantId, module, examenId (or examen), groupe, note, coef, credits }`
  - `DELETE /notes/:id`
  - grade rows returned per student so the "Saisie des notes" table can hydrate
    from the server.
  The frontend defaults `coef: 3`, `credits: 6` when not specified   adjust to your
  academic model. Average recomputation currently happens client-side
  (`moyennePonderee`); ideally the backend returns the recomputed average.

## 9. Student profile   "Historique des semestres" section

- **What changed:** The student detail sheet has a new **"Historique des
  semestres"** section: a table of previous semesters with **Semestre, Modules,
  Notes, Moyenne, Résultat**.
- **Important   placeholder data:** The data model does not store past-semester
  transcripts, so this section is currently **derived deterministically** from the
  student's current level (`niveau`) and average, purely to populate the UI.
- **Files:** `src/routes/dashboard.etudiants.tsx` (`historiqueSemestres` helper +
  section)
- **Backend support required:** To show **real** history, the backend should
  expose past-semester results per student, e.g.
  `GET /etudiants/:id/semestres` → `[{ semestre, modules: [{ module, note }],
  moyenne, resultat }]`. Once available, replace the `historiqueSemestres()`
  placeholder with the API data (the rendering table is already in place).

## 10. Internship (Stages) dashboard   analytics

- **What changed:** The Stages page gained an analytics row with **three charts**
  (recharts, the library already used elsewhere):
  1. **Statistiques des stages**   count by status,
  2. **Répartition par service / département**   distribution by host service,
  3. **Stages par structure hospitalière**   volume per hospital.
  All are computed live from the current `stages` data.
- **Files:** `src/routes/dashboard.stages.tsx` (`StagesAnalytics`, `ChartCard`)
- **Backend support:** None required (aggregated client-side from existing stage
  records). *Optional:* server-side aggregation endpoints if the dataset grows
  large enough that client aggregation becomes costly.

---

## Summary of new / changed data fields (for the backend)

| Entity | Field | Type | Status |
|---|---|---|---|
| `Seance` (session/timetable) | `filiere` | string (from `FILIERES`) | **New   must persist & return, required on create** |
| `Paiement` (payment line) | `mois` | string (`MOIS_PAIEMENT`, e.g. "janvier") | **New   sent by client, must persist & return** |
| `Note` / grade | `examen` (link to exam) | string / id | **New   no endpoint yet; needs grade CRUD** |
| Student | past-semester transcripts | array | **Not modeled   needs a read endpoint (feature #9 is placeholder)** |

## New API expectations (recommended)

- `POST /seances` (or existing session endpoint): accept + validate `filiere`.
- `POST /paiements-istpm`: accept + persist `mois` (already sent).
- Payments/student read endpoints: return `mois` on each payment line.
- Grades: `POST /notes`, `DELETE /notes/:id`, and grades returned per student
  (fields: `module`, `examen`/`examenId`, `groupe`, `note`, `coef`, `credits`).
- Student history: `GET /etudiants/:id/semestres`.
- **Role enforcement:** replicate the Schedule (calendar) restriction server-side  
  only the director and department-manager roles may access timetable endpoints.

## Files touched (frontend)

- `src/lib/istpm-data.ts`   `genererSeances` sets `filiere`; `LignePaiement`/
  `PaiementLigne` gain `mois`; `MOIS_PAIEMENT`/`MoisPaiement` added.
- `src/lib/istpm-store.tsx`   `paiements` maps `mois`; `addPaiement` sends `mois`;
  new `addNote` action.
- `src/lib/istpm-api.ts`   `createPaiement` payload accepts `mois`.
- `src/lib/dashboard-i18n.tsx`   Schedule removed from `enseignant` nav.
- `src/components/dash-form.tsx`   new reusable `ComboBoxField` (searchable select).
- `src/routes/dashboard.index.tsx`   "Étudiants actifs" KPI; removed teacher
  calendar links.
- `src/routes/dashboard.calendar.tsx`   route guard, required `Filière` field,
  Export CSV, filière in detail.
- `src/routes/dashboard.paiements.tsx`   student autocomplete, month select,
  monthly tracker, month in detail.
- `src/routes/dashboard.examens.tsx`   grades CRUD panel + form.
- `src/routes/dashboard.etudiants.tsx`   semester history section.
- `src/routes/dashboard.stages.tsx`   internship analytics charts.

_No backend files, DB migrations, routing config, or auth were modified.
`npx tsc --noEmit` passes clean._
