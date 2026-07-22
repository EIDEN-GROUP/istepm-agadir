import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate } from "@/middleware/auth";
import { getDb } from "@/db";
import { clients } from "@/db/schema/clients";
import { eq, desc, sql, or } from "drizzle-orm";

const clientSchema = z.object({
  parentName: z.string().min(1),
  childName: z.string().optional().default(""),
  childAge: z.string().optional().default(""),
  email: z.string().optional().default(""),
  email2: z.string().optional().default(""),
  phone: z.string().optional().default(""),
  phone2: z.string().optional().default(""),
  cin: z.string().optional().default(""),
  cinMother: z.string().optional().default(""),
  fatherName: z.string().optional().default(""),
  motherName: z.string().optional().default(""),
  professionFather: z.string().optional().default(""),
  professionMother: z.string().optional().default(""),
  address: z.string().optional().default(""),
  childNames: z.array(z.any()).optional().default([]),
  subscribedFrais: z.array(z.string()).optional().default([]),
  dob: z.string().optional().default(""),
  level: z.string().optional().default(""),
  crmStage: z.enum(["nouveau", "converti"]).optional().default("nouveau"),
  monthlyFee: z.number().optional().default(0),
  paymentDay: z.number().optional().default(1),
  notes: z.string().optional().default(""),
  whatsappOptin: z.boolean().optional().default(true),
  transport: z.boolean().optional().default(false),
  cantine: z.boolean().optional().default(false),
  garderie: z.boolean().optional().default(false),
  activites: z.boolean().optional().default(false),
  fratrie: z.number().optional().default(1),
  remise: z.number().optional().default(0),
  subscribedServices: z.array(z.string()).optional().default([]),
});

export async function clientRoutes(app: FastifyInstance) {
  app.get("/", { preHandler: [authenticate] }, async (request) => {
    const db = getDb();
    const query = request.query as {
      search?: string;
      level?: string;
      service?: string;
    };
    let result = db
      .select()
      .from(clients)
      .orderBy(desc(clients.createdAt))
      .$dynamic();

    if (query.search) {
      const q = `%${query.search}%`;
      result = result.where(
        or(
          sql`${clients.parentName} ILIKE ${q}`,
          sql`${clients.childName} ILIKE ${q}`,
          sql`${clients.email} ILIKE ${q}`,
          sql`${clients.phone} ILIKE ${q}`,
        ),
      );
    }

    if (query.level && query.level !== "tous") {
      result = result.where(eq(clients.level, query.level));
    }

    const rows = await result;
    return rows;
  });

  app.get("/:id", { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const db = getDb();
    const [client] = await db
      .select()
      .from(clients)
      .where(eq(clients.id, id))
      .limit(1);
    if (!client) return reply.status(404).send({ error: "Client introuvable" });
    return client;
  });

  app.post("/", { preHandler: [authenticate] }, async (request) => {
    const input = clientSchema.parse(request.body);
    const db = getDb();
    const [client] = await db
      .insert(clients)
      .values({
        ...input,
        monthlyFee: String(input.monthlyFee),
        remise: String(input.remise),
      })
      .returning();
    return client;
  });

  app.put("/:id", { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = clientSchema.partial().parse(request.body);
    const db = getDb();
    const values: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(input)) {
      if (val !== undefined) {
        values[key] =
          key === "monthlyFee" || key === "remise" ? String(val) : val;
      }
    }
    const [client] = await db
      .update(clients)
      .set(values)
      .where(eq(clients.id, id))
      .returning();
    if (!client) return reply.status(404).send({ error: "Client introuvable" });
    return client;
  });

  app.delete("/:id", { preHandler: [authenticate] }, async (request) => {
    const { id } = request.params as { id: string };
    const db = getDb();
    await db.delete(clients).where(eq(clients.id, id));
    return { ok: true };
  });

  app.post("/import-csv", { preHandler: [authenticate] }, async (request) => {
    const { csvText } = z.object({ csvText: z.string() }).parse(request.body);
    const rows = parseCsv(csvText);
    let imported = 0;
    const errors: string[] = [];
    const db = getDb();

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const parentName = r["parent_name"] || r["Parent"] || "";
      if (!parentName) {
        errors.push(`Ligne ${i + 2}: parent_name manquant`);
        continue;
      }
      try {
        await db.insert(clients).values({
          parentName,
          childName: r["child_name"] || r["Enfant"] || "",
          email: r["email"] || r["Email"] || "",
          phone: r["phone"] || r["Téléphone"] || r["Telephone"] || "",
          level: r["level"] || r["Niveau"] || "",
          monthlyFee: String(
            Number(r["monthly_fee"] || r["Frais mensuels"] || 0),
          ),
        });
        imported++;
      } catch (e) {
        errors.push(
          `Ligne ${i + 2}: ${e instanceof Error ? e.message : "Erreur inconnue"}`,
        );
      }
    }

    return { imported, errors };
  });
}

function parseCsv(text: string): Record<string, string>[] {
  let t = text;
  if (t.charCodeAt(0) === 0xfeff) t = t.slice(1);
  t = t.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = t
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];
  const headers = splitCsvLine(lines[0]).map((h) => h.trim());
  const result: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = splitCsvLine(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((h, j) => {
      row[h] = (values[j] ?? "").trim();
    });
    result.push(row);
  }
  return result;
}

function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else current += ch;
  }
  result.push(current);
  return result;
}
