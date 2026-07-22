/**
 * Data migration script: Supabase PostgreSQL → self-hosted PostgreSQL
 *
 * Usage:
 *   export SOURCE_DATABASE_URL="postgres://...@aws-0.eu-west-3.rds.amazonaws.com:5432/postgres"
 *   export DATABASE_URL="postgres://postgres:postgres@localhost:5432/school_crm"
 *   npx tsx scripts/migrate-from-supabase.ts
 *
 * Environment:
 *   SOURCE_DATABASE_URL  – Supabase connection string (with session/ssl params)
 *   DATABASE_URL         – Target self-hosted PostgreSQL
 */

import "dotenv/config";
import pg from "pg";

const tables = [
  "users",
  "centers",
  "center_admins",
  "clients",
  "levels",
  "settings",
  "employees",
  "holidays",
  "school_vacations",
  "calendar_exceptions",
  "payments",
  "invoices",
  "appointments",
  "planifications",
  "whatsapp_messages",
  "email_logs",
  "demo_requests",
  "support_sessions",
  "support_messages",
] as const;

async function main() {
  const sourceUrl = process.env.SOURCE_DATABASE_URL;
  const targetUrl = process.env.DATABASE_URL;

  if (!sourceUrl) throw new Error("Missing SOURCE_DATABASE_URL");
  if (!targetUrl) throw new Error("Missing DATABASE_URL");

  const sourcePool = new pg.Pool({ connectionString: sourceUrl });
  const targetPool = new pg.Pool({ connectionString: targetUrl });

  const sourceClient = await sourcePool.connect();
  const targetClient = await targetPool.connect();

  const BATCH = 500;
  let totalRows = 0;

  try {
    for (const table of tables) {
      process.stdout.write(`Migrating ${table} … `);

      const { rows } = await sourceClient.query(`SELECT * FROM ${table}`);
      if (rows.length === 0) {
        process.stdout.write("0 rows\n");
        continue;
      }

      const columns = Object.keys(rows[0]);
      const placeholders = columns.map((_, i) => `$${i + 1}`).join(", ");
      const insertSQL = `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`;

      for (let i = 0; i < rows.length; i += BATCH) {
        const batch = rows.slice(i, i + BATCH);
        for (const row of batch) {
          await targetClient.query(insertSQL, columns.map((c) => row[c]));
        }
      }

      totalRows += rows.length;
      process.stdout.write(`${rows.length} rows\n`);
    }

    console.log(`\nDone. ${totalRows} total rows migrated.`);
  } finally {
    sourceClient.release();
    targetClient.release();
    await sourcePool.end();
    await targetPool.end();
  }
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
