import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  UserPlus,
  PenLine,
  Wallet,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import { useAuth, ROLE_META } from "@/lib/auth";
import { useIstpm } from "@/lib/istpm-store";
import { fmtMAD, fmtDate, type ActiviteItem } from "@/lib/istpm-data";
import {
  softCard,
  softCardHover,
  eyebrowClass,
  toneBadge,
  dashTooltip,
  renderPieLabel,
  CHART_COLORS,
  TONE_COLORS,
  avatarChip,
  initials,
} from "@/lib/dash-ui";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Petits blocs réutilisés par les trois variantes de tableau de bord */
/* ------------------------------------------------------------------ */

function KpiCard({
  label,
  value,
  hint,
  tone = "teal",
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: keyof typeof TONE_COLORS;
}) {
  return (
    <div className={cn(softCard, "p-5")}>
      <div
        className="mb-3 h-1.5 w-10 rounded-full"
        style={{ backgroundColor: TONE_COLORS[tone] }}
      />
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 font-display text-2xl font-bold tracking-tight text-foreground">
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function Section({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <h2 className="font-display text-lg font-bold tracking-tight text-foreground">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Compteur cliquable de la section « À traiter ». */
function TodoCard({
  label,
  count,
  to,
  tone = "teal",
}: {
  label: string;
  count: number;
  to: string;
  tone?: keyof typeof TONE_COLORS;
}) {
  return (
    <Link to={to} className={cn(softCardHover, "flex items-center gap-4 p-5")}>
      <span
        className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl font-display text-lg font-bold text-white"
        style={{ backgroundColor: TONE_COLORS[tone] }}
      >
        {count}
      </span>
      <span className="min-w-0 flex-1 text-sm font-medium text-foreground">
        {label}
      </span>
      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}

const ACTIVITE_ICON: Record<ActiviteItem["type"], typeof UserPlus> = {
  inscription: UserPlus,
  note: PenLine,
  paiement: Wallet,
};

function ActiviteFeed() {
  const { activite } = useIstpm();
  return (
    <div className={cn(softCard, "divide-y divide-brand/8")}>
      {activite.slice(0, 8).map((a, i) => {
        const Icon = ACTIVITE_ICON[a.type];
        return (
          <div key={i} className="flex items-start gap-3 px-5 py-3.5">
            <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand/12 text-brand-dk">
              <Icon className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm text-foreground">{a.texte}</span>
              <span className="block text-xs text-muted-foreground">
                {fmtDate(a.date)}
              </span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** Liste cliquable des étudiants en difficulté. */
function EtudiantsARisque() {
  const { etudiantsARisque } = useIstpm();
  return (
    <div className={cn(softCard, "overflow-hidden")}>
      {etudiantsARisque.length ? (
        <div className="divide-y divide-brand/8">
          {etudiantsARisque.map((e) => (
            <Link
              key={e.id}
              to="/dashboard/etudiants"
              className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-brand/8"
            >
              <span className={avatarChip}>
                {initials(`${e.prenom} ${e.nom}`)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-foreground">
                  {e.prenom} {e.nom}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {e.filiere} · {e.niveau}
                </span>
              </span>
              <span className={toneBadge("red")}>
                {e.moyenne > 0 ? `${e.moyenne.toFixed(2)}/20` : "Abandon"}
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <p className="px-5 py-8 text-center text-sm text-muted-foreground">
          Aucun étudiant à risque.
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sections                                                           */
/* ------------------------------------------------------------------ */

function SectionAcademique() {
  const {
    repartitionFiliere,
    repartitionNiveau,
    reussiteFiliere,
    etudiantsARisque,
  } = useIstpm();

  return (
    <Section title="Académique">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className={cn(softCard, "p-5")}>
          <p className={eyebrowClass}>Répartition par filière</p>
          <div className="mt-3 h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={repartitionFiliere}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="45%"
                  outerRadius="78%"
                  paddingAngle={2}
                  label={renderPieLabel}
                  labelLine={false}
                >
                  {repartitionFiliere.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={dashTooltip} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5">
            {repartitionFiliere.map((f, i) => (
              <span
                key={f.name}
                className="flex items-center gap-1.5 text-[11px] text-muted-foreground"
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{
                    backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
                  }}
                />
                {f.name} ({f.value})
              </span>
            ))}
          </div>
        </div>

        <div className={cn(softCard, "p-5")}>
          <p className={eyebrowClass}>Taux de réussite par filière (%)</p>
          <div className="mt-3 h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={reussiteFiliere}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11 }}
                  stroke="var(--muted-foreground)"
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 11 }}
                  stroke="var(--muted-foreground)"
                />
                <Tooltip contentStyle={dashTooltip} cursor={false} />
                <Bar dataKey="value" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={cn(softCard, "p-5")}>
          <p className={eyebrowClass}>Répartition par niveau</p>
          <div className="mt-3 h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={repartitionNiveau}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11 }}
                  stroke="var(--muted-foreground)"
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11 }}
                  stroke="var(--muted-foreground)"
                />
                <Tooltip contentStyle={dashTooltip} cursor={false} />
                <Bar dataKey="value" fill="var(--chart-2)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-3">
          <p className={cn(eyebrowClass, "flex items-center gap-1.5")}>
            <AlertTriangle className="h-3.5 w-3.5 text-alert" />
            Étudiants à risque ({etudiantsARisque.length})
          </p>
          <EtudiantsARisque />
        </div>
      </div>
    </Section>
  );
}

function SectionFinancier() {
  const { financier } = useIstpm();
  const cards = [
    { label: "Encaissé", value: fmtMAD(financier.encaisse), tone: "teal" },
    {
      label: "Encaissé ce mois",
      value: fmtMAD(financier.encaisseCeMois),
      tone: "teal",
    },
    { label: "En attente", value: fmtMAD(financier.enAttente), tone: "amber" },
    { label: "Retard", value: fmtMAD(financier.retard), tone: "red" },
    { label: "Impayé", value: fmtMAD(financier.impaye), tone: "red" },
    {
      label: "Taux de recouvrement",
      value: `${financier.tauxRecouvrement} %`,
      tone: "teal",
    },
  ] as const;

  return (
    <Section
      title="Financier"
      action={
        <Link
          to="/dashboard/paiements"
          className="text-xs font-semibold text-brand-dk hover:underline"
        >
          Voir les paiements
        </Link>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {cards.map((c) => (
          <KpiCard key={c.label} label={c.label} value={c.value} tone={c.tone} />
        ))}
      </div>
    </Section>
  );
}

function SectionATraiter({ role }: { role: "directeur" | "responsable" }) {
  const { aTraiter, aRelancer } = useIstpm();
  return (
    <Section title="À traiter">
      <div className="grid gap-4 lg:grid-cols-3">
        {role === "directeur" ? (
          <TodoCard
            label="Examens à venir (7 jours)"
            count={aTraiter.examensAVenir}
            to="/dashboard/examens"
          />
        ) : (
          <TodoCard
            label="Étudiants à relancer"
            count={aRelancer.length}
            to="/dashboard/paiements"
            tone="red"
          />
        )}
        <TodoCard
          label="Bulletins à publier"
          count={aTraiter.bulletinsAPublier}
          to="/dashboard/bulletins"
          tone="amber"
        />
        <TodoCard
          label="Stages à valider"
          count={aTraiter.stagesAValider}
          to="/dashboard/stages"
          tone="blue"
        />
      </div>
      <div className="space-y-3 pt-2">
        <p className={eyebrowClass}>Activité récente</p>
        <ActiviteFeed />
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/*  Les trois tableaux de bord                                         */
/* ------------------------------------------------------------------ */

function DashboardDirecteur() {
  const { dashboard, formateurs } = useIstpm();
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Étudiants inscrits"
          value={dashboard.totalInscrits}
          hint={`+${dashboard.deltaSemestre} ce semestre`}
        />
        <KpiCard
          label="Formateurs actifs"
          value={dashboard.formateursActifs}
          hint={`sur ${formateurs.length} au total`}
        />
        <KpiCard
          label="Taux de réussite global"
          value={`${dashboard.tauxReussite} %`}
          tone="blue"
        />
        <KpiCard
          label="Total à recouvrer"
          value={fmtMAD(dashboard.totalARecouvrer)}
          tone="red"
        />
      </div>
      <SectionAcademique />
      <SectionFinancier />
      <SectionATraiter role="directeur" />
    </>
  );
}

/** Vue enseignant : uniquement ses groupes, ses examens et ses modules. */
function DashboardEnseignant() {
  const { formateurs, examens, reussiteFiliere } = useIstpm();
  // Demo scoping: the signed-in teacher is the first formateur on file.
  const moi = formateurs[0];

  if (!moi) {
    return (
      <p className={cn(softCard, "p-8 text-center text-sm text-muted-foreground")}>
        Aucun formateur enregistré.
      </p>
    );
  }

  const mesExamens = examens.filter((x) => moi.modules.includes(x.module));
  const aNoter = mesExamens.filter((x) => x.statut !== "notes_saisies");
  const mesReussites = reussiteFiliere.filter(
    (r) => r.filiere === moi.departement,
  );

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Mes groupes" value={moi.groupes.length} />
        <KpiCard label="Mes modules" value={moi.modules.length} tone="blue" />
        <KpiCard
          label="Examens à noter"
          value={aNoter.length}
          tone={aNoter.length ? "red" : "teal"}
        />
        <KpiCard label="Notes saisies" value={moi.notesSaisies} />
      </div>

      <Section title="Mes groupes">
        <div className="flex flex-wrap gap-2">
          {moi.groupes.map((g) => (
            <span
              key={g}
              className="rounded-full bg-brand/12 px-4 py-2 text-sm font-semibold text-brand-dk"
            >
              {g}
            </span>
          ))}
        </div>
      </Section>

      <Section
        title="Examens à noter"
        action={
          <Link
            to="/dashboard/examens"
            className="text-xs font-semibold text-brand-dk hover:underline"
          >
            Tous mes examens
          </Link>
        }
      >
        <div className={cn(softCard, "overflow-hidden")}>
          {aNoter.length ? (
            <div className="divide-y divide-brand/8">
              {aNoter.map((x) => (
                <Link
                  key={x.id}
                  to="/dashboard/examens"
                  className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-brand/8"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-foreground">
                      {x.module}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {x.niveau} · {x.salle} · {fmtDate(x.date)}
                    </span>
                  </span>
                  <span className={toneBadge("amber")}>{x.composante}</span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="px-5 py-8 text-center text-sm text-muted-foreground">
              Toutes vos notes sont saisies.
            </p>
          )}
        </div>
      </Section>

      <Section title="Taux de réussite de mes modules">
        <div className={cn(softCard, "p-5")}>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mesReussites}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11 }}
                  stroke="var(--muted-foreground)"
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 11 }}
                  stroke="var(--muted-foreground)"
                />
                <Tooltip contentStyle={dashTooltip} cursor={false} />
                <Bar dataKey="value" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Département : {moi.departement}
          </p>
        </div>
      </Section>
    </>
  );
}

/** Vue responsable des affaires estudiantines. */
function DashboardResponsable() {
  const { dashboard, financier, stages } = useIstpm();
  const conventionsEnAttente = stages.filter((s) => !s.conventionSignee).length;

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Étudiants inscrits"
          value={dashboard.totalInscrits}
          hint={`+${dashboard.deltaSemestre} ce semestre`}
        />
        <KpiCard
          label="Taux de recouvrement"
          value={`${financier.tauxRecouvrement} %`}
          tone="blue"
        />
        <KpiCard
          label="Total à recouvrer"
          value={fmtMAD(dashboard.totalARecouvrer)}
          tone="red"
        />
        <KpiCard
          label="Conventions en attente"
          value={conventionsEnAttente}
          tone={conventionsEnAttente ? "amber" : "teal"}
        />
      </div>
      <SectionFinancier />
      <SectionATraiter role="responsable" />
    </>
  );
}

/* ------------------------------------------------------------------ */

function DashboardIndex() {
  const { role } = useAuth();

  return (
    <div className="space-y-8">
      <header>
        <p className={eyebrowClass}>
          {role ? ROLE_META[role].label : "Tableau de bord"}
        </p>
        <h1 className="mt-1 font-display text-3xl tracking-tight text-foreground md:text-4xl">
          Tableau de bord
        </h1>
      </header>

      {role === "enseignant" ? (
        <DashboardEnseignant />
      ) : role === "responsable" ? (
        <DashboardResponsable />
      ) : (
        <DashboardDirecteur />
      )}
    </div>
  );
}

export const Route = createFileRoute("/dashboard/")({
  component: DashboardIndex,
});
