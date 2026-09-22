import { useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { fetchMyPermissions } from "@/lib/istpm-api";

/**
 * Permissions effectives du compte connecté (fiche rôle en base, sinon repli
 * historique calculé côté serveur — une seule source de vérité : `GET
 * /roles/mine`). Utilisé pour la nav, les gardes de routes et les boutons
 * d'écriture. Pendant le chargement (ou en erreur), l'appelant fournit un
 * repli historique explicite : jamais de verrouillage sur panne réseau.
 */
export function usePermissions() {
  const { role } = useAuth();
  const q = useQuery({
    queryKey: ["my-permissions", role],
    queryFn: fetchMyPermissions,
    enabled: !!role,
    staleTime: 5 * 60_000,
    retry: 1,
    refetchOnWindowFocus: false,
  });
  const perms = useMemo(() => new Set(q.data?.permissions ?? []), [q.data]);
  const can = useCallback((perm: string) => perms.has(perm), [perms]);
  return { perms, can, loading: !q.isSuccess, source: q.data?.source ?? null as "record" | "fallback" | null };
}

/**
 * Droit avec repli historique pendant le chargement (`legacy` = comportement
 * sans fiche, ex. `role === "directeur" || role === "responsable"`).
 * Le serveur tranche toujours en dernier ressort (`requirePerm`).
 */
export function useCan(perm: string, legacy: boolean): boolean {
  const { can, loading } = usePermissions();
  if (loading) return legacy;
  return can(perm);
}
