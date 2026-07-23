import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, type ReactNode } from "react";
import {
  Plus,
  Trash2,
  RotateCcw,
  Users,
  ShieldCheck,
  GraduationCap,
  CalendarRange,
  LayoutGrid,
  BookOpen,
  DoorOpen,
  Clock,
  ClipboardList,
  FileText,
  Building2,
  SlidersHorizontal,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth, ROLE_META, type UserRole } from "@/lib/auth";
import {
  FILIERES,
  NIVEAUX,
  SALLES,
  GROUPES,
  CRENEAUX,
  ANNEES_UNIVERSITAIRES,
  TYPE_EXAMEN_LABEL,
  fmtMAD,
} from "@/lib/istpm-data";
import { useIstpm } from "@/lib/istpm-store";
import { ConfirmDialog } from "@/components/dash-form";
import {
  softCard,
  primaryPill,
  ghostPill,
  iconButtonDanger,
  eyebrowClass,
  toneBadge,
  softInput,
} from "@/lib/dash-ui";
import { PageHeader } from "@/components/dash-page";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Périmètre par rôle                                                 */
/* ------------------------------------------------------------------ */

type SectionId =
  | "annees"
  | "semestres"
  | "groupes"
  | "modules"
  | "salles"
  | "creneaux"
  | "planning"
  | "utilisateurs"
  | "roles"
  | "formateurs"
  | "filieres"
  | "examens"
  | "bulletins"
  | "institut"
  | "systeme"
  | "securite";

/**
 * Ce que chaque rôle peut administrer.
 *
 * Le responsable ne touche qu'à l'organisation pédagogique ; le directeur a
 * l'administration complète. L'enseignant n'accède pas du tout au module.
 */
const SECTIONS_PAR_ROLE: Record<UserRole, SectionId[]> = {
  responsable: [
    "annees",
    "semestres",
    "groupes",
    "modules",
    "salles",
    "creneaux",
    "planning",
  ],
  directeur: [
    "utilisateurs",
    "roles",
    "formateurs",
    "filieres",
    "annees",
    "semestres",
    "groupes",
    "modules",
    "salles",
    "creneaux",
    "examens",
    "bulletins",
    "institut",
    "systeme",
    "securite",
  ],
  enseignant: [],
};

const META: Record<
  SectionId,
  { titre: string; desc: string; icone: typeof Users; groupe: string }
> = {
  annees: { titre: "Années universitaires", desc: "Années ouvertes à l'inscription", icone: CalendarRange, groupe: "Organisation pédagogique" },
  semestres: { titre: "Semestres", desc: "Découpage du cycle de formation", icone: LayoutGrid, groupe: "Organisation pédagogique" },
  groupes: { titre: "Groupes / classes", desc: "Groupes constitués par semestre", icone: Users, groupe: "Organisation pédagogique" },
  modules: { titre: "Modules", desc: "Modules enseignés par filière", icone: BookOpen, groupe: "Organisation pédagogique" },
  salles: { titre: "Salles", desc: "Salles, amphis et laboratoires", icone: DoorOpen, groupe: "Organisation pédagogique" },
  creneaux: { titre: "Créneaux horaires", desc: "Plages horaires de l'emploi du temps", icone: Clock, groupe: "Organisation pédagogique" },
  planning: { titre: "Configuration du planning", desc: "Jours ouvrés et amplitude horaire", icone: SlidersHorizontal, groupe: "Organisation pédagogique" },
  filieres: { titre: "Filières / départements", desc: "Filières du cursus paramédical", icone: GraduationCap, groupe: "Structure de l'institut" },
  formateurs: { titre: "Formateurs", desc: "Corps enseignant et grades", icone: GraduationCap, groupe: "Structure de l'institut" },
  utilisateurs: { titre: "Utilisateurs", desc: "Comptes ayant accès au CRM", icone: Users, groupe: "Administration" },
  roles: { titre: "Rôles & permissions", desc: "Droits accordés à chaque profil", icone: ShieldCheck, groupe: "Administration" },
  examens: { titre: "Types d'examen", desc: "Natures d'épreuves évaluables", icone: ClipboardList, groupe: "Évaluation" },
  bulletins: { titre: "Configuration des bulletins", desc: "Barème, mentions et décisions", icone: FileText, groupe: "Évaluation" },
  institut: { titre: "Informations de l'institut", desc: "Identité et coordonnées", icone: Building2, groupe: "Administration" },
  systeme: { titre: "Configuration système", desc: "Langue, devise et fuseau", icone: SlidersHorizontal, groupe: "Administration" },
  securite: { titre: "Sécurité", desc: "Mots de passe et sessions", icone: Lock, groupe: "Administration" },
};

/* ------------------------------------------------------------------ */
/*  Blocs réutilisables                                                */
/* ------------------------------------------------------------------ */

function Carte({
  id,
  action,
  children,
}: {
  id: SectionId;
  action?: ReactNode;
  children: ReactNode;
}) {
  const m = META[id];
  const Icone = m.icone;
  return (
    <section className={cn(softCard, "p-5")}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand/12 text-brand-dk">
            <Icone className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h3 className="font-display text-sm font-bold tracking-tight text-foreground">
              {m.titre}
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground">{m.desc}</p>
          </div>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Liste éditable de libellés simples (salles, groupes, années…). */
function ListeEditable({
  valeurs,
  onChange,
  placeholder,
  readOnly,
}: {
  valeurs: string[];
  onChange: (v: string[]) => void;
  placeholder: string;
  readOnly?: boolean;
}) {
  const [nouveau, setNouveau] = useState("");

  const ajouter = () => {
    const v = nouveau.trim();
    if (!v) return;
    if (valeurs.includes(v)) {
      toast.error("Cette entrée existe déjà");
      return;
    }
    onChange([...valeurs, v]);
    setNouveau("");
    toast.success(`Ajouté   ${v}`);
  };

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap gap-1.5">
        {valeurs.map((v) => (
          <span
            key={v}
            className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 py-1 ps-3 pe-1.5 text-xs font-medium text-brand-dk"
          >
            {v}
            {readOnly ? null : (
              <button
                type="button"
                aria-label={`Retirer ${v}`}
                onClick={() => {
                  onChange(valeurs.filter((x) => x !== v));
                  toast.success(`Retiré   ${v}`);
                }}
                className="grid h-4 w-4 place-items-center rounded-full transition hover:bg-alert/20 hover:text-alert"
              >
                <Trash2 className="h-2.5 w-2.5" />
              </button>
            )}
          </span>
        ))}
        {valeurs.length === 0 ? (
          <p className="text-xs text-muted-foreground">Aucune entrée.</p>
        ) : null}
      </div>

      {readOnly ? null : (
        <div className="flex gap-2">
          <Input
            value={nouveau}
            onChange={(e) => setNouveau(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                ajouter();
              }
            }}
            placeholder={placeholder}
            className={cn(softInput, "h-9 flex-1")}
          />
          <button
            className={cn(ghostPill, "h-9 gap-1.5 px-3 py-0 text-xs")}
            onClick={ajouter}
          >
            <Plus className="h-3.5 w-3.5" /> Ajouter
          </button>
        </div>
      )}
    </div>
  );
}

/** Ligne clé / valeur éditable pour les réglages simples. */
function ChampReglage({
  label,
  value,
  onChange,
  suffix,
  readOnly,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  suffix?: string;
  readOnly?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-brand/8 py-2.5 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="flex items-center gap-1.5">
        <Input
          value={value}
          readOnly={readOnly}
          onChange={(e) => onChange(e.target.value)}
          className={cn(softInput, "h-8 w-44 text-end text-sm")}
        />
        {suffix ? (
          <span className="text-xs text-muted-foreground">{suffix}</span>
        ) : null}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function SettingsPage() {
  const { role } = useAuth();
  const { etudiants, formateurs, examens, filieres, reset } = useIstpm();

  const autorisees = role ? SECTIONS_PAR_ROLE[role] : [];
  const peut = (id: SectionId) => autorisees.includes(id);

  /* État local des réglages   non persisté côté serveur. */
  const [annees, setAnnees] = useState<string[]>([...ANNEES_UNIVERSITAIRES]);
  const [semestres, setSemestres] = useState<string[]>([...NIVEAUX]);
  const [groupes, setGroupes] = useState<string[]>([...GROUPES]);
  const [salles, setSalles] = useState<string[]>([...SALLES]);
  const [creneaux, setCreneaux] = useState<string[]>(
    CRENEAUX.map((c) => `${c.debut} – ${c.fin}`),
  );
  const [listeFilieres, setListeFilieres] = useState<string[]>([...filieres]);
  const [typesExamen, setTypesExamen] = useState<string[]>(
    Object.values(TYPE_EXAMEN_LABEL),
  );
  const [resetOpen, setResetOpen] = useState(false);

  const [institut, setInstitut] = useState({
    nom: "ISTEPM Agadir",
    ville: "Agadir",
    telephone: "+212 5 28 00 00 00",
    email: "contact@istpm-agadir.ma",
  });
  const [systeme, setSysteme] = useState({
    langue: "Français",
    devise: "MAD",
    fuseau: "Africa/Casablanca",
  });
  const [securite, setSecurite] = useState({
    longueurMdp: "8",
    expirationSession: "60",
  });
  const [planning, setPlanning] = useState({
    joursOuvres: "Lundi – Samedi",
    heureDebut: "08:00",
    heureFin: "19:00",
  });
  const [bulletin, setBulletin] = useState({
    bareme: "20",
    seuilAdmission: "10",
    creditsSemestre: "30",
  });

  /** Modules réellement enseignés, dérivés du corps enseignant. */
  const modules = useMemo(
    () => [...new Set(formateurs.flatMap((f) => f.modules))].sort(),
    [formateurs],
  );

  /* --------- Accès refusé --------- */
  if (!role || autorisees.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Administration" title="Paramètres" />
        <section className={cn(softCard, "flex flex-col items-center gap-3 p-10 text-center")}>
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-muted text-muted-foreground">
            <Lock className="h-5 w-5" />
          </span>
          <p className="font-display text-base font-bold text-foreground">
            Accès non autorisé
          </p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Le module Paramètres est réservé à la direction et au responsable
            des affaires estudiantines.
          </p>
        </section>
      </div>
    );
  }

  const groupesAffiches = [
    ...new Set(autorisees.map((id) => META[id].groupe)),
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administration"
        title="Paramètres"
        actions={
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand/12 px-3 py-1.5 text-xs font-medium text-brand-dk">
            <ShieldCheck className="h-3.5 w-3.5" />
            {ROLE_META[role].label}
          </span>
        }
      />

      {role === "responsable" ? (
        <p className="rounded-2xl bg-brand/8 px-4 py-3 text-xs text-brand-dk">
          Vous administrez l'organisation pédagogique. Les comptes, les
          permissions, la sécurité et les réglages de l'institut relèvent de la
          direction.
        </p>
      ) : null}

      {groupesAffiches.map((nomGroupe) => (
        <div key={nomGroupe} className="space-y-3">
          <h2 className={eyebrowClass}>{nomGroupe}</h2>
          <div className="grid gap-4 lg:grid-cols-2">
            {autorisees
              .filter((id) => META[id].groupe === nomGroupe)
              .map((id) => (
                <div key={id}>{renderSection(id)}</div>
              ))}
          </div>
        </div>
      ))}

      {/* Données de démonstration   accessible aux deux rôles */}
      <section className={cn(softCard, "p-5")}>
        <h3 className="font-display text-sm font-bold tracking-tight text-foreground">
          Données de démonstration
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Les créations et modifications sont conservées dans ce navigateur.
          Réinitialiser restaure le jeu de données d'origine.
        </p>
        <button
          onClick={() => setResetOpen(true)}
          className="mt-4 inline-flex items-center gap-2 rounded-full border border-alert/25 bg-card px-5 py-2.5 text-sm font-medium text-alert transition hover:bg-alert/10"
        >
          <RotateCcw className="h-4 w-4" /> Réinitialiser les données
        </button>
      </section>

      <ConfirmDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        title="Réinitialiser les données ?"
        message="Toutes les créations, modifications et suppressions effectuées seront perdues, et le jeu de démonstration d'origine sera restauré."
        confirmLabel="Réinitialiser"
        onConfirm={() => {
          reset();
          toast.success("Données de démonstration restaurées");
        }}
      />
    </div>
  );

  /* --------- Rendu d'une section --------- */
  function renderSection(id: SectionId) {
    switch (id) {
      case "annees":
        return (
          <Carte id="annees">
            <ListeEditable
              valeurs={annees}
              onChange={setAnnees}
              placeholder="2026/2027"
            />
          </Carte>
        );

      case "semestres":
        return (
          <Carte id="semestres">
            <ListeEditable
              valeurs={semestres}
              onChange={setSemestres}
              placeholder="S7"
            />
          </Carte>
        );

      case "groupes":
        return (
          <Carte id="groupes">
            <ListeEditable
              valeurs={groupes}
              onChange={setGroupes}
              placeholder="S2-C"
            />
          </Carte>
        );

      case "salles":
        return (
          <Carte id="salles">
            <ListeEditable
              valeurs={salles}
              onChange={setSalles}
              placeholder="Salle 14"
            />
          </Carte>
        );

      case "creneaux":
        return (
          <Carte id="creneaux">
            <ListeEditable
              valeurs={creneaux}
              onChange={setCreneaux}
              placeholder="19:15 – 20:45"
            />
          </Carte>
        );

      case "modules":
        return (
          <Carte
            id="modules"
            action={
              <span className={toneBadge("neutral")}>{modules.length}</span>
            }
          >
            {/* Les modules proviennent des affectations des formateurs :
                ils se modifient depuis la fiche du formateur. */}
            <ListeEditable
              valeurs={modules}
              onChange={() => {}}
              placeholder=""
              readOnly
            />
            <p className="mt-2 text-[11px] text-muted-foreground">
              Modifiables depuis la fiche de chaque formateur.
            </p>
          </Carte>
        );

      case "planning":
        return (
          <Carte id="planning">
            <div>
              <ChampReglage
                label="Jours ouvrés"
                value={planning.joursOuvres}
                onChange={(v) => setPlanning({ ...planning, joursOuvres: v })}
              />
              <ChampReglage
                label="Ouverture"
                value={planning.heureDebut}
                onChange={(v) => setPlanning({ ...planning, heureDebut: v })}
              />
              <ChampReglage
                label="Fermeture"
                value={planning.heureFin}
                onChange={(v) => setPlanning({ ...planning, heureFin: v })}
              />
            </div>
          </Carte>
        );

      case "filieres":
        return (
          <Carte id="filieres">
            <ListeEditable
              valeurs={listeFilieres}
              onChange={setListeFilieres}
              placeholder="Orthoptie"
            />
          </Carte>
        );

      case "formateurs":
        return (
          <Carte
            id="formateurs"
            action={
              <span className={toneBadge("neutral")}>{formateurs.length}</span>
            }
          >
            <ul className="space-y-1.5">
              {formateurs.slice(0, 5).map((f) => (
                <li
                  key={f.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-brand/12 px-3 py-2 text-sm"
                >
                  <span className="truncate">
                    {f.prenom} {f.nom}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {f.departement}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Gestion complète depuis le module Formateurs.
            </p>
          </Carte>
        );

      case "utilisateurs":
        return (
          <Carte id="utilisateurs">
            <ul className="space-y-1.5">
              {(["directeur", "responsable", "enseignant"] as UserRole[]).map(
                (r) => (
                  <li
                    key={r}
                    className="flex items-center justify-between gap-3 rounded-xl border border-brand/12 px-3 py-2"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-foreground">
                        {ROLE_META[r].label}
                      </span>
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {ROLE_META[r].description}
                      </span>
                    </span>
                    <span className={toneBadge("teal")}>Actif</span>
                  </li>
                ),
              )}
            </ul>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Les comptes sont créés côté serveur (authentification backend).
            </p>
          </Carte>
        );

      case "roles":
        return (
          <Carte id="roles">
            <div className="overflow-hidden rounded-xl border border-brand/12">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted text-[10px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Profil</th>
                    <th className="px-3 py-2 text-center">Planning</th>
                    <th className="px-3 py-2 text-center">Notes</th>
                    <th className="px-3 py-2 text-center">Réglages</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand/8">
                  {(
                    [
                      ["Directeur", "Lecture", " ", "Complet"],
                      ["Responsable", "Complet", " ", "Pédagogie"],
                      ["Enseignant", "Le sien", "Saisie", " "],
                    ] as const
                  ).map(([r, p, n, s]) => (
                    <tr key={r}>
                      <td className="px-3 py-2 font-medium">{r}</td>
                      <td className="px-3 py-2 text-center text-muted-foreground">{p}</td>
                      <td className="px-3 py-2 text-center text-muted-foreground">{n}</td>
                      <td className="px-3 py-2 text-center text-muted-foreground">{s}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Carte>
        );

      case "examens":
        return (
          <Carte id="examens">
            <ListeEditable
              valeurs={typesExamen}
              onChange={setTypesExamen}
              placeholder="Oral"
            />
            <p className="mt-2 text-[11px] text-muted-foreground">
              {examens.length} examen(s) planifié(s) actuellement.
            </p>
          </Carte>
        );

      case "bulletins":
        return (
          <Carte id="bulletins">
            <div>
              <ChampReglage
                label="Barème"
                value={bulletin.bareme}
                onChange={(v) => setBulletin({ ...bulletin, bareme: v })}
                suffix="points"
              />
              <ChampReglage
                label="Seuil d'admission"
                value={bulletin.seuilAdmission}
                onChange={(v) =>
                  setBulletin({ ...bulletin, seuilAdmission: v })
                }
                suffix="/20"
              />
              <ChampReglage
                label="Crédits par semestre"
                value={bulletin.creditsSemestre}
                onChange={(v) =>
                  setBulletin({ ...bulletin, creditsSemestre: v })
                }
              />
            </div>
          </Carte>
        );

      case "institut":
        return (
          <Carte id="institut">
            <div>
              <ChampReglage
                label="Nom"
                value={institut.nom}
                onChange={(v) => setInstitut({ ...institut, nom: v })}
              />
              <ChampReglage
                label="Ville"
                value={institut.ville}
                onChange={(v) => setInstitut({ ...institut, ville: v })}
              />
              <ChampReglage
                label="Téléphone"
                value={institut.telephone}
                onChange={(v) => setInstitut({ ...institut, telephone: v })}
              />
              <ChampReglage
                label="E-mail"
                value={institut.email}
                onChange={(v) => setInstitut({ ...institut, email: v })}
              />
            </div>
          </Carte>
        );

      case "systeme":
        return (
          <Carte id="systeme">
            <div>
              <ChampReglage
                label="Langue par défaut"
                value={systeme.langue}
                onChange={(v) => setSysteme({ ...systeme, langue: v })}
              />
              <ChampReglage
                label="Devise"
                value={systeme.devise}
                onChange={(v) => setSysteme({ ...systeme, devise: v })}
              />
              <ChampReglage
                label="Fuseau horaire"
                value={systeme.fuseau}
                onChange={(v) => setSysteme({ ...systeme, fuseau: v })}
              />
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              {etudiants.length} étudiant(s) · frais moyens{" "}
              {fmtMAD(
                Math.round(
                  etudiants.reduce((s, e) => s + e.fraisAnnuels, 0) /
                    Math.max(1, etudiants.length),
                ),
              )}
            </p>
          </Carte>
        );

      case "securite":
        return (
          <Carte id="securite">
            <div>
              <ChampReglage
                label="Longueur minimale du mot de passe"
                value={securite.longueurMdp}
                onChange={(v) =>
                  setSecurite({ ...securite, longueurMdp: v })
                }
                suffix="car."
              />
              <ChampReglage
                label="Expiration de session"
                value={securite.expirationSession}
                onChange={(v) =>
                  setSecurite({ ...securite, expirationSession: v })
                }
                suffix="min"
              />
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              L'authentification est assurée par le serveur.
            </p>
          </Carte>
        );

      default:
        return null;
    }
  }
}

export const Route = createFileRoute("/dashboard/settings")({
  component: SettingsPage,
});
