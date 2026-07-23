import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, Loader2, Lock, Mail, ArrowRight } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

/**
 * Écran de connexion   panneau de marque à gauche, formulaire à droite.
 *
 * L'authentification est celle du backend (`POST /auth/login`) : aucun choix de
 * profil n'est proposé, le rôle est déduit du compte renvoyé par le serveur.
 */
function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError("Veuillez remplir tous les champs");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      navigate({ to: "/dashboard" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de connexion");
    } finally {
      setSubmitting(false);
    }
  };


  return (
    <div className="anim-rise relative min-h-dvh w-full overflow-hidden bg-white">
      {/* La grille occupe toute la hauteur : le partage marque / formulaire
          tient l'écran entier plutôt que de flotter en haut de page. */}
      <div className="grid min-h-dvh md:grid-cols-[1.05fr_1fr]">
          {/* Panneau de marque */}
          <div className="relative hidden bg-gradient-to-br from-brand-dk via-brand to-brand-md md:block">
            <img
              src="/istpm-logo-mark.svg"
              alt=""
              aria-hidden
              className="pointer-events-none absolute -bottom-16 -left-16 w-[26rem] max-w-none opacity-10"
            />

            <div className="relative flex h-full flex-col justify-between p-10">
              <img
                src="/istpm-logo-mark.svg"
                alt="ISTEPM Agadir"
                className="h-20 w-20 brightness-0 invert anim-fade"
              />
              <div className="anim-rise-sm max-w-xs pe-10">
                <p className="font-display text-2xl font-bold leading-tight text-white">
                  Institut spécialisé des techniques paramédicales
                </p>
                <p className="mt-3 text-sm leading-relaxed text-white/75">
                  Gestion des étudiants, des examens, des stages cliniques et du
                  recouvrement   en un seul espace.
                </p>
              </div>
            </div>

            {/* Bord incurvé : la courbe blanche mord sur le panneau teal. */}
            <svg
              aria-hidden
              viewBox="0 0 100 400"
              preserveAspectRatio="none"
              className="absolute inset-y-0 -right-px h-full w-[70px] text-white"
            >
              <path
                d="M45,0 C95,110 -5,230 45,400 L100,400 L100,0 Z"
                fill="currentColor"
              />
            </svg>
          </div>

          {/* Formulaire */}
          <div className="flex flex-col justify-center p-8 sm:p-10">
            {/* Marque compacte   visible seulement quand le panneau est masqué. */}
            <div className="mb-6 flex items-center gap-3 md:hidden">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand">
                <img
                  src="/istpm-logo-mark.svg"
                  alt="ISTEPM Agadir"
                  className="h-8 w-8 brightness-0 invert"
                />
              </span>
              <span className="font-display text-lg font-bold tracking-tight text-foreground">
                ISTEPM Agadir
              </span>
            </div>

            <div className="anim-rise-sm">
              <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
                Bienvenue
              </h1>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Connectez-vous pour accéder à votre espace
              </p>
            </div>

            <form onSubmit={handleSubmit} className="mt-7 space-y-4">
              {error ? (
                <div
                  role="alert"
                  className="anim-shake rounded-2xl bg-alert/10 px-4 py-3 text-sm font-medium text-alert"
                >
                  {error}
                </div>
              ) : null}

              <div className="relative">
                <Mail className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Adresse e-mail"
                  autoComplete="email"
                  autoFocus
                  aria-label="Adresse e-mail"
                  className="w-full rounded-full border border-brand/20 bg-brand-wash/60 py-3.5 ps-11 pe-4 text-sm text-foreground outline-none transition-all duration-300 placeholder:text-muted-foreground/60 focus:border-brand focus:bg-white focus:ring-4 focus:ring-brand/15"
                />
              </div>

              <div className="relative">
                <Lock className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mot de passe"
                  autoComplete="current-password"
                  aria-label="Mot de passe"
                  className="w-full rounded-full border border-brand/20 bg-brand-wash/60 py-3.5 ps-11 pe-12 text-sm text-foreground outline-none transition-all duration-300 placeholder:text-muted-foreground/60 focus:border-brand focus:bg-white focus:ring-4 focus:ring-brand/15"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  aria-label={
                    showPw
                      ? "Masquer le mot de passe"
                      : "Afficher le mot de passe"
                  }
                  tabIndex={-1}
                  className="absolute end-4 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-brand-dk"
                >
                  {showPw ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className={cn(
                  "group relative inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-full bg-brand px-6 py-3.5 text-sm font-bold text-white",
                  "shadow-[0_16px_32px_-14px_rgb(var(--istpm-shadow)/0.9)] transition-all duration-300",
                  "hover:bg-brand-dk hover:shadow-[0_20px_40px_-14px_rgb(var(--istpm-shadow)/1)] active:scale-[0.985]",
                  "disabled:cursor-not-allowed disabled:opacity-70",
                )}
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Connexion…
                  </>
                ) : (
                  <>
                    Se connecter
                    <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                  </>
                )}
              </button>
            </form>

            <p className="mt-7 text-center text-[11px] leading-relaxed text-muted-foreground">
              Plateforme de gestion des formations paramédicales
            </p>
          </div>
        </div>
      </div>
  );
}

export const Route = createFileRoute("/login")({ component: LoginPage });
