import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Eye,
  Save,
  Pencil,
  Trash2,
  Download,
  FileText,
  FileWarning,
  ClipboardList,
  PenLine,
  Lock,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useAuth, DEMO_FORMATEUR_ID } from "@/lib/auth";
import { deleteNote } from "@/lib/istpm-api";
import { useIstpm, useCurrentFormateur, moyennePonderee } from "@/lib/istpm-store";
import {
  FILIERES,
  NIVEAUX,
  ANNEES_UNIVERSITAIRES,
  ANNEES_ETUDE,
  anneeEtude,
  DUREES_EXAMEN,
  TYPE_EXAMEN_LABEL,
  STATUT_EXAMEN_LABEL,
  STATUT_EXAMEN_TONE,
  fmtDate,
  fmtDuree,
  fmtTaille,
  type Examen,
  type Filiere,
  type Niveau,
  type TypeExamen,
  type StatutExamen,
  type Formateur,
} from "@/lib/istpm-data";
import {
  ACCEPTED_DOC_TYPES,
  downloadDoc,
  previewUrl,
} from "@/lib/doc-store";
import {
  softCard,
  primaryPill,
  ghostPill,
  iconButton,
  iconButtonDanger,
  toneBadge,
  dialogSurface,
  dialogSurfaceWide,
  tableRow,
  cellTruncate,
  rowActions,
  softInput,
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
import { usePagination, TablePagination } from "@/components/table-pagination";
import {
  FormDialog,
  ConfirmDialog,
  TextField,
  SelectField,
  ComboBoxField,
  ListField,
  FileField,
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
import { DashTabs } from "@/components/dash-tabs";
import { cn } from "@/lib/utils";

const TYPES: TypeExamen[] = [
  "controle_continu",
  "examen_theorique",
  "evaluation_pratique",
  "rattrapage",
];
const STATUTS: StatutExamen[] = ["planifie", "en_cours", "notes_saisies"];
const COMPOSANTES = ["Théorique", "Pratique", "Théorique + Pratique"] as const;
/** Filtre « le sujet est-il déposé ? »   les libellés servent aussi de valeur. */
const ETAT_SUJET = ["Déposé", "Manquant"] as const;

/* ------------------------------------------------------------------ */
/*  Helpers partagés                                                   */
/* ------------------------------------------------------------------ */

function nomFormateur(formateurs: Formateur[], id: string) {
  const f = formateurs.find((x) => x.id === id);
  return f ? `${f.prenom} ${f.nom}` : " ";
}

/** Pastille d'état du sujet déposé. */
function DocumentBadge({ examen }: { examen: Examen }) {
  return examen.document ? (
    <span className={toneBadge("teal")}>Déposé</span>
  ) : (
    <span className={toneBadge("amber")}>Manquant</span>
  );
}

/** Boutons « Voir » / « Télécharger », désactivés sans document. */
function DocumentActions({
  examen,
  onPreview,
}: {
  examen: Examen;
  onPreview: (e: Examen) => void;
}) {
  const doc = examen.document;
  return (
    <div className="flex items-center justify-center gap-1">
      <button
        className={iconButton}
        aria-label="Voir le document"
        disabled={!doc}
        onClick={() => onPreview(examen)}
      >
        <Eye className="h-3.5 w-3.5" />
      </button>
      <button
        className={iconButton}
        aria-label="Télécharger le document"
        disabled={!doc}
        onClick={async () => {
          if (!doc) return;
          const ok = await downloadDoc(doc.id, doc.nom);
          if (ok) toast.success(`Téléchargement   ${doc.nom}`);
          else toast.error("Fichier introuvable dans ce navigateur");
        }}
      >
        <Download className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

/**
 * Aperçu intégré du sujet.
 *
 * Le document est rendu dans une `iframe` plutôt qu'ouvert via `window.open` :
 * l'URL objet n'est disponible qu'après un `await`, moment où le geste
 * utilisateur est perdu et où les bloqueurs de fenêtres interviennent.
 */
function DocumentPreview({
  examen,
  onClose,
}: {
  examen: Examen | null;
  onClose: () => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "missing">("loading");
  const doc = examen?.document;

  useEffect(() => {
    if (!doc) return;
    // `cancelled` couvre le cas où le dialogue se ferme avant la résolution :
    // sans lui, l'URL créée après le démontage ne serait jamais révoquée.
    let cancelled = false;
    let created: string | null = null;
    setState("loading");

    previewUrl(doc.id).then((u) => {
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
  }, [doc]);

  const isPdf = doc?.mime === "application/pdf";

  return (
    <Dialog open={!!examen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className={dialogSurfaceWide}>
        <DialogTitle className="sr-only">Aperçu du sujet</DialogTitle>
        <DialogDescription className="sr-only">
          Document d'examen déposé
        </DialogDescription>
        {examen && doc ? (
          <DetailShell
            title={doc.nom}
            subtitle={`${examen.titre} · déposé le ${fmtDate(doc.uploadedAt)} · ${fmtTaille(doc.taille)}`}
            footer={
              <div className="flex items-center justify-end gap-2">
                <button
                  className={cn(ghostPill, "gap-1.5")}
                  onClick={async () => {
                    const ok = await downloadDoc(doc.id, doc.nom);
                    if (ok) toast.success(`Téléchargement   ${doc.nom}`);
                    else toast.error("Fichier introuvable");
                  }}
                >
                  <Download className="h-3.5 w-3.5" /> Télécharger
                </button>
              </div>
            }
          >
            {state === "loading" ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Chargement du document…
              </p>
            ) : state === "missing" ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <FileWarning className="h-8 w-8 text-warn" />
                <p className="text-sm font-medium text-foreground">
                  Fichier indisponible
                </p>
                <p className="max-w-sm text-xs text-muted-foreground">
                  Les fichiers sont stockés dans ce navigateur. Ce document a
                  été déposé depuis un autre appareil ou son stockage a été vidé.
                </p>
              </div>
            ) : isPdf && url ? (
              <iframe
                src={url}
                title={doc.nom}
                className="h-[55vh] w-full rounded-2xl border border-brand/12"
              />
            ) : (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <FileText className="h-8 w-8 text-brand" />
                <p className="text-sm font-medium text-foreground">
                  Aperçu indisponible pour ce format
                </p>
                <p className="text-xs text-muted-foreground">
                  Les documents Word ne s'affichent pas dans le navigateur  
                  utilisez « Télécharger ».
                </p>
              </div>
            )}
          </DetailShell>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

/** Fiche descriptive commune aux deux espaces. */
function InfosExamen({
  examen,
  formateurs,
}: {
  examen: Examen;
  formateurs: Formateur[];
}) {
  return (
    <>
      <DetailSection title="Épreuve">
        <DetailGrid>
          <DetailField label="Module" value={examen.module} full />
          <DetailField label="Filière" value={examen.filiere} full />
          <DetailField label="Groupe" value={examen.classe} />
          <DetailField label="Semestre" value={examen.niveau} />
          <DetailField
            label="Année universitaire"
            value={examen.anneeUniversitaire}
          />
          <DetailField label="Type" value={TYPE_EXAMEN_LABEL[examen.type]} />
        </DetailGrid>
      </DetailSection>

      <DetailSection title="Organisation">
        <DetailGrid>
          <DetailField label="Date" value={fmtDate(examen.date)} />
          <DetailField label="Heure" value={examen.heure} />
          <DetailField label="Durée" value={fmtDuree(examen.duree)} />
          <DetailField label="Salle" value={examen.salle} />
          <DetailField
            label="Effectif convoqué"
            value={examen.etudiantsConvoques}
          />
          <DetailField
            label="Créé par"
            value={nomFormateur(formateurs, examen.createdBy)}
          />
          <DetailField
            label="Surveillant(s)"
            value={examen.surveillants.join(", ")}
            full
          />
        </DetailGrid>
      </DetailSection>

      {examen.description ? (
        <DetailSection title="Description">
          <DetailEmpty>{examen.description}</DetailEmpty>
        </DetailSection>
      ) : null}

      <DetailSection title="Sujet d'examen">
        {examen.document ? (
          <div className="flex items-center gap-3 rounded-2xl border border-brand/15 bg-brand/5 px-4 py-3">
            <FileText className="h-5 w-5 shrink-0 text-brand" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">
                {examen.document.nom}
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {fmtTaille(examen.document.taille)} · déposé le{" "}
                {fmtDate(examen.document.uploadedAt)}
              </p>
            </div>
          </div>
        ) : (
          <DetailEmpty tone="warn">
            Aucun sujet déposé pour cet examen.
          </DetailEmpty>
        )}
      </DetailSection>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Aiguillage                                                         */
/* ------------------------------------------------------------------ */

function ExamensPage() {
  const { role } = useAuth();
  return role === "directeur" ? <EspaceDirecteur /> : <EspaceFormateur />;
}

/* ------------------------------------------------------------------ */
/*  Espace formateur   mes examens, création / édition / dépôt         */
/* ------------------------------------------------------------------ */

function EspaceFormateur() {
  const {
    examens,
    formateurs,
    addExamen,
    updateExamen,
    deleteExamen,
    attachDocument,
    removeDocument,
  } = useIstpm();

  // Le formateur connecté : ses examens seulement. Résolu depuis le profil
  // sélectionné (référentiel hydraté), avec repli sur le formateur de démo.
  const moi = useCurrentFormateur();
  const moiId = moi?.id ?? DEMO_FORMATEUR_ID;

  const [search, setSearch] = useState("");
  const [type, setType] = useState<string>(ALL);
  const [niveau, setNiveau] = useState<string>(ALL);
  const [sujet, setSujet] = useState<string>(ALL);

  const [detail, setDetail] = useState<Examen | null>(null);
  const [preview, setPreview] = useState<Examen | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Examen | null>(null);
  const [toDelete, setToDelete] = useState<Examen | null>(null);
  // 0 = liste des examens · 1 = saisie des notes
  const [tab, setTab] = useState(0);

  const mesExamens = useMemo(
    () => examens.filter((x) => x.createdBy === moiId),
    [examens, moiId],
  );

  const aNoter = useMemo(
    () => mesExamens.filter((x) => x.statut !== "notes_saisies").length,
    [mesExamens],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return mesExamens.filter((x) => {
      if (type !== ALL && TYPE_EXAMEN_LABEL[x.type] !== type) return false;
      if (niveau !== ALL && x.niveau !== niveau) return false;
      if (sujet !== ALL && (sujet === "Déposé") !== !!x.document) return false;
      if (!q) return true;
      return `${x.titre} ${x.module} ${x.classe} ${x.salle}`
        .toLowerCase()
        .includes(q);
    });
  }, [mesExamens, search, type, niveau, sujet]);

  const pager = usePagination(filtered, `${search}|${type}|${niveau}|${sujet}`);

  const sansSujet = mesExamens.filter((x) => !x.document).length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Espace formateur"
        title="Examens"
        actions={
          tab === 0 ? (
            <>
              {sansSujet ? (
                <span className="rounded-full bg-warn-pale px-3 py-1.5 text-xs font-medium text-warn">
                  {sansSujet} sans sujet déposé
                </span>
              ) : null}
              <button
                className={primaryPill}
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
                <Plus className="h-4 w-4" /> Nouvel examen
              </button>
            </>
          ) : null
        }
      />

      <p className="text-xs text-muted-foreground">
        {moi ? `${moi.prenom} ${moi.nom} · ${moi.departement}` : null}
      </p>

      <DashTabs
        tabs={[
          { label: "Mes examens", short: "Examens", icon: ClipboardList },
          {
            label: "Saisie des notes",
            short: "Notes",
            icon: PenLine,
            badge: aNoter,
          },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 0 ? (
      <>
      <FilterPanel
        search={search}
        onSearch={setSearch}
        placeholder="Rechercher par titre, module, groupe, salle…"
        filters={[
          {
            id: "type",
            label: "Type d'examen",
            value: type,
            onChange: setType,
            options: TYPES.map((t) => TYPE_EXAMEN_LABEL[t]),
            allLabel: "Tous les types",
          },
          {
            id: "semestre",
            label: "Semestre",
            value: niveau,
            onChange: setNiveau,
            options: NIVEAUX,
            allLabel: "Tous les semestres",
          },
          {
            id: "sujet",
            label: "Sujet déposé",
            value: sujet,
            onChange: setSujet,
            options: ETAT_SUJET,
            allLabel: "Tous les sujets",
          },
        ]}
        summary={
          <>
            <strong className="font-semibold text-foreground">
              {filtered.length}
            </strong>{" "}
            examen(s) sur {mesExamens.length} créé(s)
          </>
        }
      />

      <DataTable
        minWidth="min-w-[1100px]"
        isEmpty={filtered.length === 0}
        empty={
          mesExamens.length === 0
            ? "Vous n'avez pas encore créé d'examen."
            : "Aucun examen ne correspond à ces critères."
        }
        footer={
          <TablePagination
            page={pager.page}
            pageCount={pager.pageCount}
            total={pager.total}
            pageSize={pager.pageSize}
            onPage={pager.setPage}
            label="examens"
          />
        }
        head={
          <>
            <th>Examen</th>
            <th>Groupe</th>
            <th>Type</th>
            <th>Date</th>
            <th>Niveau</th>
            <th>Statut</th>
            <th className="w-32 text-center">Actions</th>
          </>
        }
      >
        {pager.pageItems.map((x, i) => (
          <motion.tr
            key={x.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.25, delay: i * 0.03, ease: "easeOut" }}
            onClick={() => setDetail(x)}
            className={tableRow}
          >
            <td className={cn("font-medium", cellTruncate)}>{x.titre}</td>
            <td className="text-muted-foreground">{x.classe}</td>
            <td className="text-muted-foreground">
              {TYPE_EXAMEN_LABEL[x.type]}
            </td>
            <td>{fmtDate(x.date)}</td>
            <td>{anneeEtude(x.niveau)}</td>
            <td>
              <span className={toneBadge(STATUT_EXAMEN_TONE[x.statut])}>
                {STATUT_EXAMEN_LABEL[x.statut]}
              </span>
            </td>
            <td
              className="text-center"
              onClick={(ev) => ev.stopPropagation()}
            >
              <div className={rowActions}>
                <button
                  className={iconButton}
                  aria-label="Voir le détail"
                  onClick={() => setDetail(x)}
                >
                  <Eye className="h-3.5 w-3.5" />
                </button>
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
              </div>
            </td>
          </motion.tr>
        ))}
      </DataTable>
      </>
      ) : (
        <SaisieNotesPanel examens={mesExamens} />
      )}

      {/* Boîtes de dialogue   montées en permanence, indépendantes de l'onglet */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className={dialogSurfaceWide}>
          <DialogTitle className="sr-only">Détail de l'examen</DialogTitle>
          <DialogDescription className="sr-only">
            Informations, sujet et saisie des notes
          </DialogDescription>
          {detail ? (
            <ExamenDetailFormateur
              key={detail.id}
              examen={examens.find((x) => x.id === detail.id) ?? detail}
              onPreview={setPreview}
              onClose={() => setDetail(null)}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <DocumentPreview examen={preview} onClose={() => setPreview(null)} />

      {formOpen ? (
        <ExamenForm
          key={editing?.id ?? "new"}
          initial={editing}
          onCancel={() => setFormOpen(false)}
          onSubmit={async ({ data, file, removeExisting }) => {
            const cible = editing
              ? (updateExamen(editing.id, data), editing.id)
              : addExamen(data, moiId).id;

            // Retrait explicite sans remplacement : passer par le store efface
            // aussi le fichier dans IndexedDB, là où un simple patch du champ
            // laisserait le blob orphelin. Inutile si un nouveau fichier est
            // déposé   `attachDocument` remplace déjà l'ancien.
            if (removeExisting && editing && !file) {
              await removeDocument(editing.id);
            }
            if (file) {
              try {
                await attachDocument(cible, file);
              } catch (err) {
                toast.error(
                  err instanceof Error ? err.message : "Échec du dépôt",
                );
                setFormOpen(false);
                return;
              }
            }
            toast.success(
              editing
                ? `Examen mis à jour   ${data.titre}`
                : `Examen créé   ${data.titre}`,
            );
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
            ? `« ${toDelete.titre} » du ${fmtDate(toDelete.date)} sera supprimé, ainsi que le sujet déposé. Les notes déjà saisies pour les étudiants sont conservées.`
            : ""
        }
        onConfirm={() => {
          if (!toDelete) return;
          deleteExamen(toDelete.id);
          toast.success(`Examen supprimé   ${toDelete.titre}`);
          setToDelete(null);
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Espace directeur   lecture seule sur tous les examens              */
/* ------------------------------------------------------------------ */

function EspaceDirecteur() {
  const { examens, formateurs } = useIstpm();

  const [search, setSearch] = useState("");
  const [prof, setProf] = useState<string>(ALL);
  const [module, setModule] = useState<string>(ALL);
  const [classe, setClasse] = useState<string>(ALL);
  const [semestre, setSemestre] = useState<string>(ALL);
  const [annee, setAnnee] = useState<string>(ALL);
  const [anneeScolaire, setAnneeScolaire] = useState<string>(ALL);

  const [detail, setDetail] = useState<Examen | null>(null);
  const [preview, setPreview] = useState<Examen | null>(null);

  // Listes de filtres dérivées des examens réellement présents.
  const modules = useMemo(
    () => [...new Set(examens.map((x) => x.module))].sort(),
    [examens],
  );
  const classes = useMemo(
    () => [...new Set(examens.map((x) => x.classe))].sort(),
    [examens],
  );
  const profs = useMemo(() => {
    const ids = new Set(examens.map((x) => x.createdBy));
    return formateurs
      .filter((f) => ids.has(f.id))
      .map((f) => `${f.prenom} ${f.nom}`)
      .sort();
  }, [examens, formateurs]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return examens.filter((x) => {
      if (prof !== ALL && nomFormateur(formateurs, x.createdBy) !== prof)
        return false;
      if (module !== ALL && x.module !== module) return false;
      if (classe !== ALL && x.classe !== classe) return false;
      if (semestre !== ALL && x.niveau !== semestre) return false;
      if (annee !== ALL && anneeEtude(x.niveau) !== annee) return false;
      if (anneeScolaire !== ALL && x.anneeUniversitaire !== anneeScolaire)
        return false;
      if (!q) return true;
      const auteur = nomFormateur(formateurs, x.createdBy);
      return `${x.titre} ${x.module} ${x.classe} ${x.salle} ${auteur} ${x.document?.nom ?? ""}`
        .toLowerCase()
        .includes(q);
    });
  }, [examens, formateurs, search, prof, module, classe, semestre, annee, anneeScolaire]);

  const pager = usePagination(
    filtered,
    `${search}|${prof}|${module}|${classe}|${semestre}|${annee}|${anneeScolaire}`,
  );

  const avecSujet = filtered.filter((x) => x.document).length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Direction"
        title="Examens"
        // actions={
        //   <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground">
        //     <Lock className="h-3.5 w-3.5" /> Consultation seule
        //   </span>
        // }
      />

      <FilterPanel
        search={search}
        onSearch={setSearch}
        placeholder="Rechercher par titre, module, groupe, formateur, fichier…"
        filters={[
          {
            id: "prof",
            label: "Formateur",
            value: prof,
            onChange: setProf,
            options: profs,
            allLabel: "Tous les formateurs",
          },
          {
            id: "module",
            label: "Module",
            value: module,
            onChange: setModule,
            options: modules,
            allLabel: "Tous les modules",
          },
          {
            id: "groupe",
            label: "Groupe",
            value: classe,
            onChange: setClasse,
            options: classes,
            allLabel: "Tous les groupes",
          },
          {
            id: "semestre",
            label: "Semestre",
            value: semestre,
            onChange: setSemestre,
            options: NIVEAUX,
            allLabel: "Tous les semestres",
          },
          {
            id: "annee",
            label: "Niveau",
            value: annee,
            onChange: setAnnee,
            options: ANNEES_ETUDE,
            allLabel: "Tous les niveaux",
          },
          {
            id: "anneeScolaire",
            label: "Année scolaire",
            value: anneeScolaire,
            onChange: setAnneeScolaire,
            options: ANNEES_UNIVERSITAIRES,
            allLabel: "Toutes les années",
          },
        ]}
        summary={
          <>
            <strong className="font-semibold text-foreground">
              {filtered.length}
            </strong>{" "}
            examen(s) sur {examens.length} · {avecSujet} avec sujet déposé
          </>
        }
      />

      <DataTable
        minWidth="min-w-[1250px]"
        isEmpty={filtered.length === 0}
        empty="Aucun examen ne correspond à ces critères."
        footer={
          <TablePagination
            page={pager.page}
            pageCount={pager.pageCount}
            total={pager.total}
            pageSize={pager.pageSize}
            onPage={pager.setPage}
            label="examens"
          />
        }
        head={
          <>
            <th>Examen</th>
            <th>Module</th>
            <th>Groupe</th>
            <th>Type</th>
            <th>Date</th>
            <th>Niveau</th>
            <th>Formateur</th>
            <th>Statut</th>
            <th className="w-24 text-center">Actions</th>
          </>
        }
      >
        {pager.pageItems.map((x, i) => (
          <motion.tr
            key={x.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.25, delay: i * 0.03, ease: "easeOut" }}
            onClick={() => setDetail(x)}
            className={tableRow}
          >
            <td className={cn("font-medium", cellTruncate)}>{x.titre}</td>
            <td className={cn("text-muted-foreground", cellTruncate)}>
              {x.module}
            </td>
            <td className="text-muted-foreground">{x.classe}</td>
            <td className="text-muted-foreground">
              {TYPE_EXAMEN_LABEL[x.type]}
            </td>
            <td>{fmtDate(x.date)}</td>
            <td>{anneeEtude(x.niveau)}</td>
            <td className={cellTruncate}>
              {nomFormateur(formateurs, x.createdBy)}
            </td>
            <td>
              <span className={toneBadge(STATUT_EXAMEN_TONE[x.statut])}>
                {STATUT_EXAMEN_LABEL[x.statut]}
              </span>
            </td>
            <td
              className="text-center"
              onClick={(ev) => ev.stopPropagation()}
            >
              <DocumentActions examen={x} onPreview={setPreview} />
            </td>
          </motion.tr>
        ))}
      </DataTable>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className={dialogSurfaceWide}>
          <DialogTitle className="sr-only">Détail de l'examen</DialogTitle>
          <DialogDescription className="sr-only">
            Consultation et saisie des notes
          </DialogDescription>
          {detail ? (
            <ExamenDetailFormateur
              key={detail.id}
              examen={examens.find((x) => x.id === detail.id) ?? detail}
              onPreview={setPreview}
              onClose={() => setDetail(null)}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <DocumentPreview examen={preview} onClose={() => setPreview(null)} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Détail formateur : informations de l'examen (lecture seule)        */
/* ------------------------------------------------------------------ */

/**
 * Fiche de l'examen. La saisie des notes ne se fait plus ici mais dans le
 * panneau dédié « Saisie des notes », qui gère l'ensemble des classes et
 * modules d'un formateur.
 */
function ExamenDetailFormateur({
  examen,
  onPreview,
}: {
  examen: Examen;
  onPreview: (e: Examen) => void;
  onClose?: () => void;
}) {
  const { formateurs } = useIstpm();

  return (
    <DetailShell
      icon={<ClipboardList className="h-5 w-5" />}
      title={examen.titre}
      subtitle={`${examen.module} · ${examen.classe} · ${TYPE_EXAMEN_LABEL[examen.type]}`}
      badges={
        <>
          <span className={toneBadge(STATUT_EXAMEN_TONE[examen.statut])}>
            {STATUT_EXAMEN_LABEL[examen.statut]}
          </span>
          <span className={toneBadge("blue")}>{examen.composante}</span>
          <DocumentBadge examen={examen} />
        </>
      }
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground">
            La saisie des notes se fait dans « Saisie des notes ».
          </span>
          {examen.document ? (
            <button
              className={cn(ghostPill, "gap-1.5")}
              onClick={() => onPreview(examen)}
            >
              <Eye className="h-3.5 w-3.5" /> Sujet
            </button>
          ) : null}
        </div>
      }
    >
      <InfosExamen examen={examen} formateurs={formateurs} />
    </DetailShell>
  );
}

/* ------------------------------------------------------------------ */
/*  Formulaire examen                                                  */
/* ------------------------------------------------------------------ */

type SubmitPayload = {
  data: Omit<Examen, "id" | "createdBy" | "document">;
  file: File | null;
  removeExisting: boolean;
};

function ExamenForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial: Examen | null;
  onSubmit: (p: SubmitPayload) => void;
  onCancel: () => void;
}) {
  const [f, setF] = useState(() => ({
    titre: initial?.titre ?? "",
    module: initial?.module ?? "",
    filiere: (initial?.filiere ?? "") as Filiere | "",
    niveau: (initial?.niveau ?? "") as Niveau | "",
    classe: initial?.classe ?? "",
    anneeUniversitaire: initial?.anneeUniversitaire ?? "2025/2026",
    type: (initial?.type ?? "examen_theorique") as TypeExamen,
    composante: (initial?.composante ??
      "Théorique + Pratique") as Examen["composante"],
    date: initial?.date ?? "",
    heure: initial?.heure ?? "09:00",
    duree: String(initial?.duree ?? 120),
    salle: initial?.salle ?? "",
    surveillants: initial?.surveillants.join(", ") ?? "",
    statut: (initial?.statut ?? "planifie") as StatutExamen,
    etudiantsConvoques: String(initial?.etudiantsConvoques ?? 30),
    description: initial?.description ?? "",
  }));
  const [file, setFile] = useState<File | null>(null);
  const [removeExisting, setRemoveExisting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

  /* Référentiel des modules (Paramètres › Modules) : chaque module connaît sa
     filière, ce qui permet de la pré-remplir à la sélection. */
  const { modules: modulesReg } = useIstpm();

  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => {
    setF((prev) => ({ ...prev, [k]: v }));
    setErrors((prev) => ({ ...prev, [k]: undefined }));
  };

  /** Options du sélecteur de module : le référentiel, complété par la valeur
   *  déjà saisie sur un examen existant pour ne rien perdre à l'édition. */
  const moduleOptions = useMemo(() => {
    const noms = new Set(modulesReg.map((m) => m.nom));
    if (f.module.trim() && !noms.has(f.module)) noms.add(f.module);
    return [...noms].sort().map((nom) => ({ value: nom, label: nom }));
  }, [modulesReg, f.module]);

  /** Sélection d'un module : renseigne le module et, si le référentiel connaît
   *  sa filière, l'associe automatiquement à l'examen. */
  const onModuleChange = (nom: string) => {
    const found = modulesReg.find((m) => m.nom === nom);
    setF((prev) => ({
      ...prev,
      module: nom,
      filiere: (found ? (found.filiere as Filiere) : prev.filiere),
    }));
    setErrors((prev) => ({ ...prev, module: undefined, filiere: undefined }));
  };

  const submit = () => {
    const next: Record<string, string> = {};
    if (!f.titre.trim()) next.titre = "Titre obligatoire";
    if (!f.module.trim()) next.module = "Module obligatoire";
    if (!f.filiere) next.filiere = "Filière obligatoire";
    if (!f.niveau) next.niveau = "Semestre obligatoire";
    if (!f.classe.trim()) next.classe = "Groupe obligatoire";
    if (!f.date) next.date = "Date obligatoire";
    if (!f.salle.trim()) next.salle = "Salle obligatoire";
    if (!/^\d{2}:\d{2}$/.test(f.heure)) next.heure = "Format attendu HH:MM";
    if (!Number(f.duree)) next.duree = "Durée obligatoire";

    if (Object.keys(next).length) {
      setErrors(next);
      toast.error("Veuillez corriger les champs signalés");
      return;
    }

    onSubmit({
      data: {
        titre: f.titre.trim(),
        module: f.module.trim(),
        filiere: f.filiere as Filiere,
        niveau: f.niveau as Niveau,
        classe: f.classe.trim(),
        anneeUniversitaire: f.anneeUniversitaire,
        type: f.type,
        composante: f.composante,
        date: f.date,
        heure: f.heure,
        duree: Number(f.duree),
        salle: f.salle.trim(),
        surveillants: parseList(f.surveillants),
        statut: f.statut,
        etudiantsConvoques: Number(f.etudiantsConvoques) || 0,
        description: f.description.trim() || undefined,
      },
      file,
      removeExisting,
    });
  };

  return (
    <FormDialog
      open
      onOpenChange={(o) => !o && onCancel()}
      wide
      title={initial ? "Modifier l'examen" : "Nouvel examen"}
      subtitle={
        initial
          ? initial.titre
          : "Renseigner l'épreuve et déposer le sujet"
      }
      submitLabel={initial ? "Enregistrer les modifications" : "Créer l'examen"}
      onSubmit={submit}
    >
      <FullWidth>
        <TextField
          label="Titre de l'examen"
          required
          value={f.titre}
          onChange={(v) => set("titre", v)}
          placeholder="Examen final   Soins infirmiers en médecine"
          error={errors.titre}
        />
      </FullWidth>
      <FullWidth>
        <ComboBoxField
          label="Module"
          required
          value={f.module}
          onChange={onModuleChange}
          options={moduleOptions}
          placeholder="Sélectionner le module…"
          searchPlaceholder="Rechercher un module…"
          emptyText="Aucun module. Ajoutez-en dans Paramètres › Modules."
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
        label="Semestre"
        required
        value={f.niveau}
        onChange={(v) => set("niveau", v)}
        options={NIVEAUX}
        error={errors.niveau}
      />
      <TextField
        label="Groupe"
        required
        value={f.classe}
        onChange={(v) => set("classe", v)}
        placeholder="S5-G1"
        error={errors.classe}
      />
      <SelectField
        label="Année universitaire"
        value={f.anneeUniversitaire}
        onChange={(v) => set("anneeUniversitaire", v)}
        options={ANNEES_UNIVERSITAIRES}
      />
      <SelectField
        label="Type d'examen"
        value={f.type}
        onChange={(v) => set("type", v)}
        options={TYPES.map((t) => ({ value: t, label: TYPE_EXAMEN_LABEL[t] }))}
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
      <SelectField
        label="Durée"
        value={f.duree}
        onChange={(v) => set("duree", v)}
        options={DUREES_EXAMEN.map((d) => ({
          value: String(d),
          label: fmtDuree(d),
        }))}
        error={errors.duree}
      />
      <TextField
        label="Salle"
        required
        value={f.salle}
        onChange={(v) => set("salle", v)}
        placeholder="Amphi A"
        error={errors.salle}
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
        label="Effectif convoqué"
        type="number"
        value={f.etudiantsConvoques}
        onChange={(v) => set("etudiantsConvoques", v)}
      />
      <FullWidth>
        <ListField
          label="Surveillant(s)"
          value={f.surveillants}
          onChange={(v) => set("surveillants", v)}
          placeholder="S. El Idrissi, M. El Khattabi"
        />
      </FullWidth>
      <FullWidth>
        <TextField
          label="Description (facultatif)"
          value={f.description}
          onChange={(v) => set("description", v)}
          placeholder="Déroulé de l'épreuve, documents autorisés…"
        />
      </FullWidth>
      <FullWidth>
        <FileField
          label="Sujet d'examen"
          file={file}
          onFile={setFile}
          existing={removeExisting ? null : (initial?.document ?? null)}
          onRemoveExisting={() => setRemoveExisting(true)}
          accept={ACCEPTED_DOC_TYPES}
        />
      </FullWidth>
    </FormDialog>
  );
}

/* ------------------------------------------------------------------ */
/*  Saisie des notes   par examen / classe, un formateur → plusieurs classes */
/* ------------------------------------------------------------------ */

/**
 * Saisie des notes d'un formateur.
 *
 * Un formateur enseigne potentiellement plusieurs classes et plusieurs modules :
 * il choisit d'abord l'un de **ses** examens (chaque examen porte son module et
 * sa classe), puis saisit une note pour **chaque étudiant** de la classe
 * concernée. L'enregistrement met à jour le dossier de chaque étudiant, recalcule
 * sa moyenne et marque l'examen comme noté. Les notes déjà saisies sont listées
 * en dessous et peuvent être retirées.
 */
function SaisieNotesPanel({ examens }: { examens: Examen[] }) {
  const { etudiants, addNote, updateExamen, updateEtudiant } = useIstpm();
  const [examenId, setExamenId] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});

  // La classe convoquée = les étudiants dont le groupe correspond à celui de
  // l'examen sélectionné (ex. « S5-G1 »).
  const examen = examens.find((x) => x.id === examenId);
  const convoques = useMemo(
    () =>
      examen
        ? etudiants.filter(
            (e) =>
              `${e.niveau}-${e.groupe}` === examen.classe &&
              e.statut !== "abandon",
          )
        : [],
    [etudiants, examen],
  );

  const choisirExamen = (id: string) => {
    setExamenId(id);
    const ex = examens.find((x) => x.id === id);
    const roster = ex
      ? etudiants.filter(
          (e) =>
            `${e.niveau}-${e.groupe}` === ex.classe && e.statut !== "abandon",
        )
      : [];
    // Pré-remplit avec les notes déjà attribuées pour ce module.
    const seed: Record<string, string> = {};
    for (const e of roster) {
      const n = e.notes.find((nn) => nn.module === ex?.module);
      if (n) seed[e.id] = String(n.note);
    }
    setNotes(seed);
  };

  const setNote = (id: string, v: string) =>
    setNotes((p) => ({ ...p, [id]: v }));

  const saisis = Object.values(notes).filter((v) => v.trim() !== "").length;

  const enregistrer = () => {
    if (!examen) {
      toast.error("Choisir d'abord un examen");
      return;
    }
    const valides: { etudiantId: string; note: number }[] = [];
    for (const e of convoques) {
      const v = notes[e.id];
      if (v === undefined || v.trim() === "") continue;
      const n = Number(v);
      if (Number.isNaN(n) || n < 0 || n > 20) {
        toast.error(`Note invalide pour ${e.prenom} ${e.nom}   entre 0 et 20`);
        return;
      }
      valides.push({ etudiantId: e.id, note: n });
    }
    if (!valides.length) {
      toast.error("Aucune note à enregistrer");
      return;
    }
    for (const v of valides) {
      addNote(v.etudiantId, {
        module: examen.module,
        note: v.note,
        coef: 3,
        credits: 6,
        examen: examen.titre,
      });
    }
    updateExamen(examen.id, { statut: "notes_saisies" });
    toast.success(
      `Notes enregistrées pour ${valides.length} étudiant(s)   ${examen.module}`,
    );
  };

  const notesSaisies = useMemo(() => {
    const rows: {
      key: string;
      etudiantId: string;
      etudiant: string;
      cne: string;
      groupe: string;
      module: string;
      examen: string;
      note: number;
    }[] = [];
    for (const e of etudiants) {
      for (const n of e.notes) {
        if (!n.examen) continue;
        rows.push({
          key: `${e.id}-${n.module}`,
          etudiantId: e.id,
          etudiant: `${e.prenom} ${e.nom}`,
          cne: e.cne,
          groupe: `${e.niveau}-${e.groupe}`,
          module: n.module,
          examen: n.examen,
          note: n.note,
        });
      }
    }
    return rows.reverse();
  }, [etudiants]);

  const notesPager = usePagination(notesSaisies, notesSaisies.length);

  const removeNote = (etudiantId: string, module: string) => {
    const e = etudiants.find((x) => x.id === etudiantId);
    if (!e) return;
    const note = e.notes.find((n) => n.module === module);
    if (note?.id) {
      deleteNote(note.id).catch(() => toast.error("Erreur lors de la suppression côté serveur"));
    }
    const notes = e.notes.filter((n) => n.module !== module);
    updateEtudiant(etudiantId, { notes, moyenne: moyennePonderee(notes) });
    toast.success("Note supprimée");
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="space-y-4"
    >
      <p className="text-sm text-muted-foreground">
        Choisissez l'un de vos examens, puis saisissez une note pour chaque
        étudiant de la classe concernée.
      </p>

      {/* Saisie par examen / classe */}
      <div className={cn(softCard, "space-y-4 p-4 sm:p-5")}>
        <div className="max-w-md">
          <ComboBoxField
            label="Examen à noter"
            value={examenId}
            onChange={choisirExamen}
            options={examens.map((x) => ({
              value: x.id,
              label: `${x.titre}   ${x.classe}`,
            }))}
            placeholder="Choisir un de vos examens…"
            searchPlaceholder="Titre, module, classe…"
            emptyText="Vous n'avez pas encore créé d'examen."
          />
        </div>

        {examen ? (
          <>
            <p className="text-xs text-muted-foreground">
              <strong className="font-semibold text-foreground">
                {examen.module}
              </strong>{" "}
              · classe {examen.classe} · {convoques.length} étudiant(s) ·{" "}
              {saisis} saisi(s)
            </p>
            {convoques.length ? (
              <>
                <DetailTable
                  head={
                    <>
                      <th className="px-3 py-2">CNE</th>
                      <th className="px-3 py-2">Étudiant</th>
                      <th className="px-3 py-2 text-right">Note /20</th>
                    </>
                  }
                >
                  {convoques.map((e) => (
                    <tr key={e.id}>
                      <td className="px-3 py-2 tabular-nums text-muted-foreground">
                        {e.cne}
                      </td>
                      <td className="px-3 py-2 font-medium">
                        {e.prenom} {e.nom}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Input
                          type="number"
                          min={0}
                          max={20}
                          step={0.25}
                          value={notes[e.id] ?? ""}
                          onChange={(ev) => setNote(e.id, ev.target.value)}
                          className={cn(softInput, "h-8 w-20 text-right")}
                        />
                      </td>
                    </tr>
                  ))}
                </DetailTable>
                <div className="flex justify-end">
                  <button className={primaryPill} onClick={enregistrer}>
                    <Save className="h-4 w-4" /> Enregistrer les notes
                  </button>
                </div>
              </>
            ) : (
              <DetailEmpty>
                Aucun étudiant dans la classe {examen.classe}.
              </DetailEmpty>
            )}
          </>
        ) : (
          <DetailEmpty>
            Sélectionnez un examen pour saisir les notes de sa classe.
          </DetailEmpty>
        )}
      </div>

      <DataTable
        minWidth="min-w-[820px]"
        isEmpty={notesSaisies.length === 0}
        empty="Aucune note enregistrée pour le moment."
        footer={
          <TablePagination
            page={notesPager.page}
            pageCount={notesPager.pageCount}
            total={notesPager.total}
            pageSize={notesPager.pageSize}
            onPage={notesPager.setPage}
            label="notes"
          />
        }
        head={
          <>
            <th>Étudiant</th>
            <th>Groupe</th>
            <th>Module</th>
            <th>Examen</th>
            <th className="text-right">Note /20</th>
            <th className="w-20 text-center">Actions</th>
          </>
        }
      >
        {notesPager.pageItems.map((r, i) => (
          <motion.tr
            key={r.key}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.25, delay: i * 0.03, ease: "easeOut" }}
            className={tableRow}
          >
            <td className={cn("font-medium", cellTruncate)}>{r.etudiant}</td>
            <td className="text-muted-foreground">{r.groupe}</td>
            <td className={cn("text-muted-foreground", cellTruncate)}>{r.module}</td>
            <td className={cn("text-muted-foreground", cellTruncate)}>{r.examen}</td>
            <td
              className={cn(
                "text-right font-semibold tabular-nums",
                r.note < 10 ? "text-alert" : "text-brand-dk",
              )}
            >
              {r.note.toFixed(2)}
            </td>
            <td className="text-center">
              <div className={rowActions}>
                <button
                  className={iconButtonDanger}
                  aria-label="Supprimer la note"
                  onClick={() => removeNote(r.etudiantId, r.module)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </td>
          </motion.tr>
        ))}
      </DataTable>
    </motion.section>
  );
}

export const Route = createFileRoute("/dashboard/examens")({
  component: ExamensPage,
});
