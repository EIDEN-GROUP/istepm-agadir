import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Eye, Save, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { useIstpm } from "@/lib/istpm-store";
import {
  FILIERES,
  NIVEAUX,
  TYPE_EXAMEN_LABEL,
  STATUT_EXAMEN_LABEL,
  STATUT_EXAMEN_TONE,
  fmtDate,
  type Examen,
  type Filiere,
  type Niveau,
  type TypeExamen,
  type StatutExamen,
} from "@/lib/istpm-data";
import {
  primaryPill,
  iconButton,
  iconButtonDanger,
  toneBadge,
  dialogSurfaceWide,
  tableRow,
  softInput,
} from "@/lib/dash-ui";
import {
  PageHeader,
  FilterBar,
  FilterSelect,
  DataTable,
  DetailSection,
  DetailRow,
  DetailShell,
  ALL,
} from "@/components/dash-page";
import {
  FormDialog,
  ConfirmDialog,
  TextField,
  SelectField,
  ListField,
  FullWidth,
  parseList,
} from "@/components/dash-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const TYPES: TypeExamen[] = [
  "controle_continu",
  "examen_theorique",
  "evaluation_pratique",
  "rattrapage",
];
const STATUTS: StatutExamen[] = ["planifie", "en_cours", "notes_saisies"];
const COMPOSANTES = [
  "Théorique",
  "Pratique",
  "Théorique + Pratique",
] as const;

function ExamensPage() {
  const { role } = useAuth();
  const { examens, addExamen, updateExamen, deleteExamen } = useIstpm();
  // Note entry belongs to the teaching staff; the responsable never grades.
  const canGrade = role === "directeur" || role === "enseignant";

  const [search, setSearch] = useState("");
  const [filiere, setFiliere] = useState<string>(ALL);
  const [niveau, setNiveau] = useState<string>(ALL);
  const [type, setType] = useState<string>(ALL);

  const [detail, setDetail] = useState<Examen | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Examen | null>(null);
  const [toDelete, setToDelete] = useState<Examen | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return examens.filter((x) => {
      if (filiere !== ALL && x.filiere !== filiere) return false;
      if (niveau !== ALL && x.niveau !== niveau) return false;
      if (type !== ALL && TYPE_EXAMEN_LABEL[x.type] !== type) return false;
      if (!q) return true;
      return `${x.module} ${x.salle} ${x.surveillants.join(" ")}`
        .toLowerCase()
        .includes(q);
    });
  }, [examens, search, filiere, niveau, type]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Évaluation"
        title="Examens"
        actions={
          canGrade ? (
            <button
              className={primaryPill}
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus className="h-4 w-4" /> Planifier un examen
            </button>
          ) : undefined
        }
      />

      <FilterBar
        search={search}
        onSearch={setSearch}
        placeholder="Rechercher par module, salle, surveillant…"
      >
        <FilterSelect
          value={filiere}
          onChange={setFiliere}
          options={FILIERES}
          allLabel="Toutes les filières"
          width="w-[15rem]"
        />
        <FilterSelect
          value={niveau}
          onChange={setNiveau}
          options={NIVEAUX}
          allLabel="Tous les semestres"
          width="w-[11rem]"
        />
        <FilterSelect
          value={type}
          onChange={setType}
          options={TYPES.map((t) => TYPE_EXAMEN_LABEL[t])}
          allLabel="Tous les types"
          width="w-[14rem]"
        />
      </FilterBar>

      <DataTable
        minWidth="min-w-[1100px]"
        isEmpty={filtered.length === 0}
        empty="Aucun examen ne correspond à ces critères."
        head={
          <>
            <th className="px-4 py-3.5">Module</th>
            <th className="px-4 py-3.5">Filière / niveau</th>
            <th className="px-4 py-3.5">Type</th>
            <th className="px-4 py-3.5">Date</th>
            <th className="px-4 py-3.5">Heure</th>
            <th className="px-4 py-3.5">Salle</th>
            <th className="px-4 py-3.5">Surveillant(s)</th>
            <th className="px-4 py-3.5">Statut</th>
            <th className="w-28 px-4 py-3.5 text-center">Actions</th>
          </>
        }
      >
        {filtered.map((x) => (
          <tr key={x.id} onClick={() => setDetail(x)} className={tableRow}>
            <td className="px-4 py-3.5">
              <span className="block font-medium">{x.module}</span>
              <span className="text-xs text-muted-foreground">
                {x.composante}
              </span>
            </td>
            <td className="px-4 py-3.5 text-muted-foreground">
              <span className="block">{x.filiere}</span>
              <span className="text-xs">{x.niveau}</span>
            </td>
            <td className="px-4 py-3.5 text-muted-foreground">
              {TYPE_EXAMEN_LABEL[x.type]}
            </td>
            <td className="px-4 py-3.5 whitespace-nowrap">{fmtDate(x.date)}</td>
            <td className="px-4 py-3.5 tabular-nums">{x.heure}</td>
            <td className="px-4 py-3.5 text-muted-foreground">{x.salle}</td>
            <td className="px-4 py-3.5 text-muted-foreground">
              {x.surveillants.join(", ")}
            </td>
            <td className="px-4 py-3.5">
              <span className={toneBadge(STATUT_EXAMEN_TONE[x.statut])}>
                {STATUT_EXAMEN_LABEL[x.statut]}
              </span>
            </td>
            <td
              className="px-4 py-3.5 text-center"
              onClick={(ev) => ev.stopPropagation()}
            >
              <div className="flex items-center justify-center gap-1">
                <button
                  className={iconButton}
                  aria-label="Voir le détail"
                  onClick={() => setDetail(x)}
                >
                  <Eye className="h-3.5 w-3.5" />
                </button>
                {canGrade ? (
                  <>
                    <button
                      className={iconButton}
                      aria-label="Modifier"
                      onClick={() => {
                        setEditing(x);
                        setFormOpen(true);
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      className={iconButtonDanger}
                      aria-label="Supprimer"
                      onClick={() => setToDelete(x)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </>
                ) : null}
              </div>
            </td>
          </tr>
        ))}
      </DataTable>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className={dialogSurfaceWide}>
          <DialogTitle className="sr-only">Détail de l'examen</DialogTitle>
          <DialogDescription className="sr-only">
            Convocations et saisie des notes
          </DialogDescription>
          {detail ? (
            <ExamenDetail
              key={detail.id}
              examen={examens.find((x) => x.id === detail.id) ?? detail}
              canGrade={canGrade}
              onSaved={() => setDetail(null)}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      {formOpen ? (
        <ExamenForm
          key={editing?.id ?? "new"}
          initial={editing}
          onCancel={() => setFormOpen(false)}
          onSubmit={(data) => {
            if (editing) {
              updateExamen(editing.id, data);
              toast.success(`Examen mis à jour — ${data.module}`);
            } else {
              addExamen(data);
              toast.success(`Examen planifié — ${data.module}`);
            }
            setFormOpen(false);
          }}
        />
      ) : null}

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Supprimer cet examen ?"
        message={
          toDelete
            ? `L'examen « ${toDelete.module} » du ${fmtDate(toDelete.date)} sera supprimé. Les notes déjà saisies pour les étudiants sont conservées.`
            : ""
        }
        onConfirm={() => {
          if (!toDelete) return;
          deleteExamen(toDelete.id);
          toast.success(`Examen supprimé — ${toDelete.module}`);
          setToDelete(null);
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Saisie des notes                                                   */
/* ------------------------------------------------------------------ */

type NoteSaisie = { theorique: string; pratique: string };

/** Empty means "not graded"; anything else must be a mark between 0 and 20. */
function parseNote(v: string): number | undefined | "invalid" {
  if (v.trim() === "") return undefined;
  const n = Number(v);
  if (Number.isNaN(n) || n < 0 || n > 20) return "invalid";
  return n;
}

function ExamenDetail({
  examen,
  canGrade,
  onSaved,
}: {
  examen: Examen;
  canGrade: boolean;
  onSaved: () => void;
}) {
  const { etudiants, saveNotesExamen } = useIstpm();

  // Students convoked = everyone enrolled in that filière + semester.
  const convoques = useMemo(
    () =>
      etudiants.filter(
        (e) =>
          e.filiere === examen.filiere &&
          e.niveau === examen.niveau &&
          e.statut !== "abandon",
      ),
    [etudiants, examen],
  );

  // Pre-fill with any mark already recorded for this module.
  const [notes, setNotes] = useState<Record<string, NoteSaisie>>(() => {
    const seeded: Record<string, NoteSaisie> = {};
    for (const e of convoques) {
      const existante = e.notes.find((n) => n.module === examen.module);
      if (existante) {
        const v = String(existante.note);
        seeded[e.id] = { theorique: v, pratique: v };
      }
    }
    return seeded;
  });

  // Paramedical exams carry a theory and a practical component; show only the
  // columns this particular exam actually assesses.
  const hasTheorique = examen.composante !== "Pratique";
  const hasPratique = examen.composante !== "Théorique";

  const set = (id: string, key: keyof NoteSaisie, value: string) =>
    setNotes((prev) => {
      const current = prev[id] ?? { theorique: "", pratique: "" };
      return { ...prev, [id]: { ...current, [key]: value } };
    });

  const saisies = Object.values(notes).filter(
    (n) =>
      (hasTheorique && n.theorique !== "") || (hasPratique && n.pratique !== ""),
  ).length;

  const save = () => {
    const payload: {
      etudiantId: string;
      theorique?: number;
      pratique?: number;
    }[] = [];

    for (const e of convoques) {
      const n = notes[e.id];
      if (!n) continue;
      const th = hasTheorique ? parseNote(n.theorique) : undefined;
      const pr = hasPratique ? parseNote(n.pratique) : undefined;
      if (th === "invalid" || pr === "invalid") {
        toast.error(
          `Note invalide pour ${e.prenom} ${e.nom} — saisir une valeur entre 0 et 20`,
        );
        return;
      }
      if (th === undefined && pr === undefined) continue;
      payload.push({ etudiantId: e.id, theorique: th, pratique: pr });
    }

    if (!payload.length) {
      toast.error("Aucune note à enregistrer");
      return;
    }

    const count = saveNotesExamen(examen.id, payload);
    toast.success(
      `Notes enregistrées pour ${count} étudiant(s) — ${examen.module}`,
    );
    onSaved();
  };

  return (
    <DetailShell
      title={examen.module}
      subtitle={`${examen.filiere} · ${examen.niveau} · ${TYPE_EXAMEN_LABEL[examen.type]}`}
      footer={
        canGrade ? (
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground">
              {saisies} / {convoques.length} étudiant(s) saisi(s)
            </span>
            <button className={primaryPill} onClick={save}>
              <Save className="h-4 w-4" /> Enregistrer les notes
            </button>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Consultation seule — la saisie des notes est réservée aux
            formateurs.
          </p>
        )
      }
    >
      <div className="flex flex-wrap gap-2">
        <span className={toneBadge(STATUT_EXAMEN_TONE[examen.statut])}>
          {STATUT_EXAMEN_LABEL[examen.statut]}
        </span>
        <span className={toneBadge("blue")}>{examen.composante}</span>
      </div>

      <DetailSection title="Organisation">
        <div>
          <DetailRow label="Date" value={fmtDate(examen.date)} />
          <DetailRow label="Heure" value={examen.heure} />
          <DetailRow label="Salle" value={examen.salle} />
          <DetailRow
            label="Surveillant(s)"
            value={examen.surveillants.join(", ") || "—"}
          />
          <DetailRow
            label="Effectif convoqué (promotion)"
            value={examen.etudiantsConvoques}
          />
        </div>
      </DetailSection>

      {/* The sample dataset holds a handful of students per filière, so the
          nominative list is a subset of the promotion figure above. */}
      <DetailSection title={`Liste nominative (${convoques.length})`}>
        {convoques.length ? (
          <div className="overflow-hidden rounded-2xl border border-brand/12">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-brand/12 bg-muted text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="px-3 py-2">CNE</th>
                  <th className="px-3 py-2">Étudiant</th>
                  {hasTheorique ? (
                    <th className="px-3 py-2 text-right">Théorique /20</th>
                  ) : null}
                  {hasPratique ? (
                    <th className="px-3 py-2 text-right">Pratique /20</th>
                  ) : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-brand/8">
                {convoques.map((e) => (
                  <tr key={e.id}>
                    <td className="px-3 py-2 tabular-nums text-muted-foreground">
                      {e.cne}
                    </td>
                    <td className="px-3 py-2 font-medium">
                      {e.prenom} {e.nom}
                    </td>
                    {hasTheorique ? (
                      <td className="px-3 py-2 text-right">
                        <Input
                          type="number"
                          min={0}
                          max={20}
                          step={0.25}
                          disabled={!canGrade}
                          value={notes[e.id]?.theorique ?? ""}
                          onChange={(ev) =>
                            set(e.id, "theorique", ev.target.value)
                          }
                          className={cn(softInput, "h-8 w-20 text-right")}
                        />
                      </td>
                    ) : null}
                    {hasPratique ? (
                      <td className="px-3 py-2 text-right">
                        <Input
                          type="number"
                          min={0}
                          max={20}
                          step={0.25}
                          disabled={!canGrade}
                          value={notes[e.id]?.pratique ?? ""}
                          onChange={(ev) =>
                            set(e.id, "pratique", ev.target.value)
                          }
                          className={cn(softInput, "h-8 w-20 text-right")}
                        />
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Aucun étudiant inscrit dans cette filière pour ce semestre.
          </p>
        )}
      </DetailSection>
    </DetailShell>
  );
}

/* ------------------------------------------------------------------ */
/*  Formulaire examen                                                  */
/* ------------------------------------------------------------------ */

function ExamenForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial: Examen | null;
  onSubmit: (data: Omit<Examen, "id">) => void;
  onCancel: () => void;
}) {
  const [f, setF] = useState(() => ({
    module: initial?.module ?? "",
    filiere: (initial?.filiere ?? "") as Filiere | "",
    niveau: (initial?.niveau ?? "") as Niveau | "",
    type: (initial?.type ?? "examen_theorique") as TypeExamen,
    composante: (initial?.composante ??
      "Théorique + Pratique") as Examen["composante"],
    date: initial?.date ?? "",
    heure: initial?.heure ?? "09:00",
    salle: initial?.salle ?? "",
    surveillants: initial?.surveillants.join(", ") ?? "",
    statut: (initial?.statut ?? "planifie") as StatutExamen,
    etudiantsConvoques: initial?.etudiantsConvoques ?? 30,
  }));
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => {
    setF((prev) => ({ ...prev, [k]: v }));
    setErrors((prev) => ({ ...prev, [k]: undefined }));
  };

  const submit = () => {
    const next: Record<string, string> = {};
    if (!f.module.trim()) next.module = "Module obligatoire";
    if (!f.filiere) next.filiere = "Filière obligatoire";
    if (!f.niveau) next.niveau = "Niveau obligatoire";
    if (!f.date) next.date = "Date obligatoire";
    if (!f.salle.trim()) next.salle = "Salle obligatoire";
    if (!/^\d{2}:\d{2}$/.test(f.heure)) next.heure = "Format attendu HH:MM";

    if (Object.keys(next).length) {
      setErrors(next);
      toast.error("Veuillez corriger les champs signalés");
      return;
    }

    onSubmit({
      module: f.module.trim(),
      filiere: f.filiere as Filiere,
      niveau: f.niveau as Niveau,
      type: f.type,
      composante: f.composante,
      date: f.date,
      heure: f.heure,
      salle: f.salle.trim(),
      surveillants: parseList(f.surveillants),
      statut: f.statut,
      etudiantsConvoques: Number(f.etudiantsConvoques) || 0,
    });
  };

  return (
    <FormDialog
      open
      onOpenChange={(o) => !o && onCancel()}
      wide
      title={initial ? "Modifier l'examen" : "Planifier un examen"}
      subtitle={initial ? initial.module : "Renseigner les détails de l'épreuve"}
      submitLabel={initial ? "Enregistrer les modifications" : "Planifier"}
      onSubmit={submit}
    >
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
          label="Filière"
          required
          value={f.filiere}
          onChange={(v) => set("filiere", v)}
          options={FILIERES}
          error={errors.filiere}
        />
      </FullWidth>
      <SelectField
        label="Niveau / semestre"
        required
        value={f.niveau}
        onChange={(v) => set("niveau", v)}
        options={NIVEAUX}
        error={errors.niveau}
      />
      <SelectField
        label="Type d'épreuve"
        value={f.type}
        onChange={(v) => set("type", v)}
        options={TYPES.map((t) => ({ value: t, label: TYPE_EXAMEN_LABEL[t] }))}
      />
      <SelectField
        label="Composante évaluée"
        value={f.composante}
        onChange={(v) => set("composante", v)}
        options={COMPOSANTES}
      />
      <SelectField
        label="Statut"
        value={f.statut}
        onChange={(v) => set("statut", v)}
        options={STATUTS.map((s) => ({
          value: s,
          label: STATUT_EXAMEN_LABEL[s],
        }))}
      />
      <TextField
        label="Date"
        required
        type="date"
        value={f.date}
        onChange={(v) => set("date", v)}
        error={errors.date}
      />
      <TextField
        label="Heure"
        required
        type="time"
        value={f.heure}
        onChange={(v) => set("heure", v)}
        error={errors.heure}
      />
      <TextField
        label="Salle"
        required
        value={f.salle}
        onChange={(v) => set("salle", v)}
        placeholder="Amphi A"
        error={errors.salle}
      />
      <TextField
        label="Effectif convoqué"
        type="number"
        value={String(f.etudiantsConvoques)}
        onChange={(v) => set("etudiantsConvoques", Number(v) || 0)}
      />
      <FullWidth>
        <ListField
          label="Surveillant(s)"
          value={f.surveillants}
          onChange={(v) => set("surveillants", v)}
          placeholder="S. El Idrissi, M. El Khattabi"
        />
      </FullWidth>
    </FormDialog>
  );
}

export const Route = createFileRoute("/dashboard/examens")({
  component: ExamensPage,
});
