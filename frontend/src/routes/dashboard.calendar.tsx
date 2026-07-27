import { createFileRoute, redirect } from "@tanstack/react-router";
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
  Download,
  Upload,
  FileUp,
  X,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth, DEMO_FORMATEUR_ID, getStoredRole } from "@/lib/auth";
import { canAccess } from "@/lib/dashboard-i18n";
import {
  useIstpm,
  useCurrentFormateur,
  type Conflit,
  type ConflitCandidate,
} from "@/lib/istpm-store";
import {
  SALLES,
  GROUPES,
  NIVEAUX,
  FILIERES,
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
  type Filiere,
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

  // La direction et le responsable des affaires estudiantines organisent les
  // séances ; l'enseignant consulte uniquement son propre planning.
  const canEdit = role === "responsable" || role === "directeur";
  const estEnseignant = role === "enseignant";
  const moiFormateur = useCurrentFormateur();

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
const [importOpen, setImportOpen] = useState(false);

  const nomProf = useMemo(() => {
    const map = new Map(
      formateurs.map((f) => [f.id, `${f.prenom} ${f.nom}`] as const),
    );
    return (id: string) => map.get(id) ?? " ";
  }, [formateurs]);

  /** L'enseignant ne voit que ses propres séances. */
  const moiId = moiFormateur?.id ?? DEMO_FORMATEUR_ID;
  const visibles = useMemo(
    () =>
      estEnseignant
        ? seances.filter((s) => s.professeurId === moiId)
        : seances,
    [seances, estEnseignant, moiId],
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

  /** Exporte l'emploi du temps affiché (séances filtrées) au format CSV. */
  const exportCsv = () => {
    if (!filtrees.length) {
      toast.error("Aucune séance à exporter");
      return;
    }
    const entetes = [
      "Date",
      "Début",
      "Fin",
      "Module",
      "Filière",
      "Type",
      "Groupe",
      "Salle",
      "Formateur",
      "Semestre",
      "Année universitaire",
    ];
    const lignes = filtrees
      .slice()
      .sort((a, b) => (a.date === b.date ? (a.debut < b.debut ? -1 : 1) : a.date < b.date ? -1 : 1))
      .map((s) =>
        [
          s.date,
          s.debut,
          s.fin,
          s.module,
          s.filiere,
          TYPE_SEANCE_LABEL[s.type],
          s.groupe,
          s.salle,
          nomProf(s.professeurId),
          s.semestre,
          s.anneeUniversitaire,
        ]
          .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
          .join(","),
      );
    // BOM pour qu'Excel lise correctement les entêtes accentuées.
    const blob = new Blob(["﻿" + entetes.join(",") + "\n" + lignes.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "emploi-du-temps-istpm.csv";
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success(`${filtrees.length} séance(s) exportée(s)`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Planning"
        title="Emploi du temps"
        actions={
          <>
            {canEdit ? (
              <button
                className={cn(ghostPill, "gap-1.5")}
                onClick={() => setImportOpen(true)}
              >
                <Upload className="h-3.5 w-3.5" /> Importer CSV
              </button>
            ) : null}
            <button className={cn(ghostPill, "gap-1.5")} onClick={exportCsv}>
              <Download className="h-3.5 w-3.5" /> Exporter CSV
            </button>
            {canEdit ? (
              <button className={primaryPill} onClick={() => ouvrirCreation()}>
                <Plus className="h-4 w-4" /> Nouvelle séance
              </button>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground">
                <Lock className="h-3.5 w-3.5" />
                {estEnseignant ? "Mon planning" : "Consultation seule"}
              </span>
            )}
          </>
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

      <ImportCsvDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        formateurs={formateurs}
        onImport={(seances) => {
          seances.forEach((s) => addSeance(s));
          setImportOpen(false);
          toast.success(`${seances.length} séance(s) importée(s)`);
        }}
      />

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
          <DetailField label="Filière" value={seance.filiere} full />
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
    filiere: (initial?.filiere ?? "") as Filiere | "",
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
    if (!f.filiere) next.filiere = "Filière (département) obligatoire";
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
      filiere: f.filiere as Filiere,
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
          onChange={(v) => {
            // Choisir un formateur pré-remplit la filière avec son département,
            // tant que l'utilisateur ne l'a pas fixée lui-même.
            const dep = formateurs.find((p) => p.id === v)?.departement;
            setF((p) => ({
              ...p,
              professeurId: v,
              filiere: p.filiere || (dep ?? ""),
            }));
            setErrors((p) => ({ ...p, professeurId: undefined }));
          }}
          options={formateurs.map((p) => ({
            value: p.id,
            label: `${p.prenom} ${p.nom}   ${p.departement}`,
          }))}
          error={errors.professeurId}
        />
      </FullWidth>
      <FullWidth>
        <SelectField
          label="Filière (département)"
          required
          value={f.filiere}
          onChange={(v) => set("filiere", v)}
          options={FILIERES}
          error={errors.filiere}
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

/* ------------------------------------------------------------------ */
/*  CSV Import                                                          */
/* ------------------------------------------------------------------ */

const COLONNES_IMPORT = [
  "Date",
  "Début",
  "Fin",
  "Module",
  "Filière",
  "Type",
  "Groupe",
  "Salle",
  "Formateur",
  "Semestre",
  "Année universitaire",
  "Notes",
] as const;

const AUTO_MAP: Record<string, string> = {
  date: "Date",
  debut: "Début",
  "heure début": "Début",
  "heure de début": "Début",
  fin: "Fin",
  "heure fin": "Fin",
  "heure de fin": "Fin",
  module: "Module",
  filière: "Filière",
  filiere: "Filière",
  département: "Filière",
  departement: "Filière",
  type: "Type",
  groupe: "Groupe",
  classe: "Groupe",
  salle: "Salle",
  formateur: "Formateur",
  professeur: "Formateur",
  enseignant: "Formateur",
  prof: "Formateur",
  semestre: "Semestre",
  niveau: "Semestre",
  "année universitaire": "Année universitaire",
  "annee universitaire": "Année universitaire",
  année: "Année universitaire",
  annee: "Année universitaire",
  notes: "Notes",
};

function parseCsv(text: string): string[][] {
  const lignes: string[][] = [];
  let current: string[] = [];
  let champ = "";
  let dansGuillemets = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i + 1];

    if (dansGuillemets) {
      if (c === '"' && next === '"') {
        champ += '"';
        i++;
      } else if (c === '"') {
        dansGuillemets = false;
      } else {
        champ += c;
      }
    } else {
      if (c === '"') {
        dansGuillemets = true;
      } else if (c === ",") {
        current.push(champ.trim());
        champ = "";
      } else if (c === "\n" || (c === "\r" && next === "\n")) {
        if (c === "\r") i++;
        current.push(champ.trim());
        champ = "";
        if (current.length > 0 && current.some((s) => s !== "")) {
          lignes.push(current);
        }
        current = [];
      } else if (c === "\r") {
        current.push(champ.trim());
        champ = "";
        if (current.some((s) => s !== "")) {
          lignes.push(current);
        }
        current = [];
      } else {
        champ += c;
      }
    }
  }
  if (champ.trim() || current.length > 0) {
    current.push(champ.trim());
    if (current.some((s) => s !== "")) {
      lignes.push(current);
    }
  }
  return lignes;
}

function detecterDelimiteur(entetes: string[]): string {
  if (entetes.some((h) => h.includes(";"))) return ";";
  return ",";
}

function parseCell(v: string): string {
  return v.replace(/^"(.*)"$/, "$1").replace(/""/g, '"').trim();
}

type LigneImport = Record<string, string>;

function autoMapper(entetes: string[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const h of entetes) {
    const key = h.toLowerCase().trim().replace(/[_\s-]+/g, " ");
    const target = AUTO_MAP[key];
    if (target) {
      map.set(target, h);
    }
  }
  for (const col of COLONNES_IMPORT) {
    if (!map.has(col)) {
      const found = entetes.find((e) => e.toLowerCase().trim() === col.toLowerCase());
      if (found) map.set(col, found);
    }
  }
  return map;
}

function trouverFormateurId(
  nom: string,
  formateurs: Formateur[],
): string | null {
  const q = nom.toLowerCase().trim();
  const parts = q.split(/\s+/);
  const initial = parts[0]?.replace(/\.$/, "") ?? "";
  const nomFamille = parts.slice(1).join(" ");

  for (const f of formateurs) {
    const full = `${f.prenom} ${f.nom}`.toLowerCase();
    if (full === q) return f.id;
  }
  for (const f of formateurs) {
    const short = `${f.prenom[0]}. ${f.nom}`.toLowerCase();
    if (short === q) return f.id;
  }
  for (const f of formateurs) {
    if (f.nom.toLowerCase() === nomFamille) return f.id;
  }
  return null;
}

function validerLigne(
  ligne: Record<string, string>,
  mapping: Map<string, string>,
  formateurs: Formateur[],
): { ok: true; seance: Omit<Seance, "id"> } | { ok: false; erreurs: string[] } {
  const erreurs: string[] = [];
  const get = (col: string) => (ligne[mapping.get(col) ?? ""] ?? "").trim();

  const date = get("Date");
  const debut = get("Début");
  const fin = get("Fin");
  const module = get("Module");
  const groupe = get("Groupe");
  const salle = get("Salle");
  const formateurRaw = get("Formateur");
  const filiereRaw = get("Filière");
  const typeRaw = get("Type");
  const semestreRaw = get("Semestre");
  const anneeRaw = get("Année universitaire");
  const notes = get("Notes");

  if (!date) erreurs.push("Date manquante");
  else if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
    erreurs.push(`Format date invalide: "${date}" (attendu YYYY-MM-DD)`);

  if (!debut) erreurs.push("Début manquant");
  else if (!/^\d{2}:\d{2}$/.test(debut))
    erreurs.push(`Format heure début invalide: "${debut}" (attendu HH:MM)`);

  if (!fin) erreurs.push("Fin manquante");
  else if (!/^\d{2}:\d{2}$/.test(fin))
    erreurs.push(`Format heure fin invalide: "${fin}" (attendu HH:MM)`);

  if (debut && fin && /^\d{2}:\d{2}$/.test(debut) && /^\d{2}:\d{2}$/.test(fin)) {
    const dMin = parseInt(debut.split(":")[0], 10) * 60 + parseInt(debut.split(":")[1], 10);
    const fMin = parseInt(fin.split(":")[0], 10) * 60 + parseInt(fin.split(":")[1], 10);
    if (fMin <= dMin) erreurs.push("La fin doit suivre le début");
  }

  if (!module) erreurs.push("Module manquant");
  if (!groupe) erreurs.push("Groupe manquant");
  if (!salle) erreurs.push("Salle manquante");

  let professeurId = "";
  if (!formateurRaw) erreurs.push("Formateur manquant");
  else {
    const id = trouverFormateurId(formateurRaw, formateurs);
    if (id) professeurId = id;
    else erreurs.push(`Formateur introuvable: "${formateurRaw}"`);
  }

  let filiere = filiereRaw;
  if (filiere && !FILIERES.includes(filiere as any)) {
    erreurs.push(`Filière inconnue: "${filiere}"`);
  }
  if (!filiere && professeurId) {
    const f = formateurs.find((p) => p.id === professeurId);
    if (f) filiere = f.departement;
  }

  let type: TypeSeance = "cours";
  if (typeRaw) {
    const found = (Object.entries(TYPE_SEANCE_LABEL) as [TypeSeance, string][]).find(
      ([, label]) => label.toLowerCase() === typeRaw.toLowerCase(),
    );
    if (found) type = found[0];
    else if (["cours", "td", "tp", "stage"].includes(typeRaw.toLowerCase())) {
      type = typeRaw.toLowerCase() as TypeSeance;
    } else {
      erreurs.push(`Type inconnu: "${typeRaw}" (attendu: Cours, TD, TP, Encadrement stage)`);
    }
  }

  let semestre = semestreRaw;
  if (semestre && !NIVEAUX.includes(semestre as any)) {
    const match = semestre.match(/[Ss][1-6]/);
    if (match) semestre = match[0].toUpperCase();
    else erreurs.push(`Semestre invalide: "${semestre}" (attendu S1–S6)`);
  }
  if (!semestre && groupe) {
    const match = groupe.match(/[Ss][1-6]/);
    if (match) semestre = match[0].toUpperCase();
  }
  if (!semestre) erreurs.push("Semestre manquant (non déduit du groupe)");

  const anneeUniversitaire = anneeRaw || "2025/2026";

  if (erreurs.length > 0) return { ok: false, erreurs };

  return {
    ok: true,
    seance: {
      module,
      professeurId,
      filiere: (filiere || FILIERES[0]) as Filiere,
      groupe,
      salle,
      date,
      debut,
      fin,
      anneeUniversitaire,
      semestre: semestre as Niveau,
      type,
      notes: notes || undefined,
    },
  };
}

function ImportCsvDialog({
  open,
  onOpenChange,
  formateurs,
  onImport,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  formateurs: Formateur[];
  onImport: (seances: Omit<Seance, "id">[]) => void;
}) {
  const [raw, setRaw] = useState<string[][]>([]);
  const [entetes, setEntetes] = useState<string[]>([]);
  const [lignes, setLignes] = useState<LigneImport[]>([]);
  const [mapping, setMapping] = useState<Map<string, string>>(new Map());
  const [colonneDispo, setColonneDispo] = useState<string[]>([]);
  const [resultats, setResultats] = useState<
    ({ ok: true; seance: Omit<Seance, "id"> } | { ok: false; erreurs: string[] })[]
  >([]);
  const [fichier, setFichier] = useState<string>("");
  const [etape, setEtape] = useState<"upload" | "mapper" | "resultat">("upload");

  const reset = () => {
    setRaw([]);
    setEntetes([]);
    setLignes([]);
    setMapping(new Map());
    setColonneDispo([]);
    setResultats([]);
    setFichier("");
    setEtape("upload");
  };

  const handleFile = (file: File) => {
    if (!file.name.endsWith(".csv")) {
      toast.error("Seuls les fichiers .csv sont acceptés");
      return;
    }
    setFichier(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      // Remove BOM
      const clean = text.replace(/^\uFEFF/, "");
      const toutes = parseCsv(clean);
      if (toutes.length < 2) {
        toast.error("Le fichier doit contenir au moins une ligne d'en-tête et une ligne de données");
        return;
      }
      const ent = toutes[0].map((h) => h.trim());
      const cols = toutes.slice(1).map((row) => {
        const obj: LigneImport = {};
        ent.forEach((h, i) => {
          obj[h] = parseCell(row[i] ?? "");
        });
        return obj;
      });

      setEntetes(ent);
      setLignes(cols);
      setColonneDispo(ent);

      const auto = autoMapper(ent);
      setMapping(auto);

      // Validate with current mapping
      const res = cols.map((l) => validerLigne(l, auto, formateurs));
      setResultats(res);
      setEtape("mapper");
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const setColMap = (colCible: string, source: string) => {
    const next = new Map(mapping);
    // Unset previous mapping for this source
    for (const [k, v] of next) {
      if (v === source) next.delete(k);
    }
    if (source) next.set(colCible, source);
    else next.delete(colCible);
    setMapping(next);
    const res = lignes.map((l) => validerLigne(l, next, formateurs));
    setResultats(res);
  };

  const nbOk = resultats.filter((r) => r.ok).length;
  const nbErreur = resultats.filter((r) => !r.ok).length;

  const lignesApercu = lignes.slice(0, 5);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className={cn(dialogSurface, "max-w-4xl")}>
        <DialogTitle className="sr-only">Importer un CSV</DialogTitle>
        <DialogDescription className="sr-only">
          Importer des séances depuis un fichier CSV
        </DialogDescription>

        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-brand/12 text-brand-dk">
              <FileUp className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h2 className="font-display text-lg font-bold tracking-tight text-foreground">
                Importer un CSV
              </h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Ajouter des séances en lot depuis un fichier CSV
              </p>
            </div>
          </div>

          {etape === "upload" && (
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => document.getElementById("csv-input")?.click()}
              className="flex cursor-pointer flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-brand/20 bg-brand/3 px-6 py-10 transition hover:border-brand/40 hover:bg-brand/6"
            >
              <Upload className="h-8 w-8 text-muted-foreground" />
              <div className="text-center">
                <p className="font-semibold text-foreground">
                  Cliquez ou glissez-déposez un fichier CSV
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Le fichier doit comporter une ligne d'en-tête
                </p>
              </div>
              <input
                id="csv-input"
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
            </div>
          )}

          {etape === "mapper" && (
            <>
              {/* Aperçu des données */}
              <div>
                <p className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Aperçu ({lignes.length} ligne{lignes.length > 1 ? "s" : ""})
                </p>
                <div className="overflow-x-auto rounded-xl border border-brand/12">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-brand/5">
                        {entetes.map((h) => (
                          <th key={h} className="px-3 py-2 text-left font-semibold text-foreground">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {lignesApercu.map((l, i) => (
                        <tr key={i} className="border-t border-brand/8">
                          {entetes.map((h) => (
                            <td key={h} className="max-w-40 truncate px-3 py-1.5 text-muted-foreground">
                              {l[h] || ""}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mappage des colonnes */}
              <div>
                <p className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Correspondance des colonnes
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {COLONNES_IMPORT.map((col) => (
                    <div key={col} className="flex items-center gap-2">
                      <span className="w-36 shrink-0 text-xs font-medium text-foreground">
                        {col === "Début" || col === "Fin" ? (
                          <span>
                            {col} <span className="text-alert">*</span>
                          </span>
                        ) : ["Date", "Module", "Groupe", "Salle", "Formateur"].includes(col) ? (
                          <span>
                            {col} <span className="text-alert">*</span>
                          </span>
                        ) : (
                          col
                        )}
                      </span>
                      <select
                        value={mapping.get(col) ?? ""}
                        onChange={(e) => setColMap(col, e.target.value)}
                        className={cn(
                          "h-7 flex-1 rounded-lg border border-brand/12 bg-card px-2 text-xs font-medium text-foreground outline-none",
                          "focus:border-brand/30 focus:ring-1 focus:ring-brand/20",
                          mapping.get(col) ? "" : "border-alert/40 text-alert",
                        )}
                      >
                        <option value="">— Non mappé —</option>
                        {colonneDispo.map((h) => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              {/* Résumé de validation */}
              <div className="flex items-center justify-between rounded-xl bg-brand/5 px-4 py-3">
                <div className="flex items-center gap-3 text-xs">
                  <span className="inline-flex items-center gap-1 font-semibold text-teal-600">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {nbOk} valide{nbOk > 1 ? "s" : ""}
                  </span>
                  {nbErreur > 0 && (
                    <span className="inline-flex items-center gap-1 font-semibold text-alert">
                      <AlertCircle className="h-3.5 w-3.5" />
                      {nbErreur} erreur{nbErreur > 1 ? "s" : ""}
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { reset(); onOpenChange(false); }}
                    className={cn(ghostPill, "h-8 px-3 text-xs")}
                  >
                    Annuler
                  </button>
                  <button
                    onClick={() => setEtape("resultat")}
                    disabled={nbOk === 0}
                    className={cn(primaryPill, "h-8 gap-1.5 px-4 text-xs")}
                  >
                    <Upload className="h-3.5 w-3.5" />
                    Importer {nbOk} séance{nbOk > 1 ? "s" : ""}
                  </button>
                </div>
              </div>

              {/* Fichier actuel */}
              <p className="text-[11px] text-muted-foreground">
                Fichier : {fichier}
              </p>
            </>
          )}

          {etape === "resultat" && (
            <>
              <div className="space-y-2">
                <p className="text-sm font-semibold text-foreground">
                  Résultat de l'importation
                </p>
                <div className="flex items-center gap-4 text-xs">
                  <span className="inline-flex items-center gap-1 font-semibold text-teal-600">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {nbOk} importée{nbOk > 1 ? "s" : ""}
                  </span>
                  {nbErreur > 0 && (
                    <span className="inline-flex items-center gap-1 font-semibold text-alert">
                      <AlertCircle className="h-3.5 w-3.5" />
                      {nbErreur} ignorée{nbErreur > 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              </div>

              {/* Erreurs */}
              {nbErreur > 0 && (
                <div className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-alert/20 bg-alert/5 p-3">
                  {resultats.map((r, i) =>
                    r.ok ? null : (
                      <div key={i} className="flex gap-2 text-xs">
                        <span className="shrink-0 font-semibold text-alert">
                          Ligne {i + 2}:
                        </span>
                        <span className="text-muted-foreground">
                          {r.erreurs.join(" · ")}
                        </span>
                      </div>
                    ),
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => { reset(); onOpenChange(false); }}
                  className={cn(ghostPill, "h-8 px-3 text-xs")}
                >
                  Fermer
                </button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export const Route = createFileRoute("/dashboard/calendar")({
  // L'emploi du temps est réservé à la direction et au responsable (chef de
  // département). Toute autre fonction est renvoyée vers le tableau de bord.
  beforeLoad: () => {
    const role = getStoredRole();
    if (role && !canAccess(role, "/dashboard/calendar")) {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: PlanningPage,
});
