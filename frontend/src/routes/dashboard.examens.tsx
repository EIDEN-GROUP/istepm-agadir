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
  Lock,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useAuth, DEMO_FORMATEUR_ID } from "@/lib/auth";
import { useIstpm } from "@/lib/istpm-store";
import {
  FILIERES,
  NIVEAUX,
  ANNEES_UNIVERSITAIRES,
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
import {
  FormDialog,
  ConfirmDialog,
  TextField,
  SelectField,
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
          <DetailField label="Classe / groupe" value={examen.classe} />
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

  // Le formateur connecté (démo) : ses examens seulement.
  const moiId = DEMO_FORMATEUR_ID;
  const moi = formateurs.find((f) => f.id === moiId);

  const [search, setSearch] = useState("");
  const [type, setType] = useState<string>(ALL);
  const [niveau, setNiveau] = useState<string>(ALL);
  const [sujet, setSujet] = useState<string>(ALL);

  const [detail, setDetail] = useState<Examen | null>(null);
  const [preview, setPreview] = useState<Examen | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Examen | null>(null);
  const [toDelete, setToDelete] = useState<Examen | null>(null);

  const mesExamens = useMemo(
    () => examens.filter((x) => x.createdBy === moiId),
    [examens, moiId],
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

  const sansSujet = mesExamens.filter((x) => !x.document).length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Espace formateur"
        title="Mes examens"
        actions={
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
        }
      />

      <p className="text-xs text-muted-foreground">
        {moi ? `${moi.prenom} ${moi.nom} · ${moi.departement}` : null}
      </p>

      <FilterPanel
        search={search}
        onSearch={setSearch}
        placeholder="Rechercher par titre, module, classe, salle…"
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
        head={
          <>
            <th>Examen</th>
            <th>Classe</th>
            <th>Type</th>
            <th>Date</th>
            <th>Sujet</th>
            <th>Statut</th>
            <th className="w-32 text-center">Actions</th>
          </>
        }
      >
        {filtered.map((x, i) => (
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
            <td>
              <DocumentBadge examen={x} />
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

      {/* Détail + saisie des notes */}
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
  const annees = useMemo(
    () => [...new Set(examens.map((x) => x.anneeUniversitaire))].sort().reverse(),
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
      if (annee !== ALL && x.anneeUniversitaire !== annee) return false;
      if (!q) return true;
      const auteur = nomFormateur(formateurs, x.createdBy);
      return `${x.titre} ${x.module} ${x.classe} ${x.salle} ${auteur} ${x.document?.nom ?? ""}`
        .toLowerCase()
        .includes(q);
    });
  }, [examens, formateurs, search, prof, module, classe, semestre, annee]);

  const avecSujet = filtered.filter((x) => x.document).length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Direction"
        title="Examens"
        actions={
          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground">
            <Lock className="h-3.5 w-3.5" /> Consultation seule
          </span>
        }
      />

      <FilterPanel
        search={search}
        onSearch={setSearch}
        placeholder="Rechercher par titre, module, classe, formateur, fichier…"
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
            id: "classe",
            label: "Classe",
            value: classe,
            onChange: setClasse,
            options: classes,
            allLabel: "Toutes les classes",
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
            label: "Année universitaire",
            value: annee,
            onChange: setAnnee,
            options: annees,
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
        head={
          <>
            <th>Examen</th>
            <th>Module</th>
            <th>Classe</th>
            <th>Type</th>
            <th>Date</th>
            <th>Formateur</th>
            <th>Sujet</th>
            <th className="w-24 text-center">Actions</th>
          </>
        }
      >
        {filtered.map((x, i) => (
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
            <td className={cellTruncate}>
              {nomFormateur(formateurs, x.createdBy)}
            </td>
            <td>
              <DocumentBadge examen={x} />
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
/*  Détail formateur : infos + saisie des notes                        */
/* ------------------------------------------------------------------ */

type NoteSaisie = { theorique: string; pratique: string };

/** Vide = non noté ; sinon la note doit être comprise entre 0 et 20. */
function parseNote(v: string): number | undefined | "invalid" {
  if (v.trim() === "") return undefined;
  const n = Number(v);
  if (Number.isNaN(n) || n < 0 || n > 20) return "invalid";
  return n;
}

function ExamenDetailFormateur({
  examen,
  onPreview,
  onClose,
}: {
  examen: Examen;
  onPreview: (e: Examen) => void;
  onClose: () => void;
}) {
  const { etudiants, formateurs, saveNotesExamen } = useIstpm();

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
          `Note invalide pour ${e.prenom} ${e.nom}   saisir une valeur entre 0 et 20`,
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
      `Notes enregistrées pour ${count} étudiant(s)   ${examen.module}`,
    );
    onClose();
  };

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
            {saisies} / {convoques.length} étudiant(s) saisi(s)
          </span>
          <div className="flex items-center gap-2">
            {examen.document ? (
              <button
                className={cn(ghostPill, "gap-1.5")}
                onClick={() => onPreview(examen)}
              >
                <Eye className="h-3.5 w-3.5" /> Sujet
              </button>
            ) : null}
            <button className={primaryPill} onClick={save}>
              <Save className="h-4 w-4" /> Enregistrer les notes
            </button>
          </div>
        </div>
      }
    >
      <InfosExamen examen={examen} formateurs={formateurs} />

      {/* Le jeu de démonstration ne contient qu'une poignée d'étudiants par
          filière : la liste nominative est un sous-ensemble de l'effectif. */}
      <DetailSection title={`Liste nominative (${convoques.length})`}>
        {convoques.length ? (
          <DetailTable
            head={
              <>
                <th className="px-3 py-2">CNE</th>
                <th className="px-3 py-2">Étudiant</th>
                {hasTheorique ? (
                  <th className="px-3 py-2 text-right">Théorique /20</th>
                ) : null}
                {hasPratique ? (
                  <th className="px-3 py-2 text-right">Pratique /20</th>
                ) : null}
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
                {hasTheorique ? (
                  <td className="px-3 py-2 text-right">
                    <Input
                      type="number"
                      min={0}
                      max={20}
                      step={0.25}
                      value={notes[e.id]?.theorique ?? ""}
                      onChange={(ev) => set(e.id, "theorique", ev.target.value)}
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
                      value={notes[e.id]?.pratique ?? ""}
                      onChange={(ev) => set(e.id, "pratique", ev.target.value)}
                      className={cn(softInput, "h-8 w-20 text-right")}
                    />
                  </td>
                ) : null}
              </tr>
            ))}
          </DetailTable>
        ) : (
          <DetailEmpty>
            Aucun étudiant inscrit dans cette filière pour ce semestre.
          </DetailEmpty>
        )}
      </DetailSection>
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

  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => {
    setF((prev) => ({ ...prev, [k]: v }));
    setErrors((prev) => ({ ...prev, [k]: undefined }));
  };

  const submit = () => {
    const next: Record<string, string> = {};
    if (!f.titre.trim()) next.titre = "Titre obligatoire";
    if (!f.module.trim()) next.module = "Module obligatoire";
    if (!f.filiere) next.filiere = "Filière obligatoire";
    if (!f.niveau) next.niveau = "Semestre obligatoire";
    if (!f.classe.trim()) next.classe = "Classe obligatoire";
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
        label="Semestre"
        required
        value={f.niveau}
        onChange={(v) => set("niveau", v)}
        options={NIVEAUX}
        error={errors.niveau}
      />
      <TextField
        label="Classe / groupe"
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

export const Route = createFileRoute("/dashboard/examens")({
  component: ExamensPage,
});
