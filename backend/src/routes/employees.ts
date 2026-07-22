import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate } from "@/middleware/auth";
import { getDb } from "@/db";
import { employees } from "@/db/schema/employees";
import { eq, desc } from "drizzle-orm";

const employeeSchema = z.object({
  fullName: z.string().min(1),
  position: z.string().optional().default(""),
  department: z.string().optional().default(""),
  email: z.string().optional().default(""),
  personalEmail: z.string().optional().default(""),
  phone: z.string().optional().default(""),
  phone2: z.string().optional().default(""),
  cin: z.string().optional().default(""),
  birthDate: z.string().optional().default(""),
  hireDate: z.string().optional().default(""),
  address: z.string().optional().default(""),
  contractType: z.string().optional().default(""),
  salary: z.number().optional().default(0),
  status: z.enum(["actif", "inactif"]).optional().default("actif"),
});

export async function employeeRoutes(app: FastifyInstance) {
  app.get("/", { preHandler: [authenticate] }, async () => {
    const db = getDb();
    return db.select().from(employees).orderBy(desc(employees.createdAt));
  });

  app.post("/", { preHandler: [authenticate] }, async (request) => {
    const input = employeeSchema.parse(request.body);
    const db = getDb();
    const [employee] = await db
      .insert(employees)
      .values({
        ...input,
        salary: String(input.salary),
      })
      .returning();
    return employee;
  });

  app.put("/:id", { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = employeeSchema.partial().parse(request.body);
    const db = getDb();
    const values: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(input)) {
      if (val !== undefined) {
        values[key] = key === "salary" ? String(val) : val;
      }
    }
    const [employee] = await db
      .update(employees)
      .set(values)
      .where(eq(employees.id, id))
      .returning();
    if (!employee)
      return reply.status(404).send({ error: "Employé introuvable" });
    return employee;
  });

  app.delete("/:id", { preHandler: [authenticate] }, async (request) => {
    const { id } = request.params as { id: string };
    const db = getDb();
    await db.delete(employees).where(eq(employees.id, id));
    return { ok: true };
  });

  app.post("/import-csv", { preHandler: [authenticate] }, async (request) => {
    const { csvText } = z.object({ csvText: z.string() }).parse(request.body);
    const lines = csvText.split("\n").filter(Boolean);
    let imported = 0;
    const db = getDb();
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i]
        .split(",")
        .map((c) => c.trim().replace(/^"|"$/g, ""));
      if (cols[0]) {
        await db
          .insert(employees)
          .values({
            fullName: cols[0],
            position: cols[1] ?? "",
            department: cols[2] ?? "",
          });
        imported++;
      }
    }
    return { imported, errors: [] };
  });
}
