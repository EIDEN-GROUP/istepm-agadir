import { randomBytes } from "node:crypto";
import IORedis from "ioredis";
import { getEnv } from "@/config/env";

/**
 * Gate session + rate-limit store.
 *
 * Production: Redis (shared across all backend replicas, so instances cannot
 * disagree about session validity, revocation or rate limits).
 * Tests: in-memory fallback so the suite is hermetic (never a production
 * defense on its own — see `useRedis`).
 */

export interface GateSession {
  username: string;
  fingerprint: string;
  createdAt: number;
  lastActivity: number;
  ip: string;
}

interface RateState {
  count: number;
  firstAt: number;
  blockedUntil: number;
}

const redisEnabled =
  getEnv().NODE_ENV !== "test" && Boolean(getEnv().REDIS_URL);

let redis: IORedis | null = null;

function getRedis(): IORedis {
  if (!redis) {
    redis = new IORedis(getEnv().REDIS_URL, {
      lazyConnect: false,
      maxRetriesPerRequest: 2,
      enableOfflineQueue: false,
    });
    redis.on("error", (err) => {
      // Do not crash the process; protected requests will fail closed.
      console.error("[project-gate] redis error:", err.message);
    });
  }
  return redis;
}

// ── In-memory fallback (tests only) ────────────────────────────────────────
const memSessions = new Map<string, { session: GateSession; expiresAt: number }>();
const memRate = new Map<string, RateState>();

function memPrune(): void {
  const now = Date.now();
  for (const [id, v] of memSessions) if (v.expiresAt <= now) memSessions.delete(id);
  for (const [k, v] of memRate) {
    if (v.blockedUntil && v.blockedUntil > now) continue;
    if (now - v.firstAt > 60 * 60 * 1000) memRate.delete(k);
  }
}

// ── Sessions ──────────────────────────────────────────────────────────────
const SESSION_PREFIX = "project-gate:sess:";

export async function createGateSession(
  username: string,
  fingerprint: string,
  ip: string,
  absoluteTimeoutMinutes: number,
): Promise<{ id: string; session: GateSession }> {
  const id = randomBytes(32).toString("hex");
  const now = Date.now();
  const session: GateSession = {
    username,
    fingerprint,
    createdAt: now,
    lastActivity: now,
    ip,
  };

  if (redisEnabled) {
    // Key TTL is the absolute timeout: a session can never outlive it.
    await getRedis().set(
      `${SESSION_PREFIX}${id}`,
      JSON.stringify(session),
      "EX",
      absoluteTimeoutMinutes * 60,
    );
  } else {
    memPrune();
    memSessions.set(id, {
      session,
      expiresAt: now + absoluteTimeoutMinutes * 60 * 1000,
    });
  }
  return { id, session };
}

export async function getGateSession(id: string): Promise<GateSession | null> {
  if (redisEnabled) {
    const raw = await getRedis().get(`${SESSION_PREFIX}${id}`);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as GateSession;
    } catch {
      return null;
    }
  }
  memPrune();
  return memSessions.get(id)?.session ?? null;
}

export async function touchGateSession(
  id: string,
  session: GateSession,
  absoluteTimeoutMinutes: number,
): Promise<void> {
  session.lastActivity = Date.now();
  if (redisEnabled) {
    // Keep the absolute TTL (don't extend): only refresh the payload.
    const ttl = await getRedis().ttl(`${SESSION_PREFIX}${id}`);
    if (ttl > 0) {
      await getRedis().set(
        `${SESSION_PREFIX}${id}`,
        JSON.stringify(session),
        "EX",
        ttl,
      );
    }
    return;
  }
  const entry = memSessions.get(id);
  if (entry) entry.session = session;
}

export async function destroyGateSession(id: string): Promise<void> {
  if (redisEnabled) {
    await getRedis().del(`${SESSION_PREFIX}${id}`);
    return;
  }
  memSessions.delete(id);
}

/** Revoke every gate session (used after credential rotation / emergency). */
export async function destroyAllGateSessions(): Promise<number> {
  if (redisEnabled) {
    const client = getRedis();
    let cursor = "0";
    let removed = 0;
    do {
      const [next, keys] = await client.scan(cursor, "MATCH", `${SESSION_PREFIX}*`, "COUNT", 200);
      cursor = next;
      if (keys.length > 0) removed += await client.del(...keys);
    } while (cursor !== "0");
    return removed;
  }
  const n = memSessions.size;
  memSessions.clear();
  return n;
}

// ── Rate limiting ─────────────────────────────────────────────────────────
const RATE_PREFIX = "project-gate:rate:";
const BLOCK_PREFIX = "project-gate:block:";

export async function getRateBlock(key: string): Promise<number | null> {
  if (redisEnabled) {
    const ttl = await getRedis().ttl(`${BLOCK_PREFIX}${key}`);
    return ttl > 0 ? ttl : null;
  }
  memPrune();
  const st = memRate.get(key);
  if (st?.blockedUntil && st.blockedUntil > Date.now()) {
    return Math.ceil((st.blockedUntil - Date.now()) / 1000);
  }
  return null;
}

export async function registerFailedAttempt(
  key: string,
  maxAttempts: number,
  windowMinutes: number,
): Promise<void> {
  const windowSec = windowMinutes * 60;
  if (redisEnabled) {
    const client = getRedis();
    const count = await client.incr(`${RATE_PREFIX}${key}`);
    if (count === 1) await client.expire(`${RATE_PREFIX}${key}`, windowSec);
    if (count >= maxAttempts) {
      await client.set(`${BLOCK_PREFIX}${key}`, "1", "EX", windowSec);
    }
    return;
  }
  memPrune();
  const now = Date.now();
  const windowMs = windowSec * 1000;
  const st = memRate.get(key);
  if (!st || now - st.firstAt > windowMs) {
    memRate.set(key, { count: 1, firstAt: now, blockedUntil: 0 });
    return;
  }
  st.count += 1;
  if (st.count >= maxAttempts) st.blockedUntil = now + windowMs;
  memRate.set(key, st);
}

export async function clearRate(key: string): Promise<void> {
  if (redisEnabled) {
    await getRedis().del(`${RATE_PREFIX}${key}`, `${BLOCK_PREFIX}${key}`);
    return;
  }
  memRate.delete(key);
}

export async function closeGateStore(): Promise<void> {
  if (redis && redisEnabled) {
    await redis.quit().catch(() => {});
  }
  redis = null;
}
