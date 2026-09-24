import { Reveal } from "@/components/reveal";
import { BtnIc, FACEBOOK_URL, INSTAGRAM_URL, Icon, PHONE, PHONE_LABEL } from "@/lib/ui";

const INSTITUT_LINKS = [
  { href: "#institut", label: "Qui sommes-nous" },
  { href: "#pourquoi", label: "Pourquoi l’ISTEPM" },
  { href: "#pedagogie", label: "Pédagogie" },
  { href: "#vie-etudiante", label: "Vie étudiante" },
  { href: "#faq", label: "Questions fréquentes" },
];

const FORMATION_LINKS = [
  { href: "#f-infirmier-polyvalent", label: "Infirmier polyvalent" },
  { href: "#f-sage-femme", label: "Sage-femme" },
  { href: "#f-infirmier-auxiliaire", label: "Infirmier auxiliaire" },
  { href: "#f-aide-soignant", label: "Aide-soignant" },
];

export function SiteFooter() {
  return (
    <footer className="footer section--dark on-dark">
      <div className="container">
        <div className="footer__cta">
          <Reveal as="a" className="footer__cta-link" href="#admission">
            <h2 className="h2">
              Prêt(e) à <em className="accent">nous</em>&#8239; rejoindre ?
            </h2>
            <Icon name="arrow-up-right" className="footer__cta-arrow" aria-hidden="true" />
          </Reveal>
          <Reveal className="footer__cta-row" delay={1}>
            <div className="row">
              <a className="btn btn--red" href="#admission">
                S’inscrire
                <BtnIc />
              </a>
              <a className="btn btn--ghost" href={`tel:${PHONE}`}>
                <span className="nowrap">{PHONE_LABEL}</span>
              </a>
            </div>
          </Reveal>
        </div>
        <div className="footer__grid">
          <div className="footer__brand">
            <span className="footer__logo">
              <svg viewBox="0 0 1100.48 953.38" role="img" aria-label="Logo ISTEPM">
                <use href="#em" />
                <use href="#em-letters" />
              </svg>
            </span>
            <p>
              Institut Spécialisé des Techniques Paramédicales, Agadir. Formations d’infirmier polyvalent, de sage-femme,
              d’infirmier auxiliaire et d’aide-soignant.
            </p>
          </div>
          <div>
            <h3>L’institut</h3>
            <ul>
              {INSTITUT_LINKS.map((l) => (
                <li key={l.href}>
                  <a href={l.href}>{l.label}</a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3>Formations</h3>
            <ul>
              {FORMATION_LINKS.map((l) => (
                <li key={l.href}>
                  <a href={l.href}>{l.label}</a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3>Contact</h3>
            <ul>
              <li>
                <span>
                  49, rue Abdellah Guenoune
                  <br />
                  Cité Salam, Agadir
                </span>
              </li>
              <li>
                <a className="nowrap" href={`tel:${PHONE}`}>
                  {PHONE_LABEL}
                </a>
              </li>
              <li>
                <a href={INSTAGRAM_URL} target="_blank" rel="noopener">
                  Instagram
                </a>{" "}
                ·{" "}
                <a href={FACEBOOK_URL} target="_blank" rel="noopener">
                  Facebook
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="footer__bottom">
          <span>
            © <span id="year">{new Date().getFullYear()}</span> ISTEPM Agadir. Tous droits réservés.
          </span>
          <nav aria-label="Liens légaux" data-validate="Pages légales à créer">
            <a href="#">Mentions légales</a>
            <a href="#">Confidentialité</a>
          </nav>
        </div>
      </div>
    </footer>
  );
}
