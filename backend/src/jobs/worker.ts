/**
 * BullMQ worker entry point
 *
 * Processes background jobs: invoice generation, email sending,
 * WhatsApp notifications, payment reminders, etc.
 *
 * Usage: npx tsx src/jobs/worker.ts
 */

import { Worker } from "bullmq";
import IORedis from "ioredis";
import { getEnv } from "@/config/env";

const env = getEnv();
const connection = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null });

const queues = ["invoices", "emails", "whatsapp", "reminders"] as const;

async function main() {
  const workers = queues.map(
    (queueName) =>
      new Worker(
        queueName,
        async (job) => {
          console.log(`Processing ${queueName}#${job.id}:`, job.data);
          // TODO: implement job processors
          // switch (queueName) {
          //   case "invoices":  return processInvoice(job);
          //   case "emails":    return processEmail(job);
          //   case "whatsapp":  return processWhatsApp(job);
          //   case "reminders": return processReminder(job);
          // }
        },
        { connection },
      ),
  );

  console.log(`Worker listening on queues: ${queues.join(", ")}`);

  process.on("SIGTERM", async () => {
    await Promise.all(workers.map((w) => w.close()));
    await connection.quit();
  });
}

main().catch((err) => {
  console.error("Worker failed:", err);
  process.exit(1);
});
