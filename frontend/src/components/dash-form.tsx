/**
 * Form controls shared by the create/edit dialogs.
 *
 * Every entity form (étudiant, formateur, examen, stage, paiement…) is built
 * from these so validation, spacing and error styling stay identical across
 * the app, and each page's form stays a short declarative list of fields.
 */
import type { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  softInput,
  softSelectTrigger,
  softSelectContent,
  labelClass,
  primaryPill,
  ghostPill,
  dialogSurface,
  dialogSurfaceWide,
} from "@/lib/dash-ui";
import { DetailShell } from "@/components/dash-page";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Champs                                                             */
/* ------------------------------------------------------------------ */

function FieldShell({
  label,
  error,
  required,
  children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className={labelClass}>
        {label}
        {required ? <span className="ml-0.5 text-alert">*</span> : null}
      </Label>
      {children}
      {error ? <p className="text-[11px] text-alert">{error}</p> : null}
    </div>
  );
}

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  error,
  required,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  error?: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <FieldShell label={label} error={error} required={required}>
      <Input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={cn(softInput, error && "border-alert focus-visible:border-alert")}
      />
    </FieldShell>
  );
}

export function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step,
  error,
  required,
  suffix,
}: {
  label: string;
  value: number | "";
  onChange: (v: number | "") => void;
  min?: number;
  max?: number;
  step?: number;
  error?: string;
  required?: boolean;
  suffix?: string;
}) {
  return (
    <FieldShell label={label} error={error} required={required}>
      <div className="relative">
        <Input
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) =>
            onChange(e.target.value === "" ? "" : Number(e.target.value))
          }
          className={cn(
            softInput,
            suffix && "pr-14",
            error && "border-alert focus-visible:border-alert",
          )}
        />
        {suffix ? (
          <span className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            {suffix}
          </span>
        ) : null}
      </div>
    </FieldShell>
  );
}

export function SelectField<T extends string>({
  label,
  value,
  onChange,
  options,
  placeholder,
  error,
  required,
}: {
  label: string;
  value: T | "";
  onChange: (v: T) => void;
  /** Either plain strings, or {value,label} when the two differ. */
  options: readonly T[] | readonly { value: T; label: string }[];
  placeholder?: string;
  error?: string;
  required?: boolean;
}) {
  const items = options.map((o) =>
    typeof o === "string" ? { value: o as T, label: o as string } : o,
  );
  return (
    <FieldShell label={label} error={error} required={required}>
      <Select value={value} onValueChange={(v) => onChange(v as T)}>
        <SelectTrigger
          className={cn(
            softSelectTrigger,
            "w-full",
            error && "border-alert",
          )}
        >
          <SelectValue placeholder={placeholder ?? "Sélectionner…"} />
        </SelectTrigger>
        <SelectContent className={softSelectContent}>
          {items.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FieldShell>
  );
}

/**
 * Comma-separated list field (modules enseignés, groupes, surveillants…).
 * Kept as free text while editing so commas can be typed naturally; the
 * caller splits on submit via `parseList`.
 */
export function ListField({
  label,
  value,
  onChange,
  placeholder,
  error,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  error?: string;
  hint?: string;
}) {
  return (
    <FieldShell label={label} error={error}>
      <Input
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={cn(softInput, error && "border-alert")}
      />
      <p className="text-[11px] text-muted-foreground">
        {hint ?? "Séparer par des virgules."}
      </p>
    </FieldShell>
  );
}

export function parseList(v: string): string[] {
  return v
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/* ------------------------------------------------------------------ */
/*  Dialogue de formulaire                                             */
/* ------------------------------------------------------------------ */

/**
 * Create/edit dialog shell. Renders nothing until `open`, so each form's
 * internal state is fresh on every open without needing a manual reset.
 */
export function FormDialog({
  open,
  onOpenChange,
  title,
  subtitle,
  submitLabel = "Enregistrer",
  onSubmit,
  wide,
  children,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  subtitle?: string;
  submitLabel?: string;
  onSubmit: () => void;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={wide ? dialogSurfaceWide : dialogSurface}>
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <DialogDescription className="sr-only">
          {subtitle ?? title}
        </DialogDescription>
        <DetailShell
          title={title}
          subtitle={subtitle}
          footer={
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                className={ghostPill}
                onClick={() => onOpenChange(false)}
              >
                Annuler
              </button>
              <button type="button" className={primaryPill} onClick={onSubmit}>
                {submitLabel}
              </button>
            </div>
          }
        >
          <div className="grid gap-4 sm:grid-cols-2">{children}</div>
        </DetailShell>
      </DialogContent>
    </Dialog>
  );
}

/** Makes a field span both columns of FormDialog's two-column grid. */
export function FullWidth({ children }: { children: ReactNode }) {
  return <div className="sm:col-span-2">{children}</div>;
}

/* ------------------------------------------------------------------ */
/*  Confirmation de suppression                                        */
/* ------------------------------------------------------------------ */

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  message,
  confirmLabel = "Supprimer",
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={dialogSurface}>
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <DialogDescription className="sr-only">{message}</DialogDescription>
        <DetailShell
          title={title}
          footer={
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                className={ghostPill}
                onClick={() => onOpenChange(false)}
              >
                Annuler
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-full bg-alert px-5 py-2.5 text-sm font-bold text-white transition hover:bg-alert-dk"
                onClick={() => {
                  onConfirm();
                  onOpenChange(false);
                }}
              >
                {confirmLabel}
              </button>
            </div>
          }
        >
          <p className="text-sm text-foreground">{message}</p>
        </DetailShell>
      </DialogContent>
    </Dialog>
  );
}
