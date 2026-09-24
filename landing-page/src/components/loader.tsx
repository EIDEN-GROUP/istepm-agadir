import { useEffect, useRef, useState } from "react";
import { revealPage } from "@/components/reveal";
import { lockScroll, scrollToHash } from "@/lib/smooth-scroll";
import { cx } from "@/lib/ui";

/** Durée minimale d’affichage : le temps de lire la marque. */
const MIN_TIME = 1400;
/** Au-delà, la page s’affiche même si des ressources traînent encore. */
const MAX_TIME = 7000;
/** Durée du lever de rideau (même valeur que la transition CSS de `.loader`). */
const EXIT_TIME = 1000;

/**
 * Écran de chargement : emblème, nom, compteur et ligne de progression.
 * Le compteur avance tant que la page charge (fonts, images, scripts), atteint 100 % à l’événement `load`,
 * puis l’écran se lève comme un rideau pendant que le haut de page apparaît.
 */
export function Loader() {
  const [leaving, setLeaving] = useState(false);
  const [gone, setGone] = useState(false);
  const countRef = useRef<HTMLSpanElement>(null);
  const barRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("is-loading");
    history.scrollRestoration = "manual";
    scrollTo(0, 0);
    lockScroll(true);

    let loaded = document.readyState === "complete";
    const onLoad = () => (loaded = true);
    addEventListener("load", onLoad);

    const start = performance.now();
    let shown = 0;
    let raf = 0;
    let exitTimer = 0;
    const tick = (now: number) => {
      const t = now - start;
      const done = (loaded && t > MIN_TIME) || t > MAX_TIME;
      // Pendant le chargement, la cible tend vers 90 % ; ensuite vers 100 %.
      const target = done ? 100 : 90 * (1 - Math.exp(-t / 900));
      shown += (target - shown) * (done ? 0.14 : 0.08);
      if (done && shown > 99.5) shown = 100;
      if (countRef.current) countRef.current.textContent = String(Math.round(shown));
      barRef.current?.style.setProperty("transform", `scaleX(${shown / 100})`);
      if (shown < 100) {
        raf = requestAnimationFrame(tick);
        return;
      }
      // Rideau qui se lève : le haut de page apparaît dessous ; la barre de défilement n’arrive qu’une fois la page découverte.
      if (location.hash.length > 1) scrollToHash(location.hash, true);
      root.classList.remove("is-loading");
      revealPage();
      setLeaving(true);
      exitTimer = window.setTimeout(() => {
        lockScroll(false);
        setGone(true);
      }, EXIT_TIME);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(exitTimer);
      removeEventListener("load", onLoad);
    };
  }, []);

  if (gone) return null;
  return (
    <div className={cx("loader", leaving && "is-leaving")} role="status" aria-label="Chargement de la page">
      <div className="loader__center" aria-hidden="true">
        <svg className="loader__mark" viewBox="0 0 1100.48 953.38">
          <use href="#em" />
          <use href="#em-letters" />
        </svg>
        {/* La devise du hero, écrite à la main comme la note « Du cours au terrain ». */}
        <p className="loader__phrase">
          <span>Du cours au terrain,</span> votre avenir dans la santé
        </p>
      </div>
      <div className="loader__foot" aria-hidden="true">
        <span className="loader__label">Institut Spécialisé des Techniques Paramédicales</span>
        <span className="loader__count">
          <span ref={countRef}>0</span>
          <small>%</small>
        </span>
      </div>
      <span className="loader__bar" aria-hidden="true">
        <i ref={barRef} />
      </span>
    </div>
  );
}
