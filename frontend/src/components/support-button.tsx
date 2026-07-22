import { useState } from "react";
import { LifeBuoy, MessageCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { dialogSurface, labelClass, softInput } from "@/lib/dash-ui";

/**
 * Numéro d'assistance WhatsApp, format international sans « + ».
 * PLACEHOLDER   à remplacer par le numéro réel de l'école.
 */
const SUPPORT_WHATSAPP = "212600000000";

/** Bouton d'assistance flottant   ouvre une fiche contact avec relais WhatsApp. */
export function SupportButton() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");

  // Le message part dans l'URL wa.me plutôt que par un backend : rien à
  // maintenir côté serveur, et l'école garde la demande dans sa conversation.
  const trimmed = message.trim();
  const waHref = `https://wa.me/${SUPPORT_WHATSAPP}${trimmed ? `?text=${encodeURIComponent(trimmed)}` : ""}`;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Contacter l'assistance"
        className="grid h-11 w-11 place-items-center rounded-full border border-border bg-card text-foreground shadow-[var(--shadow-soft)] transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <LifeBuoy className="h-5 w-5" strokeWidth={2} aria-hidden />
        <span className="sr-only">Assistance</span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className={cn(dialogSurface, "w-[min(100vw-1.5rem,460px)] max-w-[min(100vw-1.5rem,460px)]")}>
          <DialogDescription className="sr-only">Contacter l'assistance de l'école</DialogDescription>
          <div className="border-t-4 border-t-primary">
            <div className="border-b border-border px-6 pb-4 pt-6 pr-14">
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Assistance
              </p>
              <DialogTitle className="mt-2 text-left font-display text-xl font-semibold tracking-tight text-foreground">
                Besoin d'aide ?
              </DialogTitle>
            </div>

            <div className="space-y-4 px-6 py-5">
              <div className="space-y-1.5">
                <Label htmlFor="support-message" className={labelClass}>
                  Votre message
                </Label>
                <textarea
                  id="support-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  className={cn(softInput, "min-h-[100px] resize-y rounded-2xl px-4 py-3 text-sm")}
                  placeholder="Décrivez votre problème en quelques mots..."
                />
              </div>

              <a
                href={waHref}
                target="_blank"
                rel="noreferrer"
                onClick={() => setOpen(false)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#25D366] px-5 py-2.5 text-sm font-bold text-white shadow-[0_14px_30px_-14px_rgba(37,211,102,0.8)] transition hover:brightness-105"
              >
                <MessageCircle className="h-4 w-4" />
                Discuter sur WhatsApp
              </a>

              <p className="text-center text-xs text-muted-foreground">
                Réponse sous 24 h · du lundi au vendredi, 9h-18h.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
