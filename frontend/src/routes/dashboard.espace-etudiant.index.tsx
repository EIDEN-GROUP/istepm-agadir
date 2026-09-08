/**
 * `/dashboard/espace-etudiant` (exact).
 *   · étudiant → renvoyé vers la première section (Scolarité)
 *   · staff    → file des demandes à traiter
 */
import { createFileRoute, redirect } from "@tanstack/react-router";
import { getStoredRole } from "@/lib/auth";
import { EspaceEtudiantView } from "./dashboard.espace-etudiant";

export const Route = createFileRoute("/dashboard/espace-etudiant/")({
  beforeLoad: () => {
    if (getStoredRole() === "etudiant") {
      throw redirect({
        to: "/dashboard/espace-etudiant/$section",
        params: { section: "scolarite" },
      });
    }
  },
  component: () => <EspaceEtudiantView />,
});
