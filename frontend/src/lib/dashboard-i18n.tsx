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
  Calendar,
  Users,
  CreditCard,
  Images,
  Settings,
} from "lucide-react";
import { fr as dateFnsFr, ar as dateFnsAr } from "date-fns/locale";
import frDashboard from "@/locales/dashboard/fr.json";
import arDashboard from "@/locales/dashboard/ar.json";
import type { NavItem } from "@/components/dash-shell";

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

const DashboardI18nContext = createContext<DashboardI18nContextValue | null>(null);

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

  return <DashboardI18nContext.Provider value={value}>{children}</DashboardI18nContext.Provider>;
}

export function useDashboardI18n() {
  const ctx = useContext(DashboardI18nContext);
  if (!ctx) throw new Error("useDashboardI18n must be used within DashboardI18nProvider");
  return { ...ctx, t: ctx.dashboard };
}

export function useDashboardNav() {
  const { t } = useDashboardI18n();

  const topNav: NavItem[] = useMemo(
    () => [
      {
        to: "/dashboard",
        label: t.nav.dashboard,
        shortLabel: t.navShort.dashboard,
        icon: LayoutDashboard,
      },
      {
        to: "/dashboard/calendar",
        label: t.nav.calendar,
        shortLabel: t.navShort.calendar,
        icon: Calendar,
      },
      {
        to: "/dashboard/familles",
        label: t.nav.familles,
        shortLabel: t.navShort.familles,
        icon: Users,
      },
      {
        to: "/dashboard/paiements",
        label: t.nav.paiements,
        shortLabel: t.navShort.paiements,
        icon: CreditCard,
      },
      {
        to: "/dashboard/affiches",
        label: t.nav.affiches,
        shortLabel: t.navShort.affiches,
        icon: Images,
      },
      {
        to: "/dashboard/settings",
        label: t.nav.settings,
        shortLabel: t.navShort.settings,
        icon: Settings,
      },
    ],
    [t.nav, t.navShort],
  );

  const secondaryNav: NavItem[] = useMemo(() => [], []);

  return { topNav, secondaryNav, brand: t.shell.brand };
}

export function interpolate(template: string, vars: Record<string, string | number>) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => String(vars[key] ?? ""));
}
