import type { Ref } from "react";
import { BracketHead } from "@/components/bracket-head";
import { PreinscriptionCard, type PreinscriptionHandle } from "@/components/preinscription-form";
import { Reveal } from "@/components/reveal";
import { Icon, PHONE, PHONE_LABEL } from "@/lib/ui";

const DOCS = ["Copie du bac ou du dernier diplôme", "Relevés de notes", "Copie de la CIN", "Photos d’identité"];

export function Admission({ formRef }: { formRef: Ref<PreinscriptionHandle> }) {
  return (
    <section className="section section--flush-top" id="admission" aria-labelledby="admission-title">
      <div className="container">
        <BracketHead
          tag="Admission &amp; pré-inscription"
          titleId="admission-title"
          title={
            <>
              Votre projet <em className="accent">commence ici</em>.
            </>
          }
        >
          <p>Remplissez le formulaire&#8239;: l’équipe d’admission vous recontacte pour la suite de votre inscription.</p>
        </BracketHead>

        <PreinscriptionCard ref={formRef} />

        <Reveal className="help-bar adm-bar" delay={1}>
          <div className="docs" data-validate="Liste des pièces à confirmer">
            <Icon name="clipboard" />
            <div>
              <h3>À préparer</h3>
              <ul>
                {DOCS.map((doc) => (
                  <li key={doc}>{doc}</li>
                ))}
              </ul>
            </div>
          </div>
          <p className="admission__call">
            Une question sur l’admission&#8239;?{" "}
            <a className="nowrap" href={`tel:${PHONE}`}>
              {PHONE_LABEL}
            </a>
          </p>
        </Reveal>
      </div>
    </section>
  );
}
