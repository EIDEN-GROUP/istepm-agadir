import { useState } from "react";
import { initials } from "@/lib/dash-ui";
import { cn } from "@/lib/utils";

type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";

const SIZES: Record<AvatarSize, string> = {
  xs: "h-7 w-7 text-[10px]",
  sm: "h-9 w-9 text-[11px]",
  md: "h-11 w-11 text-xs",
  lg: "h-16 w-16 text-base",
  xl: "h-24 w-24 text-2xl",
};

/**
 * Photo d'identité partagée — rendu identique partout où une personne est
 * listée (étudiants, stages, bulletins, paiements, tableau de bord…).
 *
 * Si `photoUrl` est fourni, la photo est affichée ; sinon on retombe sur les
 * initiales en pastille teal. Une photo d'étudiant téléversée depuis son espace
 * est stockée sur sa fiche (`etudiants.photo_url`) et se propage donc
 * automatiquement à tous ces écrans via l'API.
 */
export function PersonAvatar({
  name,
  photoUrl,
  size = "sm",
  className,
  ring = true,
}: {
  name: string;
  photoUrl?: string | null;
  size?: AvatarSize;
  className?: string;
  ring?: boolean;
}) {
  const [broken, setBroken] = useState(false);
  const url = (photoUrl ?? "").trim();
  // Schémas autorisés uniquement : https, data:image (jpeg/png/webp) et blob.
  // Le reste (javascript:, data:text/html, …) retombe sur les initiales.
  const showPhoto =
    url !== "" &&
    !broken &&
    (/^https:\/\//i.test(url) ||
      /^data:image\/(png|jpeg|webp);base64,/i.test(url) ||
      /^blob:/i.test(url));

  const base = cn(
    SIZES[size],
    "shrink-0 overflow-hidden rounded-full",
    ring && "ring-1 ring-inset ring-brand/15",
    className,
  );

  if (showPhoto) {
    return (
      <img
        src={url}
        alt={name}
        loading="lazy"
        onError={() => setBroken(true)}
        className={cn(base, "object-cover")}
      />
    );
  }

  return (
    <span
      className={cn(
        base,
        "grid place-items-center bg-gradient-to-br from-brand/20 to-brand/10 font-bold text-brand-dk",
      )}
      aria-hidden
    >
      {initials(name || "?")}
    </span>
  );
}
