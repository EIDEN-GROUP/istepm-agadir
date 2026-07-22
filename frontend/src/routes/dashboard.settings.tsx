import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { softCard, primaryPill, iconButton } from "@/lib/dash-ui";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Level = {
  id: string;
  name: string;
  cycle: string;
  monthlyFee: string;
  maxStudents: number;
};

function DashboardSettings() {
  const qc = useQueryClient();
  const { data: levels = [] } = useQuery({
    queryKey: ["levels"],
    queryFn: () => api.get<Level[]>("/settings/levels"),
  });
  const { data: settingsMap } = useQuery({
    queryKey: ["settings"],
    queryFn: () => api.get<Record<string, any>>("/settings"),
  });
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ name: "", cycle: "", monthlyFee: 0 });

  const createMutation = useMutation({
    mutationFn: () => api.post("/settings/levels", form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["levels"] });
      setAddOpen(false);
      toast.success("Niveau ajouté");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/settings/levels/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["levels"] });
      toast.success("Supprimé");
    },
  });

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Paramètres
        </p>
        <h1 className="mt-1 font-display text-3xl tracking-tight">
          Configuration
        </h1>
      </header>

      <section className={cn(softCard, "p-5")}>
        <div className="flex items-center justify-between mb-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Niveaux scolaires
          </p>
          <button onClick={() => setAddOpen(true)} className={primaryPill}>
            <Plus className="h-4 w-4" /> Ajouter
          </button>
        </div>
        {levels.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucun niveau configuré.
          </p>
        ) : (
          <div className="divide-y divide-[#28396C]/8">
            {levels.map((l) => (
              <div
                key={l.id}
                className="flex items-center justify-between py-3"
              >
                <div>
                  <p className="font-semibold text-foreground">{l.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {l.cycle} · {Number(l.monthlyFee).toLocaleString("fr-FR")}{" "}
                    MAD/mois
                  </p>
                </div>
                <button
                  onClick={() => {
                    if (confirm("Supprimer ?")) deleteMutation.mutate(l.id);
                  }}
                  className={cn(iconButton, "text-[#E25C5C]")}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogTitle>Nouveau niveau</DialogTitle>
          <div className="space-y-4">
            <div>
              <Label>Nom</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <Label>Cycle</Label>
              <Input
                value={form.cycle}
                onChange={(e) => setForm({ ...form, cycle: e.target.value })}
              />
            </div>
            <div>
              <Label>Frais mensuels (MAD)</Label>
              <Input
                type="number"
                value={form.monthlyFee}
                onChange={(e) =>
                  setForm({ ...form, monthlyFee: Number(e.target.value) })
                }
              />
            </div>
            <button
              onClick={() => createMutation.mutate()}
              className="w-full rounded-full bg-[#6BA53A] py-2.5 text-sm font-semibold text-white"
            >
              Ajouter
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export const Route = createFileRoute("/dashboard/settings")({
  component: DashboardSettings,
});
