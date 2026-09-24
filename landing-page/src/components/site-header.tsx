import { useEffect, useRef, useState } from "react";
import { lockScroll } from "@/lib/smooth-scroll";
import { BtnIc, FACEBOOK_URL, INSTAGRAM_URL, Icon, PHONE, PHONE_LABEL, delay } from "@/lib/ui";

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
  { id: "admission", label: "Admission" },
  { id: "faq", label: "Questions fréquentes" },
  { id: "contact", label: "Contact" },
];

/** Parties de la page rendues inertes pendant que le tiroir est ouvert (le focus reste dans le menu). */
const BEHIND_DRAWER = "#contenu, .site-header, .footer";

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const menuBtn = useRef<HTMLButtonElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  /** Fermeture au clavier ou par la croix : le focus revient sur le bouton du menu. */
  const refocus = useRef(false);

  /** Ouvre / ferme le tiroir ; le défilement est bloqué tout de suite (un lien #ancre peut défiler juste après). */
  const toggleMenu = (open: boolean, returnFocus = false) => {
    refocus.current = returnFocus;
    setMenuOpen(open);
    lockScroll(open);
    document.documentElement.classList.toggle("menu-open", open);
  };

  /* Header : état « scrollé » (classe sur <html>, lue par le CSS du header) */
  useEffect(() => {
    const root = document.documentElement;
    const onScroll = () => root.classList.toggle("is-scrolled", window.scrollY > 24);
    addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => removeEventListener("scroll", onScroll);
  }, []);

  /* Tiroir ouvert : le reste de la page devient inerte et le focus entre dans le menu ; à la fermeture, il revient. */
  useEffect(() => {
    document.querySelectorAll<HTMLElement>(BEHIND_DRAWER).forEach((el) => (el.inert = menuOpen));
    if (menuOpen) closeBtn.current?.focus();
    else if (refocus.current) menuBtn.current?.focus();
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") toggleMenu(false, true);
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [menuOpen]);

  useEffect(() => {
    const mq = matchMedia("(min-width: 1081px)");
    const onChange = (e: MediaQueryListEvent) => {
      if (e.matches) toggleMenu(false);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  /* Lien actif : la section qui occupe le milieu de l’écran (aucun lien si elle n’est pas dans le menu). */
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
    document.querySelectorAll("#contenu > section[id]").forEach((s) => spy.observe(s));
    return () => spy.disconnect();
  }, []);

  const closeMenu = () => toggleMenu(false);
  const linkClass = (id: string) => (activeId === id ? "is-active" : undefined);

  return (
    <>
      <header className="site-header">
        <nav className="nav-bar" aria-label="Navigation principale">
          <a className="brand" href="#top" aria-label="ISTEPM Agadir, retour en haut de page">
            <svg className="brand__mark" viewBox="150 -4 865 780" aria-hidden="true">
              <use href="#em" />
            </svg>
          </a>
          <div className="nav-links">
            {NAV.map((n) => (
              <a key={n.id} href={`#${n.id}`} className={linkClass(n.id)} aria-current={activeId === n.id || undefined}>
                {n.label}
              </a>
            ))}
          </div>
          <div className="nav-actions">
            <a className="icon-btn nav-call" href={`tel:${PHONE}`} aria-label="Appeler l’ISTEPM au 05 28 23 55 11">
              <Icon name="phone" />
            </a>
            <a className="btn btn--red btn--sm nav-cta" href="#admission">
              S’inscrire
              <BtnIc />
            </a>
            <button
              ref={menuBtn}
              className="icon-btn menu-btn"
              type="button"
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              aria-label="Ouvrir le menu"
              onClick={() => toggleMenu(true)}
            >
              <Icon name="menu" />
            </button>
          </div>
        </nav>
      </header>

      {/* Menu mobile : tiroir latéral (liens numérotés, inscription, coordonnées) sur un voile qui ferme au clic. */}
      <div className="drawer-backdrop" aria-hidden="true" onClick={closeMenu} />
      <aside
        className="drawer"
        id="mobile-menu"
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        inert={!menuOpen}
        data-lenis-prevent
      >
        <div className="drawer__head">
          <a className="drawer__brand" href="#top" aria-label="ISTEPM Agadir, retour en haut de page" onClick={closeMenu}>
            <svg viewBox="0 0 1100.48 953.38" aria-hidden="true">
              <use href="#em" />
              <use href="#em-letters" />
            </svg>
          </a>
          <button ref={closeBtn} className="drawer__close" type="button" aria-label="Fermer le menu" onClick={() => toggleMenu(false, true)}>
            <Icon name="x" />
          </button>
        </div>

        <p className="drawer__tag brk">Menu</p>
        <nav aria-label="Menu mobile">
          <ol className="drawer__links">
            {MOBILE_NAV.map((n, i) => (
              <li key={n.id} style={delay(i)}>
                <a href={`#${n.id}`} className={linkClass(n.id)} aria-current={activeId === n.id || undefined} onClick={closeMenu}>
                  <span className="drawer__n" aria-hidden="true">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="drawer__label">{n.label}</span>
                  <Icon name="arrow-up-right" />
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <a className="btn btn--red drawer__cta" href="#admission" onClick={closeMenu}>
          Commencer ma pré-inscription
          <BtnIc />
        </a>

        <div className="drawer__contact">
          <a href={`tel:${PHONE}`}>
            <small>Téléphone</small>
            <b className="nowrap">{PHONE_LABEL}</b>
          </a>
          <p>
            <small>Adresse</small>
            <b>49, rue Abdellah Guenoune, Cité Salam, Agadir</b>
          </p>
          <p className="drawer__social">
            <a href={INSTAGRAM_URL} target="_blank" rel="noopener">
              Instagram
            </a>
            <a href={FACEBOOK_URL} target="_blank" rel="noopener">
              Facebook
            </a>
          </p>
        </div>
      </aside>
    </>
  );
}
