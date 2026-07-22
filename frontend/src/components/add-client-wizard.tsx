import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useDashboardI18n } from "@/lib/dashboard-i18n";
import {
  softCard,
  softInput as inputClass,
  labelClass,
  primaryPill,
} from "@/lib/dash-ui";
import { api } from "@/lib/api";
import { toast } from "sonner";

export type ChildFormData = {
  name: string;
  dob: string;
  cycle: string;
  level: string;
  services: string[];
  frais: string[];
};
export type WizardData = {
  step: number;
  parent: Record<string, string>;
  children: ChildFormData[];
};

export const emptyChild: ChildFormData = {
  name: "",
  dob: "",
  cycle: "",
  level: "",
  services: [],
  frais: [],
};
export const emptyWizard: WizardData = {
  step: 0,
  parent: {},
  children: [emptyChild],
};

export function AddClientDialog({
  open,
  onOpenChange,
  wizard,
  updateWizard,
  setWizard,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  wizard: WizardData;
  updateWizard: (p: Partial<WizardData>) => void;
  setWizard: (w: WizardData) => void;
}) {
  const qc = useQueryClient();
  const { t } = useDashboardI18n();
  const { data: levels = [] } = useQuery({
    queryKey: ["levels"],
    queryFn: () =>
      api.get<Array<{ id: string; name: string }>>("/settings/levels"),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      api.post("/clients", {
        parentName: wizard.parent.parent_name || "",
        childName: wizard.children.map((c) => c.name).join(", "),
        childNames: wizard.children,
        email: wizard.parent.email || "",
        phone: wizard.parent.phone || "",
        level: wizard.children[0]?.level || "",
        monthlyFee: Number(wizard.parent.monthly_fee) || 0,
        remise: Number(wizard.parent.remise) || 0,
        fratrie: wizard.children.length,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      onOpenChange(false);
      setWizard(emptyWizard);
      toast.success("Client créé");
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Erreur"),
  });

  const addChild = () =>
    updateWizard({ children: [...wizard.children, { ...emptyChild }] });
  const removeChild = (i: number) =>
    updateWizard({ children: wizard.children.filter((_, idx) => idx !== i) });
  const updateChild = (i: number, p: Partial<ChildFormData>) => {
    const children = [...wizard.children];
    children[i] = { ...children[i], ...p };
    updateWizard({ children });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          onOpenChange(v);
          setWizard(emptyWizard);
        }
      }}
    >
      <DialogContent className="max-w-[90vw] max-h-[85vh] overflow-y-auto">
        <DialogTitle className="text-lg font-semibold">
          Ajouter une famille
        </DialogTitle>
        {wizard.step === 0 ? (
          <div className="space-y-4">
            <p className="text-sm font-semibold text-muted-foreground">
              Informations parent
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Nom du parent</Label>
                <Input
                  value={wizard.parent.parent_name ?? ""}
                  onChange={(e) =>
                    updateWizard({
                      parent: { ...wizard.parent, parent_name: e.target.value },
                    })
                  }
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  value={wizard.parent.email ?? ""}
                  onChange={(e) =>
                    updateWizard({
                      parent: { ...wizard.parent, email: e.target.value },
                    })
                  }
                />
              </div>
              <div>
                <Label>Téléphone</Label>
                <Input
                  value={wizard.parent.phone ?? ""}
                  onChange={(e) =>
                    updateWizard({
                      parent: { ...wizard.parent, phone: e.target.value },
                    })
                  }
                />
              </div>
              <div>
                <Label>Frais mensuels (MAD)</Label>
                <Input
                  type="number"
                  value={wizard.parent.monthly_fee ?? ""}
                  onChange={(e) =>
                    updateWizard({
                      parent: { ...wizard.parent, monthly_fee: e.target.value },
                    })
                  }
                />
              </div>
              <div>
                <Label>Remise (%)</Label>
                <Input
                  type="number"
                  value={wizard.parent.remise ?? "0"}
                  onChange={(e) =>
                    updateWizard({
                      parent: { ...wizard.parent, remise: e.target.value },
                    })
                  }
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => updateWizard({ step: 1 })}
                className={primaryPill}
              >
                Suivant <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-muted-foreground">
                Enfants
              </p>
              <button
                onClick={addChild}
                className="flex items-center gap-1 text-sm text-[#6BA53A] hover:underline"
              >
                <Plus className="h-3.5 w-3.5" /> Ajouter
              </button>
            </div>
            {wizard.children.map((child, i) => (
              <div key={i} className="rounded-xl border border-border p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-muted-foreground">
                    Enfant {i + 1}
                  </p>
                  {wizard.children.length > 1 && (
                    <button
                      onClick={() => removeChild(i)}
                      className="text-[#E25C5C]"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label>Nom</Label>
                    <Input
                      value={child.name}
                      onChange={(e) => updateChild(i, { name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Date de naissance</Label>
                    <Input
                      type="date"
                      value={child.dob}
                      onChange={(e) => updateChild(i, { dob: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Cycle</Label>
                    <Input
                      value={child.cycle}
                      onChange={(e) =>
                        updateChild(i, { cycle: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label>Niveau</Label>
                    <Select
                      value={child.level}
                      onValueChange={(v) => updateChild(i, { level: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {levels.map((l: any) => (
                          <SelectItem key={l.id} value={l.name}>
                            {l.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ))}
            <div className="flex justify-between">
              <button
                onClick={() => updateWizard({ step: 0 })}
                className={primaryPill}
              >
                <ChevronLeft className="h-4 w-4" /> Retour
              </button>
              <button
                onClick={() => createMutation.mutate()}
                className={cn(primaryPill, "bg-[#6BA53A] text-white")}
              >
                Créer la fiche
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
