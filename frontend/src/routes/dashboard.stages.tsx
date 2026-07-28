import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, type ReactNode } from "react";
import { Eye, FileDown, FileText, Plus, Pencil, Trash2, Shuffle, Mail, GraduationCap } from "lucide-react";
import { motion } from "framer-motion";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { useIstpm } from "@/lib/istpm-store";
import { makePlaceholderPdf } from "@/lib/doc-store";
import { sendEmailApi } from "@/lib/istpm-api";
import {
  FILIERES,
  NIVEAUX,
  STATUT_STAGE_LABEL,
  STATUT_STAGE_TONE,
  fmtDate,
  type Stage,
  type Filiere,
  type Niveau,
  type StatutStage,
  type StructureAccueil,
  type Etudiant,
} from "@/lib/istpm-data";
import {
  softCard,
  eyebrowClass,
  primaryPill,
  ghostPill,
  iconButton,
  iconButtonDanger,
  toneBadge,
  dialogSurface,
  tableRow,
  cellTruncate,
  rowActions,
  initials,
  TONE_COLORS,
  CHART_COLORS,
  dashTooltip,
  renderPieLabel,
} from "@/lib/dash-ui";
import {
  PageHeader,
  FilterPanel,
  DataTable,
  DetailSection,
  DetailGrid,
  DetailField,

  DetailShell,
  ALL,
} from "@/components/dash-page";
import { usePagination, TablePagination } from "@/components/table-pagination";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const STATUTS: StatutStage[] = [
  "recherche",
  "convention_signee",
  "en_cours",
  "soutenance",
  "valide",
];

/**
 * Produit et télécharge réellement la convention ou le rapport.
 *
 * Ces deux boutons se contentaient d'afficher un message de réussite sans rien
 * livrer. Le document est maintenant généré localement, au même format que les
 * sujets d'examen.
 */
function downloadStageDoc(s: Stage, kind: "convention" | "rapport") {
  const titre =
    kind === "convention"
      ? "Convention de stage clinique"
      : "Rapport de stage clinique";

  const lignes = [
    "ISTEPM Agadir - Institut specialise des techniques paramedicales",
    "",
    titre,
    "",
    `Etudiant : ${s.prenom} ${s.nom}`,
    `CNE : ${s.cne}`,
    `Filiere : ${s.filiere} (${s.niveau})`,
    "",
    `Structure d'accueil : ${s.structure}`,
    `Service : ${s.service}`,
    `Periode : ${fmtDate(s.debut)} au ${fmtDate(s.fin)}`,
    "",
    `Tuteur clinique : ${s.encadrantClinique || "-"}`,
    `Tuteur academique : ${s.tuteurAcademique || "-"}`,
  ];

  if (kind === "rapport") {
    lignes.push(
      "",
      `Note de soutenance : ${
        s.noteSoutenance !== undefined
          ? `${s.noteSoutenance.toFixed(2)} / 20`
          : "non soutenu"
      }`,
    );
  } else {
    lignes.push(
      "",
      `Convention : ${s.conventionSignee ? "signee" : "en attente de signature"}`,
    );
  }

  lignes.push("", "Document de demonstration genere localement.");

  const blob = makePlaceholderPdf(lignes);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${kind}-${s.nom.toLowerCase()}-${s.cne}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

/* ------------------------------------------------------------------ */
/*  Analyse des stages                                                 */
/* ------------------------------------------------------------------ */

function ChartCard({
  title,
  children,
  height = 240,
}: {
  title: string;
  children: ReactNode;
  height?: number;
}) {
  return (
    <div className={cn(softCard, "p-4 sm:p-5")}>
      <p className={eyebrowClass}>{title}</p>
      <div className="mt-3 w-full" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          {children as React.ReactElement}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/**
 * Tableau de bord analytique des stages cliniques.
 *
 * Trois angles de lecture, tous dérivés en direct de l'état des stages :
 *  · statistiques par statut d'avancement ;
 *  · répartition par service / département d'accueil ;
 *  · volume par structure hospitalière.
 */
function StagesAnalytics({
  stages,
  etudiants,
  onConvention,
}: {
  stages: Stage[];
  etudiants: Etudiant[];
  onConvention: (etudiantId: string) => void;
}) {
  const [eligibleOpen, setEligibleOpen] = useState(false);

  const eligible = useMemo(() => {
    const activeIds = new Set(
      stages
        .filter((s) => s.statut !== "valide")
        .map((s) => s.etudiantId),
    );
    return etudiants.filter(
      (e) =>
        (e.niveau === "S2" || e.niveau === "S4" || e.niveau === "S6") &&
        !activeIds.has(e.id),
    );
  }, [etudiants, stages]);

  const parStatut = useMemo(
    () =>
      STATUTS.map((s) => ({
        name: STATUT_STAGE_LABEL[s],
        value: stages.filter((x) => x.statut === s).length,
      })),
    [stages],
  );

  const parService = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of stages) map.set(s.service, (map.get(s.service) ?? 0) + 1);
    return [...map.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [stages]);

  const parStructure = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of stages)
      map.set(s.structure, (map.get(s.structure) ?? 0) + 1);
    return [...map.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [stages]);

  if (!stages.length) return null;

  return (
    <>
    <section className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
      <ChartCard title="Statistiques des stages (par statut)">
        <BarChart data={parStatut}>
          <CartesianGrid stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 10 }}
            stroke="var(--muted-foreground)"
            interval={0}
            angle={-15}
            textAnchor="end"
            height={54}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 11 }}
            stroke="var(--muted-foreground)"
            width={28}
          />
          <Tooltip contentStyle={dashTooltip} cursor={false} />
          <Bar dataKey="value" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ChartCard>

      <ChartCard title="Répartition par service / département">
        <PieChart>
          <Pie
            data={parService}
            dataKey="value"
            nameKey="name"
            innerRadius="45%"
            outerRadius="78%"
            paddingAngle={2}
            label={renderPieLabel}
            labelLine={false}
          >
            {parService.map((_, i) => (
              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={dashTooltip} />
        </PieChart>
      </ChartCard>

      <ChartCard title="Stages par structure hospitalière" height={260}>
        <BarChart data={parStructure} layout="vertical">
          <CartesianGrid stroke="var(--border)" horizontal={false} />
          <XAxis
            type="number"
            allowDecimals={false}
            tick={{ fontSize: 11 }}
            stroke="var(--muted-foreground)"
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 10 }}
            stroke="var(--muted-foreground)"
            width={130}
          />
          <Tooltip contentStyle={dashTooltip} cursor={false} />
          <Bar dataKey="value" fill="var(--chart-2)" radius={[0, 6, 6, 0]} />
        </BarChart>
      </ChartCard>

      {/* Carte des étudiants éligibles */}
      <div
        className={cn(
          softCard,
          "flex cursor-pointer flex-col items-center justify-center p-6 text-center transition hover:shadow-md",
        )}
        onClick={() => setEligibleOpen(true)}
      >
        <span className="text-3xl font-bold tabular-nums text-brand-dk">
          {eligible.length}
        </span>
        <p className="mt-1 text-sm font-medium text-foreground">
          Étudiant{eligible.length > 1 ? "s" : ""} éligible{eligible.length > 1 ? "s" : ""}
        </p>
        <p className="text-xs text-muted-foreground">(S2, S4, S6 sans stage actif)</p>
      </div>
    </section>

    {/* Modal des étudiants éligibles */}
    <Dialog open={eligibleOpen} onOpenChange={setEligibleOpen}>
      <DialogContent className={cn(dialogSurface, "max-w-2xl")}>
        <DialogTitle className="sr-only">Étudiants éligibles aux stages</DialogTitle>
        <DialogDescription className="sr-only">
          {eligible.length} étudiant{eligible.length > 1 ? "s" : ""} éligible{eligible.length > 1 ? "s" : ""}
        </DialogDescription>
        <DetailShell
          icon={<GraduationCap className="h-5 w-5" />}
          title={`${eligible.length} étudiant${eligible.length > 1 ? "s" : ""} éligible${eligible.length > 1 ? "s" : ""}`}
          subtitle="S2, S4 ou S6 sans stage actif"
        >
          <div className="max-h-80 space-y-2 overflow-y-auto">
            {eligible.map((e) => (
              <div
                key={e.id}
                className="flex items-center gap-3 rounded-xl border border-brand/12 bg-card px-4 py-3"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand/10 text-xs font-bold text-brand-dk">
                  {e.prenom[0]}{e.nom[0]}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">
                    {e.prenom} {e.nom}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {e.cne} · {e.filiere} · {e.niveau}
                  </p>
                </div>
                <button
                  type="button"
                  className={cn(primaryPill, "h-8 gap-1.5 px-3 text-xs")}
                  onClick={() => {
                    setEligibleOpen(false);
                    onConvention(e.id);
                  }}
                >
                  <FileText className="h-3.5 w-3.5" /> Convention
                </button>
              </div>
            ))}
            {eligible.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Aucun étudiant éligible pour le moment.
              </p>
            )}
          </div>
        </DetailShell>
      </DialogContent>
    </Dialog>
    </>
  );
}

function StagesPage() {
  const { role } = useAuth();
  const { stages, etudiants, structuresAccueil, addStage, updateStage, deleteStage } = useIstpm();
  // Conventions are handled by student administration.
  const canManage = role === "directeur" || role === "responsable";

  const [search, setSearch] = useState("");
  const [filiere, setFiliere] = useState<string>(ALL);
  const [structure, setStructure] = useState<string>(ALL);
  const [statut, setStatut] = useState<string>(ALL);

  const [detail, setDetail] = useState<Stage | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Stage | null>(null);
  const [preselectStudentId, setPreselectStudentId] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Stage | null>(null);
  const [emailTarget, setEmailTarget] = useState<Stage | null>(null);
  const [emailTo, setEmailTo] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return stages.filter((s) => {
      if (filiere !== ALL && s.filiere !== filiere) return false;
      if (structure !== ALL && s.structure !== structure) return false;
      if (statut !== ALL && STATUT_STAGE_LABEL[s.statut] !== statut)
        return false;
      if (!q) return true;
      return `${s.cne} ${s.prenom} ${s.nom} ${s.structure} ${s.service} ${s.encadrantClinique}`
        .toLowerCase()
        .includes(q);
    });
  }, [stages, search, filiere, structure, statut]);

  const pager = usePagination(filtered, `${search}|${filiere}|${structure}|${statut}`);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Formation pratique"
        title="Stages cliniques"
        actions={
          canManage ? (
            <button
              className={primaryPill}
              onClick={() => {
                setEditing(null);
                setPreselectStudentId(null);
                setFormOpen(true);
              }}
            >
              <Plus className="h-4 w-4" /> Nouvelle convention
            </button>
          ) : undefined
        }
      />

      <StagesAnalytics
        stages={stages}
        etudiants={etudiants}
        onConvention={(etudiantId) => {
          setPreselectStudentId(etudiantId);
          setEditing(null);
          setFormOpen(true);
        }}
      />

      <FilterPanel
        search={search}
        onSearch={setSearch}
        placeholder="Rechercher par CNE, nom, structure, service…"
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
            id: "structure",
            label: "Structure",
            value: structure,
            onChange: setStructure,
            options: structuresAccueil.map((s) => s.nom),
            allLabel: "Toutes les structures",
          },
          {
            id: "statut",
            label: "Statut",
            value: statut,
            onChange: setStatut,
            options: STATUTS.map((s) => STATUT_STAGE_LABEL[s]),
            allLabel: "Tous les statuts",
          },
        ]}
      />

      <DataTable
        minWidth="min-w-[1150px]"
        isEmpty={filtered.length === 0}
        empty="Aucun stage ne correspond à ces critères."
        footer={
          <TablePagination
            page={pager.page}
            pageCount={pager.pageCount}
            total={pager.total}
            pageSize={pager.pageSize}
            onPage={pager.setPage}
            label="stages"
          />
        }
        head={
          <>
            <th>Étudiant</th>
            <th>Structure d'accueil</th>
            <th>Service</th>
            <th>Période</th>
            <th>Statut</th>
            <th className="w-28 text-center">Actions</th>
          </>
        }
      >
        {pager.pageItems.map((s, i) => (
          <motion.tr
            key={s.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.25, delay: i * 0.03, ease: "easeOut" }}
            onClick={() => setDetail(s)}
            className={tableRow}
          >
            <td
              className={cn("border-l-[3px] font-medium", cellTruncate)}
              style={{
                borderLeftColor: TONE_COLORS[STATUT_STAGE_TONE[s.statut]],
              }}
            >
              {s.prenom} {s.nom}
            </td>
            <td className={cellTruncate}>{s.structure}</td>
            <td className={cn("text-muted-foreground", cellTruncate)}>
              {s.service}
            </td>
            <td className="text-muted-foreground">
              {fmtDate(s.debut)} → {fmtDate(s.fin)}
            </td>
            <td>
              <span className={toneBadge(STATUT_STAGE_TONE[s.statut])}>
                {STATUT_STAGE_LABEL[s.statut]}
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
                  onClick={() => setDetail(s)}
                >
                  <Eye className="h-3.5 w-3.5" />
                </button>
                {canManage ? (
                  <>
                    <button
                      className={iconButton}
                      aria-label="Modifier"
                      onClick={() => {
                        setEditing(s);
                        setFormOpen(true);
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      className={iconButtonDanger}
                      aria-label="Supprimer"
                      onClick={() => setToDelete(s)}
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
          <DialogTitle className="sr-only">Détail du stage</DialogTitle>
          <DialogDescription className="sr-only">
            Convention, rapport et encadrement
          </DialogDescription>
          {detail
            ? (() => {
                const s = stages.find((x) => x.id === detail.id) ?? detail;
                return (
                  <DetailShell
                    icon={initials(`${s.prenom} ${s.nom}`)}
                    title={`${s.prenom} ${s.nom}`}
                    subtitle={`${s.cne} · ${s.filiere} · ${s.niveau}`}
                    badges={
                      <>
                        <span className={toneBadge(STATUT_STAGE_TONE[s.statut])}>
                          {STATUT_STAGE_LABEL[s.statut]}
                        </span>
                        <span
                          className={toneBadge(
                            s.conventionSignee ? "teal" : "red",
                          )}
                        >
                          {s.conventionSignee
                            ? "Convention signée"
                            : "Convention en attente"}
                        </span>
                      </>
                    }
                    footer={
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          className={iconButton + " w-auto gap-1.5 px-3 text-xs"}
                          onClick={() =>
                            s.conventionSignee
                              ? (downloadStageDoc(s, "convention"),
                                toast.success("Convention téléchargée (PDF)"))
                              : toast.error("Convention non encore signée")
                          }
                        >
                          <FileDown className="h-3.5 w-3.5" /> Convention
                        </button>
                        <button
                          className={iconButton + " w-auto gap-1.5 px-3 text-xs"}
                          onClick={() =>
                            s.noteSoutenance !== undefined
                              ? (downloadStageDoc(s, "rapport"),
                                toast.success("Rapport téléchargé (PDF)"))
                              : toast.error("Rapport de stage non encore déposé")
                          }
                        >
                          <FileText className="h-3.5 w-3.5" /> Rapport
                        </button>
                        <button
                          className={iconButton + " w-auto gap-1.5 px-3 text-xs"}
                          onClick={() => {
                            setEmailTarget(s);
                            setEmailTo(s.cne ? `${s.prenom}.${s.nom}@example.com`.toLowerCase() : "");
                          }}
                        >
                          <Mail className="h-3.5 w-3.5" /> Envoyer
                        </button>
                        {canManage && s.statut !== "valide" ? (
                          <button
                            className={primaryPill + " ms-auto"}
                            onClick={() => {
                              updateStage(s.id, { statut: "valide" });
                              toast.success(
                                `Stage validé   ${s.prenom} ${s.nom}`,
                              );
                            }}
                          >
                            Valider le stage
                          </button>
                        ) : null}
                      </div>
                    }
                  >
                    <DetailSection title="Lieu de stage">
                      <DetailGrid>
                        <DetailField
                          label="Structure d'accueil"
                          value={s.structure}
                          full
                        />
                        <DetailField label="Service" value={s.service} />
                        <DetailField label="Niveau" value={s.niveau} />
                        <DetailField label="Début" value={fmtDate(s.debut)} />
                        <DetailField label="Fin" value={fmtDate(s.fin)} />
                      </DetailGrid>
                    </DetailSection>

                    <DetailSection title="Encadrement">
                      <DetailGrid>
                        <DetailField
                          label="Tuteur clinique"
                          value={s.encadrantClinique}
                        />
                        <DetailField
                          label="Tuteur académique"
                          value={s.tuteurAcademique}
                        />
                      </DetailGrid>
                    </DetailSection>

                    <DetailSection title="Soutenance">
                      <DetailGrid>
                        <DetailField
                          label="Note de soutenance"
                          value={
                            s.noteSoutenance !== undefined
                              ? `${s.noteSoutenance.toFixed(2)} / 20`
                              : "Non soutenu"
                          }
                          tone={
                            s.noteSoutenance === undefined
                              ? "muted"
                              : s.noteSoutenance < 10
                                ? "negative"
                                : "positive"
                          }
                        />
                      </DetailGrid>
                    </DetailSection>
                  </DetailShell>
                );
              })()
            : null}
        </DialogContent>
      </Dialog>

      {/* Email convention dialog */}
      <Dialog open={!!emailTarget} onOpenChange={(o) => { if (!o) setEmailTarget(null); }}>
        <DialogContent className={dialogSurface}>
          <DialogTitle className="sr-only">Envoyer la convention</DialogTitle>
          <DialogDescription className="sr-only">
            Envoyer la convention de stage par email
          </DialogDescription>
          {emailTarget ? (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <p className="text-sm font-medium text-foreground">
                  Envoyer la convention à
                </p>
                <p className="text-xs text-muted-foreground">
                  {emailTarget.prenom} {emailTarget.nom} · {emailTarget.structure}
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email-to">Adresse email</Label>
                <Input
                  id="email-to"
                  type="email"
                  value={emailTo}
                  onChange={(e) => setEmailTo(e.target.value)}
                  placeholder="email@example.com"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className={cn(ghostPill, "h-9 px-4 text-sm")}
                  onClick={() => setEmailTarget(null)}
                >
                  Annuler
                </button>
                <button
                  type="button"
                  className={cn(primaryPill, "h-9 px-4 text-sm")}
                  disabled={!emailTo.trim()}
                  onClick={async () => {
                    const to = emailTo.trim();
                    if (!to) return;
                    const s = emailTarget!;
                    try {
                      const lignes = [
                        "ISTEPM Agadir - Institut specialise des techniques paramedicales",
                        "",
                        "Convention de stage clinique",
                        "",
                        `Etudiant : ${s.prenom} ${s.nom}`,
                        `CNE : ${s.cne}`,
                        `Filiere : ${s.filiere} (${s.niveau})`,
                        "",
                        `Structure d'accueil : ${s.structure}`,
                        `Service : ${s.service}`,
                        `Periode : ${fmtDate(s.debut)} au ${fmtDate(s.fin)}`,
                        "",
                        `Tuteur clinique : ${s.encadrantClinique || "-"}`,
                        `Tuteur academique : ${s.tuteurAcademique || "-"}`,
                        "",
                        `Convention : ${s.conventionSignee ? "signee" : "en attente de signature"}`,
                        "",
                        "Document de demonstration genere localement.",
                      ];
                      const blob = makePlaceholderPdf(lignes);
                      const buf = await blob.arrayBuffer();
                      const base64 = btoa(
                        new Uint8Array(buf).reduce(
                          (s, b) => s + String.fromCharCode(b),
                          "",
                        ),
                      );
                      const res = await sendEmailApi({
                        to,
                        subject: `Convention de stage — ${s.prenom} ${s.nom}`,
                        html: `<p>Veuillez trouver ci-joint la convention de stage de <strong>${s.prenom} ${s.nom}</strong> (${s.cne}, ${s.filiere}, ${s.niveau}).</p><p>Structure d'accueil : ${s.structure}<br/>Service : ${s.service}<br/>Période : ${s.debut} → ${s.fin}</p>`,
                        attachments: [
                          {
                            filename: `convention-${s.nom.toLowerCase()}-${s.cne}.pdf`,
                            content: base64,
                            contentType: "application/pdf",
                          },
                        ],
                      });
                      if (res.ok) {
                        toast.success("Convention envoyée par email");
                        setEmailTarget(null);
                      } else {
                        toast.error(res.error ?? "Échec de l'envoi");
                      }
                    } catch {
                      toast.error("Erreur lors de l'envoi de l'email");
                    }
                  }}
                >
                  <Mail className="h-4 w-4" /> Envoyer
                </button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {formOpen ? (
        <StageForm
          key={editing?.id ?? preselectStudentId ?? "new"}
          initial={editing}
          etudiants={etudiants}
          stages={stages}
          preselectEtudiantId={preselectStudentId}
          structuresAccueil={structuresAccueil}
          onCancel={() => { setFormOpen(false); setPreselectStudentId(null); }}
          onSubmit={(data) => {
            if (editing) {
              updateStage(editing.id, data);
              toast.success(`Stage mis à jour   ${data.prenom} ${data.nom}`);
            } else {
              addStage(data);
              toast.success(`Convention créée   ${data.prenom} ${data.nom}`);
            }
            setFormOpen(false);
            setPreselectStudentId(null);
          }}
        />
      ) : null}

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Supprimer ce stage ?"
        message={
          toDelete
            ? `Le stage de ${toDelete.prenom} ${toDelete.nom} à ${toDelete.structure} sera supprimé. Cette action est irréversible.`
            : ""
        }
        onConfirm={() => {
          if (!toDelete) return;
          deleteStage(toDelete.id);
          toast.success(`Stage supprimé   ${toDelete.prenom} ${toDelete.nom}`);
          setToDelete(null);
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */

function StageForm({
  initial,
  etudiants,
  stages: allStages,
  preselectEtudiantId,
  structuresAccueil: structures,
  onSubmit,
  onCancel,
}: {
  initial: Stage | null;
  etudiants: ReturnType<typeof useIstpm>["etudiants"];
  stages: Stage[];
  preselectEtudiantId?: string | null;
  structuresAccueil: StructureAccueil[];
  onSubmit: (data: Omit<Stage, "id">) => void;
  onCancel: () => void;
}) {
  const [f, setF] = useState(() => ({
    etudiantId: initial?.etudiantId ?? preselectEtudiantId ?? "",
    structure: (initial?.structure ?? "") as string,
    service: initial?.service ?? "",
    encadrantClinique: initial?.encadrantClinique ?? "",
    tuteurAcademique: initial?.tuteurAcademique ?? "",
    debut: initial?.debut ?? "",
    fin: initial?.fin ?? "",
    statut: (initial?.statut ?? "recherche") as StatutStage,
    conventionSignee: initial?.conventionSignee ? "oui" : "non",
    noteSoutenance:
      initial?.noteSoutenance !== undefined
        ? (initial.noteSoutenance as number)
        : ("" as number | ""),
  }));
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => {
    setF((prev) => ({ ...prev, [k]: v }));
    setErrors((prev) => ({ ...prev, [k]: undefined }));
  };

  const submit = () => {
    const next: Record<string, string> = {};
    const etudiant = etudiants.find((e) => e.id === f.etudiantId);
    if (!etudiant) next.etudiantId = "Étudiant obligatoire";
    if (!f.structure) next.structure = "Structure obligatoire";
    if (!f.service.trim()) next.service = "Service obligatoire";
    if (!f.debut) next.debut = "Date de début obligatoire";
    if (!f.fin) next.fin = "Date de fin obligatoire";
    if (f.debut && f.fin && f.fin < f.debut)
      next.fin = "La fin doit suivre le début";
    if (f.noteSoutenance !== "" && (f.noteSoutenance < 0 || f.noteSoutenance > 20))
      next.noteSoutenance = "Note entre 0 et 20";

    if (Object.keys(next).length || !etudiant) {
      setErrors(next);
      toast.error("Veuillez corriger les champs signalés");
      return;
    }

    onSubmit({
      // Student identity is denormalised onto the stage record so the table can
      // render without a join; it is re-copied on every save.
      etudiantId: etudiant.id,
      cne: etudiant.cne,
      prenom: etudiant.prenom,
      nom: etudiant.nom,
      filiere: etudiant.filiere as Filiere,
      niveau: etudiant.niveau as Niveau,
      structure: f.structure,
      service: f.service.trim(),
      encadrantClinique: f.encadrantClinique.trim(),
      tuteurAcademique: f.tuteurAcademique.trim(),
      debut: f.debut,
      fin: f.fin,
      statut: f.statut,
      conventionSignee: f.conventionSignee === "oui",
      ...(f.noteSoutenance === ""
        ? {}
        : { noteSoutenance: Number(f.noteSoutenance) }),
    });
  };

  return (
    <FormDialog
      open
      onOpenChange={(o) => !o && onCancel()}
      wide
      title={initial ? "Modifier le stage" : "Nouvelle convention de stage"}
      subtitle={
        initial
          ? `${initial.prenom} ${initial.nom}   ${initial.structure}`
          : "Affecter un étudiant à une structure d'accueil"
      }
      submitLabel={initial ? "Enregistrer les modifications" : "Créer"}
      onSubmit={submit}
    >
      <FullWidth>
        <SelectField
          label="Étudiant"
          required
          value={f.etudiantId}
          onChange={(v) => set("etudiantId", v)}
          options={etudiants.map((e) => ({
            value: e.id,
            label: `${e.prenom} ${e.nom}   ${e.cne} (${e.niveau})`,
          }))}
          error={errors.etudiantId}
        />
      </FullWidth>
      <FullWidth>
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <SelectField
              label="Structure d'accueil"
              required
              value={f.structure}
              onChange={(v) => set("structure", v)}
              options={structures.map((s) => s.nom)}
              error={errors.structure}
            />
          </div>
          <button
            type="button"
            className={cn(ghostPill, "mb-0.5 h-9 gap-1.5 px-3 text-xs")}
            title="Choisir aléatoirement une structure avec des places disponibles"
            onClick={() => {
              const counts = new Map<string, number>();
              for (const s of allStages) {
                if (s.statut !== "valide")
                  counts.set(s.structure, (counts.get(s.structure) ?? 0) + 1);
              }
              const dispo = structures.filter(
                (st) => (counts.get(st.nom) ?? 0) < st.capacite,
              );
              if (dispo.length === 0) {
                toast.error("Aucune structure avec des places disponibles");
                return;
              }
              const pick = dispo[Math.floor(Math.random() * dispo.length)];
              set("structure", pick.nom);
              toast.success(`Structure choisie   ${pick.nom}`);
            }}
          >
            <Shuffle className="h-3.5 w-3.5" /> Aléatoire
          </button>
        </div>
      </FullWidth>
      <TextField
        label="Service"
        required
        value={f.service}
        onChange={(v) => set("service", v)}
        placeholder="Médecine interne"
        error={errors.service}
      />
      <SelectField
        label="Statut"
        value={f.statut}
        onChange={(v) => set("statut", v)}
        options={STATUTS.map((s) => ({
          value: s,
          label: STATUT_STAGE_LABEL[s],
        }))}
      />
      <TextField
        label="Encadrant clinique"
        value={f.encadrantClinique}
        onChange={(v) => set("encadrantClinique", v)}
        placeholder="Dr. A. Bennis (Cadre infirmier)"
      />
      <TextField
        label="Tuteur académique"
        value={f.tuteurAcademique}
        onChange={(v) => set("tuteurAcademique", v)}
        placeholder="Mme S. El Idrissi"
      />
      <TextField
        label="Début"
        required
        type="date"
        value={f.debut}
        onChange={(v) => set("debut", v)}
        error={errors.debut}
      />
      <TextField
        label="Fin"
        required
        type="date"
        value={f.fin}
        onChange={(v) => set("fin", v)}
        error={errors.fin}
      />
      <SelectField
        label="Convention signée"
        value={f.conventionSignee}
        onChange={(v) => set("conventionSignee", v)}
        options={[
          { value: "oui", label: "Oui" },
          { value: "non", label: "Non" },
        ]}
      />
      <NumberField
        label="Note de soutenance"
        suffix="/20"
        min={0}
        max={20}
        step={0.25}
        value={f.noteSoutenance}
        onChange={(v) => set("noteSoutenance", v)}
        error={errors.noteSoutenance}
      />
    </FormDialog>
  );
}

export const Route = createFileRoute("/dashboard/stages")({
  component: StagesPage,
});
