import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { reduceMotion } from "@/lib/ui";

/**
 * Les sections plein écran gardent déjà la place de la barre de navigation (padding) : une ancre arrive pile sur la section.
 * Les cibles internes (fiche formation, formulaire) ont leur propre scroll-margin-top, que Lenis applique.
 */
const ANCHOR_OFFSET = 0;

/** Défilement doux de la page (Lenis) ; absent si l’utilisateur limite les animations : défilement natif. */
export const lenis = typeof window !== "undefined" && !reduceMotion ? new Lenis({ autoRaf: true, allowNestedScroll: true }) : null;

/** Défile vers une ancre (`#id`, `#top` = haut de page) ; `false` si la cible n’existe pas. */
export function scrollToHash(hash: string, immediate = false) {
  let id = hash.slice(1);
  try {
    id = decodeURIComponent(id);
  } catch {
    // Ancre mal encodée : on cherche l’identifiant tel quel.
  }
  const target = hash === "#top" ? 0 : document.getElementById(id);
  if (target === null) return false;
  // force : le saut doit marcher même page bloquée (arrivée sur une ancre pendant le loader).
  if (lenis) lenis.scrollTo(target, { offset: target === 0 ? 0 : ANCHOR_OFFSET, immediate, force: true });
  else if (target === 0) scrollTo({ top: 0, behavior: immediate ? "instant" : "smooth" });
  else target.scrollIntoView({ behavior: immediate ? "instant" : "smooth" });
  return true;
}

/** Bloque le défilement de la page (loader, menu mobile ouvert), puis le rétablit. */
export function lockScroll(locked: boolean) {
  document.documentElement.classList.toggle("is-locked", locked);
  if (!lenis) return;
  if (locked) lenis.stop();
  else lenis.start();
}

/* Liens #ancre : défilement Lenis au lieu du saut natif. L’URL et `hashchange` suivent quand même
   (le carrousel des formations écoute `hashchange` pour afficher la formation visée). */
if (lenis) {
  document.addEventListener("click", (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const link = (e.target as Element).closest<HTMLAnchorElement>('a[href^="#"]:not(.skip-link)');
    const hash = link?.getAttribute("href");
    if (!hash || hash === "#" || !scrollToHash(hash)) return;
    e.preventDefault();
    if (location.hash !== hash) {
      history.pushState(null, "", hash);
      dispatchEvent(new HashChangeEvent("hashchange"));
    }
  });
}
