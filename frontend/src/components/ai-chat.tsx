import { useState, useRef, useEffect, useCallback, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Loader2, Check, Ban, History, Plus, Trash2, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { softCard } from "@/lib/dash-ui";
import { MiniMarkdown } from "@/lib/markdown-mini";
import {
  analyzeIntent,
  analyzeIntentStream,
  confirmAction,
  type AnalyzeResult,
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
          "max-w-[88%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
          isUser
            ? "whitespace-pre-wrap bg-brand text-white"
            : "bg-muted/70 text-foreground",
        )}
      >
        {isUser || !msg.content ? (
          <span className="whitespace-pre-wrap">{msg.content}</span>
        ) : (
          <MiniMarkdown text={msg.content} />
        )}
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
const CONVOS_STORAGE_KEY = "istpm-ai-convos";
const ACTIVE_CONVO_KEY = "istpm-ai-active-convo";
const MAX_STORED_CONVOS = 20;
const MAX_STORED_MESSAGES = 100;
/** Messages envoyés à l'API par appel (le contexte reste complet en pratique). */
const MAX_SENT_MESSAGES = 60;

type Convo = {
  id: string;
  title: string;
  messages: ChatMessage[];
  updatedAt: number;
};

const GREETING =
  "Bonjour ! Je suis votre assistant IA. Je peux vous aider à gérer les étudiants, formateurs, examens, bulletins, stages, paiements et plus encore. Que souhaitez-vous faire ?";

function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
}

function titleFor(messages: ChatMessage[]): string {
  const first = messages.find((m) => m.role === "user");
  if (!first) return "Nouvelle conversation";
  const t = first.content.trim().replace(/\s+/g, " ");
  return t.length > 42 ? `${t.slice(0, 42)}…` : t;
}

function readConvos(): { convos: Convo[]; activeId: string } {
  try {
    const raw = localStorage.getItem(CONVOS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Convo[];
      if (Array.isArray(parsed) && parsed.length) {
        const convos = parsed.filter((c) => c && Array.isArray(c.messages));
        const stored = localStorage.getItem(ACTIVE_CONVO_KEY);
        const activeId = convos.some((c) => c.id === stored) ? (stored as string) : convos[0].id;
        return { convos, activeId };
      }
    }
  } catch { /* ignore */ }
  // Migration unique depuis l'ancien fil seul.
  let legacy: ChatMessage[] = [];
  try {
    const saved = localStorage.getItem(CHAT_STORAGE_KEY);
    if (saved) legacy = JSON.parse(saved);
  } catch { /* ignore */ }
  const hasUserMsg = Array.isArray(legacy) && legacy.some((m) => m?.role === "user");
  const messages = hasUserMsg ? legacy.slice(-MAX_STORED_MESSAGES) : [{ role: "assistant", content: GREETING } as ChatMessage];
  const convo: Convo = { id: uid("cv"), title: titleFor(messages), messages, updatedAt: Date.now() };
  try {
    localStorage.setItem(CONVOS_STORAGE_KEY, JSON.stringify([convo]));
    localStorage.setItem(ACTIVE_CONVO_KEY, convo.id);
    localStorage.removeItem(CHAT_STORAGE_KEY);
  } catch { /* ignore */ }
  return { convos: [convo], activeId: convo.id };
}

function persistConvos(convos: Convo[], activeId: string) {
  try {
    localStorage.setItem(CONVOS_STORAGE_KEY, JSON.stringify(convos));
    localStorage.setItem(ACTIVE_CONVO_KEY, activeId);
  } catch { /* ignore */ }
}

export function AiChatFloating() {
  const [open, setOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [boot] = useState(readConvos);
  const [convos, setConvos] = useState<Convo[]>(boot.convos);
  const [activeId, setActiveId] = useState<string>(boot.activeId);
  const [messagesState, setMessagesState] = useState<ChatMessage[]>(
    () =>
      boot.convos.find((c) => c.id === boot.activeId)?.messages ?? [
        { role: "assistant", content: GREETING },
      ],
  );
  const messagesRef = useRef<ChatMessage[]>(messagesState);
  const messages = messagesState;
  const [pendingActions, setPendingActions] = useState<ProposedAction[]>([]);
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState("");
  const [executing, setExecuting] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Écriture unique : met à jour le fil visible ET la conversation active
  // (titre auto, horodatage, plafonds, persistance). Toutes les écritures
  // passent par ici, sous forme valeur ou fonction comme useState.
  const setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>> = (u) => {
    const prev = messagesRef.current;
    const next = (typeof u === "function"
      ? (u as (p: ChatMessage[]) => ChatMessage[])(prev)
      : u
    ).slice(-MAX_STORED_MESSAGES);
    messagesRef.current = next;
    setMessagesState(next);
    setConvos((prevConvos) => {
      const mapped = prevConvos.map((c) =>
        c.id === activeId
          ? { ...c, title: titleFor(next), messages: next, updatedAt: Date.now() }
          : c,
      );
      const byDate = [...mapped].sort((a, b) => b.updatedAt - a.updatedAt);
      const kept = byDate.slice(0, MAX_STORED_CONVOS);
      const finalKept = kept.some((c) => c.id === activeId)
        ? kept
        : [...kept.slice(0, MAX_STORED_CONVOS - 1), mapped.find((c) => c.id === activeId)!];
      persistConvos(finalKept, activeId);
      return finalKept;
    });
  };

  const selectConvo = (id: string) => {
    const target = convos.find((c) => c.id === id);
    if (!target) return;
    messagesRef.current = target.messages;
    setMessagesState(target.messages);
    setActiveId(id);
    setPendingActions([]);
    setShowHistory(false);
    persistConvos(convos, id);
  };

  const newConvo = () => {
    const fresh: Convo = {
      id: uid("cv"),
      title: "Nouvelle conversation",
      messages: [{ role: "assistant", content: GREETING }],
      updatedAt: Date.now(),
    };
    const next = [fresh, ...convos].slice(0, MAX_STORED_CONVOS);
    messagesRef.current = fresh.messages;
    setMessagesState(fresh.messages);
    setConvos(next);
    setActiveId(fresh.id);
    setPendingActions([]);
    setShowHistory(false);
    persistConvos(next, fresh.id);
  };

  const deleteConvo = (id: string) => {
    const next = convos.filter((c) => c.id !== id);
    if (id !== activeId) {
      setConvos(next);
      persistConvos(next, activeId);
      return;
    }
    if (!next.length) {
      const fresh: Convo = {
        id: uid("cv"),
        title: "Nouvelle conversation",
        messages: [{ role: "assistant", content: GREETING }],
        updatedAt: Date.now(),
      };
      messagesRef.current = fresh.messages;
      setMessagesState(fresh.messages);
      setConvos([fresh]);
      setActiveId(fresh.id);
      persistConvos([fresh], fresh.id);
      return;
    }
    const sorted = [...next].sort((a, b) => b.updatedAt - a.updatedAt);
    messagesRef.current = sorted[0].messages;
    setMessagesState(sorted[0].messages);
    setConvos(sorted);
    setActiveId(sorted[0].id);
    persistConvos(sorted, sorted[0].id);
    setPendingActions([]);
  };

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => scrollToBottom(), [messages, pendingActions, loading, scrollToBottom]);

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
    // Contexte envoyé à l'IA : tout l'historique de la conversation active.
    const forApi = updated.slice(-MAX_SENT_MESSAGES);

    try {
      // Prefer SSE streaming: tokens render progressively and slow LLM
      // backends can't trip the 30s fetch timeout. Falls back to the
      // one-shot endpoint when streaming is unavailable.
      let result: AnalyzeResult;
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);
      try {
        const streamed = await analyzeIntentStream(forApi, (t) => {
          setMessages((prev) => {
            const next = [...prev];
            const last = next[next.length - 1];
            next[next.length - 1] = { ...last, content: last.content + t };
            return next;
          });
        });
        result = streamed;
      } catch {
        const legacy = await analyzeIntent(forApi);
        result = legacy;
      }
      // Authoritative full text (identical to the streamed tokens).
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = { role: "assistant", content: result.reasoning };
        return next;
      });

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
      setMessages((prev) => {
        // Drop the empty streaming placeholder so only the error shows.
        const next = [...prev];
        const last = next[next.length - 1];
        if (last && last.role === "assistant" && last.content === "") next.pop();
        return [
          ...next,
          {
            role: "assistant",
            content: `❌ Désolé, je n'ai pas pu analyser votre demande : ${msg}${hint}`,
          },
        ];
      });
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
            <div className="flex shrink-0 items-center gap-2 border-b border-brand/12 bg-gradient-to-r from-brand to-brand-dk px-4 py-4 text-white">
              <button
                type="button"
                onClick={() => setShowHistory((v) => !v)}
                aria-label="Historique des conversations"
                title="Historique des conversations"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/20 transition hover:bg-white/30"
              >
                <History className="h-4 w-4" />
              </button>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold">Assistant IA</p>
                <p className="truncate text-[10px] opacity-80">
                  {convos.find((c) => c.id === activeId)?.title ?? "Conversation"}
                </p>
              </div>
              <button
                type="button"
                onClick={newConvo}
                aria-label="Nouvelle conversation"
                title="Nouvelle conversation"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/20 transition hover:bg-white/30"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            <div className="relative min-h-0 flex-1">
              <AnimatePresence>
                {showHistory && (
                  <motion.aside
                    initial={{ x: "-100%" }}
                    animate={{ x: 0 }}
                    exit={{ x: "-100%" }}
                    transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                    className="absolute inset-y-0 start-0 z-10 flex w-[270px] max-w-[85%] flex-col border-e border-brand/12 bg-card shadow-xl"
                  >
                    <div className="flex shrink-0 items-center justify-between px-4 py-3">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                        Conversations ({convos.length})
                      </p>
                      <button
                        type="button"
                        onClick={() => setShowHistory(false)}
                        aria-label="Fermer l'historique"
                        className="grid h-7 w-7 place-items-center rounded-lg text-muted-foreground transition hover:bg-brand/10"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="min-h-0 flex-1 space-y-1 overflow-y-auto px-2 pb-3">
                      {[...convos]
                        .sort((a, b) => b.updatedAt - a.updatedAt)
                        .map((c) => {
                          const active = c.id === activeId;
                          return (
                            <div
                              key={c.id}
                              role="button"
                              tabIndex={0}
                              onClick={() => selectConvo(c.id)}
                              onKeyDown={(e) => e.key === "Enter" && selectConvo(c.id)}
                              className={cn(
                                "group flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2.5 text-start transition",
                                active
                                  ? "bg-brand/10 ring-1 ring-inset ring-brand/25"
                                  : "hover:bg-brand/5",
                              )}
                            >
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-[13px] font-semibold text-foreground">
                                  {c.title}
                                </span>
                                <span className="block text-[10px] text-muted-foreground">
                                  {new Date(c.updatedAt).toLocaleDateString("fr-FR", {
                                    day: "numeric",
                                    month: "short",
                                  })}{" "}
                                  · {c.messages.length} message{c.messages.length > 1 ? "s" : ""}
                                </span>
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteConvo(c.id);
                                }}
                                aria-label={`Supprimer « ${c.title} »`}
                                className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-muted-foreground opacity-0 transition group-hover:opacity-100 hover:bg-alert/10 hover:text-alert-dk focus:opacity-100"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          );
                        })}
                    </div>
                  </motion.aside>
                )}
              </AnimatePresence>

              <div className="flex h-full min-h-0 flex-col">
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
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
