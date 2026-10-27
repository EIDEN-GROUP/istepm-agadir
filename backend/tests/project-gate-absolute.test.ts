/**
 * Global access gate — absolute timeout (server-side), independent of idle.
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
process.env.PROJECT_LOCK_SESSION_SECRET = "z".repeat(48);
// Idle is effectively disabled so only the absolute timeout can fire.
process.env.PROJECT_LOCK_IDLE_TIMEOUT_MINUTES = "1000";
process.env.PROJECT_LOCK_ABSOLUTE_TIMEOUT_MINUTES = "1";
process.env.PROJECT_LOCK_MAX_LOGIN_ATTEMPTS = "5";
process.env.PROJECT_LOCK_RATE_LIMIT_WINDOW_MINUTES = "15";

let app: FastifyInstance;

function extractCookie(res: { headers: Record<string, unknown> }): string | undefined {
  const raw = res.headers["set-cookie"];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return typeof value === "string" ? value.split(";")[0] : undefined;
}

beforeAll(async () => {
  const { projectGateMiddleware } = await import("@/middleware/project-gate");
  const { projectGateRoutes } = await import("@/routes/project-gate");

  app = Fastify({ logger: false });
  await app.register(cookie);
  await app.register(rateLimit, { max: 5000, timeWindow: "1 minute" });
  app.addHook("onRequest", projectGateMiddleware);
  app.get("/api/protected", async () => ({ ok: true }));
  await app.register(projectGateRoutes, { prefix: "/api/project-gate" });
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

describe("absolute timeout (server-side)", () => {
  it("denies access after the absolute lifetime even with recent activity", async () => {
    const login = await app.inject({
      method: "POST",
      url: "/api/project-gate/login",
      payload: { username: "gateuser", password: "gate-test-password" },
    });
    const sessionCookie = extractCookie(login as never)!;
    expect(sessionCookie).toBeTruthy();

    vi.useFakeTimers({ toFake: ["Date"] });
    const start = Date.now();

    // Activity well inside idle: allowed.
    vi.setSystemTime(start + 30 * 1000);
    const early = await app.inject({
      method: "GET",
      url: "/api/protected",
      headers: { cookie: sessionCookie },
    });
    expect(early.statusCode).toBe(200);

    // Past the 1-minute absolute lifetime, despite the recent request above.
    vi.setSystemTime(start + 61 * 1000);
    const late = await app.inject({
      method: "GET",
      url: "/api/protected",
      headers: { cookie: sessionCookie },
    });
    expect(late.statusCode).toBe(401);

    vi.useRealTimers();
  });
});
