/**
 * Cellule CSV sûre : guillemets + neutralisation des formules.
 * Voir backend `src/lib/csv.ts` (même règle des deux côtés).
 */
export function escCsvCell(v: unknown): string {
  let s = String(v ?? "");
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
