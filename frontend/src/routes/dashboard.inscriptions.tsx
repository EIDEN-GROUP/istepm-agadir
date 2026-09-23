import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, Inbox, MailCheck } from "lucide-react";
import { toast } from "sonner";
import { PersonAvatar } from "@/components/person-avatar";
import { PageHeader, DataTable } from "@/components/dash-page";
import { usePagination, TablePagination } from "@/components/table-pagination";
import { FormDialog, FullWidth, TextField } from "@/components/dash-form";
import { softCard, eyebrowClass, toneBadge, tableRow, cellTruncate } from "@/lib/dash-ui";
import { cn } from "@/lib/utils";
import {
  fetchInscriptions,
  updateInscription,
  createRendezVous,
  type InscriptionRequest,
  type StatutInscription,
} from "@/lib/istpm-api";

const STATUT_LABEL: Record<StatutInscription, string> = {
  en_attente: "En attente",
  en_cours: "En cours",
  traite: "Traitée",
  rejete: "Rejetée",
};

const STATUT_TONE = {
  en_attente: "amber",
  en_cours: "blue",
  traite: "teal",
  rejete: "red",
} as const;

const FILTRES: [string, string][] = [
  ["en_attente", "En attente"],
  ["en_cours", "En cours"],
  ["traite", "Traitées"],
  ["rejete", "Rejetées"],
  ["", "Toutes"],
];

const fmtCourt = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("fr-FR");
};

function InscriptionsPage() {
  const qc = useQueryClient();
  const [filtre, setFiltre] = useState("en_attente");
  const [search, setSearch] = useState("");
  const [action, setAction] = useState<InscriptionRequest | null>(null);
  const [pending, setPending] = useState(false);

  const query = useQuery({
    queryKey: ["inscriptions"],
    queryFn: () => fetchInscriptions(),
    refetchInterval: 60_000,
  });
  const rows = useMemo(() => query.data ?? [], [query.data]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (filtre && r.statut !== filtre) return false;
      if (!q) return true;
      return `${r.prenom} ${r.nom} ${r.email} ${r.telephone} ${r.filiere} ${r.niveau}`
        .toLowerCase()
        .includes(q);
    });
  }, [rows, filtre, search]);
  const nbAttente = rows.filter((r) => r.statut === "en_attente").length;
  const pager = usePagination(filtered, `${filtre}|${search}`);

  const refresh = () => qc.invalidateQueries({ queryKey: ["inscriptions"] });

  const repondre = async (id: string, statut: StatutInscription, reponse: string) => {
    setPending(true);
    try {
      await updateInscription(id, { statut, reponse });
      toast.success("Réponse envoyée au candidat.");
      setAction(null);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Envoi impossible");
    } finally {
      setPending(false);
    }
  };

  const fixerRdv = async (id: string, date: string, heure: string, message: string) => {
    setPending(true);
    try {
      await createRendezVous(id, { date, heure, message });
      toast.success("Rendez-vous proposé au candidat.");
      setAction(null);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Envoi impossible");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Affaires estudiantines"
        title="Demandes d'inscription"
      />

      <section className={cn(softCard, "space-y-4 p-4 sm:p-5")}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Inbox className="h-4 w-4 text-brand-dk" />
            <p className={eyebrowClass}>
              Landing page
              {nbAttente > 0 ? (
                <span className="ms-2 rounded-full bg-warn-pale px-2 py-0.5 text-[10px] font-bold text-warn">
                  {nbAttente} en attente
                </span>
              ) : null}
            </p>
          </div>
          <div className="flex items-center gap-1 rounded-full border border-brand/12 bg-muted/60 p-1">
            {FILTRES.map(([v, label]) => (
              <button
                key={v || "all"}
                type="button"
                onClick={() => setFiltre(v)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-[11px] font-semibold transition-colors",
                  filtre === v
                    ? "bg-brand text-white"
                    : "text-muted-foreground hover:text-brand-dk",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="relative">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher nom, e-mail, filière…"
            className="h-10 w-full rounded-xl border border-brand/15 bg-card px-3 text-sm text-foreground outline-none transition-colors focus:border-brand/40"
          />
        </div>

        <DataTable
          minWidth="min-w-[980px]"
          isEmpty={!query.isLoading && filtered.length === 0}
          empty={query.isLoading ? "Chargement…" : "Aucune demande dans cette catégorie."}
          footer={
            <TablePagination
              page={pager.page}
              pageCount={pager.pageCount}
              total={pager.total}
              pageSize={pager.pageSize}
              onPage={pager.setPage}
              label="demande(s)"
            />
          }
          head={
            <>
              <th>Candidat</th>
              <th>Filière · Niveau</th>
              <th>Statut</th>
              <th>Rendez-vous</th>
              <th>Date</th>
              <th className="w-32 text-center">Action</th>
            </>
          }
        >
          {pager.pageItems.map((d) => {
            const nom = `${d.prenom} ${d.nom}`.trim() || "Candidat";
            return (
              <tr key={d.id} className={tableRow} onClick={() => setAction(d)}>
                <td>
                  <span className="flex items-center gap-2.5">
                    <PersonAvatar name={nom} photoUrl={null} />
                    <span className="min-w-0">
                      <span className={cn("block font-medium", cellTruncate)}>{nom}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {[d.email, d.telephone].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                  </span>
                </td>
                <td>
                  <span className="block font-medium">{d.filiere}</span>
                  <span className="block text-xs text-muted-foreground">{d.niveau}</span>
                </td>
                <td>
                  <span className={toneBadge(STATUT_TONE[d.statut])}>
                    {STATUT_LABEL[d.statut]}
                  </span>
                </td>
                <td className="text-xs text-muted-foreground">
                  {d.rendezVous ? (
                    <span className="inline-flex items-center gap-1 font-medium text-brand-dk">
                      <CalendarClock className="h-3.5 w-3.5" />
                      {d.rendezVous.date}
                      {d.rendezVous.heure ? ` à ${d.rendezVous.heure}` : ""}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="whitespace-nowrap text-xs text-muted-foreground">
                  {fmtCourt(d.createdAt)}
                </td>
                <td className="text-center" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => setAction(d)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-brand/20 bg-card px-3 py-1.5 text-[11px] font-semibold text-brand-dk transition-colors hover:bg-brand/5"
                  >
                    <MailCheck className="h-3.5 w-3.5" />
                    Traiter
                  </button>
                </td>
              </tr>
            );
          })}
        </DataTable>
      </section>

      {action ? (
        <ActionModal
          demande={action}
          pending={pending}
          onClose={() => setAction(null)}
          onRepondre={repondre}
          onRdv={fixerRdv}
        />
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Modale d'action : Répondre | Rendez-vous                           */
/* ------------------------------------------------------------------ */

function ActionModal({
  demande,
  pending,
  onClose,
  onRepondre,
  onRdv,
}: {
  demande: InscriptionRequest;
  pending: boolean;
  onClose: () => void;
  onRepondre: (id: string, statut: StatutInscription, reponse: string) => void;
  onRdv: (id: string, date: string, heure: string, message: string) => void;
}) {
  const [mode, setMode] = useState<"repondre" | "rdv">("repondre");
  const [statut, setStatut] = useState<StatutInscription>("traite");
  const [reponse, setReponse] = useState("");
  const [date, setDate] = useState("");
  const [heure, setHeure] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | undefined>(undefined);

  const demandeId = demande.id;
  useEffect(() => {
    setMode("repondre");
    setStatut("traite");
    setReponse("");
    setDate("");
    setHeure("");
    setMessage("");
    setError(undefined);
  }, [demandeId]);

  const submit = () => {
    if (mode === "repondre") {
      if (statut === "rejete" && reponse.trim().length < 3) {
        setError("Un motif de refus est requis (3 caractères min)");
        toast.error("Indiquez le motif du refus");
        return;
      }
      onRepondre(demande.id, statut, reponse.trim());
    } else {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        setError("Choisissez une date de rendez-vous");
        return;
      }
      if (heure && !/^([01]\d|2[0-3]):[0-5]\d$/.test(heure)) {
        setError("Heure invalide (HH:MM)");
        return;
      }
      onRdv(demande.id, date, heure, message.trim());
    }
  };

  return (
    <FormDialog
      open
      onOpenChange={(o) => !o && onClose()}
      wide
      title={mode === "rdv" ? "Proposer un rendez-vous" : "Répondre au candidat"}
      subtitle={`${demande.prenom} ${demande.nom} · ${demande.filiere}`}
      submitLabel={pending ? "Envoi…" : "Confirmer et notifier"}
      onSubmit={submit}
      busy={pending}
    >
      <FullWidth>
        <div className="rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground">
          <p className="mb-1.5 flex items-center gap-2">
            <PersonAvatar name={`${demande.prenom} ${demande.nom}`} photoUrl={null} size="xs" />
            <span className="font-semibold text-foreground">
              {demande.prenom} {demande.nom}
            </span>
            <span>
              {[demande.email, demande.telephone].filter(Boolean).join(" · ")}
            </span>
          </p>
          <p className="font-semibold text-foreground">
            {demande.filiere} · {demande.niveau}
          </p>
          {demande.message ? <p className="mt-1">{demande.message}</p> : null}
          <p className="mt-1">Reçue le {fmtCourt(demande.createdAt)}</p>
        </div>
      </FullWidth>
      <FullWidth>
        <div className="flex items-center gap-1 rounded-full border border-brand/12 bg-muted/60 p-1">
          {(
            [
              ["repondre", "Répondre"],
              ["rdv", "Rendez-vous"],
            ] as const
          ).map(([v, label]) => (
            <button
              key={v}
              type="button"
              onClick={() => setMode(v)}
              className={cn(
                "flex-1 rounded-full px-3 py-1.5 text-[11px] font-semibold transition-colors",
                mode === v
                  ? "bg-brand text-white"
                  : "text-muted-foreground hover:text-brand-dk",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </FullWidth>
      {mode === "repondre" ? (
        <>
          <FullWidth>
            <div className="flex items-center gap-1 rounded-full border border-brand/12 bg-muted/60 p-1">
              {(
                [
                  ["traite", "Retenir"],
                  ["en_cours", "En cours"],
                  ["rejete", "Rejeter"],
                ] as const
              ).map(([v, label]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setStatut(v)}
                  className={cn(
                    "flex-1 rounded-full px-3 py-1.5 text-[11px] font-semibold transition-colors",
                    statut === v
                      ? v === "rejete"
                        ? "bg-alert text-white"
                        : "bg-brand text-white"
                      : "text-muted-foreground hover:text-brand-dk",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </FullWidth>
          <FullWidth>
            <div className="space-y-1.5">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Réponse au candidat{" "}
                {statut === "rejete" ? <span className="ml-0.5 text-alert">*</span> : "(optionnel)"}
              </span>
              <textarea
                value={reponse}
                onChange={(e) => setReponse(e.target.value)}
                rows={4}
                placeholder="Votre message sera envoyé par e-mail…"
                className="w-full rounded-xl border border-brand/15 bg-card px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-brand/40"
              />
              {error ? <p className="text-xs font-medium text-alert">{error}</p> : null}
            </div>
          </FullWidth>
        </>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label="Date"
              type="date"
              required
              value={date}
              onChange={setDate}
            />
            <TextField
              label="Heure"
              type="time"
              value={heure}
              onChange={setHeure}
            />
          </div>
          <FullWidth>
            <div className="space-y-1.5">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Message (optionnel)
              </span>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                placeholder="Lieu, personne à demander, pièces à apporter…"
                className="w-full rounded-xl border border-brand/15 bg-card px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-brand/40"
              />
              {error ? <p className="text-xs font-medium text-alert">{error}</p> : null}
            </div>
          </FullWidth>
        </>
      )}
    </FormDialog>
  );
}

export const Route = createFileRoute("/dashboard/inscriptions")({
  component: InscriptionsPage,
});
