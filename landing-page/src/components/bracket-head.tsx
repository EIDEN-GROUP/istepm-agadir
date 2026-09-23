import type { ReactNode } from "react";
import { Reveal } from "@/components/reveal";

type BracketHeadProps = {
  /** Petit sur-titre affiché entre crochets, en colonne 1. */
  tag: string;
  titleId: string;
  title: ReactNode;
  /** Sous-titre / intro sous le titre (colonnes 2 à 4). */
  children?: ReactNode;
};

/** En-tête « [ tag ] + grand titre » aligné sur la grille 4 colonnes des sections. */
export function BracketHead({ tag, titleId, title, children }: BracketHeadProps) {
  return (
    <div className="bhead">
      <Reveal as="span" className="bhead__tag brk">
        {tag}
      </Reveal>
      <div className="bhead__main">
        <Reveal as="h2" className="h2" id={titleId} delay={1}>
          {title}
        </Reveal>
        {children && (
          <Reveal className="bhead__sub" delay={2}>
            {children}
          </Reveal>
        )}
      </div>
    </div>
  );
}
