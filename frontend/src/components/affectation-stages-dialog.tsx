import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Users,
  Shuffle,
  ArrowLeft,
  ArrowRight,
  Check,
  RotateCcw,
} from "lucide-react";
import {
  ANNEES_ETUDE,
  FILIERES,
  anneeEtude,
  type Etudiant,
  type Stage,
  type StructureAccueil,
  type AnneeEtude,
  type Filiere,
} from "@/lib/istpm-data";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { DetailShell } from "@/components/dash-page";
import { SelectField } from "@/components/dash-form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  dialogSurfaceWide,
  primaryPill,
  ghostPill,
  toneBadge,
  initials,
  softSelectTrigger,
  softSelectContent,
} from "@/lib/dash-ui";
import { cn } from "@/lib/utils";

export type Affectation = { etudiant: Etudiant; structure: string };

/**
 * Affectation groupée des étudiants aux structures d'accueil.
 *
 * Parcours en quatre étapes : année → filière → groupe → liste des étudiants
 * non encore affectés à un stage. Chaque étudiant peut être rattaché
 * individuellement à une structure (dans la limite de sa capacité), ou tout le
 * monde peut être réparti d'un coup via « Aléatoire ». La création effective des
 * stages est déléguée au parent (`onConfirm`).
 */
export function AffectationStagesDialog({
  open,
  onOpenChange,
  etudiants,
  stages,
  structuresAccueil,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  etudiants: Etudiant[];
  stages: Stage[];
  structuresAccueil: StructureAccueil[];
  onConfirm: (affectations: Affectation[]) => void;
}) {
  const structs = useMemo(
    () =>
      structuresAccueil.map((s) =>
        typeof s === "string" ? { nom: s, capacite: 5 } : s,
      ),
    [structuresAccueil],
  );

  const [step, setStep] = useState(0);
  const [annee, setAnnee] = useState<AnneeEtude | "">("");
  const [filiere, setFiliere] = useState<Filiere | "">("");
  const [groupe, setGroupe] = useState<string>("");
  // étudiantId → nom de structure choisie ("" = pas encore affecté).
  const [assign, setAssign] = useState<Record<string, string>>({});

  // Un étudiant est « déjà affecté » s'il a un stage non clôturé (statut ≠ validé).
  const idsAvecStage = useMemo(
    () =>
      new Set(
        stages.filter((s) => s.statut !== "valide").map((s) => s.etudiantId),
      ),
    [stages],
  );

  // Occupation de base de chaque structure = stages actifs déjà enregistrés.
  const occupationBase = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of stages) {
      if (s.statut === "valide") continue;
      map.set(s.structure, (map.get(s.structure) ?? 0) + 1);
    }
    return map;
  }, [stages]);

  // Groupes disponibles pour l'année + filière choisies.
  const groupesDisponibles = useMemo(() => {
    if (!annee || !filiere) return [];
    const set = new Set<string>();
    for (const e of etudiants) {
      if (anneeEtude(e.niveau) === annee && e.filiere === filiere && e.groupe) {
        set.add(e.groupe);
      }
    }
    return [...set].sort();
  }, [etudiants, annee, filiere]);

  // Étudiants non encore affectés correspondant à année + filière + groupe.
  const etudiantsNonAffectes = useMemo(() => {
    if (!annee || !filiere || !groupe) return [];
    return etudiants
      .filter(
        (e) =>
          anneeEtude(e.niveau) === annee &&
          e.filiere === filiere &&
          e.groupe === groupe &&
          !idsAvecStage.has(e.id),
      )
      .sort((a, b) => `${a.nom} ${a.prenom}`.localeCompare(`${b.nom} ${b.prenom}`));
  }, [etudiants, annee, filiere, groupe, idsAvecStage]);

  /** Places restantes d'une structure, en tenant compte des choix en cours
   *  (hors l'étudiant courant, dont on veut conserver l'option sélectionnée). */
  const placesRestantes = (structure: string, exceptId?: string) => {
    const cap =
      structs.find((s) => s.nom === structure)?.capacite ?? 0;
    const enCours = Object.entries(assign).filter(
      ([id, str]) => str === structure && id !== exceptId,
    ).length;
    return cap - (occupationBase.get(structure) ?? 0) - enCours;
  };

  const optionsStructure = (etudiantId: string) =>
    structs
      .map((s) => ({ nom: s.nom, reste: placesRestantes(s.nom, etudiantId) }))
      .filter((o) => o.reste > 0 || assign[etudiantId] === o.nom)
      .map((o) => ({
        value: o.nom,
        label: `${o.nom} · ${o.reste} place${o.reste > 1 ? "s" : ""}`,
      }));

  const nbAffectes = etudiantsNonAffectes.filter((e) => assign[e.id]).length;

  const handleAleatoire = () => {
    // Places restantes réelles au départ (occupation de base + choix manuels).
    const reste = new Map<string, number>();
    for (const s of structs) {
      reste.set(s.nom, s.capacite - (occupationBase.get(s.nom) ?? 0));
    }
    for (const str of Object.values(assign)) {
      if (str) reste.set(str, (reste.get(str) ?? 0) - 1);
    }
    const noms = structs.map((s) => s.nom);
    const next = { ...assign };
    let places = 0;
    let sansPlace = 0;
    for (const e of etudiantsNonAffectes) {
      if (next[e.id]) continue; // conserver les choix manuels
      const dispo = noms.filter((n) => (reste.get(n) ?? 0) > 0);
      if (!dispo.length) {
        sansPlace++;
        continue;
      }
      const pick = dispo[Math.floor(Math.random() * dispo.length)];
      next[e.id] = pick;
      reste.set(pick, (reste.get(pick) ?? 0) - 1);
      places++;
    }
    setAssign(next);
    toast.success(
      `${places} étudiant(s) affecté(s) aléatoirement${
        sansPlace ? ` · ${sansPlace} sans place disponible` : ""
      }`,
    );
  };

  const handleConfirm = () => {
    const affectations: Affectation[] = etudiantsNonAffectes
      .filter((e) => assign[e.id])
      .map((e) => ({ etudiant: e, structure: assign[e.id] }));
    if (!affectations.length) {
      toast.error("Aucune affectation sélectionnée");
      return;
    }
    onConfirm(affectations);
    onOpenChange(false);
  };

  const totalCapacite = structs.reduce((s, x) => s + x.capacite, 0);
  const placesLibres =
    totalCapacite -
    [...occupationBase.values()].reduce((s, n) => s + n, 0) -
    Object.values(assign).filter(Boolean).length;

  const peutSuivant =
    (step === 0 && annee) ||
    (step === 1 && filiere) ||
    (step === 2 && groupe);

  const titres = [
    "Choisir l'année",
    "Choisir la filière",
    "Choisir le groupe",
    "Affecter les étudiants",
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={dialogSurfaceWide}>
        <DialogTitle className="sr-only">Affecter les étudiants aux stages</DialogTitle>
        <DialogDescription className="sr-only">
          Affectation groupée des étudiants aux structures d'accueil
        </DialogDescription>
        <DetailShell
          icon={<Users className="h-5 w-5" />}
          title="Affecter les étudiants"
          subtitle={`Étape ${step + 1}/4 · ${titres[step]}`}
          badges={
            <>
              {annee ? <span className={toneBadge("teal")}>{annee}</span> : null}
              {filiere ? <span className={toneBadge("teal")}>{filiere}</span> : null}
              {groupe ? <span className={toneBadge("teal")}>Groupe {groupe}</span> : null}
            </>
          }
          footer={
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                className={cn(ghostPill, "gap-1.5", step === 0 && "invisible")}
                onClick={() => setStep((s) => Math.max(0, s - 1))}
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Retour
              </button>
              {step < 3 ? (
                <button
                  type="button"
                  className={cn(primaryPill, !peutSuivant && "pointer-events-none opacity-50")}
                  onClick={() => peutSuivant && setStep((s) => s + 1)}
                >
                  Suivant <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="button"
                  className={cn(primaryPill, nbAffectes === 0 && "pointer-events-none opacity-50")}
                  onClick={handleConfirm}
                >
                  <Check className="h-4 w-4" /> Confirmer ({nbAffectes})
                </button>
              )}
            </div>
          }
        >
          {step === 0 ? (
            <SelectField
              label="Année d'étude"
              required
              value={annee}
              onChange={(v) => {
                setAnnee(v);
                setFiliere("");
                setGroupe("");
                setAssign({});
              }}
              options={ANNEES_ETUDE}
              placeholder="Choisir une année…"
            />
          ) : null}

          {step === 1 ? (
            <SelectField
              label="Filière"
              required
              value={filiere}
              onChange={(v) => {
                setFiliere(v);
                setGroupe("");
                setAssign({});
              }}
              options={FILIERES}
              placeholder="Choisir une filière…"
            />
          ) : null}

          {step === 2 ? (
            groupesDisponibles.length ? (
              <SelectField
                label="Groupe"
                required
                value={groupe}
                onChange={(v) => {
                  setGroupe(v);
                  setAssign({});
                }}
                options={groupesDisponibles}
                placeholder="Choisir un groupe…"
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                Aucun groupe pour {annee} · {filiere}.
              </p>
            )
          ) : null}

          {step === 3 ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">
                  <strong className="font-semibold text-foreground">
                    {etudiantsNonAffectes.length}
                  </strong>{" "}
                  étudiant(s) sans stage · {placesLibres} place(s) libre(s)
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className={cn(ghostPill, "gap-1.5")}
                    onClick={() => setAssign({})}
                  >
                    <RotateCcw className="h-3.5 w-3.5" /> Réinitialiser
                  </button>
                  <button
                    type="button"
                    className={cn(ghostPill, "gap-1.5")}
                    onClick={handleAleatoire}
                    disabled={etudiantsNonAffectes.length === 0}
                  >
                    <Shuffle className="h-3.5 w-3.5" /> Aléatoire
                  </button>
                </div>
              </div>

              {etudiantsNonAffectes.length ? (
                <ul className="space-y-2">
                  {etudiantsNonAffectes.map((e) => (
                    <li
                      key={e.id}
                      className="flex flex-col gap-2 rounded-2xl border border-brand/12 px-3 py-2.5 sm:flex-row sm:items-center sm:gap-3"
                    >
                      <span className="flex min-w-0 flex-1 items-center gap-2.5">
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand/10 text-[11px] font-bold text-brand-dk">
                          {initials(`${e.prenom} ${e.nom}`)}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-foreground">
                            {e.prenom} {e.nom}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {e.cne} · {e.niveau}
                          </span>
                        </span>
                      </span>
                      <span className="w-full sm:w-64">
                        <Select
                          value={assign[e.id] || undefined}
                          onValueChange={(v) =>
                            setAssign((prev) => ({ ...prev, [e.id]: v }))
                          }
                        >
                          <SelectTrigger
                            className={cn(softSelectTrigger, "w-full")}
                            aria-label={`Structure pour ${e.prenom} ${e.nom}`}
                          >
                            <SelectValue placeholder="À affecter…" />
                          </SelectTrigger>
                          <SelectContent className={softSelectContent}>
                            {optionsStructure(e.id).map((o) => (
                              <SelectItem key={o.value} value={o.value}>
                                {o.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="rounded-2xl border border-brand/12 bg-muted/40 px-4 py-6 text-center text-sm text-muted-foreground">
                  Tous les étudiants de ce groupe ont déjà un stage.
                </p>
              )}
            </div>
          ) : null}
        </DetailShell>
      </DialogContent>
    </Dialog>
  );
}
