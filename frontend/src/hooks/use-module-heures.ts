import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useIstpm } from "@/lib/istpm-store";
import { fetchHeuresParModule } from "@/lib/istpm-api";

/**
 * Règle unique des heures modules, partagée par tout le site (détail
 * séance, cartes calendrier, section Heures, modale enseignant) :
 * `faites` = durées des séances `valide` (comptées à la confirmation),
 * `reste = volume (Paramètres › Modules) − faites`.
 */
export function useModuleHeures(professeurId?: string) {
  const { modules } = useIstpm();
  const q = useQuery({
    queryKey: professeurId ? ["heures-par-module", professeurId] : ["heures-par-module"],
    queryFn: () => fetchHeuresParModule(professeurId || undefined),
    retry: false,
  });

  const minutesParCle = useMemo(() => {
    const map = new Map<string, number>();
    for (const h of q.data ?? []) {
      const k = `${h.professeurId}||${h.module}`;
      map.set(k, (map.get(k) ?? 0) + (Number(h.minutes) || 0));
    }
    return map;
  }, [q.data]);

  /** Volume horaire du module (nom + filière si possible, sinon nom seul). */
  const volumeDe = (module: string, filiere?: string): number => {
    const list = modules ?? [];
    const ref =
      list.find((m) => m.nom === module && (!m.filiere || !filiere || m.filiere === filiere)) ??
      list.find((m) => m.nom === module);
    return Number(ref?.volumeHoraire ?? 0) || 0;
  };

  /** Heures validées (décimales) pour (enseignant, module). */
  const faitesDe = (profId: string, module: string): number =>
    Math.round(((minutesParCle.get(`${profId}||${module}`) ?? 0) / 60) * 10) / 10;

  /** Heures + volume par clé `${profId}||${module}` (pastilles calendrier). */
  const parCle = (cle: string, module: string, filiere?: string) => {
    const [profId] = cle.split("||");
    return {
      faites: Math.round(((minutesParCle.get(cle) ?? 0) / 60) * 10) / 10,
      volume: volumeDe(module, filiere),
    };
  };

  return { volumeDe, faitesDe, parCle, isLoading: q.isLoading };
}
