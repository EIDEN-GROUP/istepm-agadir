/**
 * Nom de fichier sûr pour les téléchargements (`a.download`) et les
 * en-têtes Content-Disposition : normalise, bannit les caractères de contrôle
 * et de chemin, tronque, et force une extension de la liste blanche.
 */
export function sanitizeFilename(name: string, ext: ".pdf" | ".csv" | ".doc" | ".docx"): string {
  const base = String(name ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
  return `${base || "document"}${ext}`;
}
