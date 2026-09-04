# Frontend   school-CRM

```
frontend/
├── src/
│   ├── components/
│   │   ├── ui/                    # 40+ Radix UI primitives (button, dialog, select, table…)
│   │   ├── add-client-wizard.tsx   # Multi-step client creation wizard
│   │   ├── dash-shell.tsx          # Main dashboard shell (sidebar, topnav, notifications)
│   │   ├── language-toggle.tsx     # FR/AR language switcher
│   │   ├── student-fields.tsx      # Student info form fields
│   │   ├── support-chat.tsx        # Dashboard support chat widget
│   │   ├── support-button.tsx      # Support trigger button
│   │   └── table-pagination.tsx    # Reusable pagination
│   ├── hooks/
│   │   └── use-mobile.tsx
│   ├── lib/
│   │   ├── api.ts                  # Fetch wrapper with JWT injection
│   │   ├── auth.tsx                # Auth context (login/logout/session)
│   │   ├── dash-ui.tsx             # Shared dashboard style tokens
│   │   ├── dashboard-mirror-data.ts # Static mock data (legacy)
│   │   ├── database-types.ts       # Shared TS interfaces
│   │   ├── dashboard-i18n.tsx      # i18n context (FR/AR) for dashboard
│   │   └── utils.ts                # cn(), formatters…
│   ├── locales/
│   │   └── dashboard/{fr,ar}.json  # Dashboard i18n strings
│   ├── routes/                     # TanStack Router file-based routing
│   │   ├── __root.tsx              # Root layout (Outlet, language toggle, 404)
│   │   ├── index.tsx               # Redirects to /login
│   │   ├── login.tsx               # Login page (/login)
│   │   ├── dashboard.tsx           # Dashboard layout (/dashboard)   auth guard + garde RBAC
│   │   ├── dashboard.index.tsx     # Dashboard home (/dashboard/)   par rôle (+accueil étudiant)
│   │   ├── dashboard.espace-etudiant.tsx # Espace étudiant (/dashboard/espace-etudiant)
│   │   ├── dashboard.familles.tsx  # Client list (/dashboard/familles, legacy)
│   │   ├── dashboard.paiements.tsx # Payments (/dashboard/paiements)
│   │   ├── dashboard.calendar.tsx  # Calendar (/dashboard/calendar)
│   │   ├── dashboard.affiches.tsx  # Employees (/dashboard/affiches, legacy)
│   │   ├── dashboard.planifications.tsx # Planning (/dashboard/planifications)
│   │   ├── dashboard.etudiants.tsx # Étudiants ISTPM (/dashboard/etudiants)
│   │   ├── dashboard.stages.tsx    # Stages (/dashboard/stages, Structure/Service créables)
│   │   ├── dashboard.examens.tsx   # Examens ISTPM (/dashboard/examens)
│   │   ├── dashboard.bulletins.tsx # Bulletins ISTPM (/dashboard/bulletins)
│   │   ├── dashboard.formateurs.tsx # Formateurs (/dashboard/formateurs)
│   │   ├── dashboard.rapports.tsx  # Reports (/dashboard/rapports, legacy)
│   │   └── dashboard.settings.tsx  # Settings (/dashboard/settings, création comptes étudiants)
│   ├── main.tsx                    # App entry point
│   └── styles.css                  # Tailwind v4 + shadcn styles
├── public/                         # Static assets (favicon, logos)
├── index.html
├── vite.config.ts                  # Vite + React + Tailwind + Router plugin
├── tsconfig.json
├── package.json
├── vercel.json                     # Vercel deploy config
├── netlify.toml                    # Netlify deploy config
└── _headers                        # Security headers
```

## API client (`lib/api.ts`)

- Base URL from `VITE_API_URL` env var (default `http://localhost:3000/api`)
- Auto-injects `Bearer` JWT token from `localStorage`
- Handles 401 → clears token + redirects to `/login`
- Methods: `get<T>`, `post<T>`, `put<T>`, `patch<T>`, `delete<T>`

## Espace étudiant (`dashboard.espace-etudiant.tsx`)

- Rôle `etudiant` : `/dashboard` (carte d'accueil) + `/dashboard/espace-etudiant` uniquement
  (`NAV_BY_ROLE` dans `dashboard-i18n.tsx`, garde dans `dashboard.tsx`).
- Sections : profil + photo, enseignants, stage, calendrier (`VueSemaine`/`VueMois`
  `canDrag={false}`), notes, paiements, demandes + modale (prédéfini/libre,
  `CATALOGUE_DEMANDES` dans `lib/istpm-api.ts`), traitement staff.
- Stage : `CreatableComboField` (`dash-form.tsx`) pour Structure/Service
  (persiste via `/api/settings/structures` + `/api/settings/stage-services`,
  état `servicesStage` dans `istpm-store.tsx`).

## Auth (`lib/auth.tsx`)

- `AuthProvider` context wraps the app
- `useAuth()` exposes `user`, `loading`, `login()`, `logout()`, `role`
- Backed by `/api/auth/login` + `/api/auth/me`

## Routing

- TanStack Router v1 with file-based plugin
- Routes auto-discovered from `src/routes/`
- Auth guards in `dashboard.tsx` via `beforeLoad`

## i18n

- Two locales: `fr` (default) and `ar` (Arabic, RTL)
- `DashboardI18nProvider` wraps the app in `main.tsx`
- `useDashboardI18n()` returns locale, toggle, and translated strings
- Language toggle floating button visible on `/login` and `/dashboard/*`
