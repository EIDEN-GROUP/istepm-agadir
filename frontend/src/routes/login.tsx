import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, Loader2, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

/**
 * Écran de connexion   minimaliste, centré, aux accents de la couleur de marque.
 *
 * Pas d'illustration ni de panneau : une colonne centrée, beaucoup de blanc, la
 * marque en teal et un unique point focal (le formulaire). Le CTA est une pilule
 * teal pleine largeur.
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

  const fieldClass =
    "w-full rounded-xl border border-border bg-white px-4 py-3 text-sm text-foreground outline-none transition-all duration-300 placeholder:text-muted-foreground/55 focus:border-brand focus:ring-4 focus:ring-brand/12";

  return (
    <div className="relative grid min-h-dvh place-items-center overflow-hidden bg-white px-6 py-10">
      {/* Un seul accent de marque : un halo teal très discret en haut, sinon du blanc. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-80 w-[42rem] max-w-none -translate-x-1/2 rounded-full opacity-60 blur-3xl"
        style={{
          background:
            "radial-gradient(circle, color-mix(in srgb, var(--istpm-teal) 12%, transparent) 0%, transparent 70%)",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-sm"
      >
        {/* Marque */}
        <div className="flex flex-col items-center text-center">
          <span className="grid place-items-center">
            <img
              src="/istpm-logo.svg"
              alt="ISTEPM Agadir"
              className="h-25 w-25 rounded-full"
            />
          </span>
          <h1 className="mt-6 font-display text-2xl font-bold tracking-tight text-foreground">
            Connexion
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Accédez à votre espace ISTEPM Agadir
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-9 space-y-5">
          {error ? (
            <div
              role="alert"
              className="anim-shake rounded-xl bg-alert/10 px-4 py-3 text-sm font-medium text-alert"
            >
              {error}
            </div>
          ) : null}

          <div className="space-y-1.5">
            <label
              htmlFor="login-email"
              className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground"
            >
              Identifiant
            </label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Adresse e-mail"
              autoComplete="email"
              autoFocus
              className={fieldClass}
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="login-password"
              className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground"
            >
              Mot de passe
            </label>
            <div className="relative">
              <input
                id="login-password"
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mot de passe"
                autoComplete="current-password"
                className={cn(fieldClass, "pe-11")}
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                aria-label={
                  showPw ? "Masquer le mot de passe" : "Afficher le mot de passe"
                }
                tabIndex={-1}
                className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-brand-dk"
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className={cn(
              "group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-6 py-3 text-sm font-bold text-white",
              "shadow-[0_4px_14px_-4px_rgb(var(--istpm-shadow)/0.32)] transition-all duration-300",
              "hover:bg-brand-dk active:scale-[0.985]",
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

        <p className="mt-8 text-center text-[11px] leading-relaxed text-muted-foreground">
          Plateforme de gestion des formations paramédicales
        </p>
      </motion.div>
    </div>
  );
}

export const Route = createFileRoute("/login")({ component: LoginPage });
