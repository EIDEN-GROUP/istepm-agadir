/**
 * Régressions de sécurité — vérifient les correctifs sans base de données.
 * Exécuter : `npm test` (backend).
 *
 * NOTE : le bloc `isPrivateHost` (garde SSRF des gabarits PDF de reçus) a été
 * retiré avec le module reçus/paiements (WS4) : plus de surface concernée
 * (les uploads examens/séances sont en base64 POST, jamais via URL).
 */
import { describe, it, expect, beforeAll } from "vitest";
import { scopeCondition } from "@/routes/notifications";
import { agentErrorMessage } from "@/routes/agent";

process.env.NODE_ENV ??= "test";

describe("scopeCondition (notifications : pas de lecture inter-comptes)", () => {
  it("directeur : supervision globale (pas de filtre)", () => {
    expect(scopeCondition("u1", "directeur")).toBeUndefined();
  });
  it("assistant_directeur : même supervision que le directeur", () => {
    expect(scopeCondition("u1", "assistant_directeur")).toBeUndefined();
  });
  for (const role of ["responsable", "enseignant", "etudiant", undefined]) {
    it(`filtre appliqué pour rôle=${String(role)}`, () => {
      expect(scopeCondition("u1", role)).toBeDefined();
    });
  }
});

describe("agentErrorMessage (pas de fuite, messages stables)", () => {
  it("mappe 403 sans divulguer la clé", () => {
    const msg = agentErrorMessage(Object.assign(new Error("x"), { status: 403 }));
    expect(msg).toContain("AI_API_KEY");
    expect(msg).not.toMatch(/nvapi|sk-/);
  });
  it("mappe les timeouts", () => {
    expect(agentErrorMessage(new Error("request timed out"))).toContain("trop de temps");
  });
  it("message générique sinon", () => {
    expect(agentErrorMessage(new Error("boom"))).toBe("boom");
    expect(agentErrorMessage("chaîne")).toContain("communication");
  });
});

describe("rate limiting par client réel (anti-bucket global)", () => {
  it("isole les quotas par X-Real-IP sur /health", async () => {
    const { buildApp } = await import("@/app");
    const app = await buildApp();
    try {
      // 101 requêtes d'une même IP → la 101e est rejetée…
      let last = 200;
      for (let i = 0; i < 101; i++) {
        const r = await app.inject({
          url: "/health",
          headers: { "x-real-ip": "203.0.113.7" },
        });
        last = r.statusCode;
      }
      expect(last).toBe(429);
      // …mais une autre IP passe toujours (pas de seau global).
      const other = await app.inject({
        url: "/health",
        headers: { "x-real-ip": "203.0.113.8" },
      });
      expect(other.statusCode).toBe(200);
    } finally {
      await app.close();
    }
  }, 60000);
});
