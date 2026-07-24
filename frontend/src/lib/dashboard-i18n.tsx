import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  LayoutDashboard,
  GraduationCap,
  CalendarDays,
  Users,
  BookOpen,
  ClipboardList,
  FileText,
  Stethoscope,
  CreditCard,
  Settings,
} from "lucide-react";
import type { UserRole } from "@/lib/auth";
import type { NavEntry, NavGroup, NavItem } from "@/components/dash-sidebar";
import { fr as dateFnsFr, ar as dateFnsAr } from "date-fns/locale";
import frDashboard from "@/locales/dashboard/fr.json";
import arDashboard from "@/locales/dashboard/ar.json";

export type DashboardLocale = "fr" | "ar";
export type DashboardTranslations = typeof frDashboard;

const STORAGE_KEY = "gestio-locale";

const dashboardDictionaries: Record<DashboardLocale, DashboardTranslations> = {
  fr: frDashboard,
  ar: arDashboard,
};

type DashboardI18nContextValue = {
  locale: DashboardLocale;
  setLocale: (locale: DashboardLocale) => void;
  toggleLocale: () => void;
  dir: "ltr" | "rtl";
  numberLocale: string;
  dashboard: DashboardTranslations;
};

const DashboardI18nContext = createContext<DashboardI18nContextValue | null>(
  null,
);

function readStoredLocale(): DashboardLocale {
  if (typeof window === "undefined") return "fr";
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === "ar" ? "ar" : "fr";
}

export function getDateFnsLocale(locale: DashboardLocale) {
  return locale === "ar" ? dateFnsAr : dateFnsFr;
}

export function DashboardI18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<DashboardLocale>("fr");

  useEffect(() => {
    setLocaleState(readStoredLocale());
  }, []);

  const setLocale = useCallback((next: DashboardLocale) => {
    setLocaleState(next);
    localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const toggleLocale = useCallback(() => {
    setLocale(locale === "fr" ? "ar" : "fr");
  }, [locale, setLocale]);

  const dashboard = dashboardDictionaries[locale];
  const dir: "ltr" | "rtl" = locale === "ar" ? "rtl" : "ltr";
  const numberLocale = locale === "ar" ? "ar-MA" : "fr-MA";

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = dir;
  }, [locale, dir]);

  const value = useMemo(
    () => ({ locale, setLocale, toggleLocale, dir, numberLocale, dashboard }),
    [locale, setLocale, toggleLocale, dir, numberLocale, dashboard],
  );

  return (
    <DashboardI18nContext.Provider value={value}>
      {children}
    </DashboardI18nContext.Provider>
  );
}

export function useDashboardI18n() {
  const ctx = useContext(DashboardI18nContext);
  if (!ctx)
    throw new Error(
      "useDashboardI18n must be used within DashboardI18nProvider",
    );
  return { ...ctx, t: ctx.dashboard };
}

/**
 * Which nav destinations each role may reach. Roles are a UI state only   this
 * hides navigation, it is not a security boundary.
 *
 * directeur    full access
 * enseignant   pedagogy only: no payments, no staff management, no settings.
 *              Voit l'emploi du temps en consultation seule (son planning).
 * responsable  student administration: no staff management, no note entry,
 *              no settings
 *
 * Le contrôle de l'emploi du temps (création / édition des séances) est réservé
 * à la direction et au responsable ; l'enseignant le consulte uniquement.
 */
const NAV_BY_ROLE: Record<UserRole, readonly string[]> = {
  directeur: [
    "/dashboard",
    "/dashboard/calendar",
    "/dashboard/etudiants",
    "/dashboard/formateurs",
    "/dashboard/examens",
    "/dashboard/bulletins",
    "/dashboard/stages",
    "/dashboard/paiements",
    "/dashboard/settings",
  ],
  enseignant: [
    "/dashboard",
    "/dashboard/calendar",
    "/dashboard/etudiants",
    "/dashboard/examens",
    "/dashboard/bulletins",
  ],
  // Le responsable organise le planning et gère les réglages pédagogiques.
  responsable: [
    "/dashboard",
    "/dashboard/calendar",
    "/dashboard/etudiants",
    "/dashboard/bulletins",
    "/dashboard/stages",
    "/dashboard/paiements",
    "/dashboard/settings",
  ],
};

/** Is this destination reachable by this role? Used to gate routes and links. */
export function canAccess(role: UserRole | null, to: string): boolean {
  if (!role) return false;
  return NAV_BY_ROLE[role].includes(to);
}

export function useDashboardNav(role: UserRole | null) {
  const { t } = useDashboardI18n();

  const nav: NavEntry[] = useMemo(() => {
    const item = (
      to: string,
      label: string,
      shortLabel: string,
      icon: NavItem["icon"],
    ): NavItem => ({ to, label, shortLabel, icon });

    // Examens and Bulletins are two halves of the same job (assess, then
    // publish results), so they live under one « Scolarité » section.
    const all: NavEntry[] = [
      item(
        "/dashboard",
        t.nav.dashboard,
        t.navShort.dashboard,
        LayoutDashboard,
      ),
      item(
        "/dashboard/calendar",
        t.nav.planning,
        t.navShort.planning,
        CalendarDays,
      ),
      item(
        "/dashboard/etudiants",
        t.nav.etudiants,
        t.navShort.etudiants,
        GraduationCap,
      ),
      {
        id: "scolarite",
        label: t.nav.scolarite,
        icon: BookOpen,
        children: [
          item(
            "/dashboard/examens",
            t.nav.examens,
            t.navShort.examens,
            ClipboardList,
          ),
          item(
            "/dashboard/bulletins",
            t.nav.bulletins,
            t.navShort.bulletins,
            FileText,
          ),
        ],
      },
      item(
        "/dashboard/formateurs",
        t.nav.formateurs,
        t.navShort.formateurs,
        Users,
      ),
      item("/dashboard/stages", t.nav.stages, t.navShort.stages, Stethoscope),
      item(
        "/dashboard/paiements",
        t.nav.paiements,
        t.navShort.paiements,
        CreditCard,
      ),
      item("/dashboard/settings", t.nav.settings, t.navShort.settings, Settings),
    ];

    if (!role) return all;
    const allowed = NAV_BY_ROLE[role];

    // Groups are filtered by their children, and drop out entirely when the
    // role can reach none of them.
    return all.reduce<NavEntry[]>((acc, entry) => {
      if (!isGroupEntry(entry)) {
        if (allowed.includes(entry.to)) acc.push(entry);
        return acc;
      }
      const children = entry.children.filter((c) => allowed.includes(c.to));
      if (children.length) acc.push({ ...entry, children });
      return acc;
    }, []);
  }, [t.nav, t.navShort, role]);

  return { nav, brand: t.shell.brand };
}

function isGroupEntry(entry: NavEntry): entry is NavGroup {
  return "children" in entry;
}

export function interpolate(
  template: string,
  vars: Record<string, string | number>,
) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) =>
    String(vars[key] ?? ""),
  );
}
