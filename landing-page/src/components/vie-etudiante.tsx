import { Fragment } from "react";
import vieAtelier from "@/assets/images/sections/vie-atelier.jpeg";
import vieCampus from "@/assets/images/sections/vie-campus.png";
import vieFacade from "@/assets/images/sections/vie-facade.jpg";
import { BracketHead } from "@/components/bracket-head";
import { Photo } from "@/components/photo";
import { Reveal } from "@/components/reveal";
import { BtnIc, INSTAGRAM_URL, Icon } from "@/lib/ui";

const EVENTS = [
  "Journée d’intégration",
  "Ateliers gestes d’urgence",
  "Journée mondiale de la santé",
  "Conférences santé",
  "Remise des diplômes",
];

export function VieEtudiante() {
  return (
    <section className="section" id="vie-etudiante" aria-labelledby="vie-title">
      <div className="container">
        <BracketHead
          tag="Vie étudiante"
          titleId="vie-title"
          title={
            <>
              Une vie de campus qui <em className="accent">donne envie</em>.
            </>
          }
        >
          <p>
            Des cours, des ateliers, des rencontres&#8239;: l’ISTEPM, c’est aussi une communauté d’étudiants qui partagent
            la même vocation.
          </p>
        </BracketHead>
        <div className="gallery">
          <Photo
            className="g-a"
            src={vieCampus}
            alt="Étudiants de l’ISTEPM en tenue de soins"
            motif="users"
            brief="Photo · Étudiants entre deux cours"
          />
          <Photo
            className="ph--light g-b"
            src={vieFacade}
            alt="Façade de l’ISTEPM à Agadir"
            motif="book-open"
            brief="Photo · Révisions en binôme"
            delay={1}
          />
          <Reveal as="article" className="g-card g-d" delay={2} data-validate="Description des espaces à valider">
            <div>
              <h3>Le campus au quotidien</h3>
              <p>
                Salles de cours, salles de travaux pratiques, espaces communs&#8239;: un cadre pensé pour apprendre,
                réviser et échanger.
              </p>
            </div>
            <ul>
              <li className="chip chip--teal">Salles de TP</li>
              <li className="chip chip--teal">Espaces communs</li>
              <li className="chip chip--teal">Ateliers</li>
            </ul>
          </Reveal>
          <Photo
            className="g-c"
            src={vieAtelier}
            alt="Atelier de premiers secours sur mannequin"
            motif="heart-pulse"
            brief="Photo · Atelier premiers secours"
            focus="35% 27%"
          />
          <Reveal as="a" className="g-card g-ig g-e" href={INSTAGRAM_URL} target="_blank" rel="noopener" delay={1}>
            <Icon name="instagram" className="g-ig__icon" aria-hidden="true" />
            <div>
              <span className="g-ig__handle">@istepm_agadir</span>
              <p>Événements, ateliers, moments de vie&#8239;: suivez l’institut au quotidien.</p>
            </div>
            <span className="btn btn--light btn--sm" style={{ alignSelf: "flex-start" }}>
              Suivre l’institut
              <BtnIc />
            </span>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
