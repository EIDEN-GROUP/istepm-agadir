import { getStoredToken } from "@/lib/auth";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000/api";

/** Base URL accessor for call sites that can't use the fetch wrapper (SSE streams). */
export function getApiBaseUrl() {
  return API_BASE;
}

type RequestOptions = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  params?: Record<string, string | undefined>;
};

const FETCH_TIMEOUT = 30000;

/** Erreur API avec statut HTTP (permet de distinguer 404/409/429…). */
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

let kickEnCours = false;

/** Réarme l'expulsion (après une reconnexion réussie). */
export function resetKickSession() {
  kickEnCours = false;
}

/**
 * Session expirée ou révoquée : purge les clés locales UNE fois puis renvoie
 * vers /login (jamais de boucle : le stockage vidé, `beforeLoad` n'y
 * reconduit plus). Sans jeton envoyé, simple 401 sans redirection.
 */
export function kickSessionExpiree(avaiUnJeton: boolean) {
  if (typeof window === "undefined" || !avaiUnJeton) return;
  if (window.location.pathname === "/login" || kickEnCours) return;
  kickEnCours = true;
  try {
    const condamnees: string[] = [];
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith("istpm-")) condamnees.push(k);
    }
    for (const k of condamnees) window.localStorage.removeItem(k);
  } catch {
    /* stockage indisponible */
  }
  window.location.assign("/login?expired=1");
}

async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const token = getStoredToken();
  const url = `${API_BASE}${path}`;
  const queryParams = options.params
    ? "?" +
      new URLSearchParams(
        Object.entries(options.params).filter(([_, v]) => v !== undefined) as [
          string,
          string,
        ][],
      ).toString()
    : "";

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  let res: Response;
  try {
    res = await fetch(`${url}${queryParams}`, {
      method: options.method ?? "GET",
      headers: {
        // Content-Type uniquement quand il y a un corps : Fastify rejette
        // ("Body cannot be empty...") un POST JSON sans contenu (ex. marquer
        // une notification comme lue/effacée).
        ...(options.body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeout);
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("La requête a pris trop de temps. Vérifiez que le serveur est accessible.");
    }
    throw new Error("Impossible de contacter le serveur. Vérifiez votre connexion.");
  } finally {
    clearTimeout(timeout);
  }

  if (res.status === 401) {
    kickSessionExpiree(!!token);
    throw new ApiError("Non authentifié", 401);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  const data = await res.json();

  if (!res.ok) {
    throw new ApiError(data.error ?? `Erreur ${res.status}`, res.status);
  }

  return data as T;
}

export const api = {
  get: <T>(path: string, params?: Record<string, string | undefined>) =>
    request<T>(path, { params }),

  post: <T>(path: string, body?: unknown, params?: Record<string, string | undefined>) =>
    request<T>(path, { method: "POST", body, params }),

  put: <T>(path: string, body?: unknown, params?: Record<string, string | undefined>) =>
    request<T>(path, { method: "PUT", body, params }),

  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PATCH", body }),

  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
