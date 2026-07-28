/**
 * Cachet / tampon officiel de l'établissement.
 *
 * Le directeur téléverse une image (PNG/JPEG) depuis les Paramètres ; elle est
 * mémorisée localement (localStorage, cohérent avec le store « local-first »)
 * puis apposée sur tous les documents PDF générés — bulletins, conventions et
 * rapports de stage.
 *
 * Le cachet est redimensionné à l'upload (max 600 px) pour rester sous la
 * limite de stockage du navigateur, et conservé en PNG afin de préserver la
 * transparence pour l'aperçu et le bulletin HTML.
 */
import { useEffect, useState } from "react";

const STAMP_KEY = "istpm:stamp";
const EVT = "istpm:stamp-changed";

/** Cachet courant (data URL) ou `null` si aucun n'a été téléversé. */
export function getStamp(): string | null {
  try {
    return localStorage.getItem(STAMP_KEY);
  } catch {
    return null;
  }
}

/** Enregistre (ou efface, avec `null`) le cachet et notifie les abonnés. */
export function setStamp(dataUrl: string | null): void {
  try {
    if (dataUrl) localStorage.setItem(STAMP_KEY, dataUrl);
    else localStorage.removeItem(STAMP_KEY);
  } catch {
    /* quota dépassé ou navigation privée — on ignore silencieusement */
  }
  window.dispatchEvent(new CustomEvent(EVT));
}

/** Hook réactif : renvoie le cachet courant et se met à jour à chaque changement. */
export function useStamp(): string | null {
  const [stamp, setLocal] = useState<string | null>(() => getStamp());
  useEffect(() => {
    const sync = () => setLocal(getStamp());
    window.addEventListener(EVT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return stamp;
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
 * renvoie une data URL PNG prête à être stockée comme cachet.
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
