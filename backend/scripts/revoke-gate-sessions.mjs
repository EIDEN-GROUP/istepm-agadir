#!/usr/bin/env node
/**
 * Emergency: revoke every global-gate session immediately.
 *
 * Usage (from the backend/ directory, with REDIS_URL available in the
 * environment or in ../../.env.production):
 *   node scripts/revoke-gate-sessions.mjs
 *
 * Note: rotating PROJECT_LOCK_USERNAME / PROJECT_LOCK_PASSWORD_HASH /
 * PROJECT_LOCK_SESSION_SECRET also invalidates all sessions automatically
 * (sessions are bound to a fingerprint of those values). This script is for
 * the "revoke now without rotating credentials" case.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import IORedis from "ioredis";

function loadRedisUrl() {
  if (process.env.REDIS_URL) return process.env.REDIS_URL;
  const candidates = [
    resolve(process.cwd(), "..", ".env.production"),
    resolve(process.cwd(), ".env.production"),
    resolve(process.cwd(), "..", "..", ".env.production"),
  ];
  for (const file of candidates) {
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
      const match = line.match(/^\s*REDIS_URL\s*=\s*(.+)\s*$/);
      if (match) return match[1].trim().replace(/^["']|["']$/g, "");
    }
  }
  return "redis://localhost:6379";
}

const redis = new IORedis(loadRedisUrl(), { maxRetriesPerRequest: 2 });

async function main() {
  let cursor = "0";
  let removed = 0;
  do {
    const [next, keys] = await redis.scan(cursor, "MATCH", "project-gate:sess:*", "COUNT", 200);
    cursor = next;
    if (keys.length > 0) removed += await redis.del(...keys);
  } while (cursor !== "0");
  process.stdout.write(`Revoked ${removed} gate session(s).\n`);
  await redis.quit();
}

main().catch(async (err) => {
  process.stderr.write(`Error: ${err.message}\n`);
  await redis.quit().catch(() => {});
  process.exit(1);
});
