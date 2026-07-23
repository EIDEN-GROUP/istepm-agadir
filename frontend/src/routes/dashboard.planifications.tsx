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

type Planif = {
  id: string;
  date: string;
  time: string;
  title: string;
  detail: string;
  tone: string;
};

function DashboardPlanifications() {
  const qc = useQueryClient();
  const { data: plans = [] } = useQuery({
    queryKey: ["planifications"],
    queryFn: () => api.get<Planif[]>("/planifications"),
  });
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({
    date: "",
    time: "",
    title: "",
    detail: "",
    tone: "zinc",
  });

  const createMutation = useMutation({
    mutationFn: () => api.post("/planifications", form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["planifications"] });
      setAddOpen(false);
      toast.success("Événement créé");
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Erreur"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/planifications/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["planifications"] });
      toast.success("Supprimé");
    },
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Planifications
          </p>
          <h1 className="mt-1 font-display text-3xl tracking-tight">
            Événements
          </h1>
        </div>
        <button onClick={() => setAddOpen(true)} className={primaryPill}>
          <Plus className="h-4 w-4" /> Ajouter
        </button>
      </header>

      <section className={cn(softCard, "overflow-hidden")}>
        <div className="divide-y divide-brand/8">
          {plans.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between px-5 py-4 hover:bg-muted/40"
            >
              <div className="flex items-center gap-4">
                <div
                  className={cn("h-2.5 w-2.5 rounded-full", {
                    "bg-violet-500": p.tone === "violet",
                    "bg-emerald-500": p.tone === "emerald",
                    "bg-amber-500": p.tone === "amber",
                    "bg-zinc-500": p.tone === "zinc",
                  })}
                />
                <div>
                  <p className="font-semibold text-foreground">{p.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(p.date).toLocaleDateString("fr-FR")} à{" "}
                    {p.time.slice(0, 5)}
                  </p>
                  {p.detail && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {p.detail}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => {
                  if (confirm("Supprimer ?")) deleteMutation.mutate(p.id);
                }}
                className={cn(iconButton, "text-alert shrink-0")}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          {plans.length === 0 && (
            <p className="px-5 py-8 text-center text-sm text-muted-foreground">
              Aucun événement
            </p>
          )}
        </div>
      </section>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogTitle>Nouvel événement</DialogTitle>
          <div className="space-y-4">
            <div>
              <Label>Date</Label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>
            <div>
              <Label>Heure</Label>
              <Input
                type="time"
                value={form.time}
                onChange={(e) => setForm({ ...form, time: e.target.value })}
              />
            </div>
            <div>
              <Label>Titre</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div>
              <Label>Détail</Label>
              <Input
                value={form.detail}
                onChange={(e) => setForm({ ...form, detail: e.target.value })}
              />
            </div>
            <button
              onClick={() => createMutation.mutate()}
              className="w-full rounded-full bg-brand py-2.5 text-sm font-semibold text-white hover:bg-[#5a9232]"
            >
              Créer
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export const Route = createFileRoute("/dashboard/planifications")({
  component: DashboardPlanifications,
});
