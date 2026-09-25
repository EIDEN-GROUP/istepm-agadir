import type { FastifyRequest, FastifyReply } from "fastify";
import { getDb } from "@/db";
import { roles } from "@/db/schema/roles";
import { eq } from "drizzle-orm";

/**
 * Rubriques Paramètres pilotables finement par fiche rôle
 * (`settings.<rubrique>.read/write`). Seules ces 14 rubriques sont
 * détaillées ; `utilisateurs`/`roles` gardent `users.*`/`roles.*`, et
 * `formateurs` garde `formateurs.*`. Miroir exact côté front
 * (`SECTIONS_REGLABLES`, Paramètres › Rôles › « Détail par rubrique »).
 * Application interface uniquement : l'API garde les gardes globales
 * `settings.read/write` (le `write` global reste requis pour enregistrer).
 */
export const SETTINGS_SECTIONS = [
  "annees",
  "groupes",
  "modules",
  "salles",
  "creneaux",
  "planning",
  "filieres",
  "niveaux_etudes",
  "examens",
  "bulletins",
  "institut",
  "securite",
  "cachet",
  "structures",
] as const;

/** Catalogue des permissions (10 rubriques gérées dans Paramètres › Rôles). */
export const PERMISSIONS_LIST = [
  "etudiants.read", "etudiants.write", "etudiants.delete",
  "formateurs.read", "formateurs.write", "formateurs.delete",
  "examens.read", "examens.write", "examens.delete",
  "bulletins.read", "bulletins.write", "bulletins.delete",
  "stages.read", "stages.write", "stages.delete",
  "paiements.read", "paiements.write", "paiements.delete",
  "settings.read", "settings.write",
  "users.read", "users.write", "users.delete",
  "roles.read", "roles.manage",
  "dashboard.read",
  ...SETTINGS_SECTIONS.flatMap((s) => [
    `settings.${s}.read`,
    `settings.${s}.write`,
  ]),
] as const;

/**
 * Catalogue → périmètre fonctionnel.
 *
 * Les fiches rôles (`roles.permissions`) gouvernent les 10 rubriques du
 * catalogue (Étudiants…Dashboard) en lecture comme en écriture, côté UI
 * (nav, gardes, boutons) comme côté API (`requirePerm` sur les écritures).
 * Correspondances particulières :
 * - notes + appel (`notes`, `attendance`) : actes d'évaluation → `examens.*` ;
 * - séances, calendrier, espace étudiant, IA, tickets, e-mails, CRM legacy :
 *   hors catalogue, périmètres `requireRole` historiques inchangés.
 */
export const ROLE_FALLBACKS: Record<string, string[]> = {
  directeur: [...PERMISSIONS_LIST],
  responsable: [
    "etudiants.read", "etudiants.write", "etudiants.delete",
    "formateurs.read", "formateurs.write", "formateurs.delete",
    "examens.read", "examens.write", "examens.delete",
    "bulletins.read", "bulletins.write", "bulletins.delete",
    "stages.read", "stages.write", "stages.delete",
    "paiements.read", "paiements.write", "paiements.delete",
    "settings.read", "settings.write",
    // Rubriques vues aujourd'hui (organisation pédagogique), en édition.
    "settings.annees.read", "settings.annees.write",
    "settings.groupes.read", "settings.groupes.write",
    "settings.modules.read", "settings.modules.write",
    "settings.salles.read", "settings.salles.write",
    "settings.creneaux.read", "settings.creneaux.write",
    "settings.planning.read", "settings.planning.write",
    "settings.structures.read", "settings.structures.write",
    "users.read", "users.write", "users.delete",
    "roles.read", "roles.manage",
    "dashboard.read",
  ],
  enseignant: [
    "etudiants.read",
    "examens.read", "examens.write", "examens.delete",
    "bulletins.read",
    "roles.read", "roles.manage",
    "dashboard.read",
  ],
  comptable: [
    "paiements.read", "paiements.write",
    "etudiants.read",
    // users.write : uniquement les invitations de comptes comptables (borné
    // côté endpoint, pas seulement masqué dans l'UI).
    "users.write",
    "roles.read", "roles.manage",
    "dashboard.read",
  ],
  etudiant: ["dashboard.read"],
};

type Cached = { at: number; perms: string[]; source: "record" | "fallback" };
const CACHE = new Map<string, Cached>();
const CACHE_TTL_MS = 30_000;

/** Permissions effectives d'un rôle : fiche en base, sinon repli historique. */
export async function rolePermissions(role: string): Promise<{ permissions: string[]; source: "record" | "fallback" }> {
  const now = Date.now();
  const cached = CACHE.get(role);
  if (cached && now - cached.at < CACHE_TTL_MS) {
    return { permissions: cached.perms, source: cached.source };
  }
  const db = getDb();
  const [row] = await db
    .select({ permissions: roles.permissions })
    .from(roles)
    .where(eq(roles.name, role))
    .limit(1);
  const source = row ? ("record" as const) : ("fallback" as const);
  const perms = (
    row ? (row.permissions as string[]) : (ROLE_FALLBACKS[role] ?? [])
  ).filter((p) => (PERMISSIONS_LIST as readonly string[]).includes(p));
  CACHE.set(role, { at: now, perms, source });
  // Distingue fiche réelle du repli (l'UI s'en sert pour le 1er affichage).
  return { permissions: perms, source };
}

/**
 * Garde d'écriture par permission (à chaîner après `authenticate`, à côté de
 * `requireRole`). 403 explicite quand la permission manque — y compris avec
 * repli (le repli reproduit exactement les droits historiques).
 */
export function requirePerm(perm: string) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const userRole = request.user?.role;
    if (!userRole) {
      return reply.status(403).send({ error: "Permission insuffisante" });
    }
    const { permissions } = await rolePermissions(userRole);
    if (!permissions.includes(perm)) {
      return reply.status(403).send({ error: "Permission insuffisante" });
    }
  };
}
