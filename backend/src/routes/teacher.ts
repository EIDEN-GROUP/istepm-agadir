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

/**
 * Fiche formateur du compte connecté. L'API confondait historiquement
 * `users.id` et `formateurs.id` (égalité UUID impossible) : tout l'espace
 * enseignant répondait vide. La liaison passe par `formateurs.user_id`,
 * posée à l'acceptation d'invitation (email) — voir services/invitations.ts.
 */
async function ficheConnectee(db: ReturnType<typeof getDb>, userId: string | undefined) {
  if (!userId) return null;
  const [formateur] = await db
    .select()
    .from(formateurs)
    .where(eq(formateurs.userId, userId))
    .limit(1);
  return formateur ?? null;
}

export async function teacherRoutes(app: FastifyInstance) {
  app.get("/dashboard", { preHandler: [authenticate] }, async (request) => {
    const db = getDb();
    const formateur = await ficheConnectee(db, request.user?.id);

    if (!formateur) return {};

    const today = new Date().toISOString().slice(0, 10);

    const [rawSeancesAujourdhui, mesExamens, tousBulletins, mesEtudiants] =
      await Promise.all([
        db
          .select()
          .from(seances)
          .where(and(eq(seances.professeurId, formateur.id), eq(seances.date, today)))
          .orderBy(seances.debut),
        db
          .select()
          .from(examens)
          .where(
            sql`${examens.module} = ANY(${formateur.modules}::text[])`,
          )
          .orderBy(examens.date),
        db
          .select()
          .from(bulletins)
          .where(
            and(
              inArray(
                bulletins.niveau,
                formateur.groupes.map((g: string) => g.split("-")[0]),
              ),
              eq(bulletins.filiere, formateur.departement),
            ),
          ),
        db
          .select()
          .from(etudiants)
          .where(
            and(
              inArray(
                etudiants.niveau,
                formateur.groupes.map((g: string) => g.split("-")[0]),
              ),
              eq(etudiants.filiere, formateur.departement),
            ),
          )
          .orderBy(etudiants.nom),
      ]);

    const aNoter = mesExamens.filter((x: any) => x.statut !== "notes_saisies");
    const bulletinsAPublier = tousBulletins.filter((b: any) => b.statut !== "publie");

    return {
      formateur,
      seancesAujourdhui: rawSeancesAujourdhui.map(enrichSeance),
      examens: mesExamens,
      aNoter: aNoter.length,
      bulletins: tousBulletins,
      bulletinsAPublier: bulletinsAPublier.length,
      etudiants: mesEtudiants,
      groupes: formateur.groupes,
      modules: formateur.modules,
    };
  });

  app.get("/seances", { preHandler: [authenticate] }, async (request) => {
    const db = getDb();
    const formateur = await ficheConnectee(db, request.user?.id);
    if (!formateur) return [];
    const query = request.query as { start?: string; end?: string };
    const conditions = [eq(seances.professeurId, formateur.id)];
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
    const db = getDb();
    const formateur = await ficheConnectee(db, request.user?.id);
    if (!formateur) return [];
    return db
      .select()
      .from(examens)
      .where(sql`${examens.module} = ANY(${formateur.modules}::text[])`)
      .orderBy(examens.date);
  });

  app.get("/etudiants", { preHandler: [authenticate] }, async (request) => {
    const db = getDb();
    const formateur = await ficheConnectee(db, request.user?.id);
    if (!formateur) return [];
    const niveaux = [...new Set(formateur.groupes.map((g: string) => g.split("-")[0]))];
    return db
      .select()
      .from(etudiants)
      .where(inArray(etudiants.niveau, niveaux))
      .orderBy(etudiants.nom);
  });

  app.get("/availability", { preHandler: [authenticate] }, async (request) => {
    const db = getDb();
    const formateur = await ficheConnectee(db, request.user?.id);
    if (!formateur) return [];
    return db
      .select()
      .from(teacherAvailability)
      .where(eq(teacherAvailability.teacherId, formateur.id))
      .orderBy(teacherAvailability.dayOfWeek);
  });

  app.put("/availability", { preHandler: [authenticate] }, async (request, reply) => {
    const db = getDb();
    const formateur = await ficheConnectee(db, request.user?.id);
    if (!formateur)
      return reply.status(404).send({ error: "Fiche formateur introuvable pour ce compte" });

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

    await db.delete(teacherAvailability).where(eq(teacherAvailability.teacherId, formateur.id));
    const created = [];
    for (const slot of input.slots) {
      const [av] = await db
        .insert(teacherAvailability)
        .values({ teacherId: formateur.id, ...slot })
        .returning();
      created.push(av);
    }
    return created;
  });
}
