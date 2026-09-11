import bcrypt from "bcrypt";
import { getDb } from "@/db";
import { users } from "@/db/schema/users";
import { formateurs } from "@/db/schema/formateurs";
import { etudiants } from "@/db/schema/etudiants";
import { eq } from "drizzle-orm";
import { getEnv } from "@/config/env";

const SALT_ROUNDS = 12;

export type CreateUserInput = {
  email: string;
  password: string;
  name: string;
  role?: "directeur" | "enseignant" | "responsable" | "etudiant";
  filiere?: string;
  niveau?: string;
  groupe?: string;
  /** CNE ou id étudiant à lier quand role === "etudiant". */
  etudiantId?: string;
  cne?: string;
  /** Usage interne (invitations) : ne pas auto-créer la fiche liée. */
  skipAutoCreate?: boolean;
};

export type UserResult = {
  id: string;
  email: string;
  name: string;
  role: string;
  photoUrl: string;
  createdAt: Date;
};

function toUserResult(row: typeof users.$inferSelect): UserResult {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    photoUrl: row.photoUrl ?? "",
    createdAt: row.createdAt,
  };
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createUser(input: CreateUserInput): Promise<UserResult> {
  const db = getDb();
  const passwordHash = await hashPassword(input.password);
  const [user] = await db
    .insert(users)
    .values({
      email: input.email,
      passwordHash,
      name: input.name,
      role: input.role ?? "directeur",
    })
    .returning();
  if (input.role === "enseignant" && !input.skipAutoCreate) {
    const [prenom, ...reste] = input.name.split(" ");
    const groupes: string[] = [];
    if (input.groupe) groupes.push(input.groupe);
    await db.insert(formateurs).values({
      userId: user.id,
      prenom: prenom ?? input.name,
      nom: reste.join(" ") || "",
      email: input.email,
      departement: input.filiere ?? "",
      groupes,
    });
  }
  if (input.role === "etudiant") {
    // Lie le compte à une fiche étudiant existante (par id, CNE ou email).
    // La fiche garde toutes les infos scolaires ; user_id sert au scope self-service.
    if (input.etudiantId) {
      await db.update(etudiants).set({ userId: user.id }).where(eq(etudiants.id, input.etudiantId));
    } else if (input.cne) {
      await db.update(etudiants).set({ userId: user.id }).where(eq(etudiants.cne, input.cne));
    } else {
      await db.update(etudiants).set({ userId: user.id }).where(eq(etudiants.email, input.email));
    }
  }
  return toUserResult(user);
}

export async function findByEmail(email: string) {
  const db = getDb();
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  return user ?? null;
}

export async function findById(id: string) {
  const db = getDb();
  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return user ?? null;
}

export type LoginResult =
  | { ok: true; user: UserResult }
  | { ok: false; reason: "invalid" | "archived" };

export async function login(email: string, password: string): Promise<LoginResult> {
  const user = await findByEmail(email);
  if (!user) return { ok: false, reason: "invalid" };
  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return { ok: false, reason: "invalid" };
  // Compte archivé (étudiant ou enseignant) = accès coupé jusqu'à
  // désarchivage. Testé APRÈS le mot de passe pour ne pas révéler
  // l'existence du compte.
  if (user.role === "etudiant" || user.role === "enseignant") {
    const db = getDb();
    if (user.role === "etudiant") {
      const [fiche] = await db
        .select({ archived: etudiants.archived })
        .from(etudiants)
        .where(eq(etudiants.userId, user.id))
        .limit(1);
      if (fiche?.archived) return { ok: false, reason: "archived" };
    } else {
      const [fiche] = await db
        .select({ archived: formateurs.archived })
        .from(formateurs)
        .where(eq(formateurs.userId, user.id))
        .limit(1);
      if (fiche?.archived) return { ok: false, reason: "archived" };
    }
  }
  return { ok: true, user: toUserResult(user) };
}

export async function listAllUsers(): Promise<UserResult[]> {
  const db = getDb();
  const rows = await db.select().from(users).orderBy(users.createdAt);
  return rows.map(toUserResult);
}

export async function updateUser(
  id: string,
  data: { name?: string; password?: string },
) {
  const db = getDb();
  const values: Record<string, unknown> = {};
  if (data.name !== undefined) values.name = data.name;
  if (data.password !== undefined)
    values.passwordHash = await hashPassword(data.password);
  const [updated] = await db
    .update(users)
    .set(values)
    .where(eq(users.id, id))
    .returning();
  return updated ? toUserResult(updated) : null;
}

export async function deleteUser(id: string) {
  const db = getDb();
  await db.delete(users).where(eq(users.id, id));
}

/**
 * Mise à jour self-service d'un compte : l'utilisateur ne peut changer que son
 * email et son mot de passe (jamais son nom ni son rôle). L'appelant a déjà
 * vérifié le mot de passe actuel et l'unicité de l'email.
 */
export async function updateSelfProfile(
  id: string,
  data: { email?: string; newPassword?: string; photoUrl?: string },
): Promise<UserResult | null> {
  const db = getDb();
  const values: Record<string, unknown> = { updatedAt: new Date() };
  if (data.email !== undefined) values.email = data.email;
  if (data.photoUrl !== undefined) values.photoUrl = data.photoUrl;
  if (data.newPassword !== undefined)
    values.passwordHash = await hashPassword(data.newPassword);
  const [updated] = await db
    .update(users)
    .set(values)
    .where(eq(users.id, id))
    .returning();
  if (!updated) return null;
  // La fiche formateur porte une copie de l'email (affichage / rapprochement) :
  // on la garde synchrone quand c'est un enseignant lié.
  if (data.email !== undefined && updated.role === "enseignant") {
    await db
      .update(formateurs)
      .set({ email: data.email })
      .where(eq(formateurs.userId, id));
  }
  // La photo d'un étudiant doit apparaître partout dans l'app (listes, bulletins,
  // paiements, stages…) : ces écrans lisent `etudiants.photo_url`. On y recopie
  // donc la photo du compte, comme le fait déjà PUT /student/me/photo.
  if (data.photoUrl !== undefined && updated.role === "etudiant") {
    await db
      .update(etudiants)
      .set({ photoUrl: data.photoUrl })
      .where(eq(etudiants.userId, id));
  }
  return toUserResult(updated);
}
