/**
 * Shared dashboard UI tokens   soft, rounded, professional look (BANKOT-inspired)
 * expressed in the EIDEN palette (brass #B5E18B · beige #EAE6BC · navy #28396C).
 *
 * Import these instead of re-declaring per-page magic strings so every dashboard
 * page shares one consistent surface / input / badge language.
 */

/** Primary surface   rounded card with hairline navy border + soft elevated shadow. */
export const softCard =
  "rounded-3xl border border-[#28396C]/10 bg-card shadow-[0_18px_45px_-28px_rgba(40,57,108,0.35)]";

/** Interactive surface   same as softCard but lifts on hover (for clickable cards). */
export const softCardHover =
  "rounded-3xl border border-[#28396C]/10 bg-card shadow-[0_18px_45px_-28px_rgba(40,57,108,0.35)] transition-all hover:-translate-y-0.5 hover:shadow-[0_28px_60px_-28px_rgba(40,57,108,0.45)]";

/**
 * Text input   rounded, brass focus ring.
 * Carries its own `border` width and `w-full`: Tailwind's preflight resets every
 * element to `border: 0 solid`, so a bare `<input>` styled only with a border
 * *colour* renders with no visible box.
 */
export const softInput =
  "w-full min-w-0 rounded-xl border border-[#28396C]/15 bg-card shadow-none focus-visible:border-[#6BA53A] focus-visible:ring-2 focus-visible:ring-[#B5E18B]/40";

/** Select trigger   matches softInput height/rounding. */
export const softSelectTrigger =
  "h-10 rounded-xl border-[#28396C]/15 bg-card shadow-none focus:ring-0 focus:ring-offset-0 data-[placeholder]:text-muted-foreground/70";

/** Select dropdown surface. */
export const softSelectContent = "rounded-2xl border-[#28396C]/10";

/** Small uppercase field label. */
export const labelClass =
  "text-[10px] font-medium uppercase tracking-wider text-muted-foreground";

/** Section eyebrow (uppercase, wide tracking). */
export const eyebrowClass =
  "text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground";

/** Primary pill button (brass fill, navy text). */
export const primaryPill =
  "inline-flex items-center gap-2 rounded-full bg-[#B5E18B] px-5 py-2.5 text-sm font-bold text-[#28396C] shadow-[0_14px_30px_-14px_rgba(107,165,58,0.7)] transition hover:brightness-105";

/** Solid navy pill button. */
export const navyPill =
  "inline-flex items-center gap-2 rounded-full bg-[#28396C] px-5 py-2.5 text-sm font-medium text-white shadow-[0_14px_30px_-14px_rgba(40,57,108,0.6)] transition hover:bg-[#1B2A55]";

/** Ghost / secondary pill button. */
export const ghostPill =
  "inline-flex items-center gap-2 rounded-full border border-[#28396C]/15 bg-card px-5 py-2.5 text-sm font-medium text-foreground transition hover:bg-[#B5E18B]/15";

/** Small square icon-action button (view / edit inside tables). */
export const iconButton =
  "grid h-9 w-9 place-items-center rounded-xl border border-[#28396C]/15 bg-card text-muted-foreground transition hover:bg-[#B5E18B]/15 hover:text-foreground";

/**
 * Dialog surface   soft, rounded, elevated.
 * `flex flex-col` so a header / scrolling body / footer stack can size itself against
 * the capped height. Give the body `min-h-0 flex-1 overflow-y-auto` rather than a `vh`
 * max-height: a `vh` body ignores this cap and pushes the footer out of the clipped box.
 */
export const dialogSurface =
  "flex flex-col gap-0 overflow-hidden rounded-3xl border border-[#28396C]/10 bg-card p-0 shadow-[0_35px_80px_-40px_rgba(40,57,108,0.5)] sm:rounded-3xl " +
  "max-h-[min(90vh,720px)] w-[min(100vw-1.5rem,560px)] max-w-[min(100vw-1.5rem,560px)] " +
  "[&>button]:right-5 [&>button]:top-5 [&>button]:rounded-full [&>button]:border [&>button]:border-[#28396C]/15 [&>button]:bg-card [&>button]:opacity-100 [&>button]:hover:bg-muted [&>button]:focus:ring-0 [&>button]:focus:ring-offset-0";

/** Recharts tooltip content style   matches the soft card language. */
export const dashTooltip = {
  background: "var(--card)",
  border: "1px solid rgba(40,57,108,0.15)",
  borderRadius: 12,
  color: "var(--foreground)",
} as const;

/** Status colours   payé / en attente / retard / impaye (shared across pages). */
export const STATUS_COLORS = {
  paye: "#6BA53A",
  en_attente: "#E8A13C",
  retard: "#E25C5C",
  impaye: "#9A2F2F",
} as const;

/** Rounded status pill with a soft tinted background. */
export function statusPill(tone: "paye" | "en_attente" | "retard" | "impaye" | "neutral") {
  const map = {
    paye: "bg-[#B5E18B]/30 text-[#3E6420]",
    en_attente: "bg-[#F4E3C0] text-[#8A5A16]",
    retard: "bg-[#F6D8D8] text-[#9A2F2F]",
    impaye: "bg-[#E25C5C]/20 text-[#9A2F2F]",
    neutral: "bg-muted text-foreground/80",
  } as const;
  return `inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${map[tone]}`;
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
