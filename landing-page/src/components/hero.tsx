import { useState } from "react";
import { A11y, Autoplay, EffectFade, Pagination } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/effect-fade";
import "swiper/css/pagination";
import heroImg from "@/assets/images/sections/istpm image hero.png";
import { FormationContent, type PickProps } from "@/components/formations";
import { Reveal } from "@/components/reveal";
import { FORMATIONS } from "@/lib/formations";
import { BtnIc, FACEBOOK_URL, INSTAGRAM_URL, Icon, PHONE, PHONE_LABEL, cx, reduceMotion } from "@/lib/ui";

const PULSE =
  "M0 54 L548.0 54 Q556.8 46.3 565.6 54 L572.2 54 L575.5 60.6 L582.1 20.0 L588.7 68.3 L593.1 54 L605.2 54 Q616.2 40.8 629.4 54 L705.0 54 Q713.8 46.3 722.6 54 L729.2 54 L732.5 60.6 L739.1 20.0 L745.7 68.3 L750.1 54 L762.2 54 Q773.2 40.8 786.4 54 L862.0 54 Q870.8 46.3 879.6 54 L886.2 54 L889.5 60.6 L896.1 20.0 L902.7 68.3 L907.1 54 L919.2 54 Q930.2 40.8 943.4 54 L1440 54";

/** Bas du hero : mêmes colonnes d’info que la section Contact (libellé, valeur, ↗ au survol). */
const INFOS = [
  { href: "#contact", label: "Adresse", value: "49, rue Abdellah Guenoune, Cité Salam, Agadir, Maroc" },
  { href: `tel:${PHONE}`, label: "Téléphone", value: PHONE_LABEL, nowrap: true },
  { href: INSTAGRAM_URL, label: "Instagram", value: "@istepm_agadir", external: true },
  { href: FACEBOOK_URL, label: "Facebook", value: "ISTEPM Agadir", external: true },
];

export function Hero({ onPick }: PickProps) {
  const [photoLoaded, setPhotoLoaded] = useState(false);
  const [photoFailed, setPhotoFailed] = useState(false);
  /** Nombre de changements de formation dans le carrousel : relance le tracé de la flèche. */
  const [turn, setTurn] = useState(0);

  return (
    <section className="hero" id="top" aria-labelledby="hero-title">
      <div className="hero__frame on-dark">
        <div className={cx("hero__photo", photoLoaded && "is-loaded")} aria-hidden="true">
          {!photoFailed && (
            <img src={heroImg} alt="" fetchPriority="high" onLoad={() => setPhotoLoaded(true)} onError={() => setPhotoFailed(true)} />
          )}
        </div>

        <div className="hero__content">
          <Reveal as="span" className="chip chip--glass hero__kicker" delay={0}>
            <Icon name="graduation-cap" />
            Institut Spécialisé des Techniques Paramédicales · Agadir
          </Reveal>
          <Reveal as="h1" className="display" id="hero-title" delay={1}>
            Préparez votre <span className="accent">avenir</span> dans les métiers de la santé.
          </Reveal>
          <Reveal as="p" className="hero__lead" delay={2}>
            Infirmier, sage-femme, aide-soignant : formez-vous à Agadir dans un institut qui relie la théorie à la
            pratique, du premier cours jusqu’au terrain.
          </Reveal>
          <Reveal className="hero__actions" delay={3}>
            <a className="btn btn--red" href="#admission">
              S’inscrire
              <BtnIc />
            </a>
            <a className="btn btn--ghost" href="#formations">
              Découvrir les formations
            </a>
          </Reveal>
        </div>

        <Reveal as="aside" className="hero__side" delay={4} aria-label="Aperçu des formations">
          <p className="hero__note" aria-hidden="true">
            <span className="hero__note-txt">Du cours au terrain</span>
            {/* Nouvelle clé à chaque formation : la flèche se redessine vers la fiche. */}
            <svg key={turn} className={turn ? "is-redraw" : undefined} viewBox="0 0 60 44">
              <path pathLength={1} d="M3 5c16 1 31 9 39 29" />
              <path pathLength={1} d="M33 30.5l9 4.5 3-9.5" />
            </svg>
          </p>
          <div className={cx("hero-card", turn > 0 && "is-cycling")}>
            <Swiper
              className="hcar"
              modules={[A11y, Autoplay, EffectFade, Pagination]}
              effect="fade"
              fadeEffect={{ crossFade: true }}
              speed={700}
              rewind
              autoplay={reduceMotion ? false : { delay: 5000, disableOnInteraction: false, pauseOnMouseEnter: true }}
              pagination={{ clickable: true }}
              a11y={{
                slideLabelMessage: "Formation {{index}} sur {{slidesLength}}",
                paginationBulletMessage: "Afficher la formation {{index}}",
              }}
              onSlideChange={(s) => {
                s.el.style.setProperty("--progress", "0");
                setTurn((t) => t + 1);
              }}
              onAutoplayTimeLeft={(s, _ms, left) => s.el.style.setProperty("--progress", String(1 - left))}
            >
              {FORMATIONS.map((f, i) => (
                <SwiperSlide key={f.id}>
                  <div className="fcol">
                    <FormationContent f={f} index={i + 1} onPick={onPick} titleAs="p" />
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>
          </div>
        </Reveal>

        <div className="hero__meta">
          {/* <svg className="hero__pulse" aria-hidden="true" viewBox="0 0 1440 92" preserveAspectRatio="none">
            <path className="base" pathLength={1} vectorEffect="non-scaling-stroke" d={PULSE} />
            <path className="blip" pathLength={1} vectorEffect="non-scaling-stroke" d={PULSE} />
          </svg> */}
          {INFOS.map((info, i) => (
            <Reveal
              as="a"
              key={info.label}
              className="cinfo__item"
              href={info.href}
              delay={5 + i}
              {...(info.external ? { target: "_blank", rel: "noopener" } : {})}
            >
              <small>{info.label}</small>
              <b className={info.nowrap ? "nowrap" : undefined}>{info.value}</b>
              <Icon name="arrow-up-right" className="cinfo__arrow" aria-hidden="true" />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
