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

const Grid = () => (
  <CartesianGrid
    strokeDasharray="3 3"
    strokeOpacity={0.5}
    stroke="var(--border)"
    vertical={false}
  />
);

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
  color = "var(--chart-2)",
  colorful = false,
  height = 240,
}: {
  title: string;
  subtitle?: ReactNode;
  data: ChartDatum[];
  color?: string;
  colorful?: boolean;
  height?: number;
}) {
  return (
    <ChartFrame title={title} subtitle={subtitle} height={height}>
      <BarChart data={data} margin={{ top: 6, right: 6, left: -14, bottom: 0 }}>
        <Grid />
        <XAxis dataKey="name" {...AXIS} />
        <YAxis width={34} allowDecimals={false} {...AXIS} />
        <Tooltip contentStyle={dashTooltip} cursor={dashCursor} />
        <Bar dataKey="value" fill={color} maxBarSize={44} radius={[6, 6, 0, 0]}>
          {colorful
            ? data.map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))
            : null}
        </Bar>
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
  return (
    <ChartFrame title={title} subtitle={subtitle} height={height}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 10, left: 2, bottom: 0 }}
      >
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
            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
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
  height = 240,
}: {
  title: string;
  subtitle?: ReactNode;
  data: ChartDatum[];
  height?: number;
}) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
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
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius={0}
                outerRadius="94%"
                paddingAngle={1}
                stroke="var(--card)"
                strokeWidth={2}
                label={renderPieLabel}
                labelLine={false}
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
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
                    style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
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
