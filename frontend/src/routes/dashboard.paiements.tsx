import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, BellRing, Eye, Receipt, PenLine, CalendarDays, Search, Check, Clock, AlertTriangle, Ban, Save, Download } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { useIstpm } from "@/lib/istpm-store";
import { makePaiementDocPdf } from "@/lib/branded-doc";
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
  type Etudiant,
  type PaiementMensuel,
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
  dialogSurfaceWide,
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
  FullWidth,
} from "@/components/dash-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { softSelectTrigger, softSelectContent } from "@/lib/dash-ui";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const MODES: Array<"Espèces" | "Virement" | "Carte" | "Chèque"> = [
  "Espèces",
  "Virement",
  "Carte",
  "Chèque",
];
const STATUTS: StatutPaiement[] = ["paye", "en_attente", "retard", "impaye"];

function deriveStatutPaiement(records: PaiementMensuel[]): StatutPaiement {
  if (records.length === 0) return "impaye";
  if (records.every((r) => r.statut === "paye")) return "paye";
  if (records.some((r) => r.statut === "retard")) return "retard";
  if (records.some((r) => r.statut === "impaye")) return "impaye";
  return "en_attente";
}

function totalPaye(records: PaiementMensuel[]): number {
  return records
    .filter((r) => r.statut === "paye")
    .reduce((s, r) => s + r.montantPaye, 0);
}

function resteDu(records: PaiementMensuel[]): number {
  return records.reduce((s, r) => s + (r.montantDu - r.montantPaye), 0);
}

function PaiementsPage() {
  const { role } = useAuth();
  const { etudiants, financier, aRelancer, payerMois, updatePaiementMensuel } = useIstpm();
  const canEdit = role === "directeur" || role === "responsable";

  const [search, setSearch] = useState("");
  const [filiere, setFiliere] = useState<string>(ALL);
  const [semestre, setSemestre] = useState<string>(ALL);
  const [annee, setAnnee] = useState<string>(ALL);
  const [anneeScolaire, setAnneeScolaire] = useState<string>(ALL);
  const [statut, setStatut] = useState<string>(ALL);
  const [mois, setMois] = useState<string>(ALL);

  const moisOptions = useMemo(
    () => MOIS_ACADEMIQUE.map((m) => m.charAt(0).toUpperCase() + m.slice(1)),
    [],
  );
  const [addOpen, setAddOpen] = useState(false);
  const [relanceOpen, setRelanceOpen] = useState(false);
  const [editStudent, setEditStudent] = useState<Etudiant | null>(null);
  const [historyStudent, setHistoryStudent] = useState<Etudiant | null>(null);

  const parEtudiant = useMemo(() => {
    const q = search.trim().toLowerCase();
    return etudiants
      .filter((e) => {
        if (filiere !== ALL && e.filiere !== filiere) return false;
        if (semestre !== ALL && e.niveau !== semestre) return false;
        if (annee !== ALL && anneeEtude(e.niveau) !== annee) return false;
        if (anneeScolaire !== ALL && e.annee !== anneeScolaire) return false;
        const statutE = deriveStatutPaiement(e.paiementsMensuelsRecords);
        if (statut !== ALL && STATUT_PAIEMENT_LABEL[statutE] !== statut) return false;
        if (mois !== ALL) {
          const target = mois.toLowerCase();
          const payeCeMois = e.paiementsMensuelsRecords.some(
            (r) => r.mois.toLowerCase().startsWith(target) && r.statut === "paye",
          );
          if (!payeCeMois) return false;
        }
        if (!q) return true;
        return `${e.cne} ${e.prenom} ${e.nom}`.toLowerCase().includes(q);
      })
      .map((e) => {
        const records = e.paiementsMensuelsRecords;
        const total = totalPaye(records);
        const reste = resteDu(records);
        const statutE = deriveStatutPaiement(records);
        const moisNonPayes = records.filter((r) => r.statut !== "paye").length;
        const moisRetard = records.filter((r) => r.statut === "retard").length;
        return { etudiant: e, statut: statutE, totalPaye: total, resteDu: reste, moisNonPayes, moisRetard };
      });
  }, [etudiants, search, filiere, semestre, annee, anneeScolaire, statut, mois]);

  const pager = usePagination(
    parEtudiant,
    `${search}|${filiere}|${semestre}|${annee}|${anneeScolaire}|${statut}|${mois}`,
  );

  const kpis = [
    { label: "Encaissé", value: fmtMAD(financier.encaisse), tone: "teal" },
    { label: "Encaissé ce mois", value: fmtMAD(financier.encaisseCeMois), tone: "teal" },
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

      <FilterPanel
        search={search}
        onSearch={setSearch}
        placeholder="Rechercher par CNE, étudiant, reçu…"
        filters={[
          {
            id: "filiere", label: "Filière", value: filiere, onChange: setFiliere,
            options: FILIERES, allLabel: "Toutes les filières",
          },
          {
            id: "semestre", label: "Semestre", value: semestre, onChange: setSemestre,
            options: NIVEAUX, allLabel: "Tous les semestres",
          },
          {
            // Libellé « Niveau » comme sur les autres pages : c'est l'année
            // d'étude (1ère/2ème/3ème), à ne pas confondre avec l'année scolaire.
            id: "annee", label: "Niveau", value: annee, onChange: setAnnee,
            options: ANNEES_ETUDE, allLabel: "Tous les niveaux",
          },
          {
            id: "anneeScolaire", label: "Année scolaire", value: anneeScolaire, onChange: setAnneeScolaire,
            options: ANNEES_UNIVERSITAIRES, allLabel: "Toutes les années",
          },
          {
            id: "statut", label: "Statut", value: statut, onChange: setStatut,
            options: STATUTS.map((s) => STATUT_PAIEMENT_LABEL[s]), allLabel: "Tous les statuts",
          },
          {
            id: "mois", label: "Mois", value: mois, onChange: setMois,
            options: moisOptions, allLabel: "Tous les mois",
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
            <th className="w-32 text-center">Actions</th>
          </>
        }
      >
        {pager.pageItems.map((r, i) => (
          <motion.tr
            key={r.etudiant.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.25, delay: i * 0.03, ease: "easeOut" }}
            className={tableRow}
          >
            <td
              className={cn("border-l-[3px] font-medium", cellTruncate)}
              style={{
                borderLeftColor: TONE_COLORS[STATUT_PAIEMENT_TONE[r.statut]],
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
                const st = r.statut;
                let detail: string | null = null;
                if (st === "impaye" && r.moisNonPayes > 0)
                  detail = `${r.moisNonPayes} mois impayé${r.moisNonPayes > 1 ? "s" : ""}`;
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
                      <span className="text-[11px] text-muted-foreground">{detail}</span>
                    ) : null}
                  </div>
                );
              })()}
            </td>
            <td className="text-center" onClick={(ev) => ev.stopPropagation()}>
              <div className={rowActions}>
                {canEdit ? (
                  <button
                    className={iconButton}
                    aria-label="Modifier le paiement"
                    onClick={() => setEditStudent(r.etudiant)}
                  >
                    <PenLine className="h-3.5 w-3.5" />
                  </button>
                ) : null}
                <button
                  className={iconButton}
                  aria-label="Voir l'historique"
                  onClick={() => setHistoryStudent(r.etudiant)}
                >
                  <Receipt className="h-3.5 w-3.5" />
                </button>
              </div>
            </td>
          </motion.tr>
        ))}
      </DataTable>

      {editStudent ? (
        <EditPaiementDialog
          etudiant={editStudent}
          onClose={() => setEditStudent(null)}
          onSave={(mois, details) => {
            payerMois(editStudent.id, mois, details);
            toast.success(`Paiement enregistré pour ${editStudent.prenom} ${editStudent.nom}`);
            setEditStudent(null);
          }}
        />
      ) : null}

      {historyStudent ? (
        <HistoriquePaiementsDialog
          etudiant={historyStudent}
          onClose={() => setHistoryStudent(null)}
        />
      ) : null}

      {addOpen ? (
        <EditPaiementDialog
          etudiant={null}
          onClose={() => setAddOpen(false)}
          onSave={(mois, details) => {
            toast.error("Veuillez sélectionner un étudiant");
          }}
          isNew
          etudiants={etudiants}
          onNewPayment={(etudiantId, mois, details) => {
            payerMois(etudiantId, mois, details);
            const et = etudiants.find((e) => e.id === etudiantId);
            toast.success(`Paiement enregistré pour ${et?.prenom} ${et?.nom}`);
            setAddOpen(false);
          }}
        />
      ) : null}

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
                  toast.success(`${aRelancer.length} relance(s) envoyée(s) par e-mail et SMS`);
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
                      <span className={toneBadge(STATUT_PAIEMENT_TONE[e.paiement])}>
                        {STATUT_PAIEMENT_LABEL[e.paiement]}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                Aucun solde en attente — tous les étudiants sont à jour.
              </p>
            )}
          </DetailShell>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Edit Paiement Dialog                                               */
/* ------------------------------------------------------------------ */

function EditPaiementDialog({
  etudiant,
  etudiants,
  onClose,
  onSave,
  onNewPayment,
  isNew,
}: {
  etudiant: Etudiant | null;
  etudiants?: Etudiant[];
  onClose: () => void;
  onSave: (mois: string[], details: { montant: number; mode: "Espèces" | "Virement" | "Carte" | "Chèque"; date: string; recu?: string; notes?: string }) => void;
  onNewPayment?: (etudiantId: string, mois: string[], details: { montant: number; mode: "Espèces" | "Virement" | "Carte" | "Chèque"; date: string; recu?: string; notes?: string }) => void;
  isNew?: boolean;
}) {
  const academicYear = getCurrentAcademicYear();
  const months = useMemo(() => getAcademicYearMonths(academicYear), [academicYear]);

  const [selectedId, setSelectedId] = useState(etudiant?.id ?? "");
  const [selectedMonths, setSelectedMonths] = useState<Set<string>>(new Set());
  const [montant, setMontant] = useState<number | "">("");
  const [mode, setMode] = useState<"Espèces" | "Virement" | "Carte" | "Chèque">("Espèces");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const currentEtudiant = isNew
    ? etudiants?.find((e) => e.id === selectedId)
    : etudiant;

  const records = currentEtudiant?.paiementsMensuelsRecords ?? [];
  const monthlyFee = currentEtudiant?.fraisMensuels ?? 0;

  const monthStatus = useMemo(() => {
    return months.map((m) => {
      const record = records.find((r) => r.mois === m);
      const paye = record ? record.montantPaye : 0;
      const du = record ? record.montantDu : monthlyFee;
      const statut = record?.statut ?? "impaye";
      const unpaid = paye < du;
      return { mois: m, paye, du, statut, unpaid };
    });
  }, [months, records, monthlyFee]);

  const toggleMonth = (mois: string) => {
    setSelectedMonths((prev) => {
      const next = new Set(prev);
      if (next.has(mois)) next.delete(mois);
      else next.add(mois);
      return next;
    });
  };

  const submit = () => {
    const errs: Record<string, string> = {};
    if (isNew && !selectedId) errs.etudiant = "Étudiant obligatoire";
    if (selectedMonths.size === 0) errs.mois = "Sélectionnez au moins un mois";
    if (montant === "" || Number(montant) <= 0) errs.montant = "Montant supérieur à 0 requis";
    if (!date) errs.date = "Date obligatoire";

    if (Object.keys(errs).length) {
      setErrors(errs);
      toast.error("Veuillez corriger les champs signalés");
      return;
    }

    const details = { montant: Number(montant), mode, date, notes: notes || undefined };

    if (isNew && onNewPayment) {
      onNewPayment(selectedId, [...selectedMonths], details);
    } else {
      onSave([...selectedMonths], details);
    }
  };

  return (
    <FormDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={isNew ? "Nouveau paiement" : "Modifier le paiement"}
      subtitle={
        isNew
          ? "Enregistrer un règlement de frais de scolarité"
          : `Sélectionner les mois à régler pour ${currentEtudiant?.prenom} ${currentEtudiant?.nom}`
      }
      submitLabel="Enregistrer"
      onSubmit={submit}
    >
      {isNew ? (
        <FullWidth>
          <StudentSearchField
            students={etudiants ?? []}
            value={selectedId}
            onChange={(v) => setSelectedId(v)}
            error={errors.etudiant}
          />
        </FullWidth>
      ) : null}

      {currentEtudiant ? (
        <FullWidth>
          <div className="rounded-2xl bg-muted px-4 py-3 text-xs text-muted-foreground">
            Frais mensuels&nbsp;:{" "}
            <strong className="text-brand-dk">{fmtMAD(monthlyFee)}</strong>
          </div>
        </FullWidth>
      ) : null}

      <FullWidth>
        <div className="space-y-1.5">
          <Label className={labelClass}>
            Mois à régler<span className="ml-0.5 text-alert">*</span>
          </Label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {monthStatus.map((m) => {
              const selected = selectedMonths.has(m.mois);
              return (
                <button
                  key={m.mois}
                  type="button"
                  disabled={m.statut === "paye" && !m.unpaid}
                  onClick={() => toggleMonth(m.mois)}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-xl border px-2 py-2 text-xs transition-colors",
                    selected
                      ? "border-brand bg-brand/10 text-brand-dk"
                      : m.statut === "paye" && !m.unpaid
                        ? "border-brand/20 bg-brand/5 opacity-50"
                        : "border-brand/12 bg-muted/40 hover:border-brand/30",
                  )}
                >
                  <span className="font-semibold capitalize">{m.mois.split(" ")[0]}</span>
                  {m.statut === "paye" && !m.unpaid ? (
                    <span className={toneBadge("teal")}>Payé</span>
                  ) : m.paye > 0 ? (
                    <span className="text-[10px] text-muted-foreground">
                      {fmtMAD(m.paye)}/{fmtMAD(m.du)}
                    </span>
                  ) : (
                    <span className={toneBadge("red")}>Impayé</span>
                  )}
                </button>
              );
            })}
          </div>
          {errors.mois ? <p className="text-[11px] text-alert">{errors.mois}</p> : null}
        </div>
      </FullWidth>

      <NumberField
        label="Montant"
        required
        suffix="MAD"
        min={0}
        value={montant}
        onChange={(v) => setMontant(v)}
        error={errors.montant}
      />

      <SelectField
        label="Mode de règlement"
        value={mode}
        onChange={(v) => setMode(v as typeof mode)}
        options={MODES}
      />

      <TextField
        label="Date"
        required
        type="date"
        value={date}
        onChange={(v) => setDate(v)}
        error={errors.date}
      />

      <TextField
        label="Notes"
        value={notes}
        onChange={(v) => setNotes(v)}
      />
    </FormDialog>
  );
}

/* ------------------------------------------------------------------ */
/*  Historique Paiements Dialog                                        */
/* ------------------------------------------------------------------ */

function HistoriquePaiementsDialog({
  etudiant,
  onClose,
}: {
  etudiant: Etudiant;
  onClose: () => void;
}) {
  const { updatePaiementMensuel } = useIstpm();
  const academicYear = getCurrentAcademicYear();
  const months = useMemo(() => getAcademicYearMonths(academicYear), [academicYear]);
  const canEdit = useAuth().role === "directeur" || useAuth().role === "responsable";

  const records = etudiant.paiementsMensuelsRecords;
  const totalPayeE = records
    .filter((r) => r.statut === "paye")
    .reduce((s, r) => s + r.montantPaye, 0);
  const resteDuE = records.reduce((s, r) => s + (r.montantDu - r.montantPaye), 0);
  const nbPaye = records.filter((r) => r.statut === "paye").length;

  const monthData = useMemo(() => {
    return months.map((m) => {
      const record = records.find((r) => r.mois === m);
      return {
        mois: m,
        montantDu: record?.montantDu ?? etudiant.fraisMensuels,
        montantPaye: record?.montantPaye ?? 0,
        datePaiement: record?.datePaiement ?? "",
        statut: record?.statut ?? "impaye",
        recu: record?.recu ?? "",
      };
    });
  }, [months, records, etudiant.fraisMensuels]);

  const [editingMois, setEditingMois] = useState<string | null>(null);
  const [editStatut, setEditStatut] = useState<StatutPaiement>("paye");

  const saveStatut = (record: typeof monthData[0]) => {
    const existing = records.find((r) => r.mois === record.mois);
    if (existing) {
      updatePaiementMensuel(existing.id, etudiant.id, { statut: editStatut });
    }
    setEditingMois(null);
    toast.success(`Statut mis à jour pour ${record.mois}`);
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className={dialogSurfaceWide}>
        <DialogTitle className="sr-only">Historique des paiements</DialogTitle>
        <DialogDescription className="sr-only">
          Historique mensuel des paiements de l'étudiant
        </DialogDescription>
        <DetailShell
          icon={<Receipt className="h-5 w-5" />}
          title={`${etudiant.prenom} ${etudiant.nom}`}
          subtitle={`${etudiant.cne} · ${etudiant.filiere}`}
          badges={
            <span className={toneBadge(STATUT_PAIEMENT_TONE[etudiant.paiement])}>
              {STATUT_PAIEMENT_LABEL[etudiant.paiement]}
            </span>
          }
        >
          <DetailSection title="Synthèse">
            <DetailGrid>
              <DetailField label="Semestre" value={etudiant.niveau} />
              <DetailField label="Année" value={anneeEtude(etudiant.niveau)} />
              <DetailField label="Groupe" value={etudiant.groupe} />
              <DetailField
                label="Frais mensuels"
                value={fmtMAD(etudiant.fraisMensuels)}
              />
              <DetailField
                label="Total réglé"
                value={fmtMAD(totalPayeE)}
                tone="positive"
              />
              <DetailField
                label="Reste dû"
                value={resteDuE > 0 ? fmtMAD(resteDuE) : "—"}
                tone={resteDuE > 0 ? "negative" : "default"}
              />
            </DetailGrid>
          </DetailSection>

          <DetailSection
            title={`Suivi mensuel (${nbPaye}/${months.length} réglés)`}
          >
            <DetailTable
              head={
                <>
                  <th className="px-3 py-2">Mois</th>
                  <th className="px-3 py-2 text-right">Montant dû</th>
                  <th className="px-3 py-2 text-right">Montant payé</th>
                  <th className="px-3 py-2 text-right">Reste</th>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Statut</th>
                  <th className="px-3 py-2">Reçu</th>
                </>
              }
            >
              {monthData.map((m) => {
                const reste = m.montantDu - m.montantPaye;
                return (
                  <tr key={m.mois}>
                    <td className="whitespace-nowrap px-3 py-2 font-medium capitalize">
                      {m.mois}
                    </td>
                    <td className="px-3 py-2 text-right font-semibold tabular-nums">
                      {fmtMAD(m.montantDu)}
                    </td>
                    <td className="px-3 py-2 text-right font-semibold tabular-nums text-brand-dk">
                      {m.montantPaye > 0 ? fmtMAD(m.montantPaye) : "—"}
                    </td>
                    <td className="px-3 py-2 text-right font-semibold tabular-nums">
                      {reste > 0 ? (
                        <span className="text-alert">{fmtMAD(reste)}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                      {m.datePaiement ? fmtDate(m.datePaiement) : "—"}
                    </td>
                    <td className="px-3 py-2">
                      {canEdit && editingMois === m.mois ? (
                        <div className="flex items-center gap-1">
                          <Select
                            value={editStatut}
                            onValueChange={(v) => setEditStatut(v as StatutPaiement)}
                          >
                            <SelectTrigger className={cn(softSelectTrigger, "h-7 w-28 text-xs")}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className={softSelectContent}>
                              {STATUTS.map((s) => (
                                <SelectItem key={s} value={s} className="text-xs">
                                  {STATUT_PAIEMENT_LABEL[s]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <button
                            type="button"
                            className={cn(primaryPill, "h-7 w-7 justify-center p-0")}
                            onClick={() => saveStatut(m)}
                          >
                            <Save className="h-3 w-3" />
                          </button>
                        </div>
                      ) : m.statut ? (
                        <button
                          type="button"
                          disabled={!canEdit}
                          onClick={() => {
                            setEditingMois(m.mois);
                            setEditStatut(m.statut);
                          }}
                          className="cursor-pointer disabled:cursor-default"
                        >
                          <span className={toneBadge(STATUT_PAIEMENT_TONE[m.statut])}>
                            {STATUT_PAIEMENT_LABEL[m.statut]}
                          </span>
                        </button>
                      ) : (
                        <span className="text-xs text-muted-foreground">Non facturé</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-muted-foreground">
                      {m.montantPaye > 0 ? (
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              const blob = await makePaiementDocPdf({
                                prenom: etudiant.prenom,
                                nom: etudiant.nom,
                                cne: etudiant.cne,
                                filiere: etudiant.filiere,
                                mois: m.mois,
                                montantDu: m.montantDu,
                                montantPaye: m.montantPaye,
                                datePaiement: m.datePaiement,
                                statut: m.statut,
                              });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement("a");
                              a.href = url;
                              a.download = `recu-${etudiant.nom.toLowerCase()}-${m.mois.replace(/\s+/g, "-")}.pdf`;
                              document.body.appendChild(a);
                              a.click();
                              a.remove();
                              setTimeout(() => URL.revokeObjectURL(url), 30_000);
                              toast.success("Reçu téléchargé (PDF)");
                            } catch {
                              toast.error("Erreur lors du téléchargement");
                            }
                          }}
                          className="inline-flex items-center gap-1 text-brand hover:underline"
                        >
                          <Download className="h-3 w-3" />
                          Télécharger
                        </button>
                      ) : "—"}
                    </td>
                  </tr>
                );
              })}
            </DetailTable>
          </DetailSection>
        </DetailShell>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/*  Student Search Field                                               */
/* ------------------------------------------------------------------ */

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
    `${s.prenom} ${s.nom} — ${s.cne}`;
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

export const Route = createFileRoute("/dashboard/paiements")({
  component: PaiementsPage,
});
