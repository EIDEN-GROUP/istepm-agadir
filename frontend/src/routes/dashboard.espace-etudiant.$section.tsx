/**
 * Sections de l'espace étudiant, chacune sur son propre chemin :
 *   /dashboard/espace-etudiant/scolarite | stage | calendrier | paiements | demandes
 *
 * La vue est partagée avec la route de base ; seul le segment `section` change.
 * Un segment inconnu est renvoyé vers « scolarite ».
 */
import { createFileRoute, redirect } from "@tanstack/react-router";
import {
  EspaceEtudiantView,
  SECTION_KEYS,
  type EspaceSection,
} from "./dashboard.espace-etudiant";

export const Route = createFileRoute("/dashboard/espace-etudiant/$section")({
  beforeLoad: ({ params }) => {
    if (!(SECTION_KEYS as readonly string[]).includes(params.section)) {
      throw redirect({
        to: "/dashboard/espace-etudiant/$section",
        params: { section: "scolarite" },
      });
    }
  },
  component: SectionRoute,
});

function SectionRoute() {
  const { section } = Route.useParams();
  return <EspaceEtudiantView section={section as EspaceSection} />;
}
