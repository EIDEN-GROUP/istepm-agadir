# Session log

Running record of work sessions on this repo. **Newest first.** One entry per
session: what changed, why, backend/DB impact, and anything the team must know.

---

## 2026-09-10 — PDF preview rendered blank

The in-app PDF viewer (exam "Voir le sujet", formateur + directeur) showed
only the pdf.js toolbar over a black canvas. Cause: the `<iframe sandbox="">`
gave the frame an opaque origin, so the browser PDF viewer could not read
the `blob:` URL created by our origin. Changed to
`sandbox="allow-scripts allow-same-origin"` (native PDF rendering never runs
a file's embedded JS, so a deposited sujet still can't execute anything) and
gave the frame a white background. `dashboard.examens.tsx` — the only inline
PDF viewer in the app; every other PDF path is a download.

---

## 2026-09-10 — Teacher exam form: group persistence + scoped semester/group

Off `cb9534d`.

- **Group wasn't saved** — `ExamenForm` sends `classe` (« S2-A »); the backend
  `examenSchema` only knew a bare `groupe` field, so it was dropped and the
  GROUPE column came out empty. `examens.ts` now accepts `classe`,
  derives `groupe` from it (`normaliseClasse`, strips the `S#-` prefix) and
  drops `classe` before the insert/update. No schema/migration change.
- **Malformed dropdown** (`S1-S1-A`, `S2-S2-A`…) — group lists were built as
  `` `${niveau}-${groupe}` `` over student fiches whose `groupe` is
  inconsistent (some already prefixed). New `classeLabel()` helper prefixes
  once; applied to `classesDisponibles`, effectif counts and the
  Saisie-des-notes roster/label matching.
- **Semestre / Groupe now scoped to the formateur** — the exam form's
  Semestre select lists only the teacher's assigned semesters, the Groupe
  select only their encadré groups (`moi.groupes`), filtered by the chosen
  semester. Falls back to the full lists when the account has no linked
  formateur. Validation checks against the scoped list; a stale group
  resets when the semester changes.

---

## 2026-09-10 — Teacher group filter + toast shape

Off `origin/main` `facf806`. Pushed `30240b3`.

| Commit | Summary |
|---|---|
| `30240b3` | style(toast): quieter sonner shape — square-ish card, thin left rule |
| (prev)   | fix(teacher): group filter lists only the formateur's assigned groups |

- **Teacher group filter** — `dashboard.etudiants.tsx` `groupeOptions` was
  built from every student. Now, for a teacher, it returns only
  `enseignantScope.groupes` (assigned encadré groups), filtered by the
  selected semester prefix. Non-teacher roles unchanged.
- **Toast shape** — `ui/sonner.tsx` + `styles.css`: 8px radius (was pill),
  2px type-colored left border, sans-medium title (was heavy display),
  type-colored icon. Not visually verified before push.

---

## 2026-09-10 — Frontend phases: pagination, teacher assignment, dup-inscription guard

Off `origin/main` `b83c090` (after pulling the team's `3dd0929` "backend-only
data" work). Commits:

| Commit | Summary |
|---|---|
| `97484fc` | fix(inscription): reject duplicate students (CNE / e-mail) + no double-submit |
| `92c0007` | feat(teacher): "Mon affectation" card (filière / semestres / groupes / modules) |
| `4a653b2` | feat(ui): paginate staff request queue + student "Mes demandes" |

- **Pagination** — both tables use the shared `usePagination` / `TablePagination`
  (6 rows/page); status filter resets to page 1.
- **Teacher "Mon affectation"** — read-only chip rows on the enseignant
  dashboard, derived from the linked `Formateur` record (semestres = unique
  group prefixes). Needs `formateurs.user_id` linked to the account; the demo
  dataset doesn't link `enseignant@` — link it manually for local testing.
- **Duplicate inscription** — `POST /api/etudiants` pre-checks a non-archived
  student with the same lower(CNE) or lower(email) → 409 with a named message.
  Students with no CNE/e-mail are still allowed. `FormDialog` gained an
  optional `busy` prop (disables buttons, shows "Enregistrement…").
- **Known:** prod still has pre-existing dup rows — CNE `JC636401` ×2, emails
  `y.brox95@gmail.com` ×2, `abdelhakime2003@gmail.com` ×2. The guard only stops
  new ones; dedupe those by hand (archive the older of each pair).
- Local dev: `frontend` `npm ci` drops the Playwright test binary (not a repo
  dep); reinstall into node_modules without touching package.json. Demo dataset
  lives in `backend/migrations/sql-istepm/` (manual `psql`, not in the journal).

---

## 2026-09-08 — Profile page, student space split, calendar table, photo pipeline

Branched from `origin/main` at `b7f0314`. Commits (top = newest):

| Commit | Summary |
|---|---|
| `4778c93` | feat(photo): student photos are managed by the affaires estudiantines only |
| `d375f9e` | fix(profile): Mon profil read-only when impersonating via the role switcher |
| `dbcd684` | fix(profile): staff/director photo persists across reload / role switch |
| `f2215c7` | feat(profile): "Retirer la photo" |
| `7e30bf2` | fix(student): point existing links at the new per-section routes |
| `6f1ac12` | feat(student): calendar has three views — Liste, Semaine (grid), Mois |
| `dcd6428` | docs: add SESSION_LOG.md |
| `a9b33c9` | fix(photo): WebP encoding + background re-sync of student photos |
| `dcbc68d` | feat(student): week calendar as a readable table instead of a time-grid |
| `e37c7c3` | chore(title): tab title → "ISTEPM Agadir — Gestion scolaire" |
| `7c5f1d1` | feat(calendar): fit-to-sessions grid + "now" line + half-hour lines *(authored by hakim, committed on request)* |
| `9aaabfb` | feat(student): split espace-étudiant into per-section routes (flat rail items) |
| `21928c6` | feat(profile): "Mon profil" page + photo/email/password self-edit |
| `e309ef6` | fix(settings): balanced multi-column layout, no empty gaps |

### What changed

**"Mon profil" page (`21928c6`)** — new route `/dashboard/mon-profil`, opened by
the round avatar at the bottom of the sidebar (no menu entry). Reference-style
header: photo left, name + role badge, inline field grid; students also see CNE /
filière / niveau·groupe / état-civil + indicator tiles. Self-service editing of
**email and password** (current password required); **photo** for every role
(before: students only), no password needed, client-downscaled. Name and role
stay locked. The matricule is no longer shown to students. Établissement label
falls back to "Institut spécialisé des techniques paramédicales".

**Student space → per-section routes (`9aaabfb`)** — the espace-étudiant tab
strip is gone. Each section is its own URL **and its own left-rail icon** (no
dropdown):
`/dashboard/espace-etudiant/{scolarite,stage,calendrier,paiements,demandes}`.
Base route is an `<Outlet/>` container; an index route redirects students to
`/scolarite` and shows the staff request queue; a `$section` route renders the
shared `EspaceEtudiantView` (unknown section → `/scolarite`). "Profil" tab
dropped (use Mon profil). Payment/enrolment statuses now show their French
labels.

**Calendar — student views (`dcbc68d`, `6f1ac12`)** — the drag-and-drop
time-grid was too hard for students to read. The student calendar now has a
three-way toggle: **Liste** (default, a table: Jour · Horaire · Cours · Salle ·
Formateur, one row per session, click for detail — "today" = teal dot + tinted
row, current session gets an "En cours" badge, finished sessions dimmed),
**Semaine** (the week grid, fit to occupied hours), **Mois** (month grid).

**Link audit (`7e30bf2`)** — after the route split, every link into the student
space was checked. The student home "Accès rapide" cards now open the matching
section (they all pointed to the same page); "Mon profil" opens
`/dashboard/mon-profil`. request-bell navigations were already staff-only and
correct. The photo re-sync poll skips the etudiant role (`GET /etudiants` 404s
for students).

**Photo pipeline (`a9b33c9`)** — uploads are encoded **WebP** (q0.8, JPEG
fallback) → ~half the data-URL size. The istpm store now re-syncs student photos
on tab focus and every ~45 s, so a photo uploaded from the student space shows on
staff screens without a full page reload.

**Settings layout (`e309ef6`)** — the Paramètres cards use a balanced
multi-column (masonry) flow so short cards no longer leave big vertical gaps.

**Tab title (`e37c7c3`)** — was "ISTEPM Agadir | CRM" (leftover from the
school-CRM template); now "ISTEPM Agadir — Gestion scolaire" + a meta
description.

### Backend / DB impact

- **New column:** `users.photo_url` (text, default `''`). Migration
  **`0021_user_photo.sql`** (idempotent `ADD COLUMN IF NOT EXISTS`). It was
  originally numbered `0018` locally and **renumbered to `0021`** during a rebase
  because upstream added `0018`–`0020` (feature-tickets). If a database recorded
  the old `0018_user_photo` hash, delete that one row from
  `drizzle.__drizzle_migrations` before migrating (same-timestamp collision made
  the runner skip `0018_feature_tickets`).
- **New endpoint:** `PATCH /api/auth/me` (authenticated, rate-limited) — updates
  the current user's email / password / photo. Password required only for
  email/password changes, not photo-only. Wrong current password returns **403**
  (the frontend API client treats every 401 as an expired session). Returns a
  fresh JWT. `photoUrl` accepts `http(s)` or `data:image/…`, ~2 MB cap.
- `authenticate` middleware + login response now carry `photoUrl` (never in the
  JWT — kept small).
- `PATCH /auth/me` and the existing `PUT /student/me/photo` both keep
  `users.photo_url` **and** `etudiants.photo_url` in sync for students, so the
  photo shows everywhere staff see that student.
- `canAccess()` (`dashboard-i18n.tsx`): `COMMON_ROUTES` allowlist for
  `/dashboard/mon-profil`; `NAV_BY_ROLE.etudiant` lists the section sub-paths.

**Profile-photo model, finalised (`f2215c7` → `4778c93`)** — after several
rounds of feedback:
- **Staff / directeur:** own photo, editable on Mon profil, now **persists**
  across reload and role switch (AuthProvider re-hydrates `photoUrl` from
  `GET /auth/me` on mount / role change, only when acting under one's own
  role). "Retirer la photo" clears it.
- **Role switcher = impersonation, not login.** The JWT stays the logged-in
  person's, so editing "as another role" hit the wrong account. Mon profil is
  now **read-only while impersonating** (`impersonating` flag from auth
  context) with a banner explaining why.
- **Students never manage their own photo.** `PATCH /auth/me` rejects
  `photoUrl` for `etudiant` (403); `PUT /student/me/photo` always 403s. The
  responsable / directeur set it from the Étudiants edit form
  (`PUT /etudiants/:id`), which now also copies the photo onto the linked
  user account so it shows in the student's space. Mon profil shows it
  read-only.
- Photo encoding is WebP (`a9b33c9`); staff screens re-sync student photos on
  tab focus / ~45 s.

### VPS incident (2026-09-08)

The `deploy` job failed with `no space left on device` — the VPS disk was
**100% full** (build cache + old images had piled up). Freed ~15 GB with
`docker builder prune -af` + `docker container prune -f` +
`docker image prune -af` (no `--volumes` — every database / volume untouched,
every running container left alone). Disk 100% → 73%. Re-ran the deploy job,
green. If it recurs: same three prunes, then re-run the job.

### Compatibility review (origin/main `b7f0314` → HEAD)

Full diff reviewed end-to-end for regressions:
- **Backend** additive only — one new nullable column, one new endpoint, extra
  field on existing auth responses. Existing routes/queries untouched.
- **`canAccess` / `NAV_BY_ROLE`** — only widened (added the section sub-paths +
  a `COMMON_ROUTES` allowlist). No role loses access to anything.
- **Route tree** — `/dashboard/espace-etudiant` became an `<Outlet/>` container
  with an index route (staff queue / student redirect) and a `$section` route.
  Staff behaviour at the base path is unchanged.
- **Sidebar** — the footer/rail avatar became a `<Link>` to Mon profil; no other
  nav change for staff.
- **Store** — photo overlay now matches by id *or* CNE; a 45 s / on-focus
  re-sync was added (staff only, photoUrl only, swallows errors, never logs
  out).
- **Links audited** — student home cards fixed; request-bell left as is
  (staff-only).
- Verified: `tsc` clean (front + back), full `vite build`, 0 console errors
  across roles, all student quick-links resolve, staff queue intact.

### Things to know

- **Duplicate `etudiants` rows** in the local dev DB: 2–3 rows share CNE
  `G134567890` (the seed ran multiple times). Harmless for testing; dedupe before
  it matters in prod.
- Test student account (created via `/Users/mac/Downloads/create-etudiant.sql`):
  `salma.elamrani@istpm.ma` / `Etudiant123!`, linked to the seed fiche Salma El
  Amrani.
- Verified locally: `tsc` clean (frontend + backend), full `vite build` passes,
  16 routes × 3 roles render with 0 console errors, the new endpoint's edge
  cases (403/400/409/200), photo propagation to staff lists, calendar table,
  section routing.
- **Not pushed** as of end of session. Pushing triggers CI/CD.
- `frontend/src/components/calendar-views.tsx` carried a WIP calendar feature
  (fit grid, "now" line, half-hour lines) that was in the working tree at the
  start of the session — committed as `7c5f1d1` on request. The student week
  view later replaced the grid with a table, so `fit` is now only wired in
  `calendar-views.tsx` for potential reuse elsewhere.
