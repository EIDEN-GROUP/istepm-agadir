import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  FILIERES_CARNET,
  NIVEAUX,
  normalizeStructure,
  type NiveauHeures,
  type StageRef,
  type StructureAccueil,
  type SubStageDetail,
} from "@/lib/istpm-data";
import type { ProgrammeRow } from "@/lib/istpm-api";
import { FormDialog, FullWidth } from "@/components/dash-form";
import { Input } from "@/components/ui/input";
import { softInput } from "@/lib/dash-ui";
import { cn } from "@/lib/utils";

export type StructureSaveBody = {
  nouveauNom?: string;
  capacite?: number;
  stages: StageRef[];
};

function libelleNiveauVide(n: string): string {
  return n || "Toutes années";
}

/** Heures totales d'une structure (stages + sous-stages). */
export function heuresTotalesStructure(stages: StageRef[]): number {
  let t = 0;
  for (const s of stages) {
    for (const nh of s.niveaux) t += nh.heures;
    for (const d of s.subStages) for (const nh of d.niveaux) t += nh.heures;
  }
  return t;
}

const cloneStages = (stages: StageRef[]): StageRef[] =>
  stages.map((s) => ({
    ...s,
    niveaux: s.niveaux.map((n) => ({ ...n })),
    subStages: s.subStages.map((d) => ({ ...d, niveaux: d.niveaux.map((n) => ({ ...n })) })),
  }));

/**
 * Édition d'une structure : nom + capacité (SEUL plafond : ni stages ni
 * sous-stages n'en portent) + stages du carnet.
 *
 * Flux : on tape le nom du service + sa capacité vient de la structure ;
 * on ajoute un stage = nom + heures PAR niveau coché + UNE filière ; le
 * stage peut ensuite recevoir des sous-stages — ajouter un sous-stage
 * DÉPLACE les niveaux+heures du stage vers lui (re-fusionnés s'il est
 * supprimé). D'autres sous-stages ont leur propre nom/niveaux/heures.
 * Les heures sont pré-remplies depuis le programme des carnets
 * (`programme_stages`), sinon `service_heures`, sinon 0.
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
  programme: ProgrammeRow[];
  readOnly?: boolean;
  busy?: boolean;
  onClose: () => void;
  onSave: (nomInitial: string, body: StructureSaveBody) => Promise<void> | void;
}) {
  const [nom, setNom] = useState("");
  const [capacite, setCapacite] = useState(5);
  const [stages, setStages] = useState<StageRef[]>([]);
  // Formulaire d'ajout de stage.
  const [fService, setFService] = useState("");
  const [fNiveaux, setFNiveaux] = useState<Record<string, number>>({});
  const [fFiliere, setFFiliere] = useState("");
  // Sous-stage en cours d'ajout : index du stage + brouillon.
  const [subPour, setSubPour] = useState<number | null>(null);
  const [dNom, setDNom] = useState("");
  const [dNiveaux, setDNiveaux] = useState<Record<string, number>>({});
  const [importFiliere, setImportFiliere] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!structure) return;
    const n = normalizeStructure(structure);
    setNom(n.nom);
    setCapacite(n.capacite ?? 5);
    setStages(cloneStages(n.stages));
    setFService("");
    setFNiveaux({});
    setFFiliere("");
    setSubPour(null);
    setDNom("");
    setDNiveaux({});
    setSaving(false);
  }, [structure]);

  const programmeParService = useMemo(() => {
    const map = new Map<string, ProgrammeRow[]>();
    for (const r of programme) {
      const list = map.get(r.nom) ?? [];
      list.push(r);
      map.set(r.nom, list);
    }
    return map;
  }, [programme]);

  // Aide carnet pour le service saisi.
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

  /** Pré-remplit heures + filière depuis le carnet quand le service change. */
  const reprendreCarnet = (service: string) => {
    const clean = service.trim();
    if (!clean) return;
    const list = programmeParService.get(clean) ?? [];
    if (!list.length) {
      const h = servicesHeures[clean] ?? 0;
      setFNiveaux((prev) => {
        if (Object.keys(prev).length) return prev;
        return { "1ère année": h, "2ème année": h, "3ème année": h };
      });
      return;
    }
    setFNiveaux((prev) => {
      const next: Record<string, number> = {};
      const cibles = Object.keys(prev).length ? Object.keys(prev) : [...new Set(list.map((r) => r.niveau || "1ère année"))];
      for (const n of cibles) {
        const match = list.find((r) => (r.niveau || "1ère année") === n) ?? list[0];
        next[n] = prev[n] ?? match.heures;
      }
      return next;
    });
    const tag = list[0].filieres?.[0];
    if (tag) setFFiliere((prev) => prev || tag);
  };

  const basculeNiveau = (
    sel: Record<string, number>,
    set: (v: Record<string, number>) => void,
    niveau: string,
    defaut: number,
  ) => {
    const next = { ...sel };
    if (next[niveau] !== undefined) delete next[niveau];
    else next[niveau] = defaut;
    set(next);
  };

  const ajouterStage = () => {
    const service = fService.trim().replace(/\s+/g, " ");
    if (!service) {
      toast.error("Indiquez un service");
      return;
    }
    const niveaux = Object.entries(fNiveaux).map(([niveau, heures]) => ({ niveau, heures: Math.max(0, heures || 0) }));
    if (!niveaux.length) {
      toast.error("Cochez au moins un niveau");
      return;
    }
    if (!fFiliere) {
      toast.error("Choisissez la filière du stage");
      return;
    }
    setStages((prev) => {
      if (prev.some((s) => s.nom === service)) {
        toast.error("Ce stage existe déjà");
        return prev;
      }
      return [...prev, { nom: service, niveaux, filiere: fFiliere, subStages: [] }]
        .slice()
        .sort((a, b) => a.nom.localeCompare(b.nom));
    });
    setFService("");
    setFNiveaux({});
    setFFiliere("");
  };

  /** Ouvre le sous-formulaire pré-rempli des niveaux encore portés par le stage. */
  const ouvrirSub = (i: number) => {
    const st = stages[i];
    const init: Record<string, number> = {};
    for (const nh of st.niveaux) init[nh.niveau] = nh.heures;
    setSubPour(i);
    setDNom("");
    setDNiveaux(init);
  };

  const ajouterSub = () => {
    if (subPour === null) return;
    const nomSub = dNom.trim().replace(/\s+/g, " ");
    if (!nomSub) {
      toast.error("Indiquez le nom du sous-stage");
      return;
    }
    const niveaux = Object.entries(dNiveaux).map(([niveau, heures]) => ({ niveau, heures: Math.max(0, heures || 0) }));
    if (!niveaux.length) {
      toast.error("Cochez au moins un niveau");
      return;
    }
    setStages((prev) =>
      prev.map((st, j) => {
        if (j !== subPour) return st;
        // DÉPLACEMENT : les niveaux repris passent du stage au sous-stage.
        const pris = new Set(niveaux.map((n) => n.niveau));
        return {
          ...st,
          niveaux: st.niveaux.filter((nh) => !pris.has(nh.niveau)),
          subStages: [...st.subStages, { nom: nomSub, niveaux }].sort((a, b) => a.nom.localeCompare(b.nom)),
        };
      }),
    );
    setSubPour(null);
    setDNom("");
    setDNiveaux({});
  };

  const retirerSub = (si: number, di: number) => {
    setStages((prev) =>
      prev.map((st, j) => {
        if (j !== si) return st;
        const [retire] = st.subStages.filter((_, k) => k === di);
        // Re-fusion : les niveaux du sous-stage supprimé reviennent au stage.
        const niveaux = [...st.niveaux];
        for (const nh of retire?.niveaux ?? []) {
          if (!niveaux.some((x) => x.niveau === nh.niveau)) niveaux.push({ ...nh });
        }
        niveaux.sort((a, b) => a.niveau.localeCompare(b.niveau));
        return { ...st, niveaux, subStages: st.subStages.filter((_, k) => k !== di) };
      }),
    );
  };

  /** Importe tout le programme d'une filière du carnet (une fois par service). */
  const importerCarnet = () => {
    if (!importFiliere) {
      toast.error("Choisissez une filière");
      return;
    }
    const lignes = programme.filter((r) => (r.filieres ?? []).includes(importFiliere));
    if (!lignes.length) {
      toast.error("Aucune ligne au carnet pour cette filière");
      return;
    }
    const parService = new Map<string, { niveaux: NiveauHeures[] }>();
    for (const r of lignes) {
      let g = parService.get(r.nom);
      if (!g) {
        g = { niveaux: [] };
        parService.set(r.nom, g);
      }
      if (!g.niveaux.some((n) => n.niveau === r.niveau)) {
        g.niveaux.push({ niveau: r.niveau, heures: r.heures });
      }
    }
    setStages((prev) => {
      const next = [...prev];
      let ajoutes = 0;
      for (const [nom, g] of parService) {
        if (next.some((s) => s.nom === nom)) continue;
        next.push({
          nom,
          niveaux: g.niveaux.slice().sort((a, b) => a.niveau.localeCompare(b.niveau)),
          filiere: importFiliere,
          subStages: [],
        });
        ajoutes++;
      }
      toast.success(ajoutes ? `${ajoutes} stage(s) importé(s) — ${importFiliere}` : "Programme déjà présent");
      return next.slice().sort((a, b) => a.nom.localeCompare(b.nom));
    });
  };

  const heuresTotales = useMemo(() => {
    let t = 0;
    for (const s of stages) {
      for (const nh of s.niveaux) t += nh.heures;
      for (const d of s.subStages) for (const nh of d.niveaux) t += nh.heures;
    }
    return t;
  }, [stages]);

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
        stages,
      });
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Enregistrement impossible");
    } finally {
      setSaving(false);
    }
  };

  const niveauxHeuresEditor = (
    sel: Record<string, number>,
    set: (v: Record<string, number>) => void,
    prefix: string,
  ) => (
    <div className="flex flex-wrap gap-1.5">
      {NIVEAUX.map((n) => {
        const actif = sel[n] !== undefined;
        return (
          <span key={n} className="inline-flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                const list = programmeParService.get(fService.trim()) ?? [];
                const match = list.find((r) => (r.niveau || "1ère année") === n);
                basculeNiveau(sel, set, n, match?.heures ?? servicesHeures[fService.trim()] ?? 0);
              }}
              className={cn(
                "rounded-full px-3 py-1 text-[11px] font-semibold transition-colors",
                actif ? "bg-brand text-white" : "border border-brand/20 text-muted-foreground hover:text-brand-dk",
              )}
            >
              {n}
            </button>
            {actif ? (
              <Input
                type="number"
                min={0}
                value={sel[n]}
                aria-label={`${prefix} heures — ${n}`}
                onChange={(e) => set({ ...sel, [n]: Math.max(0, Number(e.target.value) || 0) })}
                className="h-7 w-16 rounded-lg border-brand/20 text-center text-xs tabular-nums"
              />
            ) : null}
          </span>
        );
      })}
    </div>
  );

  return (
    <FormDialog
      open={!!structure}
      onOpenChange={(o) => !o && onClose()}
      wide
      title={structure ? `Structure — ${structure.nom}` : "Structure"}
      subtitle="Stages du carnet : heures par niveau, une filière, sous-stages"
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
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground" title="Seul plafond d'accueil : ni les stages ni les sous-stages n'en portent">
              Capacité d'accueil
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
            Stages ({stages.length}) · Heures totales : <strong className="text-foreground">{heuresTotales}</strong>
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={importFiliere}
              onChange={(e) => setImportFiliere(e.target.value)}
              aria-label="Filière du carnet à importer"
              className={cn(softInput, "h-8 text-xs")}
            >
              <option value="">Carnet d'une filière…</option>
              {FILIERES_CARNET.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
            <button type="button" onClick={importerCarnet} className="text-xs font-semibold text-brand-dk hover:underline">
              Importer le programme
            </button>
          </div>
          {stages.length ? (
            <ul className="max-h-64 space-y-2 overflow-y-auto">
              {stages.map((st, i) => (
                <li key={`${st.nom}|${i}`} className="rounded-xl border border-brand/12 bg-card px-3 py-2">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                    <span className="min-w-0 flex-1 font-medium text-foreground">{st.nom}</span>
                    {st.filiere ? (
                      <span className="rounded-full bg-brand/10 px-2 py-0.5 font-semibold text-brand-dk">{st.filiere}</span>
                    ) : null}
                    {readOnly ? null : (
                      <button
                        type="button"
                        onClick={() => {
                          if (subPour === i) {
                            setSubPour(null);
                            setDNom("");
                            setDNiveaux({});
                          } else {
                            ouvrirSub(i);
                          }
                        }}
                        className="font-semibold text-brand-dk hover:underline"
                      >
                        {subPour === i ? "Fermer" : "+ Sous-stage"}
                      </button>
                    )}
                    {readOnly ? null : (
                      <button
                        type="button"
                        aria-label={`Retirer ${st.nom}`}
                        onClick={() => {
                          setStages((prev) => prev.filter((_, j) => j !== i));
                          if (subPour === i) {
                            setSubPour(null);
                            setDNom("");
                            setDNiveaux({});
                          }
                        }}
                        className="grid h-6 w-6 place-items-center rounded-full transition hover:bg-alert/20 hover:text-alert"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                  {st.niveaux.length ? (
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {st.niveaux.map((nh) => `${nh.niveau || "Toutes années"} : ${nh.heures} h`).join(" · ")}
                    </p>
                  ) : null}
                  {st.subStages.length ? (
                    <ul className="mt-1.5 space-y-1 border-l-2 border-brand/20 pl-2">
                      {st.subStages.map((d, k) => (
                        <li key={`${d.nom}|${k}`} className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
                          <span className="min-w-0 flex-1 font-medium text-foreground">↳ {d.nom}</span>
                          <span className="text-muted-foreground">
                            {d.niveaux.length
                              ? d.niveaux.map((nh) => `${nh.niveau || "Toutes années"} : ${nh.heures} h`).join(" · ")
                              : "—"}
                          </span>
                          {readOnly ? null : (
                            <button
                              type="button"
                              aria-label={`Retirer ${d.nom}`}
                              onClick={() => retirerSub(i, k)}
                              className="grid h-6 w-6 place-items-center rounded-full transition hover:bg-alert/20 hover:text-alert"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {subPour === i && !readOnly ? (
                    <div className="mt-2 space-y-2 rounded-lg bg-muted/40 p-2.5">
                      <Input
                        value={dNom}
                        onChange={(e) => setDNom(e.target.value)}
                        placeholder="Nom du sous-stage…"
                        aria-label="Nom du sous-stage"
                        className={cn(softInput, "h-8 text-xs")}
                      />
                      <p className="text-[11px] text-muted-foreground">
                        Les niveaux cochés (avec leurs heures) sont déplacés du stage vers ce sous-stage.
                      </p>
                      {niveauxHeuresEditor(dNiveaux, setDNiveaux, "Sous-stage")}
                      <button type="button" onClick={ajouterSub} className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-dk hover:underline">
                        <Plus className="h-3.5 w-3.5" /> Ajouter le sous-stage
                      </button>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">Aucun stage : ajoutez ci-dessous les services du carnet.</p>
          )}
        </div>
      </FullWidth>

      {readOnly ? null : (
        <FullWidth>
          <div className="space-y-2 rounded-xl border border-brand/12 bg-muted/40 p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Ajouter un stage (heures par niveau, une filière)</p>
            <div className="grid gap-2 sm:grid-cols-[1fr_180px]">
              <Input
                value={fService}
                onChange={(e) => setFService(e.target.value)}
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
              <select
                value={fFiliere}
                onChange={(e) => setFFiliere(e.target.value)}
                aria-label="Filière du stage"
                className={cn(softInput, "h-9 text-sm")}
              >
                <option value="">Filière…</option>
                {FILIERES_CARNET.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>
            {aideCarnet ? <p className="text-[11px] text-muted-foreground">{aideCarnet}</p> : null}
            {niveauxHeuresEditor(fNiveaux, setFNiveaux, "Stage")}
            <button type="button" onClick={ajouterStage} className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-dk hover:underline">
              <Plus className="h-3.5 w-3.5" /> Ajouter le stage
            </button>
          </div>
        </FullWidth>
      )}
    </FormDialog>
  );
}

export type { NiveauHeures, StageRef, SubStageDetail };
