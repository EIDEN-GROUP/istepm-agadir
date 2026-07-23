import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";
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

  return (
    <DashSidebarShell brand={brand} nav={nav} dir={dir}>
      <Outlet />
    </DashSidebarShell>
  );
}
