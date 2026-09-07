import * as React from "react";

// Le shell « desktop » (sidebar fixe) n'apparaît qu'à partir de `lg` (1024px).
// En dessous — téléphone ET tablette — on utilise le shell compact (menu
// hamburger + barre du bas), sinon 768–1023px hérite d'une sidebar masquée.
const MOBILE_BREAKPOINT = 1024;

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(
    undefined,
  );

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isMobile;
}
