import type { ReactNode } from "react";
import { BracketHead } from "@/components/bracket-head";
import { Reveal } from "@/components/reveal";
import { BtnIc, Icon, PHONE, PHONE_LABEL } from "@/lib/ui";

const QUESTIONS: { topic: string; q: string; a: ReactNode; validate?: string }[] = [
  {
    topic: "Admission",
    q: "Qui peut s’inscrire à l’ISTEPM ?",
    a: "Les formations sont ouvertes aux titulaires du baccalauréat ou d’un niveau équivalent, selon la filière. L’équipe d’admission vérifie avec vous les conditions exactes pour votre profil.",
    validate: "Conditions d’accès à confirmer",
  },
  {
    topic: "Admission",
    q: "Quelles pièces préparer pour le dossier ?",
    a: "En général : copie du baccalauréat ou du dernier diplôme, relevés de notes, copie de la CIN et photos d’identité. La liste définitive vous est confirmée après la pré-inscription.",
    validate: "Liste des pièces à confirmer",
  },
  {
    topic: "Formations",
    q: "Combien de temps durent les formations ?",
    a: "Aide-soignant : 1 an · Infirmier auxiliaire : 2 ans · Infirmier polyvalent : 3 ans · Sage-femme : 3 ans.",
    validate: "Durées à confirmer (notamment Sage-femme)",
  },
  {
    topic: "Formations",
    q: "Quelle place pour la pratique et les stages ?",
    a: "Une place centrale : travaux pratiques à l’institut, puis stages en milieu de soins selon la formation choisie.",
  },
  {
    topic: "Formations",
    q: "Les diplômes sont-ils reconnus ?",
    a: "Les filières Infirmier polyvalent et Sage-femme sont accréditées par l’État. Pour chaque formation, l’équipe d’admission vous précise le diplôme délivré.",
    validate: "Reconnaissance des diplômes à confirmer",
  },
  {
    topic: "Inscription",
    q: "Comment envoyer ma demande ?",
    a: (
      <>
        Remplissez le formulaire de pré-inscription ci-dessous&#8239;: deux minutes suffisent. Vous pouvez aussi nous
        appeler au{" "}
        <a className="nowrap" href={`tel:${PHONE}`}>
          {PHONE_LABEL}
        </a>
        .
      </>
    ),
  },
  {
    topic: "Inscription",
    q: "Que se passe-t-il après la pré-inscription ?",
    a: "L’équipe d’admission vous contacte pour confirmer votre choix de formation, vérifier votre éligibilité et planifier le dépôt de votre dossier complet.",
  },
];

export function Faq() {
  return (
    <section className="section section--flush-top" id="faq" aria-labelledby="faq-title">
      <div className="container">
        <BracketHead
          tag="Questions fréquentes"
          titleId="faq-title"
          title={
            <>
              Les réponses <em className="accent">avant</em> de vous lancer.
            </>
          }
        />
        <div className="faq">
          <Reveal className="faq__intro">
            <p>Tout ce qu’il faut savoir avant d’envoyer votre pré-inscription.</p>
            <div className="help-card">
              <b>Une autre question&#8239;?</b>
              <p>L’équipe d’admission vous répond et vous aide à choisir votre formation.</p>
              <div className="row">
                <a className="btn btn--light btn--sm" href={`tel:${PHONE}`}>
                  {PHONE_LABEL}
                  <BtnIc name="phone" />
                </a>
                <a className="btn btn--ghost btn--sm" href="#contact">
                  Nous écrire
                </a>
              </div>
            </div>
          </Reveal>
          <div className="faq__list">
            {QUESTIONS.map((item, i) => (
              <Reveal as="details" key={item.q} className="faq-item" delay={Math.min(i, 3)} data-validate={item.validate}>
                <summary>
                  <span className="faq-item__index brk" aria-hidden="true">
                    {i + 1}
                  </span>
                  <span className="faq-item__q">
                    <small>{item.topic}</small>
                    {item.q}
                  </span>
                  <Icon name="arrow-up-right" className="faq-item__arrow" aria-hidden="true" />
                </summary>
                <div className="faq-item__a">
                  <p>{item.a}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
