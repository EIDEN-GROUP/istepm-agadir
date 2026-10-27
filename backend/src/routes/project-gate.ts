import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import bcrypt from "bcrypt";
import { getEnv } from "@/config/env";
import {
  credentialsFingerprint,
  GATE_COOKIE_NAME,
  hashRateKey,
} from "@/lib/gate/constants";
import {
  clearRate,
  createGateSession,
  destroyAllGateSessions,
  destroyGateSession,
  getRateBlock,
  registerFailedAttempt,
} from "@/lib/gate/store";
import {
  checkGateSession,
  clientIp,
  parseGateCookie,
} from "@/middleware/project-gate";

/** Valid bcrypt hash of a random throwaway value; equalizes timing on unknown users. */
const DUMMY_HASH =
  "$2b$12$Fv7yAhsTIkgXxW1JV7uACeFfWIpfrPLIPqDTSWsyhjkWhXTzOhysa";

function sameOrigin(request: FastifyRequest): boolean {
  const origin = request.headers.origin;
  if (!origin) return true; // non-browser / same-origin form posts
  const env = getEnv();
  const allowed = env.CORS_ORIGIN.split(",").map((s) => s.trim());
  if (allowed.includes(origin)) return true;
  // Host match fallback for same-origin browser requests.
  const host = request.headers.host;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export async function projectGateRoutes(app: FastifyInstance) {
  const env = getEnv();

  // Public status (used by the gate screen to know whether to redirect).
  app.get("/status", async (request) => {
    if (!env.PROJECT_LOCK_ENABLED) return { enabled: false, authenticated: false };
    const result = await checkGateSession(request);
    return {
      enabled: true,
      authenticated: result.ok,
    };
  });

  // Internal endpoint used by nginx auth_request. Must be cheap and resilient:
  // it is intentionally given a high per-route limit (every static asset
  // triggers one subrequest), while still being bounded per IP.
  app.get(
    "/verify",
    {
      config: { rateLimit: { max: 3000, timeWindow: "1 minute" } },
    },
    async (request, reply) => {
      if (!env.PROJECT_LOCK_ENABLED) return reply.status(204).send();
      const result = await checkGateSession(request);
      if (!result.ok) {
        // Always 401 (never 503): nginx maps 401 to the gate screen, while a
        // 5xx from an auth_request subrequest surfaces as an opaque 500.
        // Failing closed to the gate is the safe behavior on store outages.
        return reply.status(401).send({ error: "unauthorized" });
      }
      return reply.status(204).send();
    },
  );

  app.post("/login", async (request, reply) => {
    if (!env.PROJECT_LOCK_ENABLED) {
      return { success: true };
    }
    if (!sameOrigin(request)) {
      return reply.status(403).send({ error: "Origine non autorisée" });
    }

    const body = (request.body ?? {}) as {
      username?: unknown;
      password?: unknown;
    };
    const username = typeof body.username === "string" ? body.username.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!username || !password) {
      return reply.status(400).send({ error: "Identifiants invalides" });
    }

    const ip = clientIp(request);
    const rateKey = hashRateKey(`${ip}:${username}`);

    try {
      const blockedFor = await getRateBlock(rateKey);
      if (blockedFor !== null) {
        return reply
          .status(429)
          .header("Retry-After", String(blockedFor))
          .send({ error: "Trop de tentatives. Réessayez plus tard.", retryAfter: blockedFor });
      }

      const usernameOk = username === env.PROJECT_LOCK_USERNAME;
      let passwordOk = false;
      try {
        passwordOk = await bcrypt.compare(
          password,
          usernameOk ? env.PROJECT_LOCK_PASSWORD_HASH : DUMMY_HASH,
        );
      } catch {
        passwordOk = false;
      }

      if (!usernameOk || !passwordOk) {
        await registerFailedAttempt(
          rateKey,
          env.PROJECT_LOCK_MAX_LOGIN_ATTEMPTS,
          env.PROJECT_LOCK_RATE_LIMIT_WINDOW_MINUTES,
        );
        request.log.warn(
          { event: "gate_login_failed", ip, usernameLength: username.length },
          "project gate login failed",
        );
        return reply.status(401).send({ error: "Identifiants invalides" });
      }

      await clearRate(rateKey);

      const fingerprint = credentialsFingerprint(
        env.PROJECT_LOCK_USERNAME,
        env.PROJECT_LOCK_PASSWORD_HASH,
        env.PROJECT_LOCK_SESSION_SECRET,
      );
      const { id } = await createGateSession(
        username,
        fingerprint,
        ip,
        env.PROJECT_LOCK_ABSOLUTE_TIMEOUT_MINUTES,
      );

      reply.setCookie(GATE_COOKIE_NAME, id, {
        path: "/",
        httpOnly: true,
        secure: env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: env.PROJECT_LOCK_ABSOLUTE_TIMEOUT_MINUTES * 60,
      });

      request.log.info({ event: "gate_login_success", ip }, "project gate login");
      return { success: true };
    } catch (err) {
      request.log.error({ err, event: "gate_login_error" }, "project gate error");
      return reply.status(503).send({ error: "Service temporairement indisponible" });
    }
  });

  app.post("/logout", async (request, reply) => {
    if (!sameOrigin(request)) {
      return reply.status(403).send({ error: "Origine non autorisée" });
    }
    const sessionId = parseGateCookie(request);
    if (sessionId) {
      try {
        await destroyGateSession(sessionId);
      } catch {
        /* best effort */
      }
    }
    reply.clearCookie(GATE_COOKIE_NAME, { path: "/" });
    return { success: true };
  });

  // Emergency revocation: requires the existing admin API key (never public).
  app.post("/revoke-all", async (request, reply) => {
    const key = request.headers["x-admin-api-key"];
    if (typeof key !== "string" || key !== env.ADMIN_API_KEY) {
      return reply.status(401).send({ error: "Non autorisé" });
    }
    const removed = await destroyAllGateSessions();
    request.log.warn({ event: "gate_sessions_revoked", removed }, "gate sessions revoked");
    return { success: true, revoked: removed };
  });
}
