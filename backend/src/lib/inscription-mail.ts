import { escHtml } from "@/lib/notify";

/**
 * Confirmation de dépôt au candidat (landing page).
 *
 * Gabarit fixe côté serveur (jamais de relais libre) : toutes les valeurs
 * candidat passent par `escHtml`. Design repris du site (bandeau encre
 * `#17353A`, accents sarcelle `#067C7A` et rouge `#E52329`, fond `#F0F5F5`)
 * en HTML compatible clients mail (tableaux, styles en ligne, aucune CSS
 * externe — les polices Tevlen/Poppins du site ne chargent pas dans les
 * mails, repli système). Le logo blanc est un PNG (Gmail n'affiche pas le
 * SVG) servi en URL absolue par la landing (`landing-page/public/`).
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

const LOGO_URL = "https://istepm-agadir.eiden-group.com/istpm-logo-blanc.png";
/** Taille d'affichage du PNG 192×166 (3x). */
const LOGO_WIDTH = 64;
const LOGO_HEIGHT = 55;
const PHONE_LABEL = "05 28 23 55 11";
const PHONE_TEL = "+212528235511";
const FONT = `font-family:Poppins,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;`;

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
  const link = (href: string, label: string) =>
    `<a href="${href}" style="color:#067C7A;text-decoration:none;">${label}</a>`;
  // Filet entre les lignes (pas au-dessus de la première).
  const summaryRow = (label: string, value: string, first = false) => {
    const sep = first ? "" : "border-top:1px solid #D6EFED;";
    return (
      `<tr><td valign="top" style="padding:8px 0;${sep}${FONT}font-size:13px;line-height:1.45;color:#536A6E;white-space:nowrap;">${label}</td>` +
      `<td style="padding:8px 0 8px 18px;${sep}${FONT}font-size:13.5px;line-height:1.45;font-weight:600;color:#17353A;word-break:break-word;">${value}</td></tr>`
    );
  };
  const summary =
    summaryRow("Prénom", prenom, true) +
    summaryRow("Nom", nom) +
    summaryRow("Téléphone", link(`tel:${escHtml(row.telephone.replace(/[^\d+]/g, ""))}`, escHtml(row.telephone))) +
    summaryRow("E-mail", link(`mailto:${escHtml(row.email)}`, escHtml(row.email))) +
    summaryRow("Filière", escHtml(row.filiere)) +
    summaryRow("Niveau", escHtml(row.niveau)) +
    (row.message
      ? summaryRow("Message", escHtml(row.message).replace(/\n/g, "<br>"))
      : "");
  const docs = CONFIRMATION_DOCS.map(
    (d) =>
      `<tr><td style="padding:4px 0;${FONT}font-size:13.5px;line-height:1.45;color:#17353A;">` +
      `<span style="color:#067C7A;font-weight:700;">✓</span>&nbsp;&nbsp;${escHtml(d)}</td></tr>`,
  ).join("");
  const h2 = (title: string) =>
    `<h2 style="margin:0 0 10px;${FONT}font-size:16px;line-height:1.3;font-weight:600;letter-spacing:-.01em;color:#17353A;">${title}</h2>`;

  return (
    `<!doctype html><html lang="fr"><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width,initial-scale=1">` +
    `<meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light">` +
    `<style>@media only screen and (max-width:520px){` +
    `.px{padding-left:20px!important;padding-right:20px!important}` +
    `.h1{font-size:23px!important}}</style>` +
    `</head><body style="margin:0;padding:0;background-color:#F0F5F5;">` +
    `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">Votre demande d'inscription est bien enregistrée.</div>` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F0F5F5;">` +
    `<tr><td align="center" style="padding:32px 12px;">` +
    `<table role="presentation" width="600" cellpadding="0" cellspacing="0" ` +
    `style="width:100%;max-width:600px;background-color:#ffffff;border:1px solid #DCE9E8;border-radius:14px;overflow:hidden;">` +
    // Bandeau encre (site : .section--dark), logo blanc en PNG (Gmail n'affiche pas le SVG).
    `<tr><td class="px" style="background-color:#17353A;` +
    `background-image:linear-gradient(150deg,#1B4146 0%,#17353A 45%,#0E2629 100%);padding:22px 32px;">` +
    `<table role="presentation" cellpadding="0" cellspacing="0"><tr>` +
    `<td valign="middle"><img src="${LOGO_URL}" alt="ISTEPM Agadir" width="${LOGO_WIDTH}" height="${LOGO_HEIGHT}" ` +
    `style="display:block;border:0;${FONT}font-size:12px;color:#ffffff;"></td>` +
    `<td valign="middle" style="padding-left:14px;${FONT}font-size:17px;line-height:1.2;font-weight:700;letter-spacing:-.01em;color:#ffffff;">` +
    `ISTEPM <span style="font-weight:600;color:#7FD3CF;">Agadir</span></td>` +
    `</tr></table></td></tr>` +
    `<tr><td class="px" style="padding:32px 32px 8px;">` +
    `<h1 class="h1" style="margin:0;${FONT}font-size:26px;line-height:1.15;font-weight:600;letter-spacing:-.03em;color:#17353A;">Demande bien reçue, ${prenom} !</h1>` +
    // Accent rouge (site : soulignement du menu actif, boutons --red).
    `<div style="margin-top:16px;width:36px;height:3px;border-radius:3px;background-color:#E52329;font-size:0;line-height:0;">&nbsp;</div>` +
    `<p style="margin:16px 0 0;${FONT}font-size:14.5px;line-height:1.65;color:#536A6E;">` +
    `Votre demande de pré-inscription en <strong style="color:#067C7A;">${escHtml(row.filiere)}</strong> est bien enregistrée. ` +
    `L’équipe d’admission vous contactera très prochainement.</p>` +
    `</td></tr>` +
    // Récapitulatif (site : surfaces --teal-50).
    `<tr><td class="px" style="padding:24px 32px 8px;">` +
    h2("Récapitulatif de votre demande") +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#EAF7F6;border-radius:12px;">` +
    `<tr><td style="padding:6px 18px;">` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${summary}</table>` +
    `</td></tr></table>` +
    `<p style="margin:12px 0 0;${FONT}font-size:12px;line-height:1.5;color:#536A6E;">` +
    `Une coquille dans vos coordonnées ? Répondez simplement à cet e-mail pour la signaler.</p>` +
    `</td></tr>` +
    // Pièces à préparer.
    `<tr><td class="px" style="padding:24px 32px 8px;">` +
    h2("À préparer pour votre rendez-vous") +
    `<table role="presentation" cellpadding="0" cellspacing="0">${docs}</table>` +
    `</td></tr>` +
    // Contact admission (site : bouton rouge .btn--red + pastille flèche).
    `<tr><td class="px" style="padding:20px 32px 32px;">` +
    `<p style="margin:0 0 12px;${FONT}font-size:14px;line-height:1.5;color:#536A6E;">Une question sur l’admission ?</p>` +
    `<table role="presentation" cellpadding="0" cellspacing="0"><tr>` +
    `<td style="background-color:#E52329;border-radius:999px;padding:5px 5px 5px 22px;">` +
    `<a href="tel:${PHONE_TEL}" style="display:block;text-decoration:none;">` +
    `<table role="presentation" cellpadding="0" cellspacing="0"><tr>` +
    `<td style="${FONT}font-size:15px;line-height:34px;font-weight:600;color:#ffffff;white-space:nowrap;">${PHONE_LABEL}</td>` +
    `<td style="padding-left:14px;"><div style="width:34px;height:34px;border-radius:50%;background-color:#ffffff;` +
    `${FONT}font-size:16px;line-height:34px;font-weight:700;text-align:center;color:#E52329;">&#8599;&#xFE0E;</div></td>` +
    `</tr></table></a></td></tr></table>` +
    `</td></tr>` +
    // Pied de page encre.
    `<tr><td align="center" class="px" style="background-color:#17353A;padding:18px 32px;">` +
    `<p style="margin:0;${FONT}font-size:12px;line-height:1.5;color:#B6E6E3;">` +
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
  const prenom = escHtml(row.prenom);
  const nom = escHtml(row.nom);
  const link = (href: string, label: string) =>
    `<a href="${href}" style="color:#067C7A;text-decoration:none;">${label}</a>`;
  const field = (label: string, value: string) =>
    `<td class="col" width="50%" valign="top" style="padding:0 0 22px;">` +
    `<div style="border-left:1px solid #DCE9E8;padding:2px 12px 4px 16px;">` +
    `<div style="${FONT}font-size:11px;line-height:1.2;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:#536A6E;">${label}</div>` +
    `<div style="margin-top:6px;${FONT}font-size:15px;line-height:1.45;font-weight:600;color:#17353A;word-break:break-word;">${value}</div>` +
    `</div></td>`;
  const message = row.message
    ? `<tr><td class="px" style="padding:0 32px 8px;">` +
      `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#EAF7F6;border-radius:12px;">` +
      `<tr><td style="padding:16px 18px 18px;">` +
      `<div style="${FONT}font-size:11px;line-height:1.2;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:#067C7A;">Message</div>` +
      `<div style="margin-top:8px;${FONT}font-size:14px;line-height:1.6;color:#17353A;">${escHtml(row.message).replace(/\n/g, "<br>")}</div>` +
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
    `<div style="${FONT}font-size:15px;line-height:1.2;font-weight:700;letter-spacing:-.01em;color:#ffffff;">` +
    `ISTEPM <span style="font-weight:600;color:#7FD3CF;">Agadir</span></div>` +
    `<div style="margin-top:34px;${FONT}font-size:12px;line-height:1.2;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:#7FD3CF;">` +
    `[&nbsp;Demande d’inscription&nbsp;]</div>` +
    `<h1 class="h1" style="margin:12px 0 0;${FONT}font-size:28px;line-height:1.1;font-weight:600;letter-spacing:-.03em;color:#ffffff;">` +
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
    `<p style="margin:0;padding-top:16px;border-top:1px solid #E8F0EF;${FONT}font-size:12px;line-height:1.5;color:#536A6E;">` +
    `Institut Spécialisé des Techniques Paramédicales — Cité Salam, Agadir</p>` +
    `</td></tr>` +
    `</table></td></tr></table></body></html>`
  );
}
