import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ClipboardCheck, Check, X } from "lucide-react";
import { useIstpm } from "@/lib/istpm-store";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { DetailShell } from "@/components/dash-page";
import {
  dialogSurface,
  primaryPill,
  ghostPill,
  toneBadge,
  avatarChip,
  initials,
} from "@/lib/dash-ui";
import { fmtDate, type Seance } from "@/lib/istpm-data";
import { cn } from "@/lib/utils";

type Ligne = { present: boolean; justifie: boolean };

/**
 * Appel en séance : qui est présent ? Les présences vivent en base
 * (`attendance`), jamais en local. La session s'ouvre à la première
 * sauvegarde et se clôt explicitement.
 */
export function AppelSeanceDialog({
  seance,
  onClose,
}: {
  seance: Seance;
  onClose: () => void;
}) {
  const { etudiants, openSession, fetchSession, closeSession, fetchPresences, savePresences } = useIstpm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [lignes, setLignes] = useState<Record<string, Ligne>>({});

  const eleves = useMemo(
    () =>
      etudiants.filter(
        (e) =>
          !e.archived &&
          (!seance.filiere || e.filiere === seance.filiere) &&
          (!seance.groupe ||
            e.groupe === seance.groupe ||
            seance.groupe === `${e.niveau}-${e.groupe}` ||
            seance.groupe.endsWith(`-${e.groupe}`)),
      ),
    [etudiants, seance.filiere, seance.groupe],
  );

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const rows = await fetchPresences(seance.id);
        if (!alive) return;
        const map: Record<string, Ligne> = {};
        for (const r of rows) {
          map[r.etudiantId] = { present: r.present, justifie: r.justifie ?? false };
        }
        setLignes(map);
      } catch {
        // Pas encore d'appel saisi : tout le monde présent par défaut.
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seance.id]);

  const ligneDe = (id: string): Ligne => lignes[id] ?? { present: true, justifie: false };
  const presents = eleves.filter((e) => ligneDe(e.id).present).length;

  const enregistrer = async (clore: boolean) => {
    setSaving(true);
    try {
      let sid = sessionId;
      if (!sid) {
        try {
          sid = (await openSession(seance.id)).id;
        } catch (err) {
          // Session déjà ouverte par ailleurs : on reprend son appel.
          if (!(err instanceof Error) || !/déjà ouverte/i.test(err.message)) throw err;
          const existing = await fetchSession(seance.id);
          if (existing) {
            setSessionId(existing.id);
            sid = existing.id;
          }
          const rows = await fetchPresences(seance.id);
          const map: Record<string, Ligne> = {};
          for (const r of rows) map[r.etudiantId] = { present: r.present, justifie: r.justifie ?? false };
          setLignes((p) => ({ ...map, ...p }));
          toast.success("Appel existant repris");
          return;
        }
        setSessionId(sid);
      }
      await savePresences(
        seance.id,
        eleves.map((e) => ({ etudiantId: e.id, ...ligneDe(e.id), note: "" })),
      );
      if (clore && sid) {
        await closeSession(sid);
        toast.success("Appel enregistré et clôturé");
        onClose();
      } else {
        toast.success("Appel enregistré");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Enregistrement impossible");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className={dialogSurface}>
        <DialogTitle className="sr-only">Appel — {seance.module}</DialogTitle>
        <DialogDescription className="sr-only">
          Marquer les présents et absents de la séance
        </DialogDescription>
        <DetailShell
          icon={<ClipboardCheck className="h-5 w-5" />}
          title={`Appel — ${seance.module}`}
          subtitle={`${fmtDate(seance.date)} · ${seance.debut}–${seance.fin} · ${seance.groupe || "tous groupes"}`}
          badges={
            <span className={toneBadge("teal")}>
              {presents}/{eleves.length} présent(s)
            </span>
          }
          footer={
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                className={cn(ghostPill, "gap-1.5")}
                disabled={saving || loading}
                onClick={() => void enregistrer(false)}
              >
                Enregistrer
              </button>
              <button
                type="button"
                className={cn(primaryPill, "gap-1.5")}
                disabled={saving || loading}
                onClick={() => void enregistrer(true)}
              >
                <Check className="h-4 w-4" /> Enregistrer et clôturer
              </button>
            </div>
          }
        >
          {loading ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Chargement de l'appel…</p>
          ) : eleves.length === 0 ? (
            <p className="rounded-2xl border border-brand/12 bg-muted/40 px-4 py-6 text-center text-sm text-muted-foreground">
              Aucun étudiant dans ce groupe.
            </p>
          ) : (
            <ul className="max-h-[46vh] space-y-1.5 overflow-y-auto pe-1">
              {eleves.map((e) => {
                const l = ligneDe(e.id);
                return (
                  <li
                    key={e.id}
                    className="flex items-center gap-2.5 rounded-2xl border border-brand/12 px-3 py-2"
                  >
                    <span className={avatarChip}>{initials(`${e.prenom} ${e.nom}`)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-foreground">
                        {e.prenom} {e.nom}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {e.cne} · {e.groupe || e.niveau}
                      </span>
                    </span>
                    <button
                      type="button"
                      title="Justifié"
                      aria-pressed={l.justifie}
                      onClick={() => setLignes((p) => ({ ...p, [e.id]: { ...ligneDe(e.id), justifie: !l.justifie } }))}
                      className={cn(
                        "rounded-full px-2 py-1 text-[10px] font-semibold uppercase transition",
                        l.justifie ? "bg-blue-100 text-blue-800" : "text-muted-foreground hover:bg-brand/10",
                      )}
                    >
                      Justif.
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setLignes((p) => ({ ...p, [e.id]: { present: !l.present, justifie: l.justifie } }))
                      }
                      aria-label={l.present ? `Marquer absent : ${e.prenom} ${e.nom}` : `Marquer présent : ${e.prenom} ${e.nom}`}
                      className={cn(
                        "grid h-8 w-8 place-items-center rounded-xl transition",
                        l.present
                          ? "bg-brand/15 text-brand-dk hover:bg-brand/25"
                          : "bg-alert/15 text-alert hover:bg-alert/25",
                      )}
                    >
                      {l.present ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </DetailShell>
      </DialogContent>
    </Dialog>
  );
}
