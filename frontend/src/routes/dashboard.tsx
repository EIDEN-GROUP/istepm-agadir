import { Outlet, createFileRoute, redirect, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { DashSidebarShell } from "@/components/dash-sidebar";
import { useDashboardI18n, useDashboardNav, canAccess } from "@/lib/dashboard-i18n";
import { getStoredRole, useAuth } from "@/lib/auth";

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
          <Outlet />
        </motion.div>
      </AnimatePresence>
    </DashSidebarShell>
  );
}
