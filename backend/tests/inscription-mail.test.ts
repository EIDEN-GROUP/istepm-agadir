/**
 * Confirmation de dépôt au candidat — gabarit fixe, sans base de données.
 * Exécuter : `npm test` (backend).
 */
import { describe, it, expect } from "vitest";
import {
  CONFIRMATION_DOCS,
  buildConfirmationHtml,
  buildConfirmationText,
  buildStaffNotificationHtml,
  confirmationSubject,
} from "@/lib/inscription-mail";
import type { InscriptionMailRow } from "@/lib/inscription-mail";

process.env.NODE_ENV ??= "test";

const ROW: InscriptionMailRow = {
  prenom: "Yasmine",
  nom: "E2E",
  telephone: "0612345678",
  email: "yasmine.e2e@example.com",
  filiere: "Sage-femme",
  niveau: "Baccalauréat obtenu",
  message: "Bonjour,\nJe souhaite des précisions.",
};

describe("confirmationSubject", () => {
  it("mentionne la filière", () => {
    expect(confirmationSubject(ROW)).toBe("ISTEPM Agadir · Demande bien reçue (Sage-femme)");
  });
});

describe("buildConfirmationText", () => {
  it("contient le récapitulatif et les pièces", () => {
    const text = buildConfirmationText(ROW);
    expect(text).toContain("Bonjour Yasmine E2E,");
    expect(text).toContain("Filière : Sage-femme");
    expect(text).toContain("Niveau : Baccalauréat obtenu");
    expect(text).toContain("Message : Bonjour,");
    expect(text).toContain("05 28 23 55 11");
    for (const doc of CONFIRMATION_DOCS) expect(text).toContain(doc);
    expect(text).not.toMatch(/<[a-z][^>]*>/i);
  });

  it("omet la ligne Message quand vide", () => {
    const text = buildConfirmationText({ ...ROW, message: "" });
    expect(text).not.toContain("Message :");
  });
});

describe("buildConfirmationHtml", () => {
  it("reprend le design du site (encre, sarcelle, rouge, logo)", () => {
    const html = buildConfirmationHtml(ROW);
    expect(html).toContain("#17353A");
    expect(html).toContain("#067C7A");
    expect(html).toContain("#E52329");
    // PNG : Gmail n'affiche pas les images SVG.
    expect(html).toContain("https://istepm-agadir.eiden-group.com/istpm-logo-blanc.png");
    expect(html).not.toContain(".svg");
    expect(html).toContain('href="tel:+212528235511"');
    expect(html).toContain("Demande bien reçue, Yasmine !");
    expect(html).toContain("Sage-femme");
    expect(html).toContain("05 28 23 55 11");
  });

  it("échappe les valeurs candidat (anti-injection)", () => {
    const evil: InscriptionMailRow = {
      ...ROW,
      prenom: "<script>alert(1)</script>",
      nom: "X",
      message: "<b>gras</b>",
    };
    const html = buildConfirmationHtml(evil);
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("&lt;b&gt;gras&lt;/b&gt;");
    const text = buildConfirmationText(evil);
    expect(text).toContain("<script>alert(1)</script>");
  });

  it("omet la ligne Message quand vide", () => {
    const html = buildConfirmationHtml({ ...ROW, message: "" });
    expect(html).not.toContain(">Message</td>");
  });
});

describe("buildStaffNotificationHtml", () => {
  it("garde tous les champs du dépôt, au style du site", () => {
    const html = buildStaffNotificationHtml(ROW);
    expect(html).toContain("#17353A");
    expect(html).toContain("#067C7A");
    for (const label of ["Prénom", "Nom", "Téléphone", "E-mail", "Filière", "Niveau", "Message"]) {
      expect(html).toContain(`>${label}</div>`);
    }
    for (const v of [ROW.prenom, ROW.nom, ROW.telephone, ROW.email, ROW.filiere, ROW.niveau]) {
      expect(html).toContain(v);
    }
    expect(html).toContain("Bonjour,<br>Je souhaite des précisions.");
    expect(html).toContain('href="tel:0612345678"');
    expect(html).toContain('href="mailto:yasmine.e2e@example.com"');
  });

  it("échappe les valeurs candidat (anti-injection)", () => {
    const html = buildStaffNotificationHtml({
      ...ROW,
      prenom: "<script>alert(1)</script>",
      telephone: "06\"><img src=x>",
      message: "<b>gras</b>",
    });
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("&lt;b&gt;gras&lt;/b&gt;");
  });

  it("omet le bloc Message quand vide", () => {
    const html = buildStaffNotificationHtml({ ...ROW, message: "" });
    expect(html).not.toContain(">Message</div>");
  });
});
