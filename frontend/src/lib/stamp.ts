/**
 * Cachet / tampon officiel de l'établissement.
 *
 * Source unique : la base (`settings.stamp_image`, via l'API) — aucun
 * localStorage. Le cachet est chargé depuis le serveur (`useStamp`, cache
 * React Query partagé) et persisté via (`saveStampImage` / `clearStampImage`),
 * donc identique sur tous les postes. Il est apposé sur tous les documents
 * PDF générés — bulletins, conventions, rapports de stage et reçus.
 *
 * Le cachet est redimensionné à l'upload (max 600 px) et conservé en PNG afin
 * de préserver la transparence pour l'aperçu et le bulletin HTML.
 */
import { useQuery } from "@tanstack/react-query";
import { fetchSettings, updateSetting } from "@/lib/istpm-api";

/** Lit le cachet depuis le serveur (`null` si aucun téléversé). */
export async function fetchStampImage(): Promise<string | null> {
  const data = await fetchSettings();
  const v = data.stamp_image;
  return typeof v === "string" && v ? v : null;
}

/** Hook réactif : renvoie le cachet serveur (`null` en chargement/absent). */
export function useStamp(): string | null {
  const q = useQuery({
    queryKey: ["stamp"],
    queryFn: fetchStampImage,
    retry: false,
    staleTime: 5 * 60_000,
  });
  return q.data ?? null;
}

/** Persiste le cachet côté serveur (puis rafraîchit via `invalidateStamp`). */
export function saveStampImage(dataUrl: string) {
  return updateSetting("stamp_image", dataUrl);
}

/**
 * Efface le cachet côté serveur.
 * `settings.value` est `jsonb NOT NULL` : on écrit une chaîne vide plutôt
 * qu'un `null` que la colonne refuserait.
 */
export function clearStampImage() {
  return updateSetting("stamp_image", "");
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image load failed"));
    img.src = src;
  });
}

/**
 * Lit un fichier image, le redimensionne (côté le plus long ≤ `maxDim`) et
 * renvoie une data URL PNG prête à être envoyée au serveur comme cachet.
 */
export async function prepareStampFromFile(
  file: File,
  maxDim = 600,
): Promise<string> {
  const raw: string = await new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error("read failed"));
    r.readAsDataURL(file);
  });

  const img = await loadImage(raw);
  const ratio = Math.min(1, maxDim / Math.max(img.width, img.height || 1));
  const w = Math.max(1, Math.round(img.width * ratio));
  const h = Math.max(1, Math.round(img.height * ratio));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return raw;
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL("image/png");
}
