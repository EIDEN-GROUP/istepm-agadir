import { useState, useRef, useEffect, useCallback, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Loader2, Check, Ban, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { softCard } from "@/lib/dash-ui";
import {
  analyzeIntent,
  confirmAction,
  type ChatMessage,
  type ProposedAction,
} from "@/lib/istpm-api";

function formatActionResult(actionName: string, data: unknown): string {
  const label = actionName.replace(/_/g, " ");

  const sectionMap: Record<string, string> = {
    formateurs: "Formateurs",
    etudiants: "Étudiants",
    examens: "Examens",
    seances: "Séances",
    paiements: "Paiements",
    bulletins: "Bulletins",
    stages: "Stages",
    evenements: "Événements",
    utilisateurs: "Utilisateurs",
    notifications: "Notifications",
    presences: "Présences",
    modules: "Modules",
    notes: "Notes",
  };
  const entity = Object.keys(sectionMap).find((k) => actionName.includes(k));
  const section = entity ? sectionMap[entity] : label;

  if (Array.isArray(data)) {
    if (data.length === 0) {
      return `📋 **${label}**\n\nAucun résultat trouvé. Pour voir la liste complète, rendez-vous dans la section **${section}** de l'application ou affinez votre recherche.`;
    }
    const count = data.length;
    const sample = data.slice(0, Math.min(count, 3));
    const items = sample
      .map((item: Record<string, unknown>) => {
        const name =
          [item.prenom, item.nom, item.name, item.titre, item.libelle, item.intitule].find(
            Boolean,
          ) || `#${data.indexOf(item) + 1}`;
        const extra = item.grade || item.departement || item.email || item.niveau || "";
        return `  • ${name}${extra ? ` (${extra})` : ""}`;
      })
      .join("\n");
    return `📋 **${label}** — ${count} résultat(s)\n\n${items}\n\n*Pour voir l'ensemble des ${count} résultats, rendez-vous dans la section **${section}** ou précisez votre recherche.*`;
  }

  return `📋 **${label}**\n\nDonnée chargée avec succès. Pour plus de détails, consultez la section **${section}**.`;
}

function LoadingDots() {
  return (
    <span className="inline-flex items-center gap-1">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="h-2 w-2 rounded-full bg-brand/60"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
        />
      ))}
    </span>
  );
}

function ActionCard({
  action,
  index,
  onAccept,
  onDecline,
  disabled,
}: {
  action: ProposedAction;
  index: number;
  onAccept: () => void;
  onDecline: () => void;
  disabled: boolean;
}) {
  const label = action.actionName.replace(/_/g, " ");
  const isRead = action.actionName.startsWith("get_") || action.actionName.startsWith("list_");

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.08, duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        softCard,
        "overflow-hidden border-l-4",
        isRead ? "border-l-blue-400" : "border-l-brand",
      )}
    >
      <div className="space-y-2 px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {isRead ? "Lecture" : "Écriture"}
          </span>
        </div>
        <p className="text-sm font-semibold text-foreground capitalize">{label}</p>
        {Object.keys(action.params).length > 0 && (
          <pre className="max-h-28 overflow-auto rounded-xl bg-muted/50 p-2 text-[10px] text-muted-foreground">
            {JSON.stringify(action.params, null, 1)}
          </pre>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onAccept}
            disabled={disabled}
            className="inline-flex items-center gap-1 rounded-full bg-brand px-3 py-1.5 text-[11px] font-bold text-white transition hover:brightness-105 disabled:opacity-40"
          >
            <Check className="h-3 w-3" /> Accepter
          </button>
          <button
            type="button"
            onClick={onDecline}
            disabled={disabled}
            className="inline-flex items-center gap-1 rounded-full border border-alert/30 px-3 py-1.5 text-[11px] font-semibold text-alert transition hover:bg-alert/10 disabled:opacity-40"
          >
            <Ban className="h-3 w-3" /> Refuser
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("flex", isUser ? "justify-end" : "justify-start")}
    >
      <div
        className={cn(
          "max-w-[88%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
          isUser
            ? "bg-brand text-white"
            : "bg-muted/70 text-foreground",
        )}
      >
        {msg.content}
      </div>
    </motion.div>
  );
}

function FloatingButton({ onClick, open }: { onClick: () => void; open: boolean }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-label="Assistant IA"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={cn(
        "fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-[0_16px_40px_-12px_rgb(var(--istpm-shadow)/0.5)] transition-shadow hover:shadow-[0_20px_50px_-12px_rgb(var(--istpm-shadow)/0.6)]",
        open
          ? "bg-muted text-foreground ring-1 ring-brand/20"
          : "bg-gradient-to-b from-brand to-brand-dk text-white",
      )}
    >
      <AnimatePresence mode="wait">
        {open ? (
          <motion.span key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
            <X className="h-5 w-5" />
          </motion.span>
        ) : (
          <motion.span key="msg" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
            <MessageCircle className="h-5 w-5" />
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

const CHAT_STORAGE_KEY = "istpm-ai-chat";

function loadChatHistory(): ChatMessage[] {
  try {
    const saved = localStorage.getItem(CHAT_STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch { /* ignore */ }
  return [
    {
      role: "assistant",
      content:
        "Bonjour ! Je suis votre assistant IA. Je peux vous aider à gérer les étudiants, formateurs, examens, bulletins, stages, paiements et plus encore. Que souhaitez-vous faire ?",
    },
  ];
}

function saveChatHistory(messages: ChatMessage[]) {
  try {
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
  } catch { /* ignore */ }
}

export function AiChatFloating() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(loadChatHistory);
  const [pendingActions, setPendingActions] = useState<ProposedAction[]>([]);
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState("");
  const [executing, setExecuting] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => scrollToBottom(), [messages, pendingActions, loading, scrollToBottom]);

  useEffect(() => {
    saveChatHistory(messages);
  }, [messages]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  useEffect(() => {
    function handleKeyDown(e: globalThis.KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  async function handleSend(e?: FormEvent) {
    e?.preventDefault();
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setPendingActions([]);

    const userMsg: ChatMessage = { role: "user", content: text };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setLoading(true);

    try {
      const result = await analyzeIntent(updated);

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: result.reasoning },
      ]);

      if (result.proposedActions.length > 0) {
        const allRead = result.proposedActions.every(
          (a) => a.actionName.startsWith("get_") || a.actionName.startsWith("list_"),
        );

        if (allRead) {
          for (const action of result.proposedActions) {
            setExecuting(action.actionName);
            try {
              const res = await confirmAction(action.actionName, action.params);
              setMessages((prev) => [
                ...prev,
                {
                  role: "assistant",
                  content: formatActionResult(action.actionName, res.data),
                },
              ]);
            } catch (err) {
              setMessages((prev) => [
                ...prev,
                {
                  role: "assistant",
                  content: `❌ Erreur pour **${action.actionName.replace(/_/g, " ")}** : ${err instanceof Error ? err.message : "Erreur inconnue"}`,
                },
              ]);
            }
          }
          setExecuting(null);
        } else {
          setPendingActions(result.proposedActions);
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur inconnue";
      const hint = msg.includes("contacter le serveur")
        ? "\n\n💡 Vérifiez que le serveur backend est en cours d'exécution et que l'URL de l'API est correcte (VITE_API_URL)."
        : msg.includes("trop de temps")
        ? "\n\n💡 Le serveur a mis trop de temps à répondre. Veuillez réessayer."
        : msg.includes("modèle d'IA") || msg.includes("API IA")
        ? "\n\n💡 La configuration de l'IA est incorrecte. Contactez l'administrateur."
        : msg.includes("502") || msg.includes("Bad Gateway")
        ? "\n\n💡 Le serveur IA a rencontré une erreur. Veuillez réessayer."
        : "";
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `❌ Désolé, je n'ai pas pu analyser votre demande : ${msg}${hint}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function handleAccept(action: ProposedAction) {
    setExecuting(action.actionName);
    try {
      const res = await confirmAction(action.actionName, action.params);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `✅ **${action.actionName.replace(/_/g, " ")}** exécutée avec succès.\n\n${formatActionResult(action.actionName, res.data)}`,
        },
      ]);
      setPendingActions([]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `❌ Erreur lors de l'exécution de **${action.actionName.replace(/_/g, " ")}** :\n${err instanceof Error ? err.message : "Erreur inconnue"}`,
        },
      ]);
    } finally {
      setExecuting(null);
    }
  }

  function handleDecline(action: ProposedAction) {
    setPendingActions((prev) => prev.filter((a) => a.toolCallId !== action.toolCallId));
    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: `✋ Action **${action.actionName.replace(/_/g, " ")}** annulée.`,
      },
    ]);
  }

  return (
    <>
      <FloatingButton onClick={() => setOpen((o) => !o)} open={open} />
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              softCard,
              "fixed bottom-24 right-6 z-50 flex w-[min(420px,calc(100vw-2rem))] flex-col overflow-hidden shadow-[0_32px_80px_-20px_rgb(var(--istpm-shadow)/0.5)]",
            )}
            style={{ height: 560, maxHeight: "calc(100vh - 8rem)" }}
          >
            <div className="flex shrink-0 items-center gap-3 border-b border-brand/12 bg-gradient-to-r from-brand to-brand-dk px-5 py-4 text-white">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-white/20">
                <Sparkles className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold">Assistant IA</p>
                <p className="text-[10px] opacity-80">Cmd+K pour ouvrir/fermer</p>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto space-y-4 px-4 py-4">
              {messages.map((msg, i) => (
                <MessageBubble key={i} msg={msg} />
              ))}

              {pendingActions.length > 0 && (
                <div className="space-y-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Actions proposées   veuillez confirmer
                  </p>
                  {pendingActions.map((a, i) => (
                    <ActionCard
                      key={a.toolCallId}
                      action={a}
                      index={i}
                      onAccept={() => handleAccept(a)}
                      onDecline={() => handleDecline(a)}
                      disabled={executing === a.actionName}
                    />
                  ))}
                </div>
              )}

              {loading && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-3 rounded-2xl bg-muted/70 px-4 py-3">
                    <LoadingDots />
                    <span className="text-xs text-muted-foreground">Analyse en cours...</span>
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            <form
              onSubmit={handleSend}
              className="flex shrink-0 items-center gap-2 border-t border-brand/12 px-4 py-3"
            >
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Décrivez ce que vous voulez faire..."
                disabled={loading}
                className="min-w-0 flex-1 rounded-full border border-brand/20 bg-card px-4 py-2 text-sm outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground/50 hover:border-brand/35 focus:border-brand focus:ring-4 focus:ring-brand/15 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand text-white transition hover:brightness-105 disabled:opacity-40"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
