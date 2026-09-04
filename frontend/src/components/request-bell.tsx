import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Bell, CheckCheck } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import {
  fetchStudentNotifications,
  markStudentNotificationsRead,
  fetchAllStudentRequests,
} from "@/lib/istpm-api";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { softSelectContent, toneBadge } from "@/lib/dash-ui";
import { cn } from "@/lib/utils";

/**
 * Cloche des demandes — petit bouton qui n'existe que s'il y a du nouveau.
 *
 * - Étudiant : réponses du staff non encore vues (`GET /student/notifications`,
 *   sondé toutes les 60 s). « Tout marquer comme lu » solde le compteur.
 * - Direction/responsable : demandes `en_attente` à traiter ; clic → espace étudiant.
 * - Autres rôles / compteur à zéro : rien n'est rendu (pas même le bouton).
 */
export function RequestBell() {
  const { role } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const isStudent = role === "etudiant";
  const isStaff = role === "directeur" || role === "responsable";
  if (!isStudent && !isStaff) return null;

  return <RequestBellInner isStudent={isStudent} open={open} setOpen={setOpen} navigate={navigate} qc={qc} />;
}

function RequestBellInner({
  isStudent,
  open,
  setOpen,
  navigate,
  qc,
}: {
  isStudent: boolean;
  open: boolean;
  setOpen: (o: boolean) => void;
  navigate: ReturnType<typeof useNavigate>;
  qc: ReturnType<typeof useQueryClient>;
}) {
  const studentQ = useQuery({
    queryKey: ["student-notifications"],
    queryFn: fetchStudentNotifications,
    enabled: isStudent,
    refetchInterval: 60_000,
    retry: false,
  });
  const staffQ = useQuery({
    queryKey: ["student-requests-all"],
    queryFn: () => fetchAllStudentRequests(),
    enabled: !isStudent,
    refetchInterval: 60_000,
    retry: false,
  });

  const luMut = useMutation({
    mutationFn: markStudentNotificationsRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["student-notifications"] });
      qc.invalidateQueries({ queryKey: ["student-requests"] });
      setOpen(false);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Marquage impossible"),
  });

  const unread = isStudent
    ? (studentQ.data?.unread ?? 0)
    : ((staffQ.data ?? []).filter((d) => d.statut === "en_attente").length ?? 0);
  if (!unread) return null;

  const items = isStudent
    ? ((studentQ.data?.items ?? []).map((n) => ({
        id: n.id,
        title: n.titre,
        sub: n.reponse || "Statut mis à jour",
        date: new Date(n.updatedAt).toLocaleDateString("fr-FR"),
        tone: n.statut === "traite" ? ("teal" as const) : n.statut === "rejete" ? ("red" as const) : ("blue" as const),
        label: n.statut === "traite" ? "Traitée" : n.statut === "rejete" ? "Rejetée" : "En cours",
      })))
    : ((staffQ.data ?? [])
        .filter((d) => d.statut === "en_attente")
        .slice(0, 6)
        .map((d) => ({
          id: d.id,
          title: d.titre,
          sub: d.description,
          date: new Date(d.createdAt).toLocaleDateString("fr-FR"),
          tone: "amber" as const,
          label: "À traiter",
        })));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={isStudent ? "Réponses à mes demandes" : "Demandes à traiter"}
          className="relative grid h-9 w-9 place-items-center rounded-xl border border-brand/20 bg-card text-muted-foreground shadow-[var(--elevation-1)] transition hover:bg-brand/10 hover:text-brand-dk"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute -end-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-alert px-1 text-[10px] font-bold tabular-nums text-white ring-2 ring-card">
            {unread > 9 ? "9+" : unread}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className={cn(softSelectContent, "w-80 p-0")} align="end">
        <p className="border-b border-brand/10 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {isStudent ? "Réponses du secrétariat" : "Demandes en attente"}
        </p>
        <ul className="max-h-72 divide-y divide-brand/8 overflow-y-auto">
          {items.map((it) => (
            <li key={it.id}>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  navigate({ to: "/dashboard/espace-etudiant" });
                }}
                className="block w-full px-4 py-2.5 text-start transition hover:bg-brand/5"
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-semibold text-foreground">{it.title}</span>
                  <span className={cn(toneBadge(it.tone), "shrink-0")}>{it.label}</span>
                </span>
                <span className="mt-0.5 block truncate text-xs text-muted-foreground">{it.sub}</span>
                <span className="text-[10px] text-muted-foreground/70">{it.date}</span>
              </button>
            </li>
          ))}
        </ul>
        <div className="border-t border-brand/10 p-2">
          {isStudent ? (
            <button
              type="button"
              disabled={luMut.isPending}
              onClick={() => luMut.mutate()}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-brand-dk transition hover:bg-brand/10 disabled:opacity-50"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              {luMut.isPending ? "Marquage…" : "Tout marquer comme lu"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                navigate({ to: "/dashboard/espace-etudiant" });
              }}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-brand-dk transition hover:bg-brand/10"
            >
              Ouvrir l'espace étudiant
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
