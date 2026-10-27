#!/usr/bin/env node
/**
 * Generate a bcrypt hash for PROJECT_LOCK_PASSWORD_HASH.
 *
 * Usage (from the backend/ directory):
 *   node scripts/hash-gate-password.mjs
 *
 * The password is read from stdin (never from argv, so it does not land in
 * shell history or `ps`). It is not echoed and not printed. Only the bcrypt
 * hash is written to stdout.
 */
import { createInterface } from "node:readline";
import bcrypt from "bcrypt";

const COST = 12;

function readHidden(prompt) {
  return new Promise((resolve, reject) => {
    process.stderr.write(prompt);
    const rl = createInterface({ input: process.stdin, output: process.stderr, terminal: true });
    const onData = (char) => {
      // Disable echo for everything except newline.
      if (["\n", "\r", "\u0004"].includes(char)) return;
      process.stderr.write("\b \b");
    };
    process.stdin.on("data", onData);
    rl.question("", (answer) => {
      process.stdin.off("data", onData);
      rl.close();
      process.stderr.write("\n");
      resolve(answer);
    });
    rl.on("error", reject);
  });
}

async function main() {
  if (!process.stdin.isTTY) {
    // Piped input: read a single line (useful for automation).
    let data = "";
    for await (const chunk of process.stdin) data += chunk;
    const password = data.split(/\r?\n/)[0];
    if (!password) {
      process.stderr.write("No password provided on stdin.\n");
      process.exit(1);
    }
    process.stdout.write((await bcrypt.hash(password, COST)) + "\n");
    return;
  }

  const password = await readHidden("Gate password: ");
  if (!password) {
    process.stderr.write("Empty password refused.\n");
    process.exit(1);
  }
  const confirm = await readHidden("Confirm password: ");
  if (password !== confirm) {
    process.stderr.write("Passwords do not match.\n");
    process.exit(1);
  }
  const hash = await bcrypt.hash(password, COST);
  process.stdout.write(hash + "\n");
}

main().catch((err) => {
  process.stderr.write(`Error: ${err.message}\n`);
  process.exit(1);
});
