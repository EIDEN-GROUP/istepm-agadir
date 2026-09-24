import { useEffect, useRef, useState, type AllHTMLAttributes, type ElementType } from "react";
import { cx, delay as d } from "@/lib/ui";

const hasIO = typeof window !== "undefined" && "IntersectionObserver" in window;

/** Position d’un élément par rapport à l’écran : visible, déjà dépassé (au-dessus) ou pas encore atteint (en dessous). */
export type RevealPos = "in" | "above" | "below";

/* Les apparitions attendent la fin du loader : sinon le haut de page s’animerait derrière lui. */
let markReady: () => void = () => {};
const pageReady = new Promise<void>((resolve) => (markReady = resolve));
/** Appelé par le loader quand il se retire : les éléments visibles peuvent apparaître. */
export const revealPage = () => markReady();

// Un seul observateur partagé par toute la page.
let observer: IntersectionObserver | undefined;
const listeners = new Map<Element, (pos: RevealPos) => void>();

function getObserver() {
  // Bande utile : l’élément sort par le haut un peu avant le bord (sous la barre de navigation). En bas, presque au bord :
  // une section plein écran a ses derniers éléments tout près du bas de l’écran, ils doivent quand même apparaître.
  observer ??= new IntersectionObserver(
    (entries) => {
      entries.forEach((en) => {
        const above = en.boundingClientRect.top < (en.rootBounds?.top ?? 0);
        listeners.get(en.target)?.(en.isIntersecting ? "in" : above ? "above" : "below");
      });
    },
    { rootMargin: "-12% 0px -2% 0px", threshold: 0 },
  );
  return observer;
}

/** Apparition au scroll, dans les deux sens : `pos` suit l’élément à l’entrée comme à la sortie de l’écran. */
export function useReveal<T extends Element>() {
  const ref = useRef<T>(null);
  const [pos, setPos] = useState<RevealPos>(hasIO ? "below" : "in");
  useEffect(() => {
    const el = ref.current;
    if (!el || !hasIO) return;
    let alive = true;
    const io = getObserver();
    listeners.set(el, setPos);
    pageReady.then(() => alive && io.observe(el));
    return () => {
      alive = false;
      io.unobserve(el);
      listeners.delete(el);
    };
  }, []);
  return [ref, pos] as const;
}

type RevealProps = Omit<AllHTMLAttributes<HTMLElement>, "as"> & {
  as?: ElementType;
  /** Rang dans l'échelonnement (`--d`). */
  delay?: number;
};

/** Élément `[data-reveal]` : `.is-in` quand il est à l’écran ; `data-reveal="above"` une fois dépassé (il sort par le haut). */
export function Reveal({ as: Tag = "div", delay, className, style, ...rest }: RevealProps) {
  const [ref, pos] = useReveal<HTMLElement>();
  return (
    <Tag
      ref={ref}
      className={cx(className, pos === "in" && "is-in") || undefined}
      data-reveal={pos === "above" ? "above" : ""}
      style={delay === undefined ? style : { ...style, ...d(delay) }}
      {...rest}
    />
  );
}
