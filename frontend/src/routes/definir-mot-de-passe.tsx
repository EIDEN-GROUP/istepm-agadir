import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Eye, EyeOff, Loader2, CheckCircle2, XCircle, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { verifyInvitation, acceptInvitation, requestInviteResend } from "@/lib/istpm-api";
import { cn } from "@/lib/utils";

const TOKEN_BACKUP_KEY = "istpm-invite-token";

function readToken(): string {
  if (typeof window === "undefined") return "";
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token") ?? "";
  // Le token ne doit pas traîner dans l'URL (historique, Referer) :
  // on le lit une fois, on le sauvegarde pour survivre au rechargement,
  // puis on nettoie l'adresse.
  if (token) {
    try {
      window.sessionStorage.setItem(TOKEN_BACKUP_KEY, token);
    } catch {
      /* stockage indisponible : on garde le token en mémoire */
    }
    params.delete("token");
    const clean = `${window.location.pathname}${params.toString() ? `?${params}` : ""}`;
    window.history.replaceState({}, "", clean);
    return token;
  }
  try {
    return window.sessionStorage.getItem(TOKEN_BACKUP_KEY) ?? "";
  } catch {
    return "";
  }
}

function clearTokenBackup(): void {
  try {
    window.sessionStorage.removeItem(TOKEN_BACKUP_KEY);
  } catch {
    /* stockage indisponible */
  }
}

/**
 * Page publique de définition du mot de passe (lien d'invitation).
 *
 * Lien à usage unique, 24 heures : vérifié d'abord (`verify`), puis le mot
 * de passe est défini (`accept`, qui brûle le lien et connecte directement).
 */
function DefinirMotDePassePage() {
  const navigate = useNavigate();
  const [token] = useState(readToken);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resendEmail, setResendEmail] = useState("");
  const [resendSent, setResendSent] = useState(false);
  const [resending, setResending] = useState(false);

  const verifyQ = useQuery({
    queryKey: ["invite-verify", token],
    queryFn: () => verifyInvitation(token),
    enabled: !!token,
    retry: false,
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setError("Mot de passe trop court (8 caractères min)");
      return;
    }
    if (password !== confirm) {
      setError("Les deux mots de passe ne correspondent pas");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const res = await acceptInvitation(token, password);
      const r = res.user.role;
      const mapped =
        r === "admin" || r === "superadmin" || r === "directeur"
          ? "directeur"
          : r === "enseignant" || r === "responsable" || r === "etudiant"
            ? r
            : "directeur";
      window.localStorage.setItem("istpm-token", res.token);
      window.localStorage.setItem("istpm-user", JSON.stringify({ ...res.user, role: mapped }));
      window.localStorage.setItem("istpm-role", mapped);
      clearTokenBackup();
      setDone(true);
      setTimeout(() => navigate({ to: "/dashboard" }), 1600);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lien invalide ou expiré");
    } finally {
      setSubmitting(false);
    }
  };

  const fieldClass =
    "w-full rounded-xl border border-border bg-white px-4 py-3 text-sm text-foreground outline-none transition-all duration-300 placeholder:text-muted-foreground/55 focus:border-brand focus:ring-4 focus:ring-brand/12";

  return (
    <div className="relative grid min-h-dvh place-items-center overflow-hidden bg-white px-6 py-10">
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
        <div className="flex flex-col items-center text-center">
          <img src="/istpm-logo.svg" alt="ISTPM Agadir" className="h-28 w-28 rounded-full" />
          <h1 className="mt-6 font-display text-2xl font-bold tracking-tight text-foreground">
            Définir mon mot de passe
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Lien à usage unique, valable 24 heures
          </p>
        </div>

        {!token || verifyQ.isError || (verifyQ.data && !verifyQ.data.valid) ? (
          <div className="mt-9 space-y-4">
            <div role="alert" className="flex flex-col items-center gap-3 rounded-xl bg-alert/10 px-4 py-6 text-center">
              <XCircle className="h-8 w-8 text-alert" />
              <p className="text-sm font-medium text-alert">
                {!token
                  ? "Lien manquant."
                  : verifyQ.isLoading
                    ? "Vérification du lien…"
                    : "Ce lien est invalide, déjà utilisé ou expiré. Demandez un nouveau lien ci-dessous."}
              </p>
            </div>
            {!verifyQ.isLoading ? (
              resendSent ? (
                <p role="status" className="rounded-xl bg-brand/10 px-4 py-3 text-center text-sm font-medium text-brand-dk">
                  Si un compte en attente existe pour cet e-mail, un nouveau lien vient d'être envoyé (24 h).
                </p>
              ) : (
                <form
                  className="space-y-3"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(resendEmail)) {
                      setError("Adresse e-mail invalide");
                      return;
                    }
                    setResending(true);
                    try {
                      await requestInviteResend(resendEmail.trim());
                      setResendSent(true);
                    } catch {
                      setResendSent(true);
                    } finally {
                      setResending(false);
                    }
                  }}
                >
                  <div className="space-y-1.5">
                    <label htmlFor="resend-email" className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Recevoir un nouveau lien
                    </label>
                    <input
                      id="resend-email"
                      type="email"
                      value={resendEmail}
                      onChange={(e) => setResendEmail(e.target.value)}
                      placeholder="Votre adresse e-mail"
                      autoComplete="email"
                      className={fieldClass}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={resending}
                    className={cn(
                      "inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-6 py-3 text-sm font-bold text-white",
                      "transition-all duration-300 hover:bg-brand-dk active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-70",
                    )}
                  >
                    {resending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Envoi…
                      </>
                    ) : (
                      "Renvoyer le lien"
                    )}
                  </button>
                </form>
              )
            ) : null}
          </div>
        ) : done ? (
          <div role="status" className="mt-9 flex flex-col items-center gap-3 rounded-xl bg-brand/10 px-4 py-6 text-center">
            <CheckCircle2 className="h-8 w-8 text-brand-dk" />
            <p className="text-sm font-medium text-brand-dk">
              Mot de passe enregistré — redirection vers votre espace…
            </p>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-9 space-y-5">
            {verifyQ.data?.email ? (
              <p className="rounded-xl bg-muted/60 px-4 py-3 text-center text-sm text-muted-foreground">
                Compte <strong className="font-semibold text-foreground">{verifyQ.data.email}</strong>
                {verifyQ.data.name ? ` (${verifyQ.data.name})` : ""}
              </p>
            ) : null}
            {error ? (
              <div role="alert" className="anim-shake rounded-xl bg-alert/10 px-4 py-3 text-sm font-medium text-alert">
                {error}
              </div>
            ) : null}
            <div className="space-y-1.5">
              <label htmlFor="new-password" className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Nouveau mot de passe
              </label>
              <div className="relative">
                <input
                  id="new-password"
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="8 caractères minimum"
                  autoComplete="new-password"
                  autoFocus
                  className={cn(fieldClass, "pe-11")}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  aria-label={showPw ? "Masquer" : "Afficher"}
                  tabIndex={-1}
                  className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-brand-dk"
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="confirm-password" className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Confirmer
              </label>
              <input
                id="confirm-password"
                type={showPw ? "text" : "password"}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Retapez le mot de passe"
                autoComplete="new-password"
                className={fieldClass}
              />
            </div>
            <button
              type="submit"
              disabled={submitting || verifyQ.isLoading}
              className={cn(
                "group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-6 py-3 text-sm font-bold text-white",
                "shadow-[0_4px_14px_-4px_rgb(var(--istpm-shadow)/0.32)] transition-all duration-300",
                "hover:bg-brand-dk active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-70",
              )}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Enregistrement…
                </>
              ) : (
                <>
                  Enregistrer et entrer
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
}

export const Route = createFileRoute("/definir-mot-de-passe")({
  component: DefinirMotDePassePage,
});
