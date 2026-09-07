import { useState } from "react";
import { Check, Copy, MailCheck, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/**
 * Affiche le lien d'invitation à partager (copie manuelle).
 *
 * Utilisé quand le SMTP n'a pas pu envoyer l'e-mail, ou en complément :
 * le lien à usage unique (30 min) peut être transmis via WhatsApp / affichage.
 */
export function InviteLinkBanner({
  email,
  inviteUrl,
  emailSent,
  emailError,
  onClose,
}: {
  email: string;
  inviteUrl: string;
  emailSent: boolean;
  emailError?: string | null;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      toast.success("Lien copié");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Copie impossible — sélectionnez le lien manuellement");
    }
  };

  return (
    <div className="flex items-start gap-3 rounded-2xl border border-brand/20 bg-brand/5 px-4 py-3">
      <MailCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-dk" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <p className="text-xs font-semibold text-foreground">
          Compte créé pour {email} —{" "}
          {emailSent ? "invitation envoyée par e-mail." : "e-mail non envoyé, partagez ce lien :"}
        </p>
        {!emailSent ? (
          <p className="text-[11px] text-alert">
            Échec d'envoi : {emailError || "SMTP non configuré"}. Vérifiez les réglages SMTP du serveur.
          </p>
        ) : null}
        <div className="flex items-center gap-2">
          <input
            readOnly
            value={inviteUrl}
            onFocus={(e) => e.target.select()}
            className="h-8 min-w-0 flex-1 truncate rounded-lg border border-brand/20 bg-card px-2 font-mono text-[11px] text-muted-foreground"
          />
          <button
            type="button"
            onClick={copy}
            className={cn(
              "grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-brand/20 text-brand-dk transition hover:bg-brand/10",
            )}
            aria-label="Copier le lien"
            title="Copier le lien"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Lien à usage unique, valable 30 minutes. L'utilisateur y définira son mot de passe.
        </p>
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Fermer"
        className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-muted-foreground transition hover:bg-brand/10"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
