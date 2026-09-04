import fs from "node:fs";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { getDb, getPool, closeDb } from "./index";

const MIGRATIONS_FOLDER = "./migrations";

/** Journal tag up to which a pre-existing database is assumed migrated.
 *
 * Prod received 0000..0013 via manual SQL while `drizzle.__drizzle_migrations`
 * did not exist, so a naive runner would replay everything and fail on
 * existing objects. When the history table is empty but the 0013 markers are
 * present, record those hashes as applied and let the runner apply the rest.
 */
const BASELINED_THROUGH_TAG = "0013_student_workspace";

async function baselineIfNeeded(): Promise<void> {
  const pool = getPool();
  await pool.query(`CREATE SCHEMA IF NOT EXISTS drizzle`);
  await pool.query(
    `CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (id SERIAL PRIMARY KEY, hash text NOT NULL, created_at bigint)`,
  );
  const { rows: counted } = await pool.query(
    `SELECT COUNT(*)::int AS n FROM drizzle.__drizzle_migrations`,
  );
  if (Number(counted[0]?.n ?? 0) > 0) return; // runner history present → normal path

  const { rows: markers } = await pool.query(
    `SELECT
       EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'etudiants' AND column_name = 'user_id') AS has_user_id,
       EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'student_requests') AS has_requests`,
  );
  if (!markers[0]?.has_user_id || !markers[0]?.has_requests) return; // fresh DB → full run

  const journal = JSON.parse(
    fs.readFileSync(`${MIGRATIONS_FOLDER}/meta/_journal.json`, "utf8"),
  ) as { entries: { tag: string }[] };
  const cutoff = journal.entries.findIndex((e) => e.tag === BASELINED_THROUGH_TAG);
  if (cutoff < 0) {
    console.log(`Baseline skipped: tag ${BASELINED_THROUGH_TAG} not in journal`);
    return;
  }
  // Same hash algorithm as the runner (sha256 of the full SQL file).
  const files = readMigrationFiles({ migrationsFolder: MIGRATIONS_FOLDER });
  for (let i = 0; i <= cutoff; i++) {
    await pool.query(
      `INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ($1, $2)`,
      [files[i].hash, files[i].folderMillis],
    );
  }
  console.log(
    `Baselined ${cutoff + 1} migrations through ${BASELINED_THROUGH_TAG}; runner will apply the rest.`,
  );
}

async function main() {
  const db = getDb();
  console.log("Running migrations...");
  await baselineIfNeeded();
  await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  console.log("Migrations complete.");
  await closeDb();
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
