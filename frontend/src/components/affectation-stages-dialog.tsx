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
  NIVEAUX,
  FILIERES,
  capaciteStructureNiveau,
  libelleNiveau,
  normalizeStructure,
  stageDisplayRows,
  fmtDate,
  type Etudiant,
  type Stage,
  type StructureAccueil,
  type Niveau,
  type Filiere,
} from "@/lib/istpm-data";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { DetailShell } from "@/components/dash-page";
import { SelectField, TextField } from "@/components/dash-form";
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

export type Affectation = { etudiant: Etudiant; structure: string; service: string; debut: string; fin: string };

/**
 * Affectation groupée des étudiants aux structures d'accueil.
 *
 * Parcours en cinq étapes : période (Début → Fin) → niveau → filière → groupe →
 * liste des étudiants non encore affectés à un stage. La période choisie en
 * premier est appliquée à tous les stages créés. Chaque étudiant peut être
 * rattaché individuellement à une structure (dans la limite de sa capacité),
 * ou tout le monde peut être réparti d'un coup via « Aléatoire ». La création
 * effective des stages est déléguée au parent (`onConfirm`).
 */
export function AffectationStagesDialog({
  open,
  onOpenChange,
  etudiants,
  stages,
  structuresAccueil,
  onCreateStructure,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  etudiants: Etudiant[];
  stages: Stage[];
  structuresAccueil: StructureAccueil[];
  /** Crée une structure libre (dropdown créable) puis la rend sélectionnable. */
  onCreateStructure?: (nom: string) => void;
  onConfirm: (affectations: Affectation[]) => void;
}) {
  const structs = useMemo(
    () => structuresAccueil.map((s) => normalizeStructure(s)),
    [structuresAccueil],
  );

  const [step, setStep] = useState(0);
  const [debut, setDebut] = useState("");
  const [fin, setFin] = useState("");
  const [niveau, setNiveau] = useState<Niveau | "">("");
  const [filiere, setFiliere] = useState<Filiere | "">("");
  const [groupe, setGroupe] = useState<string>("");
  // étudiantId → nom de structure choisie ("" = pas encore affecté).
  const [assign, setAssign] = useState<Record<string, string>>({});
  // étudiantId → stage (service) et sous-stage choisis.
  const [assignService, setAssignService] = useState<Record<string, string>>({});
  const [assignSub, setAssignSub] = useState<Record<string, string>>({});
  const [nouvelleStructure, setNouvelleStructure] = useState("");

  const dateError =
    debut && fin && fin < debut ? "La fin doit suivre le début" : undefined;

  // Un étudiant est « déjà affecté » s'il a un stage non clôturé (statut ≠ validé).
  const idsAvecStage = useMemo(
    () =>
      new Set(
        stages.filter((s) => s.statut !== "valide").map((s) => s.etudiantId),
      ),
    [stages],
  );

  // Occupation par (structure, niveau choisi) : seuls les stages actifs du
  // même niveau consomment les places (les stages ne tracent pas le service,
  // les places restent fongibles au sein de la structure pour un niveau).
  const occupationNiveau = useMemo(() => {
    const map = new Map<string, number>();
    if (!niveau) return map;
    for (const s of stages) {
      if (s.statut === "valide") continue;
      if (libelleNiveau(s.niveau) !== libelleNiveau(niveau)) continue;
      map.set(s.structure, (map.get(s.structure) ?? 0) + 1);
    }
    return map;
  }, [stages, niveau]);

  // Groupes disponibles pour l'année + filière choisies.
  const filieresOptions = useMemo(() => {
    const set = new Set<string>();
    for (const e of etudiants) if (e.filiere) set.add(e.filiere);
    for (const f of FILIERES) set.add(f);
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [etudiants]);  const groupesDisponibles = useMemo(() => {
    if (!niveau || !filiere) return [];
    const set = new Set<string>();
    for (const e of etudiants) {
      if (e.niveau === niveau && e.filiere === filiere && e.groupe) {
        set.add(e.groupe);
      }
    }
    return [...set].sort();
  }, [etudiants, niveau, filiere]);

  // Étudiants non encore affectés correspondant à niveau + filière + groupe.
  const etudiantsNonAffectes = useMemo(() => {
    if (!niveau || !filiere || !groupe) return [];
    return etudiants
      .filter(
        (e) =>
          e.niveau === niveau &&
          e.filiere === filiere &&
          e.groupe === groupe &&
          !idsAvecStage.has(e.id),
      )
      .sort((a, b) => `${a.nom} ${a.prenom}`.localeCompare(`${b.nom} ${b.prenom}`));
  }, [etudiants, niveau, filiere, groupe, idsAvecStage]);

  /** Places restantes d'une structure POUR LE NIVEAU CHOISI, en tenant compte
   *  des choix en cours (hors l'étudiant courant, dont on veut conserver
   *  l'option sélectionnée). */
  const placesRestantes = (structure: string, exceptId?: string) => {
    const st = structs.find((s) => s.nom === structure);
    const cap = st ? capaciteStructureNiveau(st, niveau) : 0;
    const enCours = Object.entries(assign).filter(
      ([id, str]) => str === structure && id !== exceptId,
    ).length;
    return cap - (occupationNiveau.get(structure) ?? 0) - enCours;
  };

  const optionsStructure = (etudiantId: string) =>
    structs
      .map((s) => ({ nom: s.nom, reste: placesRestantes(s.nom, etudiantId) }))
      .filter((o) => o.reste > 0 || assign[etudiantId] === o.nom)
      .map((o) => ({
        value: o.nom,
        label: `${o.nom} · ${o.reste} place${o.reste > 1 ? "s" : ""}`,
      }));

  /** Stages (services) de la structure choisie, pour (niveau, filière). */
  const stagesDe = (etudiantId: string) => {
    const st = structs.find((s) => s.nom === assign[etudiantId]);
    if (!st) return [];
    return st.stages
      .filter((t) => stageDisplayRows(t, niveau, filiere).length > 0)
      .map((t) => {
        const heures = stageDisplayRows(t, niveau, filiere).reduce((s, r) => s + r.heures, 0);
        return { value: t.nom, label: `${t.nom} · ${heures} h` };
      });
  };

  /** Sous-stages du service choisi (niveau courant). */
  const subsDe = (etudiantId: string) => {
    const st = structs.find((s) => s.nom === assign[etudiantId]);
    const t = st?.stages.find((x) => x.nom === assignService[etudiantId]);
    if (!st || !t) return [];
    return t.subStages
      .filter((d) => d.niveaux.some((nh) => !nh.niveau || nh.niveau === niveau))
      .map((d) => {
        const heures = d.niveaux
          .filter((nh) => !nh.niveau || nh.niveau === niveau)
          .reduce((s, nh) => s + nh.heures, 0);
        return { value: d.nom, label: `${d.nom} · ${heures} h` };
      });
  };

  const choisirStructure = (etudiantId: string, v: string) => {
    setAssign((prev) => ({ ...prev, [etudiantId]: v }));
    setAssignService((prev) => ({ ...prev, [etudiantId]: "" }));
    setAssignSub((prev) => ({ ...prev, [etudiantId]: "" }));
  };

  const choisirService = (etudiantId: string, v: string) => {
    setAssignService((prev) => ({ ...prev, [etudiantId]: v }));
    setAssignSub((prev) => ({ ...prev, [etudiantId]: "" }));
  };

  const nbAffectes = etudiantsNonAffectes.filter((e) => assign[e.id]).length;

  const handleAleatoire = () => {
    // Places restantes réelles au départ (occupation du niveau + choix manuels).
    const reste = new Map<string, number>();
    for (const s of structs) {
      reste.set(s.nom, capaciteStructureNiveau(s, niveau) - (occupationNiveau.get(s.nom) ?? 0));
    }
    for (const str of Object.values(assign)) {
      if (str) reste.set(str, (reste.get(str) ?? 0) - 1);
    }
    const noms = structs.map((s) => s.nom);
    const next = { ...assign };
    const nextService: Record<string, string> = { ...assignService };
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
      // Service tiré parmi ceux de la structure (même filtre que le select).
      const st = structs.find((s) => s.nom === pick);
      const services = (st?.stages ?? []).filter((t) => stageDisplayRows(t, niveau, filiere).length > 0);
      if (services.length) {
        nextService[e.id] = services[Math.floor(Math.random() * services.length)].nom;
      }
      reste.set(pick, (reste.get(pick) ?? 0) - 1);
      places++;
    }
    setAssign(next);
    setAssignService(nextService);
    toast.success(
      `${places} étudiant(s) affecté(s) aléatoirement${
        sansPlace ? ` · ${sansPlace} sans place disponible` : ""
      }`,
    );
  };

  const handleConfirm = () => {
    if (!debut || !fin || dateError) {
      toast.error("Indiquez d'abord la période du stage (Début → Fin)");
      setStep(0);
      return;
    }
    const sansService = etudiantsNonAffectes.filter((e) => assign[e.id] && !assignService[e.id]);
    if (sansService.length) {
      toast.error(`${sansService.length} étudiant(s) sans service : choisissez le service de chaque structure`);
      return;
    }
    const affectations: Affectation[] = etudiantsNonAffectes
      .filter((e) => assign[e.id] && assignService[e.id])
      .map((e) => {
        const service = assignService[e.id];
        const sub = assignSub[e.id];
        return {
          etudiant: e,
          structure: assign[e.id],
          service: sub ? `${service} › ${sub}` : service,
          debut,
          fin,
        };
      });
    if (!affectations.length) {
      toast.error("Aucune affectation sélectionnée");
      return;
    }
    onConfirm(affectations);
    onOpenChange(false);
  };

  const totalCapacite = structs.reduce((s, x) => s + capaciteStructureNiveau(x, niveau), 0);
  const placesLibres =
    totalCapacite -
    [...occupationNiveau.values()].reduce((s, n) => s + n, 0) -
    Object.values(assign).filter(Boolean).length;

  const peutSuivant =
    (step === 0 && debut && fin && !dateError) ||
    (step === 1 && niveau) ||
    (step === 2 && filiere) ||
    (step === 3 && groupe);

  const titres = [
    "Période du stage",
    "Choisir le niveau",
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
          title="Affectation"
          subtitle={`Étape ${step + 1}/5 · ${titres[step]}`}
          badges={
            <>
              {debut && fin && !dateError ? (
                <span className={toneBadge("blue")}>
                  {fmtDate(debut)} → {fmtDate(fin)}
                </span>
              ) : null}
              {niveau ? <span className={toneBadge("teal")}>{niveau}</span> : null}
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
              {step < 4 ? (
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
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField
                label="Début"
                required
                type="date"
                value={debut}
                onChange={setDebut}
              />
              <TextField
                label="Fin"
                required
                type="date"
                value={fin}
                onChange={setFin}
                error={dateError}
              />
              <p className="-mt-1 text-xs text-muted-foreground sm:col-span-2">
                Cette période sera appliquée à tous les stages créés.
              </p>
            </div>
          ) : null}

          {step === 1 ? (
            <SelectField
              label="Niveau"
              required
              value={niveau}
              onChange={(v) => {
                setNiveau(v as Niveau);
                setFiliere("");
                setGroupe("");
                setAssign({});
                setAssignService({});
                setAssignSub({});
              }}
              options={NIVEAUX}
              placeholder="Choisir un niveau…"
            />
          ) : null}

          {step === 2 ? (
            <SelectField
              label="Filière"
              required
              value={filiere}
              onChange={(v) => {
                setFiliere(v as Filiere);
                setGroupe("");
                setAssign({});
                setAssignService({});
                setAssignSub({});
              }}
              options={filieresOptions}
              placeholder="Choisir une filière…"
            />
          ) : null}

          {step === 3 ? (
            groupesDisponibles.length ? (
              <SelectField
                label="Groupe"
                required
                value={groupe}
              onChange={(v) => {
                setGroupe(v);
                setAssign({});
                setAssignService({});
                setAssignSub({});
              }}
                options={groupesDisponibles}
                placeholder="Choisir un groupe…"
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                Aucun groupe pour {niveau} · {filiere}.
              </p>
            )
          ) : null}

          {step === 4 ? (
            <div className="space-y-4">
              {onCreateStructure ? (
                <form
                  className="flex gap-2"
                  onSubmit={(ev) => {
                    ev.preventDefault();
                    const clean = nouvelleStructure.trim().replace(/\s+/g, " ");
                    if (!clean) {
                      toast.error("Tapez le nom de la structure");
                      return;
                    }
                    onCreateStructure(clean);
                    setNouvelleStructure("");
                  }}
                >
                  <input
                    value={nouvelleStructure}
                    onChange={(ev) => setNouvelleStructure(ev.target.value)}
                    placeholder="Nouvelle structure… (tapez + Entrée pour l'ajouter)"
                    aria-label="Nouvelle structure d'accueil"
                    className={cn(softSelectTrigger, "h-10 flex-1 border px-3 text-sm")}
                  />
                  <button type="submit" className={cn(ghostPill, "shrink-0")}>
                    + Ajouter
                  </button>
                </form>
              ) : null}
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
                    onClick={() => {
                      setAssign({});
                      setAssignService({});
                      setAssignSub({});
                    }}
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
                <>
                  <details className="rounded-2xl border border-brand/12 bg-muted/40 px-4 py-3">
                    <summary className="cursor-pointer text-xs font-semibold text-brand-dk">
                      Détails par service (carnet · {niveau} · {filiere})
                    </summary>
                    <div className="mt-2 space-y-2">
                      {structs.map((st) => {
                        const lignes = st.stages.flatMap((t) => stageDisplayRows(t, niveau, filiere));
                        if (!lignes.length) return null;
                        const restantes = placesRestantes(st.nom);
                        return (
                          <div key={st.nom}>
                            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                              {st.nom} · {restantes} restante(s)
                            </p>
                            <ul className="mt-0.5 space-y-0.5">
                              {lignes.map((r, i) => {
                                const indisponible = restantes <= 0;
                                return (
                                  <li
                                    key={`${r.stageNom}|${r.subNom ?? ""}|${r.niveau}|${i}`}
                                    className={cn(
                                      "text-xs",
                                      indisponible ? "font-semibold text-alert" : "text-muted-foreground",
                                    )}
                                  >
                                    {r.subNom ? `${r.stageNom} › ${r.subNom}` : r.stageNom} ·{" "}
                                    {r.niveau || "toutes années"} · {r.heures} h · {Math.max(0, restantes)} restante(s)
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        );
                      })}
                    </div>
                  </details>
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
                            {e.cne} · {libelleNiveau(e.niveau)}
                          </span>
                        </span>
                      </span>
                      <span className="w-full space-y-2 sm:w-72">
                        <Select
                          value={assign[e.id] || undefined}
                          onValueChange={(v) => choisirStructure(e.id, v)}
                        >
                          <SelectTrigger
                            className={cn(softSelectTrigger, "w-full")}
                            aria-label={`Structure pour ${e.prenom} ${e.nom}`}
                          >
                            <SelectValue placeholder="Structure…" />
                          </SelectTrigger>
                          <SelectContent className={softSelectContent}>
                            {optionsStructure(e.id).map((o) => (
                              <SelectItem key={o.value} value={o.value}>
                                {o.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {assign[e.id] ? (
                          <Select
                            value={assignService[e.id] || undefined}
                            onValueChange={(v) => choisirService(e.id, v)}
                          >
                            <SelectTrigger
                              className={cn(softSelectTrigger, "w-full")}
                              aria-label={`Service pour ${e.prenom} ${e.nom}`}
                            >
                              <SelectValue placeholder="Service (requis)…" />
                            </SelectTrigger>
                            <SelectContent className={softSelectContent}>
                              {stagesDe(e.id).map((o) => (
                                <SelectItem key={o.value} value={o.value}>
                                  {o.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : null}
                        {assignService[e.id] && subsDe(e.id).length ? (
                          <Select
                            value={assignSub[e.id] || undefined}
                            onValueChange={(v) =>
                              setAssignSub((prev) => ({ ...prev, [e.id]: v }))
                            }
                          >
                            <SelectTrigger
                              className={cn(softSelectTrigger, "w-full")}
                              aria-label={`Sous-stage pour ${e.prenom} ${e.nom}`}
                            >
                              <SelectValue placeholder="Sous-stage (facultatif)…" />
                            </SelectTrigger>
                            <SelectContent className={softSelectContent}>
                              {subsDe(e.id).map((o) => (
                                <SelectItem key={o.value} value={o.value}>
                                  {o.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : null}
                      </span>
                    </li>
                  ))}
                  </ul>
                </>
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
