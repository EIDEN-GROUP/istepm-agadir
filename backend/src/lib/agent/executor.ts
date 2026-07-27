import type { FastifyInstance } from "fastify";
import ACTIONS from "./actions";

export interface ExecuteParams {
  actionName: string;
  params: Record<string, unknown>;
  userToken: string;
  userRole: string;
}

export async function executeAction(
  app: FastifyInstance,
  { actionName, params, userToken, userRole }: ExecuteParams,
): Promise<unknown> {
  const action = ACTIONS.find((a) => a.name === actionName);
  if (!action) {
    throw new Error(`Action inconnue: ${actionName}`);
  }

  if (action.requiredRoles.length > 0 && !action.requiredRoles.includes(userRole)) {
    throw new Error(
      `Accès refusé : l'action "${actionName}" requiert le rôle ${action.requiredRoles.join(" ou ")}`,
    );
  }

  let path = action.path;
  for (const [key, val] of Object.entries(params)) {
    if (path.includes(`:${key}`)) {
      path = path.replace(`:${key}`, String(val));
    }
  }

  const bodyParams: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(params)) {
    if (!path.includes(`:${key}`)) {
      bodyParams[key] = val;
    }
  }

  const injectPayload: Record<string, unknown> = {
    method: action.method as "GET" | "POST" | "PUT" | "DELETE",
    url: path,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${userToken}`,
    },
  };

  if (action.method !== "GET" && Object.keys(bodyParams).length > 0) {
    injectPayload.body = JSON.stringify(bodyParams);
  }

  const res = await app.inject(injectPayload);

  if (res.statusCode >= 400) {
    let errorMsg: string;
    try {
      const parsed = JSON.parse(res.body);
      errorMsg = parsed.error || res.body;
    } catch {
      errorMsg = res.body;
    }
    throw new Error(errorMsg);
  }

  if (res.statusCode === 204 || !res.body) return null;
  return JSON.parse(res.body);
}

export async function executeBatch(
  app: FastifyInstance,
  paramsList: ExecuteParams[],
): Promise<{ results: unknown[]; failedAt: number | null; error?: string }> {
  const results: unknown[] = [];
  for (let i = 0; i < paramsList.length; i++) {
    try {
      const result = await executeAction(app, paramsList[i]);
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
