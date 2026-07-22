import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { api } from "@/lib/api";
import { useDashboardI18n } from "@/lib/dashboard-i18n";
import { softCard, primaryPill } from "@/lib/dash-ui";
import { cn } from "@/lib/utils";

function DashboardIndex() {
  const { t } = useDashboardI18n();

  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => api.get<{
      totalClients: number;
      paidThisMonth: number;
      totalDebt: number;
      totalRevenue: number;
      activeClients: number;
      overdueCount: number;
    }>("/dashboard/stats"),
  });

  const { data: revenue } = useQuery({
    queryKey: ["monthly-revenue"],
    queryFn: () => api.get<Array<{ m: string; v: number }>>("/dashboard/monthly-revenue"),
  });

  if (!stats) return <div className="flex min-h-[50vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-[#28396C] border-t-transparent" /></div>;

  const cards = [
    { label: "Total familles", value: stats.totalClients, color: "bg-[#28396C]" },
    { label: "Payé ce mois", value: `${stats.paidThisMonth.toLocaleString("fr-FR")} MAD`, color: "bg-[#B5E18B]" },
    { label: "Dette totale", value: `${stats.totalDebt.toLocaleString("fr-FR")} MAD`, color: "bg-[#E25C5C]" },
    { label: "Revenu total", value: `${stats.totalRevenue.toLocaleString("fr-FR")} MAD`, color: "bg-[#F4C542]" },
    { label: "Clients actifs", value: stats.activeClients, color: "bg-[#7BA5D9]" },
    { label: "Impayés", value: stats.overdueCount, color: "bg-[#D2624A]" },
  ];

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Tableau de bord</p>
        <h1 className="mt-1 font-display text-3xl tracking-tight text-foreground md:text-4xl">Aperçu</h1>
      </header>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <div key={card.label} className={cn(softCard, "p-5")}>
            <div className={cn("mb-3 h-1.5 w-10 rounded-full", card.color)} />
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">{card.label}</p>
            <p className="mt-2 font-display text-2xl font-bold tracking-tight text-foreground">{card.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export const Route = createFileRoute("/dashboard/")({ component: DashboardIndex });