import { useEffect, useRef } from "react";
import { Admission } from "@/components/admission";
import { Contact } from "@/components/contact";
import { Faq } from "@/components/faq";
import { Formations } from "@/components/formations";
import { Hero } from "@/components/hero";
import { IconSprite } from "@/components/icon-sprite";
import { Institut } from "@/components/institut";
import { Loader } from "@/components/loader";
import { MobileCta } from "@/components/mobile-cta";
import { Pourquoi } from "@/components/pourquoi";
import type { PreinscriptionHandle } from "@/components/preinscription-form";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Temoignages } from "@/components/temoignages";
import { ToTop } from "@/components/to-top";
import { VieEtudiante } from "@/components/vie-etudiante";
import "@/lib/smooth-scroll";
import { Icon } from "@/lib/ui";

export default function App() {
  const formRef = useRef<PreinscriptionHandle>(null);
  const pickFormation = (formation: string) => formRef.current?.pick(formation);

  useEffect(() => {
    if (!(/[?&]review\b/.test(location.search) || location.hash === "#review")) return;
    document.documentElement.classList.add("review");
    document.querySelectorAll<HTMLElement>("[data-validate]").forEach((el) => {
      el.title = "À valider : " + el.dataset.validate;
    });
  }, []);

  return (
    <>
      <a className="skip-link" href="#contenu">Aller au contenu</a>
      <IconSprite />
      <Loader />

      <div className="review-banner" role="status">
        <Icon name="clipboard" />
        <span>Mode relecture | les éléments encadrés en rouge sont à valider par l’ISTEPM (survolez-les pour le détail).</span>
      </div>

      <SiteHeader />

      <main id="contenu">
        <Hero onPick={pickFormation} />
        <Institut />
        <Formations onPick={pickFormation} />
        <Pourquoi />
        <VieEtudiante />
        <Admission formRef={formRef} />
        <Temoignages />
        <Faq />
        <Contact />
      </main>

      <SiteFooter />
      <MobileCta />
      <ToTop />
    </>
  );
}
