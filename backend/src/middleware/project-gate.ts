import type { FastifyRequest, FastifyReply } from "fastify";
import path from "node:path";
import { getEnv } from "@/config/env";
import { credentialsFingerprint, GATE_COOKIE_NAME } from "@/lib/gate/constants";
import { getGateSession, touchGateSession } from "@/lib/gate/store";

/**
 * Paths that must stay reachable for the gate itself to work. Everything else
 * is denied by default. Keep this list as small as possible.
 */
const EXEMPT_PATHS = new Set([
  "/api/project-gate/login",
  "/api/project-gate/status",
  "/api/project-gate/logout",
  "/api/project-gate/verify",
  "/api/project-gate/revoke-all", // protected by ADMIN_API_KEY inside the route
  "/health",
]);

/** Normalize the request path so equivalent representations can't bypass. */
export function normalizePath(rawUrl: string): string {
  const rawPath = rawUrl.split("?")[0].split("#")[0];
  let decoded: string;
  try {
    decoded = decodeURIComponent(rawPath);
  } catch {
    decoded = rawPath;
  }
  // Reject embedded NUL and backslashes outright.
  if (decoded.includes("\0") || decoded.includes("\\")) return "";
  const normalized = path.posix.normalize(decoded);
  return normalized.startsWith("/") ? normalized : `/${normalized}`;
}

export function isExemptPath(normalizedPath: string): boolean {
  return EXEMPT_PATHS.has(normalizedPath);
}

export function parseGateCookie(request: FastifyRequest): string | undefined {
  const cookieHeader = request.headers.cookie;
  if (!cookieHeader) return undefined;
  for (const part of cookieHeader.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const name = part.slice(0, idx).trim();
    if (name === GATE_COOKIE_NAME) {
      const value = part.slice(idx + 1).trim();
      try {
        return decodeURIComponent(value);
      } catch {
        return undefined;
      }
    }
  }
  return undefined;
}

export function clientIp(request: FastifyRequest): string {
  // eiden-nginx overwrites X-Real-IP with $remote_addr (not spoofable at TCP),
  // while X-Forwarded-For is client-appended and therefore untrusted.
  const real = request.headers["x-real-ip"];
  if (typeof real === "string" && real.trim()) return real.split(",")[0].trim();
  return request.ip;
}

export interface GateCheckResult {
  ok: boolean;
  reason?: "no-session" | "invalid-session" | "expired" | "fingerprint" | "unavailable";
}

/** Verify the gate session for the current request without mutating it. */
export async function checkGateSession(
  request: FastifyRequest,
): Promise<GateCheckResult> {
  const env = getEnv();
  const sessionId = parseGateCookie(request);
  if (!sessionId) return { ok: false, reason: "no-session" };

  let session;
  try {
    session = await getGateSession(sessionId);
  } catch {
    return { ok: false, reason: "unavailable" };
  }
  if (!session) return { ok: false, reason: "invalid-session" };

  const expectedFp = credentialsFingerprint(
    env.PROJECT_LOCK_USERNAME,
    env.PROJECT_LOCK_PASSWORD_HASH,
    env.PROJECT_LOCK_SESSION_SECRET,
  );
  if (session.fingerprint !== expectedFp) {
    return { ok: false, reason: "fingerprint" };
  }

  const now = Date.now();
  const idleMs = env.PROJECT_LOCK_IDLE_TIMEOUT_MINUTES * 60 * 1000;
  const absMs = env.PROJECT_LOCK_ABSOLUTE_TIMEOUT_MINUTES * 60 * 1000;
  if (now - session.lastActivity > idleMs || now - session.createdAt > absMs) {
    return { ok: false, reason: "expired" };
  }
  return { ok: true };
}

function deny(reply: FastifyReply, reason: GateCheckResult["reason"]) {
  const unavailable = reason === "unavailable";
  return reply.status(unavailable ? 503 : 401).send({
    error: unavailable
      ? "Service temporairement indisponible"
      : "Accès verrouillé - authentification requise",
    code: "PROJECT_GATE_REQUIRED",
  });
}

/**
 * Global onRequest hook: the first server-side gate for every backend route
 * (including direct backend access, bypassing the frontend proxy).
 */
export async function projectGateMiddleware(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const env = getEnv();
  if (!env.PROJECT_LOCK_ENABLED) return;

  const normalized = normalizePath(request.url);
  if (!normalized) return deny(reply, "no-session");
  if (isExemptPath(normalized)) return;

  const result = await checkGateSession(request);
  if (!result.ok) return deny(reply, result.reason);

  const sessionId = parseGateCookie(request)!;
  try {
    const session = await getGateSession(sessionId);
    if (session) {
      await touchGateSession(
        sessionId,
        session,
        env.PROJECT_LOCK_ABSOLUTE_TIMEOUT_MINUTES,
      );
    }
  } catch {
    return deny(reply, "unavailable");
  }
}
