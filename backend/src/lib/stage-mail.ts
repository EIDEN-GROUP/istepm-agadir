import { escHtml } from "@/lib/notify";

/**
 * Notification de création de stage : à l'étudiant concerné et aux
 * responsables des affaires estudiantines.
 *
 * Gabarit fixe côté serveur (jamais de relais libre), design repris du
 * site et des e-mails d'inscription (bandeau encre `#17353A`, accents
 * sarcelle `#067C7A`, fond `#F0F5F5`, tableaux + styles en ligne).
 */
export type StageMailRow = {
  prenom: string;
  nom: string;
  filiere: string;
  niveau: string;
  structure: string;
  service: string;
  debut: string;
  fin: string;
};

export function stageSubject(row: Pick<StageMailRow, "structure">): string {
  return `ISTEPM Agadir · Nouveau stage (${row.structure || "structure à venir"})`;
}

const PHONE_LABEL = "05 28 23 55 11";

export function buildStageText(row: StageMailRow, pourStaff: boolean): string {
  const qui = `${row.prenom} ${row.nom}`.trim() || "étudiant";
  const head = pourStaff
    ? `Un nouveau stage a été créé pour ${qui}.`
    : `Bonjour ${qui},\n\nUn nouveau stage vous a été affecté.`;
  return [
    head,
    ``,
    `Structure : ${row.structure || "-"}`,
    `Service : ${row.service || "-"}`,
    `Filière : ${row.filiere || "-"}`,
    `Niveau : ${row.niveau || "-"}`,
    `Période : ${[row.debut, row.fin].filter(Boolean).join(" → ") || "-"}`,
    ``,
    pourStaff
      ? `Suivi disponible dans l'espace Stages du tableau de bord.`
      : `Présentez-vous à la structure à la date indiquée. Une question ? ${PHONE_LABEL}`,
    ``,
    `Cordialement,`,
    `L'équipe ISTEPM Agadir`,
    `Institut Spécialisé des Techniques Paramédicales - Cité Salam, Agadir`,
  ].join("\n");
}

export function buildStageHtml(row: StageMailRow, pourStaff: boolean): string {
  const qui = escHtml(`${row.prenom} ${row.nom}`.trim() || "étudiant");
  const ligne = (k: string, v: string) =>
    `<tr><td style="padding:7px 0;color:#536A6E;font-size:13px;">${k}</td>` +
    `<td style="padding:7px 0 7px 16px;color:#17353A;font-size:13px;font-weight:600;">${v}</td></tr>`;
  const head = pourStaff
    ? `Un nouveau stage a été créé pour <strong>${qui}</strong>.`
    : `Bonjour ${qui},<br>Un nouveau stage vous a été <strong>affecté</strong>.`;
  const periode = [row.debut, row.fin].filter(Boolean).join(" → ") || "-";
  const pied = pourStaff
    ? `Suivi disponible dans l'espace Stages du tableau de bord.`
    : `Présentez-vous à la structure à la date indiquée. Une question ? <strong style="color:#17353A;">${PHONE_LABEL}</strong>`;
  const summary =
    ligne("Structure", escHtml(row.structure) || "-") +
    ligne("Service", escHtml(row.service) || "-") +
    ligne("Filière", escHtml(row.filiere) || "-") +
    ligne("Niveau", escHtml(row.niveau) || "-") +
    ligne("Période", escHtml(periode));

  return (
    `<!doctype html><html lang="fr"><body style="margin:0;padding:0;background-color:#F0F5F5;">` +
    `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">Un nouveau stage a été créé.</div>` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F0F5F5;">` +
    `<tr><td align="center" style="padding:28px 12px;">` +
    `<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:#ffffff;border-radius:12px;overflow:hidden;">` +
    `<tr><td style="background-color:#17353A;padding:22px 28px;">` +
    `<span style="color:#ffffff;font-family:Poppins,Verdana,Geneva,sans-serif;font-size:17px;font-weight:700;">ISTEPM Agadir</span>` +
    `</td></tr>` +
    `<tr><td style="padding:28px 28px 8px;">` +
    `<h1 style="margin:0;font-family:Poppins,Verdana,Geneva,sans-serif;font-size:22px;color:#17353A;">Nouveau stage</h1>` +
    `<p style="font-family:Poppins,Verdana,Geneva,sans-serif;font-size:14px;line-height:1.6;color:#536A6E;">${head}</p>` +
    `</td></tr>` +
    `<tr><td style="padding:8px 28px;">` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" ` +
    `style="background-color:#EAF7F6;border-radius:8px;padding:6px 14px;">${summary}</table>` +
    `<p style="font-family:Poppins,Verdana,Geneva,sans-serif;font-size:12px;color:#536A6E;">${pied}</p>` +
    `</td></tr>` +
    `<tr><td align="center" style="background-color:#17353A;padding:18px 28px;">` +
    `<p style="margin:0;font-family:Poppins,Verdana,Geneva,sans-serif;font-size:12px;color:#B6E6E3;">` +
    `Institut Spécialisé des Techniques Paramédicales - Cité Salam, Agadir</p>` +
    `</td></tr>` +
    `</table></td></tr></table></body></html>`
  );
}
