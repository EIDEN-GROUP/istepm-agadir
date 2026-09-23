import { useEffect, useRef, useState } from "react";
import { BtnIc, Icon, PHONE } from "@/lib/ui";

const NAV = [
  { id: "institut", label: "Institut" },
  { id: "formations", label: "Formations" },
  { id: "vie-etudiante", label: "Vie étudiante" },
  { id: "admission", label: "Admission" },
  { id: "contact", label: "Contact" },
];

const MOBILE_NAV = [
  { id: "institut", label: "Institut" },
  { id: "formations", label: "Formations" },
  { id: "vie-etudiante", label: "Vie étudiante" },
  { id: "faq", label: "Questions fréquentes" },
  { id: "contact", label: "Contact" },
];

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const menuBtn = useRef<HTMLButtonElement>(null);

  /* Header : état « scrollé » (classe sur <html>, lue par le CSS du header et du menu) */
  useEffect(() => {
    const root = document.documentElement;
    const onScroll = () => root.classList.toggle("is-scrolled", window.scrollY > 24);
    addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => removeEventListener("scroll", onScroll);
  }, []);

  /* Menu mobile */
  useEffect(() => {
    document.documentElement.classList.toggle("menu-open", menuOpen);
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setMenuOpen(false);
      menuBtn.current?.focus();
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [menuOpen]);

  useEffect(() => {
    const mq = matchMedia("(min-width: 1081px)");
    const onChange = (e: MediaQueryListEvent) => {
      if (e.matches) setMenuOpen(false);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  /* Lien actif dans la navigation */
  useEffect(() => {
    if (!("IntersectionObserver" in window)) return;
    const spy = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) setActiveId(en.target.id);
        });
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    ["top", ...NAV.map((n) => n.id)].forEach((id) => {
      const s = document.getElementById(id);
      if (s) spy.observe(s);
    });
    return () => spy.disconnect();
  }, []);

  const closeMenu = () => setMenuOpen(false);

  return (
    <>
      <header className="site-header">
        <nav className="nav-bar" aria-label="Navigation principale">
          <a className="brand" href="#top" aria-label="ISTEPM Agadir, retour en haut de page">
            <svg className="brand__mark" viewBox="150 -4 865 780" aria-hidden="true">
              <use href="#em" />
            </svg>
            {/* <span className="brand__txt">
              <small>Institut Spécialisé des Techniques Paramédicales</small>
            </span> */}
          </a>
          <div className="nav-links">
            {NAV.map((n) => (
              <a key={n.id} href={`#${n.id}`} className={activeId === n.id ? "is-active" : undefined}>
                {n.label}
              </a>
            ))}
          </div>
          <div className="nav-actions">
            <a className="icon-btn nav-call" href={`tel:${PHONE}`} aria-label="Appeler l’ISTEPM au 05 28 23 55 11">
              <Icon name="phone" />
            </a>
            <a className="btn btn--red btn--sm" href="#admission">
              S’inscrire
              <BtnIc />
            </a>
            <button
              ref={menuBtn}
              className="icon-btn menu-btn"
              type="button"
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              aria-label={menuOpen ? "Fermer le menu" : "Ouvrir le menu"}
              onClick={() => setMenuOpen((open) => !open)}
            >
              <Icon name="menu" className="i-menu" />
              <Icon name="x" className="i-close" />
            </button>
          </div>
        </nav>
      </header>
      <nav className="mobile-menu" id="mobile-menu" aria-label="Menu mobile" inert={!menuOpen}>
        {MOBILE_NAV.map((n) => (
          <a key={n.id} href={`#${n.id}`} onClick={closeMenu}>
            {n.label}
            <Icon name="arrow-right" />
          </a>
        ))}
        <a className="btn btn--red" href="#admission" onClick={closeMenu}>
          Commencer ma pré-inscription
          <BtnIc />
        </a>
      </nav>
    </>
  );
}
