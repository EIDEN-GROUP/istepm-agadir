import { BracketHead } from "@/components/bracket-head";
import { Reveal } from "@/components/reveal";
import { BtnIc, FACEBOOK_URL, INSTAGRAM_URL, Icon, PHONE, PHONE_LABEL } from "@/lib/ui";

const GEO = "30.403307,-9.5511623";
const PLACE_URL = "https://maps.app.goo.gl/h4DLL9w3AAUtMJ8d8";
const DIRECTIONS_URL = `https://www.google.com/maps/dir/?api=1&destination=${GEO}&hl=fr`;
const MAP_EMBED_URL = `https://www.google.com/maps?q=${GEO}&z=16&output=embed&hl=fr&gl=ma`;

function InfoItem({ href, label, value, delay, external, validate, nowrap }: {
  href: string;
  label: string;
  value: string;
  delay: number;
  external?: boolean;
  validate?: string;
  nowrap?: boolean;
}) {
  return (
    <Reveal
      as="a"
      className="cinfo__item"
      href={href}
      delay={delay}
      data-validate={validate}
      {...(external ? { target: "_blank", rel: "noopener" } : {})}
    >
      <small>{label}</small>
      <b className={nowrap ? "nowrap" : undefined}>{value}</b>
      <Icon name="arrow-up-right" className="cinfo__arrow" aria-hidden="true" />
    </Reveal>
  );
}

/** Carte Google Maps affichée directement (chargée quand elle approche de l’écran). */
function MapCard() {
  return (
    <Reveal className="cmap" id="map-card" delay={1}>
      <div className="cmap__frame">
        <iframe
          src={MAP_EMBED_URL}
          title="Carte : ISTEPM, Cité Salam, Agadir"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        ></iframe>
      </div>
      <div className="cmap__bar">
        <div>
          <b>Localisation</b>
          <span>Cité Salam, Agadir</span>
        </div>
        <a className="btn btn--sm" href={DIRECTIONS_URL} target="_blank" rel="noopener">
          Itinéraire
          <BtnIc name="navigation" />
        </a>
      </div>
    </Reveal>
  );
}

export function Contact() {
  return (
    <section className="section" id="contact" aria-labelledby="contact-title">
      <div className="container">
        <BracketHead
          tag="Contact"
          titleId="contact-title"
          title={
            <>
              Venez nous <em className="accent">rencontrer</em>.
            </>
          }
        >
          <p>
            Une visite, une question, un doute sur votre orientation&#8239;? L’équipe de l’institut vous accueille à
            Agadir.
          </p>
        </BracketHead>

        <div className="cinfo">
          <InfoItem href={PLACE_URL} external label="Adresse" value="49, rue Abdellah Guenoune, Cité Salam, Agadir" delay={1} />
          <InfoItem href={`tel:${PHONE}`} label="Téléphone" value={PHONE_LABEL} delay={2} nowrap />
          <InfoItem
            href="mailto:istepm@hotmail.com"
            label="E-mail"
            value="istepm@hotmail.com"
            delay={3}
            validate="E-mail issu d’un annuaire en ligne : à confirmer (et horaires d’accueil à ajouter)"
          />
          <InfoItem href={INSTAGRAM_URL} external label="Instagram" value="@istepm_agadir" delay={1} />
          <InfoItem href={FACEBOOK_URL} external label="Facebook" value="ISTEPM Agadir" delay={2} />
        </div>

        <MapCard />
      </div>
    </section>
  );
}
