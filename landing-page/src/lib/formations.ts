import aideSoignant from "@/assets/images/formations/aide-soignant.jpg";
import infirmierAuxiliaire from "@/assets/images/formations/infirmier-auxiliaire.jpg";
import infirmierPolyvalent from "@/assets/images/formations/infirmier-polyvalent.jpg";
import sageFemme from "@/assets/images/formations/sage-femme.jpg";

export type Formation = {
  id: string;
  name: string;
  desc: string;
  photo: string;
  /** Cadrage de la photo dans le demi-disque (object-position). */
  focus: string;
  duration: string;
  durationValidate?: string;
  diplome: string;
};

/**
 * Ajouter une formation ici suffit : elle apparaît dans le carrousel du hero et dans la section Formations
 * (qui défile toute seule au-delà de ce qui tient à l’écran).
 */
export const FORMATIONS: Formation[] = [
  {
    id: "f-infirmier-polyvalent",
    name: "Infirmier polyvalent",
    desc: "Assurer des soins de qualité dans tous les services : soins techniques, prévention, éducation à la santé et accompagnement du patient.",
    photo: infirmierPolyvalent,
    focus: "50% 30%",
    duration: "3 ans",
    diplome: "Accrédité par l’État",
  },
  {
    id: "f-sage-femme",
    name: "Sage-femme",
    desc: "Accompagner la femme et le nouveau-né : suivi de grossesse, accouchement, soins après la naissance et santé reproductive.",
    photo: sageFemme,
    focus: "70% 50%",
    duration: "3 ans",
    durationValidate: "Durée à confirmer",
    diplome: "Accrédité par l’État",
  },
  {
    id: "f-infirmier-auxiliaire",
    name: "Infirmier auxiliaire",
    desc: "Participer aux soins courants au sein d’une équipe soignante, sous la responsabilité de l’infirmier.",
    photo: infirmierAuxiliaire,
    focus: "50% 35%",
    duration: "2 ans",
    diplome: "Qualification professionnelle",
  },
  {
    id: "f-aide-soignant",
    name: "Aide-soignant",
    desc: "Assurer le confort, l’hygiène et l’accompagnement quotidien des patients, en collaboration avec l’équipe soignante.",
    photo: aideSoignant,
    focus: "42% 40%",
    duration: "1 an",
    diplome: "Qualification professionnelle",
  },
];
