import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Pencil, Eye, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { useIstpm } from "@/lib/istpm-store";
import {
  FILIERES,
  GRADE_LABEL,
  STATUT_FORMATEUR_LABEL,
  STATUT_FORMATEUR_TONE,
  type Formateur,
  type Filiere,
  type GradeFormateur,
  type StatutFormateur,
} from "@/lib/istpm-data";
import {
  primaryPill,
  iconButton,
  iconButtonDanger,
  toneBadge,
  avatarChip,
  initials,
  dialogSurface,
  tableRow,
  cellTruncate,
  rowActions,
} from "@/lib/dash-ui";
import {
  PageHeader,
  FilterPanel,
  DataTable,
  DetailSection,
  DetailGrid,
  DetailField,
  DetailEmpty,

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
import { cn } from "@/lib/utils";

const GRADES: GradeFormateur[] = ["PES", "vacataire", "formateur_clinique"];
const STATUTS: StatutFormateur[] = ["permanent", "vacataire", "en_conge"];

function FormateursPage() {
  const { role } = useAuth();
  const { formateurs, addFormateur, updateFormateur, deleteFormateur } =
    useIstpm();
  const canEdit = role === "directeur" || role === "responsable";

  const [search, setSearch] = useState("");
  const [departement, setDepartement] = useState<string>(ALL);
  const [grade, setGrade] = useState<string>(ALL);

  const [detail, setDetail] = useState<Formateur | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Formateur | null>(null);
  const [toDelete, setToDelete] = useState<Formateur | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return formateurs.filter((f) => {
      if (departement !== ALL && f.departement !== departement) return false;
      if (grade !== ALL && GRADE_LABEL[f.grade] !== grade) return false;
      if (!q) return true;
      return `${f.matricule} ${f.cin} ${f.prenom} ${f.nom} ${f.modules.join(" ")} ${f.groupes.join(" ")}`
        .toLowerCase()
        .includes(q);
    });
  }, [formateurs, search, departement, grade]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Corps enseignant"
        title="Formateurs"
        actions={
          canEdit ? (
            <button
              className={primaryPill}
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus className="h-4 w-4" /> Ajouter un formateur
            </button>
          ) : null
        }
      />

      <FilterPanel
        search={search}
        onSearch={setSearch}
        placeholder="Rechercher par matricule, CIN, nom, module, groupe…"
        filters={[
          {
            id: "departement",
            label: "Département",
            value: departement,
            onChange: setDepartement,
            options: FILIERES,
            allLabel: "Tous les départements",
          },
          {
            id: "grade",
            label: "Grade",
            value: grade,
            onChange: setGrade,
            options: GRADES.map((g) => GRADE_LABEL[g]),
            allLabel: "Tous les grades",
          },
        ]}
      />

      <DataTable
        isEmpty={filtered.length === 0}
        empty="Aucun formateur ne correspond à ces critères."
        head={
          <>
            <th>Matricule</th>
            <th>Nom &amp; prénom</th>
            <th>Grade</th>
            <th>Département</th>
            <th className="text-center">Modules</th>
            <th>Statut</th>
            <th className="w-28 text-center">Actions</th>
          </>
        }
      >
        {filtered.map((f, i) => (
          <motion.tr
            key={f.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.25, delay: i * 0.03, ease: "easeOut" }}
            onClick={() => setDetail(f)}
            className={tableRow}
          >
            <td className="font-medium tabular-nums">{f.matricule}</td>
            <td>
              <span className="flex items-center gap-2.5">
                <span className={avatarChip}>
                  {initials(`${f.prenom} ${f.nom}`)}
                </span>
                <span className={cn("font-medium", cellTruncate)}>
                  {f.prenom} {f.nom}
                </span>
              </span>
            </td>
            <td className="text-muted-foreground">{GRADE_LABEL[f.grade]}</td>
            <td className={cn("text-muted-foreground", cellTruncate)}>
              {f.departement}
            </td>
            <td className="text-center font-medium tabular-nums">
              {f.modules.length}
            </td>
            <td>
              <span className={toneBadge(STATUT_FORMATEUR_TONE[f.statut])}>
                {STATUT_FORMATEUR_LABEL[f.statut]}
              </span>
            </td>
            <td
              className="text-center"
              onClick={(ev) => ev.stopPropagation()}
            >
              <div className={rowActions}>
                <button
                  className={iconButton}
                  aria-label="Voir la fiche"
                  onClick={() => setDetail(f)}
                >
                  <Eye className="h-3.5 w-3.5" />
                </button>
                {canEdit ? (
                  <>
                    <button
                      className={iconButton}
                      aria-label="Modifier"
                      onClick={() => {
                        setEditing(f);
                        setFormOpen(true);
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      className={iconButtonDanger}
                      aria-label="Supprimer"
                      onClick={() => setToDelete(f)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </>
                ) : null}
              </div>
            </td>
          </motion.tr>
        ))}
      </DataTable>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className={dialogSurface}>
          <DialogTitle className="sr-only">Fiche formateur</DialogTitle>
          <DialogDescription className="sr-only">
            Détail du formateur sélectionné
          </DialogDescription>
          {detail
            ? (() => {
                const f = formateurs.find((x) => x.id === detail.id) ?? detail;
                return (
                  <DetailShell
                    icon={initials(`${f.prenom} ${f.nom}`)}
                    title={`${f.prenom} ${f.nom}`}
                    subtitle={`${f.matricule} · ${f.departement}`}
                    badges={
                      <>
                        <span
                          className={toneBadge(STATUT_FORMATEUR_TONE[f.statut])}
                        >
                          {STATUT_FORMATEUR_LABEL[f.statut]}
                        </span>
                        <span className={toneBadge("neutral")}>
                          {GRADE_LABEL[f.grade]}
                        </span>
                        <span className={toneBadge("blue")}>
                          {f.notesSaisies} notes saisies
                        </span>
                      </>
                    }
                  >
                    <DetailSection title="Identité">
                      <DetailGrid>
                        <DetailField label="Matricule" value={f.matricule} />
                        <DetailField label="CIN" value={f.cin} />
                        <DetailField
                          label="Grade"
                          value={GRADE_LABEL[f.grade]}
                        />
                        <DetailField
                          label="Département / filière"
                          value={f.departement}
                        />
                      </DetailGrid>
                    </DetailSection>

                    <DetailSection title="Contact">
                      <DetailGrid>
                        <DetailField label="Téléphone" value={f.telephone} />
                        <DetailField label="E-mail" value={f.email} />
                      </DetailGrid>
                    </DetailSection>

                    <DetailSection
                      title={`Modules enseignés (${f.modules.length})`}
                    >
                      {f.modules.length ? (
                        <ul className="grid gap-1.5 sm:grid-cols-2">
                          {f.modules.map((m) => (
                            <li
                              key={m}
                              className="rounded-xl border border-brand/12 bg-muted px-3 py-2 text-sm text-foreground"
                            >
                              {m}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <DetailEmpty>Aucun module affecté.</DetailEmpty>
                      )}
                    </DetailSection>

                    <DetailSection title={`Groupes (${f.groupes.length})`}>
                      {f.groupes.length ? (
                        <div className="flex flex-wrap gap-2">
                          {f.groupes.map((g) => (
                            <span
                              key={g}
                              className="rounded-full bg-brand/12 px-3 py-1.5 text-xs font-semibold text-brand-dk"
                            >
                              {g}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <DetailEmpty>Aucun groupe affecté.</DetailEmpty>
                      )}
                    </DetailSection>
                  </DetailShell>
                );
              })()
            : null}
        </DialogContent>
      </Dialog>

      {formOpen ? (
        <FormateurForm
          key={editing?.id ?? "new"}
          initial={editing}
          onCancel={() => setFormOpen(false)}
          onSubmit={(data) => {
            if (editing) {
              updateFormateur(editing.id, data);
              toast.success(`Fiche mise à jour   ${data.prenom} ${data.nom}`);
            } else {
              addFormateur(data);
              toast.success(`Formateur ajouté   ${data.prenom} ${data.nom}`);
            }
            setFormOpen(false);
          }}
        />
      ) : null}

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Supprimer ce formateur ?"
        message={
          toDelete
            ? `${toDelete.prenom} ${toDelete.nom} (${toDelete.matricule}) sera retiré du corps enseignant. Cette action est irréversible.`
            : ""
        }
        onConfirm={() => {
          if (!toDelete) return;
          deleteFormateur(toDelete.id);
          toast.success(
            `Formateur supprimé   ${toDelete.prenom} ${toDelete.nom}`,
          );
          setToDelete(null);
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */

function FormateurForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial: Formateur | null;
  onSubmit: (data: {
    matricule: string;
    cin: string;
    prenom: string;
    nom: string;
    grade: GradeFormateur;
    departement: Filiere;
    modules: string[];
    groupes: string[];
    statut: StatutFormateur;
    telephone: string;
    email: string;
  }) => void;
  onCancel: () => void;
}) {
  const [f, setF] = useState(() => ({
    matricule:
      initial?.matricule ??
      `ENS-${String(Math.floor(Math.random() * 900) + 100)}`,
    cin: initial?.cin ?? "",
    prenom: initial?.prenom ?? "",
    nom: initial?.nom ?? "",
    grade: (initial?.grade ?? "PES") as GradeFormateur,
    departement: (initial?.departement ?? "") as Filiere | "",
    modules: initial?.modules.join(", ") ?? "",
    groupes: initial?.groupes.join(", ") ?? "",
    statut: (initial?.statut ?? "permanent") as StatutFormateur,
    telephone: initial?.telephone ?? "",
    email: initial?.email ?? "",
  }));
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => {
    setF((prev) => ({ ...prev, [k]: v }));
    setErrors((prev) => ({ ...prev, [k]: undefined }));
  };

  const submit = () => {
    const next: Record<string, string> = {};
    if (!f.prenom.trim()) next.prenom = "Prénom obligatoire";
    if (!f.nom.trim()) next.nom = "Nom obligatoire";
    if (!f.cin.trim()) next.cin = "CIN obligatoire";
    else if (!/^[A-Za-z]{1,2}\d{1,6}$/.test(f.cin.trim()))
      next.cin = "Format CIN invalide (ex. JB145872)";
    if (!f.departement) next.departement = "Département obligatoire";
    if (f.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email))
      next.email = "Adresse e-mail invalide";
    if (!parseList(f.modules).length)
      next.modules = "Au moins un module est requis";

    if (Object.keys(next).length) {
      setErrors(next);
      toast.error("Veuillez corriger les champs signalés");
      return;
    }

    onSubmit({
      matricule: f.matricule,
      cin: f.cin.trim().toUpperCase(),
      prenom: f.prenom,
      nom: f.nom,
      grade: f.grade,
      departement: f.departement as Filiere,
      modules: parseList(f.modules),
      groupes: parseList(f.groupes),
      statut: f.statut,
      telephone: f.telephone,
      email: f.email,
    });
  };

  return (
    <FormDialog
      open
      onOpenChange={(o) => !o && onCancel()}
      wide
      title={initial ? "Modifier la fiche formateur" : "Nouveau formateur"}
      subtitle={
        initial
          ? `${initial.prenom} ${initial.nom}   ${initial.matricule}`
          : "Renseigner les informations du formateur"
      }
      submitLabel={initial ? "Enregistrer les modifications" : "Ajouter"}
      onSubmit={submit}
    >
      <TextField
        label="Matricule"
        value={f.matricule}
        onChange={(v) => set("matricule", v)}
      />
      <TextField
        label="CIN"
        required
        value={f.cin}
        onChange={(v) => set("cin", v)}
        placeholder="JB145872"
        error={errors.cin}
      />
      <TextField
        label="Prénom"
        required
        value={f.prenom}
        onChange={(v) => set("prenom", v)}
        error={errors.prenom}
      />
      <TextField
        label="Nom"
        required
        value={f.nom}
        onChange={(v) => set("nom", v)}
        error={errors.nom}
      />
      <FullWidth>
        <SelectField
          label="Département / filière"
          required
          value={f.departement}
          onChange={(v) => set("departement", v)}
          options={FILIERES}
          error={errors.departement}
        />
      </FullWidth>
      <FullWidth>
        <ListField
          label="Modules enseignés"
          value={f.modules}
          onChange={(v) => set("modules", v)}
          placeholder="Soins infirmiers en médecine, Hygiène hospitalière"
          error={errors.modules}
        />
      </FullWidth>
      <FullWidth>
        <ListField
          label="Groupes"
          value={f.groupes}
          onChange={(v) => set("groupes", v)}
          placeholder="S5-G1, S1-B"
        />
      </FullWidth>
      <SelectField
        label="Grade"
        value={f.grade}
        onChange={(v) => set("grade", v)}
        options={GRADES.map((g) => ({ value: g, label: GRADE_LABEL[g] }))}
      />
      <SelectField
        label="Statut"
        value={f.statut}
        onChange={(v) => set("statut", v)}
        options={STATUTS.map((s) => ({
          value: s,
          label: STATUT_FORMATEUR_LABEL[s],
        }))}
      />
      <TextField
        label="Téléphone"
        value={f.telephone}
        onChange={(v) => set("telephone", v)}
        placeholder="06 12 34 56 78"
      />
      <TextField
        label="E-mail"
        type="email"
        value={f.email}
        onChange={(v) => set("email", v)}
        error={errors.email}
      />
    </FormDialog>
  );
}

export const Route = createFileRoute("/dashboard/formateurs")({
  component: FormateursPage,
});
