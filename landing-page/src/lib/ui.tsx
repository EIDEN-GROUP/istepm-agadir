import type { CSSProperties, SVGProps } from "react";

/** Joint les classes CSS en ignorant les valeurs vides. */
export const cx = (...classes: (string | false | null | undefined)[]) => classes.filter(Boolean).join(" ");

/** Délai d'animation échelonné (`--d`), lu par les règles `[data-reveal]` et les liens du menu mobile. */
export const delay = (d: number) => ({ "--d": d }) as CSSProperties;

/** Lu une fois au chargement : coupe l’autoplay des carrousels. */
export const reduceMotion = typeof window !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

export const PHONE = "+212528235511";
export const PHONE_LABEL = "05 28 23 55 11";
export const INSTAGRAM_URL = "https://www.instagram.com/istepm_agadir/";
export const FACEBOOK_URL = "https://www.facebook.com/istepmagadir/";

type IconProps = SVGProps<SVGSVGElement> & { name: string };

/** Icône du sprite (`#i-<name>`), dessinée par la classe `.i`. */
export function Icon({ name, className, ...rest }: IconProps) {
  return (
    <svg className={cx("i", className)} {...rest}>
      <use href={`#i-${name}`} />
    </svg>
  );
}

/** Pastille ronde à icône en fin de bouton `.btn`. */
export function BtnIc({ name = "arrow-up-right" }: { name?: string }) {
  return (
    <span className="ic">
      <Icon name={name} />
    </span>
  );
}
