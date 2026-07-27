import { useRef, useState, type ReactNode } from "react";
import { AlertTriangle, Check, ChevronsUpDown, FileText, Upload, X } from "lucide-react";
import { motion } from "framer-motion";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
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
      {error ? (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-[11px] text-alert"
        >
          {error}
        </motion.p>
      ) : null}
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
 * Sélecteur recherchable (autocomplétion).
 *
 * Même langage visuel que `SelectField`, mais la liste est filtrée en direct à
 * la frappe via `cmdk`. Idéal pour les longues listes (étudiants) où un simple
 * menu déroulant devient difficile à parcourir.
 */
export function ComboBoxField<T extends string>({
  label,
  value,
  onChange,
  options,
  placeholder = "Sélectionner…",
  searchPlaceholder = "Rechercher…",
  emptyText = "Aucun résultat.",
  error,
  required,
}: {
  label: string;
  value: T | "";
  onChange: (v: T) => void;
  options: readonly { value: T; label: string }[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  error?: string;
  required?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <FieldShell label={label} error={error} required={required}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            role="combobox"
            aria-expanded={open}
            className={cn(
              softSelectTrigger,
              "flex w-full items-center justify-between px-3 text-sm p-7",
              !selected && "text-muted-foreground/70",
              error && "border-alert",
            )}
          >
            <span className="truncate">{selected ? selected.label : placeholder}</span>
            <ChevronsUpDown className="ms-2 h-4 w-4 shrink-0 opacity-50" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          className={cn(softSelectContent, "w-[--radix-popover-trigger-width] p-0")}
          align="start"
        >
          <Command>
            <CommandInput placeholder={searchPlaceholder} className="h-10" />
            <CommandList>
              <CommandEmpty>{emptyText}</CommandEmpty>
              <CommandGroup>
                {options.map((o) => (
                  <CommandItem
                    key={o.value}
                    value={o.label}
                    onSelect={() => {
                      onChange(o.value);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "me-2 h-4 w-4",
                        o.value === value ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <span className="truncate">{o.label}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </FieldShell>
  );
}

export function MultiSelectField({
  label,
  value,
  onChange,
  options,
  placeholder = "Sélectionner…",
  searchPlaceholder = "Rechercher…",
  emptyText = "Aucun résultat.",
  error,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly { value: string; label: string }[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  error?: string;
  required?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const selectedLabels = selected
    .map((s) => options.find((o) => o.value === s)?.label ?? s)
    .filter(Boolean);

  const toggle = (v: string) => {
    const next = selected.includes(v)
      ? selected.filter((s) => s !== v)
      : [...selected, v];
    onChange(next.join(", "));
  };

  return (
    <FieldShell label={label} error={error} required={required}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            role="combobox"
            aria-expanded={open}
            className={cn(
              softSelectTrigger,
              "flex w-full flex-wrap items-center gap-1.5 px-3 py-2 text-sm min-h-[42px]",
              !selected.length && "text-muted-foreground/70",
              error && "border-alert",
            )}
          >
            {selectedLabels.length ? (
              selectedLabels.map((l) => (
                <span
                  key={l}
                  className="inline-flex items-center gap-1 rounded-md bg-brand/12 px-2 py-0.5 text-xs font-medium text-brand-dk"
                >
                  {l}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggle(
                        options.find((o) => o.label === l)?.value ?? l,
                      );
                    }}
                    className="hover:text-alert transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))
            ) : (
              <span className="text-muted-foreground/70">{placeholder}</span>
            )}
            <ChevronsUpDown className="ms-auto h-4 w-4 shrink-0 opacity-50" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          className={cn(softSelectContent, "w-[--radix-popover-trigger-width] p-0")}
          align="start"
        >
          <Command>
            <CommandInput placeholder={searchPlaceholder} className="h-10" />
            <CommandList>
              <CommandEmpty>{emptyText}</CommandEmpty>
              <CommandGroup>
                {options.map((o) => {
                  const isSelected = selected.includes(o.value);
                  return (
                    <CommandItem
                      key={o.value}
                      value={o.label}
                      onSelect={() => toggle(o.value)}
                    >
                      <div
                        className={cn(
                          "me-2 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
                          isSelected
                            ? "border-brand bg-brand text-white"
                            : "border-border",
                        )}
                      >
                        {isSelected && <Check className="h-3 w-3" />}
                      </div>
                      <span className="truncate">{o.label}</span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </FieldShell>
  );
}

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

export function FileField({
  label,
  file,
  onFile,
  existing,
  onRemoveExisting,
  accept,
  hint,
  error,
}: {
  label: string;
  file: File | null;
  onFile: (f: File | null) => void;
  existing?: { nom: string; taille: number } | null;
  onRemoveExisting?: () => void;
  accept?: string;
  hint?: string;
  error?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const current = file ?? existing ?? null;
  const currentName = file ? file.name : (existing?.nom ?? null);
  const currentSize = file ? file.size : (existing?.taille ?? 0);

  return (
    <FieldShell label={label} error={error}>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => onFile(e.target.files?.[0] ?? null)}
      />

      {current ? (
        <div className="flex items-center gap-3 rounded-xl border border-brand/20 bg-brand/5 px-3 py-2.5">
          <FileText className="h-4 w-4 shrink-0 text-brand" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-foreground">
              {currentName}
            </span>
            <span className="block text-[11px] text-muted-foreground">
              {formatBytes(currentSize)}
              {file ? " · en attente d'enregistrement" : ""}
            </span>
          </span>
          <button
            type="button"
            aria-label="Remplacer le fichier"
            onClick={() => inputRef.current?.click()}
            className="shrink-0 rounded-lg px-2 py-1 text-[11px] font-semibold text-brand-dk transition hover:bg-brand/10"
          >
            Remplacer
          </button>
          <button
            type="button"
            aria-label="Retirer le fichier"
            onClick={() => {
              if (file) onFile(null);
              else onRemoveExisting?.();
              if (inputRef.current) inputRef.current.value = "";
            }}
            className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition hover:bg-alert/10 hover:text-alert"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-brand/35 bg-card px-3 py-5 text-sm font-medium text-muted-foreground transition hover:border-brand hover:bg-brand/5 hover:text-brand-dk"
        >
          <Upload className="h-4 w-4" />
          Choisir un fichier
        </button>
      )}

      <p className="text-[11px] text-muted-foreground">
        {hint ?? "PDF ou Word, 10 Mo maximum."}
      </p>
    </FieldShell>
  );
}

function formatBytes(n: number) {
  if (n < 1024) return `${n} o`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} Ko`;
  return `${(n / (1024 * 1024)).toFixed(1)} Mo`;
}

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
              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={primaryPill}
                onClick={onSubmit}
              >
                {submitLabel}
              </motion.button>
            </div>
          }
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ staggerChildren: 0.03, delayChildren: 0.1 }}
            className="grid gap-4 sm:grid-cols-2"
          >
            {children}
          </motion.div>
        </DetailShell>
      </DialogContent>
    </Dialog>
  );
}

export function FullWidth({ children }: { children: ReactNode }) {
  return <div className="sm:col-span-2">{children}</div>;
}

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
              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex items-center gap-2 rounded-full bg-alert px-5 py-2.5 text-sm font-bold text-white transition hover:bg-alert-dk"
                onClick={() => {
                  onConfirm();
                  onOpenChange(false);
                }}
              >
                {confirmLabel}
              </motion.button>
            </div>
          }
        >
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-3.5"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-alert/12 text-alert ring-1 ring-inset ring-alert/20">
              <AlertTriangle className="h-5 w-5" />
            </span>
            <p className="text-sm leading-relaxed text-foreground">{message}</p>
          </motion.div>
        </DetailShell>
      </DialogContent>
    </Dialog>
  );
}
