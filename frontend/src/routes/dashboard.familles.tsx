import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useRef } from "react";
import { Search, Plus, Pencil, Trash2, Upload, Download, Loader2, Percent } from "lucide-react";
import { api } from "@/lib/api";
import { useDashboardI18n } from "@/lib/dashboard-i18n";
import { softCard, softInput as inputClass, primaryPill, ghostPill, iconButton, STATUS_COLORS } from "@/lib/dash-ui";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Client = {
  id: string; parentName: string; childName: string; email: string; phone: string;
  level: string; crmStage: string; monthlyFee: string; debt: string;
  paymentStatus: string; paymentDay: number; remise: string; fratrie: number;
  childNames: Array<{ name: string; dob: string; cycle: string; level: string; services: string[]; frais: string[] }>;
  subscribedServices: string[]; createdAt: string;
};

function DashboardFamilles() {
  const { t } = useDashboardI18n();
  const qc = useQueryClient();
  const { data: clients = [] } = useQuery({ queryKey: ["clients"], queryFn: () => api.get<Client[]>("/clients") });
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) =>
      `${c.parentName} ${c.childName} ${c.email} ${c.phone}`.toLowerCase().includes(q),
    );
  }, [clients, search]);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/clients/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["clients"] }); toast.success("Fiche supprimée"); },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Erreur"),
  });

  const handleExportCsv = () => {
    const cols = ["parentName", "childName", "email", "phone", "level", "monthlyFee"];
    const header = cols.join(",");
    const body = clients.map((c) => cols.map((col) => `"${(c as any)[col] ?? ""}"`).join(",")).join("\n");
    const blob = new Blob(["\ufeff" + header + "\n" + body], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "clients.csv"; a.click();
  };

  const fileRef = useRef<HTMLInputElement>(null);
  const importMutation = useMutation({
    mutationFn: (csvText: string) => api.post("/clients/import-csv", { csvText }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["clients"] }); toast.success("Import terminé"); },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Erreur import"),
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">{t.familles.eyebrow}</p>
          <h1 className="mt-1 font-display text-3xl tracking-tight text-foreground md:text-4xl">{t.familles.titleBold}</h1>
        </div>
        <div className="flex items-center gap-2">
          <input ref={fileRef} type="file" accept=".csv" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onload = () => importMutation.mutate(r.result as string); r.readAsText(f); } }} />
          <button onClick={handleExportCsv} className={cn(ghostPill, "gap-1.5")}><Download className="h-3.5 w-3.5" /> CSV</button>
          <button onClick={() => fileRef.current?.click()} className={cn(ghostPill, "gap-1.5")}><Upload className="h-3.5 w-3.5" /> CSV</button>
          <button onClick={() => setAddOpen(true)} className={primaryPill}><Plus className="h-4 w-4" /> {t.familles.addClient}</button>
        </div>
      </header>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t.familles.searchPlaceholder} className={cn(inputClass, "pl-10")} />
      </div>

      <section className={cn(softCard, "overflow-hidden")}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm [&_th]:border-r [&_th]:border-[#28396C]/15 [&_td]:border-r [&_td]:border-[#28396C]/8">
            <thead>
              <tr className="border-b border-[#28396C]/15 bg-muted/60 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3.5">{t.familles.table.parent}</th>
                <th className="px-4 py-3.5">Élève(s)</th>
                <th className="px-4 py-3.5">Niveau</th>
                <th className="px-4 py-3.5">Contact</th>
                <th className="px-4 py-3.5 text-right">Mensualité</th>
                <th className="w-24 px-4 py-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#28396C]/8">
              {filtered.map((c) => (
                <tr key={c.id} onClick={() => setDetailId(c.id)} className="cursor-pointer transition-colors hover:bg-[#B5E18B]/20">
                  <td className="border-l-[3px] px-4 py-3.5 font-medium" style={{ borderLeftColor: STATUS_COLORS[c.paymentStatus as keyof typeof STATUS_COLORS] ?? "#ccc" }}>
                    {c.parentName}
                  </td>
                  <td className="px-4 py-3.5">{c.childName}</td>
                  <td className="px-4 py-3.5 text-muted-foreground">{c.level}</td>
                  <td className="px-4 py-3.5 text-muted-foreground">
                    <span className="block">{c.email}</span>
                    <span className="text-xs">{c.phone}</span>
                  </td>
                  <td className="px-4 py-3.5 text-right tabular-nums">
                    <span className="font-semibold">{Number(c.monthlyFee).toLocaleString("fr-FR")} MAD</span>
                    {c.paymentStatus === "paye" ? (
                      <span className="ml-2 text-xs font-medium text-[#6BA53A]">Payé</span>
                    ) : (
                      <span className="ml-2 text-xs font-medium text-[#E25C5C]">Dû: {Number(c.debt).toLocaleString("fr-FR")}</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => setEditId(c.id)} className={iconButton}><Pencil className="h-3.5 w-3.5" /></button>
                      <button onClick={() => { if (confirm("Supprimer ?")) deleteMutation.mutate(c.id); }} className={cn(iconButton, "text-[#E25C5C]")}><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <p className="px-5 py-8 text-center text-sm text-muted-foreground">{t.familles.noMatch}</p>}
        </div>
      </section>
    </div>
  );
}

export const Route = createFileRoute("/dashboard/familles")({ component: DashboardFamilles });