import pourquoiImg from "@/assets/images/sections/pourquoi.jpg";
import { BracketHead } from "@/components/bracket-head";
import { Photo } from "@/components/photo";
import { Reveal } from "@/components/reveal";
import { BtnIc, Icon, cx } from "@/lib/ui";

type Reason = { icon: string; tile?: string; title: string; text: string; validate?: string };

const LEFT: Reason[] = [
  {
    icon: "stethoscope",
    title: "Apprendre par la pratique",
    text: "Salles de travaux pratiques, mises en situation et gestes répétés jusqu’à la maîtrise.",
  },
  {
    icon: "users",
    title: "Un encadrement de proximité",
    text: "Une équipe pédagogique disponible, qui suit chaque étudiant tout au long de son parcours.",
    validate: "À confirmer : organisation de l’encadrement",
  },
  {
    icon: "hospital",
    title: "Le terrain pendant la formation",
    text: "Des stages en milieu de soins pour appliquer ses acquis, selon le parcours.",
  },
];

const RIGHT: Reason[] = [
  {
    icon: "shield-check",
    tile: "tile tile--red",
    title: "Des filières reconnues",
    text: "Les formations Infirmier polyvalent et Sage-femme sont accréditées par l’État.",
    validate: "Accréditation à confirmer",
  },
  {
    icon: "compass",
    title: "Une vraie préparation au métier",
    text: "Posture, éthique, communication avec le patient : se préparer à la réalité du terrain.",
  },
  {
    icon: "map-pin",
    title: "Se former au cœur du Souss",
    text: "Un campus à Agadir, pour étudier près de chez soi sans quitter la région.",
  },
];

function ReasonList({ items, side }: { items: Reason[]; side: "left" | "right" }) {
  return (
    <ul className={cx("why__col", `why__col--${side}`)}>
      {items.map((r, i) => {
        const arrowPosition =
          i === 0 ? "why__arrow--top" :
          i === 1 ? "why__arrow--middle" :
          "why__arrow--bottom";

        return (
          <Reveal
            as="li"
            key={r.title}
            className="why__item"
            delay={i * 2 + (side === "right" ? 1 : 0)}
            data-validate={r.validate}
          >
            <span className={r.tile ?? "tile"}>
              <Icon name={r.icon} />
            </span>

            <div>
              <h3>{r.title}</h3>
              <p>{r.text}</p>
            </div>

            <svg className={cx("why__arrow", arrowPosition)} viewBox="0 0 60 44" aria-hidden="true">
              {i === 0 && (
                <>
                  <path pathLength={1} d="M3 5c17 0 31 8 40 26" />
                  <path pathLength={1} d="M34 27l9 4 2-10" />
                </>
              )}

              {i === 1 && (
                <>
                  <path pathLength={1} d="M3 22h40" />
                  <path pathLength={1} d="M35 15l8 7-8 7" />
                </>
              )}

              {i === 2 && (
                <>
                  <path pathLength={1} d="M3 39c17 0 31-8 40-26" />
                  <path pathLength={1} d="M34 13l9-4 2 10" />
                </>
              )}
            </svg>
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
          <ReasonList items={LEFT} side="left" />
          <Photo
            className="why__photo"
            src={pourquoiImg}
            alt="Geste de soin : une soignante gantée auprès d’un patient"
            motif="hand-heart"
            brief="Photo · Formatrice et étudiants, geste de soin"
          />
          <ReasonList items={RIGHT} side="right" />
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
