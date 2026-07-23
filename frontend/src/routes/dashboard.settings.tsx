import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Trash2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import {
  FILIERES,
  NIVEAUX,
  STRUCTURES_ACCUEIL,
  fmtMAD,
} from "@/lib/istpm-data";
import { useIstpm } from "@/lib/istpm-store";
import { ConfirmDialog } from "@/components/dash-form";
import {
  softCard,
  primaryPill,
  iconButtonDanger,
  eyebrowClass,
  toneBadge,
  softInput,
  labelClass,
  dialogSurface,
} from "@/lib/dash-ui";
import { PageHeader, DetailShell } from "@/components/dash-page";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type FiliereConfig = {
  nom: string;
  duree: string;
  fraisAnnuels: number;
  effectif: number;
};

function SettingsPage() {
  const { etudiants, reset } = useIstpm();

  // Effectifs come from the live store; the filière list itself is local
  // config, seeded once from the reference list.
  const [filieres, setFilieres] = useState<FiliereConfig[]>(() =>
    FILIERES.map((f) => ({
      nom: f,
      duree: "3 ans (S1–S6)",
      fraisAnnuels: 34000,
      effectif: 0,
    })),
  );
  const [addOpen, setAddOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [form, setForm] = useState({
    nom: "",
    duree: "3 ans (S1–S6)",
    fraisAnnuels: 34000,
  });

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Administration" title="Paramètres" />

      <section className={cn(softCard, "p-5")}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <p className={eyebrowClass}>Filières ({filieres.length})</p>
          <button onClick={() => setAddOpen(true)} className={primaryPill}>
            <Plus className="h-4 w-4" /> Ajouter une filière
          </button>
        </div>
        {filieres.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucune filière configurée.
          </p>
        ) : (
          <div className="divide-y divide-brand/8">
            {filieres.map((f) => (
              <div
                key={f.nom}
                className="flex items-center justify-between gap-3 py-3"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-foreground">{f.nom}</p>
                  <p className="text-xs text-muted-foreground">
                    {f.duree} · {fmtMAD(f.fraisAnnuels)} / an ·{" "}
                    {etudiants.filter((e) => e.filiere === f.nom).length}{" "}
                    étudiant(s)
                  </p>
                </div>
                <button
                  aria-label="Supprimer la filière"
                  onClick={() => {
                    setFilieres((prev) => prev.filter((x) => x.nom !== f.nom));
                    toast.success(`Filière supprimée — ${f.nom}`);
                  }}
                  className={iconButtonDanger}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className={cn(softCard, "p-5")}>
        <p className={eyebrowClass}>Cursus</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Cycle de 3 ans réparti en 6 semestres.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {NIVEAUX.map((n) => (
            <span
              key={n}
              className="rounded-full bg-brand/12 px-4 py-2 text-sm font-semibold text-brand-dk"
            >
              {n}
            </span>
          ))}
        </div>
      </section>

      <section className={cn(softCard, "p-5")}>
        <p className={eyebrowClass}>
          Structures d'accueil conventionnées ({STRUCTURES_ACCUEIL.length})
        </p>
        <ul className="mt-3 space-y-2">
          {STRUCTURES_ACCUEIL.map((s) => (
            <li
              key={s}
              className="flex items-center justify-between gap-3 rounded-2xl border border-brand/12 px-4 py-2.5"
            >
              <span className="text-sm text-foreground">{s}</span>
              <span className={toneBadge("teal")}>Conventionnée</span>
            </li>
          ))}
        </ul>
      </section>

      <section className={cn(softCard, "p-5")}>
        <p className={eyebrowClass}>Données de démonstration</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Les créations et modifications sont conservées dans ce navigateur.
          Réinitialiser restaure le jeu de données d'origine et efface toutes
          vos saisies.
        </p>
        <button
          onClick={() => setResetOpen(true)}
          className="mt-4 inline-flex items-center gap-2 rounded-full border border-alert/25 bg-card px-5 py-2.5 text-sm font-medium text-alert transition hover:bg-alert/10"
        >
          <RotateCcw className="h-4 w-4" /> Réinitialiser les données
        </button>
      </section>

      <ConfirmDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        title="Réinitialiser les données ?"
        message="Toutes les créations, modifications et suppressions effectuées seront perdues, et le jeu de démonstration d'origine sera restauré."
        confirmLabel="Réinitialiser"
        onConfirm={() => {
          reset();
          toast.success("Données de démonstration restaurées");
        }}
      />

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className={dialogSurface}>
          <DialogTitle className="sr-only">Nouvelle filière</DialogTitle>
          <DialogDescription className="sr-only">
            Ajouter une filière au cursus
          </DialogDescription>
          <DetailShell
            title="Nouvelle filière"
            subtitle="Ajouter une filière au cursus de l'institut"
            footer={
              <button
                className={cn(primaryPill, "w-full justify-center")}
                onClick={() => {
                  const nom = form.nom.trim();
                  if (!nom) {
                    toast.error("Le nom de la filière est obligatoire");
                    return;
                  }
                  if (filieres.some((f) => f.nom === nom)) {
                    toast.error("Cette filière existe déjà");
                    return;
                  }
                  setFilieres((prev) => [
                    ...prev,
                    { ...form, nom, effectif: 0 },
                  ]);
                  setForm({ nom: "", duree: "3 ans (S1–S6)", fraisAnnuels: 34000 });
                  setAddOpen(false);
                  toast.success(`Filière ajoutée — ${nom}`);
                }}
              >
                Ajouter
              </button>
            }
          >
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className={labelClass}>Nom de la filière</Label>
                <Input
                  value={form.nom}
                  onChange={(e) => setForm({ ...form, nom: e.target.value })}
                  placeholder="ex. Orthoptie"
                  className={softInput}
                />
              </div>
              <div className="space-y-1.5">
                <Label className={labelClass}>Durée</Label>
                <Input
                  value={form.duree}
                  onChange={(e) => setForm({ ...form, duree: e.target.value })}
                  className={softInput}
                />
              </div>
              <div className="space-y-1.5">
                <Label className={labelClass}>Frais annuels (MAD)</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.fraisAnnuels}
                  onChange={(e) =>
                    setForm({ ...form, fraisAnnuels: Number(e.target.value) })
                  }
                  className={softInput}
                />
              </div>
            </div>
          </DetailShell>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export const Route = createFileRoute("/dashboard/settings")({
  component: SettingsPage,
});
