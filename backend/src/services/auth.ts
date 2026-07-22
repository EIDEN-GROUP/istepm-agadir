import bcrypt from "bcrypt";
import { getDb } from "@/db";
import { users } from "@/db/schema/users";
import { eq } from "drizzle-orm";
import { getEnv } from "@/config/env";

const SALT_ROUNDS = 10;

export type CreateUserInput = {
  email: string;
  password: string;
  name: string;
  role?: "admin" | "superadmin";
};

export type UserResult = {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: Date;
};

function toUserResult(row: typeof users.$inferSelect): UserResult {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
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
      role: input.role ?? "admin",
    })
    .returning();
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

export async function login(email: string, password: string) {
  const user = await findByEmail(email);
  if (!user) return null;
  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return null;
  return toUserResult(user);
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
