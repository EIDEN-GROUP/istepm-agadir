/**
 * Cellule CSV sûre : guillemets + neutralisation des formules.
 *
 * Une cellule commençant par `= + - @` (ou tab/CR) s'exécute comme formule à
 * l'ouverture dans Excel : préfixer d'une apostrophe (marqueur « texte »,
 * invisible dans Excel) bloque l'exécution sans altérer la donnée.
 */
export function escCsvCell(v: unknown): string {
  let s = String(v ?? "");
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
