import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { useDashboardI18n } from "@/lib/dashboard-i18n";
import { softCard, primaryPill, iconButton, statusPill } from "@/lib/dash-ui";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Payment = { id: string; clientId: string; amount: string; date: string; mode: string; period: string; receipt: string; invoiceSent: boolean; client?: { parentName: string; childName: string; phone: string } | null };

function DashboardPaiements() {
  const { t } = useDashboardI18n();
  const qc = useQueryClient();
  const { data: payments = [] } = useQuery({ queryKey: ["payments"], queryFn: () => api.get<Payment[]>("/payments") });
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ clientId: "", amount: 0, mode: "especes" });

  const createMutation = useMutation({
    mutationFn: (data: typeof form) => api.post("/payments", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["payments"] }); qc.invalidateQueries({ queryKey: ["clients"] }); setAddOpen(false); toast.success("Paiement enregistré"); },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Erreur"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/payments/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["payments"] }); qc.invalidateQueries({ queryKey: ["clients"] }); toast.success("Paiement supprimé"); },
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Paiements</p>
          <h1 className="mt-1 font-display text-3xl tracking-tight text-foreground md:text-4xl">Paiements</h1>
        </div>
        <button onClick={() => setAddOpen(true)} className={primaryPill}><Plus className="h-4 w-4" /> Nouveau paiement</button>
      </header>

      <section className={cn(softCard, "overflow-hidden")}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-left text-sm">
            <thead>
              <tr className="border-b border-[#28396C]/15 bg-muted/60 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3.5">Client</th>
                <th className="px-4 py-3.5">Montant</th>
                <th className="px-4 py-3.5">Date</th>
                <th className="px-4 py-3.5">Mode</th>
                <th className="px-4 py-3.5">Période</th>
                <th className="px-4 py-3.5">Reçu</th>
                <th className="w-16 px-4 py-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#28396C]/8">
              {payments.map((p) => (
                <tr key={p.id} className="hover:bg-muted/40">
                  <td className="px-4 py-3 font-medium">{p.client?.parentName ?? p.clientId}</td>
                  <td className="px-4 py-3 tabular-nums">{Number(p.amount).toLocaleString("fr-FR")} MAD</td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(p.date).toLocaleDateString("fr-FR")}</td>
                  <td className="px-4 py-3"><span className={cn(statusPill, "uppercase text-[10px]")}>{p.mode}</span></td>
                  <td className="px-4 py-3 text-muted-foreground">{p.period}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{p.receipt}</td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => { if (confirm("Supprimer ce paiement ?")) deleteMutation.mutate(p.id); }} className={cn(iconButton, "text-[#E25C5C]")}><Trash2 className="h-3.5 w-3.5" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogTitle>Nouveau paiement</DialogTitle>
          <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(form); }} className="space-y-4">
            <div>
              <Label>ID Client</Label>
              <Input value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })} placeholder="UUID du client" />
            </div>
            <div>
              <Label>Montant (MAD)</Label>
              <Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Mode</Label>
              <Select value={form.mode} onValueChange={(v) => setForm({ ...form, mode: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="especes">Espèces</SelectItem>
                  <SelectItem value="virement">Virement</SelectItem>
                  <SelectItem value="carte">Carte</SelectItem>
                  <SelectItem value="cheque">Chèque</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <button type="submit" className="w-full rounded-full bg-[#6BA53A] py-2.5 text-sm font-semibold text-white hover:bg-[#5a9232]">
              Enregistrer
            </button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export const Route = createFileRoute("/dashboard/paiements")({ component: DashboardPaiements });