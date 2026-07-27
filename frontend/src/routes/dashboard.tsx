import { Outlet, createFileRoute, redirect, useLocation } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { DashSidebarShell } from "@/components/dash-sidebar";
import { useDashboardI18n, useDashboardNav } from "@/lib/dashboard-i18n";
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
