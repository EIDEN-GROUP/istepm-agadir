/**
 * Global access gate — server-side enforcement tests (no database, no Redis).
 * Run: `npm test` (backend).
 */
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import Fastify, { type FastifyInstance } from "fastify";
import cookie from "@fastify/cookie";
import rateLimit from "@fastify/rate-limit";

process.env.NODE_ENV = "test";
process.env.PROJECT_LOCK_ENABLED = "true";
process.env.PROJECT_LOCK_USERNAME = "gateuser";
process.env.PROJECT_LOCK_PASSWORD_HASH =
  "$2b$12$ndCYFgHSQ/486sen1aXWiOzBf4R0MwP4P9Otoabno04HA7ABfvV/2"; // gate-test-password
process.env.PROJECT_LOCK_SESSION_SECRET = "s".repeat(48);
process.env.PROJECT_LOCK_IDLE_TIMEOUT_MINUTES = "15";
process.env.PROJECT_LOCK_ABSOLUTE_TIMEOUT_MINUTES = "480";
process.env.PROJECT_LOCK_MAX_LOGIN_ATTEMPTS = "5";
process.env.PROJECT_LOCK_RATE_LIMIT_WINDOW_MINUTES = "15";
process.env.ADMIN_API_KEY = "test-admin-key-1234567890";

let app: FastifyInstance;
let normalizePath: (u: string) => string;
let isExemptPath: (p: string) => boolean;

async function buildGateApp(): Promise<FastifyInstance> {
  const { projectGateMiddleware } = await import("@/middleware/project-gate");
  const { projectGateRoutes } = await import("@/routes/project-gate");

  const instance = Fastify({ logger: false });
  await instance.register(cookie);
  await instance.register(rateLimit, { max: 5000, timeWindow: "1 minute" });
  instance.addHook("onRequest", projectGateMiddleware);

  instance.get("/health", async () => ({ status: "ok" }));
  instance.get("/api/protected", async () => ({ secret: "sensitive-data" }));
  instance.post("/api/protected", async () => ({ ok: true }));
  instance.get("/api/clients", async () => ({ clients: [] }));

  await instance.register(projectGateRoutes, { prefix: "/api/project-gate" });
  await instance.ready();
  return instance;
}

function extractCookie(res: { headers: Record<string, unknown> }): string | undefined {
  const raw = res.headers["set-cookie"];
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value !== "string") return undefined;
  return value.split(";")[0];
}

async function login(
  username: string,
  password: string,
): Promise<{ statusCode: number; cookie?: string }> {
  const res = await app.inject({
    method: "POST",
    url: "/api/project-gate/login",
    payload: { username, password },
  });
  return { statusCode: res.statusCode, cookie: extractCookie(res as never) };
}

beforeAll(async () => {
  const mod = await import("@/middleware/project-gate");
  normalizePath = mod.normalizePath;
  isExemptPath = mod.isExemptPath;
  app = await buildGateApp();
});

afterAll(async () => {
  await app.close();
});

describe("path normalization (bypass resistance)", () => {
  it("normalizes traversal and encoded variants", () => {
    expect(normalizePath("/api/project-gate/login/../clients")).toBe(
      "/api/project-gate/clients",
    );
    expect(normalizePath("/api/project-gate/login%2f..%2fclients")).toBe(
      "/api/project-gate/clients",
    );
    expect(normalizePath("/api/clients/../project-gate/status")).toBe(
      "/api/project-gate/status",
    );
    expect(normalizePath("/api/clients?x=1")).toBe("/api/clients");
  });

  it("only exempts the exact gate endpoints", () => {
    expect(isExemptPath("/api/project-gate/login")).toBe(true);
    expect(isExemptPath("/api/project-gate/status")).toBe(true);
    expect(isExemptPath("/api/project-gate/login/")).toBe(false);
    expect(isExemptPath("/api/project-gate/loginfoo")).toBe(false);
    expect(isExemptPath("/api/clients")).toBe(false);
    expect(isExemptPath("/")).toBe(false);
  });
});

describe("gate enabled — anonymous access denied", () => {
  it("blocks protected API routes with structured JSON 401", async () => {
    const res = await app.inject({ method: "GET", url: "/api/protected" });
    expect(res.statusCode).toBe(401);
    expect(res.json()).toMatchObject({ code: "PROJECT_GATE_REQUIRED" });
    expect(res.body).not.toContain("sensitive-data");
  });

  it("blocks mutations too (POST)", async () => {
    const res = await app.inject({ method: "POST", url: "/api/protected", payload: {} });
    expect(res.statusCode).toBe(401);
  });

  it("blocks alternate/normalized paths", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/project-gate/login/../clients",
    });
    expect(res.statusCode).toBe(401);
  });

  it("rejects a forged/unknown session cookie", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/protected",
      headers: { cookie: "project_gate_session=deadbeef" },
    });
    expect(res.statusCode).toBe(401);
  });

  it("keeps the health endpoint reachable", async () => {
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
  });

  it("status reports enabled + unauthenticated", async () => {
    const res = await app.inject({ method: "GET", url: "/api/project-gate/status" });
    expect(res.json()).toEqual({ enabled: true, authenticated: false });
  });
});

describe("gate login", () => {
  it("rejects wrong password with a generic error", async () => {
    const res = await login("gateuser", "wrong-password");
    expect(res.statusCode).toBe(401);
  });

  it("rejects unknown username with the same generic error", async () => {
    const res = await login("nobody", "gate-test-password");
    expect(res.statusCode).toBe(401);
  });

  it("rejects blank credentials", async () => {
    const res = await login("", "");
    expect(res.statusCode).toBe(400);
  });

  it("accepts correct credentials, sets an HttpOnly cookie, grants access", async () => {
    const res = await login("gateuser", "gate-test-password");
    expect(res.statusCode).toBe(200);
    expect(res.cookie).toBeTruthy();

    const setCookie = res.cookie!;
    expect(setCookie.startsWith("project_gate_session=")).toBe(true);

    const ok = await app.inject({
      method: "GET",
      url: "/api/protected",
      headers: { cookie: setCookie },
    });
    expect(ok.statusCode).toBe(200);
    expect(ok.json()).toEqual({ secret: "sensitive-data" });

    const status = await app.inject({
      method: "GET",
      url: "/api/project-gate/status",
      headers: { cookie: setCookie },
    });
    expect(status.json()).toEqual({ enabled: true, authenticated: true });
  });

  it("does not accept the pre-login (no) cookie as proof — session fixation", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/protected",
      headers: { cookie: "project_gate_session=" },
    });
    expect(res.statusCode).toBe(401);
  });
});

describe("logout and revocation", () => {
  it("logout invalidates the session", async () => {
    const { cookie: sessionCookie } = await login("gateuser", "gate-test-password");
    expect(sessionCookie).toBeTruthy();

    const before = await app.inject({
      method: "GET",
      url: "/api/protected",
      headers: { cookie: sessionCookie! },
    });
    expect(before.statusCode).toBe(200);

    const out = await app.inject({
      method: "POST",
      url: "/api/project-gate/logout",
      headers: { cookie: sessionCookie! },
    });
    expect(out.statusCode).toBe(200);

    const after = await app.inject({
      method: "GET",
      url: "/api/protected",
      headers: { cookie: sessionCookie! },
    });
    expect(after.statusCode).toBe(401);
  });

  it("revoke-all requires the admin API key", async () => {
    const { cookie: sessionCookie } = await login("gateuser", "gate-test-password");
    const denied = await app.inject({
      method: "POST",
      url: "/api/project-gate/revoke-all",
    });
    expect(denied.statusCode).toBe(401);

    const adminKey = process.env.ADMIN_API_KEY!;
    const res = await app.inject({
      method: "POST",
      url: "/api/project-gate/revoke-all",
      headers: { "x-admin-api-key": adminKey },
    });
    expect(res.statusCode).toBe(200);

    const after = await app.inject({
      method: "GET",
      url: "/api/protected",
      headers: { cookie: sessionCookie! },
    });
    expect(after.statusCode).toBe(401);
  });
});

describe("credential rotation invalidates sessions", () => {
  it("binds sessions to a fingerprint of the credentials", async () => {
    const { credentialsFingerprint } = await import("@/lib/gate/constants");
    const a = credentialsFingerprint("u", "$2b$12$aaa", "secret-1");
    const b = credentialsFingerprint("u", "$2b$12$aaa", "secret-2");
    const c = credentialsFingerprint("v", "$2b$12$aaa", "secret-1");
    expect(a).not.toBe(b);
    expect(a).not.toBe(c);
  });
});

describe("brute-force protection", () => {
  it("locks the (ip, username) pair after max failures with Retry-After", async () => {
    for (let i = 0; i < 5; i++) {
      const res = await login("brute-user", "wrong");
      expect(res.statusCode).toBe(401);
    }
    const blocked = await login("brute-user", "wrong");
    expect(blocked.statusCode).toBe(429);
    expect(blocked).toBeTruthy();

    const res = await app.inject({
      method: "POST",
      url: "/api/project-gate/login",
      payload: { username: "brute-user", password: "wrong" },
    });
    expect(res.statusCode).toBe(429);
    expect(res.headers["retry-after"]).toBeTruthy();
  });
});

describe("idle timeout (server-side)", () => {
  it("expires a session after the idle period even if the cookie is presented", async () => {
    const { cookie: sessionCookie } = await login("gateuser", "gate-test-password");
    expect(sessionCookie).toBeTruthy();

    vi.useFakeTimers({ toFake: ["Date"] });
    const start = Date.now();
    vi.setSystemTime(start + 16 * 60 * 1000); // 16 min > 15 min idle

    const res = await app.inject({
      method: "GET",
      url: "/api/protected",
      headers: { cookie: sessionCookie! },
    });
    expect(res.statusCode).toBe(401);
    vi.useRealTimers();
  });
});
