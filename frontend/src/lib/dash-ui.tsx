/**
 * Shared dashboard UI tokens   soft, rounded, professional look
 * expressed in the ISTPM palette (teal #029994 · red #e51e26 · white #ffffff).
 *
 * Import these instead of re-declaring per-page magic strings so every dashboard
 * page shares one consistent surface / input / badge language.
 *
 * Colours here are expressed as Tailwind theme utilities (`brand`, `alert`,
 * `warn`, `info`, registered in `styles.css` under `@theme inline`) rather than
 * hex literals, so a future palette change is a one-file edit.
 */
import type { BadgeTone } from "./istpm-data";

/** Primary surface   airy rounded card with a near-invisible hairline + soft,
 *  lit elevation (reference dashboard look). */
export const softCard =
  "rounded-3xl border border-brand/8 bg-card surface-2";

/** Interactive surface   same as softCard but lifts smoothly on hover (clickable cards). */
export const softCardHover =
  "rounded-3xl border border-brand/8 bg-card surface-interactive hover:border-brand/20";

/**
 * Text input   rounded, teal focus ring.
 * Carries its own `border` width and `w-full`: Tailwind's preflight resets every
 * element to `border: 0 solid`, so a bare `<input>` styled only with a border
 * *colour* renders with no visible box.
 */
export const softInput =
  "w-full min-w-0 rounded-xl border border-brand/20 bg-card shadow-none transition-[border-color,box-shadow,background-color] duration-200 hover:border-brand/35 focus-visible:border-brand focus-visible:ring-4 focus-visible:ring-brand/15";

/** Select trigger   matches softInput height/rounding. */
export const softSelectTrigger =
  "h-10 rounded-xl border-brand/20 bg-card shadow-none transition-[border-color,box-shadow] duration-200 hover:border-brand/35 focus:ring-0 focus:ring-offset-0 data-[state=open]:border-brand data-[state=open]:ring-4 data-[state=open]:ring-brand/15 data-[placeholder]:text-muted-foreground/70";

/** Select dropdown surface. */
export const softSelectContent = "rounded-2xl border-brand/15";

/** Small uppercase field label. */
export const labelClass =
  "text-[10px] font-medium uppercase tracking-wider text-muted-foreground";

/** Section eyebrow (uppercase, wide tracking). */
export const eyebrowClass =
  "text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground";

/** Shared focus-ring for pill/icon buttons   crisp, offset from the surface. */
const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/45 focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/** Primary pill button   solid teal, one colour, with a light shadow. Main CTA. */
export const primaryPill =
  "inline-flex items-center gap-2 rounded-full bg-med px-5 py-2.5 text-sm font-bold text-white shadow-[0_4px_12px_-4px_rgb(var(--istpm-shadow)/0.3)] transition-all duration-200 hover:bg-med-dk active:scale-[0.98] " +
  focusRing;

/** Solid dark-teal pill button (secondary emphasis). */
export const navyPill =
  "inline-flex items-center gap-2 rounded-full bg-brand-dk px-5 py-2.5 text-sm font-medium text-white shadow-[0_4px_12px_-4px_rgb(var(--istpm-shadow)/0.28)] transition-all duration-200 hover:bg-brand-md active:scale-[0.98] " +
  focusRing;

/** Destructive pill button   solid red, reserved for irreversible actions. */
export const dangerPill =
  "inline-flex items-center gap-2 rounded-full bg-alert px-5 py-2.5 text-sm font-bold text-white shadow-[0_4px_12px_-4px_rgba(229,30,38,0.35)] transition-all duration-200 hover:bg-alert-dk active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-alert/45 focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/** Ghost / secondary pill button. */
export const ghostPill =
  "inline-flex items-center gap-2 rounded-full border border-brand/20 bg-card px-5 py-2.5 text-sm font-medium text-foreground transition-all duration-200 hover:border-brand/35 hover:bg-brand/8 active:scale-[0.98] " +
  focusRing;

/** Small square icon-action button (view / edit inside tables). */
export const iconButton =
  "grid h-9 w-9 place-items-center rounded-xl border border-brand/20 bg-card text-muted-foreground transition-all duration-200 hover:border-brand/35 hover:bg-brand/10 hover:text-brand-dk active:scale-95 " +
  focusRing;

/** Destructive variant of iconButton. */
export const iconButtonDanger =
  "grid h-9 w-9 place-items-center rounded-xl border border-alert/25 bg-card text-alert transition-all duration-200 hover:bg-alert/10 hover:text-alert-dk active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-alert/45 focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/**
 * Dialog surface   soft, rounded, elevated.
 * `flex flex-col` so a header / scrolling body / footer stack can size itself against
 * the capped height. Give the body `min-h-0 flex-1 overflow-y-auto` rather than a `vh`
 * max-height: a `vh` body ignores this cap and pushes the footer out of the clipped box.
 */
export const dialogSurface =
  "flex flex-col gap-0 overflow-hidden rounded-3xl border border-brand/15 bg-card p-0 surface-4 sm:rounded-3xl " +
  // Les `_` deviennent des espaces : `min()` exige des espaces autour du `-`,
  // sans quoi la déclaration est invalide et ignorée   le dialogue gardait
  // alors 560 px et débordait sur mobile.
  "max-h-[min(90vh,720px)] w-[min(100vw_-_1.5rem,560px)] max-w-[min(100vw_-_1.5rem,560px)] " +
  "[&>button]:right-5 [&>button]:top-5 [&>button]:rounded-full [&>button]:border [&>button]:border-brand/20 [&>button]:bg-card [&>button]:opacity-100 [&>button]:hover:bg-muted [&>button]:focus:ring-0 [&>button]:focus:ring-offset-0";

/**
 * Wider dialog for detail sheets with tables inside.
 * Spelled out rather than derived from `dialogSurface` by string replacement:
 * Tailwind v4 scans source text statically, so a class only produced at runtime
 * never makes it into the generated stylesheet.
 */
export const dialogSurfaceWide =
  "flex flex-col gap-0 overflow-hidden rounded-3xl border border-brand/15 bg-card p-0 surface-4 sm:rounded-3xl " +
  "max-h-[min(90vh,720px)] w-[min(100vw_-_1.5rem,760px)] max-w-[min(100vw_-_1.5rem,760px)] " +
  "[&>button]:right-5 [&>button]:top-5 [&>button]:rounded-full [&>button]:border [&>button]:border-brand/20 [&>button]:bg-card [&>button]:opacity-100 [&>button]:hover:bg-muted [&>button]:focus:ring-0 [&>button]:focus:ring-offset-0";

/** Recharts tooltip content style   matches the soft card language. */
export const dashTooltip = {
  background: "color-mix(in srgb, var(--card) 88%, transparent)",
  backdropFilter: "blur(8px)",
  WebkitBackdropFilter: "blur(8px)",
  border: "1px solid rgb(var(--istpm-shadow) / 0.16)",
  borderRadius: 14,
  boxShadow: "var(--elevation-3)",
  color: "var(--foreground)",
  padding: "10px 12px",
} as const;

/** Shared Recharts cursor fill for hovered bars/areas   faint teal wash. */
export const dashCursor = { fill: "rgb(var(--istpm-shadow) / 0.06)" } as const;

/** Ordered chart palette   teal family first, red last so it stays meaningful. */
export const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
  "var(--chart-7)",
] as const;

/**
 * Multi-tone brand palette   teal + blue + amber + violet + sage + coral + red.
 * Unlike the monochrome teal `CHART_COLORS` ramp, this spans the full ISTEPM
 * brand family so a chart reads as colourful/categorical. Opt-in per chart via
 * the `palette` prop   used on the director "Analyse" dashboard.
 */
export const BRAND_CHART_COLORS = [
  "var(--istpm-teal)",
  "var(--istpm-blue)",
  "var(--istpm-amber)",
  "var(--istpm-violet)",
  "var(--istpm-sage)",
  "var(--istpm-coral)",
  "var(--istpm-red)",
] as const;

/**
 * Solid colours per semantic tone   for row accent bars, chart cells and dots
 * where a class name will not do.
 */
export const TONE_COLORS: Record<BadgeTone, string> = {
  teal: "var(--istpm-teal)",
  red: "var(--istpm-red)",
  amber: "var(--istpm-amber)",
  blue: "var(--istpm-blue)",
  neutral: "var(--istpm-teal-lt)",
};

/** Status colours   payé / en attente / retard / impayé (shared across pages). */
export const STATUS_COLORS = {
  paye: "var(--istpm-teal)",
  en_attente: "var(--istpm-amber)",
  retard: "var(--istpm-red)",
  impaye: "var(--istpm-red-dk)",
} as const;

/**
 * Rounded status badge keyed to the `BadgeTone` union exported by `istpm-data`.
 *
 * teal   = positive   payé · admis · validé · inscrit · publié
 * red    = negative   impayé · retard · ajourné · abandon · à risque
 * amber  = pending    en attente · rattrapage
 * blue   = in-flight  en cours · convention signée
 */
export function toneBadge(tone: BadgeTone) {
  const map: Record<BadgeTone, string> = {
    teal: "bg-brand/12 text-brand-dk ring-1 ring-inset ring-brand/20",
    red: "bg-alert/10 text-alert-dk ring-1 ring-inset ring-alert/20",
    amber: "bg-warn-pale text-warn ring-1 ring-inset ring-warn/25",
    blue: "bg-info-pale text-info ring-1 ring-inset ring-info/25",
    neutral: "bg-muted text-foreground/80 ring-1 ring-inset ring-brand/12",
  };
  return `inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${map[tone]}`;
}

/**
 * Legacy payment-status pill. Kept so existing pages keep compiling; delegates
 * to `toneBadge` so there is a single source of badge truth.
 */
export function statusPill(
  tone: "paye" | "en_attente" | "retard" | "impaye" | "neutral",
) {
  const toTone: Record<typeof tone, BadgeTone> = {
    paye: "teal",
    en_attente: "amber",
    retard: "red",
    impaye: "red",
    neutral: "neutral",
  };
  return toneBadge(toTone[tone]);
}

/**
 * Étiquette « % » inscrite au centre de chaque part d'un camembert Recharts.
 * Les parts nulles ne sont pas étiquetées (sinon le 0 % se superpose aux voisines).
 */
export function renderPieLabel({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
}: {
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  percent: number;
}) {
  if (!percent) return null;
  const RAD = Math.PI / 180;
  const r = innerRadius + (outerRadius - innerRadius) * 0.6;
  const x = cx + r * Math.cos(-midAngle * RAD);
  const y = cy + r * Math.sin(-midAngle * RAD);
  return (
    <text
      x={x}
      y={y}
      fill="#fff"
      fontSize={12}
      fontWeight={700}
      textAnchor="middle"
      dominantBaseline="central"
    >
      {`${Math.round(percent * 100)}%`}
    </text>
  );
}

/** Deterministic initials from a name string (for avatar chips). */
export function initials(name: string) {
  const parts = name.replace(/[/].*/, "").trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "?";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

/** Teal avatar chip used in name cells across the student/teacher tables. */
export const avatarChip =
  "grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand/20 to-brand/10 text-[11px] font-bold text-brand-dk ring-1 ring-inset ring-brand/15";

/**
 * Shared table shell classes   used by every list page.
 *
 * Les lignes tiennent sur **une seule ligne de texte** : chaque cellule est en
 * `whitespace-nowrap`, et le détail complet se lit dans la fiche. Cela garde
 * une hauteur de ligne constante et un balayage vertical rapide.
 */
export const tableWrap = "overflow-x-auto";
export const tableEl =
  "w-full min-w-[900px] text-left text-sm [&_th]:border-r [&_th]:border-brand/12 [&_td]:border-r [&_td]:border-brand/8 " +
  "[&_td]:whitespace-nowrap [&_th]:whitespace-nowrap [&_td]:px-4 [&_td]:py-3 [&_th]:px-4 [&_th]:py-3";
export const tableHead =
  "sticky top-0 z-10 border-b border-brand/15 bg-muted/95 backdrop-blur-sm text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/90";
export const tableBody = "divide-y divide-brand/8";
export const tableRow =
  "group/row h-14 cursor-pointer transition-colors duration-200 hover:bg-brand/[0.06]";

/** Cellule dont le contenu peut être long : tronquée plutôt que repliée. */
export const cellTruncate = "max-w-[15rem] truncate";
/** Groupe de boutons d'action, centré dans sa cellule. */
export const rowActions = "flex items-center justify-center gap-1";
