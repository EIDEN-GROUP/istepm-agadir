/**
 * Échappement HTML pour les gabarits construits par concaténation
 * (impression bulletin, aperçus). React n'échappe PAS ces chaînes :
 * toute donnée API/importée qui y entre doit passer par ici.
 */
export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
