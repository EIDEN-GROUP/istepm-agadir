import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { softCard, primaryPill, iconButton } from "@/lib/dash-ui";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Employee = { id: string; fullName: string; position: string; department: string; email: string; phone: string; status: string };

function DashboardAffiches() {
  const qc = useQueryClient();
  const { data: employees = [] } = useQuery({ queryKey: ["employees"], queryFn: () => api.get<Employee[]>("/employees") });
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ fullName: "", position: "", department: "" });

  const createMutation = useMutation({
    mutationFn: () => api.post("/employees", form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["employees"] }); setAddOpen(false); toast.success("Employé ajouté"); },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Erreur"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/employees/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["employees"] }); toast.success("Supprimé"); },
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Affiches</p>
          <h1 className="mt-1 font-display text-3xl tracking-tight">Employés</h1>
        </div>
        <button onClick={() => setAddOpen(true)} className={primaryPill}><Plus className="h-4 w-4" /> Ajouter</button>
      </header>

      <section className={cn(softCard, "overflow-hidden")}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[500px] text-left text-sm">
            <thead>
              <tr className="border-b border-[#28396C]/15 bg-muted/60 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3.5">Nom</th>
                <th className="px-4 py-3.5">Poste</th>
                <th className="px-4 py-3.5">Département</th>
                <th className="px-4 py-3.5">Email</th>
                <th className="px-4 py-3.5">Statut</th>
                <th className="w-16 px-4 py-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#28396C]/8">
              {employees.map((e) => (
                <tr key={e.id} className="hover:bg-muted/40">
                  <td className="px-4 py-3 font-medium">{e.fullName}</td>
                  <td className="px-4 py-3 text-muted-foreground">{e.position}</td>
                  <td className="px-4 py-3 text-muted-foreground">{e.department}</td>
                  <td className="px-4 py-3 text-muted-foreground">{e.email}</td>
                  <td className="px-4 py-3">
                    <span className={cn("inline-block rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase", e.status === "actif" ? "bg-[#B5E18B]/30 text-[#3E6420]" : "bg-[#F6D8D8] text-[#9A2F2F]")}>{e.status}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => { if (confirm("Supprimer ?")) deleteMutation.mutate(e.id); }} className={cn(iconButton, "text-[#E25C5C]")}><Trash2 className="h-3.5 w-3.5" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogTitle>Nouvel employé</DialogTitle>
          <div className="space-y-4">
            <div><Label>Nom complet</Label><Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></div>
            <div><Label>Poste</Label><Input value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} /></div>
            <div><Label>Département</Label><Input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} /></div>
            <button onClick={() => createMutation.mutate()} className="w-full rounded-full bg-[#6BA53A] py-2.5 text-sm font-semibold text-white hover:bg-[#5a9232]">Ajouter</button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export const Route = createFileRoute("/dashboard/affiches")({ component: DashboardAffiches });