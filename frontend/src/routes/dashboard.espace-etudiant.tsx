import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Stethoscope,
  CalendarDays,
  FileText,
  Wallet,
  ClipboardCheck,
  Inbox,
  RefreshCw,
  BadgeCheck,
} from "lucide-react";
import { DashTabPanel } from "@/components/dash-tabs";
import { PersonAvatar } from "@/components/person-avatar";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import { useIstpm } from "@/lib/istpm-store";
import {
  fetchStudentMe,
  fetchStudentCalendar,
  fetchStudentRequests,
  createStudentRequest,
  fetchAllStudentRequests,
  updateStudentRequest,
  fetchStudentNotifications,
  markStudentNotificationsRead,
  CATALOGUE_DEMANDES,
  type StudentRequest,
} from "@/lib/istpm-api";
import {
  softCard,
  eyebrowClass,
  primaryPill,
  ghostPill,
  iconButton,
  toneBadge,
  dialogSurface,
  tableRow,
  cellTruncate,
  rowActions,
} from "@/lib/dash-ui";
import {
  PageHeader,
  DataTable,
  DetailShell,
  DetailGrid,
  DetailField,
  DetailSection,
} from "@/components/dash-page";
import { usePagination, TablePagination } from "@/components/table-pagination";
import {
  FormDialog,
  TextField,
  SelectField,
  FullWidth,
} from "@/components/dash-form";
import { VueSemaine, VueMois } from "@/components/calendar-views";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { Seance, Etudiant } from "@/lib/istpm-data";
import {
  STATUT_PAIEMENT_LABEL,
  STATUT_ETUDIANT_LABEL,
} from "@/lib/istpm-data";

/** Libellé FR d'un statut de paiement, tolérant aux valeurs inconnues. */
const libellePaiement = (v: unknown): string => {
  const k = String(v ?? "").trim();
  if (!k) return "Inconnu";
  return (
    (STATUT_PAIEMENT_LABEL as Record<string, string>)[k] ?? k
  );
};
/** Libellé FR d'un statut d'étudiant. */
const libelleStatutEtudiant = (v: unknown): string => {
  const k = String(v ?? "").trim();
  if (!k) return "Inconnu";
  return (
    (STATUT_ETUDIANT_LABEL as Record<string, string>)[k] ?? k
  );
};

const STATUT_DEMANDE_TONE: Record<StudentRequest["statut"], "amber" | "blue" | "teal" | "red"> = {
  en_attente: "amber",
  en_cours: "blue",
  traite: "teal",
  rejete: "red",
};

const STATUT_DEMANDE_LABEL: Record<StudentRequest["statut"], string> = {
  en_attente: "En attente",
  en_cours: "En cours",
  traite: "Traitée",
  rejete: "Rejetée",
};

function mondayOf(d: Date) {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - day);
  x.setHours(0, 0, 0, 0);
  return x;
}

/**
 * Sections de l'espace étudiant, dans l'ordre où elles apparaissent dans le
 * rail latéral. « Profil » n'y figure plus : il vit sur /dashboard/mon-profil.
 * L'index dans `tabBodies` est décalé de 1 (profil y reste en position 0).
 */
export const SECTION_KEYS = [
  "scolarite",
  "stage",
  "calendrier",
  "paiements",
  "demandes",
] as const;
export type EspaceSection = (typeof SECTION_KEYS)[number];

/**
 * Vue de l'espace étudiant. `section` vient du chemin
 * (`/dashboard/espace-etudiant/<section>`) ; sans section (base), on retombe
 * sur Scolarité pour l'étudiant, et le staff voit sa file de demandes.
 */
export function EspaceEtudiantView({ section }: { section?: EspaceSection }) {
  const { role } = useAuth();
  const qc = useQueryClient();
  const store = useIstpm();
  const isStaff = role === "directeur" || role === "responsable";

  const sectionIdx = section ? SECTION_KEYS.indexOf(section) : -1;
  // Position dans `tabBodies` (profil = 0) ; défaut = Scolarité.
  const wantTab = sectionIdx >= 0 ? sectionIdx + 1 : 1;

  const [tab, setTab] = useState(wantTab);
  const [dir, setDir] = useState(0);
  // Changer de section change le chemin : on recale l'affichage.
  useEffect(() => {
    if (wantTab !== tab) {
      setDir(wantTab > tab ? 1 : -1);
      setTab(wantTab);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wantTab]);
  // Vue du calendrier étudiant : liste (tableau), grille (emploi du temps
  // hebdo) ou mois.
  const [vue, setVue] = useState<"liste" | "grille" | "mois">("liste");
  const [ancre, setAncre] = useState(() => new Date());
  const [demandeOpen, setDemandeOpen] = useState(false);
  const [detailSeance, setDetailSeance] = useState<Seance | null>(null);

  // Espace personnel : uniquement pour l'étudiant. Le staff n'a ici que la
  // file des demandes à traiter.
  const meQuery = useQuery({
    queryKey: ["student-me"],
    queryFn: () => fetchStudentMe(),
    retry: false,
    enabled: !isStaff,
  });

  const calQuery = useQuery({
    queryKey: ["student-calendar"],
    queryFn: () => fetchStudentCalendar(),
    retry: false,
    enabled: !isStaff,
  });

  const reqQuery = useQuery({
    queryKey: ["student-requests"],
    queryFn: fetchStudentRequests,
    retry: false,
    refetchInterval: 60_000,
    enabled: !isStaff,
  });

  const allReqQuery = useQuery({
    queryKey: ["student-requests-all"],
    queryFn: () => fetchAllStudentRequests(),
    retry: false,
    enabled: isStaff,
    refetchInterval: 60_000,
  });

  // Cloche partagée : réponses non lues (lues auto à l'ouverture de cette page).
  const notifQ = useQuery({
    queryKey: ["student-notifications"],
    queryFn: fetchStudentNotifications,
    retry: false,
    enabled: !isStaff,
    refetchInterval: 60_000,
  });
  const luMut = useMutation({
    mutationFn: markStudentNotificationsRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["student-notifications"] });
    },
  });
  const autoLu = useRef(false);
  useEffect(() => {
    if (!isStaff && !autoLu.current && (notifQ.data?.unread ?? 0) > 0 && reqQuery.data) {
      autoLu.current = true;
      luMut.mutate();
    }
  }, [isStaff, notifQ.data, reqQuery.data, luMut]);

  const me = meQuery.data;
  // Source unique : la fiche servie par le backend (`GET /student/me`).
  // Sans fiche liée, les champs restent vides et l'état vide ci-dessous
  // s'affiche — jamais de données d'un autre étudiant.
  const profil = me?.etudiant as unknown as Record<string, string> | undefined;
  const prenom = String(profil?.prenom ?? "");
  const nom = String(profil?.nom ?? "");
  const photoUrl = String(profil?.photoUrl ?? (profil as unknown as Record<string, string> | undefined)?.photo_url ?? "");
  const enseignants = (me?.enseignants as unknown as Record<string, string>[] | undefined) ?? [];
  const stages = (me?.stages as unknown as Record<string, string>[] | undefined) ?? [];
  const stageEnCours = (me?.stageEnCours as unknown as Record<string, string> | null | undefined) ?? stages.find((s) => ["en_cours", "convention_signee", "soutenance"].includes(String(s.statut))) ?? null;
  const notes = (me?.notes as unknown as { module: string; note: number }[] | undefined) ?? [];
  const bulletins = (me?.bulletins as unknown as Record<string, string | number>[] | undefined) ?? [];
  const paiements = (me?.paiements as unknown as Record<string, string | number>[] | undefined) ?? [];
  const demandes: StudentRequest[] = reqQuery.data ?? [];
  const demandesPager = usePagination(demandes);

  const seances: Seance[] = useMemo(() => {
    // Source unique : le calendrier servi par le backend. Sans réponse, vide.
    return (calQuery.data?.seances as unknown as Seance[] | undefined) ?? [];
  }, [calQuery.data]);

  const nomProf = useMemo(() => {
    const map = new Map(store.formateurs.map((f) => [f.id, `${f.prenom} ${f.nom}`]));
    return (id: string) => map.get(id) ?? "Formateur non assigné";
  }, [store.formateurs]);

  const joursSemaine = useMemo(() => {
    const lun = mondayOf(ancre);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(lun);
      d.setDate(lun.getDate() + i);
      return d;
    });
  }, [ancre]);

  const isoLocal = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const seancesSemaine = useMemo(() => {
    const jours = new Set(joursSemaine.map(isoLocal));
    return seances.filter((s) => jours.has(String(s.date)));
  }, [seances, joursSemaine]);

  const createReq = useMutation({
    mutationFn: createStudentRequest,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["student-requests"] });
      setDemandeOpen(false);
      toast.success("Demande envoyée — le secrétariat la traitera");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Envoi impossible"),
  });


  const [aTraiter, setATraiter] = useState<StudentRequest | null>(null);

  const traiterMut = useMutation({
    mutationFn: ({ id, statut, reponse }: { id: string; statut: StudentRequest["statut"]; reponse?: string }) =>
      updateStudentRequest(id, { statut, reponse }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["student-requests-all"] });
      toast.success(
        vars.statut === "traite"
          ? "Demande approuvée — l'étudiant est notifié"
          : vars.statut === "rejete"
            ? "Demande rejetée — l'étudiant est notifié"
            : "Demande mise à jour",
      );
      setATraiter(null);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Mise à jour impossible"),
  });

  const loading = meQuery.isLoading;
  // 404 = compte sans fiche liée ; autre erreur = backend injoignable.
  const errStatut =
    meQuery.error instanceof ApiError ? meQuery.error.status : null;
  const backendDown = meQuery.isError && errStatut !== 404;

  const moyenne = notes.length
    ? (notes.reduce((s, n) => s + n.note, 0) / notes.length).toFixed(2)
    : null;
  const nbATraiter = (allReqQuery.data ?? []).filter((d) => d.statut === "en_attente").length;

  const decalerAncre = (pas: number) =>
    setAncre((d) => {
      const n = new Date(d);
      n.setDate(n.getDate() + pas * (vue === "mois" ? 30 : 7));
      return n;
    });
  const libellePeriode =
    vue === "mois"
      ? ancre.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })
      : `${joursSemaine[0].toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} – ${joursSemaine[6].toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}`;

  const calendrierSection = (
    <section className={cn(softCard, "space-y-3 p-4 sm:p-5")}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-brand-dk" />
            <p className={eyebrowClass}>Mon calendrier</p>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Période précédente"
              onClick={() => decalerAncre(-1)}
              className="grid h-7 w-7 place-items-center rounded-full border border-brand/15 text-muted-foreground transition hover:bg-brand/10 hover:text-brand-dk"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => setAncre(new Date())}
              className="rounded-full border border-brand/15 px-2.5 py-1 text-[11px] font-semibold text-muted-foreground transition hover:bg-brand/10 hover:text-brand-dk"
            >
              Aujourd'hui
            </button>
            <button
              type="button"
              aria-label="Période suivante"
              onClick={() => decalerAncre(1)}
              className="grid h-7 w-7 place-items-center rounded-full border border-brand/15 text-muted-foreground transition hover:bg-brand/10 hover:text-brand-dk"
            >
              ›
            </button>
          </div>
        </div>
        <div className="flex items-center gap-1 rounded-full border border-brand/12 bg-muted/60 p-1">
          {(
            [
              ["liste", "Liste"],
              ["grille", "Semaine"],
              ["mois", "Mois"],
            ] as const
          ).map(([v, label]) => (
            <button
              key={v}
              type="button"
              onClick={() => setVue(v)}
              className={cn(
                "rounded-full px-3 py-1.5 text-[11px] font-semibold transition-colors",
                vue === v ? "bg-brand text-white" : "text-muted-foreground hover:text-brand-dk",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 text-[11px]">
        <span className="font-semibold capitalize text-foreground">{libellePeriode}</span>
        <span className="text-muted-foreground">
          {vue === "mois"
            ? `${seances.length} séance(s) au total`
            : `${seancesSemaine.length} séance(s) cette semaine`}
        </span>
      </div>
      {vue === "liste" ? (
        (() => {
          const now = new Date();
          const nowMin = now.getHours() * 60 + now.getMinutes();
          const todayIso = isoLocal(now);
          const toMin = (t: unknown) => {
            const [h, m] = String(t ?? "").split(":").map(Number);
            return Number.isFinite(h) ? h * 60 + (m || 0) : -1;
          };
          const lignes = [...seancesSemaine].sort(
            (a, b) =>
              String(a.date).localeCompare(String(b.date)) ||
              String(a.debut).localeCompare(String(b.debut)),
          );
          return (
            <DataTable
              minWidth="min-w-[720px]"
              isEmpty={lignes.length === 0}
              empty="Aucun cours prévu cette semaine."
              head={
                <>
                  <th>Jour</th>
                  <th>Horaire</th>
                  <th>Cours</th>
                  <th>Salle</th>
                  <th>Formateur</th>
                </>
              }
            >
              {lignes.map((s, i) => {
                const iso = String(s.date);
                const estAuj = iso === todayIso;
                const enCours =
                  estAuj && toMin(s.debut) <= nowMin && nowMin < toMin(s.fin);
                const passee =
                  estAuj && toMin(s.fin) > 0 && nowMin >= toMin(s.fin);
                const d = new Date(`${iso}T00:00:00`);
                return (
                  <tr
                    key={String(s.id ?? `${iso}-${s.debut}-${i}`)}
                    onClick={() => setDetailSeance(s)}
                    className={cn(
                      tableRow,
                      "cursor-pointer",
                      estAuj && "bg-brand/5",
                      passee && "opacity-55",
                    )}
                  >
                    <td className="whitespace-nowrap font-medium capitalize">
                      <span className="flex items-center gap-1.5">
                        {estAuj ? (
                          <span
                            aria-hidden
                            className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand"
                          />
                        ) : null}
                        {d.toLocaleDateString("fr-FR", {
                          weekday: "short",
                          day: "numeric",
                        })}
                      </span>
                    </td>
                    <td className="whitespace-nowrap tabular-nums text-muted-foreground">
                      {String(s.debut)}–{String(s.fin)}
                    </td>
                    <td className={cn("font-medium", cellTruncate)}>
                      <span className="flex items-center gap-1.5">
                        <span className="truncate">{s.module}</span>
                        {enCours ? (
                          <span className="shrink-0 rounded-full bg-brand px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                            En cours
                          </span>
                        ) : null}
                      </span>
                    </td>
                    <td className="text-muted-foreground">{s.salle || "Salle non précisée"}</td>
                    <td className={cn("text-muted-foreground", cellTruncate)}>
                      {nomProf(s.professeurId)}
                    </td>
                  </tr>
                );
              })}
            </DataTable>
          );
        })()
      ) : vue === "grille" ? (
        <div className="overflow-x-auto">
          <VueSemaine
            jours={joursSemaine}
            seances={seances}
            nomProf={nomProf}
            canDrag={false}
            fit
            onOpen={(s) => setDetailSeance(s)}
            onDrop={() => {}}
          />
        </div>
      ) : (
        <VueMois
          mois={ancre}
          seances={seances}
          nomProf={nomProf}
          onOpen={(s) => setDetailSeance(s)}
          onJour={(d) => {
            setAncre(d);
            setVue("grille");
          }}
        />
      )}
    </section>
  );

  const profilTab = (
    <div className="grid gap-4 lg:grid-cols-3">
      <section className={cn(softCard, "space-y-5 p-6 lg:col-span-2")}>
        <p className={eyebrowClass}>Mon identité</p>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="shrink-0">
            <PersonAvatar name={`${prenom} ${nom}`} photoUrl={photoUrl} size="xl" />
          </div>
          <div className="min-w-0 space-y-2">
            <p className="truncate font-display text-2xl font-bold text-foreground">
              {prenom} {nom}
            </p>
            {profil?.cne ? (
              <p className="text-xs text-muted-foreground">CNE {String(profil.cne)}</p>
            ) : null}
            <div className="flex flex-wrap gap-1.5">
              <span className={toneBadge("teal")}>
                {profil?.filiere ? String(profil.filiere) : "Filière non précisée"}
              </span>
              <span className={toneBadge("blue")}>
                {profil?.niveau ? String(profil.niveau) : "Niveau non précisé"}
              </span>
              <span className={toneBadge("neutral")}>
                {libelleStatutEtudiant(profil?.statut)}
              </span>
            </div>
          </div>
        </div>
        <p className="flex items-center gap-1.5 rounded-xl bg-brand/6 px-3 py-2 text-[11px] text-muted-foreground">
          <BadgeCheck className="h-3.5 w-3.5 text-brand-dk" />
          Votre photo et vos informations sont gérées par les affaires
          estudiantines — signalez toute erreur via une demande.
        </p>
        <DetailSection title="Coordonnées">
          <DetailGrid>
            <DetailField
              label="Téléphone"
              value={String(profil?.telephone ?? "")}
            />
            <DetailField
              label="Email"
              value={String(profil?.email ?? "")}
            />
            <DetailField
              label="Ville"
              value={String(profil?.ville ?? "")}
            />
            <DetailField
              label="Naissance"
              value={String(
                profil?.dateNaissance ??
                  (profil as unknown as Record<string, string> | undefined)?.date_naissance ??
                  "",
              )}
            />
          </DetailGrid>
        </DetailSection>
        <DetailSection title="Cursus">
          <DetailGrid>
            <DetailField label="Groupe" value={String(profil?.groupe ?? "")} />
            <DetailField
              label="Année"
              value={String(profil?.annee ?? "")}
            />
          </DetailGrid>
        </DetailSection>
      </section>

      <section className={cn(softCard, "space-y-3 p-6")}>
        <p className={eyebrowClass}>En bref</p>
        <DetailGrid single>
          <DetailField label="Moyenne générale" value={moyenne ? `${moyenne}/20` : ""} />
          <DetailField label="Bulletins publiés" value={String(bulletins.length)} />
          <DetailField
            label="Statut de paiement"
            value={libellePaiement(profil?.paiement)}
          />
          <DetailField
            label="Reste à payer"
            value={
              profil?.resteAPayer ?? profil?.reste_a_payer
                ? `${String(profil.resteAPayer ?? profil.reste_a_payer)} MAD`
                : ""
            }
          />
        </DetailGrid>
      </section>
    </div>
  );

  const scolariteTab = (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className={cn(softCard, "space-y-3 p-5")}>
        <p className={eyebrowClass}>Mes enseignants</p>
        {enseignants.length ? (
          <ul className="space-y-2.5">
            {enseignants.slice(0, 8).map((f, i) => (
              <li key={String(f.id ?? i)} className="flex items-center gap-3">
                <PersonAvatar
                  name={`${String(f.prenom ?? "")} ${String(f.nom ?? "")}`}
                  photoUrl={f.photoUrl ?? f.photo_url}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-foreground">
                    {String(f.prenom ?? "")} {String(f.nom ?? "")}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {String(f.departement ?? "")}
                    {Array.isArray(f.modules) && f.modules.length
                      ? ` · ${(f.modules as string[]).slice(0, 2).join(", ")}`
                      : ""}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            Aucun enseignant rattaché à votre groupe pour le moment.
          </p>
        )}
      </section>

      <section className={cn(softCard, "space-y-3 p-5")}>
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-brand-dk" />
          <p className={eyebrowClass}>Mes notes</p>
        </div>
        {notes.length ? (
          <ul className="divide-y divide-brand/8">
            {notes.slice(0, 12).map((n, i) => (
              <li key={i} className="flex items-center justify-between py-2 text-sm">
                <span className="truncate text-foreground">{n.module}</span>
                <span
                  className={cn(
                    "font-bold tabular-nums",
                    n.note < 10 ? "text-alert" : "text-brand-dk",
                  )}
                >
                  {Number(n.note).toFixed(2)}/20
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Aucune note publiée pour le moment.</p>
        )}
        <DetailSection title="Synthèse">
          <DetailGrid>
            <DetailField label="Moyenne" value={moyenne ? `${moyenne}/20` : ""} />
            <DetailField label="Bulletins" value={String(bulletins.length)} />
          </DetailGrid>
        </DetailSection>
      </section>
    </div>
  );

  const stageTab = (
    <section className={cn(softCard, "space-y-3 p-5")}>
      <div className="flex items-center gap-2">
        <Stethoscope className="h-4 w-4 text-brand-dk" />
        <p className={eyebrowClass}>Mon stage</p>
      </div>
      {stageEnCours ? (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-bold text-foreground">
              {String(stageEnCours.structure ?? "")}
            </p>
            <span className={toneBadge("blue")}>{String(stageEnCours.statut ?? "")}</span>
          </div>
          <DetailGrid>
            <DetailField label="Service" value={String(stageEnCours.service ?? "")} />
            <DetailField
              label="Période"
              value={`${String(stageEnCours.debut ?? "")} → ${String(stageEnCours.fin ?? "")}`}
            />
            <DetailField
              label="Encadrant"
              value={String(
                stageEnCours.encadrantClinique ?? stageEnCours.encadrant_clinique ?? "",
              )}
            />
            <DetailField
              label="Tuteur"
              value={String(
                stageEnCours.tuteurAcademique ?? stageEnCours.tuteur_academique ?? "",
              )}
            />
          </DetailGrid>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Aucun stage en cours. Le secrétariat vous affectera.
        </p>
      )}
      {stages.length > 1 || (!stageEnCours && stages.length) ? (
        <div className="space-y-1.5 border-t border-brand/10 pt-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Historique
          </p>
          {stages.slice(0, 6).map((s, i) => (
            <p key={String(s.id ?? i)} className="truncate text-xs text-muted-foreground">
              {String(s.structure ?? "")} — {String(s.service ?? "")} · {String(s.statut ?? "")}
            </p>
          ))}
        </div>
      ) : null}
      <DetailSection title="Documents">
        <p className="text-xs text-muted-foreground">
          Convention, rapports et attestations sont délivrés par le secrétariat après traitement de
          vos demandes.
        </p>
      </DetailSection>
    </section>
  );

  const paiementsTab = (
    <section className={cn(softCard, "space-y-3 p-5")}>
      <div className="flex items-center gap-2">
        <Wallet className="h-4 w-4 text-brand-dk" />
        <p className={eyebrowClass}>Mes paiements</p>
      </div>
      <DetailGrid>
        <DetailField
          label="Reste à payer"
          value={
            profil?.resteAPayer ?? profil?.reste_a_payer
              ? `${String(profil.resteAPayer ?? profil.reste_a_payer)} MAD`
              : ""
          }
        />
        <DetailField label="Statut" value={libellePaiement(profil?.paiement)} />
      </DetailGrid>
      {paiements.length ? (
        <ul className="divide-y divide-brand/8">
          {paiements.slice(0, 12).map((p, i) => (
            <li key={String(p.id ?? i)} className="flex items-center justify-between py-2 text-sm">
              <span className="text-muted-foreground">{String(p.date ?? p.mois ?? "")}</span>
              <span className="font-semibold tabular-nums">{String(p.montant ?? "")} MAD</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">Aucun règlement enregistré.</p>
      )}
    </section>
  );

  const demandesTab = (
    <section className={cn(softCard, "space-y-3 p-4 sm:p-5")}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="h-4 w-4 text-brand-dk" />
          <p className={eyebrowClass}>Mes demandes ({demandes.length})</p>
        </div>
        <button className={ghostPill} onClick={() => setDemandeOpen(true)}>
          <Plus className="h-3.5 w-3.5" /> Nouvelle
        </button>
      </div>
      <DataTable
        minWidth="min-w-[760px]"
        isEmpty={demandes.length === 0}
        empty="Aucune demande. Utilisez « Nouvelle demande »."
        footer={
          <TablePagination
            page={demandesPager.page}
            pageCount={demandesPager.pageCount}
            total={demandesPager.total}
            pageSize={demandesPager.pageSize}
            onPage={demandesPager.setPage}
            label="demande(s)"
          />
        }
        head={
          <>
            <th>Titre</th>
            <th>Type</th>
            <th>Statut</th>
            <th>Date</th>
            <th>Réponse</th>
          </>
        }
      >
        {demandesPager.pageItems.map((d) => (
          <tr key={d.id} className={tableRow}>
            <td className={cn("font-medium", cellTruncate)}>{d.titre}</td>
            <td className="text-muted-foreground">
              {d.type === "predefini" ? "Prédéfini" : "Libre"}
            </td>
            <td>
              <span className={toneBadge(STATUT_DEMANDE_TONE[d.statut])}>
                {STATUT_DEMANDE_LABEL[d.statut]}
              </span>
            </td>
            <td className="text-muted-foreground">
              {new Date(d.createdAt).toLocaleDateString("fr-FR")}
            </td>
            <td className={cn("text-muted-foreground", cellTruncate)}>
              {d.reponse || "En attente de réponse"}
            </td>
          </tr>
        ))}
      </DataTable>
    </section>
  );

  const tabBodies = [
    profilTab,
    scolariteTab,
    stageTab,
    calendrierSection,
    paiementsTab,
    demandesTab,
  ];

  if (isStaff) {
    return (
      <StaffRequestsView
        rows={allReqQuery.data ?? []}
        loading={allReqQuery.isLoading}
        etudiants={store.etudiants}
        photoDe={store.photoDe}
        onTraiter={setATraiter}
        traiterModal={
          <TraiterModal
            demande={aTraiter}
            onOpenChange={(o) => !o && setATraiter(null)}
            onSubmit={(v) => traiterMut.mutate(v)}
            pending={traiterMut.isPending}
          />
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Espace étudiant"
        title={prenom || nom ? `Bonjour, ${prenom} ${nom}`.trim() : "Mon espace"}
        actions={
          <button className={primaryPill} onClick={() => setDemandeOpen(true)}>
            <Plus className="h-4 w-4" /> Nouvelle demande
          </button>
        }
      />

      {loading ? (
        <div className={cn(softCard, "p-10 text-center text-sm text-muted-foreground")}>
          Chargement de votre espace…
        </div>
      ) : meQuery.isError ? (
        <div className={cn(softCard, "space-y-3 p-6 text-center")}>
          <Inbox className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-semibold">
            {backendDown
              ? "Serveur injoignable."
              : "Aucune fiche étudiant liée à ce compte."}
          </p>
          <p className="text-xs text-muted-foreground">
            {backendDown
              ? "Vérifiez votre connexion puis réessayez."
              : "Demandez au secrétariat de lier votre compte (email / CNE) puis rechargez."}
          </p>
          <button className={ghostPill} onClick={() => meQuery.refetch()}>
            <RefreshCw className="h-3.5 w-3.5" /> Réessayer
          </button>
        </div>
      ) : (
        <DashTabPanel key={tab} index={tab} direction={dir}>
          {tabBodies[tab]}
        </DashTabPanel>
      )}

      <DemandeModal
        open={demandeOpen}
        onOpenChange={setDemandeOpen}
        onSubmit={(v) => createReq.mutate(v)}
        pending={createReq.isPending}
      />

      <TraiterModal
        demande={aTraiter}
        onOpenChange={(o) => !o && setATraiter(null)}
        onSubmit={(v) => traiterMut.mutate(v)}
        pending={traiterMut.isPending}
      />

      <Dialog open={!!detailSeance} onOpenChange={(o) => !o && setDetailSeance(null)}>
        <DialogContent className={dialogSurface}>
          <DialogTitle className="sr-only">Détail de la séance</DialogTitle>
          <DialogDescription className="sr-only">Séance du planning étudiant</DialogDescription>
          {detailSeance ? (
            <DetailShell
              icon={<CalendarDays className="h-5 w-5" />}
              title={detailSeance.module}
              subtitle={`${detailSeance.date} · ${detailSeance.debut}–${detailSeance.fin}`}
            >
              <DetailGrid>
                <DetailField label="Formateur" value={nomProf(detailSeance.professeurId)} />
                <DetailField label="Salle" value={detailSeance.salle || ""} />
                <DetailField label="Groupe" value={detailSeance.groupe || ""} />
                <DetailField label="Type" value={detailSeance.type} />
              </DetailGrid>
              {detailSeance.notes ? <p className="text-xs text-muted-foreground">{detailSeance.notes}</p> : null}
            </DetailShell>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function DemandeModal({
  open,
  onOpenChange,
  onSubmit,
  pending,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSubmit: (v: { type: "libre" | "predefini"; titre: string; description: string }) => void;
  pending: boolean;
}) {
  const [mode, setMode] = useState<"libre" | "predefini">("predefini");
  const [titre, setTitre] = useState(CATALOGUE_DEMANDES[0].titre);
  const [titreLibre, setTitreLibre] = useState("");
  const [description, setDescription] = useState(CATALOGUE_DEMANDES[0].description);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

  const pickCatalogue = (t: string) => {
    setTitre(t);
    setDescription(CATALOGUE_DEMANDES.find((c) => c.titre === t)?.description ?? "");
    setErrors((p) => ({ ...p, titre: undefined }));
  };

  const submit = () => {
    const next: Record<string, string> = {};
    const finalTitre = mode === "libre" ? titreLibre.trim() : titre;
    if (finalTitre.length < 3) next.titre = "Titre trop court (3 caractères min)";
    if (!description.trim()) next.description = "Description requise";
    if (description.trim().length > 2000) next.description = "Description trop longue";
    if (Object.keys(next).length) {
      setErrors(next);
      toast.error("Veuillez corriger les champs signalés");
      return;
    }
    onSubmit({ type: mode, titre: finalTitre, description: description.trim() });
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      wide
      title="Nouvelle demande"
      subtitle="Le secrétariat vous répondra dans votre espace"
      submitLabel={pending ? "Envoi…" : "Envoyer la demande"}
      onSubmit={submit}
    >
      <FullWidth>
        <div className="flex items-center gap-1 rounded-full border border-brand/12 bg-muted/60 p-1">
          {(["predefini", "libre"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={cn(
                "flex-1 rounded-full px-3 py-1.5 text-[11px] font-semibold transition-colors",
                mode === m ? "bg-brand text-white" : "text-muted-foreground hover:text-brand-dk",
              )}
            >
              {m === "predefini" ? "Titre prédéfini" : "Texte libre"}
            </button>
          ))}
        </div>
      </FullWidth>
      {mode === "predefini" ? (
        <FullWidth>
          <SelectField
            label="Titre de la demande"
            required
            value={titre}
            onChange={pickCatalogue}
            options={CATALOGUE_DEMANDES.map((c) => ({ value: c.titre, label: c.titre }))}
            error={errors.titre}
          />
        </FullWidth>
      ) : (
        <FullWidth>
          <TextField
            label="Titre"
            required
            value={titreLibre}
            onChange={(v) => {
              setTitreLibre(v);
              setErrors((p) => ({ ...p, titre: undefined }));
            }}
            placeholder="Ex. Attestation de présence pour un visa…"
            error={errors.titre}
          />
        </FullWidth>
      )}
      <FullWidth>
        <div className="space-y-1.5">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Description <span className="ml-0.5 text-alert">*</span>
          </Label>
          <textarea
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              setErrors((p) => ({ ...p, description: undefined }));
            }}
            rows={4}
            maxLength={2000}
            placeholder="Décrivez votre besoin…"
            className="w-full rounded-xl border border-brand/20 bg-card px-3 py-2.5 text-sm hover:border-brand/35 focus-visible:border-brand focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/15"
          />
          {errors.description ? <p className="text-[11px] text-alert">{errors.description}</p> : null}
        </div>
      </FullWidth>
    </FormDialog>
  );
}

/* ------------------------------------------------------------------ */

/**
 * Décision du staff sur une demande : approuver ou rejeter **avec une réponse
 * écrite** que l'étudiant reçoit via sa cloche (badge + modale) et sa table
 * « Mes demandes ». Le motif est obligatoire en cas de rejet (validé aussi côté API).
 */
function TraiterModal({
  demande,
  onOpenChange,
  onSubmit,
  pending,
}: {
  demande: StudentRequest | null;
  onOpenChange: (o: boolean) => void;
  onSubmit: (v: { id: string; statut: StudentRequest["statut"]; reponse: string }) => void;
  pending: boolean;
}) {
  const [statut, setStatut] = useState<StudentRequest["statut"]>("traite");
  const [reponse, setReponse] = useState("");
  const [error, setError] = useState<string | undefined>(undefined);

  // Réinitialise le formulaire à chaque demande ouverte.
  const demandeId = demande?.id;
  useEffect(() => {
    setStatut("traite");
    setReponse("");
    setError(undefined);
  }, [demandeId]);

  if (!demande) return null;

  const submit = () => {
    if (statut === "rejete" && reponse.trim().length < 3) {
      setError("Un motif de refus est requis (3 caractères min)");
      toast.error("Indiquez le motif du refus");
      return;
    }
    onSubmit({ id: demande.id, statut, reponse: reponse.trim() });
  };

  return (
    <FormDialog
      open
      onOpenChange={onOpenChange}
      wide
      title={statut === "rejete" ? "Rejeter la demande" : statut === "en_cours" ? "Mettre en cours" : "Approuver la demande"}
      subtitle={demande.titre}
      submitLabel={pending ? "Envoi…" : "Confirmer et notifier l'étudiant"}
      onSubmit={submit}
    >
      <FullWidth>
        <div className="rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground">
          {demande.etudiantPrenom || demande.etudiantNom ? (
            <p className="mb-1.5 flex items-center gap-2">
              <PersonAvatar
                name={`${demande.etudiantPrenom ?? ""} ${demande.etudiantNom ?? ""}`}
                photoUrl={demande.etudiantPhotoUrl}
                size="xs"
              />
              <span className="font-semibold text-foreground">
                {demande.etudiantPrenom} {demande.etudiantNom}
              </span>
              {demande.etudiantCne ? <span>· {demande.etudiantCne}</span> : null}
            </p>
          ) : null}
          <p className="font-semibold text-foreground">{demande.titre}</p>
          {demande.description ? <p className="mt-1">{demande.description}</p> : null}
          <p className="mt-1">Type : {demande.type === "predefini" ? "Prédéfini" : "Libre"} · {new Date(demande.createdAt).toLocaleDateString("fr-FR")}</p>
        </div>
      </FullWidth>
      <FullWidth>
        <div className="flex items-center gap-1 rounded-full border border-brand/12 bg-muted/60 p-1">
          {(
            [
              ["traite", "Approuver"],
              ["en_cours", "En cours"],
              ["rejete", "Rejeter"],
            ] as const
          ).map(([v, label]) => (
            <button
              key={v}
              type="button"
              onClick={() => setStatut(v)}
              className={cn(
                "flex-1 rounded-full px-3 py-1.5 text-[11px] font-semibold transition-colors",
                statut === v
                  ? v === "rejete"
                    ? "bg-alert text-white"
                    : "bg-brand text-white"
                  : "text-muted-foreground hover:text-brand-dk",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </FullWidth>
      <FullWidth>
        <div className="space-y-1.5">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Réponse à l'étudiant {statut === "rejete" ? <span className="ml-0.5 text-alert">*</span> : "(optionnel)"}
          </Label>
          <textarea
            value={reponse}
            onChange={(e) => {
              setReponse(e.target.value);
              setError(undefined);
            }}
            rows={3}
            maxLength={2000}
            placeholder={
              statut === "rejete"
                ? "Expliquez pourquoi (ex. pièce manquante, délai dépassé)…"
                : "Ex. Disponible au secrétariat dès demain matin…"
            }
            className="w-full rounded-xl border border-brand/20 bg-card px-3 py-2.5 text-sm hover:border-brand/35 focus-visible:border-brand focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/15"
          />
          {error ? <p className="text-[11px] text-alert">{error}</p> : null}
        </div>
      </FullWidth>
    </FormDialog>
  );
}

/* ------------------------------------------------------------------ */

const STATUT_FILTRES = [
  ["en_attente", "En attente"],
  ["en_cours", "En cours"],
  ["traite", "Traitées"],
  ["rejete", "Rejetées"],
  ["", "Toutes"],
] as const;

/**
 * Vue « Espace étudiant » côté staff (directeur / responsable) : ni fiche ni
 * calendrier — le staff gère ça dans les pages dédiées. Ici, uniquement la
 * file des demandes des étudiants, à approuver ou rejeter avec une réponse.
 */
function StaffRequestsView({
  rows,
  loading,
  etudiants,
  photoDe,
  onTraiter,
  traiterModal,
}: {
  rows: StudentRequest[];
  loading: boolean;
  etudiants: Etudiant[];
  photoDe: (k: string | undefined | null) => string | undefined;
  onTraiter: (d: StudentRequest) => void;
  traiterModal: ReactNode;
}) {
  const [filtre, setFiltre] = useState<string>("en_attente");
  const parId = useMemo(
    () => new Map(etudiants.map((e) => [e.id, e])),
    [etudiants],
  );
  const filtered = filtre ? rows.filter((r) => r.statut === filtre) : rows;
  const nbAttente = rows.filter((r) => r.statut === "en_attente").length;
  const pager = usePagination(filtered, filtre);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Affaires estudiantines"
        title="Demandes des étudiants"
      />

      <section className={cn(softCard, "space-y-4 p-4 sm:p-5")}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Inbox className="h-4 w-4 text-brand-dk" />
            <p className={eyebrowClass}>
              File des demandes
              {nbAttente > 0 ? (
                <span className="ms-2 rounded-full bg-warn-pale px-2 py-0.5 text-[10px] font-bold text-warn">
                  {nbAttente} en attente
                </span>
              ) : null}
            </p>
          </div>
          <div className="flex items-center gap-1 rounded-full border border-brand/12 bg-muted/60 p-1">
            {STATUT_FILTRES.map(([v, label]) => (
              <button
                key={v || "all"}
                type="button"
                onClick={() => setFiltre(v)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-[11px] font-semibold transition-colors",
                  filtre === v
                    ? "bg-brand text-white"
                    : "text-muted-foreground hover:text-brand-dk",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <DataTable
          minWidth="min-w-[880px]"
          isEmpty={!loading && filtered.length === 0}
          empty={loading ? "Chargement…" : "Aucune demande dans cette catégorie."}
          footer={
            <TablePagination
              page={pager.page}
              pageCount={pager.pageCount}
              total={pager.total}
              pageSize={pager.pageSize}
              onPage={pager.setPage}
              label="demande(s)"
            />
          }
          head={
            <>
              <th>Étudiant</th>
              <th>Demande</th>
              <th>Statut</th>
              <th>Date</th>
              <th className="w-40 text-center">Traiter</th>
            </>
          }
        >
          {pager.pageItems.map((d) => {
            const etu = parId.get(d.etudiantId);
            const prenom = d.etudiantPrenom ?? etu?.prenom ?? "";
            const nomFam = d.etudiantNom ?? etu?.nom ?? "";
            const nom = `${prenom} ${nomFam}`.trim() || "Étudiant";
            const cne = d.etudiantCne ?? etu?.cne ?? "";
            const filiere = d.etudiantFiliere ?? etu?.filiere ?? "";
            return (
              <tr
                key={d.id}
                className={tableRow}
                onClick={() => onTraiter(d)}
              >
                <td>
                  <span className="flex items-center gap-2.5">
                    <PersonAvatar
                      name={nom}
                      photoUrl={d.etudiantPhotoUrl ?? photoDe(d.etudiantId) ?? photoDe(cne)}
                    />
                    <span className="min-w-0">
                      <span className={cn("block font-medium", cellTruncate)}>{nom}</span>
                      {cne || filiere ? (
                        <span className="block truncate text-xs text-muted-foreground">
                          {[cne, filiere].filter(Boolean).join(" · ")}
                        </span>
                      ) : null}
                    </span>
                  </span>
                </td>
                <td className={cn("font-medium", cellTruncate)}>
                  {d.titre}
                  <span className="block truncate text-xs font-normal text-muted-foreground">
                    {d.description}
                  </span>
                </td>
                <td>
                  <span className={toneBadge(STATUT_DEMANDE_TONE[d.statut])}>
                    {STATUT_DEMANDE_LABEL[d.statut]}
                  </span>
                </td>
                <td className="text-muted-foreground">
                  {new Date(d.createdAt).toLocaleDateString("fr-FR")}
                </td>
                <td className="text-center" onClick={(e) => e.stopPropagation()}>
                  <div className={cn(rowActions, "justify-center")}>
                    <button
                      className={iconButton}
                      title="Approuver / rejeter avec réponse"
                      aria-label={`Traiter « ${d.titre} »`}
                      onClick={() => onTraiter(d)}
                    >
                      <ClipboardCheck className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </DataTable>
      </section>

      {traiterModal}
    </div>
  );
}

/**
 * Route « conteneur » : elle n'affiche que la sous-route active
 *   · index  → file des demandes (staff) / redirection (étudiant)
 *   · $section → une section de l'espace étudiant
 */
export const Route = createFileRoute("/dashboard/espace-etudiant")({
  component: () => <Outlet />,
});
