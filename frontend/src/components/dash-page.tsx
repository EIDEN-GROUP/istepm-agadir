/**
 * Small building blocks shared by the ISTPM list pages (étudiants, formateurs,
 * examens, bulletins, stages). They exist so those five pages stay short and
 * visually identical   header, filter bar, table shell and detail-dialog rows
 * are declared once here instead of copy-pasted per page.
 */
import type { ReactNode } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  softCard,
  softInput,
  softSelectContent,
  softSelectTrigger,
  eyebrowClass,
  tableWrap,
  tableEl,
  tableHead,
  tableBody,
} from "@/lib/dash-ui";
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
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className={eyebrowClass}>{eyebrow}</p>
        <h1 className="mt-1 font-display text-3xl tracking-tight text-foreground md:text-4xl">
          {title}
        </h1>
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </header>
  );
}

/** Search box + any number of dropdown filters, on one wrapping row. */
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

/**
 * Dropdown filter with a built-in "all" option.
 * The sentinel is a non-empty string because Radix Select reserves `""`.
 */
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

/** Card-wrapped scrollable table. `head` is a <tr>, `children` are <tr>s. */
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
    <section className={cn(softCard, "overflow-hidden")}>
      <div className={tableWrap}>
        <table className={cn(tableEl, minWidth)}>
          <thead>
            <tr className={tableHead}>{head}</tr>
          </thead>
          <tbody className={tableBody}>{children}</tbody>
        </table>
        {isEmpty ? (
          <p className="px-5 py-8 text-center text-sm text-muted-foreground">
            {empty}
          </p>
        ) : null}
      </div>
    </section>
  );
}

/** Titled block inside a detail dialog. */
export function DetailSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <p className={eyebrowClass}>{title}</p>
      {children}
    </div>
  );
}

/** Label / value line inside a detail dialog. */
export function DetailRow({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-brand/8 py-1.5 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-medium text-foreground">
        {value}
      </span>
    </div>
  );
}

/** Standard dialog chrome: sticky title bar + scrolling body. */
export function DetailShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <>
      <div className="shrink-0 border-b border-brand/12 px-6 py-5">
        <p className="font-display text-lg font-bold leading-tight tracking-tight text-foreground">
          {title}
        </p>
        {subtitle ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
        {children}
      </div>
      {footer ? (
        <div className="shrink-0 border-t border-brand/12 px-6 py-4">
          {footer}
        </div>
      ) : null}
    </>
  );
}
