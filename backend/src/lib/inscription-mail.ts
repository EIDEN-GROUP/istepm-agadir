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

/**
 * Notification staff à chaque dépôt (ADMIN_EMAIL).
 *
 * Contenu inchangé (Prénom, Nom, Téléphone, E-mail, Filière, Niveau, Message
 * si présent), habillé au style de la landing : bande encre en dégradé
 * (`.section--dark`), étiquette `[ … ]` sarcelle (`.bhead__tag`), colonnes
 * d'info de la section Contact (`.cinfo__item`), message sur fond
 * `--teal-50` (`.docs`). Marque en texte, sans image : Gmail n'affiche pas
 * le SVG. Les colonnes s'empilent sous 520px (clients qui lisent <style>).
 */
export function buildStaffNotificationHtml(row: InscriptionMailRow): string {
  const font = `font-family:Poppins,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;`;
  const prenom = escHtml(row.prenom);
  const nom = escHtml(row.nom);
  const link = (href: string, label: string) =>
    `<a href="${href}" style="color:#067C7A;text-decoration:none;">${label}</a>`;
  const field = (label: string, value: string) =>
    `<td class="col" width="50%" valign="top" style="padding:0 0 22px;">` +
    `<div style="border-left:1px solid #DCE9E8;padding:2px 12px 4px 16px;">` +
    `<div style="${font}font-size:11px;line-height:1.2;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:#536A6E;">${label}</div>` +
    `<div style="margin-top:6px;${font}font-size:15px;line-height:1.45;font-weight:600;color:#17353A;word-break:break-word;">${value}</div>` +
    `</div></td>`;
  const message = row.message
    ? `<tr><td class="px" style="padding:0 32px 8px;">` +
      `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#EAF7F6;border-radius:12px;">` +
      `<tr><td style="padding:16px 18px 18px;">` +
      `<div style="${font}font-size:11px;line-height:1.2;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:#067C7A;">Message</div>` +
      `<div style="margin-top:8px;${font}font-size:14px;line-height:1.6;color:#17353A;">${escHtml(row.message).replace(/\n/g, "<br>")}</div>` +
      `</td></tr></table></td></tr>`
    : "";

  return (
    `<!doctype html><html lang="fr"><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width,initial-scale=1">` +
    `<meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light">` +
    `<style>@media only screen and (max-width:520px){` +
    `.px{padding-left:20px!important;padding-right:20px!important}` +
    `.col{display:block!important;width:100%!important}` +
    `.h1{font-size:24px!important}}</style>` +
    `</head><body style="margin:0;padding:0;background-color:#F0F5F5;">` +
    `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">` +
    `${prenom} ${nom} · ${escHtml(row.filiere)} · ${escHtml(row.niveau)}</div>` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F0F5F5;">` +
    `<tr><td align="center" style="padding:32px 12px;">` +
    `<table role="presentation" width="600" cellpadding="0" cellspacing="0" ` +
    `style="width:100%;max-width:600px;background-color:#ffffff;border:1px solid #DCE9E8;border-radius:14px;overflow:hidden;">` +
    // Bande encre (site : .section--dark, dégradé 150deg).
    `<tr><td class="px" style="background-color:#17353A;` +
    `background-image:linear-gradient(150deg,#1B4146 0%,#17353A 45%,#0E2629 100%);padding:24px 32px 30px;">` +
    `<div style="${font}font-size:15px;line-height:1.2;font-weight:700;letter-spacing:-.01em;color:#ffffff;">` +
    `ISTEPM <span style="font-weight:600;color:#7FD3CF;">Agadir</span></div>` +
    `<div style="margin-top:34px;${font}font-size:12px;line-height:1.2;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:#7FD3CF;">` +
    `[&nbsp;Demande d’inscription&nbsp;]</div>` +
    `<h1 class="h1" style="margin:12px 0 0;${font}font-size:28px;line-height:1.1;font-weight:600;letter-spacing:-.03em;color:#ffffff;">` +
    `${prenom} ${nom}</h1>` +
    `<div style="margin-top:18px;width:36px;height:3px;border-radius:3px;background-color:#E52329;font-size:0;line-height:0;">&nbsp;</div>` +
    `</td></tr>` +
    // Coordonnées (site : .cinfo__item, 2 colonnes).
    `<tr><td class="px" style="padding:30px 32px 8px;">` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">` +
    `<tr>${field("Prénom", prenom)}${field("Nom", nom)}</tr>` +
    `<tr>${field("Téléphone", link(`tel:${escHtml(row.telephone.replace(/[^\d+]/g, ""))}`, escHtml(row.telephone)))}` +
    `${field("E-mail", link(`mailto:${escHtml(row.email)}`, escHtml(row.email)))}</tr>` +
    `<tr>${field("Filière", escHtml(row.filiere))}${field("Niveau", escHtml(row.niveau))}</tr>` +
    `</table></td></tr>` +
    message +
    // Pied de page.
    `<tr><td class="px" style="padding:22px 32px 24px;">` +
    `<p style="margin:0;padding-top:16px;border-top:1px solid #E8F0EF;${font}font-size:12px;line-height:1.5;color:#536A6E;">` +
    `Institut Spécialisé des Techniques Paramédicales — Cité Salam, Agadir</p>` +
    `</td></tr>` +
    `</table></td></tr></table></body></html>`
  );
}
