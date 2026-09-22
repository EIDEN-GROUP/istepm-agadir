/**
 * Équivalences transitoires ancien modèle (S1–S6) ↔ nouveau (années d'étude),
 * le temps que toutes les données soient re-saisies. Idempotent sur données
 * neuves. Miroir de `libelleNiveau`/`normGroupe`/`anneeDeCode` côté front.
 */
const ANNEE_DE_CODE: Record<string, string> = {
  S1: "1ère année",
  S2: "1ère année",
  S3: "2ème année",
  S4: "2ème année",
  S5: "3ème année",
  S6: "3ème année",
};

/** Libellé année d'étude d'une valeur de niveau (codes S historiques inclus). */
export function libelleNiveauBackend(v: string | null | undefined): string {
  const t = String(v ?? "").trim();
  return ANNEE_DE_CODE[t.toUpperCase()] ?? t;
}

/** Anciens codes semestres équivalant au libellé demandé (ou `[]`). */
export function codesHistoriques(libelle: string): string[] {
  const t = libelle.trim();
  return Object.entries(ANNEE_DE_CODE)
    .filter(([, annee]) => annee === t)
    .map(([code]) => code);
}

/** Retire un préfixe « S5- » hérité des anciens libellés de groupe. */
export function stripPrefixe(groupe: string | null | undefined): string {
  const t = String(groupe ?? "").trim();
  const m = /^S[1-6]-(.+)$/i.exec(t);
  return m ? m[1].trim() : t;
}
