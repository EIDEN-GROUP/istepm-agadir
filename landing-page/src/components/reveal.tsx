import { useEffect, useRef, useState, type AllHTMLAttributes, type ElementType } from "react";
import { cx, delay as d } from "@/lib/ui";

const hasIO = typeof window !== "undefined" && "IntersectionObserver" in window;

// Un seul observateur partagé par toute la page, comme dans la version HTML.
let observer: IntersectionObserver | undefined;
const onEnter = new Map<Element, () => void>();

function getObserver() {
  observer ??= new IntersectionObserver(
    (entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        observer!.unobserve(en.target);
        onEnter.get(en.target)?.();
        onEnter.delete(en.target);
      });
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
  );
  return observer;
}

/** Apparition au scroll : `shown` passe à `true` quand l'élément entre dans l'écran. */
export function useReveal<T extends Element>() {
  const ref = useRef<T>(null);
  const [shown, setShown] = useState(!hasIO);
  useEffect(() => {
    const el = ref.current;
    if (!el || !hasIO) return;
    const io = getObserver();
    onEnter.set(el, () => setShown(true));
    io.observe(el);
    return () => {
      io.unobserve(el);
      onEnter.delete(el);
    };
  }, []);
  return [ref, shown] as const;
}

type RevealProps = Omit<AllHTMLAttributes<HTMLElement>, "as"> & {
  as?: ElementType;
  /** Rang dans l'échelonnement (`--d`). */
  delay?: number;
};

/** Élément `[data-reveal]` : reçoit `.is-in` une fois visible. */
export function Reveal({ as: Tag = "div", delay, className, style, ...rest }: RevealProps) {
  const [ref, shown] = useReveal<HTMLElement>();
  return (
    <Tag
      ref={ref}
      className={cx(className, shown && "is-in") || undefined}
      data-reveal=""
      style={delay === undefined ? style : { ...style, ...d(delay) }}
      {...rest}
    />
  );
}
