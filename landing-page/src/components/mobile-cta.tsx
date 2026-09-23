import { useEffect, useState } from "react";
import { BtnIc, Icon, PHONE, cx } from "@/lib/ui";

/** Barre d’action mobile : visible après le hero, masquée sur l’admission et le footer. */
export function MobileCta() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!("IntersectionObserver" in window)) return;
    let heroOut = false;
    const covering = new Set<Element>();
    const update = () => setVisible(heroOut && covering.size === 0);

    const hero = new IntersectionObserver(([en]) => {
      heroOut = !en.isIntersecting;
      update();
    });
    const cover = new IntersectionObserver((entries) => {
      entries.forEach((en) => (en.isIntersecting ? covering.add(en.target) : covering.delete(en.target)));
      update();
    });
    const heroEl = document.querySelector(".hero");
    if (heroEl) hero.observe(heroEl);
    [document.getElementById("admission"), document.querySelector(".footer")].forEach((el) => el && cover.observe(el));
    return () => {
      hero.disconnect();
      cover.disconnect();
    };
  }, []);

  return (
    <div className={cx("mobile-cta", visible && "is-visible")} id="mobile-cta" inert={!visible}>
      <a className="icon-btn" href={`tel:${PHONE}`} aria-label="Appeler l’ISTEPM">
        <Icon name="phone" />
      </a>
      <a className="btn btn--red btn--sm" href="#admission">
        S’inscrire
        <BtnIc />
      </a>
    </div>
  );
}
