import type { ReactNode } from "react";
import salleCours from "@/assets/images/sections/salle-cours.png";
import sallePratique from "@/assets/images/sections/salle-pratique.png";
import { BracketHead } from "@/components/bracket-head";
import { Reveal } from "@/components/reveal";
import { Icon } from "@/lib/ui";

type Stat = {
  /** Case de la grille (grid-template-areas de .inst__grid). */
  area: string;
  /** Rang dans la vague d'apparition (ligne + colonne). */
  delay: number;
  href: string;
  label: string;
  title: ReactNode;
  text: string;
  validate?: string;
};

const STATS: Stat[] = [
  {
    area: "c1",
    delay: 0,
    href: "#formations",
    label: "Filières",
    title: "4",
    text: "formations paramédicales, de l’aide-soignant à la sage-femme.",
  },
  {
    area: "c2",
    delay: 3,
    href: "#formations",
    label: "Durée",
    title: (
      <>
        1–3<small>ans</small>
      </>
    ),
    text: "de formation, selon le parcours choisi.",
  },
  {
    area: "c3",
    delay: 2,
    href: "#formations",
    label: "Reconnaissance",
    title: (
      <>
        2<small>filières</small>
      </>
    ),
    text: "accréditées par l’État : Infirmier polyvalent et Sage-femme.",
    validate: "Accréditation mentionnée par un annuaire en ligne : à confirmer par l’ISTEPM",
  },
  {
    area: "c4",
    delay: 3,
    href: "#contact",
    label: "Campus",
    title: "Agadir",
    text: "49, rue Abdellah Guenoune, Cité Salam.",
  },
];

const PHOTOS = [
  { area: "p1", delay: 2, src: sallePratique, alt: "Salle de travaux pratiques de l’ISTEPM" },
  { area: "p2", delay: 1, src: salleCours, alt: "Salle de cours de l’ISTEPM" },
];

export function Institut() {
  return (
    <section className="section" id="institut" aria-labelledby="institut-title">
      <div className="container">
        <div className="panel inst">
          <BracketHead
            tag="L’Institut"
            titleId="institut-title"
            title={
              <>
                Un institut paramédical <em className="accent">ancré</em> à Agadir.
              </>
            }
          />

          <div className="inst__grid">
            <Reveal className="inst__txt" style={{ gridArea: "txt" }} delay={1}>
              <p>
                L’Institut Spécialisé des Techniques Paramédicales (ISTEPM) est un établissement privé de formation aux
                métiers du soin. Sa mission&#8239;: préparer des professionnels compétents et humains, grâce à un
                enseignement qui associe cours, travaux pratiques et stages.
              </p>
            </Reveal>

            {STATS.map((s) => (
              <Reveal
                as="a"
                key={s.label}
                className="inst-card"
                href={s.href}
                style={{ gridArea: s.area }}
                delay={s.delay}
                data-validate={s.validate}
              >
                <span className="inst-card__top">
                  <span className="inst-card__label brk">{s.label}</span>
                  <Icon name="arrow-up-right" className="inst-card__arrow" aria-hidden="true" />
                </span>
                <span>
                  <strong className="inst-card__title">{s.title}</strong>
                  <span className="inst-card__text">{s.text}</span>
                </span>
              </Reveal>
            ))}

            {PHOTOS.map((p) => (
              <Reveal as="figure" key={p.area} className="inst-photo" style={{ gridArea: p.area }} delay={p.delay}>
                <img src={p.src} alt={p.alt} loading="lazy" decoding="async" />
              </Reveal>
            ))}

            <Reveal as="a" className="inst-cta" href="#contact" style={{ gridArea: "cta" }} delay={4}>
              <span className="inst-cta__disc">
                <span className="inst-cta__label">
                  Venir visiter l’institut
                  <Icon name="arrow-up-right" />
                </span>
              </span>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
