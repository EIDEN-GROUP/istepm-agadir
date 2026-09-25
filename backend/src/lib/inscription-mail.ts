import { escHtml } from "@/lib/notify";

/**
 * Confirmation de dépôt au candidat (landing page).
 *
 * Gabarit fixe côté serveur (jamais de relais libre) : toutes les valeurs
 * candidat passent par `escHtml`. Design repris du site (bandeau encre
 * `#17353A`, accents sarcelle `#067C7A`, fond `#F0F5F5`) en HTML compatible
 * clients mail (tableaux, styles en ligne, aucune CSS externe — les polices
 * Tevlen/Poppins du site ne chargent pas dans les mails, repli Verdana).
 * Le logo est servi en URL absolue depuis le domaine public.
 */
export type InscriptionMailRow = {
  prenom: string;
  nom: string;
  telephone: string;
  email: string;
  filiere: string;
  niveau: string;
  message: string;
};

const LOGO_URL = "https://istepm-agadir.eiden-group.com/istpm-logo.svg";
const PHONE_LABEL = "05 28 23 55 11";

/** Pièces rappelées au candidat (miroir de la landing, écran de confirmation). */
export const CONFIRMATION_DOCS = [
  "Copie du bac ou du dernier diplôme",
  "Relevés de notes",
  "Copie de la CIN",
  "Photos d’identité",
] as const;

export function confirmationSubject(row: Pick<InscriptionMailRow, "filiere">): string {
  return `ISTEPM Agadir · Demande bien reçue (${row.filiere})`;
}

export function buildConfirmationText(row: InscriptionMailRow): string {
  const lines = [
    `Bonjour ${row.prenom} ${row.nom},`,
    ``,
    `Votre demande de pré-inscription en ${row.filiere} est bien enregistrée.`,
    `L'équipe d'admission vous contactera très prochainement.`,
    ``,
    `Récapitulatif de votre demande :`,
    `Prénom : ${row.prenom}`,
    `Nom : ${row.nom}`,
    `Téléphone : ${row.telephone}`,
    `E-mail : ${row.email}`,
    `Filière : ${row.filiere}`,
    `Niveau : ${row.niveau}`,
    ...(row.message ? [`Message : ${row.message}`] : []),
    ``,
    `Une coquille dans vos coordonnées ? Répondez simplement à cet e-mail pour la signaler.`,
    ``,
    `À préparer pour votre rendez-vous :`,
    ...CONFIRMATION_DOCS.map((d) => `— ${d}`),
    ``,
    `Une question sur l'admission ? ${PHONE_LABEL}`,
    ``,
    `Cordialement,`,
    `L'équipe ISTEPM Agadir`,
    `Institut Spécialisé des Techniques Paramédicales — Cité Salam, Agadir`,
  ];
  return lines.join("\n");
}

export function buildConfirmationHtml(row: InscriptionMailRow): string {
  const prenom = escHtml(row.prenom);
  const nom = escHtml(row.nom);
  const summaryRow = (label: string, value: string) =>
    `<tr><td style="padding:7px 0;color:#536A6E;font-size:13px;">${label}</td>` +
    `<td style="padding:7px 0 7px 16px;color:#17353A;font-size:13px;font-weight:600;">${value}</td></tr>`;
  const summary =
    summaryRow("Prénom", prenom) +
    summaryRow("Nom", nom) +
    summaryRow("Téléphone", escHtml(row.telephone)) +
    summaryRow("E-mail", escHtml(row.email)) +
    summaryRow("Filière", escHtml(row.filiere)) +
    summaryRow("Niveau", escHtml(row.niveau)) +
    (row.message
      ? summaryRow("Message", escHtml(row.message).replace(/\n/g, "<br>"))
      : "");
  const docs = CONFIRMATION_DOCS.map(
    (d) =>
      `<tr><td style="padding:3px 0;color:#17353A;font-size:13px;">` +
      `<span style="color:#067C7A;font-weight:700;">✓</span>&nbsp;&nbsp;${escHtml(d)}</td></tr>`,
  ).join("");

  return (
    `<!doctype html><html lang="fr"><body style="margin:0;padding:0;background-color:#F0F5F5;">` +
    `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">Votre demande d'inscription est bien enregistrée.</div>` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F0F5F5;">` +
    `<tr><td align="center" style="padding:28px 12px;">` +
    `<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:#ffffff;border-radius:12px;overflow:hidden;">` +
    // Bandeau encre (site : --ink #17353A).
    `<tr><td style="background-color:#17353A;padding:22px 28px;">` +
    `<img src="${LOGO_URL}" alt="ISTEPM Agadir" width="40" height="40" style="vertical-align:middle;border:0;">` +
    `<span style="color:#ffffff;font-family:Poppins,Verdana,Geneva,sans-serif;font-size:17px;font-weight:700;vertical-align:middle;">&nbsp;&nbsp;ISTEPM Agadir</span>` +
    `</td></tr>` +
    `<tr><td style="padding:28px 28px 8px;">` +
    `<h1 style="margin:0;font-family:Poppins,Verdana,Geneva,sans-serif;font-size:22px;color:#17353A;">Demande bien reçue, ${prenom} !</h1>` +
    `<p style="font-family:Poppins,Verdana,Geneva,sans-serif;font-size:14px;line-height:1.6;color:#536A6E;">` +
    `Votre demande de pré-inscription en <strong style="color:#067C7A;">${escHtml(row.filiere)}</strong> est bien enregistrée. ` +
    `L’équipe d’admission vous contactera très prochainement.</p>` +
    `</td></tr>` +
    // Récapitulatif.
    `<tr><td style="padding:8px 28px;">` +
    `<h2 style="margin:0 0 6px;font-family:Poppins,Verdana,Geneva,sans-serif;font-size:15px;color:#17353A;">Récapitulatif de votre demande</h2>` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" ` +
    `style="background-color:#EAF7F6;border-radius:8px;padding:6px 14px;">${summary}</table>` +
    `<p style="font-family:Poppins,Verdana,Geneva,sans-serif;font-size:12px;color:#536A6E;">` +
    `Une coquille dans vos coordonnées ? Répondez simplement à cet e-mail pour la signaler.</p>` +
    `</td></tr>` +
    // Pièces à préparer.
    `<tr><td style="padding:8px 28px 12px;">` +
    `<h2 style="margin:0 0 6px;font-family:Poppins,Verdana,Geneva,sans-serif;font-size:15px;color:#17353A;">À préparer pour votre rendez-vous</h2>` +
    `<table role="presentation" cellpadding="0" cellspacing="0">${docs}</table>` +
    `<p style="font-family:Poppins,Verdana,Geneva,sans-serif;font-size:14px;color:#536A6E;">` +
    `Une question sur l’admission ? <strong style="color:#17353A;">${PHONE_LABEL}</strong></p>` +
    `</td></tr>` +
    // Pied de page encre.
    `<tr><td align="center" style="background-color:#17353A;padding:18px 28px;">` +
    `<p style="margin:0;font-family:Poppins,Verdana,Geneva,sans-serif;font-size:12px;color:#B6E6E3;">` +
    `Institut Spécialisé des Techniques Paramédicales — Cité Salam, Agadir</p>` +
    `</td></tr>` +
    `</table></td></tr></table></body></html>`
  );
}
