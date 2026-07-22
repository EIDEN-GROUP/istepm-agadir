import { useMemo, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
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
  softInput as inputClass,
  softSelectTrigger as selectTriggerClass,
  softSelectContent,
  labelClass,
} from "@/lib/dash-ui";
import { api } from "@/lib/api";
import type { ChildFormData } from "@/components/add-client-wizard";

function Field({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className={labelClass}>
        {label}
      </Label>
      {children}
    </div>
  );
}

export function StudentFields({
  value,
  onChange,
  index: _index,
}: {
  value: ChildFormData;
  onChange: (v: ChildFormData) => void;
  index?: number;
}) {
  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: () => api.get<Record<string, any>>("/settings"),
  });
  const { data: levels = [] } = useQuery({
    queryKey: ["levels"],
    queryFn: () =>
      api.get<Array<{ id: string; name: string }>>("/settings/levels"),
  });

  const services: Array<{ name: string; price: number; enabled: boolean }> =
    settings?.services ?? [];
  const frais: Array<{ name: string; price: number }> = settings?.frais ?? [];
  const siblingDiscount = settings?.sibling_discount as
    { enabled?: boolean } | undefined;

  const toggleService = (name: string) => {
    const has = value.services.includes(name);
    onChange({
      ...value,
      services: has
        ? value.services.filter((s) => s !== name)
        : [...value.services, name],
    });
  };

  const toggleFrais = (name: string) => {
    const has = value.frais.includes(name);
    onChange({
      ...value,
      frais: has
        ? value.frais.filter((f) => f !== name)
        : [...value.frais, name],
    });
  };

  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
      <Field id="student-name" label="Nom de l'élève">
        <Input
          id="student-name"
          value={value.name}
          onChange={(e) => onChange({ ...value, name: e.target.value })}
          className={inputClass}
        />
      </Field>
      <Field id="student-dob" label="Date de naissance">
        <Input
          id="student-dob"
          type="date"
          value={value.dob}
          onChange={(e) => onChange({ ...value, dob: e.target.value })}
          className={inputClass}
        />
      </Field>
      <Field id="student-cycle" label="Cycle">
        <Input
          id="student-cycle"
          value={value.cycle}
          onChange={(e) => onChange({ ...value, cycle: e.target.value })}
          className={inputClass}
        />
      </Field>
      <Field id="student-level" label="Niveau">
        <Select
          value={value.level}
          onValueChange={(v) => onChange({ ...value, level: v })}
        >
          <SelectTrigger id="student-level" className={selectTriggerClass}>
            <SelectValue placeholder="Sélectionner" />
          </SelectTrigger>
          <SelectContent className={softSelectContent}>
            {levels.map((l: any) => (
              <SelectItem key={l.id} value={l.name}>
                {l.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      {services.filter((s) => s.enabled).length > 0 && (
        <div className="col-span-full">
          <p className={labelClass}>Services souscrits</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {services
              .filter((s) => s.enabled)
              .map((s) => (
                <button
                  key={s.name}
                  type="button"
                  onClick={() => toggleService(s.name)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide transition-all ${
                    value.services.includes(s.name)
                      ? "bg-[#B5E18B] text-[#3E6420]"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {s.name}
                </button>
              ))}
          </div>
        </div>
      )}
      {frais.length > 0 && (
        <div className="col-span-full">
          <p className={labelClass}>Frais supplémentaires</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {frais.map((f) => (
              <button
                key={f.name}
                type="button"
                onClick={() => toggleFrais(f.name)}
                className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide transition-all ${
                  value.frais.includes(f.name)
                    ? "bg-[#B5E18B] text-[#3E6420]"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {f.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
