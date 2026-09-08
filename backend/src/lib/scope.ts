import { getDb } from "@/db";
import { etudiants } from "@/db/schema/etudiants";
import { formateurs } from "@/db/schema/formateurs";
import { eq } from "drizzle-orm";

/** Fiche liée au compte (rôle `etudiant`), ou `null`. */
export async function ownEtudiantId(userId: string): Promise<string | null> {
  const db = getDb();
  const [e] = await db
    .select({ id: etudiants.id })
    .from(etudiants)
    .where(eq(etudiants.userId, userId))
    .limit(1);
  return e?.id ?? null;
}

export type TeacherScope = {
  id: string;
  groupes: string[];
  departement: string;
} | null;

/** Portée d'un compte `enseignant` (résolue via `formateurs.userId`). */
export async function teacherScope(userId: string): Promise<TeacherScope> {
  const db = getDb();
  const [f] = await db
    .select({ id: formateurs.id, groupes: formateurs.groupes, departement: formateurs.departement })
    .from(formateurs)
    .where(eq(formateurs.userId, userId))
    .limit(1);
  if (!f) return null;
  return { id: f.id, groupes: f.groupes ?? [], departement: f.departement ?? "" };
}

/**
 * Un enseignant voit un étudiant ssi (même règle que la liste) :
 * groupe enseigné (ou aucun groupe = tous) ET même filière (ou pas de département).
 */
export function etudiantInScope(
  e: { groupe: string; filiere: string },
  scope: Exclude<TeacherScope, null>,
): boolean {
  const sameGroupe = scope.groupes.length === 0 || scope.groupes.includes(e.groupe);
  const sameFiliere = !scope.departement || scope.departement === e.filiere;
  return sameGroupe && sameFiliere;
}
