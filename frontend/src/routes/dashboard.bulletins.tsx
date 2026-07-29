import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Eye, FileDown, Send, Pencil, SendHorizontal } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { getStamp } from "@/lib/stamp";
import { useIstpm, mentionFor, decisionFor } from "@/lib/istpm-store";
import {
  FILIERES,
  NIVEAUX,
  ANNEES_ETUDE,
  ANNEES_UNIVERSITAIRES,
  anneeEtude,
  DECISION_TONE,
  MENTION_TONE,
  STATUT_BULLETIN_LABEL,
  STATUT_BULLETIN_TONE,
  type Bulletin,
  type Decision,
  type SessionType,
  type StatutBulletin,
} from "@/lib/istpm-data";
import {
  primaryPill,
  ghostPill,
  iconButton,
  toneBadge,
  dialogSurfaceWide,
  tableRow,
  cellTruncate,
  rowActions,
  initials,
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
  DetailRow,
  DetailShell,
  ALL,
} from "@/components/dash-page";
import { usePagination, TablePagination } from "@/components/table-pagination";
import {
  FormDialog,
  ConfirmDialog,
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

const SESSIONS: SessionType[] = ["normale", "rattrapage"];
const DECISIONS: Decision[] = [
  "Admis",
  "Admis avec dette",
  "Rattrapage",
  "Ajourné",
];
const STATUTS: StatutBulletin[] = ["genere", "valide", "publie"];

/**
 * Render the transcript into a hidden iframe and open the browser's print
 * dialog   "Enregistrer au format PDF" there produces the real document.
 * An iframe avoids the popup blocker that `window.open` would trip.
 */
function printBulletin(b: Bulletin, groupe?: string) {
  const rows = b.notes
    .map(
      (n) =>
        `<tr><td>${n.module}</td><td class="r">${n.note.toFixed(2)}</td><td class="r">${n.coef}</td><td class="r">${n.credits}</td></tr>`,
    )
    .join("");

  // Méthode de calcul : moyenne pondérée par les coefficients, sur les modules
  // et l'évaluation clinique (coef 2), telle qu'affichée dans le tableau ci-dessus.
  const calcRows = [
    ...b.notes.map((n) => ({ label: n.module, note: n.note, coef: n.coef })),
    { label: "Évaluation clinique / pratique", note: b.evaluationClinique, coef: 2 },
  ];
  const totalCoef = calcRows.reduce((s, r) => s + r.coef, 0);
  const sommePond = calcRows.reduce((s, r) => s + r.note * r.coef, 0);
  const moyCalc = totalCoef ? sommePond / totalCoef : 0;
  const calcTableRows = calcRows
    .map(
      (r) =>
        `<tr><td>${r.label}</td><td class="r">${r.note.toFixed(2)}</td><td class="r">${r.coef}</td><td class="r">${(r.note * r.coef).toFixed(2)}</td></tr>`,
    )
    .join("");

  // Cachet officiel (téléversé dans les Paramètres par le directeur).
  const stamp = getStamp();
  const cachet = stamp
    ? `<div class="cachet"><img src="${stamp}" alt="Cachet de l'établissement"><div class="lbl">Cachet de l'établissement</div></div>`
    : "";

  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<title>Bulletin   ${b.prenom} ${b.nom}</title>
<style>
  body{font-family:system-ui,sans-serif;color:#123b3a;margin:40px;}
  h1{color:#029994;font-size:20px;margin:0 0 4px;}
  .sub{color:#556;font-size:12px;margin-bottom:24px;}
  table{width:100%;border-collapse:collapse;font-size:13px;margin-top:8px;}
  th{text-align:left;background:#f1f9f9;color:#017a76;font-size:11px;
     text-transform:uppercase;letter-spacing:.06em;padding:8px;}
  td{padding:8px;border-top:1px solid #d6efee;}
  .r{text-align:right;}
  .sum{margin-top:24px;font-size:13px;}
  .sum div{display:flex;justify-content:space-between;
           border-bottom:1px solid #d6efee;padding:6px 0;}
  .clin{background:#f1f9f9;font-weight:600;}
  .calc{margin-top:28px;page-break-inside:avoid;}
  .calc h2{color:#017a76;font-size:14px;margin:0 0 6px;}
  .formula{background:#eef7f6;border:1px solid #d6efee;border-radius:8px;
           padding:10px 12px;font-size:13px;color:#123b3a;margin:0 0 4px;}
  .note{color:#556;font-size:11px;margin-top:6px;}
  .cachet{margin-top:36px;text-align:right;page-break-inside:avoid;}
  .cachet img{max-width:150px;max-height:120px;}
  .cachet .lbl{color:#556;font-size:10px;margin-top:2px;
               text-transform:uppercase;letter-spacing:.06em;}
</style></head><body>
<h1>ISTEPM Agadir    Bulletin de notes</h1>
<div class="sub">Institut spécialisé des techniques paramédicales</div>
<div class="sum">
  <div><span>Étudiant</span><strong>${b.prenom} ${b.nom}</strong></div>
  <div><span>CNE</span><strong>${b.cne}</strong></div>
  <div><span>Filière</span><strong>${b.filiere}</strong></div>
  ${groupe ? `<div><span>Groupe</span><strong>${groupe}</strong></div>` : ""}
  <div><span>Niveau / session</span><strong>${b.niveau}   session ${b.session}</strong></div>
</div>
<table><thead><tr><th>Module</th><th class="r">Note</th><th class="r">Coef.</th><th class="r">Crédits</th></tr></thead>
<tbody>${rows}
<tr class="clin"><td>Évaluation clinique / pratique</td><td class="r">${b.evaluationClinique.toFixed(2)}</td><td class="r">2</td><td class="r">4</td></tr>
</tbody></table>
<div class="sum">
  <div><span>Moyenne générale</span><strong>${b.moyenne.toFixed(2)} / 20</strong></div>
  <div><span>Mention</span><strong>${b.mention}</strong></div>
  <div><span>Décision</span><strong>${b.decision}</strong></div>
</div>
<div class="calc">
  <h2>Méthode de calcul de la moyenne</h2>
  <p class="formula">Moyenne générale = Σ (note × coefficient) ÷ Σ (coefficients)</p>
  <table>
    <thead><tr><th>Module</th><th class="r">Note</th><th class="r">Coef.</th><th class="r">Note × Coef.</th></tr></thead>
    <tbody>${calcTableRows}
    <tr class="clin"><td>Total</td><td class="r">—</td><td class="r">${totalCoef}</td><td class="r">${sommePond.toFixed(2)}</td></tr>
    </tbody>
  </table>
  <div class="sum">
    <div><span>Moyenne pondérée = ${sommePond.toFixed(2)} ÷ ${totalCoef}</span><strong>${moyCalc.toFixed(2)} / 20</strong></div>
  </div>
  <p class="note">Chaque note est pondérée par son coefficient ; la moyenne est la somme des notes pondérées divisée par la somme des coefficients.</p>
</div>
${cachet}
</body></html>`;

  const frame = document.createElement("iframe");
  frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
  frame.srcdoc = html;
  frame.onload = () => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    // Give the print dialog time to take its snapshot before teardown.
    setTimeout(() => frame.remove(), 60_000);
  };
  document.body.appendChild(frame);
}

function BulletinsPage() {
  const { role } = useAuth();
  const { bulletins, etudiants, formateurs, updateBulletin, publierBulletin, publierTousBulletins } =
    useIstpm();
  // Publishing transcripts is a student-administration act.
  const canPublish = role === "directeur" || role === "responsable";

  const [search, setSearch] = useState("");
  const [filiere, setFiliere] = useState<string>(ALL);
  const [niveau, setNiveau] = useState<string>(ALL);
  const [session, setSession] = useState<string>(ALL);
  const [annee, setAnnee] = useState<string>(ALL);
  const [anneeScolaire, setAnneeScolaire] = useState<string>(ALL);
  const [groupe, setGroupe] = useState<string>(ALL);
  const [formateur, setFormateur] = useState<string>(ALL);
  const [statut, setStatut] = useState<string>(ALL);

  const [detail, setDetail] = useState<Bulletin | null>(null);
  const [editing, setEditing] = useState<Bulletin | null>(null);
  const [publishAllOpen, setPublishAllOpen] = useState(false);

  // Le bulletin ne porte ni groupe ni formateur : on les rattache via l'étudiant
  // (groupe) et via les modules enseignés (formateur → notes du bulletin).
  const etuById = useMemo(() => new Map(etudiants.map((e) => [e.id, e])), [etudiants]);
  const groupeOptions = useMemo(() => [...new Set(etudiants.map((e) => e.groupe))].sort(), [etudiants]);
  const formateursActifs = useMemo(() => formateurs.filter((f) => !f.archived), [formateurs]);
  const formateurOptions = useMemo(() => formateursActifs.map((f) => `${f.prenom} ${f.nom}`), [formateursActifs]);
  const modulesParFormateur = useMemo(() => new Map(formateursActifs.map((f) => [`${f.prenom} ${f.nom}`, new Set(f.modules)])), [formateursActifs]);
  const statutOptions = useMemo(() => STATUTS.map((s) => STATUT_BULLETIN_LABEL[s]), []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return bulletins.filter((b) => {
      if (filiere !== ALL && b.filiere !== filiere) return false;
      if (niveau !== ALL && b.niveau !== niveau) return false;
      if (session !== ALL && b.session !== session) return false;
      if (annee !== ALL && anneeEtude(b.niveau) !== annee) return false;
      // Le bulletin ne porte pas l'année scolaire : elle vient de l'étudiant.
      if (anneeScolaire !== ALL && etuById.get(b.etudiantId)?.annee !== anneeScolaire) return false;
      if (groupe !== ALL && etuById.get(b.etudiantId)?.groupe !== groupe) return false;
      if (statut !== ALL && STATUT_BULLETIN_LABEL[b.statut] !== statut) return false;
      if (formateur !== ALL) {
        const mods = modulesParFormateur.get(formateur);
        if (!mods || !b.notes.some((n) => mods.has(n.module))) return false;
      }
      if (!q) return true;
      return `${b.cne} ${b.prenom} ${b.nom}`.toLowerCase().includes(q);
    });
  }, [bulletins, search, filiere, niveau, session, annee, anneeScolaire, groupe, statut, formateur, etuById, modulesParFormateur]);

  const pager = usePagination(filtered, `${search}|${filiere}|${niveau}|${session}|${annee}|${anneeScolaire}|${groupe}|${statut}|${formateur}`);

  const aPublier = bulletins.filter((b) => b.statut !== "publie").length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Résultats"
        title="Bulletins"
        actions={
          canPublish && (
            <>
              <span className="rounded-full bg-brand/12 px-3 py-1.5 text-xs font-medium text-brand-dk">
                {aPublier} à publier
              </span>
              <button
                className={cn(ghostPill, "gap-1.5")}
                disabled={aPublier === 0}
                onClick={() => setPublishAllOpen(true)}
              >
                <SendHorizontal className="h-3.5 w-3.5" /> Tout publier
              </button>
            </>
          )
        }
      />

      <FilterPanel
        search={search}
        onSearch={setSearch}
        placeholder="Rechercher par CNE ou nom…"
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
            id: "session",
            label: "Session",
            value: session,
            onChange: setSession,
            options: SESSIONS,
            allLabel: "Toutes les sessions",
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
          {
            id: "groupe",
            label: "Groupe",
            value: groupe,
            onChange: setGroupe,
            options: groupeOptions,
            allLabel: "Tous les groupes",
          },
          {
            id: "formateur",
            label: "Formateur",
            value: formateur,
            onChange: setFormateur,
            options: formateurOptions,
            allLabel: "Tous les formateurs",
          },
          {
            id: "statut",
            label: "Statut",
            value: statut,
            onChange: setStatut,
            options: statutOptions,
            allLabel: "Tous les statuts",
          },
        ]}
      />

      <DataTable
        minWidth="min-w-[1100px]"
        isEmpty={filtered.length === 0}
        empty="Aucun bulletin ne correspond à ces critères."
        footer={
          <TablePagination
            page={pager.page}
            pageCount={pager.pageCount}
            total={pager.total}
            pageSize={pager.pageSize}
            onPage={pager.setPage}
            label="bulletins"
          />
        }
        head={
          <>
            <th>Étudiant</th>
            <th className="text-center">Niveau</th>
            <th className="text-right">Moyenne</th>
            <th>Mention</th>
            <th>Décision</th>
            <th>Statut</th>
            <th className="w-36 text-center">Actions</th>
          </>
        }
      >
        {pager.pageItems.map((b, i) => (
          <motion.tr
            key={b.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.25, delay: i * 0.03, ease: "easeOut" }}
            onClick={() => setDetail(b)}
            className={tableRow}
          >
            <td
              className={cn("border-l-[3px] font-medium", cellTruncate)}
              style={{ borderLeftColor: TONE_COLORS[DECISION_TONE[b.decision]] }}
            >
              {b.prenom} {b.nom}
            </td>
            <td className="text-center tabular-nums text-muted-foreground">
              {b.niveau}
            </td>
            <td
              className={cn(
                "text-right font-semibold tabular-nums",
                b.moyenne < 10 ? "text-alert" : "text-brand-dk",
              )}
            >
              {b.moyenne.toFixed(2)}
            </td>
            <td>
              <span className={toneBadge(MENTION_TONE[b.mention])}>
                {b.mention}
              </span>
            </td>
            <td>
              <span className={toneBadge(DECISION_TONE[b.decision])}>
                {b.decision}
              </span>
            </td>
            <td>
              <span className={toneBadge(STATUT_BULLETIN_TONE[b.statut])}>
                {STATUT_BULLETIN_LABEL[b.statut]}
              </span>
            </td>
            <td
              className="text-center"
              onClick={(ev) => ev.stopPropagation()}
            >
              <div className={rowActions}>
                <button
                  className={iconButton}
                  aria-label="Voir le bulletin"
                  onClick={() => setDetail(b)}
                >
                  <Eye className="h-3.5 w-3.5" />
                </button>
                <button
                  className={iconButton}
                  aria-label="Imprimer / PDF"
                  onClick={() => printBulletin(b, etuById.get(b.etudiantId)?.groupe)}
                >
                  <FileDown className="h-3.5 w-3.5" />
                </button>
                {canPublish ? (
                  <>
                    <button
                      className={iconButton}
                      aria-label="Modifier"
                      onClick={() => setEditing(b)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      className={iconButton}
                      aria-label="Publier"
                      disabled={b.statut === "publie"}
                      onClick={() => {
                        publierBulletin(b.id);
                        toast.success(
                          `Bulletin publié   ${b.prenom} ${b.nom} (${b.niveau})`,
                        );
                      }}
                    >
                      <Send className="h-3.5 w-3.5" />
                    </button>
                  </>
                ) : null}
              </div>
            </td>
          </motion.tr>
        ))}
      </DataTable>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className={dialogSurfaceWide}>
          <DialogTitle className="sr-only">Bulletin</DialogTitle>
          <DialogDescription className="sr-only">
            Détail des notes par module
          </DialogDescription>
          {detail ? (
            <BulletinDetail
              b={bulletins.find((x) => x.id === detail.id) ?? detail}
              groupe={etuById.get(detail.etudiantId)?.groupe}
              canPublish={canPublish}
              onPublish={(b) => {
                publierBulletin(b.id);
                toast.success(`Bulletin publié   ${b.prenom} ${b.nom}`);
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      {editing ? (
        <BulletinForm
          key={editing.id}
          initial={editing}
          onCancel={() => setEditing(null)}
          onSubmit={(patch) => {
            updateBulletin(editing.id, patch);
            toast.success(
              `Bulletin mis à jour   ${editing.prenom} ${editing.nom}`,
            );
            setEditing(null);
          }}
        />
      ) : null}

      <ConfirmDialog
        open={publishAllOpen}
        onOpenChange={setPublishAllOpen}
        title="Publier tous les bulletins ?"
        message={`${aPublier} bulletin(s) passeront au statut « Publié » et seront visibles par les étudiants.`}
        confirmLabel="Tout publier"
        onConfirm={() => {
          const n = publierTousBulletins();
          toast.success(`${n} bulletin(s) publié(s)`);
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */

function BulletinForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial: Bulletin;
  onSubmit: (patch: Partial<Bulletin>) => void;
  onCancel: () => void;
}) {
  const [f, setF] = useState({
    session: initial.session,
    decision: initial.decision,
    statut: initial.statut,
    evaluationClinique: initial.evaluationClinique as number | "",
  });
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

  const submit = () => {
    if (
      f.evaluationClinique === "" ||
      f.evaluationClinique < 0 ||
      f.evaluationClinique > 20
    ) {
      setErrors({ evaluationClinique: "Note entre 0 et 20" });
      toast.error("Veuillez corriger les champs signalés");
      return;
    }
    onSubmit({
      session: f.session,
      decision: f.decision,
      statut: f.statut,
      evaluationClinique: Number(f.evaluationClinique),
    });
  };

  // Shown as guidance: what the rules would decide from the recorded marks.
  const suggestion = decisionFor(initial.moyenne, initial.notes);

  return (
    <FormDialog
      open
      onOpenChange={(o) => !o && onCancel()}
      title="Modifier le bulletin"
      subtitle={`${initial.prenom} ${initial.nom}   ${initial.cne}`}
      onSubmit={submit}
    >
      <FullWidth>
        <div className="rounded-2xl bg-muted px-4 py-3 text-xs text-muted-foreground">
          Moyenne calculée&nbsp;:{" "}
          <strong className="text-foreground">
            {initial.moyenne.toFixed(2)}/20
          </strong>{" "}
          · mention{" "}
          <strong className="text-foreground">
            {mentionFor(initial.moyenne)}
          </strong>{" "}
          · décision suggérée{" "}
          <strong className="text-foreground">{suggestion}</strong>
        </div>
      </FullWidth>
      <SelectField
        label="Session"
        value={f.session}
        onChange={(v) => setF((p) => ({ ...p, session: v }))}
        options={SESSIONS.map((s) => ({ value: s, label: s }))}
      />
      <SelectField
        label="Décision"
        value={f.decision}
        onChange={(v) => setF((p) => ({ ...p, decision: v }))}
        options={DECISIONS.map((d) => ({ value: d, label: d }))}
      />
      <SelectField
        label="Statut"
        value={f.statut}
        onChange={(v) => setF((p) => ({ ...p, statut: v }))}
        options={STATUTS.map((s) => ({
          value: s,
          label: STATUT_BULLETIN_LABEL[s],
        }))}
      />
      <NumberField
        label="Évaluation clinique"
        suffix="/20"
        min={0}
        max={20}
        step={0.25}
        value={f.evaluationClinique}
        onChange={(v) => {
          setF((p) => ({ ...p, evaluationClinique: v }));
          setErrors({});
        }}
        error={errors.evaluationClinique}
      />
    </FormDialog>
  );
}

/* ------------------------------------------------------------------ */

function BulletinDetail({
  b,
  groupe,
  canPublish,
  onPublish,
}: {
  b: Bulletin;
  groupe?: string;
  canPublish: boolean;
  onPublish: (b: Bulletin) => void;
}) {
  const totalCredits = b.notes.reduce((s, n) => s + n.credits, 0);
  const creditsValides = b.notes
    .filter((n) => n.note >= 10)
    .reduce((s, n) => s + n.credits, 0);

  return (
    <DetailShell
      icon={initials(`${b.prenom} ${b.nom}`)}
      title={`${b.prenom} ${b.nom}`}
      subtitle={`${b.cne} · ${b.filiere}`}
      badges={
        <>
          <span className={toneBadge(DECISION_TONE[b.decision])}>
            {b.decision}
          </span>
          <span className={toneBadge(MENTION_TONE[b.mention])}>
            {b.mention}
          </span>
          <span className={toneBadge(STATUT_BULLETIN_TONE[b.statut])}>
            {STATUT_BULLETIN_LABEL[b.statut]}
          </span>
        </>
      }
      footer={
        <div className="flex items-center justify-end gap-2">
          <button
            className={cn(ghostPill, "gap-1.5")}
            onClick={() => printBulletin(b, groupe)}
          >
            <FileDown className="h-3.5 w-3.5" /> Imprimer / PDF
          </button>
          {canPublish && b.statut !== "publie" ? (
            <button className={primaryPill} onClick={() => onPublish(b)}>
              <Send className="h-4 w-4" /> Publier
            </button>
          ) : null}
        </div>
      }
    >
      <DetailSection title="Synthèse">
        <DetailGrid>
          <DetailField label="CNE" value={b.cne} />
          <DetailField label="Filière" value={b.filiere} />
          {groupe ? <DetailField label="Groupe" value={groupe} /> : null}
          <DetailField label="Niveau" value={b.niveau} />
          <DetailField
            label="Session"
            value={<span className="capitalize">{b.session}</span>}
          />
          <DetailField
            label="Moyenne générale"
            value={`${b.moyenne.toFixed(2)} / 20`}
            tone={b.moyenne < 10 ? "negative" : "positive"}
          />
          <DetailField
            label="Crédits validés"
            value={`${creditsValides} / ${totalCredits}`}
          />
        </DetailGrid>
      </DetailSection>

      <DetailSection title="Notes par module">
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
          {b.notes.map((n) => (
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
          {/* The clinical/practical evaluation is graded separately from the
              taught modules but appears on the same transcript. */}
          <tr className="bg-brand/8">
            <td className="px-3 py-2 font-medium">
              Évaluation clinique / pratique
            </td>
            <td
              className={cn(
                "px-3 py-2 text-right font-semibold tabular-nums",
                b.evaluationClinique < 10 ? "text-alert" : "text-brand-dk",
              )}
            >
              {b.evaluationClinique.toFixed(2)}
            </td>
            <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
              2
            </td>
            <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
              4
            </td>
          </tr>
        </DetailTable>
      </DetailSection>
    </DetailShell>
  );
}

export const Route = createFileRoute("/dashboard/bulletins")({
  component: BulletinsPage,
});
