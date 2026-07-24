import type { ReactNode } from "react";
import { Search, X, RotateCcw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select";
import {
  softCard,
  softInput,
  softSelectContent, softSelectTrigger, eyebrowClass, tableWrap, tableEl, tableHead, tableBody, } from "@/lib/dash-ui";
import { cn } from "@/lib/utils";

export function PageHeader({
  eyebrow,
  title,
  actions,
}: {
  eyebrow: string;
  title: string;
  actions?: ReactNode;
}) {
  return (
    <motion.header
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="flex flex-wrap items-end justify-between gap-4"
    >
      <div>
        <p className={eyebrowClass}>{eyebrow}</p>
        <h1 className="mt-1 font-display text-3xl tracking-tight text-foreground md:text-4xl">
          {title}
        </h1>
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </motion.header>
  );
}

export function FilterBar({
  search,
  onSearch,
  placeholder,
  children,
}: {
  search: string;
  onSearch: (v: string) => void;
  placeholder: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-[16rem] flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
        <Input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder={placeholder}
          className={cn(softInput, "pl-10")}
        />
      </div>
      {children}
    </div>
  );
}

export const ALL = "__all__";

export function FilterSelect({
  value,
  onChange,
  options,
  allLabel,
  width = "w-[13rem]",
}: {
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
  allLabel: string;
  width?: string;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={cn(softSelectTrigger, width)}>
        <SelectValue placeholder={allLabel} />
      </SelectTrigger>
      <SelectContent className={softSelectContent}>
        <SelectItem value={ALL}>{allLabel}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o} value={o}>
            {o}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export type FilterDef = {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
  allLabel: string;
};

export function FilterPanel({
  search,
  onSearch,
  placeholder,
  filters,
  summary,
  trailing,
}: {
  search: string;
  onSearch: (v: string) => void;
  placeholder: string;
  filters: FilterDef[];
  summary?: ReactNode;
  trailing?: ReactNode;
}) {
  const active = filters.filter((f) => f.value !== ALL);
  const hasSearch = search.trim() !== "";
  const activeCount = active.length + (hasSearch ? 1 : 0);

  const resetAll = () => {
    for (const f of active) f.onChange(ALL);
    if (hasSearch) onSearch("");
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.05, ease: "easeOut" }}
      className={cn(softCard, "overflow-hidden")}
    >
      <div className="space-y-4 p-4 md:p-5">
        <div className="relative">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
          <Input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder={placeholder}
            className={cn(softInput, "h-11 ps-10 pe-10")}
          />
          {hasSearch ? (
            <button
              type="button"
              aria-label="Effacer la recherche"
              onClick={() => onSearch("")}
              className="absolute end-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground transition hover:bg-brand/10 hover:text-brand-dk"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(11.5rem,1fr))] gap-3">
          {filters.map((f) => {
            const isActive = f.value !== ALL;
            return (
              <div key={f.id} className="space-y-1.5">
                <label
                  className={cn(
                    "flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider transition-colors",
                    isActive ? "text-brand-dk" : "text-muted-foreground",
                  )}
                >
                  {f.label}
                  {isActive ? (
                    <span
                      aria-hidden
                      className="h-1.5 w-1.5 rounded-full bg-brand"
                    />
                  ) : null}
                </label>
                <Select value={f.value} onValueChange={f.onChange}>
                  <SelectTrigger
                    aria-label={f.label}
                    className={cn(
                      softSelectTrigger,
                      "w-full",
                      isActive && "border-brand/50 bg-brand/5 text-foreground",
                    )}
                  >
                    <SelectValue placeholder={f.allLabel} />
                  </SelectTrigger>
                  <SelectContent className={softSelectContent}>
                    <SelectItem value={ALL}>{f.allLabel}</SelectItem>
                    {f.options.map((o) => (
                      <SelectItem key={o} value={o}>
                        {o}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-brand/12 bg-muted/60 px-4 py-3 md:px-5">
        {summary ? (
          <span className="text-xs font-medium text-muted-foreground">
            {summary}
          </span>
        ) : null}

        {activeCount ? (
          <>
            <span className="hidden h-4 w-px bg-brand/15 sm:block" />
            <div className="flex flex-wrap items-center gap-1.5">
              {hasSearch ? (
                <FilterChip
                  label={`« ${search.trim()} »`}
                  onClear={() => onSearch("")}
                />
              ) : null}
              {active.map((f) => (
                <FilterChip
                  key={f.id}
                  label={f.value}
                  title={f.label}
                  onClear={() => f.onChange(ALL)}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={resetAll}
              className="ms-auto inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold text-alert transition hover:bg-alert/10"
            >
              <RotateCcw className="h-3 w-3" />
              Réinitialiser
            </button>
          </>
        ) : null}

        {trailing ? <span className="ms-auto">{trailing}</span> : null}
      </div>
    </motion.section>
  );
}

function FilterChip({
  label,
  title,
  onClear,
}: {
  label: string;
  title?: string;
  onClear: () => void;
}) {
  return (
    <span className="inline-flex max-w-[16rem] items-center gap-1 rounded-full bg-brand/12 py-1 ps-2.5 pe-1 text-xs font-medium text-brand-dk">
      {title ? (
        <span className="text-brand-dk/60">{title} :</span>
      ) : null}
      <span className="truncate">{label}</span>
      <button
        type="button"
        aria-label={`Retirer le filtre ${title ?? label}`}
        onClick={onClear}
        className="grid h-4 w-4 shrink-0 place-items-center rounded-full transition hover:bg-brand/25"
      >
        <X className="h-2.5 w-2.5" />
      </button>
    </span>
  );
}

export function DataTable({
  head,
  children,
  empty,
  isEmpty,
  minWidth,
}: {
  head: ReactNode;
  children: ReactNode;
  empty: string;
  isEmpty: boolean;
  minWidth?: string;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.1, ease: "easeOut" }}
      className={cn(softCard, "overflow-hidden")}
    >
      <div className={cn(tableWrap, "scroll-touch max-h-[72vh] overflow-y-auto")}>
        <table className={cn(tableEl, minWidth)}>
          <thead>
            <tr className={tableHead}>{head}</tr>
          </thead>
          {/* L'entrée des lignes est gérée par `motion.tr` dans chaque page :
              pas d'animation CSS ici, sinon les deux se superposeraient. */}
          <tbody className={tableBody}>{children}</tbody>
        </table>
        <AnimatePresence>
          {isEmpty ? (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="px-5 py-8 text-center text-sm text-muted-foreground"
            >
              {empty}
            </motion.p>
          ) : null}
        </AnimatePresence>
      </div>
    </motion.section>
  );
}

export function DetailShell({
  icon,
  title,
  subtitle,
  badges,
  children,
  footer,
}: {
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  badges?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="flex flex-col overflow-hidden"
    >
      <header className="shrink-0 border-b border-brand/12 bg-brand-wash px-6 py-5">
        <div className="flex items-start gap-3.5">
          {icon ? (
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand text-sm font-bold text-white shadow-[0_10px_22px_-12px_rgb(var(--istpm-shadow)/0.9)]">
              {icon}
            </span>
          ) : null}
          <div className="min-w-0 flex-1 pe-10">
            <h2 className="font-display text-lg font-bold leading-tight tracking-tight text-foreground">
              {title}
            </h2>
            {subtitle ? (
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {subtitle}
              </p>
            ) : null}
          </div>
        </div>
        {badges ? (
          <div className="mt-3.5 flex flex-wrap gap-1.5">{badges}</div>
        ) : null}
      </header>

      <div className="scroll-touch min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-5">
        {children}
      </div>

      {footer ? (
        <footer className="shrink-0 border-t border-brand/12 bg-muted/60 px-6 py-3.5">
          {footer}
        </footer>
      ) : null}
    </motion.div>
  );
}

export function DetailSection({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-2.5"
    >
      <div className="flex items-center gap-3">
        <h3 className={cn(eyebrowClass, "shrink-0")}>{title}</h3>
        <span className="h-px flex-1 bg-brand/12" />
        {action}
      </div>
      {children}
    </motion.section>
  );
}

export function DetailGrid({
  children,
  single,
}: {
  children: ReactNode;
  single?: boolean;
}) {
  return (
    <div
      className={cn(
        "grid gap-x-4 gap-y-3.5",
        single ? "grid-cols-1" : "sm:grid-cols-2",
      )}
    >
      {children}
    </div>
  );
}

export function DetailField({
  label,
  value,
  tone,
  full,
}: {
  label: string;
  value: ReactNode;
  tone?: "default" | "positive" | "negative" | "muted";
  full?: boolean;
}) {
  const toneClass =
    tone === "positive"
      ? "text-brand-dk"
      : tone === "negative"
        ? "text-alert"
        : tone === "muted"
          ? "text-muted-foreground"
          : "text-foreground";

  return (
    <div className={cn("min-w-0", full && "sm:col-span-2")}>
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80">
        {label}
      </dt>
      <dd className={cn("mt-1 text-sm font-medium leading-snug", toneClass)}>
        {value === "" || value === null || value === undefined ? (
          <span className="text-muted-foreground/60"> </span>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}

export function DetailRow({
  label,
  value,
  strong,
}: {
  label: string;
  value: ReactNode;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-brand/8 py-2 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span
        className={cn(
          "text-right text-sm text-foreground",
          strong ? "font-bold" : "font-medium",
        )}
      >
        {value}
      </span>
    </div>
  );
}

export function DetailTable({
  head,
  children,
}: {
  head: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-brand/12">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-brand/12 bg-muted text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {head}
            </tr>
          </thead>
          <tbody className="divide-y divide-brand/8">{children}</tbody>
        </table>
      </div>
    </div>
  );
}

export function DetailEmpty({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "warn";
}) {
  return (
    <p
      className={cn(
        "rounded-2xl px-4 py-3 text-sm",
        tone === "warn"
          ? "bg-warn-pale text-warn"
          : "bg-muted text-muted-foreground",
      )}
    >
      {children}
    </p>
  );
}
