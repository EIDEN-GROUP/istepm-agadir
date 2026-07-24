import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Eye, Download, Trash2, Upload } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { useIstpm, type NouvelEtudiant } from "@/lib/istpm-store";
import { ImportCsvDialog, type ImportColumn } from "@/components/import-csv";
import { fetchStudentSemestres } from "@/lib/istpm-api";
import {
  FILIERES,
  NIVEAUX,
  STATUT_ETUDIANT_LABEL,
  STATUT_ETUDIANT_TONE,
  STATUT_PAIEMENT_LABEL,
  STATUT_PAIEMENT_TONE,
  fmtDate,
  fmtMAD,
  type Etudiant,
  type Filiere,
  type Niveau,
  type StatutEtudiant,
  type StatutPaiement,
} from "@/lib/istpm-data";
import {
  primaryPill,
  ghostPill,
  iconButton,
  iconButtonDanger,
  toneBadge,
  avatarChip,
  initials,
  dialogSurfaceWide,
  tableRow,
  cellTruncate,
  rowActions,
  TONE_COLORS,
} from "@/lib/dash-ui";
import {
  PageHeader,
  FilterPanel,
  DataTable,
  DetailSection,
  DetailGrid,
  DetailField,
  DetailTable,
  DetailEmpty,
  DetailRow,
  DetailShell,
  ALL,
} from "@/components/dash-page";
import {
  FormDialog,
  ConfirmDialog,
  TextField,
  NumberField,
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

const STATUTS: StatutEtudiant[] = [
  "inscrit",
  "en_attente",
  "diplome",
  "abandon",
];
const STATUTS_PAIEMENT: StatutPaiement[] = [
  "paye",
  "en_attente",
  "retard",
  "impaye",
];

function EtudiantsPage() {
  const { role } = useAuth();
  const { etudiants, addEtudiant, updateEtudiant, deleteEtudiant } = useIstpm();
  // Teachers get a read-only view; student administration is the responsable's
  // and the directeur's job.
  const canEdit = role === "directeur" || role === "responsable";

  const [search, setSearch] = useState("");
  const [filiere, setFiliere] = useState<string>(ALL);
  const [niveau, setNiveau] = useState<string>(ALL);
  const [statut, setStatut] = useState<string>(ALL);

  const [detail, setDetail] = useState<Etudiant | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Etudiant | null>(null);
  const [toDelete, setToDelete] = useState<Etudiant | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return etudiants.filter((e) => {
      if (filiere !== ALL && e.filiere !== filiere) return false;
      if (niveau !== ALL && e.niveau !== niveau) return false;
      if (statut !== ALL && STATUT_ETUDIANT_LABEL[e.statut] !== statut)
        return false;
      if (!q) return true;
      return `${e.cne} ${e.matricule} ${e.prenom} ${e.nom} ${e.groupe} ${e.ville}`
        .toLowerCase()
        .includes(q);
    });
  }, [etudiants, search, filiere, niveau, statut]);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (e: Etudiant) => {
    setEditing(e);
    setFormOpen(true);
  };

  const exportCsv = () => {
    const cols = [
      "cne",
      "matricule",
      "prenom",
      "nom",
      "filiere",
      "niveau",
      "groupe",
      "statut",
      "paiement",
    ] as const;
    const rows = filtered.map((e) =>
      cols.map((c) => `"${String(e[c] ?? "")}"`).join(","),
    );
    // BOM so Excel opens the accented French headers correctly.
    const blob = new Blob(["﻿" + cols.join(",") + "\n" + rows.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "etudiants-istpm.csv";
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success(`${filtered.length} étudiant(s) exporté(s)`);
  };

  const colonnesImportEtudiants: ImportColumn[] = [
    { key: "cne", label: "CNE", required: true },
    { key: "matricule", label: "Matricule", required: true },
    { key: "prenom", label: "Prénom", required: true },
    { key: "nom", label: "Nom", required: true },
    { key: "filiere", label: "Filière", required: true },
    { key: "niveau", label: "Niveau", required: true },
    { key: "annee", label: "Année", required: true },
    { key: "groupe", label: "Groupe", required: true },
    { key: "statut", label: "Statut", required: true, aliases: ["statut étudiant"] },
    { key: "paiement", label: "Paiement", required: true, aliases: ["statut paiement", "statut_paiement"] },
    { key: "telephone", label: "Téléphone" },
    { key: "email", label: "E-mail" },
    { key: "dateNaissance", label: "Date de naissance", aliases: ["date_naissance", "date naissance"] },
    { key: "ville", label: "Ville" },
    { key: "fraisMensuels", label: "Frais mensuels", aliases: ["frais_mensuels"] },
  ];

  const STATUT_ETUDIANT_VALUES: StatutEtudiant[] = ["inscrit", "en_attente", "diplome", "abandon"];
  const STATUT_PAIEMENT_VALUES: StatutPaiement[] = ["paye", "en_attente", "retard", "impaye"];

  const matchLabel = <T extends string>(
    value: string,
    values: readonly T[],
    labels: Record<T, string>,
  ): T | null => {
    if (values.includes(value as T)) return value as T;
    for (const k of values) {
      if (labels[k].toLowerCase() === value.toLowerCase()) return k;
    }
    return null;
  };

  const validateEtudiant = (values: Record<string, string>): string[] => {
    const errs: string[] = [];
    if (!values.cne) errs.push("CNE requis");
    if (!values.matricule) errs.push("Matricule requis");
    if (!values.prenom) errs.push("Prénom requis");
    if (!values.nom) errs.push("Nom requis");
    if (!values.filiere) errs.push("Filière requise");
    else if (!FILIERES.includes(values.filiere as Filiere))
      errs.push(`Filière « ${values.filiere} » invalide`);
    if (!values.niveau) errs.push("Niveau requis");
    else if (!NIVEAUX.includes(values.niveau as Niveau))
      errs.push(`Niveau « ${values.niveau} » invalide`);
    if (!values.annee) errs.push("Année requise");
    if (!values.groupe) errs.push("Groupe requis");
    if (!values.statut) errs.push("Statut requis");
    else if (!matchLabel(values.statut, STATUT_ETUDIANT_VALUES, STATUT_ETUDIANT_LABEL))
      errs.push(`Statut « ${values.statut} » invalide`);
    if (!values.paiement) errs.push("Paiement requis");
    else if (!matchLabel(values.paiement, STATUT_PAIEMENT_VALUES, STATUT_PAIEMENT_LABEL))
      errs.push(`Paiement « ${values.paiement} » invalide`);
    if (values.fraisMensuels && isNaN(Number(values.fraisMensuels)))
      errs.push("Frais mensuels doit être un nombre");
    return errs;
  };

  const handleImportEtudiants = (rows: Record<string, string>[]) => {
    let compteur = 0;
    for (const r of rows) {
      const statut = matchLabel(r.statut, STATUT_ETUDIANT_VALUES, STATUT_ETUDIANT_LABEL) ?? "inscrit";
      const paiement = matchLabel(r.paiement, STATUT_PAIEMENT_VALUES, STATUT_PAIEMENT_LABEL) ?? "en_attente";
      const nouvel: NouvelEtudiant = {
        cne: r.cne,
        matricule: r.matricule,
        prenom: r.prenom,
        nom: r.nom,
        filiere: r.filiere as Filiere,
        niveau: r.niveau as Niveau,
        annee: r.annee,
        groupe: r.groupe,
        statut,
        paiement,
        telephone: r.telephone ?? "",
        email: r.email ?? "",
        dateNaissance: r.dateNaissance ?? "",
        ville: r.ville ?? "",
        fraisMensuels: r.fraisMensuels ? Number(r.fraisMensuels) : 0,
      };
      addEtudiant(nouvel);
      compteur++;
    }
    toast.success(`${compteur} étudiant(s) importé(s)`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Scolarité"
        title="Étudiants"
        actions={
          canEdit ? (
            <>
              <button className={cn(ghostPill, "gap-1.5")} onClick={() => setImportOpen(true)}>
                <Upload className="h-3.5 w-3.5" /> Importer
              </button>
              <button className={cn(ghostPill, "gap-1.5")} onClick={exportCsv}>
                <Download className="h-3.5 w-3.5" /> Exporter
              </button>
              <button className={primaryPill} onClick={openCreate}>
                <Plus className="h-4 w-4" /> Nouvelle inscription
              </button>
            </>
          ) : (
            <span className="rounded-full bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground">
              Consultation seule
            </span>
          )
        }
      />

      <FilterPanel
        search={search}
        onSearch={setSearch}
        placeholder="Rechercher par CNE, nom, groupe, ville…"
        filters={[
          {
            id: "filiere",
            label: "Filière",
            value: filiere,
            onChange: setFiliere,
            options: FILIERES,
            allLabel: "Toutes les filières",
          },
          {
            id: "niveau",
            label: "Semestre",
            value: niveau,
            onChange: setNiveau,
            options: NIVEAUX,
            allLabel: "Tous les semestres",
          },
          {
            id: "statut",
            label: "Statut",
            value: statut,
            onChange: setStatut,
            options: STATUTS.map((s) => STATUT_ETUDIANT_LABEL[s]),
            allLabel: "Tous les statuts",
          },
        ]}
        summary={
          <>
            <strong className="font-semibold text-foreground">
              {filtered.length}
            </strong>{" "}
            étudiant{filtered.length > 1 ? "s" : ""} sur {etudiants.length}
          </>
        }
      />

      <DataTable
        isEmpty={filtered.length === 0}
        empty="Aucun étudiant ne correspond à ces critères."
        head={
          <>
            <th>CNE</th>
            <th>Nom &amp; prénom</th>
            <th>Filière</th>
            <th className="text-center">Niveau</th>
            <th>Statut</th>
            <th>Paiement</th>
            <th className="w-28 text-center">Actions</th>
          </>
        }
      >
        {filtered.map((e, i) => (
          <motion.tr
            key={e.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.25, delay: i * 0.03, ease: "easeOut" }}
            onClick={() => setDetail(e)}
            className={tableRow}
          >
            <td
              className="border-l-[3px] font-medium tabular-nums"
              style={{
                borderLeftColor: TONE_COLORS[STATUT_PAIEMENT_TONE[e.paiement]],
              }}
            >
              {e.cne}
            </td>
            <td>
              <span className="flex items-center gap-2.5">
                <span className={avatarChip}>
                  {initials(`${e.prenom} ${e.nom}`)}
                </span>
                <span className={cn("font-medium", cellTruncate)}>
                  {e.prenom} {e.nom}
                </span>
              </span>
            </td>
            <td className={cn("text-muted-foreground", cellTruncate)}>
              {e.filiere}
            </td>
            <td className="text-center tabular-nums">{e.niveau}</td>
            <td>
              <span className={toneBadge(STATUT_ETUDIANT_TONE[e.statut])}>
                {STATUT_ETUDIANT_LABEL[e.statut]}
              </span>
            </td>
            <td>
              <span className={toneBadge(STATUT_PAIEMENT_TONE[e.paiement])}>
                {STATUT_PAIEMENT_LABEL[e.paiement]}
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
                  onClick={() => setDetail(e)}
                >
                  <Eye className="h-3.5 w-3.5" />
                </button>
                {canEdit ? (
                  <>
                    <button
                      className={iconButton}
                      aria-label="Modifier"
                      onClick={() => openEdit(e)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      className={iconButtonDanger}
                      aria-label="Supprimer"
                      onClick={() => setToDelete(e)}
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

      {/* Fiche détaillée */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className={dialogSurfaceWide}>
          <DialogTitle className="sr-only">Fiche étudiant</DialogTitle>
          <DialogDescription className="sr-only">
            Détail de l'étudiant sélectionné
          </DialogDescription>
          {detail ? (
            // Re-read from the store so the dialog reflects live edits.
            <EtudiantDetail
              e={etudiants.find((x) => x.id === detail.id) ?? detail}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      {formOpen ? (
        <EtudiantForm
          key={editing?.id ?? "new"}
          initial={editing}
          onCancel={() => setFormOpen(false)}
          onSubmit={(data) => {
            if (editing) {
              updateEtudiant(editing.id, data);
              toast.success(`Fiche mise à jour   ${data.prenom} ${data.nom}`);
            } else {
              addEtudiant(data);
              toast.success(`Étudiant inscrit   ${data.prenom} ${data.nom}`);
            }
            setFormOpen(false);
          }}
        />
      ) : null}

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Supprimer cet étudiant ?"
        message={
          toDelete
            ? `${toDelete.prenom} ${toDelete.nom} (${toDelete.cne}) sera retiré de la liste, ainsi que son bulletin et son stage. Cette action est irréversible.`
            : ""
        }
        onConfirm={() => {
          if (!toDelete) return;
          deleteEtudiant(toDelete.id);
          toast.success(`Étudiant supprimé   ${toDelete.prenom} ${toDelete.nom}`);
          setToDelete(null);
        }}
      />

      <ImportCsvDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        title="Importer des étudiants"
        description="Ajouter des étudiants en lot depuis un fichier CSV"
        columns={colonnesImportEtudiants}
        validate={validateEtudiant}
        onImport={handleImportEtudiants}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Formulaire création / édition                                      */
/* ------------------------------------------------------------------ */

type FormState = {
  cne: string;
  matricule: string;
  prenom: string;
  nom: string;
  filiere: Filiere | "";
  niveau: Niveau | "";
  annee: string;
  groupe: string;
  statut: StatutEtudiant;
  paiement: StatutPaiement;
  telephone: string;
  email: string;
  dateNaissance: string;
  ville: string;
  fraisMensuels: number | "";
};

function EtudiantForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial: Etudiant | null;
  onSubmit: (data: Omit<FormState, "fraisMensuels"> & {
    filiere: Filiere;
    niveau: Niveau;
    fraisMensuels: number;
  }) => void;
  onCancel: () => void;
}) {
  const [f, setF] = useState<FormState>(() => ({
    cne: initial?.cne ?? "",
    // Suggest a matricule in the house format for new records.
    matricule:
      initial?.matricule ??
      `ISTPM-${new Date().getFullYear().toString().slice(2)}-${String(
        Math.floor(Math.random() * 900) + 100,
      )}`,
    prenom: initial?.prenom ?? "",
    nom: initial?.nom ?? "",
    filiere: initial?.filiere ?? "",
    niveau: initial?.niveau ?? "",
    annee: initial?.annee ?? "2025/2026",
    groupe: initial?.groupe ?? "",
    statut: initial?.statut ?? "inscrit",
    paiement: initial?.paiement ?? "en_attente",
    telephone: initial?.telephone ?? "",
    email: initial?.email ?? "",
    dateNaissance: initial?.dateNaissance ?? "",
    ville: initial?.ville ?? "",
    fraisMensuels: initial?.fraisMensuels ?? 3400,
  }));
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>(
    {},
  );

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => {
    setF((prev) => ({ ...prev, [k]: v }));
    setErrors((prev) => ({ ...prev, [k]: undefined }));
  };

  const submit = () => {
    const next: Partial<Record<keyof FormState, string>> = {};
    if (!f.cne.trim()) next.cne = "CNE obligatoire";
    if (!f.prenom.trim()) next.prenom = "Prénom obligatoire";
    if (!f.nom.trim()) next.nom = "Nom obligatoire";
    if (!f.filiere) next.filiere = "Filière obligatoire";
    if (!f.niveau) next.niveau = "Niveau obligatoire";
    if (f.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email))
      next.email = "Adresse e-mail invalide";
    if (f.fraisMensuels === "" || Number(f.fraisMensuels) < 0)
      next.fraisMensuels = "Montant invalide";

    if (Object.keys(next).length) {
      setErrors(next);
      toast.error("Veuillez corriger les champs signalés");
      return;
    }

    onSubmit({
      ...f,
      filiere: f.filiere as Filiere,
      niveau: f.niveau as Niveau,
      fraisMensuels: Number(f.fraisMensuels),
    });
  };

  return (
    <FormDialog
      open
      onOpenChange={(o) => !o && onCancel()}
      wide
      title={initial ? "Modifier la fiche étudiant" : "Nouvelle inscription"}
      subtitle={
        initial
          ? `${initial.prenom} ${initial.nom}   ${initial.cne}`
          : "Renseigner les informations de l'étudiant"
      }
      submitLabel={initial ? "Enregistrer les modifications" : "Inscrire"}
      onSubmit={submit}
    >
      <TextField
        label="CNE"
        required
        value={f.cne}
        onChange={(v) => set("cne", v)}
        placeholder="G134567890"
        error={errors.cne}
      />
      <TextField
        label="Matricule"
        value={f.matricule}
        onChange={(v) => set("matricule", v)}
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
      <TextField
        label="Groupe"
        value={f.groupe}
        onChange={(v) => set("groupe", v)}
        placeholder="G1"
      />
      <SelectField
        label="Statut"
        value={f.statut}
        onChange={(v) => set("statut", v)}
        options={STATUTS.map((s) => ({
          value: s,
          label: STATUT_ETUDIANT_LABEL[s],
        }))}
      />
      <SelectField
        label="Statut de paiement"
        value={f.paiement}
        onChange={(v) => set("paiement", v)}
        options={STATUTS_PAIEMENT.map((s) => ({
          value: s,
          label: STATUT_PAIEMENT_LABEL[s],
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
      <TextField
        label="Date de naissance"
        type="date"
        value={f.dateNaissance}
        onChange={(v) => set("dateNaissance", v)}
      />
      <TextField
        label="Ville"
        value={f.ville}
        onChange={(v) => set("ville", v)}
        placeholder="Agadir"
      />
      <TextField
        label="Année universitaire"
        value={f.annee}
        onChange={(v) => set("annee", v)}
      />
      <NumberField
        label="Frais mensuels"
        required
        suffix="MAD"
        min={0}
        value={f.fraisMensuels}
        onChange={(v) => set("fraisMensuels", v)}
        error={errors.fraisMensuels}
      />
    </FormDialog>
  );
}

/* ------------------------------------------------------------------ */
/*  Historique des semestres                                           */
/* ------------------------------------------------------------------ */

type SemestreResume = {
  semestre: Niveau;
  modules: { module: string; note: number }[];
  moyenne: number;
  resultat: "Admis" | "Rattrapage" | "Ajourné";
};

/** Petit hash déterministe à partir d'une chaîne (pour des données stables). */
function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/**
 * Reconstitue un historique des semestres passés pour un étudiant.
 *
 * Le modèle de données ne conserve pas les relevés antérieurs : cet aperçu est
 * dérivé de façon déterministe du niveau courant et de la moyenne de l'étudiant,
 * pour illustrer la section « Historique des semestres ». Il devra être
 * remplacé par les relevés réels une fois exposés par le backend.
 */
function historiqueSemestres(e: Etudiant): SemestreResume[] {
  const idx = NIVEAUX.indexOf(e.niveau);
  if (idx <= 0) return [];
  const base = e.moyenne > 0 ? e.moyenne : 12;
  const modulesTypes = [
    "Sciences fondamentales",
    "Enseignement clinique",
    "Communication professionnelle",
    "Travaux pratiques",
  ];
  const out: SemestreResume[] = [];
  for (let i = 0; i < idx; i += 1) {
    const semestre = NIVEAUX[i];
    const modules = modulesTypes.map((module, j) => {
      const seed = hashStr(`${e.cne}-${semestre}-${j}`);
      const variation = ((seed % 60) - 25) / 10; // -2.5 … +3.4
      const note = Math.min(19, Math.max(6, Math.round((base + variation) * 4) / 4));
      return { module, note };
    });
    const moyenne =
      Math.round(
        (modules.reduce((s, m) => s + m.note, 0) / modules.length) * 100,
      ) / 100;
    const resultat =
      moyenne >= 12 ? "Admis" : moyenne >= 10 ? "Rattrapage" : "Ajourné";
    out.push({ semestre, modules, moyenne, resultat });
  }
  return out;
}

const RESULTAT_TONE = {
  Admis: "teal" as const,
  Rattrapage: "amber" as const,
  Ajourné: "red" as const,
};

function EtudiantDetail({ e }: { e: Etudiant }) {
  const moisValues = Object.values(e.paiementsMensuels ?? {});
  const moisPayes = moisValues.filter((v) => v === "paye").length;
  const moisTotal = moisValues.length || 10;
  const [semestres, setSemestres] = useState<SemestreResume[]>(() => historiqueSemestres(e));
  useEffect(() => {
    fetchStudentSemestres(e.id)
      .then((data) => setSemestres(data as SemestreResume[]))
      .catch(() => {});
  }, [e.id]);

  return (
    <DetailShell
      icon={initials(`${e.prenom} ${e.nom}`)}
      title={`${e.prenom} ${e.nom}`}
      subtitle={`${e.cne} · ${e.filiere}`}
      badges={
        <>
          <span className={toneBadge(STATUT_ETUDIANT_TONE[e.statut])}>
            {STATUT_ETUDIANT_LABEL[e.statut]}
          </span>
          <span className={toneBadge(STATUT_PAIEMENT_TONE[e.paiement])}>
            {STATUT_PAIEMENT_LABEL[e.paiement]}
          </span>
          <span className={toneBadge(e.moyenne < 10 ? "red" : "teal")}>
            {e.moyenne > 0 ? `Moyenne ${e.moyenne.toFixed(2)}/20` : "Sans note"}
          </span>
        </>
      }
    >
      <DetailSection title="Scolarité">
        <DetailGrid>
          <DetailField label="Matricule" value={e.matricule} />
          <DetailField label="Filière" value={e.filiere} />
          <DetailField label="Niveau" value={e.niveau} />
          <DetailField label="Groupe" value={e.groupe} />
          <DetailField label="Année universitaire" value={e.annee} />
          <DetailField
            label="Moyenne générale"
            value={e.moyenne > 0 ? `${e.moyenne.toFixed(2)} / 20` : " "}
            tone={e.moyenne > 0 && e.moyenne < 10 ? "negative" : "positive"}
          />
        </DetailGrid>
      </DetailSection>

      <DetailSection title="Coordonnées">
        <DetailGrid>
          <DetailField
            label="Date de naissance"
            value={fmtDate(e.dateNaissance)}
          />
          <DetailField label="Ville" value={e.ville} />
          <DetailField label="Téléphone" value={e.telephone} />
          <DetailField label="E-mail" value={e.email} />
        </DetailGrid>
      </DetailSection>

      <DetailSection title="Stage en cours">
        {e.stageEnCours ? (
          <DetailEmpty>{e.stageEnCours}</DetailEmpty>
        ) : (
          <DetailEmpty>Aucun stage en cours.</DetailEmpty>
        )}
      </DetailSection>

      <DetailSection title="Notes par module">
        {e.notes.length ? (
          <DetailTable
            head={
              <>
                <th className="px-3 py-2">Module</th>
                <th className="px-3 py-2 text-right">Note</th>
                <th className="px-3 py-2 text-right">Coef.</th>
                <th className="px-3 py-2 text-right">Crédits</th>
              </>
            }
          >
            {e.notes.map((n) => (
              <tr key={n.module}>
                <td className="px-3 py-2">{n.module}</td>
                <td
                  className={cn(
                    "px-3 py-2 text-right font-semibold tabular-nums",
                    n.note < 10 ? "text-alert" : "text-brand-dk",
                  )}
                >
                  {n.note.toFixed(2)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                  {n.coef}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                  {n.credits}
                </td>
              </tr>
            ))}
          </DetailTable>
        ) : (
          <DetailEmpty>Aucune note saisie pour ce semestre.</DetailEmpty>
        )}
      </DetailSection>

      <DetailSection title="Historique des semestres">
        {semestres.length ? (
          <DetailTable
            head={
              <>
                <th className="px-3 py-2">Semestre</th>
                <th className="px-3 py-2">Modules</th>
                <th className="px-3 py-2">Notes</th>
                <th className="px-3 py-2 text-right">Moyenne</th>
                <th className="px-3 py-2">Résultat</th>
              </>
            }
          >
            {semestres.map((s) => (
              <tr key={s.semestre}>
                <td className="px-3 py-2 font-medium">{s.semestre}</td>
                <td className="px-3 py-2 text-muted-foreground">
                  {s.modules.length} modules
                </td>
                <td className="px-3 py-2 text-muted-foreground">
                  {s.modules
                    .map((m) => `${m.module.split(" ")[0]} ${m.note.toFixed(1)}`)
                    .join(" · ")}
                </td>
                <td
                  className={cn(
                    "px-3 py-2 text-right font-semibold tabular-nums",
                    s.moyenne < 10 ? "text-alert" : "text-brand-dk",
                  )}
                >
                  {s.moyenne.toFixed(2)}
                </td>
                <td className="px-3 py-2">
                  <span className={toneBadge(RESULTAT_TONE[s.resultat])}>
                    {s.resultat}
                  </span>
                </td>
              </tr>
            ))}
          </DetailTable>
        ) : (
          <DetailEmpty>
            Aucun semestre antérieur   l'étudiant est en première période.
          </DetailEmpty>
        )}
      </DetailSection>

      <DetailSection title="Situation financière">
        <DetailGrid single>
          <DetailField label="Frais mensuels" value={fmtMAD(e.fraisMensuels)} />
          <DetailField
            label="Mois réglés"
            value={`${moisPayes} / ${moisTotal}`}
            tone={moisPayes < moisTotal ? "negative" : "positive"}
          />
        </DetailGrid>

        <div
          className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-brand/12"
          role="img"
          aria-label={`${moisPayes} mois payés sur ${moisTotal}`}
        >
          <div
            className={cn(
              "h-full rounded-full transition-all",
              moisPayes < moisTotal ? "bg-warn" : "bg-brand",
            )}
            style={{
              width: `${Math.min(100, Math.max(0, (moisPayes / moisTotal) * 100))}%`,
            }}
          />
        </div>

        {e.historique.length ? (
          <DetailTable
            head={
              <>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Période</th>
                <th className="px-3 py-2">Mode</th>
                <th className="px-3 py-2 text-right">Montant</th>
                <th className="px-3 py-2">Statut</th>
              </>
            }
          >
            {e.historique.map((h) => (
              <tr key={h.recu}>
                <td className="whitespace-nowrap px-3 py-2">
                  {fmtDate(h.date)}
                </td>
                <td className="px-3 py-2 text-muted-foreground">{h.periode}</td>
                <td className="px-3 py-2 text-muted-foreground">{h.mode}</td>
                <td className="px-3 py-2 text-right font-medium tabular-nums">
                  {fmtMAD(h.montant)}
                </td>
                <td className="px-3 py-2">
                  <span className={toneBadge(STATUT_PAIEMENT_TONE[h.statut])}>
                    {STATUT_PAIEMENT_LABEL[h.statut]}
                  </span>
                </td>
              </tr>
            ))}
          </DetailTable>
        ) : (
          <DetailEmpty>Aucun paiement enregistré.</DetailEmpty>
        )}
      </DetailSection>
    </DetailShell>
  );
}

export const Route = createFileRoute("/dashboard/etudiants")({
  component: EtudiantsPage,
});
