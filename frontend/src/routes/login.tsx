import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, LoaderCircle, ArrowRight } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { z } from "zod";

import { getStoredRole, useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

/**
 * Portail étudiant — écran de connexion.
 *
 * Design importé de la maquette Lovable « agadir-faces » (panneau visuel +
 * formulaire, dégradé teal, motif zellige). L'authentification reste celle du
 * backend (`POST /auth/login` via `useAuth().login`) : le rôle est déduit du
 * compte. Un membre du personnel qui se connecte ici est simplement redirigé
 * vers son tableau de bord. L'espace personnel a sa propre adresse (`/istepm`).
 */
const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Saisissez votre adresse e-mail.")
    .email("Saisissez une adresse e-mail valide."),
  password: z.string().min(1, "Saisissez votre mot de passe."),
});

function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    document.title = "Connexion étudiant | ISTEPM Agadir";
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? "Vérifiez les informations saisies.");
      return;
    }

    setIsLoading(true);
    try {
      await login(result.data.email, result.data.password);
      await navigate({ to: "/dashboard", replace: true });
    } catch (err) {
      setError(
        err instanceof Error && err.message
          ? err.message
          : "E-mail ou mot de passe incorrect.",
      );
      setIsLoading(false);
    }
  }

  return (
    <main className="login-canvas relative min-h-dvh overflow-hidden px-4 py-6 sm:px-8 sm:py-10 lg:grid lg:place-items-center">
      <div className="login-blob login-blob-one" aria-hidden="true" />
      <div className="login-blob login-blob-two" aria-hidden="true" />

      <div className="login-shell relative z-10 mx-auto grid w-full max-w-6xl overflow-hidden rounded-[34px] lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1fr)]">
        {/* Panneau visuel */}
        <section
          className="login-hero relative hidden min-h-[640px] overflow-hidden lg:block"
          aria-hidden="true"
        >
          <div className="login-zellige absolute inset-0 opacity-[0.22]" />
          <img
            src="/login-student-hero.png"
            alt=""
            width={960}
            height={1280}
            className="absolute bottom-0 start-[-14%] h-[96%] w-auto object-contain"
          />
          <div className="absolute inset-y-0 end-0 flex w-[48%] flex-col justify-center pe-8">
            <span className="font-display text-5xl leading-none text-[color:oklch(0.31_0.058_191/0.8)]">
              &ldquo;
            </span>
            <p className="-mt-1 font-display text-[1.6rem] font-extrabold uppercase leading-[1.14] tracking-[-0.02em] text-[color:var(--l-ink)]">
              L&rsquo;humain d&rsquo;abord,
              <br />à chaque geste
              <br />de soin.
            </p>
            <div className="mt-6 h-1 w-14 rounded-full bg-[color:var(--l-red)]" />
            <p className="mt-6 max-w-[15rem] text-[13px] font-medium leading-6 text-[color:oklch(0.31_0.058_191/0.7)]">
              Institut spécialisé des techniques paramédicales — Agadir
            </p>
          </div>
        </section>

        {/* Panneau formulaire */}
        <section className="flex items-center justify-center px-6 py-10 sm:px-12 sm:py-14">
          <div className="login-form-enter w-full max-w-[380px]">
            <div className="flex items-center gap-3">
              <img
                src="/istpm-logo.svg"
                alt="ISTEPM Agadir"
                width={56}
                height={56}
                className="h-14 w-auto"
              />
              <div className="min-w-0 border-s border-[color:var(--l-border)] ps-3">
                <p className="font-display text-[15px] font-extrabold leading-tight text-[color:var(--l-ink)]">
                  ISTEPM Agadir
                </p>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--l-muted-fg)]">
                  Techniques paramédicales
                </p>
              </div>
            </div>

            <p className="mt-10 font-display text-[11px] font-bold uppercase tracking-[0.22em] text-[color:var(--l-primary)]">
              Espace étudiant
            </p>
            <h1 className="mt-2 font-display text-[34px] font-extrabold leading-none tracking-[-0.02em] text-[color:var(--l-ink)]">
              Bienvenue
            </h1>
            <p className="mt-3 text-[14px] leading-6 text-[color:var(--l-muted-fg)]">
              Connectez-vous pour accéder à vos cours, votre emploi du temps, vos
              notes et vos demandes.
            </p>

            <form className="mt-8 space-y-4" onSubmit={handleSubmit} noValidate>
              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="block text-[11px] font-bold uppercase tracking-[0.14em] text-[color:var(--l-muted-fg)]"
                >
                  E-mail
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  placeholder="prenom.nom@istpm.ma"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  aria-invalid={Boolean(error)}
                  className="login-field h-[52px] w-full rounded-[16px] border border-transparent bg-[color:var(--l-muted)] px-5 text-[15px] text-[color:var(--l-ink)] outline-none placeholder:text-[color:oklch(0.554_0.046_257.417/0.6)]"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="password"
                  className="block text-[11px] font-bold uppercase tracking-[0.14em] text-[color:var(--l-muted-fg)]"
                >
                  Mot de passe
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Votre mot de passe"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    aria-invalid={Boolean(error)}
                    className="login-field h-[52px] w-full rounded-[16px] border border-transparent bg-[color:var(--l-muted)] ps-5 pe-14 text-[15px] text-[color:var(--l-ink)] outline-none placeholder:text-[color:oklch(0.554_0.046_257.417/0.6)]"
                  />
                  <button
                    type="button"
                    className="absolute end-2 top-2 grid size-9 place-items-center rounded-full text-[color:var(--l-muted-fg)] transition-colors hover:bg-[color:var(--l-teal-pale)] hover:text-[color:var(--l-primary)]"
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label={
                      showPassword
                        ? "Masquer le mot de passe"
                        : "Afficher le mot de passe"
                    }
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="size-4" aria-hidden="true" />
                    ) : (
                      <Eye className="size-4" aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>

              <div className="min-h-5" aria-live="polite">
                {error ? (
                  <p className="text-[13px] font-semibold text-[color:var(--l-red)]">
                    {error}
                  </p>
                ) : null}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className={cn(
                  "group flex h-[52px] w-full items-center justify-center gap-2 rounded-full",
                  "bg-[color:var(--l-primary)] font-display text-[15px] font-bold tracking-[0.01em] text-white",
                  "shadow-[0_12px_24px_-14px_color-mix(in_oklab,var(--l-primary)_70%,transparent)]",
                  "transition-all hover:bg-[color:var(--l-primary-hover)] hover:shadow-none active:scale-[0.985]",
                  "disabled:cursor-not-allowed disabled:opacity-70",
                )}
              >
                {isLoading ? (
                  <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                ) : null}
                {isLoading ? "Connexion…" : "Se connecter"}
                {!isLoading ? (
                  <ArrowRight
                    className="size-4 transition-transform group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                ) : null}
              </button>
            </form>

            <div className="mt-8 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:oklch(0.554_0.046_257.417/0.7)]">
              <span className="h-px flex-1 bg-[color:var(--l-border)]" />
              Besoin d&rsquo;aide
              <span className="h-px flex-1 bg-[color:var(--l-border)]" />
            </div>
            <p className="mt-4 text-center text-[13px] leading-6 text-[color:var(--l-muted-fg)]">
              Mot de passe oublié, ou lien d&rsquo;invitation expiré ?{" "}
              <button
                type="button"
                onClick={() => navigate({ to: "/definir-mot-de-passe" })}
                className="font-semibold text-[color:var(--l-primary)] underline-offset-4 hover:underline"
              >
                Recevoir un nouveau lien
              </button>
            </p>
            <p className="mt-2 text-center text-[13px] leading-6 text-[color:var(--l-muted-fg)]">
              Un autre souci ?{" "}
              <a
                className="font-semibold text-[color:var(--l-primary)] underline-offset-4 hover:underline"
                href="mailto:secretariat@istpm.ma"
              >
                Contactez le secrétariat.
              </a>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

export const Route = createFileRoute("/login")({
  beforeLoad: () => {
    if (getStoredRole()) {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: LoginPage,
});
