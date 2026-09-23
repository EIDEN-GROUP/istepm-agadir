import { useState } from "react";
import { Reveal } from "@/components/reveal";
import { Icon, cx } from "@/lib/ui";

type PhotoProps = {
  className: string;
  src: string;
  alt: string;
  /** Icône en filigrane affichée tant que la photo n'est pas chargée. */
  motif: string;
  /** Légende du placeholder (« Photo · … »). */
  brief: string;
  /** Cadrage de l'image (object-position), ex. "50% 30%". */
  focus?: string;
  delay?: number;
};

/** Emplacement photo : placeholder illustré, remplacé par l'image dès qu'elle charge (retirée si absente). */
export function Photo({ className, src, alt, motif, brief, focus, delay }: PhotoProps) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  return (
    <Reveal as="figure" className={cx("ph", className, loaded && "is-loaded")} delay={delay}>
      {!failed && (
        <img src={src} alt={alt} loading="lazy" decoding="async" style={focus ? { objectPosition: focus } : undefined} onLoad={() => setLoaded(true)} onError={() => setFailed(true)} />
      )}
      <Icon name={motif} className="ph__motif" aria-hidden="true" />
      <figcaption className="ph__brief">
        <span className="i-wrap">
          <Icon name="camera" />
        </span>
        {brief}
      </figcaption>
    </Reveal>
  );
}
