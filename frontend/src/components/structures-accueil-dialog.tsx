import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Building2, Plus, Trash2, Save } from "lucide-react";
import { useIstpm } from "@/lib/istpm-store";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { DetailShell } from "@/components/dash-page";
import { Input } from "@/components/ui/input";
import {
  dialogSurface,
  primaryPill,
  ghostPill,
  toneBadge,
  softInput,
} from "@/lib/dash-ui";
import { cn } from "@/lib/utils";

type Row = {
  nom: string;
  capacite: number;
};

export function StructuresAccueilDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const {
    structuresAccueil,
    stages,
    addStructureAccueil,
    updateStructureAccueil,
    deleteStructureAccueil,
  } = useIstpm();

  const normalize = (s: unknown) =>
    typeof s === "string" ? { nom: s, capacite: 5 } : (s as Row);

  const [rows, setRows] = useState<Row[]>(() =>
    structuresAccueil.map(normalize),
  );
  const [nouveauNom, setNouveauNom] = useState("");
  const [nouvelleCapacite, setNouvelleCapacite] = useState(5);

  const occupation = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of stages) {
      if (s.statut === "valide") continue;
      map.set(s.structure, (map.get(s.structure) ?? 0) + 1);
    }
    return map;
  }, [stages]);

  const setRow = (i: number, patch: Partial<Row>) =>
    setRows((prev) => prev.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  const aDesModifs = useMemo(() => {
    const store = structuresAccueil.reduce(
      (acc, s) => {
        acc[s.nom] = s.capacite;
        return acc;
      },
      {} as Record<string, number>,
    );
    return rows.some((r) => {
      const stored = store[r.nom];
      return stored !== undefined && stored !== r.capacite;
    });
  }, [rows, structuresAccueil]);

  const saveCapacites = () => {
    const store = structuresAccueil.reduce(
      (acc, s) => {
        acc[s.nom] = s.capacite;
        return acc;
      },
      {} as Record<string, number>,
    );
    for (const r of rows) {
      const stored = store[r.nom];
      if (stored !== undefined && stored !== r.capacite) {
        updateStructureAccueil(r.nom, { capacite: r.capacite });
      }
    }
    toast.success("Capacités enregistrées");
  };

  const removeRow = (i: number) => {
    const r = rows[i];
    deleteStructureAccueil(r.nom);
    setRows((prev) => prev.filter((_, j) => j !== i));
    toast.success(`Supprimée · ${r.nom}`);
  };

  const addRow = () => {
    const nom = nouveauNom.trim();
    if (!nom) return;
    if (rows.some((r) => r.nom === nom)) {
      toast.error("Cette structure existe déjà");
      return;
    }
    const cap = Math.max(1, nouvelleCapacite || 1);
    addStructureAccueil(nom, cap);
    setRows((prev) =>
      [...prev, { nom, capacite: cap }].sort((a, b) =>
        a.nom.localeCompare(b.nom),
      ),
    );
    setNouveauNom("");
    setNouvelleCapacite(5);
    toast.success(`Ajoutée · ${nom}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={dialogSurface}>
        <DialogTitle className="sr-only">Structures d'accueil</DialogTitle>
        <DialogDescription className="sr-only">
          Ajouter, modifier et plafonner les structures d'accueil
        </DialogDescription>
        <DetailShell
          icon={<Building2 className="h-5 w-5" />}
          title="Structures d'accueil"
          subtitle="Ajouter, plafonner ou supprimer les lieux de stage"
          footer={
            <div className="flex justify-end">
              <button
                type="button"
                className={cn(ghostPill, "h-9 px-4 text-sm")}
                onClick={() => onOpenChange(false)}
              >
                Fermer
              </button>
            </div>
          }
        >
          <div className="space-y-2.5">
            {rows.map((r, i) => {
              const used = occupation.get(r.nom) ?? 0;
              const complet = used >= r.capacite;
              return (
                <div
                  key={i}
                  className="flex flex-wrap items-center gap-2 rounded-2xl border border-brand/12 bg-card px-3 py-2.5"
                >
                  <span className="min-w-0 flex-1 text-sm font-medium text-foreground">
                    {r.nom}
                  </span>
                  <span className={toneBadge(complet ? "red" : "teal")}>
                    {used}/{r.capacite}
                  </span>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <span>Cap.</span>
                    <Input
                      type="number"
                      min={1}
                      value={r.capacite}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        if (v >= 1) setRow(i, { capacite: v });
                      }}
                      className="h-9 w-16 rounded-lg border-brand/20 text-center text-xs tabular-nums"
                      aria-label={`Capacité de ${r.nom}`}
                    />
                  </div>
                  <button
                    type="button"
                    className={cn(
                      ghostPill,
                      "h-9 w-9 justify-center p-0 text-alert",
                    )}
                    onClick={() => removeRow(i)}
                    aria-label={`Supprimer ${r.nom}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}

            {rows.length === 0 ? (
              <p className="rounded-2xl border border-brand/12 bg-muted/40 px-4 py-5 text-center text-sm text-muted-foreground">
                Aucune structure. Ajoutez-en une ci-dessous.
              </p>
            ) : null}

            {aDesModifs ? (
              <div className="flex justify-end border-t border-brand/12 pt-3">
                <button
                  type="button"
                  className={cn(primaryPill, "h-9 gap-1.5 px-5 text-sm")}
                  onClick={saveCapacites}
                >
                  <Save className="h-4 w-4" /> Enregistrer les capacités
                </button>
              </div>
            ) : null}

            <div className="flex items-center gap-2 border-t border-brand/12 pt-3">
              <Input
                placeholder="Ajouter une structure…"
                value={nouveauNom}
                onChange={(e) => setNouveauNom(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addRow();
                  }
                }}
                className={cn(softInput, "h-9 flex-1 text-sm")}
              />
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <span>Cap.</span>
                <Input
                  type="number"
                  min={1}
                  value={nouvelleCapacite}
                  onChange={(e) =>
                    setNouvelleCapacite(Number(e.target.value))
                  }
                  className="h-9 w-16 rounded-lg border-brand/20 text-center text-xs tabular-nums"
                  aria-label="Capacité de la nouvelle structure"
                />
              </div>
              <button
                type="button"
                className={cn(primaryPill, "h-9 px-4 text-sm")}
                onClick={addRow}
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>
        </DetailShell>
      </DialogContent>
    </Dialog>
  );
}
