import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { api } from "@/lib/api";
import { softCard } from "@/lib/dash-ui";
import { cn } from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

function DashboardRapports() {
  const { data: revenue = [] } = useQuery({
    queryKey: ["monthly-revenue"],
    queryFn: () =>
      api.get<Array<{ m: string; v: number }>>("/dashboard/monthly-revenue"),
  });

  const { data: invoiceAnalytics = [] } = useQuery({
    queryKey: ["invoice-analytics"],
    queryFn: () =>
      api.get<Array<{ m: string; v: number }>>("/invoices/analytics"),
  });

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Rapports
        </p>
        <h1 className="mt-1 font-display text-3xl tracking-tight">
          Analytiques
        </h1>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className={cn(softCard, "p-5")}>
          <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Revenu mensuel (7 mois)
          </p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="m" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value: number) =>
                    `${value.toLocaleString("fr-FR")} MAD`
                  }
                />
                <Bar dataKey="v" fill="#28396C" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className={cn(softCard, "p-5")}>
          <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Facturation
          </p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={invoiceAnalytics}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="m" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value: number) =>
                    `${value.toLocaleString("fr-FR")} MAD`
                  }
                />
                <Bar dataKey="v" fill="#B5E18B" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/dashboard/rapports")({
  component: DashboardRapports,
});
