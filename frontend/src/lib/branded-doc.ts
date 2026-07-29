/**
 * Documents de marque ISTEPM Agadir — PDF et e-mail.
 *
 * Un seul endroit produit les livrables « officiels » (convention / rapport de
 * stage) pour qu'ils partagent le logo `public/istpm-logo.svg` et la palette de
 * marque, aussi bien dans le PDF téléchargé que dans le corps de l'e-mail.
 *
 * Le logo est un SVG : il est rasterisé une fois dans le navigateur (canvas →
 * JPEG) puis mémorisé. Le JPEG sert à la fois de `data:` URL pour l'e-mail et de
 * flux `DCTDecode` embarqué dans le PDF.
 */

import {
  fmtDate,
  STATUT_PAIEMENT_LABEL,
  type Stage,
  type StatutPaiement,
} from "@/lib/istpm-data";
import { getStamp } from "@/lib/stamp";

/* ------------------------------------------------------------------ */
/*  Palette de marque (miroir de styles.css)                           */
/* ------------------------------------------------------------------ */

export const BRAND = {
  teal: "#029994",
  tealDk: "#017a76",
  tealMd: "#02807c",
  tealPale: "#d6efee",
  tealWash: "#eef7f6",
  red: "#e51e26",
  ink: "#123b3a",
  white: "#ffffff",
} as const;

type Kind = "convention" | "rapport";

const KIND_TITLE: Record<Kind, string> = {
  convention: "Convention de stage clinique",
  rapport: "Rapport de stage clinique",
};

/* ------------------------------------------------------------------ */
/*  Rasterisation du logo                                              */
/* ------------------------------------------------------------------ */

const LOGO_ASPECT = 1100.48 / 953.38;

type LogoRaster = { dataUrl: string; jpeg: Uint8Array; w: number; h: number };

let logoPromise: Promise<LogoRaster | null> | null = null;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("logo load failed"));
    img.src = src;
  });
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function loadLogo(): Promise<LogoRaster | null> {
  if (logoPromise) return logoPromise;
  logoPromise = (async () => {
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}istpm-logo.svg`);
      if (!res.ok) return null;
      let svg = await res.text();
      const wPx = 320;
      const hPx = Math.round(wPx / LOGO_ASPECT);
      if (!/<svg[^>]*\swidth=/.test(svg)) {
        svg = svg.replace(/<svg/, `<svg width="${wPx}" height="${hPx}"`);
      }
      const svgUrl =
        "data:image/svg+xml;base64," +
        btoa(unescape(encodeURIComponent(svg)));
      const img = await loadImage(svgUrl);

      const scale = 2;
      const canvas = document.createElement("canvas");
      canvas.width = wPx * scale;
      canvas.height = hPx * scale;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
      const jpeg = base64ToBytes(dataUrl.split(",")[1]);
      return { dataUrl, jpeg, w: canvas.width, h: canvas.height };
    } catch {
      return null;
    }
  })();
  return logoPromise;
}

export async function loadLogoDataUrl(): Promise<string | null> {
  return (await loadLogo())?.dataUrl ?? null;
}

/**
 * Rasterise une data URL image quelconque (cachet téléversé) en JPEG, pour
 * l'embarquer dans le PDF comme le logo. La transparence est aplatie sur blanc.
 */
async function rasterizeDataUrl(
  dataUrl: string,
  wPx: number,
): Promise<LogoRaster | null> {
  try {
    const img = await loadImage(dataUrl);
    const aspect = img.width && img.height ? img.width / img.height : 1;
    const hPx = Math.max(1, Math.round(wPx / aspect));
    const scale = 2;
    const canvas = document.createElement("canvas");
    canvas.width = wPx * scale;
    canvas.height = hPx * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const url = canvas.toDataURL("image/jpeg", 0.92);
    const jpeg = base64ToBytes(url.split(",")[1]);
    return { dataUrl: url, jpeg, w: canvas.width, h: canvas.height };
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/*  Modèle de données partagé                                          */
/* ------------------------------------------------------------------ */

type Section = { title: string; rows: { label: string; value: string }[] };

function stageSections(s: Stage, kind: Kind): Section[] {
  const sections: Section[] = [
    {
      title: "Étudiant",
      rows: [
        { label: "Nom complet", value: `${s.prenom} ${s.nom}` },
        { label: "CNE", value: s.cne },
        { label: "Filière", value: `${s.filiere} (${s.niveau})` },
      ],
    },
    {
      title: "Lieu de stage",
      rows: [
        { label: "Structure d'accueil", value: s.structure },
        { label: "Service", value: s.service },
        {
          label: "Période",
          value: `${fmtDate(s.debut)} → ${fmtDate(s.fin)}`,
        },
      ],
    },
    {
      title: "Encadrement",
      rows: [
        { label: "Tuteur clinique", value: s.encadrantClinique || "—" },
        { label: "Tuteur académique", value: s.tuteurAcademique || "—" },
      ],
    },
  ];

  sections.push(
    kind === "rapport"
      ? {
          title: "Soutenance",
          rows: [
            {
              label: "Note de soutenance",
              value:
                s.noteSoutenance !== undefined
                  ? `${s.noteSoutenance.toFixed(2)} / 20`
                  : "Non soutenu",
            },
          ],
        }
      : {
          title: "Convention",
          rows: [
            {
              label: "Statut",
              value: s.conventionSignee
                ? "Signée"
                : "En attente de signature",
            },
          ],
        },
  );

  return sections;
}

/* ------------------------------------------------------------------ */
/*  Génération du PDF                                                  */
/* ------------------------------------------------------------------ */

const enc = new TextEncoder();

function escapePdf(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function toAscii(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\x20-\x7e]/g, "-");
}

const pdfText = (s: string) => escapePdf(toAscii(s));

function hexToPdfRgb(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  return `${r.toFixed(4)} ${g.toFixed(4)} ${b.toFixed(4)}`;
}

const PDF = {
  teal: hexToPdfRgb(BRAND.teal),
  tealDk: hexToPdfRgb(BRAND.tealDk),
  tealMd: hexToPdfRgb(BRAND.tealMd),
  red: hexToPdfRgb(BRAND.red),
  ink: hexToPdfRgb(BRAND.ink),
  white: "1 1 1",
  muted: "0.42 0.52 0.51",
  pale: hexToPdfRgb(BRAND.tealPale),
};

function buildContentStream(
  title: string,
  sections: Section[],
  hasLogo: boolean,
  logoAspect: number,
  hasStamp: boolean,
  stampAspect: number,
): string {
  const ops: string[] = [];
  const PAGE_W = 595;

  ops.push(`${PDF.tealDk} rg 0 746 ${PAGE_W} 96 re f`);
  ops.push(`${PDF.red} rg 0 742 ${PAGE_W} 4 re f`);

  let textX = 44;
  if (hasLogo) {
    const CHIP = 60;
    const chipX = 40;
    const chipY = 764;
    ops.push(`${PDF.white} rg ${chipX} ${chipY} ${CHIP} ${CHIP} re f`);
    const BOX = 48;
    let dw = BOX;
    let dh = BOX;
    if (logoAspect > 1) dh = BOX / logoAspect;
    else dw = BOX * logoAspect;
    const ix = chipX + (CHIP - dw) / 2;
    const iy = chipY + (CHIP - dh) / 2;
    ops.push(
      `q ${dw.toFixed(2)} 0 0 ${dh.toFixed(2)} ${ix.toFixed(2)} ${iy.toFixed(
        2,
      )} cm /Im0 Do Q`,
    );
    textX = chipX + CHIP + 18;
  }

  ops.push(
    `${PDF.white} rg BT /F2 17 Tf ${textX} 802 Td (${pdfText(title)}) Tj ET`,
  );
  ops.push(
    `${PDF.pale} rg BT /F1 9.5 Tf ${textX} 784 Td (${pdfText(
      "ISTEPM Agadir - Institut specialise des techniques paramedicales",
    )}) Tj ET`,
  );
  ops.push(
    `${PDF.pale} rg BT /F1 9.5 Tf ${textX} 770 Td (${pdfText(
      "Techniques paramedicales",
    )}) Tj ET`,
  );

  const LEFT = 60;
  const VALUE_X = 230;
  const RIGHT = 535;
  let y = 694;
  for (const sec of sections) {
    ops.push(
      `${PDF.tealMd} rg BT /F2 11 Tf ${LEFT} ${y} Td (${pdfText(
        sec.title.toUpperCase(),
      )}) Tj ET`,
    );
    ops.push(`${PDF.pale} rg ${LEFT} ${y - 7} ${RIGHT - LEFT} 1 re f`);
    y -= 26;
    for (const row of sec.rows) {
      ops.push(
        `${PDF.muted} rg BT /F1 10 Tf ${LEFT} ${y} Td (${pdfText(
          row.label,
        )}) Tj ET`,
      );
      ops.push(
        `${PDF.ink} rg BT /F2 11 Tf ${VALUE_X} ${y} Td (${pdfText(
          row.value,
        )}) Tj ET`,
      );
      y -= 24;
    }
    y -= 16;
  }

  // Cachet officiel de l'établissement, apposé en bas à droite au-dessus du
  // pied de page — l'emplacement usuel d'une signature sur un document officiel.
  if (hasStamp) {
    const BOX = 92;
    let dw = BOX;
    let dh = BOX;
    if (stampAspect > 1) dh = BOX / stampAspect;
    else dw = BOX * stampAspect;
    // Le bloc est calé sur la marge droite : l'image est centrée sur la
    // largeur de la légende, elle-même alignée à droite.
    const CAPTION = "Cachet de l'etablissement";
    const captionW = CAPTION.length * 8 * 0.5; // largeur approx. en Helvetica 8 pt
    const blockW = Math.max(dw, captionW);
    const blockX = RIGHT - blockW;
    const sx = blockX + (blockW - dw) / 2;
    const sy = 112;
    ops.push(
      `q ${dw.toFixed(2)} 0 0 ${dh.toFixed(2)} ${sx.toFixed(2)} ${sy.toFixed(
        2,
      )} cm /Im1 Do Q`,
    );
    ops.push(
      `${PDF.muted} rg BT /F1 8 Tf ${(RIGHT - captionW).toFixed(2)} ${(
        sy - 12
      ).toFixed(2)} Td (${pdfText(CAPTION)}) Tj ET`,
    );
  }

  ops.push(`${PDF.teal} rg ${LEFT} 96 ${RIGHT - LEFT} 2 re f`);
  ops.push(
    `${PDF.muted} rg BT /F1 8 Tf ${LEFT} 80 Td (${pdfText(
      "Document genere par la plateforme ISTEPM Agadir - usage interne.",
    )}) Tj ET`,
  );
  ops.push(
    `${PDF.muted} rg BT /F1 8 Tf ${LEFT} 68 Td (${pdfText(
      `Edite le ${new Date().toLocaleDateString("fr-FR")}`,
    )}) Tj ET`,
  );

  return ops.join("\n");
}

export async function makeStageDocPdf(s: Stage, kind: Kind): Promise<Blob> {
  const logo = await loadLogo();
  const stampRaw = getStamp();
  const stamp = stampRaw ? await rasterizeDataUrl(stampRaw, 220) : null;

  const sections = stageSections(s, kind);
  const content = buildContentStream(
    KIND_TITLE[kind],
    sections,
    !!logo,
    logo ? logo.w / logo.h : 1,
    !!stamp,
    stamp ? stamp.w / stamp.h : 1,
  );
  const contentBytes = enc.encode(content);

  // Images embarquées : logo (/Im0) puis cachet (/Im1). Les numéros d'objet
  // commencent à 7 (après le catalogue, les pages, le contenu et les 2 polices).
  const images: { name: string; raster: LogoRaster }[] = [];
  if (logo) images.push({ name: "Im0", raster: logo });
  if (stamp) images.push({ name: "Im1", raster: stamp });
  const imgObjNum: Record<string, number> = {};
  images.forEach((im, i) => {
    imgObjNum[im.name] = 7 + i;
  });

  const parts: Uint8Array[] = [];
  let len = 0;
  const offsets: number[] = [];
  const push = (chunk: string | Uint8Array) => {
    const u = typeof chunk === "string" ? enc.encode(chunk) : chunk;
    parts.push(u);
    len += u.length;
  };
  const startObject = (n: number) => {
    offsets[n] = len;
  };

  push("%PDF-1.4\n");

  startObject(1);
  push("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");

  startObject(2);
  push("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n");

  const xobjs = images
    .map((im) => `/${im.name} ${imgObjNum[im.name]} 0 R`)
    .join(" ");
  const resources = images.length
    ? `/Font << /F1 5 0 R /F2 6 0 R >> /XObject << ${xobjs} >>`
    : "/Font << /F1 5 0 R /F2 6 0 R >>";
  startObject(3);
  push(
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] ` +
      `/Contents 4 0 R /Resources << ${resources} >> >>\nendobj\n`,
  );

  startObject(4);
  push(`4 0 obj\n<< /Length ${contentBytes.length} >>\nstream\n`);
  push(contentBytes);
  push("\nendstream\nendobj\n");

  startObject(5);
  push(
    "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
  );

  startObject(6);
  push(
    "6 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n",
  );

  for (const im of images) {
    const n = imgObjNum[im.name];
    startObject(n);
    push(
      `${n} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${im.raster.w} ` +
        `/Height ${im.raster.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 ` +
        `/Filter /DCTDecode /Length ${im.raster.jpeg.length} >>\nstream\n`,
    );
    push(im.raster.jpeg);
    push("\nendstream\nendobj\n");
  }

  const count = 6 + images.length;
  const xrefStart = len;
  let xref = `xref\n0 ${count + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= count; i++) {
    xref += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  push(xref);
  push(
    `trailer\n<< /Size ${count + 1} /Root 1 0 R >>\n` +
      `startxref\n${xrefStart}\n%%EOF\n`,
  );

  return new Blob(parts as BlobPart[], { type: "application/pdf" });
}

/**
 * Reçu de paiement — génère un PDF estampillé pour un règlement mensuel.
 *
 * Utilise le même logo, le même cachet et la même mise en page que les
 * conventions de stage, avec les données de l'étudiant et de la ligne de
 * paiement.
 */
export async function makePaiementDocPdf(params: {
  prenom: string;
  nom: string;
  cne: string;
  filiere: string;
  mois: string;
  montantDu: number;
  montantPaye: number;
  datePaiement: string;
  statut: StatutPaiement;
}): Promise<Blob> {
  const logo = await loadLogo();
  const stampRaw = getStamp();
  const stamp = stampRaw ? await rasterizeDataUrl(stampRaw, 220) : null;

  const sections: Section[] = [
    {
      title: "Étudiant",
      rows: [
        { label: "Nom complet", value: `${params.prenom} ${params.nom}` },
        { label: "CNE", value: params.cne },
        { label: "Filière", value: params.filiere },
      ],
    },
    {
      title: "Paiement",
      rows: [
        { label: "Mois concerné", value: params.mois },
        { label: "Montant dû", value: `${params.montantDu.toFixed(2)} MAD` },
        { label: "Montant réglé", value: `${params.montantPaye.toFixed(2)} MAD` },
        {
          label: "Date de paiement",
          value: params.datePaiement ? fmtDate(params.datePaiement) : "—",
        },
        {
          label: "Statut",
          value: STATUT_PAIEMENT_LABEL[params.statut],
        },
      ],
    },
  ];

  const content = buildContentStream(
    "Reçu de paiement",
    sections,
    !!logo,
    logo ? logo.w / logo.h : 1,
    !!stamp,
    stamp ? stamp.w / stamp.h : 1,
  );
  const contentBytes = enc.encode(content);

  const images: { name: string; raster: LogoRaster }[] = [];
  if (logo) images.push({ name: "Im0", raster: logo });
  if (stamp) images.push({ name: "Im1", raster: stamp });
  const imgObjNum: Record<string, number> = {};
  images.forEach((im, i) => {
    imgObjNum[im.name] = 7 + i;
  });

  const parts: Uint8Array[] = [];
  let len = 0;
  const offsets: number[] = [];
  const push = (chunk: string | Uint8Array) => {
    const u = typeof chunk === "string" ? enc.encode(chunk) : chunk;
    parts.push(u);
    len += u.length;
  };
  const startObject = (n: number) => {
    offsets[n] = len;
  };

  push("%PDF-1.4\n");

  startObject(1);
  push("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");

  startObject(2);
  push("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n");

  const xobjs = images
    .map((im) => `/${im.name} ${imgObjNum[im.name]} 0 R`)
    .join(" ");
  const resources = images.length
    ? `/Font << /F1 5 0 R /F2 6 0 R >> /XObject << ${xobjs} >>`
    : "/Font << /F1 5 0 R /F2 6 0 R >>";
  startObject(3);
  push(
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] ` +
      `/Contents 4 0 R /Resources << ${resources} >> >>\nendobj\n`,
  );

  startObject(4);
  push(`4 0 obj\n<< /Length ${contentBytes.length} >>\nstream\n`);
  push(contentBytes);
  push("\nendstream\nendobj\n");

  startObject(5);
  push(
    "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
  );

  startObject(6);
  push(
    "6 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n",
  );

  for (const im of images) {
    const n = imgObjNum[im.name];
    startObject(n);
    push(
      `${n} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${im.raster.w} ` +
        `/Height ${im.raster.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 ` +
        `/Filter /DCTDecode /Length ${im.raster.jpeg.length} >>\nstream\n`,
    );
    push(im.raster.jpeg);
    push("\nendstream\nendobj\n");
  }

  const count = 6 + images.length;
  const xrefStart = len;
  let xref = `xref\n0 ${count + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= count; i++) {
    xref += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  push(xref);
  push(
    `trailer\n<< /Size ${count + 1} /Root 1 0 R >>\n` +
      `startxref\n${xrefStart}\n%%EOF\n`,
  );

  return new Blob(parts as BlobPart[], { type: "application/pdf" });
}

/* ------------------------------------------------------------------ */
/*  Génération de l'e-mail                                             */
/* ------------------------------------------------------------------ */

const escapeHtml = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export function buildStageEmailHtml(
  s: Stage,
  kind: Kind,
  logoDataUrl: string | null,
): { html: string; text: string } {
  const title = KIND_TITLE[kind];
  const sections = stageSections(s, kind);

  const logoCell = logoDataUrl
    ? `<img src="${logoDataUrl}" width="46" height="40" alt="ISTEPM Agadir" style="display:block;border:0;" />`
    : `<span style="font:700 20px/1 Arial,Helvetica,sans-serif;color:${BRAND.teal};">ISTEPM</span>`;

  const rowsHtml = sections
    .map(
      (sec) => `
      <tr><td style="padding:22px 32px 0;">
        <p style="margin:0 0 4px;font:700 11px/1.4 Arial,Helvetica,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:${
          BRAND.tealMd
        };">${escapeHtml(sec.title)}</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:2px solid ${
          BRAND.tealPale
        };">
          ${sec.rows
            .map(
              (r) => `
          <tr>
            <td style="padding:9px 12px 9px 0;font:400 13px/1.4 Arial,Helvetica,sans-serif;color:#5a6d6c;white-space:nowrap;vertical-align:top;">${escapeHtml(
              r.label,
            )}</td>
            <td style="padding:9px 0;font:600 13px/1.4 Arial,Helvetica,sans-serif;color:${
              BRAND.ink
            };text-align:right;">${escapeHtml(r.value)}</td>
          </tr>`,
            )
            .join("")}
        </table>
      </td></tr>`,
    )
    .join("");

  const html = `<!doctype html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${BRAND.tealWash};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${
    BRAND.tealWash
  };padding:28px 12px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 10px 30px -12px rgba(18,59,58,.35);">

        <tr><td style="padding:24px 32px 20px;background:#ffffff;">
          <table role="presentation" cellpadding="0" cellspacing="0"><tr>
            <td style="padding-right:14px;vertical-align:middle;">${logoCell}</td>
            <td style="vertical-align:middle;">
              <div style="font:700 17px/1.2 Arial,Helvetica,sans-serif;color:${
                BRAND.ink
              };">ISTEPM Agadir</div>
              <div style="font:400 11px/1.3 Arial,Helvetica,sans-serif;color:#6b7d7c;letter-spacing:.04em;">Techniques paramédicales</div>
            </td>
          </tr></table>
        </td></tr>
        <tr><td style="height:4px;background:${BRAND.red};font-size:0;line-height:0;">&nbsp;</td></tr>
        <tr><td style="height:6px;background:${
          BRAND.teal
        };font-size:0;line-height:0;">&nbsp;</td></tr>

        <tr><td style="padding:26px 32px 4px;">
          <h1 style="margin:0;font:700 20px/1.3 Arial,Helvetica,sans-serif;color:${
            BRAND.ink
          };">${escapeHtml(title)}</h1>
          <p style="margin:8px 0 0;font:400 14px/1.6 Arial,Helvetica,sans-serif;color:#5a6d6c;">
            Bonjour,<br>
            Veuillez trouver ci-joint ${
              kind === "convention"
                ? "la convention de stage"
                : "le rapport de stage"
            } de <strong style="color:${BRAND.ink};">${escapeHtml(
              `${s.prenom} ${s.nom}`,
            )}</strong>${
              s.structure
                ? ` (${escapeHtml(s.structure)})`
                : ""
            }.
          </p>
        </td></tr>

        ${rowsHtml}

        <tr><td style="padding:24px 32px 4px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${
            BRAND.tealWash
          };border:1px solid ${BRAND.tealPale};border-radius:12px;">
            <tr><td style="padding:14px 16px;font:600 13px/1.4 Arial,Helvetica,sans-serif;color:${
              BRAND.tealMd
            };">
              📎 ${escapeHtml(title)} — document PDF joint à cet e-mail.
            </td></tr>
          </table>
        </td></tr>

        <tr><td style="padding:26px 32px;background:${
          BRAND.ink
        };margin-top:24px;">
          <div style="font:700 13px/1.4 Arial,Helvetica,sans-serif;color:#ffffff;">ISTEPM Agadir</div>
          <div style="font:400 12px/1.6 Arial,Helvetica,sans-serif;color:${
            BRAND.tealPale
          };">Institut spécialisé des techniques paramédicales</div>
          <div style="margin-top:8px;font:400 11px/1.5 Arial,Helvetica,sans-serif;color:#8fb3b1;">
            E-mail automatique — merci de ne pas y répondre.
          </div>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = [
    "ISTEPM Agadir — Techniques paramédicales",
    "",
    title,
    "",
    `Veuillez trouver ci-joint ${
      kind === "convention" ? "la convention" : "le rapport"
    } de stage de ${s.prenom} ${s.nom}.`,
    "",
    ...sections.flatMap((sec) => [
      sec.title.toUpperCase(),
      ...sec.rows.map((r) => `  ${r.label} : ${r.value}`),
      "",
    ]),
    "Document PDF joint à cet e-mail.",
    "",
    "ISTEPM Agadir — e-mail automatique, merci de ne pas y répondre.",
  ].join("\n");

  return { html, text };
}
