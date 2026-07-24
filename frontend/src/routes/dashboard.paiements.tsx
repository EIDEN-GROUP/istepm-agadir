import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, BellRing, Eye, Receipt } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { useIstpm } from "@/lib/istpm-store";
import {
  ANNEES_UNIVERSITAIRES,
  FILIERES,
  STATUT_PAIEMENT_LABEL,
  STATUT_PAIEMENT_TONE,
  fmtDate,
  fmtMAD,
  getAcademicYearMonths,
  getCurrentAcademicYear,
  getDefaultMois,
  type LignePaiement,
  type PaiementLigne,
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
} from "@/lib/dash-ui";
import {
  PageHeader,
  FilterPanel,
  DataTable,
  DetailShell,
  DetailSection,
  DetailGrid,
  DetailField,
  ALL,
} from "@/components/dash-page";
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
import { cn } from "@/lib/utils";

const MODES: LignePaiement["mode"][] = [
  "Espèces",
  "Virement",
  "Carte",
  "Chèque",
];
const STATUTS: StatutPaiement[] = ["paye", "en_attente", "retard", "impaye"];

function PaiementsPage() {
  const { role } = useAuth();
  const { paiements, etudiants, financier, aRelancer, addPaiement } =
    useIstpm();
  const canEdit = role === "directeur" || role === "responsable";

  const [search, setSearch] = useState("");
  const [filiere, setFiliere] = useState<string>(ALL);
  const [statut, setStatut] = useState<string>(ALL);
  const [addOpen, setAddOpen] = useState(false);
  const [relanceOpen, setRelanceOpen] = useState(false);
  const [detail, setDetail] = useState<PaiementLigne | null>(null);
  const [academicYear, setAcademicYear] = useState(getCurrentAcademicYear);
  const months = useMemo(() => getAcademicYearMonths(academicYear), [academicYear]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return paiements.filter((p) => {
      if (filiere !== ALL && p.filiere !== filiere) return false;
      if (statut !== ALL && STATUT_PAIEMENT_LABEL[p.statut] !== statut)
        return false;
      if (!q) return true;
      return `${p.cne} ${p.etudiant} ${p.recu} ${p.periode}`
        .toLowerCase()
        .includes(q);
    });
  }, [paiements, search, filiere, statut]);

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
    {
      label: "Taux de recouvrement",
      value: `${financier.tauxRecouvrement} %`,
      tone: "teal",
    },
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

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
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
            id: "statut",
            label: "Statut",
            value: statut,
            onChange: setStatut,
            options: STATUTS.map((s) => STATUT_PAIEMENT_LABEL[s]),
            allLabel: "Tous les statuts",
          },
        ]}
      />

      <DataTable
        minWidth="min-w-[950px]"
        isEmpty={filtered.length === 0}
        empty="Aucun paiement ne correspond à ces critères."
        head={
          <>
            <th>Étudiant</th>
            <th>Filière</th>
            <th className="text-right">Montant</th>
            <th>Date</th>
            <th>Mode</th>
            <th>Statut</th>
            <th className="w-20 text-center">Actions</th>
          </>
        }
      >
        {filtered.map((p, i) => (
          <motion.tr
            key={p.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.25, delay: i * 0.03, ease: "easeOut" }}
            onClick={() => setDetail(p)}
            className={tableRow}
          >
            <td
              className={cn("border-l-[3px] font-medium", cellTruncate)}
              style={{
                borderLeftColor: TONE_COLORS[STATUT_PAIEMENT_TONE[p.statut]],
              }}
            >
              {p.etudiant}
            </td>
            <td className={cn("text-muted-foreground", cellTruncate)}>
              {p.filiere}
            </td>
            <td className="text-right font-semibold tabular-nums">
              {fmtMAD(p.montant)}
            </td>
            <td className="text-muted-foreground">{fmtDate(p.date)}</td>
            <td className="text-muted-foreground">{p.mode}</td>
            <td>
              <span className={toneBadge(STATUT_PAIEMENT_TONE[p.statut])}>
                {STATUT_PAIEMENT_LABEL[p.statut]}
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
                  onClick={() => setDetail(p)}
                >
                  <Eye className="h-3.5 w-3.5" />
                </button>
              </div>
            </td>
          </motion.tr>
        ))}
      </DataTable>

      <MonthlyTracker etudiants={etudiants} canEdit={canEdit} academicYear={academicYear} onAcademicYearChange={setAcademicYear} months={months} />

      {/* Détail d'un règlement */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className={dialogSurface}>
          <DialogTitle className="sr-only">Détail du paiement</DialogTitle>
          <DialogDescription className="sr-only">
            Règlement sélectionné
          </DialogDescription>
          {detail ? (
            <DetailShell
              icon={<Receipt className="h-5 w-5" />}
              title={fmtMAD(detail.montant)}
              subtitle={`${detail.etudiant} · ${detail.cne}`}
              badges={
                <span className={toneBadge(STATUT_PAIEMENT_TONE[detail.statut])}>
                  {STATUT_PAIEMENT_LABEL[detail.statut]}
                </span>
              }
            >
              <DetailSection title="Règlement">
                <DetailGrid>
                  <DetailField label="Montant" value={fmtMAD(detail.montant)} />
                  <DetailField label="Date" value={fmtDate(detail.date)} />
                  <DetailField label="Mode" value={detail.mode} />
                  <DetailField
                    label="Mois réglé"
                    value={
                      detail.mois
                        ? detail.mois.charAt(0).toUpperCase() + detail.mois.slice(1)
                        : " "
                    }
                  />
                  <DetailField label="Période" value={detail.periode} />
                  <DetailField label="N° de reçu" value={detail.recu} full />
                </DetailGrid>
              </DetailSection>

              <DetailSection title="Étudiant">
                <DetailGrid>
                  <DetailField label="Nom" value={detail.etudiant} />
                  <DetailField label="CNE" value={detail.cne} />
                  <DetailField label="Filière" value={detail.filiere} />
                  <DetailField label="Niveau" value={detail.niveau} />
                </DetailGrid>
              </DetailSection>
            </DetailShell>
          ) : null}
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
    <section className={cn(softCard, "p-4 sm:p-5")}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Suivi mensuel
          </p>
          <h2 className="mt-1 font-display text-lg font-bold tracking-tight text-foreground">
            Paiements par mois
          </h2>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-44">
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
          <p className="mt-3 text-xs text-muted-foreground">
            <strong className="font-semibold text-foreground">{nbRegles}</strong>{" "}
            mois payé(s) sur {months.length} · <strong className="font-semibold text-foreground">{fmtMAD(etudiant.fraisMensuels)}</strong>/mois
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {months.map((m) => {
              const st = statutMois(m);
              const montant = montantMois(m);
              return (
                <div
                  key={m}
                  className={cn(
                    "rounded-2xl border px-3 py-2.5",
                    st === "paye"
                      ? "border-brand/25 bg-brand/5"
                      : "border-brand/12 bg-muted/40",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold capitalize text-foreground">
                      {m}
                    </p>
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: TONE_COLORS[STATUT_PAIEMENT_TONE[st]] }}
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
                            {STATUT_PAIEMENT_LABEL[s]}
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
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">
          Sélectionner un étudiant pour afficher son suivi mensuel.
        </p>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */

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
    periode: "",
    mois: getDefaultMois(academicYear),
    date: new Date().toISOString().slice(0, 10),
    statut: "paye" as StatutPaiement,
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
    if (!f.periode.trim()) next.periode = "Période obligatoire";
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
        periode: f.periode.trim(),
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
        <ComboBoxField
          label="Étudiant"
          required
          value={f.etudiantId}
          onChange={(v) => set("etudiantId", v)}
          options={etudiants.map((e) => ({
            value: e.id,
            label: `${e.prenom} ${e.nom}   ${e.cne}`,
          }))}
          placeholder="Rechercher un étudiant…"
          searchPlaceholder="Nom, prénom ou CNE…"
          emptyText="Aucun étudiant trouvé."
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
        label="Période"
        required
        value={f.periode}
        onChange={(v) => set("periode", v)}
        placeholder="Tranche 2   2025/2026"
        error={errors.periode}
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
