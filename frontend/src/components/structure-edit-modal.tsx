import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  FILIERES_CARNET,
  NIVEAUX,
  normalizeStructure,
  type StructureAccueil,
  type SubStage,
} from "@/lib/istpm-data";
import { FormDialog, FullWidth } from "@/components/dash-form";
import { Input } from "@/components/ui/input";
import { softInput } from "@/lib/dash-ui";
import { cn } from "@/lib/utils";

export type StructureSaveBody = {
  nouveauNom?: string;
  capacite?: number;
  subStages: SubStage[];
};

const NIVEAUX_OPTIONS = [...NIVEAUX, ""] as const;

function libelleNiveauVide(n: string): string {
  return n || "Toutes années";
}

/**
 * Totaux d'une table de sous-stages (capacité + heures).
 */
export function totauxSubStages(rows: SubStage[]): { capacite: number; heures: number } {
  return {
    capacite: rows.reduce((t, r) => t + r.capacite, 0),
    heures: rows.reduce((t, r) => t + r.heures, 0),
  };
}

/**
 * Édition d'une structure : nom + capacité de repli + table des sous-stages
 * (service × niveau × heures × places, taggés filières carnets).
 *
 * L'ajout crée UNE ligne par niveau coché (mêmes heures/places/filières).
 * Les heures et filières sont pré-remplies depuis le programme des carnets
 * (`programme_stages`) quand il connaît le service, sinon depuis
 * `service_heures` (valeur indicative), sinon 0 / toutes filières.
 */
export function StructureEditModal({
  structure,
  services,
  servicesHeures,
  programme,
  readOnly,
  busy,
  onClose,
  onSave,
}: {
  /** null = fermé. */
  structure: StructureAccueil | null;
  /** Services connus (combo). */
  services: string[];
  /** Heures indicatives par service. */
  servicesHeures: Record<string, number>;
  /** Programme de référence des carnets. */
  programme: SubStage[];
  readOnly?: boolean;
  busy?: boolean;
  onClose: () => void;
  onSave: (nomInitial: string, body: StructureSaveBody) => Promise<void> | void;
}) {
  const [nom, setNom] = useState("");
  const [capacite, setCapacite] = useState(5);
  const [rows, setRows] = useState<SubStage[]>([]);
  // Formulaire d'ajout.
  const [fService, setFService] = useState("");
  const [fNiveaux, setFNiveaux] = useState<string[]>([]);
  const [fHeures, setFHeures] = useState(0);
  const [fCap, setFCap] = useState(5);
  const [fFilieres, setFFilieres] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!structure) return;
    const n = normalizeStructure(structure);
    setNom(n.nom);
    setCapacite(n.capacite ?? 5);
    setRows(n.subStages.map((r) => ({ ...r, filieres: r.filieres ? [...r.filieres] : [] })));
    setFService("");
    setFNiveaux([]);
    setFHeures(0);
    setFCap(5);
    setFFilieres([]);
    setSaving(false);
  }, [structure]);

  const programmeParService = useMemo(() => {
    const map = new Map<string, SubStage[]>();
    for (const r of programme) {
      const list = map.get(r.nom) ?? [];
      list.push(r);
      map.set(r.nom, list);
    }
    return map;
  }, [programme]);

  // Aide carnet pour le service saisi : « Carnet IP — 1ère : 80 h · … ».
  const aideCarnet = useMemo(() => {
    const list = programmeParService.get(fService.trim());
    if (!list?.length) return "";
    const parFiliere = new Map<string, string[]>();
    for (const r of list) {
      const tag = (r.filieres ?? []).join("+") || "toutes filières";
      const arr = parFiliere.get(tag) ?? [];
      arr.push(`${r.niveau || "toutes années"} : ${r.heures} h`);
      parFiliere.set(tag, arr);
    }
    return [...parFiliere.entries()].map(([tag, v]) => `Carnet ${tag} — ${v.join(" · ")}`).join(" | ");
  }, [fService, programmeParService]);

  const reprendreCarnet = (service: string) => {
    const list = programmeParService.get(service.trim()) ?? [];
    if (!list.length) {
      setFHeures(servicesHeures[service.trim()] ?? 0);
      return;
    }
    // Heures : première ligne du premier niveau coché (ou première ligne).
    const cible =
      list.find((r) => fNiveaux.includes(r.niveau)) ??
      list.find((r) => !r.niveau) ??
      list[0];
    setFHeures(cible.heures);
    setFFilieres(cible.filieres ? [...cible.filieres] : []);
  };

  const bascule = (list: string[], v: string, set: (l: string[]) => void) =>
    set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const ajouter = () => {
    const service = fService.trim().replace(/\s+/g, " ");
    if (!service) {
      toast.error("Indiquez un service");
      return;
    }
    if (!fNiveaux.length) {
      toast.error("Cochez au moins un niveau");
      return;
    }
    const filieres = [...fFilieres];
    setRows((prev) => {
      const next = [...prev];
      for (const niveau of fNiveaux) {
        next.push({
          nom: service,
          niveau,
          heures: Math.max(0, fHeures || 0),
          capacite: Math.max(0, fCap || 0),
          ...(filieres.length ? { filieres } : {}),
        });
      }
      return next
        .slice()
        .sort((a, b) => (a.niveau || "").localeCompare(b.niveau || "") || a.nom.localeCompare(b.nom));
    });
    setFService("");
    setFNiveaux([]);
    setFHeures(0);
    setFCap(5);
    setFFilieres([]);
  };

  const totaux = totauxSubStages(rows);

  const enregistrer = async () => {
    if (!structure) return;
    const clean = nom.trim().replace(/\s+/g, " ");
    if (!clean) {
      toast.error("Nom de structure requis");
      return;
    }
    setSaving(true);
    try {
      await onSave(structure.nom, {
        ...(clean !== structure.nom ? { nouveauNom: clean } : {}),
        capacite: Math.max(1, capacite || 1),
        subStages: rows,
      });
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Enregistrement impossible");
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormDialog
      open={!!structure}
      onOpenChange={(o) => !o && onClose()}
      wide
      title={structure ? `Structure — ${structure.nom}` : "Structure"}
      subtitle="Services × niveaux × heures × places (carnets de stage)"
      submitLabel={saving || busy ? "Enregistrement…" : "Enregistrer"}
      onSubmit={() => void enregistrer()}
      busy={saving || busy}
    >
      <FullWidth>
        <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
          <label className="space-y-1.5">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Nom</span>
            <Input
              value={nom}
              readOnly={readOnly}
              onChange={(e) => setNom(e.target.value)}
              className={cn(softInput, "h-9 text-sm")}
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground" title="Capacité utilisée quand aucun sous-stage ne correspond au niveau demandé">
              Capacité de repli
            </span>
            <Input
              type="number"
              min={1}
              value={capacite}
              readOnly={readOnly}
              onChange={(e) => setCapacite(Number(e.target.value))}
              className={cn(softInput, "h-9 text-sm")}
            />
          </label>
        </div>
      </FullWidth>

      <FullWidth>
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Sous-stages ({rows.length}) · Capacité totale : <strong className="text-foreground">{totaux.capacite}</strong> · Heures totales : <strong className="text-foreground">{totaux.heures}</strong>
          </p>
          {rows.length ? (
            <ul className="max-h-56 space-y-1.5 overflow-y-auto">
              {rows.map((r, i) => (
                <li
                  key={`${r.nom}|${r.niveau}|${i}`}
                  className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border border-brand/12 bg-card px-3 py-2 text-xs"
                >
                  <span className="min-w-0 flex-1 font-medium text-foreground">{r.nom}</span>
                  <span className="rounded-full bg-brand/10 px-2 py-0.5 font-semibold text-brand-dk">
                    {libelleNiveauVide(r.niveau)}
                  </span>
                  <span className="text-muted-foreground">{r.heures} h</span>
                  <span className="text-muted-foreground">{r.capacite} pl.</span>
                  {r.filieres?.length ? (
                    <span className="max-w-full truncate text-muted-foreground" title={r.filieres.join(", ")}>
                      {r.filieres.join(" · ")}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Toutes filières</span>
                  )}
                  {readOnly ? null : (
                    <span className="flex items-center gap-1">
                      <Input
                        type="number"
                        min={0}
                        value={r.heures}
                        aria-label={`Heures — ${r.nom} ${r.niveau}`}
                        onChange={(e) =>
                          setRows((prev) => prev.map((x, j) => (j === i ? { ...x, heures: Math.max(0, Number(e.target.value) || 0) } : x)))
                        }
                        className="h-7 w-16 rounded-lg border-brand/20 text-center text-xs tabular-nums"
                      />
                      <Input
                        type="number"
                        min={0}
                        value={r.capacite}
                        aria-label={`Places — ${r.nom} ${r.niveau}`}
                        onChange={(e) =>
                          setRows((prev) => prev.map((x, j) => (j === i ? { ...x, capacite: Math.max(0, Number(e.target.value) || 0) } : x)))
                        }
                        className="h-7 w-14 rounded-lg border-brand/20 text-center text-xs tabular-nums"
                      />
                      <button
                        type="button"
                        aria-label={`Retirer ${r.nom} ${r.niveau}`}
                        onClick={() => setRows((prev) => prev.filter((_, j) => j !== i))}
                        className="grid h-6 w-6 place-items-center rounded-full transition hover:bg-alert/20 hover:text-alert"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">Aucun sous-stage : la capacité de repli s'applique à tous les niveaux.</p>
          )}
        </div>
      </FullWidth>

      {readOnly ? null : (
        <FullWidth>
          <div className="space-y-2 rounded-xl border border-brand/12 bg-muted/40 p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Ajouter (une ligne par niveau coché)</p>
            <div className="grid gap-2 sm:grid-cols-[1fr_90px_80px]">
              <Input
                value={fService}
                onChange={(e) => {
                  setFService(e.target.value);
                }}
                onBlur={() => reprendreCarnet(fService)}
                list="services-stage-connus"
                placeholder="Service…"
                aria-label="Service"
                className={cn(softInput, "h-9 text-sm")}
              />
              <datalist id="services-stage-connus">
                {services.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
              <Input
                type="number"
                min={0}
                value={fHeures}
                onChange={(e) => setFHeures(Number(e.target.value))}
                aria-label="Heures"
                title="Heures"
                placeholder="Heures"
                className={cn(softInput, "h-9 text-sm")}
              />
              <Input
                type="number"
                min={0}
                value={fCap}
                onChange={(e) => setFCap(Number(e.target.value))}
                aria-label="Places"
                title="Places"
                placeholder="Places"
                className={cn(softInput, "h-9 text-sm")}
              />
            </div>
            {aideCarnet ? <p className="text-[11px] text-muted-foreground">{aideCarnet}</p> : null}
            <div className="flex flex-wrap gap-1.5">
              {NIVEAUX.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => bascule(fNiveaux, n, setFNiveaux)}
                  className={cn(
                    "rounded-full px-3 py-1 text-[11px] font-semibold transition-colors",
                    fNiveaux.includes(n) ? "bg-brand text-white" : "border border-brand/20 text-muted-foreground hover:text-brand-dk",
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {FILIERES_CARNET.map((f) => (
                <button
                  key={f}
                  type="button"
                  title="Vide = toutes filières"
                  onClick={() => bascule(fFilieres, f, setFFilieres)}
                  className={cn(
                    "rounded-full px-3 py-1 text-[11px] font-semibold transition-colors",
                    fFilieres.includes(f) ? "bg-brand text-white" : "border border-brand/20 text-muted-foreground hover:text-brand-dk",
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
            <button type="button" onClick={ajouter} className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-dk hover:underline">
              <Plus className="h-3.5 w-3.5" /> Ajouter les lignes
            </button>
          </div>
        </FullWidth>
      )}
    </FormDialog>
  );
}
