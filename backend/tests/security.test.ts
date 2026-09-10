/**
 * Régressions de sécurité — vérifient les correctifs sans base de données.
 * Exécuter : `npm test` (backend).
 */
import { describe, it, expect, beforeAll } from "vitest";
import { isPrivateHost } from "@/routes/receipt";
import { scopeCondition } from "@/routes/notifications";
import { agentErrorMessage } from "@/routes/agent";

process.env.NODE_ENV ??= "test";

describe("isPrivateHost (garde SSRF gabarits PDF)", () => {
  const blocked = [
    "localhost",
    "127.0.0.1",
    "127.1.2.3",
    "10.0.0.5",
    "172.16.0.1",
    "172.31.255.255",
    "192.168.1.1",
    "169.254.169.254", // métadonnées cloud
    "0.0.0.0",
    "::1",
    "[::1]",
    "fc00::1",
    "fd00::5",
    "fe80::1",
    "::ffff:127.0.0.1",
  ];
  for (const h of blocked) {
    it(`bloque ${h}`, () => expect(isPrivateHost(h)).toBe(true));
  }
  const allowed = [
    "example.com",
    "eiden-group.com",
    "8.8.8.8",
    "1.1.1.1",
    "172.32.0.1", // hors 172.16/12
    "192.167.1.1", // hors 192.168/16
    "2001:db8::1", // documentation publique
    "999.999.999.999", // invalide : pas un littéral IP, traité comme nom d'hôte
  ];
  for (const h of allowed) {
    it(`autorise ${h}`, () => expect(isPrivateHost(h)).toBe(false));
  }
});

describe("scopeCondition (notifications : pas de lecture inter-comptes)", () => {
  it("directeur : supervision globale (pas de filtre)", () => {
    expect(scopeCondition("u1", "directeur")).toBeUndefined();
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
