const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000/api";

type RequestOptions = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  params?: Record<string, string | undefined>;
};

function getToken(): string | null {
  return localStorage.getItem("school_crm_token");
}

function setToken(token: string) {
  localStorage.setItem("school_crm_token", token);
}

function clearToken() {
  localStorage.removeItem("school_crm_token");
}

async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const token = getToken();
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

  const res = await fetch(`${url}${queryParams}`, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (res.status === 401) {
    clearToken();
    window.location.href = "/login";
    throw new Error("Non authentifié");
  }

  if (res.status === 204) {
    return undefined as T;
  }

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error ?? `Erreur ${res.status}`);
  }

  return data as T;
}

export const api = {
  get: <T>(path: string, params?: Record<string, string | undefined>) =>
    request<T>(path, { params }),

  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body }),

  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PUT", body }),

  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),

  // Auth-specific helpers
  getToken,
  setToken,
  clearToken,
};
