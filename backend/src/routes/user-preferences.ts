import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate } from "@/middleware/auth";
import { getDb } from "@/db";
import { userPreferences } from "@/db/schema/user-preferences";
import { eq } from "drizzle-orm";

export async function userPreferenceRoutes(app: FastifyInstance) {
  app.get("/", { preHandler: [authenticate] }, async (request) => {
    const userId = request.user?.id;
    if (!userId) return {};
    const db = getDb();
    const [row] = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId))
      .limit(1);
    return row?.preferences ?? {};
  });

  app.put("/", { preHandler: [authenticate] }, async (request) => {
    const userId = request.user?.id;
    if (!userId) return {};
    const schema = z.object({
      preferences: z.record(z.unknown()),
    });
    const input = schema.parse(request.body);
    const db = getDb();
    const [existing] = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId))
      .limit(1);
    if (existing) {
      const [updated] = await db
        .update(userPreferences)
        .set({ preferences: input.preferences, updatedAt: new Date() })
        .where(eq(userPreferences.userId, userId))
        .returning();
      return updated;
    }
    const [created] = await db
      .insert(userPreferences)
      .values({ userId, preferences: input.preferences })
      .returning();
    return created;
  });
}
