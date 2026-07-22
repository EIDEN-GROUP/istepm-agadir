import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";
import { DashShell } from "@/components/dash-shell";
import { useDashboardI18n, useDashboardNav } from "@/lib/dashboard-i18n";

export const Route = createFileRoute("/dashboard")({
  beforeLoad: ({ location }) => {
    const token = localStorage.getItem("school_crm_token");
    if (!token) {
      throw redirect({ to: "/login", search: { redirect: location.href } });
    }
  },
  component: DashboardLayout,
});

function DashboardLayout() {
  const { dir } = useDashboardI18n();
  const { topNav, brand } = useDashboardNav();

  return (
    <DashShell
      brand={brand}
      brandColor="primary"
      variant="topnav"
      topNav={topNav}
      dir={dir}
    >
      <Outlet />
    </DashShell>
  );
}
