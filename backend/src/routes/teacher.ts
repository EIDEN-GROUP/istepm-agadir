import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate } from "@/middleware/auth";
import { getDb } from "@/db";
import { seances } from "@/db/schema/seances";
import { enrichSeance } from "./seances";
import { formateurs } from "@/db/schema/formateurs";
import { examens } from "@/db/schema/examens";
import { etudiants } from "@/db/schema/etudiants";
import { bulletins } from "@/db/schema/bulletins";
import { teacherAvailability } from "@/db/schema/teacher-availability";
import { eq, and, gte, lte, inArray, desc, sql } from "drizzle-orm";

export async function teacherRoutes(app: FastifyInstance) {
  app.get("/dashboard", { preHandler: [authenticate] }, async (request) => {
    const userId = request.user?.id;
    if (!userId) return {};

    const db = getDb();
    const [formateur] = await db
      .select()
      .from(formateurs)
      .where(eq(formateurs.id, userId))
      .limit(1);

    if (!formateur) return {};

    const today = new Date().toISOString().slice(0, 10);

    const [rawSeancesAujourdhui, mesExamens, tousBulletins, mesEtudiants] =
      await Promise.all([
        db
          .select()
          .from(seances)
          .where(and(eq(seances.professeurId, userId), eq(seances.date, today)))
          .orderBy(seances.debut),
        db
          .select()
          .from(examens)
          .where(
            sql`${examens.module} = ANY(${formateur.modules}::text[])`,
          )
          .orderBy(examens.date),
        db.select().from(bulletins),
        db
          .select()
          .from(etudiants)
          .where(
            inArray(
              etudiants.niveau,
              formateur.groupes.map((g: string) => g.split("-")[0]),
            ),
          ),
      ]);

    const niveauxFormateur = [...new Set(formateur.groupes.map((g: string) => g.split("-")[0]))];
    const bulletinsFiltres = tousBulletins.filter((b: any) =>
      niveauxFormateur.includes(b.niveau),
    );

    const aNoter = mesExamens.filter((x: any) => x.statut !== "notes_saisies");
    const bulletinsAPublier = bulletinsFiltres.filter((b: any) => b.statut !== "publie");

    return {
      formateur,
      seancesAujourdhui: rawSeancesAujourdhui.map(enrichSeance),
      examens: mesExamens,
      aNoter: aNoter.length,
      bulletinsAPublier: bulletinsAPublier.length,
      groupes: formateur.groupes,
      modules: formateur.modules,
    };
  });

  app.get("/seances", { preHandler: [authenticate] }, async (request) => {
    const userId = request.user?.id;
    if (!userId) return [];
    const query = request.query as { start?: string; end?: string };
    const db = getDb();
    const conditions = [eq(seances.professeurId, userId)];
    if (query.start) conditions.push(gte(seances.date, query.start));
    if (query.end) conditions.push(lte(seances.date, query.end));
    const rows = await db
      .select()
      .from(seances)
      .where(and(...conditions))
      .orderBy(seances.date, seances.debut);
    return rows.map(enrichSeance);
  });

  app.get("/examens", { preHandler: [authenticate] }, async (request) => {
    const userId = request.user?.id;
    if (!userId) return [];
    const db = getDb();
    const [formateur] = await db
      .select({ modules: formateurs.modules })
      .from(formateurs)
      .where(eq(formateurs.id, userId))
      .limit(1);
    if (!formateur) return [];
    return db
      .select()
      .from(examens)
      .where(sql`${examens.module} = ANY(${formateur.modules}::text[])`)
      .orderBy(examens.date);
  });

  app.get("/etudiants", { preHandler: [authenticate] }, async (request) => {
    const userId = request.user?.id;
    if (!userId) return [];
    const db = getDb();
    const [formateur] = await db
      .select({ groupes: formateurs.groupes })
      .from(formateurs)
      .where(eq(formateurs.id, userId))
      .limit(1);
    if (!formateur) return [];
    const niveaux = [...new Set(formateur.groupes.map((g: string) => g.split("-")[0]))];
    return db
      .select()
      .from(etudiants)
      .where(inArray(etudiants.niveau, niveaux))
      .orderBy(etudiants.nom);
  });

  app.get("/availability", { preHandler: [authenticate] }, async (request) => {
    const userId = request.user?.id;
    if (!userId) return [];
    const db = getDb();
    return db
      .select()
      .from(teacherAvailability)
      .where(eq(teacherAvailability.teacherId, userId))
      .orderBy(teacherAvailability.dayOfWeek);
  });

  app.put("/availability", { preHandler: [authenticate] }, async (request, reply) => {
    const userId = request.user?.id;
    if (!userId) return reply.status(401).send({ error: "Non authentifié" });

    const schema = z.object({
      slots: z.array(
        z.object({
          dayOfWeek: z.number().min(0).max(6),
          startTime: z.string(),
          endTime: z.string(),
        }),
      ),
    });
    const input = schema.parse(request.body);
    const db = getDb();

    await db.delete(teacherAvailability).where(eq(teacherAvailability.teacherId, userId));
    const created = [];
    for (const slot of input.slots) {
      const [av] = await db
        .insert(teacherAvailability)
        .values({ teacherId: userId, ...slot })
        .returning();
      created.push(av);
    }
    return created;
  });
}
