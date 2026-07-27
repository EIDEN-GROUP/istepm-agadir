import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate } from "@/middleware/auth";
import { getToolDefinitions } from "@/lib/agent/actions";
import { analyzeIntent } from "@/lib/agent/llm";
import { executeAction, executeBatch } from "@/lib/agent/executor";

async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 2,
  baseDelay = 500,
): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (i < maxRetries) {
        await new Promise((r) => setTimeout(r, baseDelay * Math.pow(2, i)));
      }
    }
  }
  throw lastErr;
}

const analyzeSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string(),
    }),
  ),
});

const confirmSchema = z.object({
  actionName: z.string(),
  params: z.record(z.unknown()),
});

const batchSchema = z.object({
  actions: z.array(
    z.object({
      actionName: z.string(),
      params: z.record(z.unknown()),
    }),
  ),
});

export async function agentRoutes(app: FastifyInstance) {
  const toolDefinitions = getToolDefinitions();

  app.post("/analyze", { preHandler: [authenticate] }, async (request, reply) => {
    const input = analyzeSchema.parse(request.body);
    try {
      const result = await withRetry(
        () => analyzeIntent(input.messages, toolDefinitions),
        1,
        1000,
      );
      return result;
    } catch (err) {
      let msg = "Erreur de communication avec l'IA";
      if (err instanceof Error) {
        if ("status" in err && (err as any).status === 404) {
          msg = "Le modèle d'IA n'est pas disponible. Vérifiez la configuration AI_MODEL dans le fichier .env.";
        } else if ("status" in err && (err as any).status === 401) {
          msg = "Clé API IA invalide. Vérifiez AI_API_KEY dans le fichier .env.";
        } else if ((err as any).code === "ECONNREFUSED" || (err as any).code === "ENOTFOUND") {
          msg = "Impossible de contacter l'API IA. Vérifiez AI_BASE_URL dans le fichier .env.";
        } else if (err.message.includes("404")) {
          msg = "Le modèle d'IA est introuvable. Vérifiez AI_MODEL dans le fichier .env.";
        } else {
          msg = err.message;
        }
      }
      request.log.error(err, "Agent analyze failed");
      return reply.status(502).send({ error: msg });
    }
  });

  app.post("/confirm", { preHandler: [authenticate] }, async (request, reply) => {
    const input = confirmSchema.parse(request.body);
    const authHeader = request.headers.authorization;
    const token = authHeader?.replace("Bearer ", "") ?? "";
    const userRole = request.user?.role ?? "";

    try {
      const result = await withRetry(() => executeAction(app, {
        actionName: input.actionName,
        params: input.params,
        userToken: token,
        userRole,
      }));
      return { success: true, data: result };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur exécution";
      request.log.error(err, "Agent confirm failed");
      return reply.status(400).send({ error: msg });
    }
  });

  app.post("/execute-batch", { preHandler: [authenticate] }, async (request, reply) => {
    const input = batchSchema.parse(request.body);
    const authHeader = request.headers.authorization;
    const token = authHeader?.replace("Bearer ", "") ?? "";
    const userRole = request.user?.role ?? "";

    try {
      const result = await executeBatch(
        app,
        input.actions.map((a) => ({
          actionName: a.actionName,
          params: a.params,
          userToken: token,
          userRole,
        })),
      );
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur batch";
      request.log.error(err, "Agent batch failed");
      return reply.status(400).send({ error: msg });
    }
  });

  app.get("/actions", { preHandler: [authenticate] }, async () => {
    return toolDefinitions.map((t) => ({
      name: t.function.name,
      description: t.function.description?.split("\n")[0] ?? "",
      category: t._meta.category,
      paramsCount: Object.keys(t.function.parameters.properties).length,
    }));
  });
}
