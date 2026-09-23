import { useEffect, useRef } from "react";
import { A11y, Autoplay, Keyboard, Pagination } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import type { Swiper as SwiperInstance } from "swiper";
import "swiper/css";
import "swiper/css/pagination";
import { BracketHead } from "@/components/bracket-head";
import { Reveal } from "@/components/reveal";
import { FORMATIONS, type Formation } from "@/lib/formations";
import { BtnIc, Icon, reduceMotion } from "@/lib/ui";

export type PickProps = {
  /** Pré-sélectionne la formation dans le formulaire de pré-inscription. */
  onPick: (formation: string) => void;
};

type FormationContentProps = PickProps & {
  f: Formation;
  index: number;
  /** `p` dans le hero, qui n’a pas de titre de niveau 2. */
  titleAs?: "h3" | "p";
};

/** Fiche formation : photo en demi-disque + [n], titre, texte, repères et lien d’inscription (section Formations et hero). */
export function FormationContent({ f, index, onPick, titleAs: Title = "h3" }: FormationContentProps) {
  return (
    <>
      <div className="fcol__disc" aria-hidden="true">
        <img src={f.photo} alt="" decoding="async" style={{ objectPosition: f.focus }} />
      </div>
      <div className="fcol__body">
        <span className="fcol__index brk" aria-hidden="true">
          {index}
        </span>
        <Title className="fcol__title">{f.name}</Title>
        <p className="fcol__desc">{f.desc}</p>
        <p className="fcol__meta" data-validate="Accès et diplôme à confirmer par l’ISTEPM">
          <span data-validate={f.durationValidate}>{f.duration}</span> · Baccalauréat · {f.diplome}
        </p>
        <a className="fcol__link link-arrow" href="#admission" onClick={() => onPick(f.name)}>
          Je m’inscris
          <Icon name="arrow-up-right" />
        </a>
      </div>
    </>
  );
}

/** Colonne du carrousel de la section : la fiche, révélée au scroll et ciblable par #f-…. */
function FormationCol({ f, index, onPick }: { f: Formation; index: number } & PickProps) {
  return (
    <Reveal as="article" className="fcol" id={f.id} delay={(index - 1) % 4}>
      <FormationContent f={f} index={index} onPick={onPick} />
    </Reveal>
  );
}

export function Formations({ onPick }: PickProps) {
  const swiperRef = useRef<SwiperInstance | null>(null);

  /* Liens #f-… (footer) : amener la bonne formation dans le carrousel. */
  useEffect(() => {
    const show = () => {
      const i = FORMATIONS.findIndex((f) => `#${f.id}` === location.hash);
      if (i >= 0) swiperRef.current?.slideTo(i);
    };
    show();
    addEventListener("hashchange", show);
    return () => removeEventListener("hashchange", show);
  }, []);

  return (
    <section className="section section--flush-top" id="formations" aria-labelledby="formations-title">
      <div className="container">
        <BracketHead
          tag="Formations"
          titleId="formations-title"
          title={
            <>
              Quatre parcours pour <em className="accent">prendre soin</em> des autres.
            </>
          }
        >
          <p>Chaque formation est présentée avec les mêmes repères&#8239;: durée, accès, diplôme.</p>
        </BracketHead>

        <Swiper
          className="fswiper"
          modules={[A11y, Autoplay, Keyboard, Pagination]}
          slidesPerView={1.15}
          spaceBetween={20}
          breakpoints={{
            641: { slidesPerView: 2, spaceBetween: 24 },
            1101: { slidesPerView: 4, spaceBetween: 28 },
          }}
          speed={700}
          rewind
          watchOverflow
          autoplay={reduceMotion ? false : { delay: 4500, disableOnInteraction: false, pauseOnMouseEnter: true }}
          pagination={{ clickable: true }}
          keyboard={{ enabled: true, onlyInViewport: true }}
          a11y={{
            containerMessage: "Formations de l’ISTEPM",
            slideLabelMessage: "Formation {{index}} sur {{slidesLength}}",
            paginationBulletMessage: "Afficher la formation {{index}}",
          }}
          onSwiper={(s) => (swiperRef.current = s)}
        >
          {FORMATIONS.map((f, i) => (
            <SwiperSlide key={f.id}>
              <FormationCol f={f} index={i + 1} onPick={onPick} />
            </SwiperSlide>
          ))}
        </Swiper>

        <Reveal className="help-bar">
          <p>
            <Icon name="compass" />
            Vous hésitez entre deux formations&#8239;? L’équipe d’admission vous aide à choisir.
          </p>
          <a className="btn btn--sm btn--light" href="#admission" onClick={() => onPick("Je ne sais pas encore")}>
            Être conseillé(e)
            <BtnIc />
          </a>
        </Reveal>
      </div>
    </section>
  );
}
