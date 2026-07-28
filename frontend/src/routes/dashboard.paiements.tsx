import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, BellRing, Eye, Receipt, ListChecks, CalendarDays, Search, Check, Clock, AlertTriangle, Ban } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { useIstpm } from "@/lib/istpm-store";
import {
  ANNEES_UNIVERSITAIRES,
  FILIERES,
  NIVEAUX,
  ANNEES_ETUDE,
  MOIS_ACADEMIQUE,
  anneeEtude,
  STATUT_PAIEMENT_LABEL,
  STATUT_PAIEMENT_TONE,
  fmtDate,
  fmtMAD,
  getAcademicYearMonths,
  getCurrentAcademicYear,
  getDefaultMois,
  type Etudiant,
  type LignePaiement,
  type StatutPaiement,
} from "@/lib/istpm-data";
import {
  softCard,
  primaryPill,
  ghostPill,
  toneBadge,
  tableRow,
  cellTruncate,
  rowActions,
  iconButton,
  TONE_COLORS,
  dialogSurface,
  softInput,
  labelClass,
} from "@/lib/dash-ui";
import {
  PageHeader,
  FilterPanel,
  DataTable,
  DetailShell,
  DetailSection,
  DetailGrid,
  DetailField,
  DetailTable,
  ALL,
} from "@/components/dash-page";
import { usePagination, TablePagination } from "@/components/table-pagination";
import {
  FormDialog,
  TextField,
  NumberField,
  SelectField,
  ComboBoxField,
  FullWidth,
} from "@/components/dash-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { softSelectTrigger, softSelectContent } from "@/lib/dash-ui";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DashTabs } from "@/components/dash-tabs";
import { cn } from "@/lib/utils";

const MODES: LignePaiement["mode"][] = [
  "Espèces",
  "Virement",
  "Carte",
  "Chèque",
];
const STATUTS: StatutPaiement[] = ["paye", "en_attente", "retard", "impaye"];

const ICON_BY_STATUT: Record<StatutPaiement, typeof Check> = {
  paye: Check,
  en_attente: Clock,
  retard: AlertTriangle,
  impaye: Ban,
};

/**
 * Clé de tri d'un mois de scolarité (« septembre 2025 ») selon l'ordre de
 * l'année scolaire (septembre → juin), toutes années confondues.
 */
function moisSortKey(key: string): number {
  const [name = "", yearStr = "0"] = key.trim().split(/\s+/);
  const idx = (MOIS_ACADEMIQUE as readonly string[]).indexOf(name.toLowerCase());
  const i = idx < 0 ? 99 : idx;
  const year = Number.parseInt(yearStr, 10) || 0;
  // Sep–déc (0–3) appartiennent à l'année de début ; jan–juin à l'année suivante.
  const startYear = i <= 3 ? year : year - 1;
  return startYear * 100 + i;
}

function PaiementsPage() {
  const { role } = useAuth();
  const { etudiants, financier, aRelancer, addPaiement } = useIstpm();
  const canEdit = role === "directeur" || role === "responsable";

  const [search, setSearch] = useState("");
  const [filiere, setFiliere] = useState<string>(ALL);
  const [semestre, setSemestre] = useState<string>(ALL);
  const [annee, setAnnee] = useState<string>(ALL);
  const [statut, setStatut] = useState<string>(ALL);
  const [mois, setMois] = useState<string>(ALL);

  // Options du filtre « Mois » : mois académiques (septembre → juin), capitalisés.
  const moisOptions = useMemo(
    () => MOIS_ACADEMIQUE.map((m) => m.charAt(0).toUpperCase() + m.slice(1)),
    [],
  );
  const [addOpen, setAddOpen] = useState(false);
  const [relanceOpen, setRelanceOpen] = useState(false);
  const [detail, setDetail] = useState<Etudiant | null>(null);
  const [tab, setTab] = useState(0); // 0 = transactions · 1 = suivi mensuel
  const [academicYear, setAcademicYear] = useState(getCurrentAcademicYear);
  const months = useMemo(() => getAcademicYearMonths(academicYear), [academicYear]);

  // Vue « historique par étudiant » : une ligne par étudiant, résumant l'ensemble
  // de ses règlements. Le détail complet s'ouvre dans une modale.
  const parEtudiant = useMemo(() => {
    const q = search.trim().toLowerCase();
    return etudiants
      .filter((e) => {
        if (filiere !== ALL && e.filiere !== filiere) return false;
        if (semestre !== ALL && e.niveau !== semestre) return false;
        if (annee !== ALL && anneeEtude(e.niveau) !== annee) return false;
        if (statut !== ALL && STATUT_PAIEMENT_LABEL[e.paiement] !== statut)
          return false;
        if (mois !== ALL) {
          // Le suivi mensuel vit dans `paiementsMensuels` (clé « septembre 2025 »
          // → statut). On retient l'étudiant qui a réglé le mois choisi ; à
          // défaut, on retombe sur une ligne d'historique portant ce mois.
          const target = mois.toLowerCase();
          const regleParMois = Object.entries(e.paiementsMensuels ?? {}).some(
            ([k, v]) => k.toLowerCase().startsWith(target) && v === "paye",
          );
          const regleParHistorique = e.historique.some(
            (h) =>
              h.statut === "paye" &&
              (h.mois?.toLowerCase().startsWith(target) ||
                h.periode?.toLowerCase().includes(target)),
          );
          if (!regleParMois && !regleParHistorique) return false;
        }
        if (!q) return true;
        return `${e.cne} ${e.prenom} ${e.nom}`.toLowerCase().includes(q);
      })
      .map((e) => {
        const totalPaye = e.historique
          .filter((h) => h.statut === "paye")
          .reduce((s, h) => s + h.montant, 0);
        const dernier = e.historique.reduce(
          (d, h) => (h.date > d ? h.date : d),
          "",
        );
        // Décompte des mois par statut (source : suivi mensuel).
        const vals = Object.values(e.paiementsMensuels ?? {});
        const moisImpaye = vals.filter((v) => v === "impaye").length;
        const moisRetard = vals.filter((v) => v === "retard").length;
        const moisEnAttente = vals.filter((v) => v === "en_attente").length;
        const moisNonPayes = vals.filter((v) => v !== "paye").length;
        const resteDu = moisNonPayes * e.fraisMensuels;
        return {
          etudiant: e,
          totalPaye,
          dernier,
          resteDu,
          moisImpaye,
          moisRetard,
          moisEnAttente,
        };
      });
  }, [etudiants, search, filiere, semestre, annee, statut, mois]);

  const pager = usePagination(
    parEtudiant,
    `${search}|${filiere}|${semestre}|${annee}|${statut}|${mois}`,
  );

  const kpis = [
    { label: "Encaissé", value: fmtMAD(financier.encaisse), tone: "teal" },
    {
      label: "Encaissé ce mois",
      value: fmtMAD(financier.encaisseCeMois),
      tone: "teal",
    },
    { label: "En attente", value: fmtMAD(financier.enAttente), tone: "amber" },
    { label: "Retard", value: fmtMAD(financier.retard), tone: "red" },
    { label: "Impayé", value: fmtMAD(financier.impaye), tone: "red" },
  ] as const;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Finances"
        title="Paiements"
        actions={
          <>
            {canEdit ? (
              <button
                className={cn(ghostPill, "gap-1.5")}
                onClick={() => setRelanceOpen(true)}
              >
                <BellRing className="h-3.5 w-3.5" /> Relances ({aRelancer.length})
              </button>
            ) : null}
            {canEdit ? (
              <button onClick={() => setAddOpen(true)} className={primaryPill}>
                <Plus className="h-4 w-4" /> Nouveau paiement
              </button>
            ) : null}
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-5">
        {kpis.map((k, i) => (
          <motion.div
            key={k.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: i * 0.06, ease: "easeOut" }}
            className={cn(softCard, "p-4")}
          >
            <div
              className="mb-2.5 h-1.5 w-9 rounded-full"
              style={{ backgroundColor: TONE_COLORS[k.tone] }}
            />
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {k.label}
            </p>
            <p className="mt-1.5 font-display text-lg font-bold tracking-tight text-foreground">
              {k.value}
            </p>
          </motion.div>
        ))}
      </div>

      <DashTabs
        tabs={[
          { label: "Transactions", icon: ListChecks },
          { label: "Suivi mensuel", short: "Mensuel", icon: CalendarDays },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 0 ? (
        <>
      <FilterPanel
        search={search}
        onSearch={setSearch}
        placeholder="Rechercher par CNE, étudiant, reçu, période…"
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
            id: "semestre",
            label: "Semestre",
            value: semestre,
            onChange: setSemestre,
            options: NIVEAUX,
            allLabel: "Tous les semestres",
          },
          {
            id: "annee",
            label: "Année",
            value: annee,
            onChange: setAnnee,
            options: ANNEES_ETUDE,
            allLabel: "Toutes les années",
          },
          {
            id: "statut",
            label: "Statut",
            value: statut,
            onChange: setStatut,
            options: STATUTS.map((s) => STATUT_PAIEMENT_LABEL[s]),
            allLabel: "Tous les statuts",
          },
          {
            id: "mois",
            label: "Mois",
            value: mois,
            onChange: setMois,
            options: moisOptions,
            allLabel: "Tous les mois",
          },
        ]}
      />

      <DataTable
        minWidth="min-w-[1100px]"
        isEmpty={parEtudiant.length === 0}
        empty="Aucun étudiant ne correspond à ces critères."
        footer={
          <TablePagination
            page={pager.page}
            pageCount={pager.pageCount}
            total={pager.total}
            pageSize={pager.pageSize}
            onPage={pager.setPage}
            label="étudiants"
          />
        }
        head={
          <>
            <th>Étudiant</th>
            <th>Filière</th>
            <th className="text-center">Semestre</th>
            <th>Année</th>
            <th className="text-right">Total réglé</th>
            <th className="text-right">Reste dû</th>
            <th>Statut</th>
            <th className="w-20 text-center">Actions</th>
          </>
        }
      >
        {pager.pageItems.map((r, i) => (
          <motion.tr
            key={r.etudiant.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.25, delay: i * 0.03, ease: "easeOut" }}
            onClick={() => setDetail(r.etudiant)}
            className={tableRow}
          >
            <td
              className={cn("border-l-[3px] font-medium", cellTruncate)}
              style={{
                borderLeftColor: TONE_COLORS[STATUT_PAIEMENT_TONE[r.etudiant.paiement]],
              }}
            >
              {r.etudiant.prenom} {r.etudiant.nom}
            </td>
            <td className={cn("text-muted-foreground", cellTruncate)}>
              {r.etudiant.filiere}
            </td>
            <td className="text-center tabular-nums text-muted-foreground">
              {r.etudiant.niveau}
            </td>
            <td className="text-muted-foreground">
              {anneeEtude(r.etudiant.niveau)}
            </td>
            <td className="text-right font-semibold tabular-nums text-brand-dk">
              {fmtMAD(r.totalPaye)}
            </td>
            <td
              className={cn(
                "text-right font-semibold tabular-nums",
                r.resteDu > 0 ? "text-alert" : "text-muted-foreground",
              )}
            >
              {r.resteDu > 0 ? fmtMAD(r.resteDu) : "—"}
            </td>
            <td>
              {(() => {
                // Précision selon le statut : nb de mois impayés / en retard,
                // ou reste à payer pour « en attente ».
                const st = r.etudiant.paiement;
                let detail: string | null = null;
                if (st === "impaye" && r.moisImpaye > 0)
                  detail = `${r.moisImpaye} mois impayé${r.moisImpaye > 1 ? "s" : ""}`;
                else if (st === "retard" && r.moisRetard > 0)
                  detail = `${r.moisRetard} mois en retard`;
                else if (st === "en_attente" && r.resteDu > 0)
                  detail = `reste ${fmtMAD(r.resteDu)}`;
                return (
                  <div className="flex flex-col items-start gap-1">
                    <span className={toneBadge(STATUT_PAIEMENT_TONE[st])}>
                      {STATUT_PAIEMENT_LABEL[st]}
                    </span>
                    {detail ? (
                      <span className="text-[11px] text-muted-foreground">
                        {detail}
                      </span>
                    ) : null}
                  </div>
                );
              })()}
            </td>
            <td
              className="text-center"
              onClick={(ev) => ev.stopPropagation()}
            >
              <div className={rowActions}>
                <button
                  className={iconButton}
                  aria-label="Voir l'historique"
                  onClick={() => setDetail(r.etudiant)}
                >
                  <Eye className="h-3.5 w-3.5" />
                </button>
              </div>
            </td>
          </motion.tr>
        ))}
      </DataTable>
        </>
      ) : (
        <MonthlyTracker etudiants={etudiants} canEdit={canEdit} academicYear={academicYear} onAcademicYearChange={setAcademicYear} months={months} />
      )}

      {/* Historique complet des paiements d'un étudiant */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className={dialogSurface}>
          <DialogTitle className="sr-only">Historique des paiements</DialogTitle>
          <DialogDescription className="sr-only">
            Tous les règlements de l'étudiant sélectionné
          </DialogDescription>
          {detail ? (() => {
            const e = etudiants.find((x) => x.id === detail.id) ?? detail;
            const totalPaye = e.historique
              .filter((h) => h.statut === "paye")
              .reduce((s, h) => s + h.montant, 0);
            const lignes = e.historique
              .slice()
              .sort((a, b) => (a.date > b.date ? -1 : 1));
            // Tous les mois de scolarité avec leur statut (suivi mensuel).
            const moisRows = Object.entries(e.paiementsMensuels ?? {})
              .map(([m, st]) => ({ mois: m, statut: st as StatutPaiement }))
              .sort((a, b) => moisSortKey(a.mois) - moisSortKey(b.mois));
            const moisNonPayes = moisRows.filter((m) => m.statut !== "paye").length;
            const resteDu = moisNonPayes * e.fraisMensuels;
            return (
              <DetailShell
                icon={<Receipt className="h-5 w-5" />}
                title={`${e.prenom} ${e.nom}`}
                subtitle={`${e.cne} · ${e.filiere}`}
                badges={
                  <span className={toneBadge(STATUT_PAIEMENT_TONE[e.paiement])}>
                    {STATUT_PAIEMENT_LABEL[e.paiement]}
                  </span>
                }
              >
                <DetailSection title="Synthèse">
                  <DetailGrid>
                    <DetailField label="Semestre" value={e.niveau} />
                    <DetailField label="Année" value={anneeEtude(e.niveau)} />
                    <DetailField label="Groupe" value={e.groupe} />
                    <DetailField
                      label="Frais mensuels"
                      value={fmtMAD(e.fraisMensuels)}
                    />
                    <DetailField
                      label="Total réglé"
                      value={fmtMAD(totalPaye)}
                      tone="positive"
                    />
                    <DetailField
                      label="Reste dû"
                      value={resteDu > 0 ? fmtMAD(resteDu) : "—"}
                      tone={resteDu > 0 ? "negative" : "default"}
                    />
                  </DetailGrid>
                </DetailSection>

                <DetailSection
                  title={`Statut mensuel${
                    moisNonPayes ? ` · ${moisNonPayes} mois non réglé(s)` : ""
                  }`}
                >
                  {moisRows.length ? (
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {moisRows.map((m) => (
                        <div
                          key={m.mois}
                          className={cn(
                            "flex items-center justify-between gap-2 rounded-xl border px-3 py-2",
                            m.statut === "paye"
                              ? "border-brand/20 bg-brand/5"
                              : "border-brand/12 bg-muted/40",
                          )}
                        >
                          <span className="truncate text-xs font-medium capitalize text-foreground">
                            {m.mois}
                          </span>
                          <span className={toneBadge(STATUT_PAIEMENT_TONE[m.statut])}>
                            {STATUT_PAIEMENT_LABEL[m.statut]}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Aucun suivi mensuel enregistré pour cet étudiant.
                    </p>
                  )}
                </DetailSection>

                <DetailSection title={`Historique des paiements (${lignes.length})`}>
                  {lignes.length ? (
                    <DetailTable
                      head={
                        <>
                          <th className="px-3 py-2">Date</th>
                          <th className="px-3 py-2">Mois réglé</th>
                          <th className="px-3 py-2 text-right">Montant</th>
                          <th className="px-3 py-2">Mode</th>
                          <th className="px-3 py-2">Reçu</th>
                          <th className="px-3 py-2">Statut</th>
                        </>
                      }
                    >
                      {lignes.map((h, idx) => (
                        <tr key={`${h.recu}-${idx}`}>
                          <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                            {fmtDate(h.date)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 capitalize">
                            {h.mois ?? h.periode}
                          </td>
                          <td className="px-3 py-2 text-right font-semibold tabular-nums">
                            {fmtMAD(h.montant)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                            {h.mode}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-muted-foreground">
                            {h.recu}
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
                    <p className="text-sm text-muted-foreground">
                      Aucun règlement enregistré pour cet étudiant.
                    </p>
                  )}
                </DetailSection>
              </DetailShell>
            );
          })() : null}
        </DialogContent>
      </Dialog>

      {addOpen ? (
        <PaiementForm
          etudiants={etudiants}
          academicYear={academicYear}
          months={months}
          onCancel={() => setAddOpen(false)}
          onSubmit={({ etudiantId, ligne }) => {
            const et = etudiants.find((e) => e.id === etudiantId)!;
            addPaiement(etudiantId, ligne);
            toast.success(
              `Paiement de ${fmtMAD(ligne.montant)} enregistré   ${et.prenom} ${et.nom}`,
            );
            setAddOpen(false);
          }}
        />
      ) : null}

      {/* Relances   outstanding balances to chase. */}
      <Dialog open={relanceOpen} onOpenChange={setRelanceOpen}>
        <DialogContent className={dialogSurface}>
          <DialogTitle className="sr-only">Relances</DialogTitle>
          <DialogDescription className="sr-only">
            Étudiants avec un solde restant dû
          </DialogDescription>
          <DetailShell
            title="Relances à envoyer"
            subtitle={`${aRelancer.length} étudiant(s) avec un solde restant dû`}
            footer={
              <button
                className={cn(primaryPill, "w-full justify-center")}
                disabled={aRelancer.length === 0}
                onClick={() => {
                  toast.success(
                    `${aRelancer.length} relance(s) envoyée(s) par e-mail et SMS`,
                  );
                  setRelanceOpen(false);
                }}
              >
                <BellRing className="h-4 w-4" /> Envoyer toutes les relances
              </button>
            }
          >
            {aRelancer.length ? (
              <ul className="space-y-2">
                {aRelancer.map((e) => (
                  <li
                    key={e.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-brand/12 px-4 py-3"
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-foreground">
                        {e.prenom} {e.nom}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {e.cne} · {e.filiere}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span
                        className={toneBadge(STATUT_PAIEMENT_TONE[e.paiement])}
                      >
                        {STATUT_PAIEMENT_LABEL[e.paiement]}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                Aucun solde en attente   tous les étudiants sont à jour.
              </p>
            )}
          </DetailShell>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Suivi mensuel des paiements                                        */
/* ------------------------------------------------------------------ */

/**
 * Suivi mensuel des paiements.
 *
 * L'institut fonctionne au mois : pour un étudiant donné, chaque mois de l'année
 * scolaire porte son propre statut de règlement (payé / en attente / retard /
 * impayé), modifiable directement ici. Le statut provient de `paiementsMensuels`
 * (ou, à défaut, du dernier règlement rattaché à ce mois) et « Non renseigné »
 * vaut impayé.
 */
function MonthlyTracker({
  etudiants,
  canEdit,
  academicYear,
  onAcademicYearChange,
  months,
}: {
  etudiants: ReturnType<typeof useIstpm>["etudiants"];
  canEdit: boolean;
  academicYear: string;
  onAcademicYearChange: (y: string) => void;
  months: string[];
}) {
  const { setMoisPaiementStatut } = useIstpm();
  const [etudiantId, setEtudiantId] = useState<string>(etudiants[0]?.id ?? "");
  const etudiant = etudiants.find((e) => e.id === etudiantId);

  const statutMois = (mois: string): StatutPaiement => {
    if (!etudiant) return "impaye";
    const explicite = etudiant.paiementsMensuels?.[mois];
    if (explicite) return explicite;
    const ligne = etudiant.historique.find(
      (h) => h.mois?.toLowerCase() === mois,
    );
    return ligne?.statut ?? "impaye";
  };

  const montantMois = (mois: string): number =>
    etudiant?.historique
      .filter((h) => h.mois?.toLowerCase() === mois)
      .reduce((s, h) => s + h.montant, 0) ?? 0;

  const nbRegles = etudiant
    ? months.filter((m) => statutMois(m) === "paye").length
    : 0;

  return (
    <section className={cn(softCard, "overflow-hidden p-0")}>
      {/* Gradient header */}
      <div className="bg-gradient-to-r from-brand/10 via-brand/5 to-transparent px-5 pb-4 pt-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
          <div>
            <h3 className="font-display text-base font-bold tracking-tight text-foreground">
              Suivi mensuel
            </h3>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Statut de règlement, mois par mois, pour un étudiant donné.
            </p>
          </div>
          <div className="w-full sm:w-44">
            <SelectField
              label="Année universitaire"
              value={academicYear}
              onChange={onAcademicYearChange}
              options={ANNEES_UNIVERSITAIRES.map((y) => ({
                value: y,
                label: `${y.replace("/", "–")}`,
              }))}
            />
          </div>
          <div className="w-full max-w-xs">
            <ComboBoxField
            label="Étudiant"
            value={etudiantId}
            onChange={setEtudiantId}
            options={etudiants.map((e) => ({
              value: e.id,
              label: `${e.prenom} ${e.nom}   ${e.cne}`,
            }))}
            placeholder="Choisir un étudiant…"
            searchPlaceholder="Nom, prénom ou CNE…"
            emptyText="Aucun étudiant trouvé."
          />
          </div>
      </div>
      </div>

      {etudiant ? (
        <>
          <div className="px-5 pt-4">
            <p className="text-xs text-muted-foreground">
              <strong className="font-semibold text-foreground">{nbRegles}</strong>{" "}
              mois payé(s) sur {months.length} · <strong className="font-semibold text-foreground">{fmtMAD(etudiant.fraisMensuels)}</strong>/mois
            </p>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2.5 px-5 pb-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {months.map((m, i) => {
              const st = statutMois(m);
              const montant = montantMois(m);
              const StatutIcon = ICON_BY_STATUT[st];
              return (
                <motion.div
                  key={m}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.25, delay: i * 0.03, ease: "easeOut" }}
                  className={cn(
                    "rounded-2xl border px-3 py-3",
                    st === "paye"
                      ? "border-brand/25 bg-brand/5"
                      : "border-brand/12 bg-muted/40",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold capitalize text-foreground">
                      {m}
                    </p>
                    <StatutIcon
                      className="h-4 w-4 shrink-0"
                      style={{ color: TONE_COLORS[STATUT_PAIEMENT_TONE[st]] }}
                    />
                  </div>
                  {canEdit ? (
                    <Select
                      value={st}
                      onValueChange={(v) =>
                        setMoisPaiementStatut(etudiant.id, m, v as StatutPaiement)
                      }
                    >
                      <SelectTrigger
                        className={cn(softSelectTrigger, "mt-2 h-8 w-full text-xs")}
                        aria-label={`Statut de ${m}`}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className={softSelectContent}>
                        {STATUTS.map((s) => (
                          <SelectItem key={s} value={s} className="text-xs">
                            <span className="flex items-center gap-1.5">
                              {(() => {
                                const Icn = ICON_BY_STATUT[s];
                                return <Icn className="h-3.5 w-3.5" />;
                              })()}
                              {STATUT_PAIEMENT_LABEL[s]}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="mt-2">
                      <span className={toneBadge(STATUT_PAIEMENT_TONE[st])}>
                        {STATUT_PAIEMENT_LABEL[st]}
                      </span>
                    </p>
                  )}
                  {montant > 0 ? (
                    <p className="mt-1.5 text-[11px] font-medium tabular-nums text-muted-foreground">
                      {fmtMAD(montant)}
                    </p>
                  ) : null}
                </motion.div>
              );
            })}
          </div>
        </>
      ) : (
        <p className="px-5 pb-5 pt-4 text-sm text-muted-foreground">
          Sélectionner un étudiant pour afficher son suivi mensuel.
        </p>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */

/**
 * Champ étudiant en autocomplétion : l'utilisateur tape directement dans le
 * champ et la liste se filtre en direct sous le champ (nom, prénom ou CNE).
 */
function StudentSearchField({
  students,
  value,
  onChange,
  error,
}: {
  students: { id: string; prenom: string; nom: string; cne: string }[];
  value: string;
  onChange: (id: string) => void;
  error?: string;
}) {
  const label = (s: { prenom: string; nom: string; cne: string }) =>
    `${s.prenom} ${s.nom}   ${s.cne}`;
  const selected = students.find((s) => s.id === value);
  const [query, setQuery] = useState(selected ? label(selected) : "");
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const q = query.trim().toLowerCase();
  const matches = useMemo(() => {
    const base = q
      ? students.filter((s) =>
          `${s.prenom} ${s.nom} ${s.cne}`.toLowerCase().includes(q),
        )
      : students;
    return base.slice(0, 8);
  }, [students, q]);

  // Un clic hors du champ referme la liste.
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const choose = (s: { id: string; prenom: string; nom: string; cne: string }) => {
    onChange(s.id);
    setQuery(label(s));
    setOpen(false);
  };

  return (
    <div className="space-y-1.5">
      <Label className={labelClass}>
        Étudiant<span className="ml-0.5 text-alert">*</span>
      </Label>
      <div ref={boxRef} className="relative">
        <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            if (value) onChange("");
          }}
          onFocus={() => setOpen(true)}
          placeholder="Rechercher un étudiant…"
          autoComplete="off"
          className={cn(softInput, "ps-9", error && "border-alert focus-visible:border-alert")}
        />
        {open ? (
          <ul
            className={cn(
              softSelectContent,
              "absolute z-50 mt-1 max-h-64 w-full overflow-auto border bg-popover p-1 shadow-lg surface-3",
            )}
          >
            {matches.length ? (
              matches.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      choose(s);
                    }}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-start text-sm transition-colors hover:bg-brand/10",
                      value === s.id && "bg-brand/10",
                    )}
                  >
                    <span className="truncate">
                      {s.prenom} {s.nom}
                    </span>
                    <span className="ms-auto shrink-0 font-mono text-xs text-muted-foreground">
                      {s.cne}
                    </span>
                  </button>
                </li>
              ))
            ) : (
              <li className="px-3 py-2 text-sm text-muted-foreground">
                Aucun étudiant trouvé.
              </li>
            )}
          </ul>
        ) : null}
      </div>
      {error ? <p className="text-[11px] text-alert">{error}</p> : null}
    </div>
  );
}

function PaiementForm({
  etudiants,
  academicYear,
  months,
  onSubmit,
  onCancel,
}: {
  etudiants: ReturnType<typeof useIstpm>["etudiants"];
  academicYear: string;
  months: string[];
  onSubmit: (v: {
    etudiantId: string;
    ligne: Omit<LignePaiement, "recu">;
  }) => void;
  onCancel: () => void;
}) {
  const [f, setF] = useState({
    etudiantId: "",
    montant: "" as number | "",
    mode: "Espèces" as LignePaiement["mode"],
    statut: "paye" as StatutPaiement,
    mois: getDefaultMois(academicYear),
    date: new Date().toISOString().slice(0, 10),
  });
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

  const etudiant = etudiants.find((e) => e.id === f.etudiantId);

  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => {
    setF((prev) => ({ ...prev, [k]: v }));
    setErrors((prev) => ({ ...prev, [k]: undefined }));
  };

  const submit = () => {
    const next: Record<string, string> = {};
    if (!etudiant) next.etudiantId = "Étudiant obligatoire";
    if (f.montant === "" || Number(f.montant) <= 0)
      next.montant = "Montant supérieur à 0 requis";
    if (!f.date) next.date = "Date obligatoire";

    if (Object.keys(next).length || !etudiant) {
      setErrors(next);
      toast.error("Veuillez corriger les champs signalés");
      return;
    }

    onSubmit({
      etudiantId: etudiant.id,
      ligne: {
        date: f.date,
        montant: Number(f.montant),
        mode: f.mode,
        periode: `${f.mois.charAt(0).toUpperCase()}${f.mois.slice(1)} ${academicYear}`,
        mois: f.mois,
        statut: f.statut,
      },
    });
  };

  return (
    <FormDialog
      open
      onOpenChange={(o) => !o && onCancel()}
      title="Nouveau paiement"
      subtitle="Enregistrer un règlement de frais de scolarité"
      submitLabel="Enregistrer"
      onSubmit={submit}
    >
      <FullWidth>
        <StudentSearchField
          students={etudiants}
          value={f.etudiantId}
          onChange={(v) => set("etudiantId", v)}
          error={errors.etudiantId}
        />
      </FullWidth>
      {etudiant ? (
        <FullWidth>
          <div className="rounded-2xl bg-muted px-4 py-3 text-xs text-muted-foreground">
            Frais mensuels&nbsp;:{" "}
            <strong className="text-brand-dk">
              {fmtMAD(etudiant.fraisMensuels)}
            </strong>
          </div>
        </FullWidth>
      ) : null}
      <NumberField
        label="Montant"
        required
        suffix="MAD"
        min={0}
        value={f.montant}
        onChange={(v) => set("montant", v)}
        error={errors.montant}
      />
      <SelectField
        label="Mode de règlement"
        value={f.mode}
        onChange={(v) => set("mode", v)}
        options={MODES}
      />
      <SelectField
        label="Statut"
        value={f.statut}
        onChange={(v) => set("statut", v)}
        options={STATUTS.map((s) => ({
          value: s,
          label: STATUT_PAIEMENT_LABEL[s],
        }))}
      />
      <SelectField
        label="Mois réglé"
        required
        value={f.mois}
        onChange={(v) => set("mois", v)}
        options={months.map((m) => ({
          value: m,
          label: m.charAt(0).toUpperCase() + m.slice(1),
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
    </FormDialog>
  );
}

export const Route = createFileRoute("/dashboard/paiements")({
  component: PaiementsPage,
});
