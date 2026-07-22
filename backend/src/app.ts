import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";
import { getEnv } from "@/config/env";
import { errorHandler } from "@/middleware/error-handler";
import { authRoutes } from "@/routes/auth";
import { clientRoutes } from "@/routes/clients";
import { paymentRoutes } from "@/routes/payments";
import { invoiceRoutes } from "@/routes/invoices";
import { appointmentRoutes } from "@/routes/appointments";
import { employeeRoutes } from "@/routes/employees";
import { planificationRoutes } from "@/routes/planifications";
import { dashboardRoutes } from "@/routes/dashboard";
import { settingsRoutes } from "@/routes/settings";
import { holidayRoutes } from "@/routes/holidays";

import { adminRoutes } from "@/routes/admin";
import { supportRoutes } from "@/routes/support";
import { whatsappRoutes } from "@/routes/whatsapp";
import { emailRoutes } from "@/routes/email";
import { receiptRoutes } from "@/routes/receipt";

export async function buildApp() {
  const env = getEnv();

  const app = Fastify({
    logger: {
      level: env.LOG_LEVEL,
      transport:
        env.NODE_ENV === "development" ? { target: "pino-pretty" } : undefined,
    },
  });

  await app.register(cors, {
    origin: env.CORS_ORIGIN.split(",").map((s) => s.trim()),
    credentials: true,
  });

  await app.register(jwt, {
    secret: env.JWT_SECRET,
    sign: { expiresIn: env.JWT_EXPIRES_IN },
  });

  await app.register(rateLimit, {
    max: 100,
    timeWindow: "1 minute",
  });

  app.setErrorHandler(errorHandler);

  app.setNotFoundHandler((_request, reply) => {
    reply.status(404).send({ error: "Route non trouvée" });
  });

  app.get("/health", async () => ({
    status: "ok",
    timestamp: new Date().toISOString(),
  }));

  await app.register(authRoutes, { prefix: "/api/auth" });
  await app.register(clientRoutes, { prefix: "/api/clients" });
  await app.register(paymentRoutes, { prefix: "/api/payments" });
  await app.register(invoiceRoutes, { prefix: "/api/invoices" });
  await app.register(appointmentRoutes, { prefix: "/api/appointments" });
  await app.register(employeeRoutes, { prefix: "/api/employees" });
  await app.register(planificationRoutes, { prefix: "/api/planifications" });
  await app.register(dashboardRoutes, { prefix: "/api/dashboard" });
  await app.register(settingsRoutes, { prefix: "/api/settings" });
  await app.register(holidayRoutes, { prefix: "/api/holidays" });

  await app.register(adminRoutes, { prefix: "/api/admin" });
  await app.register(supportRoutes, { prefix: "/api/support" });
  await app.register(whatsappRoutes, { prefix: "/api/whatsapp" });
  await app.register(emailRoutes, { prefix: "/api/email" });
  await app.register(receiptRoutes, { prefix: "/api/receipts" });

  return app;
}
