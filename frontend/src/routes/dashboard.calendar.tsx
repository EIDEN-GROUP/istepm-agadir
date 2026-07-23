import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
  Lock,
  AlertTriangle,
  CalendarDays,
  MapPin,
  Users,
  User,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth, DEMO_FORMATEUR_ID } from "@/lib/auth";
import {
  useIstpm,
  type Conflit,
  type ConflitCandidate,
} from "@/lib/istpm-store";
import {
  SALLES,
  GROUPES,
  NIVEAUX,
  CRENEAUX,
  ANNEES_UNIVERSITAIRES,
  TYPE_SEANCE_LABEL,
  couleurSeance,
  lundiDeLaSemaine,
  isoDate,
  minutesDepuisMinuit,
  ajouterMinutes,
  fmtDate,
  type Seance,
  type TypeSeance,
  type Niveau,
  type Formateur,
} from "@/lib/istpm-data";
import {
  VueJour,
  VueSemaine,
  VueMois,
  type VueCalendrier,
} from "@/components/calendar-views";
import {
  softCard,
  primaryPill,
  ghostPill,
  iconButton,
  toneBadge,
  dialogSurface,
} from "@/lib/dash-ui";
import {
  PageHeader,
  FilterPanel,
  type FilterDef,
  DetailSection,
  DetailGrid,
  DetailField,
  DetailShell,
  DetailEmpty,
  ALL,
} from "@/components/dash-page";
import {
  FormDialog,
  ConfirmDialog,
  TextField,
  SelectField,
  FullWidth,
} from "@/components/dash-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const TYPES: TypeSeance[] = ["cours", "td", "tp", "stage"];

const MOIS_LONGS = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
];

const LIBELLE_CONFLIT: Record<Conflit["type"], string> = {
  professeur: "Formateur déjà occupé",
  salle: "Salle déjà occupée",
  groupe: "Groupe déjà en cours",
};

function resumeConflits(conflits: Conflit[]) {
  return [...new Set(conflits.map((c) => LIBELLE_CONFLIT[c.type]))].join(", ");
}

/* ------------------------------------------------------------------ */

function PlanningPage() {
  const { role } = useAuth();
  const {
    seances,
    formateurs,
    addSeance,
    updateSeance,
    deleteSeance,
    moveSeance,
    conflitsSeance,
  } = useIstpm();

  // Seul le responsable des affaires estudiantines organise les séances ;
  // le directeur supervise et l'enseignant consulte son propre planning.
  const canEdit = role === "responsable";
  const estEnseignant = role === "enseignant";

  const [vue, setVue] = useState<VueCalendrier>("semaine");
  const [curseur, setCurseur] = useState(() => new Date());

  const [search, setSearch] = useState("");
  const [prof, setProf] = useState<string>(ALL);
  const [groupe, setGroupe] = useState<string>(ALL);
  const [salle, setSalle] = useState<string>(ALL);
  const [module, setModule] = useState<string>(ALL);

  const [detail, setDetail] = useState<Seance | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Seance | null>(null);
  const [prefill, setPrefill] = useState<{ date: string; debut: string } | null>(
    null,
  );
  const [toDelete, setToDelete] = useState<Seance | null>(null);

  const nomProf = useMemo(() => {
    const map = new Map(
      formateurs.map((f) => [f.id, `${f.prenom} ${f.nom}`] as const),
    );
    return (id: string) => map.get(id) ?? " ";
  }, [formateurs]);

  /** L'enseignant ne voit que ses propres séances. */
  const visibles = useMemo(
    () =>
      estEnseignant
        ? seances.filter((s) => s.professeurId === DEMO_FORMATEUR_ID)
        : seances,
    [seances, estEnseignant],
  );

  const modules = useMemo(
    () => [...new Set(visibles.map((s) => s.module))].sort(),
    [visibles],
  );
  const profs = useMemo(() => {
    const ids = new Set(visibles.map((s) => s.professeurId));
    return formateurs
      .filter((f) => ids.has(f.id))
      .map((f) => `${f.prenom} ${f.nom}`)
      .sort();
  }, [visibles, formateurs]);

  const filtrees = useMemo(() => {
    const q = search.trim().toLowerCase();
    return visibles.filter((s) => {
      if (prof !== ALL && nomProf(s.professeurId) !== prof) return false;
      if (groupe !== ALL && s.groupe !== groupe) return false;
      if (salle !== ALL && s.salle !== salle) return false;
      if (module !== ALL && s.module !== module) return false;
      if (!q) return true;
      return `${s.module} ${s.groupe} ${s.salle} ${nomProf(s.professeurId)} ${s.notes ?? ""}`
        .toLowerCase()
        .includes(q);
    });
  }, [visibles, search, prof, groupe, salle, module, nomProf]);

  /* --------------- Navigation temporelle --------------- */

  const joursSemaine = useMemo(() => {
    const lundi = lundiDeLaSemaine(curseur);
    // Semaine de 6 jours : pas de cours le dimanche.
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(lundi);
      d.setDate(lundi.getDate() + i);
      return d;
    });
  }, [curseur]);

  const decaler = (sens: -1 | 1) => {
    const d = new Date(curseur);
    if (vue === "jour") d.setDate(d.getDate() + sens);
    else if (vue === "semaine") d.setDate(d.getDate() + sens * 7);
    else d.setMonth(d.getMonth() + sens);
    setCurseur(d);
  };

  const titrePeriode = useMemo(() => {
    if (vue === "jour") {
      return curseur.toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    }
    if (vue === "semaine") {
      const a = joursSemaine[0];
      const b = joursSemaine[joursSemaine.length - 1];
      return a.getMonth() === b.getMonth()
        ? `${a.getDate()} – ${b.getDate()} ${MOIS_LONGS[a.getMonth()]} ${a.getFullYear()}`
        : `${a.getDate()} ${MOIS_LONGS[a.getMonth()]} – ${b.getDate()} ${MOIS_LONGS[b.getMonth()]} ${b.getFullYear()}`;
    }
    return `${MOIS_LONGS[curseur.getMonth()]} ${curseur.getFullYear()}`;
  }, [vue, curseur, joursSemaine]);

  /* --------------- Actions --------------- */

  const ouvrirCreation = (date?: string, debut?: string) => {
    setEditing(null);
    setPrefill(date && debut ? { date, debut } : null);
    setFormOpen(true);
  };

  const handleDrop = (id: string, date: string, debut: string) => {
    const s = seances.find((x) => x.id === id);
    if (!s) return;
    const duree = minutesDepuisMinuit(s.fin) - minutesDepuisMinuit(s.debut);
    const fin = ajouterMinutes(debut, duree);

    // Le déplacement est appliqué puis signalé : on n'empêche pas le
    // responsable de poser une séance en conflit, on l'en avertit.
    const conflits = conflitsSeance(
      {
        date,
        debut,
        fin,
        professeurId: s.professeurId,
        salle: s.salle,
        groupe: s.groupe,
      },
      id,
    );

    moveSeance(id, date, debut);

    if (conflits.length) {
      toast.warning(
        `Séance déplacée   ${conflits.length} conflit(s) : ${resumeConflits(conflits)}`,
      );
    } else {
      toast.success(`Séance déplacée au ${fmtDate(date)} à ${debut}`);
    }
  };

  const nbConflits = useMemo(
    () => filtrees.filter((s) => conflitsSeance(s, s.id).length).length,
    [filtrees, conflitsSeance],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Planning"
        title="Emploi du temps"
        actions={
          canEdit ? (
            <button className={primaryPill} onClick={() => ouvrirCreation()}>
              <Plus className="h-4 w-4" /> Nouvelle séance
            </button>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground">
              <Lock className="h-3.5 w-3.5" />
              {estEnseignant ? "Mon planning" : "Consultation seule"}
            </span>
          )
        }
      />

      <FilterPanel
        search={search}
        onSearch={setSearch}
        placeholder="Rechercher un module, un groupe, une salle, un formateur…"
        filters={[
          // L'enseignant ne voyant que ses séances, le filtre formateur
          // n'aurait qu'une seule valeur.
          ...(estEnseignant
            ? []
            : [
                {
                  id: "prof",
                  label: "Formateur",
                  value: prof,
                  onChange: setProf,
                  options: profs,
                  allLabel: "Tous les formateurs",
                } satisfies FilterDef,
              ]),
          {
            id: "groupe",
            label: "Groupe",
            value: groupe,
            onChange: setGroupe,
            options: GROUPES,
            allLabel: "Tous les groupes",
          },
          {
            id: "salle",
            label: "Salle",
            value: salle,
            onChange: setSalle,
            options: SALLES,
            allLabel: "Toutes les salles",
          },
          {
            id: "module",
            label: "Module",
            value: module,
            onChange: setModule,
            options: modules,
            allLabel: "Tous les modules",
          },
        ]}
        summary={
          <>
            <strong className="font-semibold text-foreground">
              {filtrees.length}
            </strong>{" "}
            séance(s) affichée(s)
            {nbConflits ? (
              <span className="ms-2 inline-flex items-center gap-1 font-semibold text-alert">
                <AlertTriangle className="h-3 w-3" />
                {nbConflits} en conflit
              </span>
            ) : null}
          </>
        }
      />

      <section className={cn(softCard, "overflow-hidden")}>
        {/* Barre de navigation du calendrier */}
        <div className="flex flex-wrap items-center gap-3 border-b border-brand/12 bg-muted/50 px-4 py-3">
          <div className="flex items-center gap-1">
            <button
              className={iconButton}
              aria-label="Période précédente"
              onClick={() => decaler(-1)}
            >
              <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
            </button>
            <button
              className={iconButton}
              aria-label="Période suivante"
              onClick={() => decaler(1)}
            >
              <ChevronRight className="h-4 w-4 rtl:rotate-180" />
            </button>
          </div>

          <button
            className={cn(ghostPill, "h-9 px-3 py-0 text-xs")}
            onClick={() => setCurseur(new Date())}
          >
            Aujourd'hui
          </button>

          <p className="min-w-0 flex-1 truncate font-display text-base font-bold capitalize tracking-tight text-foreground">
            {titrePeriode}
          </p>

          <div className="flex items-center gap-0.5 rounded-full border border-brand/20 bg-card p-0.5">
            {(
              [
                ["jour", "Jour"],
                ["semaine", "Semaine"],
                ["mois", "Mois"],
              ] as const
            ).map(([v, label]) => (
              <button
                key={v}
                onClick={() => setVue(v)}
                aria-pressed={vue === v}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-200",
                  vue === v
                    ? "bg-brand text-white shadow-[0_8px_18px_-10px_rgb(var(--istpm-shadow)/0.9)]"
                    : "text-muted-foreground hover:bg-brand/10 hover:text-brand-dk",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {canEdit ? (
          <p className="border-b border-brand/8 bg-brand/5 px-4 py-1.5 text-[11px] text-brand-dk">
            Glissez une séance pour la déplacer · cliquez sur une ligne horaire
            pour en créer une
          </p>
        ) : null}

        <div className="p-2 sm:p-3">
          {vue === "jour" ? (
            <VueJour
              date={curseur}
              seances={filtrees}
              nomProf={nomProf}
              canDrag={canEdit}
              onOpen={setDetail}
              onDrop={handleDrop}
              onCreneauVide={canEdit ? ouvrirCreation : undefined}
            />
          ) : vue === "semaine" ? (
            <VueSemaine
              jours={joursSemaine}
              seances={filtrees}
              nomProf={nomProf}
              canDrag={canEdit}
              onOpen={setDetail}
              onDrop={handleDrop}
              onCreneauVide={canEdit ? ouvrirCreation : undefined}
            />
          ) : (
            <VueMois
              mois={curseur}
              seances={filtrees}
              nomProf={nomProf}
              onOpen={setDetail}
              onJour={(d) => {
                setCurseur(d);
                setVue("jour");
              }}
            />
          )}
        </div>
      </section>

      {/* Fiche d'une séance */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className={dialogSurface}>
          <DialogTitle className="sr-only">Détail de la séance</DialogTitle>
          <DialogDescription className="sr-only">
            Informations de la séance sélectionnée
          </DialogDescription>
          {detail ? (
            <SeanceDetail
              seance={seances.find((x) => x.id === detail.id) ?? detail}
              nomProf={nomProf}
              conflits={conflitsSeance(detail, detail.id)}
              canEdit={canEdit}
              onEdit={(s) => {
                setEditing(s);
                setPrefill(null);
                setDetail(null);
                setFormOpen(true);
              }}
              onDelete={(s) => {
                setDetail(null);
                setToDelete(s);
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      {formOpen && canEdit ? (
        <SeanceForm
          key={editing?.id ?? `${prefill?.date ?? ""}-${prefill?.debut ?? "new"}`}
          initial={editing}
          prefill={prefill}
          formateurs={formateurs}
          verifierConflits={conflitsSeance}
          nomProf={nomProf}
          onCancel={() => setFormOpen(false)}
          onSubmit={(data) => {
            if (editing) {
              updateSeance(editing.id, data);
              toast.success(`Séance mise à jour   ${data.module}`);
            } else {
              addSeance(data);
              toast.success(`Séance créée   ${data.module}`);
            }
            setFormOpen(false);
          }}
        />
      ) : null}

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Supprimer cette séance ?"
        message={
          toDelete
            ? `« ${toDelete.module} » du ${fmtDate(toDelete.date)} à ${toDelete.debut} (${toDelete.groupe}) sera retirée du planning.`
            : ""
        }
        onConfirm={() => {
          if (!toDelete) return;
          deleteSeance(toDelete.id);
          toast.success(`Séance supprimée   ${toDelete.module}`);
          setToDelete(null);
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */

function SeanceDetail({
  seance,
  nomProf,
  conflits,
  canEdit,
  onEdit,
  onDelete,
}: {
  seance: Seance;
  nomProf: (id: string) => string;
  conflits: Conflit[];
  canEdit: boolean;
  onEdit: (s: Seance) => void;
  onDelete: (s: Seance) => void;
}) {
  const c = couleurSeance(seance.module);
  return (
    <DetailShell
      icon={<CalendarDays className="h-5 w-5" />}
      title={seance.module}
      subtitle={`${fmtDate(seance.date)} · ${seance.debut} – ${seance.fin}`}
      badges={
        <>
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide"
            style={{ backgroundColor: c.soft, color: c.text }}
          >
            {TYPE_SEANCE_LABEL[seance.type]}
          </span>
          <span className={toneBadge("blue")}>{seance.semestre}</span>
          {conflits.length ? (
            <span className={toneBadge("red")}>
              {conflits.length} conflit(s)
            </span>
          ) : null}
        </>
      }
      footer={
        canEdit ? (
          <div className="flex items-center justify-end gap-2">
            <button
              className={cn(ghostPill, "gap-1.5")}
              onClick={() => onEdit(seance)}
            >
              <Pencil className="h-3.5 w-3.5" /> Modifier
            </button>
            <button
              className="inline-flex items-center gap-2 rounded-full bg-alert px-5 py-2.5 text-sm font-bold text-white transition hover:bg-alert-dk"
              onClick={() => onDelete(seance)}
            >
              <Trash2 className="h-4 w-4" /> Supprimer
            </button>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Planning en consultation seule.
          </p>
        )
      }
    >
      {conflits.length ? (
        <div className="space-y-1.5 rounded-2xl bg-alert/10 px-4 py-3">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-alert">
            <AlertTriangle className="h-4 w-4" /> Conflit de planification
          </p>
          <ul className="space-y-1 text-xs text-alert-dk">
            {conflits.map((cf, i) => (
              <li key={i}>
                {LIBELLE_CONFLIT[cf.type]}   {cf.seance.module} (
                {cf.seance.debut}–{cf.seance.fin}, {cf.seance.salle})
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <DetailSection title="Séance">
        <DetailGrid>
          <DetailField
            label="Formateur"
            value={
              <span className="inline-flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-brand" />
                {nomProf(seance.professeurId)}
              </span>
            }
          />
          <DetailField
            label="Groupe / classe"
            value={
              <span className="inline-flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-brand" />
                {seance.groupe}
              </span>
            }
          />
          <DetailField
            label="Salle"
            value={
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-brand" />
                {seance.salle}
              </span>
            }
          />
          <DetailField
            label="Horaire"
            value={
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-brand" />
                {seance.debut} – {seance.fin}
              </span>
            }
          />
          <DetailField label="Semestre" value={seance.semestre} />
          <DetailField
            label="Année universitaire"
            value={seance.anneeUniversitaire}
          />
        </DetailGrid>
      </DetailSection>

      <DetailSection title="Notes">
        <DetailEmpty>
          {seance.notes ?? "Aucune note pour cette séance."}
        </DetailEmpty>
      </DetailSection>
    </DetailShell>
  );
}

/* ------------------------------------------------------------------ */

function SeanceForm({
  initial,
  prefill,
  formateurs,
  verifierConflits,
  nomProf,
  onSubmit,
  onCancel,
}: {
  initial: Seance | null;
  prefill: { date: string; debut: string } | null;
  formateurs: Formateur[];
  verifierConflits: (c: ConflitCandidate, ignorerId?: string) => Conflit[];
  nomProf: (id: string) => string;
  onSubmit: (data: Omit<Seance, "id">) => void;
  onCancel: () => void;
}) {
  const [f, setF] = useState(() => ({
    module: initial?.module ?? "",
    professeurId: initial?.professeurId ?? "",
    groupe: initial?.groupe ?? "",
    salle: initial?.salle ?? "",
    date: initial?.date ?? prefill?.date ?? isoDate(new Date()),
    debut: initial?.debut ?? prefill?.debut ?? CRENEAUX[0].debut,
    fin: initial?.fin ?? ajouterMinutes(prefill?.debut ?? CRENEAUX[0].debut, 90),
    anneeUniversitaire: initial?.anneeUniversitaire ?? "2025/2026",
    semestre: (initial?.semestre ?? "") as Niveau | "",
    type: (initial?.type ?? "cours") as TypeSeance,
    notes: initial?.notes ?? "",
  }));
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => {
    setF((p) => ({ ...p, [k]: v }));
    setErrors((p) => ({ ...p, [k]: undefined }));
  };

  // Conflits recalculés à chaque frappe : l'avertissement apparaît avant
  // l'enregistrement, pas après.
  const conflits = useMemo(() => {
    if (!f.professeurId || !f.salle || !f.groupe || !f.date) return [];
    if (minutesDepuisMinuit(f.fin) <= minutesDepuisMinuit(f.debut)) return [];
    return verifierConflits(
      {
        date: f.date,
        debut: f.debut,
        fin: f.fin,
        professeurId: f.professeurId,
        salle: f.salle,
        groupe: f.groupe,
      },
      initial?.id,
    );
  }, [f, verifierConflits, initial]);

  const submit = () => {
    const next: Record<string, string> = {};
    if (!f.module.trim()) next.module = "Module obligatoire";
    if (!f.professeurId) next.professeurId = "Formateur obligatoire";
    if (!f.groupe) next.groupe = "Groupe obligatoire";
    if (!f.salle) next.salle = "Salle obligatoire";
    if (!f.semestre) next.semestre = "Semestre obligatoire";
    if (!f.date) next.date = "Date obligatoire";
    if (minutesDepuisMinuit(f.fin) <= minutesDepuisMinuit(f.debut))
      next.fin = "La fin doit suivre le début";

    if (Object.keys(next).length) {
      setErrors(next);
      toast.error("Veuillez corriger les champs signalés");
      return;
    }

    onSubmit({
      module: f.module.trim(),
      professeurId: f.professeurId,
      groupe: f.groupe,
      salle: f.salle,
      date: f.date,
      debut: f.debut,
      fin: f.fin,
      anneeUniversitaire: f.anneeUniversitaire,
      semestre: f.semestre as Niveau,
      type: f.type,
      notes: f.notes.trim() || undefined,
    });
  };

  return (
    <FormDialog
      open
      onOpenChange={(o) => !o && onCancel()}
      wide
      title={initial ? "Modifier la séance" : "Nouvelle séance"}
      subtitle={
        initial
          ? `${initial.module}   ${fmtDate(initial.date)}`
          : "Planifier un enseignement"
      }
      submitLabel={
        conflits.length
          ? "Enregistrer malgré le conflit"
          : initial
            ? "Enregistrer"
            : "Créer la séance"
      }
      onSubmit={submit}
    >
      {conflits.length ? (
        <FullWidth>
          <div className="space-y-1.5 rounded-2xl bg-alert/10 px-4 py-3">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-alert">
              <AlertTriangle className="h-4 w-4" />
              {conflits.length} conflit(s) détecté(s)
            </p>
            <ul className="space-y-0.5 text-xs text-alert-dk">
              {conflits.map((c, i) => (
                <li key={i}>
                  {LIBELLE_CONFLIT[c.type]}   {c.seance.module} (
                  {c.seance.debut}–{c.seance.fin}, {c.seance.salle},{" "}
                  {nomProf(c.seance.professeurId)})
                </li>
              ))}
            </ul>
          </div>
        </FullWidth>
      ) : null}

      <FullWidth>
        <TextField
          label="Module"
          required
          value={f.module}
          onChange={(v) => set("module", v)}
          placeholder="Soins infirmiers en médecine"
          error={errors.module}
        />
      </FullWidth>
      <FullWidth>
        <SelectField
          label="Formateur"
          required
          value={f.professeurId}
          onChange={(v) => set("professeurId", v)}
          options={formateurs.map((p) => ({
            value: p.id,
            label: `${p.prenom} ${p.nom}   ${p.departement}`,
          }))}
          error={errors.professeurId}
        />
      </FullWidth>
      <SelectField
        label="Groupe / classe"
        required
        value={f.groupe}
        onChange={(v) => set("groupe", v)}
        options={GROUPES}
        error={errors.groupe}
      />
      <SelectField
        label="Salle"
        required
        value={f.salle}
        onChange={(v) => set("salle", v)}
        options={SALLES}
        error={errors.salle}
      />
      <SelectField
        label="Semestre"
        required
        value={f.semestre}
        onChange={(v) => set("semestre", v)}
        options={NIVEAUX}
        error={errors.semestre}
      />
      <SelectField
        label="Année universitaire"
        value={f.anneeUniversitaire}
        onChange={(v) => set("anneeUniversitaire", v)}
        options={ANNEES_UNIVERSITAIRES}
      />
      <TextField
        label="Date"
        required
        type="date"
        value={f.date}
        onChange={(v) => set("date", v)}
        error={errors.date}
      />
      <SelectField
        label="Type de séance"
        value={f.type}
        onChange={(v) => set("type", v)}
        options={TYPES.map((t) => ({ value: t, label: TYPE_SEANCE_LABEL[t] }))}
      />
      <TextField
        label="Heure de début"
        required
        type="time"
        value={f.debut}
        onChange={(v) => set("debut", v)}
      />
      <TextField
        label="Heure de fin"
        required
        type="time"
        value={f.fin}
        onChange={(v) => set("fin", v)}
        error={errors.fin}
      />
      <FullWidth>
        <TextField
          label="Notes (facultatif)"
          value={f.notes}
          onChange={(v) => set("notes", v)}
          placeholder="Matériel à prévoir, salle équipée…"
        />
      </FullWidth>
    </FormDialog>
  );
}

export const Route = createFileRoute("/dashboard/calendar")({
  component: PlanningPage,
});
