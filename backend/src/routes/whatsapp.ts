import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate } from "@/middleware/auth";
import { getDb } from "@/db";
import { clients } from "@/db/schema/clients";
import { whatsappMessages } from "@/db/schema/whatsapp-messages";
import { eq, desc, sql } from "drizzle-orm";
import { getEnv } from "@/config/env";

const sendSchema = z.object({
  clientId: z.string(),
  content: z.string().min(1),
});

const broadcastSchema = z.object({
  content: z.string().min(1),
  filterOverdue: z.boolean().optional(),
  filterStage: z.string().optional(),
});

export async function whatsappRoutes(app: FastifyInstance) {
  app.post("/send", { preHandler: [authenticate] }, async (request, reply) => {
    const input = sendSchema.parse(request.body);
    const db = getDb();

    const [client] = await db
      .select({ id: clients.id, phone: clients.phone, parentName: clients.parentName, whatsappOptin: clients.whatsappOptin })
      .from(clients)
      .where(eq(clients.id, input.clientId))
      .limit(1);

    if (!client) return reply.status(404).send({ error: "Client introuvable" });
    if (!client.whatsappOptin) return reply.status(400).send({ error: "Ce client n'a pas activé WhatsApp" });

    const result = await sendWhatsAppMessage(client.phone, input.content);

    await db.insert(whatsappMessages).values({
      clientId: client.id,
      phone: client.phone,
      direction: "sent",
      content: input.content,
      status: result.ok ? "sent" : "failed",
      waMessageId: result.waId ?? "",
    });

    return result;
  });

  app.post("/broadcast", { preHandler: [authenticate] }, async (request) => {
    const input = broadcastSchema.parse(request.body);
    const db = getDb();

    let query = db
      .select({ id: clients.id, phone: clients.phone, parentName: clients.parentName, whatsappOptin: clients.whatsappOptin })
      .from(clients)
      .where(sql`${clients.whatsappOptin} = true AND ${clients.phone} != ''`)
      .$dynamic();

    if (input.filterOverdue) {
      query = query.where(eq(clients.overdue, true));
    }
    if (input.filterStage && input.filterStage !== "tous") {
      query = query.where(eq(clients.crmStage, input.filterStage));
    }

    const eligibleClients = await query;
    if (eligibleClients.length === 0) return { ok: false, error: "Aucun client éligible" };

    const broadcastId = crypto.randomUUID();
    const results: Array<{ phone: string; ok: boolean; error?: string }> = [];
    const logs: Array<typeof whatsappMessages.$inferInsert> = [];

    for (const client of eligibleClients) {
      const res = await sendWhatsAppMessage(client.phone, input.content);
      results.push({ phone: client.phone, ok: res.ok, error: res.error });
      logs.push({
        clientId: client.id,
        phone: client.phone,
        direction: "sent",
        content: input.content,
        status: res.ok ? "sent" : "failed",
        waMessageId: res.waId ?? "",
        broadcastId,
      });
    }

    if (logs.length > 0) {
      await db.insert(whatsappMessages).values(logs);
    }

    return {
      ok: true,
      broadcastId,
      total: results.length,
      success: results.filter((r) => r.ok).length,
      failed: results.filter((r) => !r.ok).length,
      results,
    };
  });

  app.get("/messages", { preHandler: [authenticate] }, async () => {
    const db = getDb();
    return db
      .select()
      .from(whatsappMessages)
      .orderBy(desc(whatsappMessages.createdAt))
      .limit(200);
  });

  app.delete("/messages/:id", { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const db = getDb();
    await db.delete(whatsappMessages).where(eq(whatsappMessages.id, id));
    return { ok: true };
  });
}

type SendResult = { ok: boolean; waId?: string; error?: string };

async function sendWhatsAppMessage(phone: string, content: string): Promise<SendResult> {
  const cleanPhone = phone.replace(/\D/g, "");
  if (cleanPhone.length < 8) return { ok: false, error: "Numéro invalide" };

  const env = getEnv();
  if (env.N8N_WEBHOOK_URL) {
    return sendViaN8n(cleanPhone, content, env);
  }
  return sendViaMeta(cleanPhone, content, env);
}

async function sendViaN8n(phone: string, content: string, env: ReturnType<typeof getEnv>): Promise<SendResult> {
  try {
    const res = await fetch(env.N8N_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(env.N8N_WEBHOOK_SECRET ? { "X-Webhook-Secret": env.N8N_WEBHOOK_SECRET } : {}),
      },
      body: JSON.stringify({ phone, content }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: `n8n HTTP ${res.status}` };
    return { ok: true, waId: (body as any).waId ?? (body as any).messageId };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Erreur inconnue" };
  }
}

async function sendViaMeta(phone: string, content: string, env: ReturnType<typeof getEnv>): Promise<SendResult> {
  if (!env.WHATSAPP_PHONE_NUMBER_ID || !env.WHATSAPP_ACCESS_TOKEN) {
    return { ok: false, error: "WhatsApp API non configurée" };
  }
  try {
    const url = `https://graph.facebook.com/${env.WHATSAPP_API_VERSION}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: phone,
        type: "text",
        text: { preview_url: false, body: content },
      }),
    });
    const body = await res.json() as any;
    if (!res.ok) return { ok: false, error: body.error?.message ?? `Erreur ${res.status}` };
    return { ok: true, waId: body.messages?.[0]?.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Erreur inconnue" };
  }
}
