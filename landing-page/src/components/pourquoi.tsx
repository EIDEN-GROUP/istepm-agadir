import pourquoiImg from "@/assets/images/sections/pourquoi.jpg";
import { BracketHead } from "@/components/bracket-head";
import { Photo } from "@/components/photo";
import { Reveal } from "@/components/reveal";
import { BtnIc, Icon, cx } from "@/lib/ui";

type Tone = "teal" | "deep" | "ink" | "red";
type Reason = { icon: string; tone: Tone; title: string; text: string; validate?: string };

/* Colonne de gauche : trois branches qui partent du cœur (la photo) vers l’extérieur. */
const LEFT: Reason[] = [
  {
    icon: "stethoscope",
    tone: "teal",
    title: "Apprendre par la pratique",
    text: "Salles de travaux pratiques, mises en situation et gestes répétés jusqu’à la maîtrise.",
  },
  {
    icon: "users",
    tone: "deep",
    title: "Un encadrement de proximité",
    text: "Une équipe pédagogique disponible, qui suit chaque étudiant tout au long de son parcours.",
    validate: "À confirmer : organisation de l’encadrement",
  },
  {
    icon: "hospital",
    tone: "ink",
    title: "Le terrain pendant la formation",
    text: "Des stages en milieu de soins pour appliquer ses acquis, selon le parcours.",
  },
];

/* Colonne de droite : trois autres branches, symétriques. */
const RIGHT: Reason[] = [
  {
    icon: "shield-check",
    tone: "red",
    title: "Des filières reconnues",
    text: "Les formations Infirmier polyvalent et Sage-femme sont accréditées par l’État.",
    validate: "Accréditation à confirmer",
  },
  {
    icon: "compass",
    tone: "teal",
    title: "Une vraie préparation au métier",
    text: "Posture, éthique, communication avec le patient : se préparer à la réalité du terrain.",
  },
  {
    icon: "map-pin",
    tone: "deep",
    title: "Se former au cœur du Souss",
    text: "Un campus à Agadir, pour étudier près de chez soi sans quitter la région.",
  },
];

const TILE: Record<Tone, string> = {
  teal: "tile",
  deep: "tile tile--deep",
  ink: "tile tile--ink",
  red: "tile tile--red",
};

/** Connecteur tracé à la main entre le cœur et un nœud (haut / milieu / bas). */
function Link({ pos }: { pos: "top" | "middle" | "bottom" }) {
  return (
    <svg className={cx("why__link", `why__link--${pos}`)} viewBox="0 0 108 88" aria-hidden="true">
      {pos === "top" && (
        <>
          <path className="why__link-line" pathLength={1} d="M100 66C71 61 44 36 15 27" />
          <path className="why__link-head" pathLength={1} d="M15 27l12.5 1.5M15 27l4 11.5" />
        </>
      )}
      {pos === "middle" && (
        <>
          <path className="why__link-line" pathLength={1} d="M100 46C69 41 45 50 15 44" />
          <path className="why__link-head" pathLength={1} d="M15 44l12-4M15 44l9.5 7.5" />
        </>
      )}
      {pos === "bottom" && (
        <>
          <path className="why__link-line" pathLength={1} d="M100 22C71 27 44 52 15 61" />
          <path className="why__link-head" pathLength={1} d="M15 61l12.5-1.5M15 61l4-11.5" />
        </>
      )}
    </svg>
  );
}

/** Une branche = un nœud (raison) relié au cœur par son connecteur. */
function Branch({ items, side }: { items: Reason[]; side: "left" | "right" }) {
  return (
    <ul className={cx("why__col", `why__col--${side}`)}>
      {items.map((r, i) => {
        const pos = i === 0 ? "top" : i === 1 ? "middle" : "bottom";
        return (
          <Reveal
            as="li"
            key={r.title}
            className={cx("why__node", `why__node--${r.tone}`)}
            delay={i * 2 + (side === "right" ? 1 : 0)}
            data-validate={r.validate}
          >
            <span className={TILE[r.tone]}>
              <Icon name={r.icon} />
            </span>
            <div className="why__node-body">
              <h3>{r.title}</h3>
              <p>{r.text}</p>
            </div>
            <Link pos={pos} />
          </Reveal>
        );
      })}
    </ul>
  );
}

export function Pourquoi() {
  return (
    <section className="section section--flush-top" id="pourquoi" aria-labelledby="pourquoi-title">
      <div className="container">
        <BracketHead
          tag="Pourquoi l’ISTEPM&#8239;?"
          titleId="pourquoi-title"
          title={
            <>
              Des raisons <em className="accent">concrètes</em> de nous faire confiance.
            </>
          }
        />
        <div className="why__grid">
          <Branch items={LEFT} side="left" />
          <div className="why__hub">
            <Photo
              className="why__photo"
              src={pourquoiImg}
              alt="Geste de soin : une soignante gantée auprès d’un patient"
              motif="hand-heart"
              brief="Photo · Formatrice et étudiants, geste de soin"
            />
          </div>
          <Branch items={RIGHT} side="right" />
        </div>
        <Reveal className="why__cta">
          <p>Faites le premier pas vers votre futur métier.</p>
          <a className="btn btn--red" href="#admission">
            S’inscrire
            <BtnIc />
          </a>
        </Reveal>
      </div>
    </section>
  );
}
