import { useEffect, useRef, useState } from "react";
import { Icon, cx } from "@/lib/ui";

/** « Haut de page » flottant, en bas à droite : apparaît après le hero ; son anneau suit la progression du défilement. */
export function ToTop() {
  const [visible, setVisible] = useState(false);
  const ringRef = useRef<SVGCircleElement>(null);

  useEffect(() => {
    const update = () => {
      const max = document.documentElement.scrollHeight - innerHeight;
      ringRef.current?.style.setProperty("stroke-dashoffset", String(max > 0 ? 1 - scrollY / max : 1));
      setVisible(scrollY > innerHeight * 0.8);
    };
    update();
    addEventListener("scroll", update, { passive: true });
    addEventListener("resize", update);
    return () => {
      removeEventListener("scroll", update);
      removeEventListener("resize", update);
    };
  }, []);

  return (
    <a className={cx("to-top", visible && "is-visible")} href="#top" aria-label="Haut de page" inert={!visible}>
      <svg className="to-top__ring" viewBox="0 0 52 52" aria-hidden="true">
        <circle cx="26" cy="26" r="24" pathLength={1} />
        <circle ref={ringRef} cx="26" cy="26" r="24" pathLength={1} />
      </svg>
      <Icon name="arrow-up" />
    </a>
  );
}
