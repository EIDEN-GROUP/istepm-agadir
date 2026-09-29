import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Building2, PenLine, Plus, Trash2 } from "lucide-react";
import { useIstpm } from "@/lib/istpm-store";
import { normalizeStructure } from "@/lib/istpm-data";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { DetailShell } from "@/components/dash-page";
import { Input } from "@/components/ui/input";
import { StructureEditModal } from "@/components/structure-edit-modal";
import {
  dialogSurface,
  primaryPill,
  ghostPill,
  toneBadge,
  softInput,
} from "@/lib/dash-ui";
import { cn } from "@/lib/utils";

export function StructuresAccueilDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const {
    structuresAccueil,
    servicesStage,
    servicesHeures,
    programmeStages,
    stages,
    addStructureAccueil,
    updateStructureAccueil,
    deleteStructureAccueil,
  } = useIstpm();

  const rows = useMemo(
    () => structuresAccueil.map((s) => normalizeStructure(s)),
    [structuresAccueil],
  );

  const [nouveauNom, setNouveauNom] = useState("");
  const [editNom, setEditNom] = useState<string | null>(null);

  // Occupation globale (sans filtre niveau : ce dialogue n'en choisit pas).
  const occupation = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of stages) {
      if (s.statut === "valide") continue;
      map.set(s.structure, (map.get(s.structure) ?? 0) + 1);
    }
    return map;
  }, [stages]);

  // Le serveur fait foi : la modale d'édition suit le store.
  useEffect(() => {
    if (editNom && !structuresAccueil.some((s) => s.nom === editNom)) {
      setEditNom(null);
    }
  }, [structuresAccueil, editNom]);

  const removeRow = async (nom: string) => {
    try {
      await deleteStructureAccueil(nom);
      toast.success(`Supprimée · ${nom}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Suppression impossible");
    }
  };

  const addRow = async () => {
    const nom = nouveauNom.trim();
    if (!nom) return;
    if (rows.some((r) => r.nom === nom)) {
      toast.error("Cette structure existe déjà");
      return;
    }
    try {
      await addStructureAccueil(nom, 5);
      setNouveauNom("");
      toast.success(`Ajoutée · ${nom} — complétez ses sous-stages via Modifier`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ajout impossible");
    }
  };

  const editStructure = editNom
    ? (structuresAccueil.find((s) => s.nom === editNom) ?? null)
    : null;

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
          subtitle="Ajouter, détailler (sous-stages) ou supprimer les lieux de stage"
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
            {rows.map((r) => {
              // Capacité : seul plafond de la structure (ni stages ni
              // sous-stages n'en portent) ; occupation globale ici.
              const total = r.capacite ?? 5;
              const used = occupation.get(r.nom) ?? 0;
              const complet = used >= total;
              return (
                <div
                  key={r.nom}
                  className="flex flex-wrap items-center gap-2 rounded-2xl border border-brand/12 bg-card px-3 py-2.5"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-foreground">
                      {r.nom}
                    </span>
                    <span className="block truncate text-[11px] text-muted-foreground">
                      {r.stages.length
                        ? `${r.stages.length} stage(s) · ${r.stages.reduce((t, s) => t + s.subStages.length, 0)} sous-stage(s)`
                        : "Capacité globale"}
                    </span>
                  </span>
                  <span className={toneBadge(complet ? "red" : "teal")}>
                    {used}/{total}
                  </span>
                  <button
                    type="button"
                    className={cn(ghostPill, "h-7 gap-1 px-2.5 text-[11px]")}
                    onClick={() => setEditNom(r.nom)}
                  >
                    <PenLine className="h-3 w-3" /> Modifier
                  </button>
                  <button
                    type="button"
                    className={cn(
                      ghostPill,
                      "h-9 w-9 justify-center p-0 text-alert",
                    )}
                    onClick={() => void removeRow(r.nom)}
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

            <div className="flex items-center gap-2 border-t border-brand/12 pt-3">
              <Input
                placeholder="Ajouter une structure…"
                value={nouveauNom}
                onChange={(e) => setNouveauNom(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void addRow();
                  }
                }}
                className={cn(softInput, "h-9 flex-1 text-sm")}
              />
              <button
                type="button"
                className={cn(primaryPill, "h-9 px-4 text-sm")}
                onClick={() => void addRow()}
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>
        </DetailShell>
      </DialogContent>

      {editStructure ? (
        <StructureEditModal
          structure={editStructure}
          services={servicesStage}
          servicesHeures={servicesHeures}
          programme={programmeStages}
          onClose={() => setEditNom(null)}
          onSave={async (nomInitial, body) => {
            await updateStructureAccueil(nomInitial, body);
            toast.success("Structure enregistrée");
          }}
        />
      ) : null}
    </Dialog>
  );
}
