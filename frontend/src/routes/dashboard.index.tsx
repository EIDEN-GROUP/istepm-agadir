import { createFileRoute, Link } from "@tanstack/react-router";
import { type ReactNode, type ComponentType, useMemo, useRef, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  fetchStudentMe,
  fetchStudentCalendar,
  fetchStudentRequests,
  fetchStudentNotifications,
} from "@/lib/istpm-api";
import { motion, animate, useInView } from "framer-motion";
import {
  UserPlus,
  PenLine,
  Wallet,
  ArrowRight,
  Calendar,
  Clock,
  BookOpen,
  Users,
  MapPin,
  AlertCircle,
  CheckCircle2,
  Building2,
  GraduationCap,
  Plus,
  LayoutGrid,
  BarChart3,
  CalendarRange,
  Search,
  Bell,
  MessageSquare,
  Activity,
  type LucideProps,
} from "lucide-react";
import { useAuth, ROLE_META } from "@/lib/auth";
import { useIstpm, useCurrentFormateur } from "@/lib/istpm-store";
import {
  fmtMAD,
  fmtDate,
  type ActiviteItem,
  type Seance,
  type Examen,
  type Bulletin,
  TYPE_SEANCE_LABEL,
  STATUT_EXAMEN_LABEL,
  TYPE_EXAMEN_LABEL,
  minutesDepuisMinuit,
  type Formateur,
} from "@/lib/istpm-data";
import { PersonAvatar } from "@/components/person-avatar";
import {
  softCard,
  toneBadge,
  TONE_COLORS,
  primaryPill,
  eyebrowClass,
  dashTooltip,
  dashCursor,
  BRAND_CHART_COLORS,
  dialogSurfaceWide,
} from "@/lib/dash-ui";
import { DetailShell, DetailSection } from "@/components/dash-page";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { DashTabs, DashTabPanel, type DashTab } from "@/components/dash-tabs";
import { AreaTrend, LineTrend, BarSeries, HBarSeries, DonutChart, GroupedBarSeries, type ChartDatum, type GroupedDatum } from "@/components/dash-charts";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

// Mois dans l'ordre académique (septembre → juin), étiquettes courtes pour l'axe.
const MOIS_ACAD = ["Sep","Oct","Nov","Déc","Jan","Fév","Mar","Avr","Mai","Jun"];
const JOURS = ["Dim","Lun","Mar","Mer","Jeu","Ven","Sam"];
const today = new Date().toISOString().slice(0, 10);

/* ------------------------------------------------------------------ */
/*  Animated Number â€” compteur progressif                              */
/* ------------------------------------------------------------------ */

function AnimatedNumber({ value, suffix = "" }: { value: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const [display, setDisplay] = useState(0);
  const done = useRef(false);
  const prevRef = useRef(0);

  useEffect(() => { done.current = false; }, [value]);

  useEffect(() => {
    if (!inView || done.current) return;
    done.current = true;
    const start = prevRef.current;
    prevRef.current = value;
    const ctrl = animate(start, value, {
      duration: 0.9,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    return ctrl.stop;
  }, [inView, value]);

  useEffect(() => { if (value === 0) { setDisplay(0); prevRef.current = 0; } }, [value]);
  useEffect(() => { if (inView) done.current = true; }, [inView]);

  return <span ref={ref}>{display.toLocaleString("fr-FR")}{suffix}</span>;
}

/* ------------------------------------------------------------------ */
/*  Tabs navigation helper                                             */
/* ------------------------------------------------------------------ */

function useTabs(initial = 0) {
  const [tab, setTab] = useState(initial);
  const dir = useRef(1);
  return {
    tab,
    setTab: (next: number) => { dir.current = next >= tab ? 1 : -1; setTab(next); },
    direction: dir.current,
  };
}

/* ------------------------------------------------------------------ */
/*  Header   solid brand band                                          */
/* ------------------------------------------------------------------ */

function DashHero({ chips }: { chips: { label: string; value: string | number }[] }) {
  const { role, user } = useAuth();
  const h = new Date().getHours();
  const greeting = h < 12 ? "Bonjour" : h < 18 ? "Bon après-midi" : "Bonsoir";
  const dateStr = new Date().toLocaleDateString("fr-FR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  return (
    <motion.header
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="space-y-4"
    >
      {/* Ligne principale   salutation + recherche + actions (style reference) */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-[2rem] sm:leading-tight">
            {greeting}{user?.name ? `, ${user.name}` : ""}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {role ? ROLE_META[role].label : "Tableau de bord"} <span aria-hidden>·</span> <span className="capitalize">{dateStr}</span>
          </p>
        </div>

        {chips.length ? (
        <div className="flex flex-wrap gap-2.5">
          {chips.map((c) => (
            <div
              key={c.label}
              className="rounded-2xl border border-brand/10 bg-card px-4 py-2.5 shadow-[var(--elevation-1)]"
            >
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{c.label}</p>
              <p className="mt-1 font-display text-lg font-bold leading-none text-foreground">{c.value}</p>
            </div>
          ))}
        </div>
      ) : null}

        {/* <div className="flex w-full items-center gap-2.5 sm:w-auto">
          <div className="flex h-12 min-w-0 flex-1 items-center gap-2 rounded-full border border-brand/10 bg-card ps-4 pe-1.5 shadow-[var(--elevation-1)] transition-shadow focus-within:shadow-[var(--elevation-2)] sm:flex-none">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              type="search"
              aria-label="Rechercher"
              placeholder="Rechercher..."
              className="w-full min-w-0 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/70 sm:w-44"
            />
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink text-white transition-transform active:scale-95">
              <Search className="h-4 w-4" />
            </span>
          </div>
          <button
            type="button"
            aria-label="Messages"
            className="relative grid h-11 w-11 shrink-0 place-items-center rounded-full border border-brand/10 bg-card text-muted-foreground shadow-[var(--elevation-1)] transition-colors hover:text-brand-dk"
          >
            <MessageSquare className="h-[18px] w-[18px]" />
            <span aria-hidden className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-alert ring-2 ring-card" />
          </button>
          <button
            type="button"
            aria-label="Notifications"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-brand/10 bg-card text-muted-foreground shadow-[var(--elevation-1)] transition-colors hover:text-brand-dk"
          >
            <Bell className="h-[18px] w-[18px]" />
          </button>
        </div> */}
      </div>

      
    </motion.header>
  );
}

/* ------------------------------------------------------------------ */
/*  Workspace shell â€” tabs + animated panel                            */
/* ------------------------------------------------------------------ */

function DashWorkspace({
  tabs, tab, onChange, direction, children,
}: {
  tabs: DashTab[]; tab: number; onChange: (i: number) => void; direction: number; children: ReactNode;
}) {
  return (
    <div className="space-y-6">
      <div className="sticky top-2 z-20 flex">
        <DashTabs tabs={tabs} active={tab} onChange={onChange} />
      </div>
      <DashTabPanel key={tab} index={tab} direction={direction}>
        {children}
      </DashTabPanel>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Reusable UI blocks                                                 */
/* ------------------------------------------------------------------ */

/**
 * Tiny decorative sparkline (SVG polyline) shown inside each stat card, echoing
 * the reference dashboard's mini-charts. Shape is deterministic per `seed` so a
 * card always draws the same curve   it is visual texture, not a data series.
 */
function sparkPath(seed: number, n = 11) {
  const pts: number[] = [];
  for (let i = 0; i < n; i++) {
    pts.push(50 + 30 * Math.sin(i / 1.6 + seed) + 14 * Math.sin(i / 0.7 + seed * 1.7) + i * 1.5);
  }
  return pts;
}

function Sparkline({ seed, stroke, w = 72, h = 34 }: { seed: number; stroke: string; w?: number; h?: number }) {
  const data = sparkPath(seed);
  const max = Math.max(...data), min = Math.min(...data), rng = max - min || 1;
  const coords = data.map((v, i) => [
    (i / (data.length - 1)) * w,
    h - 3 - ((v - min) / rng) * (h - 6),
  ]);
  const line = coords.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  const area = `${line} L${w} ${h} L0 ${h} Z`;
  const gid = `spark-${seed}-${Math.round(max)}`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden className="shrink-0">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity={0.22} />
          <stop offset="100%" stopColor={stroke} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function seedOf(label: string) {
  let s = 0;
  for (let i = 0; i < label.length; i++) s += label.charCodeAt(i);
  return (s % 9) + 1;
}

function KpiCard({
  label, value, hint, tone = "teal", icon: Icon, accent = false, spark = true,
}: {
  label: string; value: string | number; hint?: string;
  tone?: keyof typeof TONE_COLORS;
  icon?: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  /** Filled brand-teal treatment for the lead metric (reference dashboard). */
  accent?: boolean;
  /** Show the decorative mini-chart (default true). */
  spark?: boolean;
}) {
  const sparkColor = accent ? "#ffffff" : TONE_COLORS[tone];
  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ type: "spring", stiffness: 350, damping: 25 }}
      className={cn(
        "group relative overflow-hidden p-4 sm:p-5",
        accent
          ? "rounded-3xl bg-gradient-to-br from-med to-med-dk text-white shadow-[0_18px_40px_-18px_rgb(var(--istpm-shadow)/0.6)]"
          : cn(softCard, "transition-shadow duration-300 hover:[box-shadow:var(--edge-highlight),var(--elevation-4)]"),
      )}
    >
      {accent ? (
        <span aria-hidden className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-white/10 blur-xl" />
      ) : (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          style={{ backgroundColor: `${TONE_COLORS[tone]}08` }}
        />
      )}

      {/* En-tête : petite icône + libellé (style reference) */}
      <div className="relative flex items-center gap-2">
        {Icon ? (
          <span
            className={cn(
              "grid h-8 w-8 shrink-0 place-items-center rounded-xl transition-transform duration-300 group-hover:scale-110",
              accent && "bg-white/15 ring-1 ring-inset ring-white/25",
            )}
            style={accent ? undefined : {
              background: `linear-gradient(135deg, ${TONE_COLORS[tone]}26, ${TONE_COLORS[tone]}0d)`,
              boxShadow: `inset 0 0 0 1px ${TONE_COLORS[tone]}2b`,
            }}
          >
            <Icon className="h-[15px] w-[15px]" style={accent ? { color: "#fff" } : { color: TONE_COLORS[tone] }} />
          </span>
        ) : null}
        <p className={cn(
          "min-w-0 truncate text-[10px] font-semibold uppercase tracking-[0.14em] sm:text-[11px]",
          accent ? "text-white/75" : "text-muted-foreground",
        )}>
          {label}
        </p>
      </div>

      {/* Valeur + sparkline */}
      <div className="relative mt-3 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className={cn(
            "font-display text-2xl font-bold tracking-tight sm:text-3xl",
            accent ? "text-white" : "text-foreground",
          )}>
            {typeof value === "number" && !hint ? <AnimatedNumber value={value} /> : value}
          </p>
          {hint ? <p className={cn("mt-1 truncate text-xs", accent ? "text-white/70" : "text-muted-foreground")}>{hint}</p> : null}
        </div>
        {spark ? <Sparkline seed={seedOf(label)} stroke={sparkColor} /> : null}
      </div>
    </motion.div>
  );
}

function KpiGrid({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: 0.04 } } }}
      className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-5"
    >
      {children}
    </motion.div>
  );
}

/**
 * Combined « Taux de réussite » / « Total à recouvrer » card.
 *
 * A segmented switch flips between the two metrics; each shows its headline
 * figure and a compact bar chart (success rate per filière, or the outstanding
 * amount broken down by payment status). Spans two columns so it flexes in the
 * KPI grid beside the four stat cards.
 */
type PerfMetric = "reussite" | "recouvrement";

/** Recouvrement palette   teal / amber / coral (reference « Mail Statistic » donut). */
const RECOUV_COLORS = ["#029994", "#f0a92e", "#ee6c4d"];

type PieDatum = { name: string; value: number; color: string };

/** White percentage label centred on each pie slice (skips tiny slivers). */
function renderPiePct({
  cx, cy, midAngle, innerRadius, outerRadius, percent,
}: {
  cx: number; cy: number; midAngle: number;
  innerRadius: number; outerRadius: number; percent: number;
}) {
  if (percent < 0.05) return null;
  const RAD = Math.PI / 180;
  // Sur un camembert plein (innerRadius 0), on place l'étiquette vers le centre
  // de masse de la part (~0,6 du rayon) plutôt qu'à mi-hauteur de l'anneau.
  const r = innerRadius + (outerRadius - innerRadius) * 0.6;
  const x = cx + r * Math.cos(-midAngle * RAD);
  const y = cy + r * Math.sin(-midAngle * RAD);
  return (
    <text
      x={x}
      y={y}
      fill="#ffffff"
      fontSize={12}
      fontWeight={700}
      textAnchor="middle"
      dominantBaseline="central"
    >
      {Math.round(percent * 100)}%
    </text>
  );
}

/**
 * Camembert plein : chaque part est remplie jusqu'au centre, la valeur en %
 * imprimée en blanc dessus, avec une fine séparation blanche entre les parts,
 * accompagné d'une légende à pastilles de couleur.
 */
function RecouvrementPie({ data }: { data: PieDatum[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={0}
          outerRadius="92%"
          paddingAngle={0}
          startAngle={90}
          endAngle={-270}
          stroke="var(--card)"
          strokeWidth={2}
          labelLine={false}
          label={renderPiePct}
          animationDuration={600}
        >
          {data.map((d, i) => (
            <Cell key={i} fill={d.color} />
          ))}
        </Pie>
        <Tooltip contentStyle={dashTooltip} formatter={(v: number, n: string) => [fmtMAD(v), n]} />
      </PieChart>
    </ResponsiveContainer>
  );
}

function MetricSwitchChart({
  reussite, aRecouvrer, reussiteData, recouvrementData,
}: {
  reussite: number;
  aRecouvrer: number;
  reussiteData: ChartDatum[];
  recouvrementData: ChartDatum[];
}) {
  const [metric, setMetric] = useState<PerfMetric>("reussite");
  const isReussite = metric === "reussite";
  const color = "var(--chart-2)";
  const gid = "msc-reussite";

  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ type: "spring", stiffness: 350, damping: 25 }}
      className={cn(softCard, "flex flex-col p-4 sm:p-5")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={eyebrowClass}>
            {isReussite ? "Taux de réussite" : "Total À recouvrer"}
          </p>
          <p className="mt-1 font-display text-2xl font-bold leading-none tracking-tight text-foreground">
            {isReussite ? `${reussite} %` : fmtMAD(aRecouvrer)}
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Choisir la métrique"
          className="flex shrink-0 items-center gap-1 rounded-full border border-brand/12 bg-muted/60 p-1"
        >
          {(
            [
              ["reussite", "Réussite"],
              ["recouvrement", "Recouvrement"],
            ] as const
          ).map(([key, tabLabel]) => {
            const active = metric === key;
            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setMetric(key)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                  active
                    ? "bg-brand text-white shadow-[0_2px_8px_-3px_rgb(var(--istpm-shadow)/0.5)]"
                    : "text-muted-foreground hover:text-brand-dk",
                )}
              >
                {tabLabel}
              </button>
            );
          })}
        </div>
      </div>

      {/* Fondu doux au changement de métrique. Le conteneur garde une hauteur
          fixe et reste monté, pour que ResponsiveContainer mesure tout de suite
          (pas de « blanc » au basculement). */}
      <div className="relative mt-3 h-[172px]">
        {isReussite ? (
          <motion.div
            key="reussite"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="h-full w-full"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={reussiteData} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={0.95} />
                    <stop offset="100%" stopColor={color} stopOpacity={0.5} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.5} stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} stroke="var(--muted-foreground)" />
                <YAxis
                  width={34}
                  allowDecimals={false}
                  domain={[0, 100]}
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  stroke="var(--muted-foreground)"
                />
                <Tooltip contentStyle={dashTooltip} cursor={dashCursor} formatter={(v: number) => [`${v} %`, "Réussite"]} />
                <Bar dataKey="value" maxBarSize={34} radius={[6, 6, 0, 0]} fill={`url(#${gid})`} animationDuration={600} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        ) : (
          <motion.div
            key="recouvrement"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="flex h-full items-center gap-4"
          >
            <div className="h-full w-[52%] shrink-0">
              <RecouvrementPie
                data={recouvrementData.map((d, i) => ({
                  ...d,
                  color: RECOUV_COLORS[i % RECOUV_COLORS.length],
                }))}
              />
            </div>
            <ul className="min-w-0 flex-1 space-y-3.5">
              {recouvrementData.map((d, i) => (
                <li key={d.name} className="flex items-center gap-2.5">
                  <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: RECOUV_COLORS[i % RECOUV_COLORS.length] }} />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-foreground">{d.name}</span>
                    <span className="block text-xs text-muted-foreground">{fmtMAD(d.value)}</span>
                  </span>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}


function Section({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="space-y-3.5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h2 className="flex items-center gap-2 font-display text-base font-bold tracking-tight text-foreground sm:text-lg">
          <span aria-hidden className="h-4 w-1 rounded-full bg-brand" />
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function SectionLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className="group inline-flex items-center gap-1 text-xs font-semibold text-brand-dk transition-colors hover:text-brand">
      {children}
      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

function TableCard({ children }: { children: ReactNode }) {
  return <div className={cn(softCard, "overflow-hidden")}><div className="overflow-x-auto">{children}</div></div>;
}

function EmptyState({ icon: Icon, children }: { icon: ComponentType<LucideProps>; children: ReactNode }) {
  return (
    <div className={cn(softCard, "flex flex-col items-center gap-2 px-5 py-10 text-center text-sm text-muted-foreground")}>
      <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand/10 text-brand-dk">
        <Icon className="h-5 w-5" />
      </span>
      {children}
    </div>
  );
}

const ACTIVITE_ICON: Record<ActiviteItem["type"], typeof UserPlus> = {
  inscription: UserPlus,
  note: PenLine,
  paiement: Wallet,
};

function ActiviteFeed() {
  // Fil dérivé des lignes serveur (jamais de session seule) : derniers examens
  // notés, derniers stages, derniers paiements — triés par date décroissante.
  const { examens, stages, etudiants } = useIstpm();
  const items: ActiviteItem[] = useMemo(() => {
    const out: ActiviteItem[] = [];
    for (const x of examens) {
      if (x.statut !== "notes_saisies" || !x.date) continue;
      out.push({
        type: "note",
        texte: `Notes saisies — ${x.module} (${x.classe})`,
        date: x.date,
      });
    }
    for (const s of stages) {
      if (!s.debut) continue;
      out.push({
        type: "inscription",
        texte: `Stage — ${s.prenom} ${s.nom} · ${s.structure}`,
        date: s.debut,
      });
    }
    const nomParId = new Map(etudiants.map((e) => [e.id, `${e.prenom} ${e.nom}`]));
    for (const e of etudiants) {
      for (const r of e.paiementsMensuelsRecords ?? []) {
        if (r.statut !== "paye" || !r.datePaiement) continue;
        out.push({
          type: "paiement",
          texte: `Paiement reçu — ${r.montantPaye.toLocaleString("fr-FR")} MAD (${nomParId.get(r.etudiantId) ?? "étudiant"})`,
          date: r.datePaiement.slice(0, 10),
        });
      }
    }
    return out.sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 8);
  }, [examens, stages, etudiants]);
  if (!items.length) {
    return (
      <div className={cn(softCard, "px-5 py-10 text-center text-sm text-muted-foreground")}>
        Aucune activité récente.
      </div>
    );
  }
  return (
    <div className={cn(softCard, "divide-y divide-brand/8 overflow-hidden")}>
      {items.map((a, i) => {
        const Icon = ACTIVITE_ICON[a.type];
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.03, duration: 0.25 }}
            className="flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-brand/6 sm:px-5"
          >
            <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand/12 text-brand-dk">
              <Icon className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm text-foreground">{a.texte}</span>
              <span className="block text-xs text-muted-foreground">{fmtDate(a.date)}</span>
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}

function MeterRow({ label, ratio, color, detail, onClick }: {
  label: string; ratio: number; color: string; detail: ReactNode; onClick?: () => void;
}) {
  const cls = "flex w-full flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 text-left transition-colors hover:bg-brand/6 sm:px-5";
  const inner = (
    <>
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{label}</span>
      <div className="order-3 h-2 w-full overflow-hidden rounded-full bg-brand/12 sm:order-none sm:w-24">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(ratio, 1) * 100}%` }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
        />
      </div>
      <span className="whitespace-nowrap text-xs text-muted-foreground">{detail}</span>
    </>
  );
  if (onClick) return <button type="button" onClick={onClick} className={cn(cls, "cursor-pointer")}>{inner}</button>;
  return <div className={cls}>{inner}</div>;
}

/**
 * Sélecteur de période « du … à … ».
 *
 * Les bornes sont facultatives et inclusives : laisser un champ vide revient à
 * ne pas borner ce côté. Les dates sont au format ISO (« AAAA-MM-JJ »), donc la
 * comparaison lexicographique suffit pour filtrer.
 */
function DateRangeFilter({ du, a, onDu, onA }: {
  du: string; a: string; onDu: (v: string) => void; onA: (v: string) => void;
}) {
  const champ = "h-9 rounded-xl border border-brand/20 bg-card px-2.5 text-xs text-foreground shadow-none transition-colors hover:border-brand/35 focus-visible:border-brand focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/15";
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Du
        <input type="date" value={du} max={a || undefined} onChange={(e) => onDu(e.target.value)} className={champ} aria-label="Date de début" />
      </label>
      <label className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        À
        <input type="date" value={a} min={du || undefined} onChange={(e) => onA(e.target.value)} className={champ} aria-label="Date de fin" />
      </label>
      {du || a ? (
        <button type="button" onClick={() => { onDu(""); onA(""); }} className="rounded-lg px-2 py-1 text-[11px] font-semibold text-brand-dk transition-colors hover:bg-brand/10">
          Réinitialiser
        </button>
      ) : null}
    </div>
  );
}

const TH = "border-b border-brand/15 bg-muted text-[11px] font-semibold uppercase tracking-wider text-muted-foreground";

/* ------------------------------------------------------------------ */
/*  Tables â€” shared across dashboards                                  */
/* ------------------------------------------------------------------ */

function AujourdhuiTable({ seances }: { seances: Seance[] }) {
  const { formateurs } = useIstpm();
  if (!seances.length) return <EmptyState icon={Calendar}>Aucune séance prévue aujourd&rsquo;hui.</EmptyState>;
  const tri = seances.slice().sort((a, b) => (a.debut < b.debut ? -1 : 1));
  return (
    <>
      <div className={cn(softCard, "divide-y divide-brand/8 overflow-hidden md:hidden")}>
        {tri.map((s) => {
          const prof = formateurs.find((f) => f.id === s.professeurId);
          return (
            <div key={s.id} className="space-y-1.5 px-4 py-3.5">
              <div className="flex items-start justify-between gap-3">
                <span className="text-sm font-semibold text-foreground">{s.module}</span>
                <span className={toneBadge("blue")}>{TYPE_SEANCE_LABEL[s.type]}</span>
              </div>
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />{s.debut} - {s.fin}<span aria-hidden>Â·</span>{s.salle}<span aria-hidden>Â·</span>{s.groupe}
              </p>
              <p className="text-xs text-muted-foreground">{prof ? `${prof.prenom} ${prof.nom}` : s.professeurId}</p>
            </div>
          );
        })}
      </div>
      <div className="hidden md:block">
        <TableCard>
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className={TH}>
              <tr>
                <th className="px-4 py-3">Horaire</th>
                <th className="px-4 py-3">Module</th>
                <th className="px-4 py-3">Professeur</th>
                <th className="px-4 py-3">Groupe</th>
                <th className="px-4 py-3">Salle</th>
                <th className="px-4 py-3">Type</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand/8">
              {tri.map((s) => {
                const prof = formateurs.find((f) => f.id === s.professeurId);
                return (
                  <tr key={s.id} className="h-13 transition-colors hover:bg-brand/6 [&_td]:first:pl-4">
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />{s.debut} - {s.fin}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-foreground">{s.module}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{prof ? `${prof.prenom} ${prof.nom}` : s.professeurId}</td>
                    <td className="whitespace-nowrap px-4 py-3">{s.groupe}</td>
                    <td className="whitespace-nowrap px-4 py-3">{s.salle}</td>
                    <td className="whitespace-nowrap px-4 py-3"><span className={toneBadge("blue")}>{TYPE_SEANCE_LABEL[s.type]}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableCard>
      </div>
    </>
  );
}

function ExamensRecentsTable({ examens }: { examens: Examen[] }) {
  if (!examens.length) return <EmptyState icon={BookOpen}>Aucun examen.</EmptyState>;
  const tone = (s: string) => s === "notes_saisies" ? "teal" as const : s === "en_cours" ? "blue" as const : "amber" as const;
  const lbl = (s: string) => s === "planifie" ? "Planifié" : s === "en_cours" ? "En cours" : "Notes saisies";
  const rows = examens.slice(0, 6);
  return (
    <>
      <div className={cn(softCard, "divide-y divide-brand/8 overflow-hidden sm:hidden")}>
        {rows.map((ex) => (
          <div key={ex.id} className="space-y-1.5 px-4 py-3.5">
            <div className="flex items-start justify-between gap-3">
              <span className="text-sm font-semibold text-foreground">{ex.titre}</span>
              <span className={toneBadge(tone(ex.statut))}>{lbl(ex.statut)}</span>
            </div>
            <p className="text-xs text-muted-foreground">{ex.module} Â· {ex.classe} Â· {fmtDate(ex.date)}</p>
          </div>
        ))}
      </div>
      <div className="hidden sm:block">
        <TableCard>
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className={TH}>
              <tr><th className="px-4 py-3">Titre</th><th className="px-4 py-3">Module</th><th className="px-4 py-3">Groupe</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Statut</th></tr>
            </thead>
            <tbody className="divide-y divide-brand/8">
              {rows.map((ex) => (
                <tr key={ex.id} className="h-13 transition-colors hover:bg-brand/6">
                  <td className="max-w-[12rem] truncate whitespace-nowrap px-4 py-3 font-medium text-foreground">{ex.titre}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{ex.module}</td>
                  <td className="whitespace-nowrap px-4 py-3">{ex.classe}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{fmtDate(ex.date)}</td>
                  <td className="whitespace-nowrap px-4 py-3"><span className={toneBadge(tone(ex.statut))}>{lbl(ex.statut)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableCard>
      </div>
    </>
  );
}

function BulletinsRecentsTable({ bulletins }: { bulletins: Bulletin[] }) {
  const { photoDe } = useIstpm();
  if (!bulletins.length) return <EmptyState icon={GraduationCap}>Aucun bulletin.</EmptyState>;
  const dt = (d: string) => d === "Admis" ? "teal" as const : d === "Ajourné" || d === "échec" ? "red" as const : d === "Rattrapage" ? "amber" as const : "neutral" as const;
  const st = (s: string) => s === "publie" ? "teal" as const : s === "valide" ? "blue" as const : "amber" as const;
  const sl = (s: string) => s === "publie" ? "Publié" : s === "valide" ? "Validé" : "Brouillon";
  const rows = bulletins.slice(0, 6);
  return (
    <>
      <div className={cn(softCard, "divide-y divide-brand/8 overflow-hidden sm:hidden")}>
        {rows.map((b) => (
          <div key={b.id} className="space-y-2 px-4 py-3.5">
            <div className="flex items-center gap-2">
              <PersonAvatar name={`${b.prenom} ${b.nom}`} photoUrl={photoDe(b.cne)} size="xs" />
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{b.prenom} {b.nom}</span>
              <span className="font-display text-sm font-bold text-foreground">{b.moyenne.toFixed(2)}</span>
            </div>
            <p className="text-xs text-muted-foreground">{b.filiere} Â· {b.niveau}</p>
            <div className="flex flex-wrap gap-1.5">
              <span className={toneBadge(dt(b.decision))}>{b.decision}</span>
              <span className={toneBadge(st(b.statut))}>{sl(b.statut)}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="hidden sm:block">
        <TableCard>
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className={TH}>
              <tr><th className="px-4 py-3">étudiant</th><th className="px-4 py-3">Filière</th><th className="px-4 py-3">Niveau</th><th className="px-4 py-3">Moyenne</th><th className="px-4 py-3">Décision</th><th className="px-4 py-3">Statut</th></tr>
            </thead>
            <tbody className="divide-y divide-brand/8">
              {rows.map((b) => (
                <tr key={b.id} className="h-13 transition-colors hover:bg-brand/6">
                  <td className="whitespace-nowrap px-4 py-3">
                    <span className="flex items-center gap-2">
                      <PersonAvatar name={`${b.prenom} ${b.nom}`} photoUrl={photoDe(b.cne)} size="xs" />
                      <span className="font-medium text-foreground">{b.prenom} {b.nom}</span>
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{b.filiere}</td>
                  <td className="whitespace-nowrap px-4 py-3">{b.niveau}</td>
                  <td className="whitespace-nowrap px-4 py-3 font-medium">{b.moyenne.toFixed(2)}</td>
                  <td className="whitespace-nowrap px-4 py-3"><span className={toneBadge(dt(b.decision))}>{b.decision}</span></td>
                  <td className="whitespace-nowrap px-4 py-3"><span className={toneBadge(st(b.statut))}>{sl(b.statut)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableCard>
      </div>
    </>
  );
}

function StudentAvatarList({ etudiants }: { etudiants: { id: string; prenom: string; nom: string; filiere: string; niveau: string; photoUrl?: string }[] }) {
  if (!etudiants.length) return <EmptyState icon={Users}>Aucun étudiant.</EmptyState>;
  return (
    <div className={cn(softCard, "divide-y divide-brand/8 overflow-hidden")}>
      {etudiants.slice(0, 6).map((e) => (
        <Link key={e.id} to="/dashboard/etudiants" className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-brand/8 sm:px-5">
          <PersonAvatar name={`${e.prenom} ${e.nom}`} photoUrl={e.photoUrl} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-foreground">{e.prenom} {e.nom}</span>
            <span className="block truncate text-xs text-muted-foreground">{e.filiere} Â· {e.niveau}</span>
          </span>
          <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-brand" />
        </Link>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Director Dashboard                                                 */
/* ------------------------------------------------------------------ */

const DIRECTOR_TABS: DashTab[] = [
  { label: "Vue d'ensemble", short: "Ensemble", icon: LayoutGrid },
  { label: "Académique", icon: GraduationCap },
  { label: "Analyse", icon: BarChart3 },
];

function DashboardDirecteur() {
  const { tab, setTab, direction } = useTabs();
  const { dashboard, financier, reussiteFiliere, formateurs, seances, examens, etudiants, aTraiter, repartitionFiliere, repartitionNiveau } = useIstpm();

  // Décomposition du « reste à recouvrer » par statut de paiement, pour le graphe.
  const recouvrementData = useMemo<ChartDatum[]>(() => [
    { name: "En attente", value: financier.enAttente },
    { name: "Retard", value: financier.retard },
    { name: "Impayé", value: financier.impaye },
  ], [financier]);

  const seancesAujourdhui = useMemo(() => seances.filter((s) => s.date === today), [seances]);
  // « Étudiants actifs » = ceux dont la scolarité est en cours (statut inscrit),
  // hors diplômés, abandons et dossiers en attente.
  const etudiantsActifs = useMemo(() => etudiants.filter((e) => e.statut === "inscrit").length, [etudiants]);
  // « Examens par mois » suit l'année scolaire : septembre (index 0) → juin.
  const examensParMois = useMemo(() => { const c = new Array(MOIS_ACAD.length).fill(0); examens.forEach((ex) => { const idx = (new Date(ex.date).getMonth() - 8 + 12) % 12; if (idx < MOIS_ACAD.length) c[idx]++; }); return MOIS_ACAD.map((n, i) => ({ name: n, value: c[i] })); }, [examens]);
  const sessionsParJour = useMemo(() => { const c = new Array(7).fill(0); seances.forEach((s) => c[new Date(s.date).getDay()]++); return JOURS.map((n, i) => ({ name: n, value: c[i] })); }, [seances]);
  // « Charge des formateurs » se lit sur une période choisie (bornes incluses,
  // vides = pas de borne). Le compte des séances et la modale de détail
  // s'appuient tous deux sur cette même sélection.
  const [chargeDu, setChargeDu] = useState("");
  const [chargeA, setChargeA] = useState("");
  const seancesPeriode = useMemo(
    () => seances.filter((s) => (!chargeDu || s.date >= chargeDu) && (!chargeA || s.date <= chargeA)),
    [seances, chargeDu, chargeA],
  );
  const chargeFormateurs = useMemo(() => formateurs.filter((f) => f.statut !== "en_conge").map((f) => ({ id: f.id, nom: `${f.prenom} ${f.nom}`, seances: seancesPeriode.filter((s) => s.professeurId === f.id).length, groupes: f.groupes.length, modules: f.modules.length })).sort((a, b) => b.seances - a.seances), [formateurs, seancesPeriode]);
  const derniersEtudiants = useMemo(() => etudiants.slice().reverse().slice(0, 6), [etudiants]);
  const examensRecents = useMemo(() => examens.slice().reverse().slice(0, 6), [examens]);
  // Synthèse des examens : répartition par statut et par type (onglet Académique).
  const examensParStatut = useMemo<ChartDatum[]>(() => Object.entries(STATUT_EXAMEN_LABEL).map(([k, label]) => ({ name: label, value: examens.filter((e) => e.statut === k).length })), [examens]);
  const examensParType = useMemo<ChartDatum[]>(() => Object.entries(TYPE_EXAMEN_LABEL).map(([k, label]) => ({ name: label, value: examens.filter((e) => e.type === k).length })), [examens]);
  // Examens par formateur : le rattachement se fait par module enseigné (comme
  // sur le tableau de bord enseignant). « Planifiés » = encore à venir,
  // « faits » = l'épreuve a eu lieu (en cours de correction ou notes saisies).
  const examensParFormateur = useMemo<GroupedDatum[]>(
    () =>
      formateurs
        .map((f) => {
          const siens = examens.filter((x) => f.modules.includes(x.module));
          return {
            name: `${f.prenom.charAt(0)}. ${f.nom}`,
            planifies: siens.filter((x) => x.statut === "planifie").length,
            faits: siens.filter((x) => x.statut !== "planifie").length,
          };
        })
        .filter((r) => r.planifies + r.faits > 0)
        .sort((a, b) => b.planifies + b.faits - (a.planifies + a.faits)),
    [formateurs, examens],
  );

  // « Charge des formateurs » : ligne cliquable → modale des séances du formateur.
  const [chargeSel, setChargeSel] = useState<{ id: string; nom: string } | null>(null);
  const seancesFormateur = useMemo(() => chargeSel ? seancesPeriode.filter((s) => s.professeurId === chargeSel.id).slice().sort((a, b) => (a.date === b.date ? (a.debut < b.debut ? -1 : 1) : a.date < b.date ? -1 : 1)) : [], [chargeSel, seancesPeriode]);

  return (
    <>
      <DashHero chips={[{ label: "étudiants", value: dashboard.totalInscrits }, { label: "Séances ajd", value: seancesAujourdhui.length }, { label: "Réussite", value: `${dashboard.tauxReussite} %` }]} />
      <DashWorkspace tabs={DIRECTOR_TABS} tab={tab} onChange={setTab} direction={direction}>
        {tab === 0 ? (
          <div className="space-y-6 mt-5">
            {/* Les cartes de stats et le graphe « réussite / recouvrement »
                partagent la même grille : le graphe occupe deux colonnes et se
                cale avec les quatre autres cartes. */}
            <div className="grid grid-cols-1 gap-3 min-[500px]:grid-cols-2 sm:gap-4 lg:grid-cols-2 xl:grid-cols-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <KpiCard label="Étudiants actifs" value={etudiantsActifs} icon={Users} />
                <KpiCard label="Formateurs actifs" value={dashboard.formateursActifs} />
                <KpiCard label="Examens À venir" value={aTraiter.examensAVenir} tone="amber" icon={BookOpen} />
                <KpiCard label="Bulletins À publier" value={aTraiter.bulletinsAPublier} tone="amber" icon={PenLine} />
              </div>
              <MetricSwitchChart
                reussite={dashboard.tauxReussite}
                aRecouvrer={dashboard.totalARecouvrer}
                reussiteData={reussiteFiliere}
                recouvrementData={recouvrementData}
              />
            </div>
            <Section title="Aujourd&rsquo;hui" action={<SectionLink to="/dashboard/calendar">Voir le planning</SectionLink>}>
              <AujourdhuiTable seances={seancesAujourdhui} />
            </Section>
            <Section title="Notifications">
              <ActiviteFeed />
            </Section>
          </div>
        ) : tab === 1 ? (
          <div className="space-y-6">
            <div className="grid gap-6 xl:grid-cols-3">
              <div className="xl:col-span-2">
                <Section title="Examens récents" action={<SectionLink to="/dashboard/examens">Tous les examens</SectionLink>}>
                  <ExamensRecentsTable examens={examensRecents} />
                </Section>
              </div>
              <div className="xl:col-span-1">
                <Section title="Nouveaux étudiants" action={<SectionLink to="/dashboard/etudiants">Tous les étudiants</SectionLink>}>
                  <StudentAvatarList etudiants={derniersEtudiants} />
                </Section>
              </div>
            </div>
            <Section title="Synthèse des examens" action={<SectionLink to="/dashboard/examens">Tous les examens</SectionLink>}>
              <div className="grid gap-4 xl:grid-cols-2">
                <DonutChart title="Examens par statut" data={examensParStatut} palette={BRAND_CHART_COLORS} />
                <BarSeries title="Examens par type" data={examensParType} colorful palette={BRAND_CHART_COLORS} />
                <div className="xl:col-span-2">
                  <GroupedBarSeries
                    // Pas de sous-titre : la légende dit déjà « Planifiés / Faits ».
                    title="Examens par formateur"
                    height={300}
                    data={examensParFormateur}
                    series={[
                      // Mêmes couleurs que les badges de statut : bleu « planifié », teal « notes saisies ».
                      { key: "planifies", label: "Planifiés", color: BRAND_CHART_COLORS[1] },
                      { key: "faits", label: "Faits", color: BRAND_CHART_COLORS[0] },
                    ]}
                  />
                </div>
              </div>
            </Section>
          </div>
        ) : (
          <div className="space-y-6">
            <Section title="Analyse">
              <div className="grid gap-4 xl:grid-cols-2">
                <DonutChart title="Répartition par filière" data={repartitionFiliere} palette={BRAND_CHART_COLORS} />
                <BarSeries title="Répartition par niveau" data={repartitionNiveau} colorful palette={BRAND_CHART_COLORS} />
                <AreaTrend title="Examens par mois" data={examensParMois} color="var(--istpm-blue)" />
                <LineTrend title="Séances par jour de la semaine" data={sessionsParJour} color="var(--istpm-amber)" />
              </div>
            </Section>
            <Section
              title="Charge des formateurs"
              action={<DateRangeFilter du={chargeDu} a={chargeA} onDu={setChargeDu} onA={setChargeA} />}
            >
              <div className={cn(softCard, "divide-y divide-brand/8 overflow-hidden")}>
                {chargeFormateurs.map((f) => { const r = Math.min(f.seances / 8, 1); return <MeterRow key={f.id} label={f.nom} ratio={r} color={r > 0.75 ? TONE_COLORS.red : r > 0.5 ? TONE_COLORS.amber : TONE_COLORS.teal} detail={`${f.seances} séances Â· ${f.groupes} grp Â· ${f.modules} mod`} onClick={() => setChargeSel({ id: f.id, nom: f.nom })} />; })}
              </div>
            </Section>
          </div>
        )}
      </DashWorkspace>

      {/* Séances d'un formateur (depuis « Charge des formateurs ») */}
      <Dialog open={!!chargeSel} onOpenChange={(o) => !o && setChargeSel(null)}>
        <DialogContent className={dialogSurfaceWide}>
          <DialogTitle className="sr-only">Séances du formateur</DialogTitle>
          <DialogDescription className="sr-only">Liste des séances programmées</DialogDescription>
          {chargeSel ? (
            <DetailShell
              icon={<Users className="h-5 w-5" />}
              title={chargeSel.nom}
              subtitle={`${seancesFormateur.length} séance${seancesFormateur.length > 1 ? "s" : ""}${
                chargeDu && chargeA
                  ? ` du ${fmtDate(chargeDu)} au ${fmtDate(chargeA)}`
                  : chargeDu
                    ? ` à partir du ${fmtDate(chargeDu)}`
                    : chargeA
                      ? ` jusqu'au ${fmtDate(chargeA)}`
                      : ""
              }`}
            >
              <DetailSection title="Séances programmées">
                {seancesFormateur.length ? (
                  <div className="overflow-x-auto rounded-xl border border-brand/12">
                    <table className="w-full min-w-[560px] text-left text-sm">
                      <thead className={TH}>
                        <tr>
                          <th className="px-4 py-3">Date</th>
                          <th className="px-4 py-3">Horaire</th>
                          <th className="px-4 py-3">Module</th>
                          <th className="px-4 py-3">Groupe</th>
                          <th className="px-4 py-3">Salle</th>
                          <th className="px-4 py-3">Type</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-brand/8">
                        {seancesFormateur.map((s) => (
                          <tr key={s.id} className="transition-colors hover:bg-brand/6">
                            <td className="whitespace-nowrap px-4 py-3 font-medium text-foreground">{fmtDate(s.date)}</td>
                            <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{s.debut}&ndash;{s.fin}</td>
                            <td className="px-4 py-3">{s.module}</td>
                            <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{s.groupe}</td>
                            <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{s.salle}</td>
                            <td className="whitespace-nowrap px-4 py-3"><span className={toneBadge("blue")}>{TYPE_SEANCE_LABEL[s.type]}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {chargeDu || chargeA
                      ? "Aucune séance sur la période sélectionnée."
                      : "Aucune séance programmée."}
                  </p>
                )}
              </DetailSection>
            </DetailShell>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Professor Dashboard                                                */
/* ------------------------------------------------------------------ */

/**
 * Récapitulatif de ce qu'un formateur enseigne : filière, semestres (déduits
 * du préfixe de ses groupes, ex. « S5-G1 » → « S5 »), groupes et modules.
 * Lecture seule — l'affectation est gérée dans Formateurs par la direction.
 */
function AffectationEnseignant({ formateur }: { formateur: Formateur }) {
  const semestres = useMemo(
    () =>
      [
        ...new Set(
          formateur.groupes
            .map((g) => g.split("-")[0]?.trim())
            .filter((s): s is string => !!s && /^S\d$/i.test(s)),
        ),
      ].sort(),
    [formateur.groupes],
  );

  const lignes: {
    label: string;
    items: string[];
    tone: "teal" | "blue" | "neutral";
  }[] = [
    { label: "Filière", items: formateur.departement ? [formateur.departement] : [], tone: "teal" },
    { label: "Semestres", items: semestres, tone: "blue" },
    { label: "Groupes", items: [...formateur.groupes].sort(), tone: "neutral" },
    { label: "Modules", items: [...formateur.modules].sort(), tone: "teal" },
  ];

  return (
    <div className={cn(softCard, "divide-y divide-brand/8 overflow-hidden")}>
      {lignes.map((l) => (
        <div
          key={l.label}
          className="flex flex-col gap-2 px-4 py-3.5 sm:flex-row sm:items-start sm:gap-4 sm:px-5"
        >
          <span className="shrink-0 pt-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sm:w-28">
            {l.label}
          </span>
          {l.items.length ? (
            <span className="flex flex-wrap gap-1.5">
              {l.items.map((it) => (
                <span
                  key={it}
                  className={cn(
                    "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
                    l.tone === "teal" && "bg-brand/10 text-brand-dk ring-1 ring-inset ring-brand/15",
                    l.tone === "blue" && "bg-info-pale text-info ring-1 ring-inset ring-info/20",
                    l.tone === "neutral" && "bg-muted text-foreground/80 ring-1 ring-inset ring-brand/12",
                  )}
                >
                  {it}
                </span>
              ))}
            </span>
          ) : (
            <span className="pt-0.5 text-xs italic text-muted-foreground">
              Non assigné
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

function DashboardEnseignant() {
  const { tab, setTab, direction } = useTabs();
  const { seances, examens, bulletins, etudiants } = useIstpm();
  const moi = useCurrentFormateur();
  const mesExamens = useMemo(() => (moi ? examens.filter((x) => moi.modules.includes(x.module)) : []), [examens, moi]);
  const seancesAujourdhui = useMemo(() => seances.filter((s) => s.date === today && s.professeurId === moi?.id), [seances, moi?.id]);
  const mesSeances = useMemo(() => seances.filter((s) => s.professeurId === moi?.id).slice().sort((a, b) => (a.date < b.date ? -1 : 1)), [seances, moi?.id]);
  // Tous les étudiants de la filière du formateur dans les semestres qu'il
  // enseigne (préfixe de ses groupes : « S5-G1 » → « S5 »), sans restriction de
  // sous-groupe — le professeur voit ainsi l'intégralité de ses promotions.
  const mesEtudiants = useMemo(() => {
    if (!moi) return [];
    const niveaux = new Set(moi.groupes.map((g) => g.split("-")[0]));
    return etudiants.filter(
      (e) => e.filiere === moi.departement && niveaux.has(e.niveau),
    );
  }, [etudiants, moi]);
  const mesBulletins = useMemo(() => (moi ? bulletins.filter((b) => moi.modules.some((m) => b.notes?.some((n) => n.module === m))) : []), [bulletins, moi]);
  const calendrierProche = useMemo(() => mesSeances.filter((s) => s.date >= today).slice(0, 8), [mesSeances]);
  if (!moi) return <EmptyState icon={GraduationCap}>Aucun formateur enregistré.</EmptyState>;
  const aNoter = mesExamens.filter((x) => x.statut !== "notes_saisies");
  const bulletinsAPublier = mesBulletins.filter((b) => b.statut !== "publie");
  const PROFESSOR_TABS: DashTab[] = [
    { label: "Vue d'ensemble", short: "Ensemble", icon: LayoutGrid },
    { label: "Examens", icon: BookOpen, badge: aNoter.length },
    { label: "étudiants & Bulletins", short: "étudiants", icon: Users },
  ];

  return (
    <>
      <DashHero chips={[{ label: "Groupes", value: moi.groupes.length }, { label: "Séances ajd", value: seancesAujourdhui.length }, { label: "À€ noter", value: aNoter.length }]} />
      <DashWorkspace tabs={PROFESSOR_TABS} tab={tab} onChange={setTab} direction={direction}>
        {tab === 0 ? (
          <div className="space-y-5">
            <KpiGrid>
              <KpiCard label="Mes groupes" value={moi.groupes.length} icon={Users} accent />
              <KpiCard label="Mes modules" value={moi.modules.length} tone="blue" icon={BookOpen} />
              <KpiCard label="Séances aujourd&rsquo;hui" value={seancesAujourdhui.length} icon={Calendar} />
              <KpiCard label="Mes examens" value={mesExamens.length} tone="amber" icon={GraduationCap} />
              <KpiCard label="Examens À  noter" value={aNoter.length} tone={aNoter.length ? "red" : "teal"} icon={PenLine} />
            </KpiGrid>
            <Section title="Mon affectation">
              <AffectationEnseignant formateur={moi} />
            </Section>
            <div className="grid gap-6 xl:grid-cols-2">
              <Section title="Notifications"><ActiviteFeed /></Section>
              <Section title="Mon calendrier (7 jours)" action={<SectionLink to="/dashboard/calendar">Voir tout</SectionLink>}>
                <div className={cn(softCard, "divide-y divide-brand/8 overflow-hidden")}>
                  {calendrierProche.length ? calendrierProche.map((s) => (
                    <div key={s.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 transition-colors hover:bg-brand/6 sm:px-5">
                      <span className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-xl bg-brand/12 text-center leading-tight">
                        <span className="text-[10px] font-bold uppercase text-brand-dk">{new Date(s.date).toLocaleDateString("fr-FR", { weekday: "short" }).slice(0, 3)}</span>
                        <span className="text-xs font-bold text-brand-dk">{new Date(s.date).getDate()}</span>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-foreground">{s.module}</span>
                        <span className="block text-xs text-muted-foreground">{s.debut} - {s.fin} Â· {s.salle} Â· {s.groupe}</span>
                      </span>
                      <span className={toneBadge("blue")}>{TYPE_SEANCE_LABEL[s.type]}</span>
                    </div>
                  )) : <p className="px-5 py-8 text-center text-sm text-muted-foreground">Aucune séance À  venir.</p>}
                </div>
              </Section>
            </div>
            <Section title="Mes séances aujourd&rsquo;hui" action={<SectionLink to="/dashboard/calendar">Mon planning</SectionLink>}>
                <AujourdhuiTable seances={seancesAujourdhui} />
              </Section>
          </div>
        ) : tab === 1 ? (
          <Section title="Mes examens" action={<Link to="/dashboard/examens" className={primaryPill}><Plus className="h-4 w-4" />Créer un examen</Link>}>
            <ExamensRecentsTable examens={mesExamens} />
          </Section>
        ) : (
          <div className="grid gap-6 xl:grid-cols-1">
            <Section title="Mes étudiants" action={<SectionLink to="/dashboard/etudiants">Tous les étudiants</SectionLink>}>
              <StudentAvatarList etudiants={mesEtudiants} />
            </Section>
            <Section title="Bulletins en attente de publication" action={<SectionLink to="/dashboard/bulletins">Tous les bulletins</SectionLink>}>
              <BulletinsRecentsTable bulletins={bulletinsAPublier} />
            </Section>
          </div>
        )}
      </DashWorkspace>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  General Supervisor (Responsable) Dashboard                         */
/* ------------------------------------------------------------------ */

function conflitsGlobaux(seances: Seance[]) {
  const out: { s1: Seance; s2: Seance; raisons: string[] }[] = [];
  for (let i = 0; i < seances.length; i++) {
    for (let j = i + 1; j < seances.length; j++) {
      const a = seances[i], b = seances[j];
      if (a.date !== b.date) continue;
      const aS = minutesDepuisMinuit(a.debut), aE = minutesDepuisMinuit(a.fin);
      const bS = minutesDepuisMinuit(b.debut), bE = minutesDepuisMinuit(b.fin);
      if (aE <= bS || aS >= bE) continue;
      const r: string[] = [];
      if (a.professeurId === b.professeurId) r.push("Professeur");
      if (a.salle === b.salle) r.push("Salle");
      if (a.groupe === b.groupe) r.push("Groupe");
      if (r.length) out.push({ s1: a, s2: b, raisons: r });
    }
  }
  return out;
}

function DashboardResponsable() {
  const { tab, setTab, direction } = useTabs();
  const { formateurs, seances, aTraiter, dashboard } = useIstpm();
  const seancesAujourdhui = useMemo(() => seances.filter((s) => s.date === today), [seances]);
  const sallesOccupees = useMemo(() => [...new Set(seancesAujourdhui.map((s) => s.salle))], [seancesAujourdhui]);
  // Parc de salles connu : celles du planning (jamais de chiffre inventé).
  const sallesConnues = useMemo(
    () => [...new Set(seances.map((s) => s.salle))].filter(Boolean),
    [seances],
  );
  const sallesLibres = Math.max(0, sallesConnues.length - sallesOccupees.length);
  const conflits = useMemo(() => conflitsGlobaux(seances), [seances]);
  const chargeFormateurs = useMemo(() => formateurs.filter((f) => f.statut !== "en_conge").map((f) => ({ id: f.id, nom: `${f.prenom} ${f.nom}`, seances: seances.filter((s) => s.professeurId === f.id).length })).sort((a, b) => b.seances - a.seances), [formateurs, seances]);
  const occupationSalles = useMemo(() => { const s = [...new Set(seances.map((x) => x.salle))].sort(); return s.map((salle) => ({ salle, seancesCount: seances.filter((x) => x.salle === salle).length, aujourdhui: seancesAujourdhui.filter((x) => x.salle === salle).length })); }, [seances, seancesAujourdhui]);
  const sessionsParJour = useMemo(() => { const c = new Array(7).fill(0); seances.forEach((s) => c[new Date(s.date).getDay()]++); return JOURS.map((n, i) => ({ name: n, value: c[i] })); }, [seances]);
  const workloadData = useMemo(() => { const max = Math.max(...chargeFormateurs.map((f) => f.seances), 1); return chargeFormateurs.map((f) => ({ name: f.nom.split(" ").pop() || f.nom, value: Math.round((f.seances / max) * 100), seances: f.seances })); }, [chargeFormateurs]);
  const maxCharge = Math.max(...chargeFormateurs.map((x) => x.seances), 1);
  const maxOcc = Math.max(...occupationSalles.map((x) => x.seancesCount), 1);
  const SUPERVISOR_TABS: DashTab[] = [
    { label: "Vue d'ensemble", short: "Ensemble", icon: LayoutGrid },
    { label: "Planification", short: "Planning", icon: CalendarRange, badge: conflits.length },
    { label: "Analyse", icon: BarChart3 },
  ];

  return (
    <>
      <DashHero chips={[{ label: "Séances ajd", value: seancesAujourdhui.length }, { label: "Salles libres", value: sallesLibres }, { label: "Conflits", value: conflits.length }]} />
      <DashWorkspace tabs={SUPERVISOR_TABS} tab={tab} onChange={setTab} direction={direction}>
        {tab === 0 ? (
          <div className="space-y-6">
            <KpiGrid>
              <KpiCard label="Séances aujourd&rsquo;hui" value={seancesAujourdhui.length} icon={Calendar} accent />
              <KpiCard label="Formateurs actifs" value={dashboard.formateursActifs} hint={`sur ${formateurs.length} total`} tone="blue" icon={GraduationCap} />
              <KpiCard label="Salles occupées" value={sallesOccupees.length} icon={MapPin} />
              <KpiCard label="Salles disponibles" value={sallesLibres} tone={sallesLibres > 3 ? "teal" : "amber"} icon={Building2} />
              <KpiCard label="Conflits" value={conflits.length} tone={conflits.length ? "red" : "teal"} icon={AlertCircle} />
              <KpiCard label="Stages À  valider" value={aTraiter.stagesAValider} tone="amber" icon={BookOpen} />
            </KpiGrid>
            <Section title="Aujourd&rsquo;hui" action={<SectionLink to="/dashboard/calendar">Voir le planning</SectionLink>}>
              <AujourdhuiTable seances={seancesAujourdhui} />
            </Section>
            <Section title="Notifications"><ActiviteFeed /></Section>
          </div>
        ) : tab === 1 ? (
          <div className="space-y-6">
            <Section title="Alertes d'ordonnancement">
              <div className={cn(softCard, "divide-y divide-brand/8 overflow-hidden")}>
                {conflits.length ? conflits.slice(0, 6).map((c, i) => {
                  const p1 = formateurs.find((f) => f.id === c.s1.professeurId);
                  const p2 = formateurs.find((f) => f.id === c.s2.professeurId);
                  return (
                    <div key={i} className="flex items-start gap-3 px-4 py-3.5 sm:px-5">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-alert" />
                      <span className="min-w-0 flex-1 text-sm text-foreground">
                        <span className="block font-medium">{c.raisons.join(" + ")} en conflit</span>
                        <span className="block text-xs text-muted-foreground">{fmtDate(c.s1.date)} Â· {c.s1.debut}-{c.s1.fin} Â· {c.s1.module} ({p1?.prenom} {p1?.nom}) vs {c.s2.module} ({p2?.prenom} {p2?.nom})</span>
                      </span>
                      <span className={cn(toneBadge("red"), "hidden sm:inline-flex")}>{c.raisons[0]}</span>
                    </div>
                  );
                }) : <p className="flex items-center justify-center gap-2 px-5 py-8 text-sm text-muted-foreground"><CheckCircle2 className="h-4 w-4 text-brand" />Aucun conflit détecté.</p>}
              </div>
            </Section>
            <div className="grid gap-6 xl:grid-cols-2">
              <Section title="Charge des formateurs">
                <div className={cn(softCard, "divide-y divide-brand/8 overflow-hidden")}>
                  {chargeFormateurs.map((f) => <MeterRow key={f.id} label={f.nom} ratio={f.seances / maxCharge} color={f.seances / maxCharge > 0.8 ? TONE_COLORS.red : f.seances / maxCharge > 0.5 ? TONE_COLORS.amber : TONE_COLORS.teal} detail={`${f.seances} séances`} />)}
                </div>
              </Section>
              <Section title="Occupation des salles">
                <div className={cn(softCard, "divide-y divide-brand/8 overflow-hidden")}>
                  {occupationSalles.map((o) => <MeterRow key={o.salle} label={o.salle} ratio={o.seancesCount / maxOcc} color={o.aujourdhui > 0 ? TONE_COLORS.teal : TONE_COLORS.neutral} detail={<>{o.seancesCount} séances{o.aujourdhui > 0 ? <span className="ml-1 text-brand">Â· {o.aujourdhui} ajd</span> : null}</>} />)}
                </div>
              </Section>
            </div>
          </div>
        ) : (
          <Section title="Analyse">
            <div className="grid gap-4 lg:grid-cols-1 2xl:grid-cols-2">
              <DonutChart title="Occupation des salles" height={220} data={occupationSalles.map((o) => ({ name: o.salle, value: o.seancesCount }))} />
              <HBarSeries
                title="Charge des formateurs"
                height={220}
                data={workloadData}
                formatter={(value: number, _name: string, entry: { payload?: { seances?: number } }) => [`${entry.payload?.seances ?? value} séances`, "Charge"]}
              />
            </div>
            <AreaTrend title="Séances par jour" height={220} data={sessionsParJour} color="var(--chart-4)" />
            
          </Section>
        )}
      </DashWorkspace>
    </>
  );
}

/* ------------------------------------------------------------------ */

function DashboardIndex() {
  const { role } = useAuth();
  if (role === "etudiant") return <DashboardEtudiant />;
  return (
    <div className="space-y-6">
      {role === "enseignant" ? <DashboardEnseignant /> : role === "responsable" ? <DashboardResponsable /> : <DashboardDirecteur />}
    </div>
  );
}

/** Accueil de l'étudiant : aperçu de sa situation + accès rapide à son espace. */
function DashboardEtudiant() {
  const { user } = useAuth();
  const store = useIstpm();
  const meQ = useQuery({ queryKey: ["student-me"], queryFn: () => fetchStudentMe(), retry: false });
  const calQ = useQuery({ queryKey: ["student-calendar"], queryFn: () => fetchStudentCalendar(), retry: false });
  const reqQ = useQuery({ queryKey: ["student-requests"], queryFn: fetchStudentRequests, retry: false });
  const notifQ = useQuery({ queryKey: ["student-notifications"], queryFn: fetchStudentNotifications, retry: false });

  const p = (meQ.data?.etudiant ?? {}) as Record<string, unknown>;
  const s = (k: string, k2?: string) => String(p[k] ?? (k2 ? p[k2] : "") ?? "");
  const prenom = s("prenom") || (user?.name?.split(" ")[0] ?? "");
  const nom = s("nom");
  const photoUrl = s("photoUrl", "photo_url");
  const notes = (meQ.data?.notes as { note: number }[] | undefined) ?? [];
  const moyenne = notes.length ? (notes.reduce((a, n) => a + n.note, 0) / notes.length).toFixed(2) : null;
  const bulletins = (meQ.data?.bulletins as unknown[] | undefined) ?? [];
  const reste = s("resteAPayer", "reste_a_payer");
  const demandes = reqQ.data ?? [];
  const enAttente = demandes.filter((d) => d.statut === "en_attente" || d.statut === "en_cours").length;
  const reponses = notifQ.data?.unread ?? 0;

  const seances = ((calQ.data?.seances as Seance[] | undefined) ?? [])
    .filter((x) => {
      const d = new Date(`${x.date}T${x.debut || "00:00"}`);
      return !Number.isNaN(d.getTime()) && d.getTime() >= Date.now() - 3 * 3600_000;
    })
    .sort((a, b) => `${a.date}T${a.debut}`.localeCompare(`${b.date}T${b.debut}`))
    .slice(0, 4);
  const nomProf = useMemo(() => {
    const m = new Map(store.formateurs.map((f) => [f.id, `${f.prenom} ${f.nom}`]));
    return (id: string) => m.get(id) ?? "";
  }, [store.formateurs]);

  const liens: { to: string; label: string; icon: ComponentType<LucideProps>; hint: string }[] = [
    { to: "/dashboard/mon-profil", label: "Mon profil", icon: Users, hint: "Identité, coordonnées, cursus" },
    { to: "/dashboard/espace-etudiant/scolarite", label: "Scolarité", icon: GraduationCap, hint: "Enseignants, notes, présence" },
    { to: "/dashboard/espace-etudiant/stage", label: "Mon stage", icon: Building2, hint: "Structure, période, encadrant" },
    { to: "/dashboard/espace-etudiant/calendrier", label: "Calendrier", icon: CalendarRange, hint: "Emploi du temps" },
    { to: "/dashboard/espace-etudiant/paiements", label: "Paiements", icon: Wallet, hint: "Scolarité, reste à payer" },
    { to: "/dashboard/espace-etudiant/demandes", label: "Demandes", icon: PenLine, hint: "Attestations, réclamations" },
  ];

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className={cn(softCard, "overflow-hidden p-6 sm:p-8")}>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <PersonAvatar name={`${prenom} ${nom}`.trim() || "?"} photoUrl={photoUrl} size="xl" className="ring-2 ring-brand/20" />
          <div className="min-w-0 flex-1 space-y-2">
            <p className={eyebrowClass}>Espace étudiant</p>
            <h1 className="font-display text-2xl tracking-tight text-foreground sm:text-3xl">
              Bonjour, {prenom || "bienvenue"}
            </h1>
            <div className="flex flex-wrap gap-1.5">
              {s("filiere") ? <span className={toneBadge("teal")}>{s("filiere")}</span> : null}
              {s("niveau") ? <span className={toneBadge("blue")}>{s("niveau")}</span> : null}
              {s("groupe") ? <span className={toneBadge("neutral")}>{s("groupe")}</span> : null}
              {s("statut") ? <span className={toneBadge("neutral")}>{s("statut")}</span> : null}
            </div>
          </div>
          <Link to="/dashboard/espace-etudiant" className={cn(primaryPill, "shrink-0")}>
            Ouvrir mon espace <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Situation en bref */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MiniStat label="Moyenne générale" value={moyenne ? `${moyenne}/20` : ""} icon={BarChart3} />
        <MiniStat label="Bulletins" value={String(bulletins.length)} icon={CheckCircle2} />
        <MiniStat label="Reste à payer" value={reste ? `${reste} MAD` : ""} icon={Wallet} />
        <MiniStat
          label="Demandes"
          value={reponses > 0 ? `${reponses} réponse(s)` : enAttente > 0 ? `${enAttente} en cours` : "À jour"}
          icon={PenLine}
          tone={reponses > 0 ? "amber" : undefined}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Prochains cours */}
        <section className={cn(softCard, "space-y-3 p-5 lg:col-span-2")}>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-brand-dk" />
            <p className={eyebrowClass}>Prochains cours</p>
          </div>
          {seances.length ? (
            <ul className="divide-y divide-brand/8">
              {seances.map((c, i) => (
                <li key={c.id ?? i} className="flex items-center gap-3 py-2.5">
                  <span className="w-16 shrink-0 text-xs font-semibold text-brand-dk">
                    {new Date(`${c.date}T00:00`).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" })}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-foreground">{c.module}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {c.debut}–{c.fin} · {c.salle || "Salle non précisée"}{nomProf(c.professeurId) ? ` · ${nomProf(c.professeurId)}` : ""}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Aucun cours à venir cette semaine.</p>
          )}
          <Link to="/dashboard/espace-etudiant" className="inline-flex items-center gap-1 text-xs font-semibold text-brand-dk hover:underline">
            Voir tout le calendrier <ArrowRight className="h-3 w-3" />
          </Link>
        </section>

        {/* Accès rapide */}
        <section className={cn(softCard, "space-y-2 p-5")}>
          <p className={eyebrowClass}>Accès rapide</p>
          <div className="grid grid-cols-2 gap-2">
            {liens.map((l) => (
              <Link
                key={l.label}
                to={l.to}
                className="group flex flex-col gap-1 rounded-xl border border-brand/12 p-3 transition hover:border-brand/30 hover:bg-brand/6"
              >
                <l.icon className="h-4 w-4 text-brand-dk" />
                <span className="text-xs font-semibold text-foreground">{l.label}</span>
                <span className="text-[10px] leading-tight text-muted-foreground">{l.hint}</span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon: ComponentType<LucideProps>;
  tone?: "amber";
}) {
  return (
    <div className={cn(softCard, "flex items-center gap-3 p-4")}>
      <span
        className={cn(
          "grid h-10 w-10 shrink-0 place-items-center rounded-xl",
          tone === "amber" ? "bg-warn-pale text-warn" : "bg-brand/10 text-brand-dk",
        )}
      >
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0">
        <span className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
        <span className="block truncate text-sm font-bold text-foreground">{value}</span>
      </span>
    </div>
  );
}

export const Route = createFileRoute("/dashboard/")({ component: DashboardIndex });







