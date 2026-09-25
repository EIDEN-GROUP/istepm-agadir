/**
 * API « Demande d’inscription » de l’ISTEPM (contrat du backend) :
 * GET /api/inscriptions/filieres (liste officielle des filières),
 * GET /api/inscriptions/niveaux (liste officielle des niveaux d'études,
 * éditable dans Paramètres › NIVEAUX D'ETUDES) et POST /api/inscriptions
 * (la demande). Le serveur envoie les e-mails et range la demande dans le
 * tableau de bord : ici, on collecte et on envoie.
 * L’origine de la landing doit être autorisée en CORS côté serveur, sinon le navigateur bloque les appels.
 * En production la landing est servie sur le même domaine que l'API
 * (origine relative) : aucun blocage CORS.
 */
// En dev, chemin relatif : le proxy de Vite (vite.config.ts) relaie vers l’API, sans blocage CORS sur localhost.
// En prod, même origine (la landing et l'API partagent le domaine) : relatif aussi,
// sauf surcharge explicite via VITE_INSCRIPTIONS_API (prévisualisations Netlify/Vercel…).
const ORIGIN = (import.meta.env.VITE_INSCRIPTIONS_API || "").replace(/\/$/, "");
const API = `${ORIGIN}/api/inscriptions`;

/**
 * Liste de secours si l’API ne répond pas : copie de GET /filieres au 23/09/2026. Si le serveur la change,
 * une filière périmée est refusée (400) et l’erreur s’affiche ; mettre alors cette copie à jour.
 */
export const FALLBACK_FILIERES = [
  "Infirmier polyvalent",
  "Infirmier en anesthésie-réanimation",
  "Sage-femme",
  "Kinésithérapie",
  "Radiologie / Imagerie médicale",
  "Laboratoire / Biologie médicale",
  "Prothèse dentaire",
];

/**
 * Niveaux d'études de secours si l’API ne répond pas : copie exacte des
 * valeurs historiques du serveur (migration 0027, clé settings
 * `niveaux_etudes`). La liste officielle vient de GET /niveaux et se gère
 * dans Paramètres › NIVEAUX D'ETUDES, comme les filières.
 */
export const FALLBACK_NIVEAUX = [
  "Terminale (bac en cours)",
  "Baccalauréat obtenu",
  "Bac +1 / Bac +2",
  "Licence ou plus",
  "Autre",
];

/**
 * @deprecated La liste des niveaux vient désormais du serveur
 * (`fetchNiveaux()`, Paramètres › NIVEAUX D'ETUDES). Conservé pour
 * compatibilité : vaut `FALLBACK_NIVEAUX`.
 */
export const NIVEAUX = FALLBACK_NIVEAUX;

const FILIERES_CACHE_KEY = "istepm:filieres";
const NIVEAUX_CACHE_KEY = "istepm:niveaux";
const CACHE_TTL = 60 * 60 * 1000;

function readListCache(key: string): string[] | null {
  try {
    const cached = JSON.parse(localStorage.getItem(key) ?? "null");
    return cached && Date.now() - cached.at < CACHE_TTL && isList(cached.values) ? cached.values : null;
  } catch {
    return null;
  }
}

function writeListCache(key: string, values: string[]) {
  try {
    localStorage.setItem(key, JSON.stringify({ at: Date.now(), values }));
  } catch {
    // Stockage indisponible (navigation privée…) : pas de cache, rien de grave.
  }
}

/** Ancien cache `istepm:filieres` (forme `{ filieres }`) : relu une fois puis migré. */
function readCache(): string[] | null {
  try {
    const cached = JSON.parse(localStorage.getItem(FILIERES_CACHE_KEY) ?? "null");
    if (cached && Date.now() - cached.at < CACHE_TTL && isList(cached.filieres)) return cached.filieres;
  } catch {
    // Cache illisible : on réessaie via le réseau.
  }
  return readListCache(FILIERES_CACHE_KEY);
}

const isList = (v: unknown): v is string[] => Array.isArray(v) && v.length > 0 && v.every((f) => typeof f === "string");

/** Filières officielles (cache d’une heure) ; lève une erreur si l’API ne répond pas correctement. */
export async function fetchFilieres(): Promise<string[]> {
  const cached = readCache();
  if (cached) return cached;
  const r = await fetch(`${API}/filieres`, { signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const { filieres } = await r.json();
  if (!isList(filieres)) throw new Error("Réponse inattendue");
  writeListCache(FILIERES_CACHE_KEY, filieres);
  return filieres;
}

/** Niveaux d'études officiels (cache d’une heure) ; lève une erreur si l’API ne répond pas correctement. */
export async function fetchNiveaux(): Promise<string[]> {
  const cached = readListCache(NIVEAUX_CACHE_KEY);
  if (cached) return cached;
  const r = await fetch(`${API}/niveaux`, { signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const { niveaux } = await r.json();
  if (!isList(niveaux)) throw new Error("Réponse inattendue");
  writeListCache(NIVEAUX_CACHE_KEY, niveaux);
  return niveaux;
}

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** Retrouve dans la liste du serveur une formation nommée ailleurs sur la page (casse, accents, « (e) »…). */
export function matchFiliere(name: string, filieres: string[]): string | undefined {
  const n = norm(name);
  return filieres.find((f) => f === name) ?? filieres.find((f) => norm(f) === n) ?? filieres.find((f) => norm(f).startsWith(n));
}

/** Retrouve dans la liste du serveur un niveau d'études (casse, accents, « Bac +2 »…). */
export function matchNiveau(name: string, niveaux: string[]): string | undefined {
  const n = norm(name);
  return niveaux.find((f) => f === name) ?? niveaux.find((f) => norm(f) === n) ?? niveaux.find((f) => norm(f).startsWith(n));
}

export type Inscription = {
  prenom: string;
  nom: string;
  telephone: string;
  email: string;
  filiere: string;
  niveau: string;
  message?: string;
};

export type SubmitResult = { ok: true; id: string } | { ok: false; status: number; error: string };

/** Envoie la demande : 201 = enregistrée ; sinon le message du serveur (400), la limite horaire (429) ou un souci réseau. */
export async function submitInscription(data: Inscription): Promise<SubmitResult> {
  let r: Response;
  try {
    r = await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    return { ok: false, status: 0, error: "Connexion impossible. Vérifiez votre connexion internet puis réessayez." };
  }
  const body = await r.json().catch(() => ({}));
  if (r.status === 201) return { ok: true, id: String(body.id ?? "") };
  if (r.status === 429) {
    return { ok: false, status: 429, error: "Trop de demandes envoyées depuis cette connexion. Réessayez dans une heure." };
  }
  const error = typeof body.error === "string" && body.error.trim() ? body.error : "L’envoi a échoué. Réessayez dans un instant.";
  return { ok: false, status: r.status, error };
}
