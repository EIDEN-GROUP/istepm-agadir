import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate, requireRole } from "@/middleware/auth";
import { getDb } from "@/db";
import { appointments } from "@/db/schema/appointments";
import { eq, desc } from "drizzle-orm";

const appointmentSchema = z.object({
  name: z.string().min(1),
  email: z.string().optional().default(""),
  phone: z.string().optional().default(""),
  subject: z.string().optional().default(""),
  type: z.enum(["contact", "rdv"]).optional().default("contact"),
  status: z
    .enum(["nouveau", "contacte", "converti"])
    .optional()
    .default("nouveau"),
  age: z.string().optional().default(""),
  message: z.string().optional().default(""),
  dateTable: z.string().optional().default(""),
  dateDetail: z.string().optional().default(""),
});

export async function appointmentRoutes(app: FastifyInstance) {
  app.get("/", { preHandler: [authenticate] }, async () => {
    const db = getDb();
    return db.select().from(appointments).orderBy(desc(appointments.createdAt));
  });

  app.post("/", { preHandler: [authenticate, requireRole("directeur", "responsable")] }, async (request) => {
    const input = appointmentSchema.parse(request.body);
    const db = getDb();
    const [appointment] = await db
      .insert(appointments)
      .values(input)
      .returning();
    return appointment;
  });

  app.put("/:id", { preHandler: [authenticate, requireRole("directeur", "responsable")] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = appointmentSchema.partial().parse(request.body);
    const db = getDb();
    const [appointment] = await db
      .update(appointments)
      .set(input)
      .where(eq(appointments.id, id))
      .returning();
    if (!appointment)
      return reply.status(404).send({ error: "Rendez-vous introuvable" });
    return appointment;
  });

  app.delete("/:id", { preHandler: [authenticate, requireRole("directeur", "responsable")] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const db = getDb();
    await db.delete(appointments).where(eq(appointments.id, id));
    return { ok: true };
  });
}
