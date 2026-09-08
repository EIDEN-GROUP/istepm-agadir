/**
 * Page « Mon profil » — accessible uniquement en cliquant la pastille ronde
 * en bas du rail latéral (aucune entrée de menu).
 *
 * En-tête façon fiche : photo à gauche (cliquable pour changer), identité et
 * grille d'informations à droite. Le contenu s'adapte au rôle.
 *
 * Édition self-service :
 *   · photo   → tout le monde, sans mot de passe
 *   · e-mail / mot de passe → confirmation par le mot de passe actuel
 *   · le nom et le rôle restent gérés par la direction
 */
import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState, type ReactNode } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Camera,
  ShieldCheck,
  Pencil,
  BadgeCheck,
  Users2,
  ClipboardList,
  FileText,
  Briefcase,
  Wallet,
  CalendarCheck,
} from "lucide-react";
import { ROLE_META, useAuth } from "@/lib/auth";
import { useIstpm } from "@/lib/istpm-store";
import {
  fetchSettings,
  fetchStudentMe,
  updateMyProfile,
} from "@/lib/istpm-api";
import { downscaleImage } from "@/lib/image";
import { PersonAvatar } from "@/components/person-avatar";
import { PageHeader } from "@/components/dash-page";
import { softCard, eyebrowClass } from "@/lib/dash-ui";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */

const str = (v: unknown) => {
  const s = v == null ? "" : String(v);
  return s.trim() ? s : "—";
};

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 truncate text-sm font-medium text-foreground">
        {value}
      </p>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-xl border border-brand/10 bg-card px-2 py-3 text-center">
      <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand/10 text-brand-dk">
        {icon}
      </span>
      <span className="text-base font-bold leading-none text-foreground">
        {value}
      </span>
      <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

const INPUT =
  "w-full rounded-xl border border-brand/15 bg-card px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-brand/40 focus:ring-2 focus:ring-brand-lt/40";
const INPUT_LABEL =
  "text-[11px] font-semibold uppercase tracking-wider text-muted-foreground";

/* ------------------------------------------------------------------ */

function EditCard({ onDone }: { onDone: () => void }) {
  const { user, applyAccountUpdate } = useAuth();
  const [email, setEmail] = useState(user?.email ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const mut = useMutation({
    mutationFn: updateMyProfile,
    onSuccess: (res) => {
      applyAccountUpdate(res.token, {
        email: res.user.email,
        name: res.user.name,
        photoUrl: res.user.photoUrl ?? "",
      });
      toast.success("Profil mis à jour.");
      onDone();
    },
    onError: (e) =>
      setErr(e instanceof Error ? e.message : "La mise à jour a échoué."),
  });

  if (!user) return null;

  const emailChanged = email.trim().toLowerCase() !== user.email.toLowerCase();
  const wantsNewPassword = newPassword.length > 0;
  const nothingToDo = !emailChanged && !wantsNewPassword;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (nothingToDo) return setErr("Aucune modification à enregistrer.");
    if (!currentPassword)
      return setErr("Saisissez votre mot de passe actuel pour confirmer.");
    if (wantsNewPassword && newPassword.length < 8)
      return setErr("Le nouveau mot de passe doit faire au moins 8 caractères.");
    mut.mutate({
      email: emailChanged ? email.trim().toLowerCase() : undefined,
      currentPassword,
      newPassword: wantsNewPassword ? newPassword : undefined,
    });
  };

  return (
    <form onSubmit={submit} className={cn(softCard, "space-y-4 p-6")}>
      <p className={eyebrowClass}>Modifier mes identifiants</p>
      <p className="rounded-xl bg-brand/5 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
        Seuls l'e-mail et le mot de passe sont modifiables. Le nom et le rôle
        sont gérés par la direction. La photo se change directement sur l'image.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-1 sm:col-span-2">
          <span className={INPUT_LABEL}>E-mail</span>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={INPUT}
          />
        </label>

        <label className="block space-y-1">
          <span className={INPUT_LABEL}>
            Nouveau mot de passe{" "}
            <span className="font-normal normal-case">(optionnel)</span>
          </span>
          <input
            type="password"
            autoComplete="new-password"
            data-lpignore="true"
            data-1p-ignore="true"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="••••••••"
            className={INPUT}
          />
        </label>

        <label className="block space-y-1">
          <span className={INPUT_LABEL}>
            Mot de passe actuel <span className="text-alert">*</span>
          </span>
          <input
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Requis pour confirmer"
            className={INPUT}
          />
        </label>
      </div>

      {err ? (
        <p className="rounded-lg bg-alert/10 px-3 py-2 text-xs font-medium text-alert-dk">
          {err}
        </p>
      ) : null}

      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onDone}
          disabled={mut.isPending}
          className="rounded-xl px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-brand/5 disabled:opacity-50"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={mut.isPending || nothingToDo}
          className="rounded-xl bg-gradient-to-b from-med to-med-dk px-4 py-2 text-xs font-semibold text-white shadow-sm transition-opacity disabled:opacity-50"
        >
          {mut.isPending ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ */

function MonProfilPage() {
  const { user, selectedFormateurId, applyAccountUpdate } = useAuth();
  const { formateurs } = useIstpm();
  const [editing, setEditing] = useState(false);
  const photoInput = useRef<HTMLInputElement>(null);

  const isEtudiant = user?.role === "etudiant";

  const studentQuery = useQuery({
    queryKey: ["student-me"],
    queryFn: () => fetchStudentMe(),
    retry: false,
    enabled: isEtudiant,
    staleTime: 5 * 60_000,
  });
  const settingsQuery = useQuery({
    queryKey: ["settings"],
    queryFn: () => fetchSettings(),
    retry: false,
    staleTime: 10 * 60_000,
  });

  const photoMut = useMutation({
    mutationFn: (photoUrl: string) => updateMyProfile({ photoUrl }),
    onSuccess: (res) => {
      applyAccountUpdate(res.token, { photoUrl: res.user.photoUrl ?? "" });
      toast.success(res.user.photoUrl ? "Photo mise à jour." : "Photo retirée.");
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Échec de l'envoi."),
  });

  if (!user) return null;

  const roleMeta = ROLE_META[user.role];
  const me = studentQuery.data;
  const etu = me?.etudiant;

  // La photo vient du compte courant (contexte auth, remis à zéro quand on
  // change de rôle) ; pour un étudiant, la fiche sert de repli après un reload.
  const photoUrl =
    user.photoUrl || etu?.photoUrl || etu?.photo_url || null;

  const s = settingsQuery.data ?? {};
  const institut =
    [str(s.institut_nom), str(s.institut_ville)]
      .filter((v) => v !== "—")
      .join(" · ") || "Institut spécialisé des techniques paramédicales";

  const formateur =
    user.role === "enseignant"
      ? (formateurs.find((f) => f.id === selectedFormateurId) ??
        formateurs.find(
          (f) => f.email?.toLowerCase() === user.email.toLowerCase(),
        ))
      : undefined;

  const onPhotoFile = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/"))
      return toast.error("Choisissez une image (JPG / PNG).");
    if (file.size > 8 * 1024 * 1024)
      return toast.error("Image trop lourde (8 Mo max).");
    try {
      photoMut.mutate(await downscaleImage(file, 512));
    } catch {
      toast.error("Image illisible — essayez un autre fichier.");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Mon compte"
        title="Mon profil"
        actions={
          !editing ? (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-brand/20 bg-card px-3 py-2 text-xs font-semibold text-brand-dk shadow-sm transition-colors hover:bg-brand/5"
            >
              <Pencil className="h-3.5 w-3.5" />
              Modifier
            </button>
          ) : null
        }
      />

      {/* Fiche identité */}
      <section className={cn(softCard, "p-6")}>
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          <div className="relative shrink-0 self-center sm:self-start">
            <button
              type="button"
              onClick={() => photoInput.current?.click()}
              title="Changer ma photo"
              className="group relative block h-28 w-28 overflow-hidden rounded-2xl ring-2 ring-inset ring-brand/20 transition hover:ring-brand/45"
            >
              <PersonAvatar
                name={user.name}
                photoUrl={photoUrl}
                size="xl"
                ring={false}
                className="h-28 w-28 rounded-2xl"
              />
              <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-black/45 py-1 text-[10px] font-semibold text-white opacity-90 group-hover:opacity-100">
                <Camera className="h-3 w-3" />
                {photoMut.isPending ? "…" : "Photo"}
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
            {photoUrl ? (
              <button
                type="button"
                onClick={() => photoMut.mutate("")}
                disabled={photoMut.isPending}
                className="mt-2 block w-full text-center text-[11px] font-medium text-muted-foreground underline-offset-2 transition-colors hover:text-alert-dk hover:underline disabled:opacity-50"
              >
                Retirer la photo
              </button>
            ) : null}
          </div>

          <div className="min-w-0 flex-1 space-y-5">
            <div>
              <h2 className="font-display text-2xl font-bold tracking-tight text-foreground">
                {user.name}
              </h2>
              <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-brand/12 px-2.5 py-0.5 text-xs font-semibold text-brand-dk">
                <ShieldCheck className="h-3.5 w-3.5" />
                {roleMeta.label}
              </span>
            </div>

            <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="E-mail" value={user.email} />
              <Field label="Rôle" value={roleMeta.label} />
              <Field label="Établissement" value={institut} />

              {isEtudiant && etu ? (
                <>
                  <Field label="CNE" value={str(etu.cne)} />
                  <Field label="Filière" value={str(etu.filiere)} />
                  <Field
                    label="Niveau · groupe"
                    value={
                      [etu.niveau, etu.groupe].filter(Boolean).join(" · ") || "—"
                    }
                  />
                  <Field
                    label="Téléphone"
                    value={str((etu as Record<string, unknown>).telephone)}
                  />
                  <Field
                    label="Ville"
                    value={str((etu as Record<string, unknown>).ville)}
                  />
                  <Field
                    label="Date de naissance"
                    value={str((etu as Record<string, unknown>).dateNaissance)}
                  />
                </>
              ) : null}

              {formateur ? (
                <>
                  <Field
                    label="Département"
                    value={str(formateur.departement)}
                  />
                  <Field
                    label={`Groupes encadrés (${formateur.groupes.length})`}
                    value={
                      formateur.groupes.length > 0
                        ? formateur.groupes.join(", ")
                        : "Aucun"
                    }
                  />
                </>
              ) : null}
            </div>

            <p className="flex items-start gap-1.5 rounded-xl bg-brand/6 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
              <BadgeCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-dk" />
              {roleMeta.description}. Le nom et le rôle sont gérés par la
              direction — signalez toute erreur via une demande.
            </p>

            {isEtudiant && studentQuery.isError ? (
              <p className="rounded-xl bg-brand/5 px-3 py-2 text-xs text-muted-foreground">
                Profil étudiant non lié à ce compte. Demandez au secrétariat de
                lier votre compte (e-mail / CNE).
              </p>
            ) : null}
          </div>
        </div>
      </section>

      {editing ? <EditCard onDone={() => setEditing(false)} /> : null}

      {/* Indicateurs étudiant */}
      {isEtudiant && me ? (
        <section className={cn(softCard, "space-y-3 p-6")}>
          <p className={eyebrowClass}>Mes indicateurs</p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            <Stat
              icon={<Users2 className="h-4 w-4" />}
              label="Profs"
              value={me.enseignants?.length ?? 0}
            />
            <Stat
              icon={<ClipboardList className="h-4 w-4" />}
              label="Notes"
              value={me.notes?.length ?? 0}
            />
            <Stat
              icon={<FileText className="h-4 w-4" />}
              label="Bulletins"
              value={me.bulletins?.length ?? 0}
            />
            <Stat
              icon={<Briefcase className="h-4 w-4" />}
              label="Stages"
              value={me.stages?.length ?? 0}
            />
            <Stat
              icon={<Wallet className="h-4 w-4" />}
              label="Paiements"
              value={me.paiements?.length ?? 0}
            />
            <Stat
              icon={<CalendarCheck className="h-4 w-4" />}
              label="Assiduité"
              value={me.presence ? `${Math.round(me.presence.taux)}%` : "—"}
            />
          </div>
        </section>
      ) : null}
    </div>
  );
}

export const Route = createFileRoute("/dashboard/mon-profil")({
  component: MonProfilPage,
});
