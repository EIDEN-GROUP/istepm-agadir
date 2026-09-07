import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Bell, CheckCheck, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import {
  fetchStudentNotifications,
  markStudentNotificationsRead,
  markStudentNotificationRead,
  hideStudentNotification,
  fetchAllStudentRequests,
} from "@/lib/istpm-api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { DetailShell } from "@/components/dash-page";
import { dialogSurface, toneBadge } from "@/lib/dash-ui";
import { cn } from "@/lib/utils";

type Tone = "amber" | "blue" | "teal" | "red";

type BellItem = {
  id: string;
  title: string;
  sub: string;
  detail: string;
  date: string;
  tone: Tone;
  label: string;
  lu: boolean;
};

/** Formattage de date qui ne plante jamais (données inattendues → "—"). */
function fmtDateNotif(v: unknown): string {
  try {
    const d = new Date(String(v ?? ""));
    if (Number.isNaN(+d)) return "—";
    return d.toLocaleDateString("fr-FR");
  } catch {
    return "—";
  }
}

/**
 * Cloche des demandes — petit bouton qui n'existe que s'il y a du nouveau,
 * et qui ouvre une **modale** (pas un simple menu).
 *
 * - Étudiant : réponses du staff. Cliquer sur une demande l'ouvre (détail) et la
 *   marque comme lue : elle **reste visible mais grisée**. Le bouton X **efface**
 *   la notification (cachée côté cloche, jamais supprimée en base).
 * - Direction/responsable : demandes `en_attente` ; clic → espace étudiant.
 * - Compteur à zéro (et modale fermée) : rien n'est rendu, pas même le bouton.
 */
export function RequestBell() {
  const { role } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const isStudent = role === "etudiant";
  const isStaff = role === "directeur" || role === "responsable";

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
    enabled: isStaff,
    refetchInterval: 60_000,
    retry: false,
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["student-notifications"] });
    qc.invalidateQueries({ queryKey: ["student-requests"] });
  };
  const onErr = (err: unknown) =>
    toast.error(err instanceof Error ? err.message : "Action impossible");

  const markOne = useMutation({
    mutationFn: markStudentNotificationRead,
    onSuccess: refresh,
    onError: onErr,
  });
  const hideOne = useMutation({
    mutationFn: hideStudentNotification,
    onSuccess: refresh,
    onError: onErr,
  });
  const markAll = useMutation({
    mutationFn: markStudentNotificationsRead,
    onSuccess: () => {
      refresh();
    },
    onError: onErr,
  });

  if (!isStudent && !isStaff) return null;

  const unread = isStudent
    ? (studentQ.data?.unread ?? 0)
    : ((staffQ.data ?? []).filter((d) => d.statut === "en_attente").length ?? 0);
  if (!unread && !open) return null;

  const items: BellItem[] = isStudent
    ? [...(studentQ.data?.items ?? [])]
        .sort(
          (a, b) =>
            Number(a.luParEtudiant === true) - Number(b.luParEtudiant === true) ||
            +new Date(String(b.updatedAt ?? 0)) - +new Date(String(a.updatedAt ?? 0)),
        )
        .map((n) => ({
          id: String(n.id ?? ""),
          title: String(n.titre ?? "Demande"),
          sub: String(n.reponse || "Statut mis à jour"),
          detail: String(n.description || ""),
          date: fmtDateNotif(n.updatedAt),
          tone: (n.statut === "traite" ? "teal" : n.statut === "rejete" ? "red" : "blue") as Tone,
          label: n.statut === "traite" ? "Traitée" : n.statut === "rejete" ? "Rejetée" : "En cours",
          lu: n.luParEtudiant === true,
        }))
    : ((staffQ.data ?? [])
        .filter((d) => d.statut === "en_attente")
        .slice(0, 8)
        .map((d) => ({
          id: String(d.id ?? ""),
          title: String(d.titre ?? "Demande"),
          sub: String(d.description ?? ""),
          detail: String(d.description ?? ""),
          date: fmtDateNotif(d.createdAt),
          tone: "amber" as Tone,
          label: "À traiter",
          lu: false,
        })));

  const openItem = (it: BellItem) => {
    if (isStudent) {
      if (!it.lu) markOne.mutate(it.id);
      setExpandedId((prev) => (prev === it.id ? null : it.id));
    } else {
      setOpen(false);
      navigate({ to: "/dashboard/espace-etudiant" });
    }
  };

  return (
    <>
      {!unread ? null : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={isStudent ? "Réponses à mes demandes" : "Demandes à traiter"}
          className="relative grid h-9 w-9 place-items-center rounded-xl border border-brand/20 bg-card text-muted-foreground shadow-[var(--elevation-1)] transition hover:bg-brand/10 hover:text-brand-dk"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute -end-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-alert px-1 text-[10px] font-bold tabular-nums text-white ring-2 ring-card">
            {unread > 9 ? "9+" : unread}
          </span>
        </button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className={dialogSurface}>
          <DialogTitle className="sr-only">Notifications des demandes</DialogTitle>
          <DialogDescription className="sr-only">
            {isStudent ? "Réponses du secrétariat" : "Demandes en attente"}
          </DialogDescription>
          <DetailShell
            icon={<Bell className="h-5 w-5" />}
            title="Notifications"
            subtitle={
              isStudent
                ? unread
                  ? `${unread} non lue${unread > 1 ? "s" : ""}`
                  : "Tout est à jour"
                : `${unread} demande${unread > 1 ? "s" : ""} en attente`
            }
            footer={
              isStudent ? (
                <button
                  type="button"
                  disabled={!unread || markAll.isPending}
                  onClick={() => markAll.mutate()}
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-brand-dk transition hover:bg-brand/10 disabled:opacity-50"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  {markAll.isPending ? "Marquage…" : "Tout marquer comme lu"}
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
              )
            }
          >
            {items.length ? (
              <ul className="max-h-[50vh] divide-y divide-brand/8 overflow-y-auto">
                {items.map((it) => {
                  const expanded = expandedId === it.id;
                  return (
                    <li
                      key={it.id}
                      className={cn(it.lu && "opacity-55 saturate-50")}
                    >
                      <div className="flex items-start gap-1 px-1 py-1">
                        <button
                          type="button"
                          onClick={() => openItem(it)}
                          className="min-w-0 flex-1 rounded-xl px-3 py-2 text-start transition hover:bg-brand/5"
                        >
                          <span className="flex items-center justify-between gap-2">
                            <span className="flex min-w-0 items-center gap-1.5">
                              {!it.lu ? (
                                <span className="h-2 w-2 shrink-0 rounded-full bg-med" aria-hidden />
                              ) : null}
                              <span className="truncate text-sm font-semibold text-foreground">
                                {it.title}
                              </span>
                            </span>
                            <span className={cn(toneBadge(it.tone), "shrink-0")}>{it.label}</span>
                          </span>
                          <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                            {it.sub}
                          </span>
                          <span className="text-[10px] text-muted-foreground/70">{it.date}</span>
                          {expanded && isStudent ? (
                            <span className="mt-2 block space-y-1.5 rounded-xl bg-muted/50 p-3">
                              {it.detail ? (
                                <span className="block text-xs text-foreground">{it.detail}</span>
                              ) : null}
                              {it.sub ? (
                                <span className="block text-xs text-muted-foreground">
                                  Réponse : {it.sub}
                                </span>
                              ) : null}
                            </span>
                          ) : null}
                        </button>
                        {isStudent ? (
                          <button
                            type="button"
                            onClick={() => hideOne.mutate(it.id)}
                            aria-label={`Effacer « ${it.title} »`}
                            title="Effacer"
                            className="mt-1.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg text-muted-foreground transition hover:bg-alert/10 hover:text-alert-dk"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                Aucune notification — tout est à jour.
              </p>
            )}
          </DetailShell>
        </DialogContent>
      </Dialog>
    </>
  );
}
