import type { ReactNode } from "react";
import { BracketHead } from "@/components/bracket-head";
import { Reveal } from "@/components/reveal";

// Textes d’exemple : à remplacer par de vrais témoignages, recueillis avec l’accord écrit des personnes.
const QUOTES: { text: string; initial: string; author: string; role: ReactNode }[] = [
  {
    text: "Ce qui m’a rassurée, c’est la pratique : on répète les gestes en salle avant d’arriver en stage.",
    initial: "É",
    author: "Étudiante",
    role: (
      <>
        Sage-femme · 2<sup>e</sup> année
      </>
    ),
  },
  {
    text: "L’encadrement m’a appris la rigueur et l’écoute. Je m’en sers chaque jour dans mon service.",
    initial: "D",
    author: "Diplômé",
    role: "Infirmier polyvalent",
  },
  {
    text: "Une équipe disponible, qui répond à nos questions et suit vraiment les étudiants.",
    initial: "P",
    author: "Parent d’étudiante",
    role: "Aide-soignant",
  },
];

export function Temoignages() {
  return (
    <section className="section" id="temoignages" aria-labelledby="temoignages-title">
      <div className="container">
        <BracketHead
          tag="Témoignages"
          titleId="temoignages-title"
          title={
            <>
              Ils parlent de <em className="accent">l’ISTEPM</em>.
            </>
          }
        >
          <p>Étudiants, diplômés, parents&#8239;: ceux qui vivent l’institut de l’intérieur.</p>
        </BracketHead>
        <div className="quotes">
          {QUOTES.map((q, i) => (
            <Reveal
              as="figure"
              key={q.author}
              className="quote"
              delay={i || undefined}
              data-validate="Témoignage d’exemple : à remplacer par un témoignage réel"
            >
              <span className="chip chip--sample">Texte d’exemple</span>
              <span className="quote__mark" aria-hidden="true">
                “
              </span>
              <blockquote>
                <p>{q.text}</p>
              </blockquote>
              <figcaption>
                <span className="avatar" aria-hidden="true">
                  {q.initial}
                </span>
                <div>
                  <b>{q.author}</b>
                  <span>{q.role}</span>
                </div>
              </figcaption>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
