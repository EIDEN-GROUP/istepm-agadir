import { createFileRoute, Link } from "@tanstack/react-router";
import { type ReactNode, useMemo, useRef, useState, useEffect } from "react";
import { motion, animate, useInView } from "framer-motion";
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

  Activity,
  type LucideProps,
} from "lucide-react";
import { useAuth, ROLE_META, DEMO_FORMATEUR_ID } from "@/lib/auth";
import { useIstpm } from "@/lib/istpm-store";
import {
  fmtMAD,
  fmtDate,
  type ActiviteItem,
  type Seance,
  type Examen,
  type Bulletin,
  TYPE_SEANCE_LABEL,
  minutesDepuisMinuit,
  SALLES,
} from "@/lib/istpm-data";
import {
  softCard,
  eyebrowClass,
  toneBadge,
  dashTooltip,
  renderPieLabel,
  CHART_COLORS,
  TONE_COLORS,
  avatarChip,
  initials,
  primaryPill,
} from "@/lib/dash-ui";
import { DashTabs, DashTabPanel, type DashTab } from "@/components/dash-tabs";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const MOIS = ["Jan","Fév","Mar","Avr","Mai","Jun","Jul","AoÃ»","Sep","Oct","Nov","Déc"];
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
/*  Header — solid brand band                                          */
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
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-hidden rounded-3xl border border-brand/15 bg-brand p-5 text-white shadow-[0_28px_70px_-38px_rgb(var(--istpm-shadow)/0.9)] sm:p-7"
    >

      <div className="relative flex flex-wrap items-end justify-between gap-5">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/75">
            
            {role ? ROLE_META[role].label : "Tableau de bord"}
          </p>
          <h1 className="mt-2 font-display text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">
            {greeting}{user?.name ? `, ${user.name}` : ""}
          </h1>
          <p className="mt-1.5 text-sm capitalize text-white/80">{dateStr}</p>
        </div>

        {chips.length ? (
          <div className="flex flex-wrap gap-2">
            {chips.map((c) => (
              <div
                key={c.label}
                className="rounded-2xl border border-white/20 bg-white/12 px-3.5 py-2 backdrop-blur-sm"
              >
                <p className="text-[10px] font-semibold uppercase tracking-wider text-white/70">{c.label}</p>
                <p className="mt-0.5 font-display text-lg font-bold leading-none">{c.value}</p>
              </div>
            ))}
          </div>
        ) : null}
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

function KpiCard({
  label, value, hint, tone = "teal", icon: Icon,
}: {
  label: string; value: string | number; hint?: string;
  tone?: keyof typeof TONE_COLORS;
  icon?: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
}) {
  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ type: "spring", stiffness: 350, damping: 25 }}
      className={cn(
        softCard,
        "group relative overflow-hidden p-4 sm:p-5",
        "transition-shadow duration-300 hover:[box-shadow:var(--edge-highlight),var(--elevation-4)]",
      )}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{ backgroundColor: `${TONE_COLORS[tone]}08` }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute left-0 top-0 h-full w-0.5 origin-bottom scale-y-0 transition-[transform,opacity] duration-300 group-hover:scale-y-100"
        style={{ backgroundColor: TONE_COLORS[tone], opacity: 0.6 }}
      />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground sm:text-[11px]">
            {label}
          </p>
          <p className="mt-2 font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {typeof value === "number" && !hint ? <AnimatedNumber value={value} /> : value}
          </p>
          {hint ? <p className="mt-1 truncate text-xs text-muted-foreground">{hint}</p> : null}
        </div>
        {Icon ? (
          <span
            className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg sm:h-11 sm:w-11"
            style={{ backgroundColor: `${TONE_COLORS[tone]}18` }}
          >
            <Icon className="h-4 w-4 sm:h-5 sm:w-5" style={{ color: TONE_COLORS[tone] }} />
          </span>
        ) : null}
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
      className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4"
    >
      {children}
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

function EmptyState({ icon: Icon, children }: { icon: React.ComponentType<LucideProps>; children: ReactNode }) {
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
  const { activite } = useIstpm();
  return (
    <div className={cn(softCard, "divide-y divide-brand/8 overflow-hidden")}>
      {activite.slice(0, 8).map((a, i) => {
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

function MeterRow({ label, ratio, color, detail }: {
  label: string; ratio: number; color: string; detail: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 transition-colors hover:bg-brand/6 sm:px-5">
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
    </div>
  );
}

function ChartCard({ title, children, height = 240 }: {
  title: string; children: ReactNode; height?: number;
}) {
  return (
    <div className={cn(softCard, "p-4 sm:p-5")}>
      <p className={eyebrowClass}>{title}</p>
      <div className="mt-3 w-full" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          {children as React.ReactElement}
        </ResponsiveContainer>
      </div>
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
              <tr><th className="px-4 py-3">Titre</th><th className="px-4 py-3">Module</th><th className="px-4 py-3">Classe</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Statut</th></tr>
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
              <span className={avatarChip}>{initials(`${b.prenom} ${b.nom}`)}</span>
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
                      <span className={avatarChip}>{initials(`${b.prenom} ${b.nom}`)}</span>
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

function StudentAvatarList({ etudiants }: { etudiants: { id: string; prenom: string; nom: string; filiere: string; niveau: string }[] }) {
  if (!etudiants.length) return <EmptyState icon={Users}>Aucun étudiant.</EmptyState>;
  return (
    <div className={cn(softCard, "divide-y divide-brand/8 overflow-hidden")}>
      {etudiants.slice(0, 6).map((e) => (
        <Link key={e.id} to="/dashboard/etudiants" className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-brand/8 sm:px-5">
          <span className={avatarChip}>{initials(`${e.prenom} ${e.nom}`)}</span>
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
  const { dashboard, formateurs, seances, examens, bulletins, etudiants, aTraiter, repartitionFiliere, repartitionNiveau } = useIstpm();

  const seancesAujourdhui = useMemo(() => seances.filter((s) => s.date === today), [seances]);
  // « Étudiants actifs » = ceux dont la scolarité est en cours (statut inscrit),
  // hors diplômés, abandons et dossiers en attente.
  const etudiantsActifs = useMemo(() => etudiants.filter((e) => e.statut === "inscrit").length, [etudiants]);
  const examensParMois = useMemo(() => { const c = new Array(12).fill(0); examens.forEach((ex) => c[new Date(ex.date).getMonth()]++); return MOIS.map((n, i) => ({ name: n, value: c[i] })); }, [examens]);
  const sessionsParJour = useMemo(() => { const c = new Array(7).fill(0); seances.forEach((s) => c[new Date(s.date).getDay()]++); return JOURS.map((n, i) => ({ name: n, value: c[i] })); }, [seances]);
  const chargeFormateurs = useMemo(() => formateurs.filter((f) => f.statut !== "en_conge").map((f) => ({ id: f.id, nom: `${f.prenom} ${f.nom}`, seances: seances.filter((s) => s.professeurId === f.id).length, groupes: f.groupes.length, modules: f.modules.length })).sort((a, b) => b.seances - a.seances), [formateurs, seances]);
  const derniersEtudiants = useMemo(() => etudiants.slice().reverse().slice(0, 6), [etudiants]);
  const bulletinsRecents = useMemo(() => bulletins.slice().reverse().slice(0, 6), [bulletins]);
  const examensRecents = useMemo(() => examens.slice().reverse().slice(0, 6), [examens]);

  return (
    <>
      <DashHero chips={[{ label: "étudiants", value: dashboard.totalInscrits }, { label: "Séances ajd", value: seancesAujourdhui.length }, { label: "Réussite", value: `${dashboard.tauxReussite} %` }]} />
      <DashWorkspace tabs={DIRECTOR_TABS} tab={tab} onChange={setTab} direction={direction}>
        {tab === 0 ? (
          <div className="space-y-6">
            <KpiGrid>
              <KpiCard label="Étudiants actifs" value={etudiantsActifs} icon={Users} />
              <KpiCard label="Formateurs actifs" value={dashboard.formateursActifs} hint={`sur ${formateurs.length} au total`} icon={GraduationCap} />
              <KpiCard label="Taux de réussite" value={`${dashboard.tauxReussite} %`} tone="blue" icon={CheckCircle2} />
              <KpiCard label="Total Ã  recouvrer" value={fmtMAD(dashboard.totalARecouvrer)} tone="red" icon={Wallet} />
              <KpiCard label="Séances aujourd&rsquo;hui" value={seancesAujourdhui.length} icon={Calendar} />
              <KpiCard label="Examens Ã  venir" value={aTraiter.examensAVenir} tone="amber" icon={BookOpen} />
              <KpiCard label="Bulletins Ã  publier" value={aTraiter.bulletinsAPublier} tone="amber" icon={PenLine} />
            </KpiGrid>
            <Section title="Aujourd&rsquo;hui" action={<SectionLink to="/dashboard/calendar">Voir le planning</SectionLink>}>
              <AujourdhuiTable seances={seancesAujourdhui} />
            </Section>
            <Section title="Notifications">
              <ActiviteFeed />
            </Section>
          </div>
        ) : tab === 1 ? (
          <div className="space-y-6">
            <div className="grid gap-6 xl:grid-cols-2">
              <Section title="Examens récents" action={<SectionLink to="/dashboard/examens">Tous les examens</SectionLink>}>
                <ExamensRecentsTable examens={examensRecents} />
              </Section>
              <Section title="Bulletins récents" action={<SectionLink to="/dashboard/bulletins">Tous les bulletins</SectionLink>}>
                <BulletinsRecentsTable bulletins={bulletinsRecents} />
              </Section>
            </div>
            <Section title="Nouveaux étudiants" action={<SectionLink to="/dashboard/etudiants">Tous les étudiants</SectionLink>}>
              <div className="max-w-lg"><StudentAvatarList etudiants={derniersEtudiants} /></div>
            </Section>
          </div>
        ) : (
          <div className="space-y-6">
            <Section title="Analyse">
              <div className="grid gap-4 xl:grid-cols-2">
                <ChartCard title="Répartition par filière">
                  <PieChart><Pie data={repartitionFiliere} dataKey="value" nameKey="name" innerRadius="45%" outerRadius="78%" paddingAngle={2} label={renderPieLabel} labelLine={false}>{repartitionFiliere.map((_, i) => (<Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />))}</Pie><Tooltip contentStyle={dashTooltip} /></PieChart>
                </ChartCard>
                <ChartCard title="Répartition par niveau">
                  <BarChart data={repartitionNiveau}><CartesianGrid stroke="var(--border)" vertical={false} /><XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" /><YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" width={32} /><Tooltip contentStyle={dashTooltip} cursor={false} /><Bar dataKey="value" fill="var(--chart-2)" radius={[6, 6, 0, 0]} /></BarChart>
                </ChartCard>
                <ChartCard title="Examens par mois">
                  <BarChart data={examensParMois}><CartesianGrid stroke="var(--border)" vertical={false} /><XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" interval="preserveStartEnd" /><YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" width={32} /><Tooltip contentStyle={dashTooltip} cursor={false} /><Bar dataKey="value" fill="var(--chart-3)" radius={[6, 6, 0, 0]} /></BarChart>
                </ChartCard>
                <ChartCard title="Séances par jour de la semaine">
                  <BarChart data={sessionsParJour}><CartesianGrid stroke="var(--border)" vertical={false} /><XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" /><YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" width={32} /><Tooltip contentStyle={dashTooltip} cursor={false} /><Bar dataKey="value" fill="var(--chart-4)" radius={[6, 6, 0, 0]} /></BarChart>
                </ChartCard>
              </div>
            </Section>
            <Section title="Charge des formateurs">
              <div className={cn(softCard, "max-w-xl divide-y divide-brand/8 overflow-hidden")}>
                {chargeFormateurs.map((f) => { const r = Math.min(f.seances / 8, 1); return <MeterRow key={f.id} label={f.nom} ratio={r} color={r > 0.75 ? TONE_COLORS.red : r > 0.5 ? TONE_COLORS.amber : TONE_COLORS.teal} detail={`${f.seances} séances Â· ${f.groupes} grp Â· ${f.modules} mod`} />; })}
              </div>
            </Section>
          </div>
        )}
      </DashWorkspace>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Professor Dashboard                                                */
/* ------------------------------------------------------------------ */

function DashboardEnseignant() {
  const { tab, setTab, direction } = useTabs();
  const { formateurs, seances, examens, bulletins, etudiants } = useIstpm();
  const moi = formateurs.find((f) => f.id === DEMO_FORMATEUR_ID);
  const mesExamens = useMemo(() => (moi ? examens.filter((x) => moi.modules.includes(x.module)) : []), [examens, moi]);
  const seancesAujourdhui = useMemo(() => seances.filter((s) => s.date === today && s.professeurId === moi?.id), [seances, moi?.id]);
  const mesSeances = useMemo(() => seances.filter((s) => s.professeurId === moi?.id).slice().sort((a, b) => (a.date < b.date ? -1 : 1)), [seances, moi?.id]);
  const mesEtudiants = useMemo(() => (moi ? etudiants.filter((e) => moi.groupes.includes(`${e.niveau}-${e.groupe}`)) : []), [etudiants, moi]);
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
      <DashHero chips={[{ label: "Groupes", value: moi.groupes.length }, { label: "Séances ajd", value: seancesAujourdhui.length }, { label: "Ã€ noter", value: aNoter.length }]} />
      <DashWorkspace tabs={PROFESSOR_TABS} tab={tab} onChange={setTab} direction={direction}>
        {tab === 0 ? (
          <div className="space-y-6">
            <KpiGrid>
              <KpiCard label="Mes groupes" value={moi.groupes.length} icon={Users} />
              <KpiCard label="Mes modules" value={moi.modules.length} tone="blue" icon={BookOpen} />
              <KpiCard label="Séances aujourd&rsquo;hui" value={seancesAujourdhui.length} icon={Calendar} />
              <KpiCard label="Mes examens" value={mesExamens.length} tone="amber" icon={GraduationCap} />
              <KpiCard label="Examens Ã  noter" value={aNoter.length} tone={aNoter.length ? "red" : "teal"} icon={PenLine} />
            </KpiGrid>
            <div className="grid gap-6 xl:grid-cols-2">
              <Section title="Mes séances aujourd&rsquo;hui" action={<SectionLink to="/dashboard/calendar">Mon planning</SectionLink>}>
                <AujourdhuiTable seances={seancesAujourdhui} />
              </Section>
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
                  )) : <p className="px-5 py-8 text-center text-sm text-muted-foreground">Aucune séance Ã  venir.</p>}
                </div>
              </Section>
            </div>
            <Section title="Notifications"><ActiviteFeed /></Section>
          </div>
        ) : tab === 1 ? (
          <Section title="Mes examens" action={<Link to="/dashboard/examens" className={primaryPill}><Plus className="h-4 w-4" />Créer un examen</Link>}>
            <ExamensRecentsTable examens={mesExamens} />
          </Section>
        ) : (
          <div className="grid gap-6 xl:grid-cols-2">
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
      <DashHero chips={[{ label: "Séances ajd", value: seancesAujourdhui.length }, { label: "Salles libres", value: SALLES.length - sallesOccupees.length }, { label: "Conflits", value: conflits.length }]} />
      <DashWorkspace tabs={SUPERVISOR_TABS} tab={tab} onChange={setTab} direction={direction}>
        {tab === 0 ? (
          <div className="space-y-6">
            <KpiGrid>
              <KpiCard label="Séances aujourd&rsquo;hui" value={seancesAujourdhui.length} icon={Calendar} />
              <KpiCard label="Formateurs actifs" value={dashboard.formateursActifs} hint={`sur ${formateurs.length} total`} tone="blue" icon={GraduationCap} />
              <KpiCard label="Salles occupées" value={sallesOccupees.length} icon={MapPin} />
              <KpiCard label="Salles disponibles" value={SALLES.length - sallesOccupees.length} tone={SALLES.length - sallesOccupees.length > 3 ? "teal" : "amber"} icon={Building2} />
              <KpiCard label="Conflits" value={conflits.length} tone={conflits.length ? "red" : "teal"} icon={AlertCircle} />
              <KpiCard label="Stages Ã  valider" value={aTraiter.stagesAValider} tone="amber" icon={BookOpen} />
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
            <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
              <ChartCard title="Occupation des salles" height={220}>
                <PieChart><Pie data={occupationSalles.map((o) => ({ name: o.salle, value: o.seancesCount }))} dataKey="value" nameKey="name" innerRadius="45%" outerRadius="78%" paddingAngle={2} label={renderPieLabel} labelLine={false}>{occupationSalles.map((_, i) => (<Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />))}</Pie><Tooltip contentStyle={dashTooltip} /></PieChart>
              </ChartCard>
              <ChartCard title="Séances par jour" height={220}>
                <BarChart data={sessionsParJour}><CartesianGrid stroke="var(--border)" vertical={false} /><XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" /><YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" width={32} /><Tooltip contentStyle={dashTooltip} cursor={false} /><Bar dataKey="value" fill="var(--chart-4)" radius={[6, 6, 0, 0]} /></BarChart>
              </ChartCard>
              <ChartCard title="Charge des formateurs" height={220}>
                <BarChart data={workloadData} layout="vertical"><CartesianGrid stroke="var(--border)" horizontal={false} /><XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" /><YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" width={60} /><Tooltip contentStyle={dashTooltip} cursor={false} formatter={(value: number, _name: string, entry: { payload?: { seances?: number } }) => [`${entry.payload?.seances ?? value} séances`, "Charge"]} /><Bar dataKey="value" fill="var(--chart-1)" radius={[0, 6, 6, 0]} /></BarChart>
              </ChartCard>
            </div>
          </Section>
        )}
      </DashWorkspace>
    </>
  );
}

/* ------------------------------------------------------------------ */

function DashboardIndex() {
  const { role } = useAuth();
  return (
    <div className="space-y-6">
      {role === "enseignant" ? <DashboardEnseignant /> : role === "responsable" ? <DashboardResponsable /> : <DashboardDirecteur />}
    </div>
  );
}

export const Route = createFileRoute("/dashboard/")({ component: DashboardIndex });







