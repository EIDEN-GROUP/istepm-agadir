import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { getEnv } from "@/config/env";
import * as schema from "./schema/index";

let _db: ReturnType<typeof drizzle> | undefined;
let _pool: pg.Pool | undefined;

export function getDb() {
  if (!_db) {
    const env = getEnv();
    _pool = new pg.Pool({ connectionString: env.DATABASE_URL });
    _db = drizzle(_pool, { schema });
  }
  return _db;
}

export function getPool() {
  if (!_pool) {
    getDb();
  }
  return _pool!;
}

export async function closeDb() {
  if (_pool) {
    await _pool.end();
    _pool = undefined;
    _db = undefined;
  }
}
