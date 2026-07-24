import { getEnv } from "@/config/env";
import ACTIONS from "./actions";

export interface ExecuteParams {
  actionName: string;
  params: Record<string, unknown>;
  userToken: string;
}

export async function executeAction({
  actionName,
  params,
  userToken,
}: ExecuteParams): Promise<unknown> {
  const action = ACTIONS.find((a) => a.name === actionName);
  if (!action) {
    throw new Error(`Action inconnue: ${actionName}`);
  }

  let path = action.path;
  for (const [key, val] of Object.entries(params)) {
    if (path.includes(`:${key}`)) {
      path = path.replace(`:${key}`, String(val));
    }
  }

  const env = getEnv();
  const baseUrl = `http://localhost:${env.PORT || 3000}`;
  const url = `${baseUrl}${path}`;

  const bodyParams: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(params)) {
    if (!path.includes(`:${key}`)) {
      bodyParams[key] = val;
    }
  }

  const fetchOptions: RequestInit = {
    method: action.method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${userToken}`,
    },
  };

  if (action.method !== "GET" && Object.keys(bodyParams).length > 0) {
    fetchOptions.body = JSON.stringify(bodyParams);
  }

  const res = await fetch(url, fetchOptions);

  if (!res.ok) {
    const errorBody = await res.text();
    let errorMsg: string;
    try {
      const parsed = JSON.parse(errorBody);
      errorMsg = parsed.error || errorBody;
    } catch {
      errorMsg = errorBody;
    }
    throw new Error(`Erreur ${res.status}: ${errorMsg}`);
  }

  if (res.status === 204) return null;
  return res.json();
}

export async function executeBatch(
  paramsList: ExecuteParams[],
): Promise<{ results: unknown[]; failedAt: number | null; error?: string }> {
  const results: unknown[] = [];
  for (let i = 0; i < paramsList.length; i++) {
    try {
      const result = await executeAction(paramsList[i]);
      results.push(result);
    } catch (err) {
      return {
        results,
        failedAt: i,
        error: err instanceof Error ? err.message : "Erreur inconnue",
      };
    }
  }
  return { results, failedAt: null };
}
