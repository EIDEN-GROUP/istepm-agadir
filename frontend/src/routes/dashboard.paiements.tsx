import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, BellRing, Eye, Receipt } from "lucide-react";
import { toast } from "sonner";
import { useIstpm } from "@/lib/istpm-store";
import {
  FILIERES,
  STATUT_PAIEMENT_LABEL,
  STATUT_PAIEMENT_TONE,
  fmtDate,
  fmtMAD,
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
  FilterBar,
  FilterSelect,
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
  FullWidth,
} from "@/components/dash-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const MODES: LignePaiement["mode"][] = [
  "Espèces",
  "Virement",
  "Carte",
  "Chèque",
];
const STATUTS: StatutPaiement[] = ["paye", "en_attente", "retard", "impaye"];

function PaiementsPage() {
  const { paiements, etudiants, financier, aRelancer, addPaiement } =
    useIstpm();

  const [search, setSearch] = useState("");
  const [filiere, setFiliere] = useState<string>(ALL);
  const [statut, setStatut] = useState<string>(ALL);
  const [addOpen, setAddOpen] = useState(false);
  const [relanceOpen, setRelanceOpen] = useState(false);
  const [detail, setDetail] = useState<PaiementLigne | null>(null);

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
            <button
              className={cn(ghostPill, "gap-1.5")}
              onClick={() => setRelanceOpen(true)}
            >
              <BellRing className="h-3.5 w-3.5" /> Relances ({aRelancer.length})
            </button>
            <button onClick={() => setAddOpen(true)} className={primaryPill}>
              <Plus className="h-4 w-4" /> Nouveau paiement
            </button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {kpis.map((k) => (
          <div key={k.label} className={cn(softCard, "p-4")}>
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
          </div>
        ))}
      </div>

      <FilterBar
        search={search}
        onSearch={setSearch}
        placeholder="Rechercher par CNE, étudiant, reçu, période…"
      >
        <FilterSelect
          value={filiere}
          onChange={setFiliere}
          options={FILIERES}
          allLabel="Toutes les filières"
          width="w-[15rem]"
        />
        <FilterSelect
          value={statut}
          onChange={setStatut}
          options={STATUTS.map((s) => STATUT_PAIEMENT_LABEL[s])}
          allLabel="Tous les statuts"
          width="w-[12rem]"
        />
      </FilterBar>

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
        {filtered.map((p) => (
          <tr key={p.id} onClick={() => setDetail(p)} className={tableRow}>
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
          </tr>
        ))}
      </DataTable>

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
          onCancel={() => setAddOpen(false)}
          onSubmit={({ etudiantId, ligne }) => {
            const et = etudiants.find((e) => e.id === etudiantId)!;
            addPaiement(etudiantId, ligne);
            toast.success(
              `Paiement de ${fmtMAD(ligne.montant)} enregistré — ${et.prenom} ${et.nom}`,
            );
            setAddOpen(false);
          }}
        />
      ) : null}

      {/* Relances — outstanding balances to chase. */}
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
                      <span className="block text-sm font-semibold tabular-nums text-alert">
                        {fmtMAD(e.resteAPayer)}
                      </span>
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

function PaiementForm({
  etudiants,
  onSubmit,
  onCancel,
}: {
  etudiants: ReturnType<typeof useIstpm>["etudiants"];
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
    if (
      etudiant &&
      f.montant !== "" &&
      Number(f.montant) > etudiant.resteAPayer
    )
      next.montant = `Dépasse le solde dû (${fmtMAD(etudiant.resteAPayer)})`;

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
        <SelectField
          label="Étudiant"
          required
          value={f.etudiantId}
          onChange={(v) => set("etudiantId", v)}
          options={etudiants.map((e) => ({
            value: e.id,
            label: `${e.prenom} ${e.nom} — ${e.cne}`,
          }))}
          error={errors.etudiantId}
        />
      </FullWidth>
      {etudiant ? (
        <FullWidth>
          <div className="rounded-2xl bg-muted px-4 py-3 text-xs text-muted-foreground">
            Solde restant dû&nbsp;:{" "}
            <strong
              className={
                etudiant.resteAPayer > 0 ? "text-alert" : "text-brand-dk"
              }
            >
              {fmtMAD(etudiant.resteAPayer)}
            </strong>{" "}
            sur {fmtMAD(etudiant.fraisAnnuels)}
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
      <TextField
        label="Période"
        required
        value={f.periode}
        onChange={(v) => set("periode", v)}
        placeholder="Tranche 2 — 2025/2026"
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
