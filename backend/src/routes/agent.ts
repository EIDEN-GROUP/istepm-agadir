import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate } from "@/middleware/auth";
import { getToolDefinitions } from "@/lib/agent/actions";
import { analyzeIntent } from "@/lib/agent/llm";
import { executeAction, executeBatch } from "@/lib/agent/executor";

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
      const result = await analyzeIntent(input.messages, toolDefinitions);
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur analyse";
      return reply.status(502).send({ error: msg });
    }
  });

  app.post("/confirm", { preHandler: [authenticate] }, async (request, reply) => {
    const input = confirmSchema.parse(request.body);
    const token = (request as any).token as string;

    try {
      const result = await executeAction({
        actionName: input.actionName,
        params: input.params,
        userToken: token,
      });
      return { success: true, data: result };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur exécution";
      return reply.status(400).send({ error: msg });
    }
  });

  app.post("/execute-batch", { preHandler: [authenticate] }, async (request, reply) => {
    const input = batchSchema.parse(request.body);
    const token = (request as any).token as string;

    try {
      const result = await executeBatch(
        input.actions.map((a) => ({
          actionName: a.actionName,
          params: a.params,
          userToken: token,
        })),
      );
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur batch";
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
