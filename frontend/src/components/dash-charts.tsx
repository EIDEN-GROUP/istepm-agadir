/**
 * Reusable dashboard chart primitives.
 *
 * One consistent visual language (soft card frame, dashed baseline grid, clean
 * borderless axes, gradient fills, rounded marks) across a *variety* of chart
 * types   area, line, bar and donut   so each workspace reads as lively and
 * distinct rather than a wall of identical bars. Colours come from the shared
 * `CHART_COLORS` ramp (teal family + blue/violet/amber/red) so the palette stays
 * on-brand while still feeling colourful.
 */
import { useId, type ReactElement, type ReactNode } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";
import {
  softCard,
  eyebrowClass,
  dashTooltip,
  dashCursor,
  CHART_COLORS,
  renderPieLabel,
} from "@/lib/dash-ui";

export type ChartDatum = { name: string; value: number };

/** Shared clean-axis props (no tick lines, no axis line, muted small labels). */
const AXIS = {
  tick: { fontSize: 11 },
  tickLine: false,
  axisLine: false,
  stroke: "var(--muted-foreground)",
} as const;

/**
 * Axe des catégories d'un graphe en colonnes : une ligne de base discrète est
 * nécessaire, sinon les barres flottent au-dessus du vide. Les libellés sont un
 * cran plus contrastés que les graduations chiffrées, car ce sont eux qu'on lit.
 */
const CATEGORY_AXIS = {
  ...AXIS,
  tick: { fontSize: 11, fill: "var(--foreground)", fillOpacity: 0.72 },
  axisLine: { stroke: "var(--border)", strokeWidth: 1 },
  tickMargin: 8,
} as const;

const Grid = () => (
  <CartesianGrid
    strokeDasharray="4 6"
    strokeOpacity={0.45}
    stroke="var(--border)"
    vertical={false}
  />
);

/** Chiffre posé au sommet de chaque colonne ; les zéros ne sont pas étiquetés. */
const VALUE_LABEL = {
  position: "top" as const,
  offset: 8,
  fontSize: 11,
  fontWeight: 600,
  fill: "var(--foreground)",
  fillOpacity: 0.62,
  formatter: (v: number) => (v ? String(v) : ""),
};

/**
 * Légende à pastilles, alignée sur le langage des cartes plutôt que sur le
 * rendu par défaut de Recharts (texte gris, pastilles carrées).
 *
 * Les couleurs viennent de la définition des séries, pas du `payload` de
 * Recharts : les barres étant remplies par un dégradé (`url(#…)`), le payload
 * ne porte aucune couleur exploitable en CSS.
 */
function ChartLegend({
  items,
}: {
  items: readonly { label: string; color: string }[];
}) {
  return (
    <ul className="flex flex-wrap items-center justify-end gap-x-4 gap-y-1">
      {items.map((it) => (
        <li
          key={it.label}
          className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground"
        >
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-[3px]"
            style={{ backgroundColor: it.color }}
          />
          {it.label}
        </li>
      ))}
    </ul>
  );
}

/**
 * Build one vertical (or horizontal) linear gradient per colour.
 *
 * La teinte reste pleine sur la majeure partie de la barre et ne s'éclaircit
 * que vers l'extrémité : un dégradé trop marqué délave la couleur de marque et
 * donne des barres qui semblent flotter. Returns the `<defs>` block and the
 * gradient ids to reference as `fill={url(#id)}`.
 */
function useGradients(colors: readonly string[], horizontal = false) {
  const base = useId().replace(/:/g, "");
  // Les colonnes se lisent du bas (pleine teinte) vers le haut ; les barres
  // horizontales, de la gauche vers la droite.
  const dir = horizontal
    ? { x1: "0", y1: "0", x2: "1", y2: "0" }
    : { x1: "0", y1: "1", x2: "0", y2: "0" };
  const ids = colors.map((_, i) => `grad${base}-${i}`);
  const defs = (
    <defs>
      {colors.map((c, i) => (
        <linearGradient key={i} id={ids[i]} {...dir}>
          <stop offset="0%" stopColor={c} stopOpacity={1} />
          <stop offset="65%" stopColor={c} stopOpacity={0.94} />
          <stop offset="100%" stopColor={c} stopOpacity={0.78} />
        </linearGradient>
      ))}
    </defs>
  );
  return { ids, defs };
}

/* ------------------------------------------------------------------ */
/*  Frame                                                              */
/* ------------------------------------------------------------------ */

export function ChartFrame({
  title,
  subtitle,
  height = 240,
  children,
}: {
  title: string;
  subtitle?: ReactNode;
  height?: number;
  children: ReactElement;
}) {
  return (
    <div className={cn(softCard, "p-4 sm:p-5")}>
      <div className="flex items-center justify-between gap-2">
        <p className={eyebrowClass}>{title}</p>
        {subtitle ? (
          <span className="text-[11px] font-medium text-muted-foreground">
            {subtitle}
          </span>
        ) : null}
      </div>
      <div className="mt-3 w-full" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Area (tendance dans le temps)                                      */
/* ------------------------------------------------------------------ */

export function AreaTrend({
  title,
  subtitle,
  data,
  color = "var(--chart-1)",
  height = 240,
}: {
  title: string;
  subtitle?: ReactNode;
  data: ChartDatum[];
  color?: string;
  height?: number;
}) {
  const gid = "grad-" + useId().replace(/:/g, "");
  return (
    <ChartFrame title={title} subtitle={subtitle} height={height}>
      <AreaChart data={data} margin={{ top: 6, right: 6, left: -14, bottom: 0 }}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.34} />
            <stop offset="100%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <Grid />
        <XAxis dataKey="name" interval="preserveStartEnd" {...AXIS} />
        <YAxis width={34} allowDecimals={false} {...AXIS} />
        <Tooltip contentStyle={dashTooltip} />
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2.5}
          fill={`url(#${gid})`}
          activeDot={{ r: 4, strokeWidth: 0 }}
        />
      </AreaChart>
    </ChartFrame>
  );
}

/* ------------------------------------------------------------------ */
/*  Line (tendance fine)                                               */
/* ------------------------------------------------------------------ */

export function LineTrend({
  title,
  subtitle,
  data,
  color = "var(--chart-5)",
  height = 240,
}: {
  title: string;
  subtitle?: ReactNode;
  data: ChartDatum[];
  color?: string;
  height?: number;
}) {
  return (
    <ChartFrame title={title} subtitle={subtitle} height={height}>
      <LineChart data={data} margin={{ top: 6, right: 6, left: -14, bottom: 0 }}>
        <Grid />
        <XAxis dataKey="name" {...AXIS} />
        <YAxis width={34} allowDecimals={false} {...AXIS} />
        <Tooltip contentStyle={dashTooltip} />
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2.5}
          dot={{ r: 3, strokeWidth: 0, fill: color }}
          activeDot={{ r: 5, strokeWidth: 0 }}
        />
      </LineChart>
    </ChartFrame>
  );
}

/* ------------------------------------------------------------------ */
/*  Bar (colonnes, option multicolore)                                 */
/* ------------------------------------------------------------------ */

export function BarSeries({
  title,
  subtitle,
  data,
  color = "var(--chart-3)",
  colorful = false,
  palette = CHART_COLORS,
  height = 240,
}: {
  title: string;
  subtitle?: ReactNode;
  data: ChartDatum[];
  color?: string;
  colorful?: boolean;
  /** Ramp used when `colorful` (defaults to the teal `CHART_COLORS`). */
  palette?: readonly string[];
  height?: number;
}) {
  // Monochrome brand look: a single teal gradient, or per-bar gradients drawn
  // from `palette` when `colorful` (teal ramp by default, multi-tone brand
  // palette on the Analyse dashboard).
  const cells = colorful
    ? data.map((_, i) => palette[i % palette.length])
    : [color];
  const { ids, defs } = useGradients(cells);
  return (
    <ChartFrame title={title} subtitle={subtitle} height={height}>
      {/* `barCategoryGap` en pourcentage : les colonnes gardent une largeur
          confortable quelle que soit la largeur de la carte, au lieu de se
          réduire à des traits sur les écrans larges. */}
      <BarChart
        data={data}
        margin={{ top: 22, right: 8, left: -14, bottom: 0 }}
        barCategoryGap="26%"
      >
        {defs}
        <Grid />
        <XAxis dataKey="name" {...CATEGORY_AXIS} />
        <YAxis width={34} allowDecimals={false} {...AXIS} />
        <Tooltip contentStyle={dashTooltip} cursor={dashCursor} />
        <Bar dataKey="value" maxBarSize={46} radius={[8, 8, 3, 3]}>
          {data.map((_, i) => (
            <Cell key={i} fill={`url(#${ids[i % ids.length]})`} />
          ))}
          <LabelList dataKey="value" {...VALUE_LABEL} />
        </Bar>
      </BarChart>
    </ChartFrame>
  );
}

/* ------------------------------------------------------------------ */
/*  Bar groupée (deux séries côte à côte)                              */
/* ------------------------------------------------------------------ */

/** Une ligne = une catégorie ; chaque série y apporte sa propre colonne. */
export type GroupedDatum = { name: string } & Record<string, string | number>;

/**
 * Comparaison de deux (ou plus) séries sur les mêmes catégories, par exemple
 * « examens planifiés » contre « examens faits » pour chaque formateur. Les
 * étiquettes de l'axe X sont inclinées : les noms propres sont trop longs pour
 * tenir à l'horizontale.
 */
export function GroupedBarSeries({
  title,
  subtitle,
  data,
  series,
  height = 240,
}: {
  title: string;
  subtitle?: ReactNode;
  data: GroupedDatum[];
  /** Clé de la donnée, libellé de légende et couleur, dans l'ordre d'affichage. */
  series: readonly { key: string; label: string; color: string }[];
  height?: number;
}) {
  const { ids, defs } = useGradients(series.map((s) => s.color));
  return (
    <ChartFrame title={title} subtitle={subtitle} height={height}>
      {/* Les deux colonnes d'une même catégorie sont collées (`barGap` de 3 px)
          et l'espace est reporté entre catégories : c'est ce contraste qui fait
          lire la paire comme une comparaison, et non comme quatre barres. */}
      <BarChart
        data={data}
        margin={{ top: 24, right: 8, left: -14, bottom: 0 }}
        barGap={3}
        barCategoryGap="34%"
      >
        {defs}
        <Grid />
        <XAxis
          dataKey="name"
          {...CATEGORY_AXIS}
          tick={{ fontSize: 10, fill: "var(--foreground)", fillOpacity: 0.72 }}
          interval={0}
          angle={-20}
          textAnchor="end"
          height={62}
        />
        <YAxis width={34} allowDecimals={false} {...AXIS} />
        <Tooltip contentStyle={dashTooltip} cursor={dashCursor} />
        <Legend
          verticalAlign="top"
          align="right"
          height={28}
          content={() => <ChartLegend items={series} />}
        />
        {series.map((s, i) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            name={s.label}
            maxBarSize={28}
            radius={[6, 6, 2, 2]}
            fill={`url(#${ids[i]})`}
          >
            <LabelList dataKey={s.key} {...VALUE_LABEL} />
          </Bar>
        ))}
      </BarChart>
    </ChartFrame>
  );
}

/* ------------------------------------------------------------------ */
/*  Bar horizontal (classement)                                        */
/* ------------------------------------------------------------------ */

export function HBarSeries({
  title,
  subtitle,
  data,
  height = 240,
  formatter,
}: {
  title: string;
  subtitle?: ReactNode;
  data: ChartDatum[];
  height?: number;
  formatter?: (
    value: number,
    name: string,
    entry: { payload?: { seances?: number } },
  ) => [string, string];
}) {
  const { ids, defs } = useGradients(
    data.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]),
    true,
  );
  return (
    <ChartFrame title={title} subtitle={subtitle} height={height}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 10, left: 2, bottom: 0 }}
      >
        {defs}
        <CartesianGrid
          strokeDasharray="3 3"
          strokeOpacity={0.5}
          stroke="var(--border)"
          horizontal={false}
        />
        <XAxis type="number" {...AXIS} />
        <YAxis type="category" dataKey="name" width={64} {...AXIS} />
        <Tooltip contentStyle={dashTooltip} cursor={dashCursor} formatter={formatter} />
        <Bar dataKey="value" maxBarSize={22} radius={[0, 6, 6, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={`url(#${ids[i % ids.length]})`} />
          ))}
        </Bar>
      </BarChart>
    </ChartFrame>
  );
}

/* ------------------------------------------------------------------ */
/*  Donut                                                              */
/* ------------------------------------------------------------------ */

export function DonutChart({
  title,
  subtitle,
  data,
  palette = CHART_COLORS,
  height = 240,
}: {
  title: string;
  subtitle?: ReactNode;
  data: ChartDatum[];
  /** Slice colour ramp (defaults to the teal `CHART_COLORS`). */
  palette?: readonly string[];
  height?: number;
}) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const { ids, defs } = useGradients(
    data.map((_, i) => palette[i % palette.length]),
  );
  return (
    <div className={cn(softCard, "p-4 sm:p-5")}>
      <div className="flex items-center justify-between gap-2">
        <p className={eyebrowClass}>{title}</p>
        {subtitle ? (
          <span className="text-[11px] font-medium text-muted-foreground">
            {subtitle}
          </span>
        ) : null}
      </div>
      <div className="mt-2 flex flex-col items-center gap-3 sm:flex-row sm:gap-5">
        <div className="w-full sm:w-1/2" style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              {defs}
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius="52%"
                outerRadius="94%"
                paddingAngle={1}
                stroke="var(--card)"
                strokeWidth={2}
                label={renderPieLabel}
                labelLine={false}
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={`url(#${ids[i % ids.length]})`} />
                ))}
              </Pie>
              <Tooltip contentStyle={dashTooltip} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <ul className="w-full space-y-2.5 sm:w-1/2">
          {data.map((d, i) => {
            const pct = Math.round((d.value / total) * 100);
            return (
              <li
                key={d.name}
                className="flex items-center justify-between gap-2 text-sm"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: palette[i % palette.length] }}
                  />
                  <span className="truncate text-muted-foreground">{d.name}</span>
                </span>
                <span className="shrink-0 font-semibold tabular-nums text-foreground">
                  {d.value}{" "}
                  <span className="text-xs font-normal text-muted-foreground">
                    ({pct}%)
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
