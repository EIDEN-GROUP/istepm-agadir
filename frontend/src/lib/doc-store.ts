/**
 * Stockage local des sujets d'examen déposés.
 *
 * Les fichiers vivent dans **IndexedDB**, pas dans le localStorage : celui-ci
 * est limité à ~5 Mo et ne stocke que du texte (un PDF encodé en base64 gonfle
 * d'environ 33 %). IndexedDB accepte les `Blob` nativement et dispose d'un
 * quota bien plus large.
 *
 * Seules les **métadonnées** (nom, taille, type, date de dépôt) sont conservées
 * dans le store principal, avec l'`id` qui pointe vers le fichier ici. Rien ne
 * sort du navigateur : aucun backend n'est appelé.
 */

const DB_NAME = "istpm-docs";
const STORE = "documents";
const DB_VERSION = 1;

/** Types acceptés au dépôt (PDF et Word). */
export const ACCEPTED_DOC_TYPES =
  ".pdf,.doc,.docx,application/pdf,application/msword," +
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/** Taille maximale d'un dépôt (10 Mo). */
export const MAX_DOC_SIZE = 10 * 1024 * 1024;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) {
        req.result.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const req = run(t.objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
        t.oncomplete = () => db.close();
      }),
  );
}

export function putDoc(id: string, blob: Blob): Promise<unknown> {
  return tx("readwrite", (s) => s.put(blob, id));
}

export function getDoc(id: string): Promise<Blob | undefined> {
  return tx<Blob | undefined>("readonly", (s) => s.get(id));
}

export function deleteDoc(id: string): Promise<unknown> {
  return tx("readwrite", (s) => s.delete(id));
}

export async function hasDoc(id: string): Promise<boolean> {
  return (await getDoc(id)) !== undefined;
}

/* ------------------------------------------------------------------ */
/*  Ouverture / téléchargement                                         */
/* ------------------------------------------------------------------ */

/**
 * Déclenche le téléchargement d'un document.
 *
 * Passe par un `<a download>` plutôt que `window.open` : l'ouverture d'onglet
 * après un `await` a perdu le geste utilisateur et se fait bloquer par les
 * navigateurs, alors qu'un téléchargement ancré reste autorisé.
 */
export async function downloadDoc(id: string, filename: string) {
  const blob = await getDoc(id);
  if (!blob) return false;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Laisser au navigateur le temps de démarrer le téléchargement.
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
  return true;
}

/** URL objet pour l'aperçu intégré. À révoquer par l'appelant. */
export async function previewUrl(id: string): Promise<string | null> {
  const blob = await getDoc(id);
  return blob ? URL.createObjectURL(blob) : null;
}

/* ------------------------------------------------------------------ */
/*  Génération des sujets de démonstration                             */
/* ------------------------------------------------------------------ */

/** Échappe les caractères réservés d'une chaîne littérale PDF. */
function escapePdf(s: string) {
  return s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

/**
 * Réduit le texte à l'ASCII imprimable.
 * La police Helvetica de base utilise l'encodage WinAnsi : un octet UTF-8 brut
 * s'y afficherait en charabia, donc les accents sont retirés.
 */
function toAscii(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/gu, "") // marques diacritiques combinantes
    .replace(/[^\x20-\x7E]/g, "-");
}

/**
 * Construit un PDF d'une page, valide et minimal, à partir de lignes de texte.
 *
 * Utilisé uniquement pour donner un contenu ouvrable aux sujets fournis avec
 * le jeu de démonstration   les dépôts réels sont les fichiers de l'utilisateur.
 * Le contenu est en ASCII, donc longueur de chaîne = nombre d'octets, ce qui
 * permet de calculer les décalages de la table xref directement.
 */
export function makePlaceholderPdf(lines: string[]): Blob {
  const content = lines
    .map((line, i) => {
      const size = i === 0 ? 16 : 11;
      const y = 780 - i * 26;
      return `BT /F1 ${size} Tf 60 ${y} Td (${escapePdf(toAscii(line))}) Tj ET`;
    })
    .join("\n");

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] " +
      "/Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((body, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });

  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) {
    pdf += `${String(off).padStart(10, "0")} 00000 n \n`;
  }
  pdf +=
    `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n` +
    `startxref\n${xrefStart}\n%%EOF\n`;

  return new Blob([pdf], { type: "application/pdf" });
}

type SeedExam = {
  titre: string;
  module: string;
  filiere: string;
  niveau: string;
  classe: string;
  date: string;
  salle: string;
  document?: { id: string };
};

/**
 * Récupère le sujet réel livré dans `public/exam-sujets/`.
 *
 * L'`id` du document encode le nom de fichier : `doc-ex-<slug>` → le PDF vit à
 * `/exam-sujets/<slug>.pdf`. Renvoie `null` si le fichier est absent (l'appelant
 * se rabat alors sur un PDF de remplacement généré localement).
 */
async function fetchSeedSujet(docId: string): Promise<Blob | null> {
  const slug = docId.replace(/^doc-ex-/, "");
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}exam-sujets/${slug}.pdf`);
    if (!res.ok) return null;
    const blob = await res.blob();
    // Un 404 renvoyé en HTML (dev server) ne doit pas être stocké comme PDF.
    if (blob.type.includes("html") || blob.size === 0) return null;
    return blob;
  } catch {
    return null;
  }
}

/**
 * Crée les fichiers manquants des sujets livrés avec le jeu de démonstration,
 * pour que « Voir » et « Télécharger » fonctionnent dès la première ouverture.
 *
 * Le sujet réel (fourni dans `public/exam-sujets/`) est chargé en priorité ;
 * s'il est introuvable, un PDF de remplacement lisible est généré. Les fichiers
 * déjà présents (y compris ceux déposés par l'utilisateur) ne sont jamais
 * écrasés.
 */
export async function ensureSeedDocuments(
  exams: SeedExam[],
): Promise<Record<string, number>> {
  // Taille réelle de chaque fichier écrit, renvoyée pour que les métadonnées
  // affichées correspondent exactement au fichier téléchargé.
  const sizes: Record<string, number> = {};

  for (const exam of exams) {
    const doc = exam.document;
    if (!doc || !doc.id.startsWith("doc-ex-")) continue;
    try {
      const existing = await getDoc(doc.id);
      if (existing) {
        sizes[doc.id] = existing.size;
        continue;
      }
      const blob =
        (await fetchSeedSujet(doc.id)) ??
        makePlaceholderPdf([
          "ISTEPM Agadir  - Institut specialise des techniques paramedicales",
          "",
          exam.titre,
          "",
          `Module : ${exam.module}`,
          `Filiere : ${exam.filiere}`,
          `Classe : ${exam.classe} (${exam.niveau})`,
          `Date : ${exam.date}`,
          `Salle : ${exam.salle}`,
          "",
          "Document de demonstration genere localement.",
        ]);
      await putDoc(doc.id, blob);
      sizes[doc.id] = blob.size;
    } catch {
      // IndexedDB indisponible (navigation privée, quota) : l'interface
      // affichera « document indisponible » plutôt que d'échouer.
      return sizes;
    }
  }
  return sizes;
}
