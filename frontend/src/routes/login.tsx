import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { ROLES, ROLE_META, useAuth, type UserRole } from "@/lib/auth";

/**
 * Frontend-only sign-in. There are no credentials: picking a role sets the UI
 * state and enters the dashboard.
 */
function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const enter = (role: UserRole) => {
    login(role);
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-dk via-brand to-brand-lt p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-[0_40px_90px_-40px_rgb(var(--istpm-shadow)/0.8)]">
        <div className="flex flex-col items-center text-center">
          <img
            src="/istpm-logo-mark.svg"
            alt="ISTPM Agadir"
            className="h-20 w-20"
          />
          <h1 className="mt-4 font-display text-2xl font-bold tracking-tight text-foreground">
            ISTPM Agadir
          </h1>
          <p className="mt-1 text-sm leading-snug text-muted-foreground">
            Institut spécialisé des techniques paramédicales
          </p>
        </div>

        <div className="my-7 flex items-center gap-3">
          <span className="h-px flex-1 bg-brand/15" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Choisir un profil
          </span>
          <span className="h-px flex-1 bg-brand/15" />
        </div>

        <div className="space-y-3">
          {ROLES.map((role) => (
            <button
              key={role}
              type="button"
              onClick={() => enter(role)}
              className="group flex w-full items-center justify-between gap-3 rounded-2xl border border-brand/20 bg-card px-4 py-3.5 text-left transition hover:border-brand hover:bg-brand/8"
            >
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-foreground">
                  {ROLE_META[role].label}
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {ROLE_META[role].description}
                </span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-brand transition group-hover:translate-x-0.5" />
            </button>
          ))}
        </div>

        <p className="mt-6 text-center text-[11px] leading-relaxed text-muted-foreground">
          Démonstration hors ligne — aucune authentification réelle.
          <br />
          Le profil est modifiable à tout moment depuis l'en-tête.
        </p>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/login")({ component: LoginPage });
