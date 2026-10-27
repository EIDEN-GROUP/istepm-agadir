import { createHash, createHmac } from "node:crypto";

export const GATE_COOKIE_NAME = "project_gate_session";

/**
 * Fingerprint of the current gate credentials. Sessions are bound to it, so
 * rotating the username or password hash (or the session secret) invalidates
 * every existing session without needing an out-of-band revocation list.
 */
export function credentialsFingerprint(
  username: string,
  passwordHash: string,
  sessionSecret: string,
): string {
  return createHmac("sha256", sessionSecret)
    .update(`${username}:${passwordHash}`)
    .digest("hex")
    .slice(0, 32);
}

/** One-way hash for rate-limit keys so raw IPs/usernames never hit the store. */
export function hashRateKey(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 40);
}
