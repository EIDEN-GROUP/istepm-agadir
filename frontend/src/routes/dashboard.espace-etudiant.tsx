import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Camera,
  GraduationCap,
  Users,
  Stethoscope,
  CalendarDays,
  FileText,
  Wallet,
  ClipboardCheck,
  Inbox,
  RefreshCw,
  UserRound,
  BadgeCheck,
} from "lucide-react";
import { DashTabs, DashTabPanel, type DashTab } from "@/components/dash-tabs";
import { PersonAvatar } from "@/components/person-avatar";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { useIstpm } from "@/lib/istpm-store";
import {
  fetchStudentMe,
  fetchStudentCalendar,
  fetchStudentRequests,
  createStudentRequest,
  updateStudentPhoto,
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
  ALL,
} from "@/components/dash-page";
import {
  FormDialog,
  TextField,
  SelectField,
  FullWidth,
} from "@/components/dash-form";
import { VueSemaine, VueMois, type VueCalendrier } from "@/components/calendar-views";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { Seance } from "@/lib/istpm-data";

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
 * Réduit une image à un carré `taille`×`taille` (recadrage centré) et la renvoie
 * en data URL JPEG. Garde l'envoi léger quelle que soit la résolution source.
 */
function downscaleImage(file: File, taille: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const cote = Math.min(img.naturalWidth, img.naturalHeight);
      if (!cote) return reject(new Error("empty"));
      const canvas = document.createElement("canvas");
      canvas.width = taille;
      canvas.height = taille;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("no-2d"));
      ctx.drawImage(
        img,
        (img.naturalWidth - cote) / 2,
        (img.naturalHeight - cote) / 2,
        cote,
        cote,
        0,
        0,
        taille,
        taille,
      );
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("decode"));
    };
    img.src = url;
  });
}

function EspaceEtudiantPage() {
  const { role } = useAuth();
  const qc = useQueryClient();
  const store = useIstpm();
  const isStaff = role === "directeur" || role === "responsable";

  // Le staff peut prévisualiser la fiche d'un étudiant (support).
  const [staffEtudiantId, setStaffEtudiantId] = useState<string>(ALL);
  const [tab, setTab] = useState(0);
  const [dir, setDir] = useState(0);
  const goTab = (i: number) => {
    setDir(i > tab ? 1 : -1);
    setTab(i);
  };
  const [vue, setVue] = useState<VueCalendrier>("semaine");
  const [ancre, setAncre] = useState(() => new Date());
  const [demandeOpen, setDemandeOpen] = useState(false);
  const [detailSeance, setDetailSeance] = useState<Seance | null>(null);
  const photoInput = useRef<HTMLInputElement>(null);

  const meQuery = useQuery({
    queryKey: ["student-me", isStaff ? staffEtudiantId : "self"],
    queryFn: () => fetchStudentMe(isStaff && staffEtudiantId !== ALL ? staffEtudiantId : undefined),
    retry: false,
  });

  const calQuery = useQuery({
    queryKey: ["student-calendar"],
    queryFn: () => fetchStudentCalendar(),
    retry: false,
  });

  const reqQuery = useQuery({
    queryKey: ["student-requests"],
    queryFn: fetchStudentRequests,
    retry: false,
    refetchInterval: 60_000,
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

  /* ----- Repli démo : backend indisponible ou compte non lié ----- */
  const fallback = useMemo(() => {
    if (meQuery.data) return null;
    const etu =
      (isStaff && staffEtudiantId !== ALL
        ? store.etudiants.find((e) => e.id === staffEtudiantId)
        : store.etudiants[0]) ?? null;
    if (!etu) return null;
    const enseignants = store.formateurs.filter((f) => {
      const sameFiliere = !f.departement || f.departement === etu.filiere;
      const groupes = f.groupes ?? [];
      return (
        sameFiliere &&
        (groupes.length === 0 ||
          groupes.some((g) => g === etu.groupe || g.split("-")[0] === etu.niveau || g === etu.niveau))
      );
    });
    const stages = store.stages.filter((s) => s.etudiantId === etu.id);
    return { etu, enseignants, stages };
  }, [meQuery.data, store.etudiants, store.formateurs, store.stages, isStaff, staffEtudiantId]);

  const me = meQuery.data;
  const profil = me?.etudiant as unknown as Record<string, string> | undefined;
  const prenom = String(profil?.prenom ?? fallback?.etu.prenom ?? "");
  const nom = String(profil?.nom ?? fallback?.etu.nom ?? "");
  const photoUrl = String(profil?.photoUrl ?? (profil as unknown as Record<string, string> | undefined)?.photo_url ?? "");
  const enseignants = (me?.enseignants as unknown as Record<string, string>[] | undefined) ?? (fallback?.enseignants as unknown as Record<string, string>[] | undefined) ?? [];
  const stages = (me?.stages as unknown as Record<string, string>[] | undefined) ?? (fallback?.stages as unknown as Record<string, string>[] | undefined) ?? [];
  const stageEnCours = (me?.stageEnCours as unknown as Record<string, string> | null | undefined) ?? stages.find((s) => ["en_cours", "convention_signee", "soutenance"].includes(String(s.statut))) ?? null;
  const notes = (me?.notes as unknown as { module: string; note: number }[] | undefined) ?? [];
  const bulletins = (me?.bulletins as unknown as Record<string, string | number>[] | undefined) ?? [];
  const paiements = (me?.paiements as unknown as Record<string, string | number>[] | undefined) ?? [];
  const presence = me?.presence ?? { total: 0, presents: 0, taux: 100 };
  const demandes: StudentRequest[] = reqQuery.data ?? [];

  const seances: Seance[] = useMemo(() => {
    const remote = (calQuery.data?.seances as unknown as Seance[] | undefined) ?? [];
    if (remote.length) return remote;
    // Repli : séances du store filtrées au groupe de l'étudiant.
    const groupe = String(profil?.groupe ?? fallback?.etu.groupe ?? "");
    const niveau = String(profil?.niveau ?? fallback?.etu.niveau ?? "");
    const filiere = String(profil?.filiere ?? fallback?.etu.filiere ?? "");
    return store.seances.filter((s) => {
      if (filiere && s.filiere && s.filiere !== filiere) return false;
      if (!s.groupe) return true;
      return s.groupe === groupe || s.groupe.split("-")[0] === niveau || s.groupe === niveau;
    });
  }, [calQuery.data, store.seances, profil, fallback]);

  const nomProf = useMemo(() => {
    const map = new Map(store.formateurs.map((f) => [f.id, `${f.prenom} ${f.nom}`]));
    return (id: string) => map.get(id) ?? "—";
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

  const photoMut = useMutation({
    mutationFn: updateStudentPhoto,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["student-me"] });
      toast.success("Photo mise à jour");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Photo refusée"),
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

  const onPhotoFile = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Choisissez une image (JPG/PNG)");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Image trop lourde (8 Mo max)");
      return;
    }
    try {
      // Recadrage carré + réduction à 512 px : le data URL envoyé reste léger
      // (~40–90 Ko) au lieu de plusieurs Mo, quelle que soit la photo source.
      const dataUrl = await downscaleImage(file, 512);
      photoMut.mutate(dataUrl);
    } catch {
      toast.error("Image illisible — essayez un autre fichier");
    }
  };

  const loading = meQuery.isLoading;
  const backendDown = meQuery.isError && !fallback;

  const moyenne = notes.length
    ? (notes.reduce((s, n) => s + n.note, 0) / notes.length).toFixed(2)
    : null;
  const nbATraiter = (allReqQuery.data ?? []).filter((d) => d.statut === "en_attente").length;

  const tabs: DashTab[] = [
    { label: "Profil", short: "Profil", icon: UserRound },
    { label: "Scolarité", short: "Cours", icon: GraduationCap },
    { label: "Stage", short: "Stage", icon: Stethoscope },
    { label: "Calendrier", short: "Agenda", icon: CalendarDays },
    { label: "Paiements", short: "Paiements", icon: Wallet },
    {
      label: "Demandes",
      short: "Demandes",
      icon: ClipboardCheck,
      badge: isStaff ? nbATraiter : (notifQ.data?.unread ?? 0),
    },
  ];

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
          {(["semaine", "mois"] as VueCalendrier[]).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setVue(v)}
              className={cn(
                "rounded-full px-3 py-1.5 text-[11px] font-semibold transition-colors",
                vue === v ? "bg-brand text-white" : "text-muted-foreground hover:text-brand-dk",
              )}
            >
              {v === "semaine" ? "Semaine" : "Mois"}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 text-[11px]">
        <span className="font-semibold capitalize text-foreground">{libellePeriode}</span>
        <span className="text-muted-foreground">
          {vue === "semaine"
            ? `${seancesSemaine.length} séance(s) cette semaine`
            : `${seances.length} séance(s) au total`}
        </span>
      </div>
      {vue === "semaine" ? (
        <VueSemaine
          jours={joursSemaine}
          seances={seances}
          nomProf={nomProf}
          canDrag={false}
          onOpen={(s) => setDetailSeance(s)}
          onDrop={() => {}}
        />
      ) : (
        <VueMois
          mois={ancre}
          seances={seances}
          nomProf={nomProf}
          onOpen={(s) => setDetailSeance(s)}
          onJour={(d) => {
            setAncre(d);
            setVue("semaine");
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
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => photoInput.current?.click()}
              title="Changer ma photo"
              className="group relative block overflow-hidden rounded-full ring-2 ring-inset ring-brand/20 transition hover:ring-brand/45"
            >
              <PersonAvatar name={`${prenom} ${nom}`} photoUrl={photoUrl} size="xl" ring={false} />
              <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-black/45 py-1 text-[10px] font-semibold text-white opacity-90 group-hover:opacity-100">
                <Camera className="h-3 w-3" /> {photoMut.isPending ? "…" : "Photo"}
              </span>
            </button>
            <input
              ref={photoInput}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                onPhotoFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </div>
          <div className="min-w-0 space-y-2">
            <p className="truncate font-display text-2xl font-bold text-foreground">
              {prenom} {nom}
            </p>
            <p className="text-xs text-muted-foreground">
              {String(profil?.cne ?? fallback?.etu.cne ?? "—")} ·{" "}
              {String(
                profil?.matricule ??
                  (fallback?.etu as unknown as Record<string, string> | undefined)?.matricule ??
                  "—",
              )}
            </p>
            <div className="flex flex-wrap gap-1.5">
              <span className={toneBadge("teal")}>
                {String(profil?.filiere ?? fallback?.etu.filiere ?? "—")}
              </span>
              <span className={toneBadge("blue")}>
                {String(profil?.niveau ?? fallback?.etu.niveau ?? "—")}
              </span>
              <span className={toneBadge("neutral")}>
                {String(profil?.statut ?? fallback?.etu.statut ?? "—")}
              </span>
            </div>
          </div>
        </div>
        <p className="flex items-center gap-1.5 rounded-xl bg-brand/6 px-3 py-2 text-[11px] text-muted-foreground">
          <BadgeCheck className="h-3.5 w-3.5 text-brand-dk" />
          Votre photo est visible par le secrétariat et vos enseignants (2 Mo max, JPG/PNG).
        </p>
        <DetailSection title="Coordonnées">
          <DetailGrid>
            <DetailField
              label="Téléphone"
              value={String(
                profil?.telephone ??
                  (fallback?.etu as unknown as Record<string, string> | undefined)?.telephone ??
                  "—",
              )}
            />
            <DetailField
              label="Email"
              value={String(
                profil?.email ??
                  (fallback?.etu as unknown as Record<string, string> | undefined)?.email ??
                  "—",
              )}
            />
            <DetailField
              label="Ville"
              value={String(
                profil?.ville ??
                  (fallback?.etu as unknown as Record<string, string> | undefined)?.ville ??
                  "—",
              )}
            />
            <DetailField
              label="Naissance"
              value={String(
                profil?.dateNaissance ??
                  (profil as unknown as Record<string, string> | undefined)?.date_naissance ??
                  "—",
              )}
            />
          </DetailGrid>
        </DetailSection>
        <DetailSection title="Cursus">
          <DetailGrid>
            <DetailField label="Groupe" value={String(profil?.groupe ?? fallback?.etu.groupe ?? "—")} />
            <DetailField
              label="Année"
              value={String(
                profil?.annee ??
                  (fallback?.etu as unknown as Record<string, string> | undefined)?.annee ??
                  "—",
              )}
            />
          </DetailGrid>
        </DetailSection>
      </section>

      <section className={cn(softCard, "space-y-3 p-6")}>
        <p className={eyebrowClass}>En bref</p>
        <DetailGrid single>
          <DetailField label="Moyenne générale" value={moyenne ? `${moyenne}/20` : "—"} />
          <DetailField
            label="Présence"
            value={`${presence.taux}% (${presence.presents}/${presence.total})`}
          />
          <DetailField label="Bulletins publiés" value={String(bulletins.length)} />
          <DetailField
            label="Statut de paiement"
            value={String(profil?.paiement ?? fallback?.etu.paiement ?? "—")}
          />
          <DetailField
            label="Reste à payer"
            value={`${String(profil?.resteAPayer ?? profil?.reste_a_payer ?? "—")} MAD`}
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
            <DetailField label="Moyenne" value={moyenne ? `${moyenne}/20` : "—"} />
            <DetailField
              label="Présence"
              value={`${presence.taux}% (${presence.presents}/${presence.total})`}
            />
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
            <DetailField label="Service" value={String(stageEnCours.service ?? "—")} />
            <DetailField
              label="Période"
              value={`${String(stageEnCours.debut ?? "")} → ${String(stageEnCours.fin ?? "")}`}
            />
            <DetailField
              label="Encadrant"
              value={String(
                stageEnCours.encadrantClinique ?? stageEnCours.encadrant_clinique ?? "—",
              )}
            />
            <DetailField
              label="Tuteur"
              value={String(
                stageEnCours.tuteurAcademique ?? stageEnCours.tuteur_academique ?? "—",
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
          value={`${String(profil?.resteAPayer ?? profil?.reste_a_payer ?? "—")} MAD`}
        />
        <DetailField label="Statut" value={String(profil?.paiement ?? "—")} />
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
    <div className="space-y-4">
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
          {demandes.map((d) => (
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
              <td className={cn("text-muted-foreground", cellTruncate)}>{d.reponse || "—"}</td>
            </tr>
          ))}
        </DataTable>
      </section>

      {isStaff ? (
        <section className={cn(softCard, "space-y-3 p-4 sm:p-5")}>
          <div className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-brand-dk" />
            <p className={eyebrowClass}>
              Demandes à traiter ({(allReqQuery.data ?? []).length})
            </p>
          </div>
          <DataTable
            minWidth="min-w-[860px]"
            isEmpty={(allReqQuery.data ?? []).length === 0}
            empty="Aucune demande d'étudiant."
            head={
              <>
                <th>Titre</th>
                <th>Statut</th>
                <th>Date</th>
                <th className="w-56 text-center">Actions</th>
              </>
            }
          >
            {(allReqQuery.data ?? []).slice(0, 20).map((d) => (
              <tr key={d.id} className={tableRow}>
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
                      onClick={() => setATraiter(d)}
                    >
                      <ClipboardCheck className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </DataTable>
        </section>
      ) : null}
    </div>
  );

  const tabBodies = [
    profilTab,
    scolariteTab,
    stageTab,
    calendrierSection,
    paiementsTab,
    demandesTab,
  ];

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

      {isStaff ? (
        <div className={cn(softCard, "flex flex-wrap items-center gap-3 p-4")}>
          <Users className="h-4 w-4 text-muted-foreground" />
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Prévisualiser la fiche de
          </Label>
          <select
            value={staffEtudiantId}
            onChange={(e) => setStaffEtudiantId(e.target.value)}
            className="h-10 rounded-xl border border-brand/20 bg-card px-3 text-sm"
          >
            <option value={ALL}>Mon compte lié (défaut)</option>
            {store.etudiants.map((e) => (
              <option key={e.id} value={e.id}>
                {e.prenom} {e.nom} — {e.cne}
              </option>
            ))}
          </select>
          <span className="text-xs text-muted-foreground">Vue staff — l'étudiant ne voit que sa fiche.</span>
        </div>
      ) : null}

      {loading ? (
        <div className={cn(softCard, "p-10 text-center text-sm text-muted-foreground")}>
          Chargement de votre espace…
        </div>
      ) : backendDown ? (
        <div className={cn(softCard, "space-y-3 p-6 text-center")}>
          <Inbox className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-semibold">Aucune fiche étudiant liée à ce compte.</p>
          <p className="text-xs text-muted-foreground">
            Demandez au secrétariat de lier votre compte (email / CNE) puis rechargez.
          </p>
          <button className={ghostPill} onClick={() => meQuery.refetch()}>
            <RefreshCw className="h-3.5 w-3.5" /> Réessayer
          </button>
        </div>
      ) : (
        <>
          {meQuery.isError && fallback ? (
            <p className="rounded-2xl border border-amber-300/50 bg-amber-50 px-4 py-2.5 text-xs text-amber-800">
              Mode démo — backend injoignable, données locales affichées.
            </p>
          ) : null}

          <div className="sticky top-2 z-20 flex">
            <DashTabs tabs={tabs} active={tab} onChange={goTab} />
          </div>
          <DashTabPanel key={tab} index={tab} direction={dir}>
            {tabBodies[tab]}
          </DashTabPanel>
        </>
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
                <DetailField label="Salle" value={detailSeance.salle || "—"} />
                <DetailField label="Groupe" value={detailSeance.groupe || "—"} />
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

export const Route = createFileRoute("/dashboard/espace-etudiant")({
  component: EspaceEtudiantPage,
});
