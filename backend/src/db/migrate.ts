import { migrate } from "drizzle-orm/node-postgres/migrator";
import { getDb, closeDb } from "./index";

async function main() {
  const db = getDb();
  console.log("Running migrations...");
  await migrate(db, { migrationsFolder: "./migrations" });
  console.log("Migrations complete.");
  await closeDb();
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
