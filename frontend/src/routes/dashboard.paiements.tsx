import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, BellRing, Eye, Receipt, ListChecks, CalendarDays, Search, Check, Clock, AlertTriangle, Ban } from "lucide-react";
import type { LucideIcon } from "lucide-react";
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

/** Icône de statut de règlement — repère visuel humain, lisible d'un coup d'œil. */
const STATUT_PAIEMENT_ICON: Record<StatutPaiement, LucideIcon> = {
  paye: Check,
  en_attente: Clock,
  retard: AlertTriangle,
  impaye: Ban,
};

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
  const [tab, setTab] = useState(0); // 0 = transactions · 1 = suivi mensuel
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

  const pager = usePagination(filtered, `${search}|${filiere}|${statut}`);

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

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
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
        footer={
          <TablePagination
            page={pager.page}
            pageCount={pager.pageCount}
            total={pager.total}
            pageSize={pager.pageSize}
            onPage={pager.setPage}
            label="paiements"
          />
        }
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
        {pager.pageItems.map((p, i) => (
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
        </>
      ) : (
        <MonthlyTracker etudiants={etudiants} canEdit={canEdit} academicYear={academicYear} onAcademicYearChange={setAcademicYear} months={months} />
      )}

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

  const pctRegles = months.length
    ? Math.round((nbRegles / months.length) * 100)
    : 0;

  return (
    <section className={cn(softCard, "overflow-hidden p-4 sm:p-6")}>
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-brand/10 text-brand-dk">
            <CalendarDays className="h-5 w-5" />
          </span>
          <p className="max-w-xs pt-1 text-sm text-muted-foreground">
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

      {etudiant ? (
        <>
          <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-5">
            {months.map((m, i) => {
              const st = statutMois(m);
              const montant = montantMois(m);
              const color = TONE_COLORS[STATUT_PAIEMENT_TONE[st]];
              const StIcon = STATUT_PAIEMENT_ICON[st];
              const [moisNom = m, annee = ""] = m.split(" ");
              return (
                <motion.div
                  key={m}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.035, ease: [0.22, 1, 0.36, 1] }}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-brand/12 bg-card shadow-[0_1px_2px_rgb(var(--istpm-shadow)/0.04)] transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-brand/25 hover:shadow-[0_10px_24px_-14px_rgb(var(--istpm-shadow)/0.5)]"
                >
                  {/* Bandeau teinté par le statut — repère « ticket » lisible */}
                  <div
                    className="flex items-start justify-between gap-2 px-3.5 py-2.5"
                    style={{
                      backgroundColor: `color-mix(in srgb, ${color} 9%, transparent)`,
                    }}
                  >
                    <div className="min-w-0">
                      <p className="font-display text-sm font-bold capitalize leading-tight text-foreground">
                        {moisNom}
                      </p>
                      <p className="text-[11px] font-medium tabular-nums text-muted-foreground">
                        {annee}
                      </p>
                    </div>
                    <span
                      className="grid h-6 w-6 shrink-0 place-items-center rounded-full"
                      style={{
                        backgroundColor: `color-mix(in srgb, ${color} 16%, transparent)`,
                        color,
                      }}
                    >
                      <StIcon className="h-3.5 w-3.5" />
                    </span>
                  </div>

                  {/* Corps — statut modifiable + montant réglé */}
                  <div className="flex flex-1 flex-col gap-2 px-3.5 pb-3 pt-2.5">
                    {canEdit ? (
                      <Select
                        value={st}
                        onValueChange={(v) =>
                          setMoisPaiementStatut(etudiant.id, m, v as StatutPaiement)
                        }
                      >
                        <SelectTrigger
                          className={cn(softSelectTrigger, "h-8 w-full text-xs")}
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
                      <span className={cn(toneBadge(STATUT_PAIEMENT_TONE[st]), "w-fit")}>
                        {STATUT_PAIEMENT_LABEL[st]}
                      </span>
                    )}
                    {montant > 0 ? (
                      <p className="flex items-center gap-1.5 text-[11px] font-medium tabular-nums text-muted-foreground">
                        <Receipt className="h-3 w-3 shrink-0 opacity-60" />
                        {fmtMAD(montant)}
                      </p>
                    ) : null}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </>
      ) : (
        <div className="mt-6 flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-brand/20 py-12 text-center">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand/8 text-muted-foreground/60">
            <CalendarDays className="h-5 w-5" />
          </span>
          <p className="text-sm text-muted-foreground">
            Sélectionner un étudiant pour afficher son suivi mensuel.
          </p>
        </div>
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
      <SelectField
        label="Mode de règlement"
        value={f.mode}
        onChange={(v) => set("mode", v)}
        options={MODES}
      />
      <NumberField
        label="Montant"
        required
        suffix="MAD"
        min={0}
        value={f.montant}
        onChange={(v) => set("montant", v)}
        error={errors.montant}
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
