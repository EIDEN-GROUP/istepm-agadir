import { Outlet, createFileRoute, redirect, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { WifiOff, RefreshCw } from "lucide-react";
import { DashSidebarShell } from "@/components/dash-sidebar";
import { useDashboardI18n, useDashboardNav, canAccess } from "@/lib/dashboard-i18n";
import { getStoredRole, useAuth } from "@/lib/auth";
import { useIstpm } from "@/lib/istpm-store";

export const Route = createFileRoute("/dashboard")({
  // UI-only gate: no token, no network   just "has a role been picked yet?".
  beforeLoad: ({ location }) => {
    if (!getStoredRole()) {
      throw redirect({ to: "/login", search: { redirect: location.href } });
    }
  },
  component: DashboardLayout,
});

function DashboardLayout() {
  const { dir } = useDashboardI18n();
  const { role } = useAuth();
  const { nav, brand } = useDashboardNav(role);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  // Données 100 % serveur : en cas d'échec de synchronisation on l'affiche
  // au lieu de données inventées ou d'écrans vides silencieux.
  const { syncFailed, refresh } = useIstpm();

  // RBAC UI : renvoie un rôle vers ses destinations autorisées
  // (ex. un étudiant sur /dashboard/etudiants → son espace).
  useEffect(() => {
    if (!role) return;
    const clean = pathname.endsWith("/") && pathname !== "/" ? pathname.slice(0, -1) : pathname;
    if (!canAccess(role, clean)) {
      navigate({ to: role === "etudiant" ? "/dashboard/espace-etudiant" : "/dashboard" });
    }
  }, [role, pathname, navigate]);

  return (
    <DashSidebarShell brand={brand} nav={nav} dir={dir}>
      {/* Transition de page : chaque changement de route entre en fondu + léger
          glissement, pour un enchaînement fluide entre les écrans. */}
      <AnimatePresence mode="wait">
        <motion.div
          key={pathname}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
        >
          {syncFailed ? (
            <div
              role="alert"
              className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-alert/30 bg-alert/10 px-4 py-3 text-sm"
            >
              <WifiOff className="h-4 w-4 shrink-0 text-alert" />
              <p className="min-w-0 flex-1 text-alert-dk">
                Serveur injoignable — les données affichées peuvent être incomplètes.
              </p>
              <button
                type="button"
                onClick={() => void refresh().catch(() => {})}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-xs font-semibold text-alert-dk ring-1 ring-inset ring-alert/30 transition hover:bg-alert/10"
              >
                <RefreshCw className="h-3 w-3" /> Réessayer
              </button>
            </div>
          ) : null}
          <Outlet />
        </motion.div>
      </AnimatePresence>
    </DashSidebarShell>
  );
}
