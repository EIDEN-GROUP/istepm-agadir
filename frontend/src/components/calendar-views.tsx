/**
 * Vues du calendrier   Jour, Semaine, Mois.
 *
 * Les vues Jour et Semaine partagent une grille horaire : les séances y sont
 * positionnées en absolu à partir de leur heure de début et de leur durée,
 * comme dans un agenda classique. La vue Mois empile des pastilles compactes.
 *
 * Le glisser-déposer est piloté par `canDrag` : le composant reste identique
 * pour un lecteur seul, sans branche d'affichage séparée.
 */
import { useMemo, useRef, useState, type DragEvent } from "react";
import {
  couleurSeance,
  minutesDepuisMinuit,
  isoDate,
  CRENEAUX,
  bornesGrilleHoraire,
  TYPE_SEANCE_LABEL,
  type Seance,
  type JourChome,
  type Creneau,
} from "@/lib/istpm-data";
import { cn } from "@/lib/utils";

export type VueCalendrier = "jour" | "semaine" | "mois";

/** Résout le jour chômé d'une date ISO, ou `null` si l'institut travaille. */
export type LookupJourChome = (iso: string) => JourChome | null;

/** Pastille « férié » / « vacances » posée sur un jour sans cours. */
function BadgeChome({ jour, compact }: { jour: JourChome; compact?: boolean }) {
  return (
    <span
      title={jour.nom}
      className={cn(
        "inline-block max-w-full truncate rounded-full px-1.5 py-0.5 font-semibold",
        compact ? "text-[9px]" : "text-[10px]",
        jour.type === "ferie"
          ? "bg-alert/12 text-alert-dk"
          : "bg-warn-pale text-warn",
      )}
    >
      {jour.nom}
    </span>
  );
}

/** Hauteur d'une heure dans la grille, en pixels. */
const HEURE_PX = 64;
const MINUTE_PX = HEURE_PX / 60;
/** Granularité du dépôt : les séances s'alignent sur 15 minutes. */
const PAS_MINUTES = 15;

const JOURS_COURTS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const JOURS_LONGS = [
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
  "Dimanche",
];

export function estAujourdhui(d: Date) {
  return isoDate(d) === isoDate(new Date());
}

/* ------------------------------------------------------------------ */
/*  Bloc de séance                                                     */
/* ------------------------------------------------------------------ */

function SeanceBloc({
  seance,
  nomProf,
  canDrag,
  compact,
  onOpen,
  onDragStart,
}: {
  seance: Seance;
  nomProf: string;
  canDrag: boolean;
  compact?: boolean;
  onOpen: (s: Seance) => void;
  onDragStart: (s: Seance, e: DragEvent) => void;
}) {
  const c = couleurSeance(seance.module);
  const duree =
    minutesDepuisMinuit(seance.fin) - minutesDepuisMinuit(seance.debut);
  const court = duree <= 45;

  return (
    <button
      type="button"
      draggable={canDrag}
      onDragStart={(e) => onDragStart(seance, e)}
      onClick={() => onOpen(seance)}
      title={`${seance.module} · ${nomProf} · ${seance.groupe} · ${seance.salle} · ${seance.debut}–${seance.fin}`}
      className={cn(
        "group h-full w-full overflow-hidden rounded-lg border-s-[3px] px-2 py-1 text-start transition-all duration-200",
        "hover:z-10 hover:shadow-[0_10px_24px_-12px_rgba(0,0,0,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50",
        canDrag ? "cursor-grab active:cursor-grabbing" : "cursor-pointer",
      )}
      style={{
        backgroundColor: c.soft,
        borderInlineStartColor: c.bg,
        color: c.text,
      }}
    >
      <span className="flex items-baseline gap-1.5">
        <span
          className={cn(
            "truncate font-semibold leading-tight",
            compact ? "text-[10px]" : "text-[11px]",
          )}
        >
          {seance.module}
        </span>
      </span>
      {!court && !compact ? (
        <>
          <span className="mt-0.5 block truncate text-[10px] opacity-90">
            {seance.debut}–{seance.fin} · {seance.salle}
          </span>
          <span className="block truncate text-[10px] opacity-75">
            {nomProf} · {seance.groupe}
          </span>
        </>
      ) : (
        <span className="block truncate text-[9px] opacity-80">
          {seance.debut} · {seance.groupe}
        </span>
      )}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Disposition des chevauchements                                     */
/* ------------------------------------------------------------------ */

type Place = { seance: Seance; colonne: number; colonnes: number };

/**
 * Répartit les séances qui se chevauchent sur plusieurs colonnes.
 * Sans cela, deux séances au même horaire se superposeraient et l'une
 * masquerait l'autre.
 */
function disposer(seances: Seance[]): Place[] {
  const tri = [...seances].sort(
    (a, b) => minutesDepuisMinuit(a.debut) - minutesDepuisMinuit(b.debut),
  );
  const places: Place[] = [];
  let groupe: Seance[] = [];
  let finGroupe = -1;

  const vider = () => {
    if (!groupe.length) return;
    const colonnes: Seance[][] = [];
    for (const s of groupe) {
      let placee = false;
      for (const col of colonnes) {
        const derniere = col[col.length - 1];
        if (minutesDepuisMinuit(s.debut) >= minutesDepuisMinuit(derniere.fin)) {
          col.push(s);
          placee = true;
          break;
        }
      }
      if (!placee) colonnes.push([s]);
    }
    colonnes.forEach((col, i) =>
      col.forEach((s) =>
        places.push({ seance: s, colonne: i, colonnes: colonnes.length }),
      ),
    );
    groupe = [];
    finGroupe = -1;
  };

  for (const s of tri) {
    const d = minutesDepuisMinuit(s.debut);
    if (groupe.length && d >= finGroupe) vider();
    groupe.push(s);
    finGroupe = Math.max(finGroupe, minutesDepuisMinuit(s.fin));
  }
  vider();
  return places;
}

/* ------------------------------------------------------------------ */
/*  Grille horaire (Jour / Semaine)                                    */
/* ------------------------------------------------------------------ */

function GrilleHoraire({
  jours,
  seances,
  nomProf,
  canDrag,
  onOpen,
  onDrop,
  onCreneauVide,
  jourChome,
  creneaux = CRENEAUX,
}: {
  jours: Date[];
  seances: Seance[];
  nomProf: (id: string) => string;
  canDrag: boolean;
  onOpen: (s: Seance) => void;
  onDrop: (id: string, date: string, debut: string) => void;
  onCreneauVide?: (date: string, debut: string) => void;
  jourChome?: LookupJourChome;
  /** Créneaux paramétrés : ils fixent l'amplitude de la grille et l'aimantation. */
  creneaux?: readonly Creneau[];
}) {
  // L'amplitude de la grille suit les créneaux paramétrés au lieu d'une plage
  // figée : ajouter un créneau du soir agrandit l'emploi du temps d'autant.
  const { debut: HEURE_DEBUT, fin: HEURE_FIN } = useMemo(
    () => bornesGrilleHoraire(creneaux),
    [creneaux],
  );

  const heures = useMemo(() => {
    const out: number[] = [];
    for (let h = HEURE_DEBUT; h <= HEURE_FIN; h += 1) out.push(h);
    return out;
  }, [HEURE_DEBUT, HEURE_FIN]);

  const hauteur = (HEURE_FIN - HEURE_DEBUT) * HEURE_PX;
  const dragId = useRef<string | null>(null);
  const [survol, setSurvol] = useState<string | null>(null);

  /**
   * Convertit une position verticale en heure de début.
   *
   * La séance déposée s'aimante sur le créneau paramétré dont le début est le
   * plus proche ; sans créneau exploitable, on retombe sur un pas régulier.
   */
  const heureDepuisY = (y: number) => {
    const minutes = Math.max(0, y / MINUTE_PX) + HEURE_DEBUT * 60;
    if (creneaux.length) {
      let proche = creneaux[0];
      let ecart = Infinity;
      for (const c of creneaux) {
        const d = Math.abs(minutesDepuisMinuit(c.debut) - minutes);
        if (d < ecart) {
          ecart = d;
          proche = c;
        }
      }
      return proche.debut;
    }
    const cale = Math.round(minutes / PAS_MINUTES) * PAS_MINUTES;
    const h = Math.min(HEURE_FIN, Math.floor(cale / 60));
    return `${String(h).padStart(2, "0")}:${String(cale % 60).padStart(2, "0")}`;
  };

  return (
    <div className="overflow-x-auto">
      <div
        className="grid min-w-[42rem]"
        style={{
          gridTemplateColumns: `4rem repeat(${jours.length}, minmax(8rem, 1fr))`,
        }}
      >
        {/* En-tête des jours */}
        <div className="sticky top-0 z-20 border-b border-brand/12 bg-card" />
        {jours.map((j) => {
          const today = estAujourdhui(j);
          const chome = jourChome?.(isoDate(j)) ?? null;
          return (
            <div
              key={j.toISOString()}
              className={cn(
                "sticky top-0 z-20 border-b border-s border-brand/12 bg-card px-2 py-2 text-center",
                today && "bg-brand/8",
                chome && "bg-muted/70",
              )}
            >
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {JOURS_COURTS[(j.getDay() + 6) % 7]}
              </p>
              <p
                className={cn(
                  "mx-auto mt-1 grid h-7 w-7 place-items-center rounded-full text-sm font-bold",
                  today && !chome
                    ? "bg-brand text-white"
                    : chome
                      ? "text-muted-foreground"
                      : "text-foreground",
                )}
              >
                {j.getDate()}
              </p>
              {chome ? (
                <div className="mt-1">
                  <BadgeChome jour={chome} compact />
                </div>
              ) : null}
            </div>
          );
        })}

        {/* Colonne des heures */}
        <div className="relative" style={{ height: hauteur }}>
          {heures.slice(0, -1).map((h, i) => (
            <div
              key={h}
              className="absolute end-2 -translate-y-1/2 text-[10px] font-medium tabular-nums text-muted-foreground"
              style={{ top: i * HEURE_PX }}
            >
              {String(h).padStart(2, "0")}:00
            </div>
          ))}
        </div>

        {/* Colonnes des jours */}
        {jours.map((j) => {
          const iso = isoDate(j);
          const duJour = seances.filter((s) => s.date === iso);
          const places = disposer(duJour);
          // Jour chômé : ni dépôt ni création de séance, et un fond hachuré
          // pour que la colonne vide se lise comme fermée, pas comme libre.
          const chome = jourChome?.(iso) ?? null;

          return (
            <div
              key={iso}
              className={cn(
                "relative border-s border-brand/12",
                estAujourdhui(j) && !chome && "bg-brand/[0.03]",
                survol === iso && canDrag && !chome && "bg-brand/8",
                chome && "bg-muted/40",
              )}
              style={{
                height: hauteur,
                ...(chome
                  ? {
                      backgroundImage:
                        "repeating-linear-gradient(45deg, rgb(var(--istpm-shadow) / 0.05) 0 6px, transparent 6px 12px)",
                    }
                  : null),
              }}
              onDragOver={(e) => {
                if (!canDrag || chome) return;
                e.preventDefault();
                setSurvol(iso);
              }}
              onDragLeave={() => setSurvol((v) => (v === iso ? null : v))}
              onDrop={(e) => {
                if (!canDrag || chome || !dragId.current) return;
                e.preventDefault();
                const rect = e.currentTarget.getBoundingClientRect();
                onDrop(dragId.current, iso, heureDepuisY(e.clientY - rect.top));
                dragId.current = null;
                setSurvol(null);
              }}
            >
              {/* Lignes horaires   repères visuels seulement */}
              {heures.slice(0, -1).map((h, i) => (
                <div
                  key={h}
                  className="pointer-events-none absolute inset-x-0 border-t border-brand/8"
                  style={{ top: i * HEURE_PX }}
                />
              ))}

              {/* Bandes des créneaux paramétrés : cliquer en pose une séance
                  aux heures officielles, plutôt qu'à une heure ronde arbitraire. */}
              {!chome &&
                creneaux.map((c) => {
                  const top =
                    (minutesDepuisMinuit(c.debut) - HEURE_DEBUT * 60) *
                    MINUTE_PX;
                  const h =
                    (minutesDepuisMinuit(c.fin) - minutesDepuisMinuit(c.debut)) *
                    MINUTE_PX;
                  return (
                    <div
                      key={c.debut}
                      className={cn(
                        "absolute inset-x-0 border-y border-brand/5 bg-brand/[0.02]",
                        onCreneauVide && "cursor-pointer hover:bg-brand/8",
                      )}
                      style={{ top, height: Math.max(h, 0) }}
                      title={
                        onCreneauVide
                          ? `Créer une séance ${c.debut} – ${c.fin}`
                          : `${c.debut} – ${c.fin}`
                      }
                      onClick={() => onCreneauVide?.(iso, c.debut)}
                    />
                  );
                })}

              {places.map(({ seance, colonne, colonnes }) => {
                const top =
                  (minutesDepuisMinuit(seance.debut) - HEURE_DEBUT * 60) *
                  MINUTE_PX;
                const h =
                  (minutesDepuisMinuit(seance.fin) -
                    minutesDepuisMinuit(seance.debut)) *
                  MINUTE_PX;
                const largeur = 100 / colonnes;
                return (
                  <div
                    key={seance.id}
                    className="absolute p-[2px]"
                    style={{
                      top,
                      height: Math.max(h, 22),
                      insetInlineStart: `${colonne * largeur}%`,
                      width: `${largeur}%`,
                    }}
                  >
                    <SeanceBloc
                      seance={seance}
                      nomProf={nomProf(seance.professeurId)}
                      canDrag={canDrag}
                      compact={colonnes > 1}
                      onOpen={onOpen}
                      onDragStart={(s, e) => {
                        dragId.current = s.id;
                        e.dataTransfer.effectAllowed = "move";
                        // Requis par Firefox pour amorcer le glisser.
                        e.dataTransfer.setData("text/plain", s.id);
                      }}
                    />
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Vues exportées                                                     */
/* ------------------------------------------------------------------ */

export function VueJour(props: {
  date: Date;
  seances: Seance[];
  nomProf: (id: string) => string;
  canDrag: boolean;
  onOpen: (s: Seance) => void;
  onDrop: (id: string, date: string, debut: string) => void;
  onCreneauVide?: (date: string, debut: string) => void;
  jourChome?: LookupJourChome;
  creneaux?: readonly Creneau[];
}) {
  return <GrilleHoraire {...props} jours={[props.date]} />;
}

export function VueSemaine(props: {
  jours: Date[];
  seances: Seance[];
  nomProf: (id: string) => string;
  canDrag: boolean;
  onOpen: (s: Seance) => void;
  onDrop: (id: string, date: string, debut: string) => void;
  onCreneauVide?: (date: string, debut: string) => void;
  jourChome?: LookupJourChome;
  creneaux?: readonly Creneau[];
}) {
  return <GrilleHoraire {...props} />;
}

export function VueMois({
  mois,
  seances,
  nomProf,
  onOpen,
  onJour,
  horsCalendrier,
  jourChome,
}: {
  /** N'importe quelle date du mois affiché. */
  mois: Date;
  seances: Seance[];
  nomProf: (id: string) => string;
  onOpen: (s: Seance) => void;
  onJour: (d: Date) => void;
  /**
   * Jours hors année scolaire (juillet, août) : la grille du mois déborde
   * toujours sur les mois voisins, et ces cases-là ne doivent ni s'ouvrir ni
   * laisser croire qu'un cours pourrait y être posé.
   */
  horsCalendrier?: (d: Date) => boolean;
  jourChome?: LookupJourChome;
}) {
  const cellules = useMemo(() => {
    const premier = new Date(mois.getFullYear(), mois.getMonth(), 1);
    const debut = new Date(premier);
    debut.setDate(premier.getDate() - ((premier.getDay() + 6) % 7));
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(debut);
      d.setDate(debut.getDate() + i);
      return d;
    });
  }, [mois]);

  return (
    <div className="overflow-hidden rounded-2xl border border-brand/12">
      <div className="grid grid-cols-7 border-b border-brand/12 bg-muted">
        {JOURS_COURTS.map((j) => (
          <div
            key={j}
            className="px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
          >
            {j}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cellules.map((d) => {
          const iso = isoDate(d);
          const duJour = seances
            .filter((s) => s.date === iso)
            .sort(
              (a, b) =>
                minutesDepuisMinuit(a.debut) - minutesDepuisMinuit(b.debut),
            );
          const horsMois = d.getMonth() !== mois.getMonth();
          const horsAnnee = horsCalendrier?.(d) ?? false;
          const chome = horsAnnee ? null : (jourChome?.(iso) ?? null);
          const today = estAujourdhui(d);

          return (
            <div
              key={iso}
              className={cn(
                "min-h-[6.5rem] border-b border-e border-brand/8 p-1.5 transition-colors",
                horsMois && "bg-muted/40",
                horsAnnee && "bg-muted/60",
                chome && "bg-muted/30",
                today && !horsAnnee && !chome && "bg-brand/[0.06]",
              )}
            >
              <button
                type="button"
                onClick={() => onJour(d)}
                disabled={horsAnnee}
                title={horsAnnee ? "Hors année scolaire" : undefined}
                className={cn(
                  "mb-1 grid h-6 w-6 place-items-center rounded-full text-[11px] font-semibold transition-colors",
                  horsAnnee
                    ? "cursor-default text-muted-foreground/35"
                    : "hover:bg-brand/15",
                  today && !horsAnnee
                    ? "bg-brand text-white"
                    : horsMois
                      ? "text-muted-foreground/50"
                      : "text-foreground",
                )}
              >
                {d.getDate()}
              </button>

              {chome ? (
                <div className="mb-1">
                  <BadgeChome jour={chome} compact />
                </div>
              ) : null}

              <div className="space-y-1">
                {duJour.slice(0, 3).map((s) => {
                  const c = couleurSeance(s.module);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => onOpen(s)}
                      title={`${s.module} · ${nomProf(s.professeurId)} · ${s.salle}`}
                      className="block w-full truncate rounded-md border-s-2 px-1.5 py-0.5 text-start text-[10px] font-medium transition-transform hover:translate-x-0.5"
                      style={{
                        backgroundColor: c.soft,
                        borderInlineStartColor: c.bg,
                        color: c.text,
                      }}
                    >
                      {s.debut} {s.module}
                    </button>
                  );
                })}
                {duJour.length > 3 ? (
                  <button
                    type="button"
                    onClick={() => onJour(d)}
                    className="px-1 text-[10px] font-semibold text-brand-dk hover:underline"
                  >
                    +{duJour.length - 3} autres
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export { JOURS_LONGS, TYPE_SEANCE_LABEL };
