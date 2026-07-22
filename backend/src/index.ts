import { buildApp } from "@/app";
import { getEnv } from "@/config/env";

async function main() {
  const env = getEnv();
  const app = await buildApp();

  try {
    await app.listen({ port: env.PORT, host: env.HOST });
    app.log.info(`Server listening on http://${env.HOST}:${env.PORT}`);
  } catch (err) {
    app.log.fatal(err, "Failed to start server");
    process.exit(1);
  }
}

main();
