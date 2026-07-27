import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef, type ReactNode } from "react";
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
  Eye,
  PenLine,
  Settings,
  Hospital,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useAuth, ROLE_META, type UserRole } from "@/lib/auth";
import {
  NIVEAUX,
  SALLES,
  GROUPES,
  FILIERES,
  CRENEAUX,
  ANNEES_UNIVERSITAIRES,
  TYPE_EXAMEN_LABEL,
  fmtMAD,
  type ModuleRecord,
} from "@/lib/istpm-data";
import { useIstpm } from "@/lib/istpm-store";
import {
  fetchSettings,
  updateSetting,
  createFiliereApi,
  deleteFiliereApi,
  resetSettings,
  fetchRoles,
  createRole,
  updateRole,
  deleteRole,
  fetchUsers,
  createUser,
  deleteUser,
  assignUserRole,
  type RoleRecord,
  type UserRecord,
} from "@/lib/istpm-api";
import {
  ConfirmDialog,
  FormDialog,
  TextField,
  NumberField,
  ComboBoxField,
  FullWidth,
} from "@/components/dash-form";
import {
  softCard,
  primaryPill,
  ghostPill,
  iconButtonDanger,
  toneBadge,
  softInput,
} from "@/lib/dash-ui";
import { PageHeader } from "@/components/dash-page";
import { DashTabs } from "@/components/dash-tabs";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** Libellé court + icône pour la navigation par catégorie de réglages. */
const GROUPE_META: Record<string, { short: string; icone: typeof Users }> = {
  "Organisation pédagogique": { short: "Pédagogie", icone: LayoutGrid },
  "Structure de l'institut": { short: "Institut", icone: Building2 },
  Administration: { short: "Administration", icone: ShieldCheck },
  Évaluation: { short: "Évaluation", icone: ClipboardList },
};

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
  | "securite"
  | "structures";

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
    "structures",
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
    "structures",
  ],
  enseignant: [],
};

const META: Record<
  SectionId,
  { titre: string; desc: string; icone: typeof Users | typeof Hospital; groupe: string }
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
  structures: { titre: "Structures d'accueil", desc: "CHU, hôpitaux et cliniques partenaires", icone: Hospital, groupe: "Organisation pédagogique" },
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
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

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
        {valeurs.map((v) =>
          editing === v ? (
            <span
              key={v}
              className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 py-1 ps-1 pe-1 text-xs font-medium text-brand-dk"
            >
              <Input
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setEditing(null);
                    setEditValue("");
                  }
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const trimmed = editValue.trim();
                    if (trimmed && trimmed !== v && !valeurs.includes(trimmed)) {
                      onChange(valeurs.map((x) => (x === v ? trimmed : x)));
                      toast.success(`Renommé   ${trimmed}`);
                    }
                    setEditing(null);
                    setEditValue("");
                  }
                }}
                onBlur={() => {
                  const trimmed = editValue.trim();
                  if (trimmed && trimmed !== v && !valeurs.includes(trimmed)) {
                    onChange(valeurs.map((x) => (x === v ? trimmed : x)));
                    toast.success(`Renommé   ${trimmed}`);
                  }
                  setEditing(null);
                  setEditValue("");
                }}
                autoFocus
                className={cn(softInput, "h-6 w-40 text-xs")}
              />
            </span>
          ) : (
            <span
              key={v}
              className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 py-1 ps-3 pe-1.5 text-xs font-medium text-brand-dk"
            >
              <button
                type="button"
                className="cursor-pointer hover:underline"
                onClick={() => {
                  if (readOnly) return;
                  setEditing(v);
                  setEditValue(v);
                }}
              >
                {v}
              </button>
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
          ),
        )}
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
/*  Modules — registre des modules rattachés à une filière             */
/* ------------------------------------------------------------------ */

type ModuleForm = {
  nom: string;
  filiere: string;
  code: string;
  volumeHoraire: number | "";
  coefficient: number | "";
  description: string;
};

const EMPTY_MODULE_FORM: ModuleForm = {
  nom: "",
  filiere: "",
  code: "",
  volumeHoraire: "",
  coefficient: "",
  description: "",
};

/**
 * Registre des modules : chaque module appartient à une filière (obligatoire).
 * La liste des filières provient du même référentiel que le reste de
 * l'application ; un module ne peut être enregistré sans filière associée.
 */
function ModulesSection({ filieres }: { filieres: string[] }) {
  const { modules, addModule, updateModule, deleteModule } = useIstpm();
  const [filtre, setFiltre] = useState<string>("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ModuleRecord | null>(null);
  const [form, setForm] = useState<ModuleForm>(EMPTY_MODULE_FORM);
  const [errors, setErrors] = useState<{ nom?: string; filiere?: string }>({});
  const [toDelete, setToDelete] = useState<ModuleRecord | null>(null);

  const filtres = filtre ? modules.filter((m) => m.filiere === filtre) : modules;
  const set = <K extends keyof ModuleForm>(k: K, v: ModuleForm[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY_MODULE_FORM, filiere: filtre });
    setErrors({});
    setDialogOpen(true);
  };

  const openEdit = (m: ModuleRecord) => {
    setEditing(m);
    setForm({
      nom: m.nom,
      filiere: m.filiere,
      code: m.code ?? "",
      volumeHoraire: m.volumeHoraire ?? "",
      coefficient:
        m.coefficient === null || m.coefficient === undefined
          ? ""
          : Number(m.coefficient),
      description: m.description ?? "",
    });
    setErrors({});
    setDialogOpen(true);
  };

  const submit = () => {
    const next: typeof errors = {};
    if (!form.nom.trim()) next.nom = "Nom du module obligatoire";
    if (!form.filiere.trim()) next.filiere = "La filière est obligatoire";
    setErrors(next);
    if (Object.keys(next).length) return;

    const payload = {
      nom: form.nom.trim(),
      filiere: form.filiere.trim(),
      code: form.code.trim() || null,
      description: form.description.trim() || null,
      volumeHoraire: form.volumeHoraire === "" ? null : Number(form.volumeHoraire),
      coefficient: form.coefficient === "" ? null : Number(form.coefficient),
    };

    if (editing) {
      updateModule(editing.id, payload);
      toast.success("Module mis à jour");
    } else {
      addModule(payload);
      toast.success(`Module ajouté   ${payload.nom}`);
    }
    setDialogOpen(false);
  };

  const confirmDelete = () => {
    if (!toDelete) return;
    const t = toDelete;
    setToDelete(null);
    deleteModule(t.id);
    toast.success(`Module supprimé   ${t.nom}`);
  };

  const noFilieres = filieres.length === 0;

  return (
    <Carte
      id="modules"
      action={
        <div className="flex items-center gap-2">
          <span className={toneBadge("neutral")}>{modules.length}</span>
          <button
            type="button"
            onClick={openCreate}
            disabled={noFilieres}
            className={cn(ghostPill, "h-7 gap-1 px-2.5 text-[11px]", noFilieres && "cursor-not-allowed opacity-50")}
          >
            <Plus className="h-3 w-3" /> Ajouter
          </button>
        </div>
      }
    >
      {noFilieres ? (
        <p className="rounded-xl bg-brand/8 px-3 py-2.5 text-[11px] text-brand-dk">
          Ajoutez d'abord au moins une filière pour créer des modules.
        </p>
      ) : (
        <>
          {filieres.length > 1 ? (
            <select
              value={filtre}
              onChange={(e) => setFiltre(e.target.value)}
              className={cn(
                "mb-3 h-8 w-full rounded-lg border border-brand/12 bg-card px-2 text-sm font-medium text-foreground outline-none",
                "focus:border-brand/30 focus:ring-1 focus:ring-brand/20",
              )}
            >
              <option value="">Toutes les filières</option>
              {filieres.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          ) : null}

          <div className="max-h-80 space-y-1.5 overflow-y-auto">
            {filtres.length === 0 ? (
              <p className="py-3 text-center text-xs text-muted-foreground">
                Aucun module.
              </p>
            ) : (
              filtres.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-brand/12 px-3 py-2"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-foreground">
                      {m.nom}
                    </span>
                    <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <span className="inline-flex items-center rounded-md bg-brand/10 px-1.5 py-0.5 font-medium text-brand-dk">
                        {m.filiere}
                      </span>
                      {m.code ? <span>· {m.code}</span> : null}
                      {m.coefficient ? <span>· coef {m.coefficient}</span> : null}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      aria-label={`Modifier ${m.nom}`}
                      onClick={() => openEdit(m)}
                      className="grid h-7 w-7 place-items-center rounded-lg text-muted-foreground transition hover:bg-brand/10 hover:text-brand-dk"
                    >
                      <PenLine className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Supprimer ${m.nom}`}
                      onClick={() => setToDelete(m)}
                      className={iconButtonDanger}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </span>
                </div>
              ))
            )}
          </div>
        </>
      )}

      <FormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editing ? "Modifier le module" : "Nouveau module"}
        subtitle="Chaque module doit être rattaché à une filière."
        submitLabel={editing ? "Enregistrer" : "Ajouter"}
        onSubmit={submit}
      >
        <FullWidth>
          <TextField
            label="Nom du module"
            value={form.nom}
            onChange={(v) => set("nom", v)}
            placeholder="Soins infirmiers en médecine"
            error={errors.nom}
            required
          />
        </FullWidth>
        <FullWidth>
          <ComboBoxField
            label="Filière"
            value={form.filiere}
            onChange={(v) => set("filiere", v)}
            options={filieres.map((f) => ({ value: f, label: f }))}
            placeholder="Sélectionner la filière…"
            searchPlaceholder="Rechercher une filière…"
            error={errors.filiere}
            required
          />
        </FullWidth>
        <TextField
          label="Code"
          value={form.code}
          onChange={(v) => set("code", v)}
          placeholder="MOD-01"
        />
        <NumberField
          label="Volume horaire"
          value={form.volumeHoraire}
          onChange={(v) => set("volumeHoraire", v)}
          min={0}
          suffix="h"
        />
        <NumberField
          label="Coefficient"
          value={form.coefficient}
          onChange={(v) => set("coefficient", v)}
          min={0}
          step={0.5}
        />
        <FullWidth>
          <TextField
            label="Description"
            value={form.description}
            onChange={(v) => set("description", v)}
            placeholder="Objectifs et contenu du module"
          />
        </FullWidth>
      </FormDialog>

      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(o) => {
          if (!o) setToDelete(null);
        }}
        title={toDelete ? `Supprimer le module "${toDelete.nom}" ?` : ""}
        message="Cette action est irréversible."
        confirmLabel="Supprimer"
        onConfirm={confirmDelete}
      />
    </Carte>
  );
}

/* ------------------------------------------------------------------ */
/*  Role editor sub-component                                           */
/* ------------------------------------------------------------------ */

function RoleEditor({
  role,
  permGroups,
  permLabel,
  permIcon,
  onSave,
}: {
  role: RoleRecord;
  permGroups: readonly { readonly label: string; readonly perms: readonly string[] }[];
  permLabel: Record<string, string>;
  permIcon: Record<string, ReactNode>;
  onSave: (data: { name?: string; description?: string; permissions?: string[] }) => void;
}) {
  const [name, setName] = useState(role.name);
  const [description, setDescription] = useState(role.description);
  const [permissions, setPermissions] = useState<string[]>([...role.permissions]);

  const togglePerm = (perm: string) => {
    setPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm],
    );
  };

  const selectAll = (perms: readonly string[]) => {
    const allSelected = perms.every((p) => permissions.includes(p));
    if (allSelected) {
      setPermissions((prev) => prev.filter((p) => !perms.includes(p)));
    } else {
      setPermissions((prev) => [...new Set([...prev, ...perms])]);
    }
  };

  return (
    <div className="border-t border-brand/12 px-4 py-3">
      <div className="mb-3 flex gap-2">
        <div className="flex-1">
          <label className="mb-1 block text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Nom</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} className={cn(softInput, "h-8 text-sm")} />
        </div>
        <div className="flex-[2]">
          <label className="mb-1 block text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Description</label>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} className={cn(softInput, "h-8 text-sm")} />
        </div>
      </div>

      <label className="mb-1.5 block text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Permissions</label>
      <div className="grid gap-1.5 sm:grid-cols-2">
        {permGroups.map((g) => (
          <div key={g.label} className="rounded-lg border border-brand/8 bg-brand/3 p-2">
            <button
              type="button"
              onClick={() => selectAll(g.perms)}
              className="mb-1 block text-[11px] font-bold text-foreground hover:text-brand-dk transition-colors"
            >
              {g.label}
              <span className="ml-1.5 text-[9px] text-muted-foreground">
                {g.perms.every((p) => permissions.includes(p)) ? "✓" : "(sélectionner)"}
              </span>
            </button>
            <div className="flex flex-wrap gap-1">
              {g.perms.map((perm) => {
                const suffix = perm.split(".")[1];
                const active = permissions.includes(perm);
                return (
                  <button
                    key={perm}
                    type="button"
                    onClick={() => togglePerm(perm)}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium transition-colors",
                      active
                        ? "bg-brand/20 text-brand-dk"
                        : "bg-brand/5 text-muted-foreground hover:bg-brand/10",
                    )}
                  >
                    {permIcon[suffix]}
                    {permLabel[suffix] ?? suffix}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 flex justify-end gap-2">
        <span className="text-[10px] text-muted-foreground self-center">
          {permissions.length} permission(s)
        </span>
        <button
          type="button"
          onClick={() => onSave({ name, description, permissions })}
          disabled={!name.trim()}
          className={cn(primaryPill, "h-7 px-3 text-[11px]")}
        >
          Enregistrer
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  New Role form                                                      */
/* ------------------------------------------------------------------ */

function NewRoleForm({
  permGroups,
  permLabel,
  permIcon,
  onClose,
  onCreated,
}: {
  permGroups: readonly { readonly label: string; readonly perms: readonly string[] }[];
  permLabel: Record<string, string>;
  permIcon: Record<string, ReactNode>;
  onClose: () => void;
  onCreated: (role: RoleRecord) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const togglePerm = (perm: string) => {
    setPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm],
    );
  };

  const handleCreate = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      const role = await createRole({ name: name.trim(), description, permissions });
      onCreated(role);
      toast.success(`Rôle "${name}" créé`);
    } catch {
      toast.error("Erreur lors de la création");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-3 rounded-xl border border-brand/12 p-4">
      <h4 className="mb-3 text-xs font-bold text-foreground">Nouveau rôle</h4>
      <div className="mb-3 flex gap-2">
        <div className="flex-1">
          <label className="mb-1 block text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Nom *</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Assistant" className={cn(softInput, "h-8 text-sm")} />
        </div>
        <div className="flex-[2]">
          <label className="mb-1 block text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Description</label>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Accès limité..." className={cn(softInput, "h-8 text-sm")} />
        </div>
      </div>

      <label className="mb-1.5 block text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Permissions</label>
      <div className="grid gap-1.5 sm:grid-cols-2">
        {permGroups.map((g) => (
          <div key={g.label} className="rounded-lg border border-brand/8 bg-brand/3 p-2">
            <span className="mb-1 block text-[11px] font-bold text-foreground">{g.label}</span>
            <div className="flex flex-wrap gap-1">
              {g.perms.map((perm) => {
                const suffix = perm.split(".")[1];
                const active = permissions.includes(perm);
                return (
                  <button
                    key={perm}
                    type="button"
                    onClick={() => togglePerm(perm)}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium transition-colors",
                      active
                        ? "bg-brand/20 text-brand-dk"
                        : "bg-brand/5 text-muted-foreground hover:bg-brand/10",
                    )}
                  >
                    {permIcon[suffix]}
                    {permLabel[suffix] ?? suffix}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 flex justify-end gap-2">
        <button type="button" onClick={onClose} className={cn(ghostPill, "h-7 px-3 text-[11px]")}>
          Annuler
        </button>
        <button
          type="button"
          onClick={handleCreate}
          disabled={!name.trim() || loading}
          className={cn(primaryPill, "h-7 px-3 text-[11px]")}
        >
          {loading ? "Création..." : "Créer le rôle"}
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  New User form                                                      */
/* ------------------------------------------------------------------ */

function NewUserForm({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (user: UserRecord) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("enseignant");
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) return;
    setLoading(true);

    const userData = {
      name: name.trim(),
      email: email.trim(),
      password,
      role,
    };

    createUser(userData).catch(() => {});

    onCreated({
      id: crypto.randomUUID(),
      name: name.trim(),
      email: email.trim(),
      role,
      createdAt: new Date().toISOString(),
    });
    toast.success(`Utilisateur "${name}" créé`);
    setLoading(false);
  };

  const selectClass = cn(
    "h-8 w-full rounded-lg border border-brand/12 bg-card px-2 text-sm font-medium text-foreground outline-none",
    "focus:border-brand/30 focus:ring-1 focus:ring-brand/20",
  );

  return (
    <div className="mt-3 rounded-xl border border-brand/12 p-4">
      <h4 className="mb-3 text-xs font-bold text-foreground">Nouvel utilisateur</h4>
      <div className="mb-3 grid gap-2 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Nom *</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom complet" className={cn(softInput, "h-8 text-sm")} />
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Email *</label>
          <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@istpm.ma" className={cn(softInput, "h-8 text-sm")} />
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Mot de passe *</label>
          <Input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="••••••" className={cn(softInput, "h-8 text-sm")} />
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Rôle</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className={selectClass}
          >
            {["directeur", "responsable", "enseignant", "admin"].map((r) => (
              <option key={r} value={r}>{ROLE_META[r as UserRole]?.label ?? r}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onClose} className={cn(ghostPill, "h-7 px-3 text-[11px]")}>
          Annuler
        </button>
        <button
          type="button"
          onClick={handleCreate}
          disabled={!name.trim() || !email.trim() || !password.trim() || loading}
          className={cn(primaryPill, "h-7 px-3 text-[11px]")}
        >
          {loading ? "Création..." : "Créer l'utilisateur"}
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function SettingsPage() {
  const { role } = useAuth();
  const {
    etudiants,
    formateurs,
    examens,
    filieres,
    structuresAccueil,
    addStructureAccueil,
    updateStructureAccueil,
    deleteStructureAccueil,
    reset,
  } = useIstpm();

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
  const [listeStructures, setListeStructures] = useState<string[]>([...structuresAccueil]);
  const [typesExamen, setTypesExamen] = useState<string[]>(
    Object.values(TYPE_EXAMEN_LABEL),
  );
  const [resetOpen, setResetOpen] = useState(false);
  const [activeGroup, setActiveGroup] = useState(0);

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

  /* --------- API sync --------- */
  const filieresRef = useRef(listeFilieres);
  filieresRef.current = listeFilieres;
  const structuresRef = useRef(listeStructures);
  structuresRef.current = listeStructures;

  useEffect(() => {
    fetchSettings()
      .then((data) => {
        if (Array.isArray(data.annees_universitaires))
          setAnnees(data.annees_universitaires as string[]);
        if (Array.isArray(data.semestres))
          setSemestres(data.semestres as string[]);
        if (Array.isArray(data.groupes))
          setGroupes(data.groupes as string[]);
        if (Array.isArray(data.salles))
          setSalles(data.salles as string[]);
        if (Array.isArray(data.creneaux))
          setCreneaux(data.creneaux as string[]);
        if (Array.isArray(data.types_examen))
          setTypesExamen(data.types_examen as string[]);
        if (typeof data.institut_nom === "string")
          setInstitut((p) => ({ ...p, nom: data.institut_nom as string }));
        if (typeof data.institut_ville === "string")
          setInstitut((p) => ({ ...p, ville: data.institut_ville as string }));
        if (typeof data.institut_telephone === "string")
          setInstitut((p) => ({ ...p, telephone: data.institut_telephone as string }));
        if (typeof data.institut_email === "string")
          setInstitut((p) => ({ ...p, email: data.institut_email as string }));
        if (typeof data.systeme_langue === "string")
          setSysteme((p) => ({ ...p, langue: data.systeme_langue as string }));
        if (typeof data.systeme_devise === "string")
          setSysteme((p) => ({ ...p, devise: data.systeme_devise as string }));
        if (typeof data.systeme_fuseau === "string")
          setSysteme((p) => ({ ...p, fuseau: data.systeme_fuseau as string }));
        if (typeof data.securite_longueurMdp === "string")
          setSecurite((p) => ({ ...p, longueurMdp: data.securite_longueurMdp as string }));
        if (typeof data.securite_expirationSession === "string")
          setSecurite((p) => ({ ...p, expirationSession: data.securite_expirationSession as string }));
        if (typeof data.planning_joursOuvres === "string")
          setPlanning((p) => ({ ...p, joursOuvres: data.planning_joursOuvres as string }));
        if (typeof data.planning_heureDebut === "string")
          setPlanning((p) => ({ ...p, heureDebut: data.planning_heureDebut as string }));
        if (typeof data.planning_heureFin === "string")
          setPlanning((p) => ({ ...p, heureFin: data.planning_heureFin as string }));
        if (typeof data.bulletin_bareme === "string")
          setBulletin((p) => ({ ...p, bareme: data.bulletin_bareme as string }));
        if (typeof data.bulletin_seuilAdmission === "string")
          setBulletin((p) => ({ ...p, seuilAdmission: data.bulletin_seuilAdmission as string }));
        if (typeof data.bulletin_creditsSemestre === "string")
          setBulletin((p) => ({ ...p, creditsSemestre: data.bulletin_creditsSemestre as string }));
      })
      .catch(() => {});
  }, []);

  /* --------- Roles & Users state --------- */
  const [rolesList, setRolesList] = useState<RoleRecord[]>([]);
  const [usersList, setUsersList] = useState<UserRecord[]>([]);
  const [editRole, setEditRole] = useState<RoleRecord | null>(null);
  const [showNewRole, setShowNewRole] = useState(false);
  const [showNewUser, setShowNewUser] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: "role" | "user"; id: string; name: string } | null>(null);

  useEffect(() => {
    fetchRoles()
      .then(setRolesList)
      .catch(() => {});
    fetchUsers()
      .then(setUsersList)
      .catch(() => {});
  }, []);

  const PERM_GROUPS = [
    { label: "Étudiants", perms: ["etudiants.read", "etudiants.write", "etudiants.delete"] },
    { label: "Formateurs", perms: ["formateurs.read", "formateurs.write", "formateurs.delete"] },
    { label: "Examens", perms: ["examens.read", "examens.write", "examens.delete"] },
    { label: "Bulletins", perms: ["bulletins.read", "bulletins.write", "bulletins.delete"] },
    { label: "Stages", perms: ["stages.read", "stages.write", "stages.delete"] },
    { label: "Paiements", perms: ["paiements.read", "paiements.write", "paiements.delete"] },
    { label: "Paramètres", perms: ["settings.read", "settings.write"] },
    { label: "Utilisateurs", perms: ["users.read", "users.write", "users.delete"] },
    { label: "Rôles", perms: ["roles.read", "roles.manage"] },
    { label: "Dashboard", perms: ["dashboard.read"] },
  ] as const;

  const PERM_LABEL: Record<string, string> = {
    read: "Voir",
    write: "Écrire",
    delete: "Supprimer",
    manage: "Gérer",
  };

  const PERM_ICON: Record<string, ReactNode> = {
    read: <Eye className="h-3 w-3" />,
    write: <PenLine className="h-3 w-3" />,
    delete: <Trash2 className="h-3 w-3" />,
    manage: <Settings className="h-3 w-3" />,
  };

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

      <DashTabs
        tabs={groupesAffiches.map((g) => ({
          label: g,
          short: GROUPE_META[g]?.short ?? g,
          icon: GROUPE_META[g]?.icone,
        }))}
        active={Math.min(activeGroup, groupesAffiches.length - 1)}
        onChange={setActiveGroup}
      />

      {(() => {
        const nomGroupe =
          groupesAffiches[Math.min(activeGroup, groupesAffiches.length - 1)];
        return (
          <motion.div
            key={nomGroupe}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="grid gap-4 lg:grid-cols-2"
          >
            {autorisees
              .filter((id) => META[id].groupe === nomGroupe)
              .map((id) => (
                <div key={id}>{renderSection(id)}</div>
              ))}
          </motion.div>
        );
      })()}

      {/* Données de démonstration   accessible aux deux rôles */}
      {/* <section className={cn(softCard, "p-5")}>
        <h3 className="font-display text-sm font-bold tracking-tight text-foreground">
          Données de démonstration
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Les modifications sont sauvegardées sur le serveur.
          Réinitialiser efface toutes les données et restaure les valeurs par défaut.
        </p>
        <button
          onClick={() => setResetOpen(true)}
          className="mt-4 inline-flex items-center gap-2 rounded-full border border-alert/25 bg-card px-5 py-2.5 text-sm font-medium text-alert transition hover:bg-alert/10"
        >
          <RotateCcw className="h-4 w-4" /> Réinitialiser les données
        </button>
      </section> */}

      <ConfirmDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        title="Réinitialiser les données ?"
        message="Toutes les créations, modifications et suppressions effectuées seront perdues, et le jeu de démonstration d'origine sera restauré."
        confirmLabel="Réinitialiser"
        onConfirm={() => {
          resetSettings().catch(() => {});
          reset();
          toast.success("Données réinitialisées");
        }}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}
        title={deleteTarget ? `Supprimer ${deleteTarget.type === "role" ? "le rôle" : "l'utilisateur"} "${deleteTarget.name}" ?` : ""}
        message={`Cette action est irréversible. ${deleteTarget?.type === "role" ? "Les utilisateurs ayant ce rôle conserveront leur rôle actuel." : ""}`}
        confirmLabel="Supprimer"
        onConfirm={() => {
          if (!deleteTarget) return;
          const t = deleteTarget;
          setDeleteTarget(null);
          const del = t.type === "role" ? deleteRole(t.id) : deleteUser(t.id);
          del.then(() => {
            if (t.type === "role") {
              setRolesList((prev) => prev.filter((r) => r.id !== t.id));
              if (editRole?.id === t.id) setEditRole(null);
            } else {
              setUsersList((prev) => prev.filter((u) => u.id !== t.id));
            }
            toast.success(`${t.type === "role" ? "Rôle" : "Utilisateur"} supprimé`);
          }).catch(() => toast.error("Erreur lors de la suppression"));
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
              onChange={(v) => { setAnnees(v); updateSetting("annees_universitaires", v).catch(() => {}); }}
              placeholder="2026/2027"
            />
          </Carte>
        );

      case "semestres":
        return (
          <Carte id="semestres">
            <ListeEditable
              valeurs={semestres}
              onChange={(v) => { setSemestres(v); updateSetting("semestres", v).catch(() => {}); }}
              placeholder="S7"
            />
          </Carte>
        );

      case "groupes":
        return (
          <Carte id="groupes">
            <ListeEditable
              valeurs={groupes}
              onChange={(v) => { setGroupes(v); updateSetting("groupes", v).catch(() => {}); }}
              placeholder="S2-C"
            />
          </Carte>
        );

      case "salles":
        return (
          <Carte id="salles">
            <ListeEditable
              valeurs={salles}
              onChange={(v) => { setSalles(v); updateSetting("salles", v).catch(() => {}); }}
              placeholder="Salle 14"
            />
          </Carte>
        );

      case "creneaux":
        return (
          <Carte id="creneaux">
            <ListeEditable
              valeurs={creneaux}
              onChange={(v) => { setCreneaux(v); updateSetting("creneaux", v).catch(() => {}); }}
              placeholder="19:15 – 20:45"
            />
          </Carte>
        );

      case "modules":
        return <ModulesSection filieres={listeFilieres} />;

      case "planning":
        return (
          <Carte id="planning">
            <div>
              <ChampReglage
                label="Jours ouvrés"
                value={planning.joursOuvres}
                onChange={(v) => { setPlanning({ ...planning, joursOuvres: v }); updateSetting("planning_joursOuvres", v).catch(() => {}); }}
              />
              <ChampReglage
                label="Ouverture"
                value={planning.heureDebut}
                onChange={(v) => { setPlanning({ ...planning, heureDebut: v }); updateSetting("planning_heureDebut", v).catch(() => {}); }}
              />
              <ChampReglage
                label="Fermeture"
                value={planning.heureFin}
                onChange={(v) => { setPlanning({ ...planning, heureFin: v }); updateSetting("planning_heureFin", v).catch(() => {}); }}
              />
            </div>
          </Carte>
        );

      case "filieres":
        return (
          <Carte id="filieres">
            <ListeEditable
              valeurs={listeFilieres}
              onChange={(v) => {
                const oldList = filieresRef.current;
                const added = v.filter((x) => !oldList.includes(x));
                const removed = oldList.filter((x) => !v.includes(x));
                added.forEach((nom) => createFiliereApi(nom).catch(() => {}));
                removed.forEach((nom) => deleteFiliereApi(nom).catch(() => {}));
                setListeFilieres(v);
              }}
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
          <Carte
            id="utilisateurs"
            action={
              <button
                type="button"
                onClick={() => setShowNewUser(true)}
                className={cn(ghostPill, "h-7 gap-1 px-2.5 text-[11px]")}
              >
                <Plus className="h-3 w-3" /> Ajouter
              </button>
            }
          >
            <div className="space-y-1.5">
              {usersList.length === 0 ? (
                <p className="py-3 text-center text-xs text-muted-foreground">Aucun utilisateur.</p>
              ) : (
                usersList.map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-brand/12 px-3 py-2"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-foreground">
                        {u.name}
                      </span>
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {u.email}
                      </span>
                    </span>
                    <select
                      value={u.role}
                      onChange={(e) => {
                        assignUserRole(u.id, e.target.value).then(() => {
                          setUsersList((prev) =>
                            prev.map((x) => (x.id === u.id ? { ...x, role: e.target.value } : x)),
                          );
                          toast.success(`Rôle de ${u.name} mis à jour`);
                        }).catch(() => toast.error("Erreur lors du changement de rôle"));
                      }}
                      className={cn(
                        "h-7 rounded-lg border border-brand/12 bg-card px-2 text-xs font-medium text-foreground outline-none",
                        "focus:border-brand/30 focus:ring-1 focus:ring-brand/20",
                      )}
                    >
                      {["directeur", "responsable", "enseignant", "admin"].map((r) => (
                        <option key={r} value={r}>
                          {ROLE_META[r as UserRole]?.label ?? r}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      aria-label={`Supprimer ${u.name}`}
                      onClick={() => setDeleteTarget({ type: "user", id: u.id, name: u.name })}
                      className={cn(iconButtonDanger, "h-7 w-7")}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))
              )}
            </div>
            {showNewUser ? <NewUserForm onClose={() => setShowNewUser(false)} onCreated={(u) => { setUsersList((prev) => [...prev, u]); setShowNewUser(false); }} /> : null}
          </Carte>
        );

      case "roles":
        return (
          <Carte
            id="roles"
            action={
              <button
                type="button"
                onClick={() => setShowNewRole(true)}
                className={cn(ghostPill, "h-7 gap-1 px-2.5 text-[11px]")}
              >
                <Plus className="h-3 w-3" /> Nouveau rôle
              </button>
            }
          >
            <div className="space-y-3">
              {rolesList.length === 0 ? (
                <p className="py-3 text-center text-xs text-muted-foreground">Aucun rôle défini.</p>
              ) : (
                rolesList.map((role) => (
                  <div key={role.id} className="rounded-xl border border-brand/12 overflow-hidden">
                    <div className="flex items-center justify-between gap-3 bg-brand/4 px-4 py-2.5">
                      <div className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="text-sm font-bold text-foreground">{role.name}</span>
                          {role.isSystem ? <span className={cn(toneBadge("neutral"), "text-[10px]")}>Système</span> : null}
                        </span>
                        <span className="block text-[11px] text-muted-foreground">
                          {role.description || "Aucune description"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setEditRole(editRole?.id === role.id ? null : role)}
                          className={cn(ghostPill, "h-7 gap-1 px-2 text-[11px]")}
                        >
                          {editRole?.id === role.id ? "Fermer" : "Modifier"}
                        </button>
                        {!role.isSystem ? (
                          <button
                            type="button"
                            aria-label={`Supprimer ${role.name}`}
                            onClick={() => setDeleteTarget({ type: "role", id: role.id, name: role.name })}
                            className={cn(iconButtonDanger, "h-7 w-7")}
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        ) : null}
                      </div>
                    </div>

                    {editRole?.id === role.id ? (
                      <RoleEditor
                        role={role}
                        permGroups={PERM_GROUPS}
                        permLabel={PERM_LABEL}
                        permIcon={PERM_ICON}
                        onSave={(data) => {
                          updateRole(role.id, data).then((updated) => {
                            setRolesList((prev) => prev.map((r) => (r.id === role.id ? updated : r)));
                            setEditRole(null);
                            toast.success(`Rôle "${role.name}" mis à jour`);
                          }).catch(() => toast.error("Erreur lors de la mise à jour"));
                        }}
                      />
                    ) : (
                      <div className="flex flex-wrap gap-1 px-4 py-2.5">
                        {PERM_GROUPS.map((g) => {
                          const active = g.perms.filter((p) => role.permissions.includes(p));
                          if (active.length === 0) return null;
                          return (
                            <span key={g.label} className="inline-flex items-center gap-1 rounded-full bg-brand/8 px-2 py-0.5 text-[10px] font-medium text-brand-dk">
                              {g.label}: {active.map((p) => PERM_LABEL[p.split(".")[1]] ?? p.split(".")[1]).join(", ")}
                            </span>
                          );
                        })}
                        {role.permissions.length === 0 ? (
                          <span className="text-[10px] text-muted-foreground">Aucune permission</span>
                        ) : null}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {showNewRole ? (
              <NewRoleForm
                permGroups={PERM_GROUPS}
                permLabel={PERM_LABEL}
                permIcon={PERM_ICON}
                onClose={() => setShowNewRole(false)}
                onCreated={(r) => { setRolesList((prev) => [...prev, r]); setShowNewRole(false); }}
              />
            ) : null}

            <p className="mt-2 text-[11px] text-muted-foreground">
              {rolesList.length} rôle(s) · Les rôles système ne peuvent pas être supprimés.
            </p>
          </Carte>
        );

      case "examens":
        return (
          <Carte id="examens">
            <ListeEditable
              valeurs={typesExamen}
              onChange={(v) => { setTypesExamen(v); updateSetting("types_examen", v).catch(() => {}); }}
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
                onChange={(v) => { setBulletin({ ...bulletin, bareme: v }); updateSetting("bulletin_bareme", v).catch(() => {}); }}
                suffix="points"
              />
              <ChampReglage
                label="Seuil d'admission"
                value={bulletin.seuilAdmission}
                onChange={(v) => { setBulletin({ ...bulletin, seuilAdmission: v }); updateSetting("bulletin_seuilAdmission", v).catch(() => {}); }}
                suffix="/20"
              />
              <ChampReglage
                label="Crédits par semestre"
                value={bulletin.creditsSemestre}
                onChange={(v) => { setBulletin({ ...bulletin, creditsSemestre: v }); updateSetting("bulletin_creditsSemestre", v).catch(() => {}); }}
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
                onChange={(v) => { setInstitut({ ...institut, nom: v }); updateSetting("institut_nom", v).catch(() => {}); }}
              />
              <ChampReglage
                label="Ville"
                value={institut.ville}
                onChange={(v) => { setInstitut({ ...institut, ville: v }); updateSetting("institut_ville", v).catch(() => {}); }}
              />
              <ChampReglage
                label="Téléphone"
                value={institut.telephone}
                onChange={(v) => { setInstitut({ ...institut, telephone: v }); updateSetting("institut_telephone", v).catch(() => {}); }}
              />
              <ChampReglage
                label="E-mail"
                value={institut.email}
                onChange={(v) => { setInstitut({ ...institut, email: v }); updateSetting("institut_email", v).catch(() => {}); }}
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
                onChange={(v) => { setSysteme({ ...systeme, langue: v }); updateSetting("systeme_langue", v).catch(() => {}); }}
              />
              <ChampReglage
                label="Devise"
                value={systeme.devise}
                onChange={(v) => { setSysteme({ ...systeme, devise: v }); updateSetting("systeme_devise", v).catch(() => {}); }}
              />
              <ChampReglage
                label="Fuseau horaire"
                value={systeme.fuseau}
                onChange={(v) => { setSysteme({ ...systeme, fuseau: v }); updateSetting("systeme_fuseau", v).catch(() => {}); }}
              />
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              {etudiants.length} étudiant(s) · frais mensuels moyens{" "}
              {fmtMAD(
                Math.round(
                  etudiants.reduce((s, e) => s + e.fraisMensuels, 0) /
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
                onChange={(v) => { setSecurite({ ...securite, longueurMdp: v }); updateSetting("securite_longueurMdp", v).catch(() => {}); }}
                suffix="car."
              />
              <ChampReglage
                label="Expiration de session"
                value={securite.expirationSession}
                onChange={(v) => { setSecurite({ ...securite, expirationSession: v }); updateSetting("securite_expirationSession", v).catch(() => {}); }}
                suffix="min"
              />
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              L'authentification est assurée par le serveur.
            </p>
          </Carte>
        );

      case "structures":
        return (
          <Carte id="structures">
            <ListeEditable
              valeurs={listeStructures}
              onChange={(v) => {
                const oldList = structuresRef.current;
                const added = v.filter((x) => !oldList.includes(x));
                const removed = oldList.filter((x) => !v.includes(x));
                added.forEach((nom) => addStructureAccueil(nom));
                removed.forEach((nom) => deleteStructureAccueil(nom));
                setListeStructures(v);
              }}
              placeholder="CHU Mohammed VI   Marrakech"
            />
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
