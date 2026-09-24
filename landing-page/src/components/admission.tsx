import type { Ref } from "react";
import { BracketHead } from "@/components/bracket-head";
import { PreinscriptionCard, type PreinscriptionHandle } from "@/components/preinscription-form";

export function Admission({ formRef }: { formRef: Ref<PreinscriptionHandle> }) {
  return (
    <section className="section section--dark on-dark" id="admission" aria-labelledby="admission-title">
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

        {/* Pièces à préparer et téléphone de l’admission : sur la dernière étape du formulaire. */}
        <PreinscriptionCard ref={formRef} />
      </div>
    </section>
  );
}
