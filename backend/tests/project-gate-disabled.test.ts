/**
 * Global access gate — disabled mode must preserve normal behavior.
 * Run: `npm test` (backend).
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import Fastify, { type FastifyInstance } from "fastify";
import cookie from "@fastify/cookie";

process.env.NODE_ENV = "test";
process.env.PROJECT_LOCK_ENABLED = "false";
process.env.PROJECT_LOCK_USERNAME = "gateuser";
process.env.PROJECT_LOCK_PASSWORD_HASH =
  "$2b$12$ndCYFgHSQ/486sen1aXWiOzBf4R0MwP4P9Otoabno04HA7ABfvV/2";
process.env.PROJECT_LOCK_SESSION_SECRET = "s".repeat(48);

let app: FastifyInstance;

beforeAll(async () => {
  const { projectGateMiddleware } = await import("@/middleware/project-gate");
  const { projectGateRoutes } = await import("@/routes/project-gate");

  app = Fastify({ logger: false });
  await app.register(cookie);
  app.addHook("onRequest", projectGateMiddleware);
  app.get("/api/protected", async () => ({ secret: "sensitive-data" }));
  app.get("/health", async () => ({ status: "ok" }));
  await app.register(projectGateRoutes, { prefix: "/api/project-gate" });
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

describe("gate disabled", () => {
  it("serves protected routes without a gate session", async () => {
    const res = await app.inject({ method: "GET", url: "/api/protected" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ secret: "sensitive-data" });
  });

  it("reports the gate as disabled", async () => {
    const res = await app.inject({ method: "GET", url: "/api/project-gate/status" });
    expect(res.json()).toEqual({ enabled: false, authenticated: false });
  });

  it("login is a no-op success when the gate is off", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/project-gate/login",
      payload: { username: "anything", password: "anything" },
    });
    expect(res.statusCode).toBe(200);
  });
});
