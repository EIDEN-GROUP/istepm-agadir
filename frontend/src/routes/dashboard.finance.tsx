import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { Wallet, AlertTriangle, TrendingUp, Users } from "lucide-react";
import { useIstpm } from "@/lib/istpm-store";
import { fmtMAD } from "@/lib/istpm-data";
import { PageHeader, DataTable } from "@/components/dash-page";
import { AreaTrend, DonutChart } from "@/components/dash-charts";
import { softCard, tableRow, cellTruncate, toneBadge, BRAND_CHART_COLORS } from "@/lib/dash-ui";
import { cn } from "@/lib/utils";
import type { Etudiant } from "@/lib/istpm-data";

/** Reste dû d'une fiche (mensualités non soldées). */
function resteDu(e: Etudiant): number {
  return e.paiementsMensuelsRecords
    .filter((r) => r.statut !== "paye")
    .reduce((s, r) => s + (r.montantDu - r.montantPaye), 0);
}

/**
 * Espace Finance (rôle `comptable`, visible aussi par la direction) :
 * encaissements, recouvrement, impayés à relancer et tendance mensuelle.
 * Lecture seule ici — les règlements se saisissent dans « Paiements ».
 */
function FinancePage() {
  const { financier, etudiants, paiements } = useIstpm();

  const aRelancer = useMemo(
    () =>
      etudiants
        .filter((e) => !e.archived && resteDu(e) > 0)
        .map((e) => ({ e, reste: resteDu(e) }))
        .sort((a, b) => b.reste - a.reste),
    [etudiants],
  );

  const tendance = useMemo(() => {
    const buckets = new Map<string, number>();
    for (const p of paiements) {
      if (p.statut !== "paye" || !p.date) continue;
      const k = String(p.date).slice(0, 7);
      buckets.set(k, (buckets.get(k) ?? 0) + p.montant);
    }
    return [...buckets.entries()]
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .slice(-12)
      .map(([name, value]) => ({ name, value }));
  }, [paiements]);

  const reste = financier.enAttente + financier.retard + financier.impaye;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Finance"
        title="Pilotage financier"
        actions={
          <Link
            to="/dashboard/paiements"
            className="inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-bold text-white shadow transition hover:bg-brand-dk"
          >
            <Wallet className="h-4 w-4" /> Saisir un règlement
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
        {[
          { label: "Encaissé", value: fmtMAD(financier.encaisse), icon: Wallet, tone: "teal" as const },
          { label: "Reste à recouvrer", value: fmtMAD(reste), icon: AlertTriangle, tone: "amber" as const },
          { label: "Taux de recouvrement", value: `${financier.tauxRecouvrement} %`, icon: TrendingUp, tone: "teal" as const },
          { label: "Comptes à relancer", value: String(aRelancer.length), icon: Users, tone: "amber" as const },
        ].map((k) => (
          <div key={k.label} className={cn(softCard, "flex items-center gap-3 p-4")}>
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand/10">
              <k.icon className="h-5 w-5 text-brand-dk" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {k.label}
              </span>
              <span className="block truncate font-display text-xl font-bold text-foreground">
                {k.value}
              </span>
            </span>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <DonutChart
          title="Reste par statut"
          data={[
            { name: "En attente", value: financier.enAttente },
            { name: "Retard", value: financier.retard },
            { name: "Impayé", value: financier.impaye },
          ]}
          palette={BRAND_CHART_COLORS}
        />
        <AreaTrend title="Encaissements mensuels" data={tendance} color="var(--istpm-blue)" />
      </div>

      <div className={cn(softCard, "overflow-hidden")}>
        <p className="px-4 pt-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground sm:px-5">
          À relancer ({aRelancer.length})
        </p>
        <DataTable
          isEmpty={aRelancer.length === 0}
          empty="Aucun impayé. Tout est recouvré."
          head={
            <>
              <th>Étudiant</th>
              <th>Filière</th>
              <th className="text-right">Reste dû</th>
              <th>Paiement</th>
            </>
          }
        >
          {aRelancer.slice(0, 50).map(({ e, reste }) => (
            <tr key={e.id} className={tableRow}>
              <td className={cn("font-medium", cellTruncate)}>
                {e.prenom} {e.nom}
              </td>
              <td className="text-muted-foreground">{e.filiere}</td>
              <td className="text-right font-semibold tabular-nums">{fmtMAD(reste)}</td>
              <td>
                <span className={toneBadge("amber")}>{e.paiement}</span>
              </td>
            </tr>
          ))}
        </DataTable>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/dashboard/finance")({
  component: FinancePage,
});
