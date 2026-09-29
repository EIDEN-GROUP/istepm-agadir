import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Download, Eye, FileText, Trash2, Upload, XCircle } from "lucide-react";
import { toast } from "sonner";
import type { Seance } from "@/lib/istpm-data";
import { STATUT_SEANCE_LABEL, statutSeanceTone } from "@/lib/istpm-data";
import { downloadSeanceDocumentApi, previewSeanceDocumentApi } from "@/lib/istpm-api";
import { ghostPill, primaryPill, toneBadge, dialogSurfaceWide, softInput } from "@/lib/dash-ui";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

/* ------------------------------------------------------------------ */
/*  Badge de statut de séance                                           */
/* ------------------------------------------------------------------ */

export function SeanceStatutBadge({ statut }: { statut: string }) {
  return (
    <span className={toneBadge(statutSeanceTone(statut))}>
      {STATUT_SEANCE_LABEL[statut] ?? statut}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Aperçu du compte-rendu (iframe PDF, comme les sujets d'examen)      */
/* ------------------------------------------------------------------ */

export function SeanceDocPreview({
  seance,
  onClose,
}: {
  seance: { id: string; documentNom?: string | null; documentMime?: string | null } | null;
  onClose: () => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "missing">("loading");
  const docNom = seance?.documentNom ?? null;
  const docMime = seance?.documentMime ?? null;
  const seanceId = seance?.id;

  useEffect(() => {
    if (!docNom || !seanceId) return;
    let cancelled = false;
    let created: string | null = null;
    setState("loading");
    previewSeanceDocumentApi(seanceId).then((u) => {
      if (cancelled) {
        if (u) URL.revokeObjectURL(u);
        return;
      }
      if (u) {
        created = u;
        setUrl(u);
        setState("ready");
      } else {
        setState("missing");
      }
    });
    return () => {
      cancelled = true;
      if (created) URL.revokeObjectURL(created);
      setUrl(null);
    };
  }, [docNom, seanceId]);

  const isPdf = docMime === "application/pdf";

  const telecharger = async () => {
    if (!seance || !docNom) return;
    try {
      await downloadSeanceDocumentApi(seance.id, docNom);
      toast.success(`Téléchargement   ${docNom}`);
    } catch {
      toast.error("Téléchargement impossible depuis le serveur");
    }
  };

  return (
    <Dialog open={!!seance} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className={cn(
          dialogSurfaceWide,
          "h-[min(92vh,900px)] max-h-[min(92vh,900px)] w-[min(100vw_-_1.5rem,880px)] max-w-[min(100vw_-_1.5rem,880px)]",
        )}
      >
        <DialogTitle className="sr-only">Aperçu du compte-rendu</DialogTitle>
        <DialogDescription className="sr-only">
          Compte-rendu de séance déposé
        </DialogDescription>
        {seance && docNom ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <header className="flex items-start gap-3.5 border-b border-brand/12 px-5 py-4 pr-14">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand/10 text-brand-dk">
                <FileText className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">{docNom}</p>
                <p className="text-xs text-muted-foreground">Compte-rendu de séance</p>
              </div>
              <button type="button" onClick={telecharger} className={cn(ghostPill, "h-8 gap-1.5 px-3 text-xs")}>
                <Download className="h-3.5 w-3.5" /> Télécharger
              </button>
            </header>
            <div className="min-h-0 flex-1 overflow-hidden bg-muted/40">
              {state === "loading" ? (
                <p className="px-5 py-10 text-center text-sm text-muted-foreground">Chargement de l'aperçu…</p>
              ) : state === "missing" || !url ? (
                <p className="px-5 py-10 text-center text-sm text-muted-foreground">Aperçu indisponible.</p>
              ) : isPdf ? (
                <iframe title={`Aperçu — ${docNom}`} src={url} className="h-full w-full" />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-3 px-5 py-10">
                  <FileText className="h-10 w-10 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Aperçu non disponible pour ce format.</p>
                  <button type="button" onClick={telecharger} className={cn(primaryPill, "gap-1.5")}>
                    <Download className="h-4 w-4" /> Télécharger le fichier
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/*  Section compte-rendu : dépôt (propriétaire) + fichier + aperçu      */
/* ------------------------------------------------------------------ */

const ACCEPTED = ".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export function SeanceDocumentSection({
  seance,
  canUpload,
  uploading,
  onUpload,
  onDelete,
  canDelete,
}: {
  seance: Seance;
  canUpload: boolean;
  uploading: boolean;
  onUpload: (file: File) => void;
  onDelete?: () => void;
  canDelete?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const hasDoc = !!seance.documentId;

  return (
    <div className="space-y-2.5">
      {hasDoc ? (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-brand/12 bg-card px-3 py-2.5">
          <FileText className="h-4 w-4 shrink-0 text-brand-dk" />
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
            {seance.documentNom ?? "Compte-rendu"}
          </span>
          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            className={cn(ghostPill, "h-7 gap-1 px-2.5 text-[11px]")}
          >
            <Eye className="h-3.5 w-3.5" /> Aperçu
          </button>
          {canDelete && onDelete ? (
            <button
              type="button"
              aria-label="Retirer le compte-rendu"
              onClick={onDelete}
              className="grid h-7 w-7 place-items-center rounded-full text-muted-foreground transition hover:bg-alert/20 hover:text-alert"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Aucun compte-rendu déposé pour cette séance.</p>
      )}
      {canUpload ? (
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED}
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) onUpload(f);
            }}
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className={cn(ghostPill, "h-8 gap-1.5 px-3 text-xs")}
          >
            <Upload className="h-3.5 w-3.5" />
            {uploading ? "Dépôt en cours…" : hasDoc ? "Remplacer (PDF/DOC)" : "Déposer (PDF/DOC)"}
          </button>
        </div>
      ) : null}
      {previewOpen && hasDoc ? (
        <SeanceDocPreview
          seance={{ id: seance.id, documentNom: seance.documentNom, documentMime: seance.documentMime }}
          onClose={() => setPreviewOpen(false)}
        />
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Actions du workflow (terminer / vu / confirmer / rejeter)           */
/* ------------------------------------------------------------------ */

export function SeanceValidationActions({
  seance,
  isDirection,
  isOwner,
  busy,
  onTerminer,
  onVu,
  onConfirmer,
  onRejeter,
}: {
  seance: Seance;
  isDirection: boolean;
  isOwner: boolean;
  busy: boolean;
  onTerminer: () => void;
  onVu: () => void;
  onConfirmer: () => void;
  onRejeter: (motif: string) => void;
}) {
  const [rejectOpen, setRejectOpen] = useState(false);
  const [motif, setMotif] = useState("");

  if (isDirection && seance.statut === "termine") {
    return (
      <div className="space-y-2.5">
        {!rejectOpen ? (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={onConfirmer}
              className={cn(primaryPill, "gap-1.5")}
            >
              <CheckCircle2 className="h-4 w-4" /> {busy ? "Envoi…" : "Confirmer"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setRejectOpen(true)}
              className="inline-flex items-center gap-2 rounded-full bg-alert px-5 py-2.5 text-sm font-bold text-white transition hover:bg-alert-dk disabled:opacity-60"
            >
              <XCircle className="h-4 w-4" /> Rejeter
            </button>
          </div>
        ) : (
          <div className="space-y-2 rounded-xl border border-alert/25 bg-alert/5 p-3">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground" htmlFor="motif-rejet">
              Motif du rejet *
            </label>
            <textarea
              id="motif-rejet"
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              rows={3}
              placeholder="Expliquez au formateur ce qui doit être repris…"
              className="w-full rounded-xl border border-brand/15 bg-card px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-brand/40"
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={busy || !motif.trim()}
                onClick={() => {
                  onRejeter(motif.trim());
                  setRejectOpen(false);
                  setMotif("");
                }}
                className="inline-flex items-center gap-2 rounded-full bg-alert px-5 py-2 text-xs font-bold text-white transition hover:bg-alert-dk disabled:opacity-60"
              >
                {busy ? "Envoi…" : "Confirmer le rejet"}
              </button>
              <button type="button" disabled={busy} onClick={() => { setRejectOpen(false); setMotif(""); }} className={cn(ghostPill, "h-8 px-3 text-xs")}>
                Annuler
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (isOwner && !isDirection && (seance.statut === "planifie" || seance.statut === "en_cours")) {
    const hasDoc = !!seance.documentId;
    return (
      <div className="space-y-1.5">
        <button
          type="button"
          disabled={busy || !hasDoc}
          onClick={onTerminer}
          title={hasDoc ? undefined : "Déposez le compte-rendu (PDF/DOC) avant de marquer la séance faite"}
          className={cn(primaryPill, "gap-1.5 disabled:opacity-60")}
        >
          <CheckCircle2 className="h-4 w-4" /> {busy ? "Envoi…" : "Marquer faite"}
        </button>
        {!hasDoc ? (
          <p className="text-[11px] text-muted-foreground">Déposez le compte-rendu ci-dessus pour activer ce bouton.</p>
        ) : null}
      </div>
    );
  }

  if (isOwner && !isDirection && seance.statut === "rejete") {
    return (
      <button
        type="button"
        disabled={busy}
        onClick={onVu}
        className={cn(ghostPill, "gap-1.5")}
      >
        <Eye className="h-3.5 w-3.5" /> {busy ? "Envoi…" : "Marquer comme vu"}
      </button>
    );
  }

  return null;
}
