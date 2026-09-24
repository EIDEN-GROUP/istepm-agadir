import { useRef, useState, type ReactNode } from "react";
import { A11y, Autoplay, Keyboard } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import type { Swiper as SwiperInstance } from "swiper";
import "swiper/css";
import { BracketHead } from "@/components/bracket-head";
import { Reveal } from "@/components/reveal";
import { Icon, reduceMotion } from "@/lib/ui";

// Textes d’exemple : à remplacer par de vrais témoignages, recueillis avec l’accord écrit des personnes.
const QUOTES: { text: string; initial: string; author: string; role: ReactNode }[] = [
  {
    text: "Ce qui m’a rassurée, c’est la pratique : on répète les gestes en salle avant d’arriver en stage.",
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

/** Le mode loop de Swiper veut plus de slides que de cartes visibles (3) : la liste est répétée jusqu’à 6 au moins. */
const SLIDES = Array.from({ length: Math.ceil(6 / QUOTES.length) }, () => QUOTES).flat();

export function Temoignages() {
  const swiperRef = useRef<SwiperInstance | null>(null);
  const [active, setActive] = useState(0);

  /** Puce n° i : va vers la copie de ce témoignage la plus proche. */
  const show = (i: number) => {
    const s = swiperRef.current;
    if (!s) return;
    const gap = (k: number) => Math.min(Math.abs(k - s.realIndex), SLIDES.length - Math.abs(k - s.realIndex));
    let target = i;
    for (let k = i; k < SLIDES.length; k += QUOTES.length) if (gap(k) < gap(target)) target = k;
    s.slideToLoop(target);
  };

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

        <Reveal className="tcar">
          <Swiper
            className="tswiper"
            modules={[A11y, Autoplay, Keyboard]}
            slidesPerView={1.15}
            spaceBetween={16}
            breakpoints={{ 641: { slidesPerView: 2 }, 1101: { slidesPerView: 3 } }}
            loop
            speed={700}
            autoplay={reduceMotion ? false : { delay: 5000, disableOnInteraction: false, pauseOnMouseEnter: true }}
            keyboard={{ enabled: true, onlyInViewport: true }}
            // Libellés posés sur chaque slide : Swiper compterait les copies (« 4 sur 6 »).
            a11y={{ containerMessage: "Témoignages", slideLabelMessage: "" }}
            onSwiper={(s) => (swiperRef.current = s)}
            onRealIndexChange={(s) => setActive(s.realIndex % QUOTES.length)}
          >
            {SLIDES.map((q, i) => {
              const n = (i % QUOTES.length) + 1;
              return (
                <SwiperSlide
                  key={i}
                  aria-label={`Témoignage ${n} sur ${QUOTES.length}`}
                  // Les copies ne sont là que pour la boucle : lues une seule fois par les lecteurs d’écran.
                  aria-hidden={i >= QUOTES.length || undefined}
                >
                  <figure className="quote" data-validate="Témoignage d’exemple : à remplacer par un témoignage réel">
                    <div className="quote__top">
                      <span className="quote__index brk" aria-hidden="true">
                        {n}
                      </span>
                      <span className="chip chip--sample">Texte d’exemple</span>
                      <Icon name="quote" className="quote__icon" aria-hidden="true" />
                    </div>
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
                  </figure>
                </SwiperSlide>
              );
            })}
          </Swiper>

          <div className="tdots">
            {QUOTES.map((q, i) => (
              <button
                key={q.author}
                type="button"
                className={i === active ? "is-active" : undefined}
                aria-label={`Afficher le témoignage ${i + 1}`}
                aria-current={i === active || undefined}
                onClick={() => show(i)}
              />
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
