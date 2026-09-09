import { useState, useRef, useEffect, useCallback, type FormEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import {
  fetchAiConvos,
  fetchAiConvo,
  createAiConvo,
  saveAiConvo,
  deleteAiConvo,
  setActiveAiConvo,
  importAiConvos,
  fetchFeatureTicketNotifications,
  markFeatureTicketNotificationRead,
  type TicketNotification,
} from "@/lib/istpm-api";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Loader2, Check, Ban, History, Plus, Trash2, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
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

  // Ticket de fonctionnalité : l'IA l'a créé d'elle-même, sans vérification.
  // L'utilisateur doit avoir l'impression que l'IA s'en occupe personnellement.
  if (actionName === "create_feature_ticket") {
    const t = (data ?? {}) as {
      ticket?: { title?: string; description?: string };
      deduped?: boolean;
    };
    const title =
      typeof t.ticket?.title === "string" && t.ticket.title.trim()
        ? t.ticket.title.trim()
        : "votre demande";
    if (t.deduped) {
      return `ℹ️ « ${title} » est déjà pris en compte — je vous préviendrai ici même dès que ce sera prêt.`;
    }
    const desc =
      typeof t.ticket?.description === "string" ? t.ticket.description.trim() : "";
    return `✅ C'est noté — je m'en occupe : « ${title} ».${desc ? `\n\n${desc}` : ""}\n\nJe vous préviendrai ici même dès que ce sera prêt.`;
  }

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

/** Message d'annonce d'un verdict BMS, avec le motif dans les deux cas. */
function formatVerdictMessage(n: TicketNotification): ChatMessage {
  const title = n.titre?.trim() || "votre demande";
  const motif = (n.reponse ?? "").trim();
  if (n.statut === "done") {
    return {
      role: "assistant",
      content: `✅ Bonne nouvelle — « ${title} » est disponible !${motif ? `\n\n${motif}` : ""}\n\nDites-moi si vous voulez un ajustement.`,
    };
  }
  return {
    role: "assistant",
    content: `❌ « ${title} » n'a pas pu être retenu.${motif ? `\n\nMotif : ${motif}` : ""}\n\nDites-moi si vous voulez reformuler la demande autrement.`,
  };
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

function FloatingButton({ onClick, open, hasNews }: { onClick: () => void; open: boolean; hasNews: boolean }) {
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
      {hasNews && !open ? (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4" aria-hidden>
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-alert opacity-60" />
          <span className="relative inline-flex h-4 w-4 items-center justify-center rounded-full bg-alert text-[9px] font-bold text-white ring-2 ring-card">
            !
          </span>
        </span>
      ) : null}
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

const LEGACY_CONVOS_KEY = "istpm-ai-convos";
const LEGACY_ACTIVE_KEY = "istpm-ai-active-convo";
const LEGACY_CHAT_KEY = "istpm-ai-chat";
/** Messages envoyés à l'API par appel (le contexte reste complet en pratique). */
const MAX_SENT_MESSAGES = 60;

const GREETING =
  "Bonjour ! Je suis votre assistant IA. Je peux vous aider à gérer les étudiants, formateurs, examens, bulletins, stages, paiements et plus encore. Que souhaitez-vous faire ?";

function titleFor(messages: ChatMessage[]): string {
  const first = messages.find((m) => m.role === "user");
  if (!first) return "Nouvelle conversation";
  const t = first.content.trim().replace(/\s+/g, " ");
  return t.length > 42 ? `${t.slice(0, 42)}…` : t;
}

type LegacyImport = { title?: string; messages: ChatMessage[] };

/** Lit l'ancien stockage local (une fois, pour migration vers la base). */
function readLegacyLocal(): LegacyImport[] | null {
  const clean = (arr: unknown): ChatMessage[] =>
    (Array.isArray(arr) ? arr : [])
      .filter(
        (m): m is ChatMessage =>
          !!m &&
          (m.role === "user" || m.role === "assistant") &&
          typeof m.content === "string",
      )
      .map((m) => ({ role: m.role, content: m.content }));
  try {
    const raw = localStorage.getItem(LEGACY_CONVOS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { title?: string; messages?: unknown }[];
      if (Array.isArray(parsed)) {
        const convos = parsed
          .map((c) => ({
            title: typeof c?.title === "string" ? c.title : undefined,
            messages: clean(c?.messages),
          }))
          .filter((c) => c.messages.some((m) => m.role === "user"));
        if (convos.length) return convos;
      }
    }
    const single = localStorage.getItem(LEGACY_CHAT_KEY);
    if (single) {
      const messages = clean(JSON.parse(single));
      if (messages.some((m) => m.role === "user")) return [{ messages }];
    }
  } catch { /* ignore */ }
  return null;
}

function clearLegacyLocal() {
  try {
    localStorage.removeItem(LEGACY_CONVOS_KEY);
    localStorage.removeItem(LEGACY_ACTIVE_KEY);
    localStorage.removeItem(LEGACY_CHAT_KEY);
  } catch { /* ignore */ }
}

export function AiChatFloating() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messagesState, setMessagesState] = useState<ChatMessage[]>([
    { role: "assistant", content: GREETING },
  ]);
  const messagesRef = useRef<ChatMessage[]>(messagesState);
  const messages = messagesState;
  const [pendingActions, setPendingActions] = useState<ProposedAction[]>([]);
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState("");
  const [executing, setExecuting] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const importedRef = useRef(false);

  // Source de vérité serveur : liste légère + active.
  const listQ = useQuery({
    queryKey: ["ai-convos"],
    queryFn: fetchAiConvos,
    retry: false,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
  const convos = listQ.data?.convos ?? [];

  // Adopte l'active du serveur au premier chargement.
  useEffect(() => {
    if (activeId === null && listQ.data) {
      setActiveId(listQ.data.activeId);
    }
  }, [listQ.data, activeId]);

  // Détail de l'active (propriété vérifiée côté serveur).
  const detailQ = useQuery({
    queryKey: ["ai-convo", activeId],
    queryFn: () => fetchAiConvo(activeId as string),
    enabled: !!activeId,
    retry: false,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
  useEffect(() => {
    if (!detailQ.data) return;
    messagesRef.current = detailQ.data.convo.messages;
    setMessagesState(detailQ.data.convo.messages);
    setPendingActions([]);
  }, [detailQ.data]);

  // Migration unique de l'ancien stockage local vers la base.
  useEffect(() => {
    if (importedRef.current || !listQ.data || listQ.isError) return;
    const local = readLegacyLocal();
    if (!local) return;
    if (listQ.data.convos.length) {
      clearLegacyLocal();
      return;
    }
    importedRef.current = true;
    importAiConvos(local)
      .then((r) => {
        clearLegacyLocal();
        qc.invalidateQueries({ queryKey: ["ai-convos"] });
        if (r.activeId) setActiveId(r.activeId);
      })
      .catch(() => {
        importedRef.current = false;
      });
  }, [listQ.data, listQ.isError, qc]);

  // Écriture locale uniquement (rapide) ; la persistance serveur est explicite
  // via saveNow aux points stables (jamais pendant le streaming token à token).
  const setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>> = (u) => {
    const prev = messagesRef.current;
    const next = typeof u === "function" ? (u as (p: ChatMessage[]) => ChatMessage[])(prev) : u;
    messagesRef.current = next;
    setMessagesState(next);
  };

  const saveMut = useMutation({
    mutationFn: ({ id, next }: { id: string; next: ChatMessage[] }) =>
      saveAiConvo(id, { title: titleFor(next), messages: next.slice(-100) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai-convos"] });
    },
    onError: () => toast.error("Historique non sauvegardé"),
  });
  const saveNow = (id: string | null, next: ChatMessage[]) => {
    if (!id) return;
    saveMut.mutate({ id, next });
  };

  // Verdicts BMS → annoncés par l'IA elle-même dans la conversation active.
  // Remplace la section verdicts de la cloche : l'utilisateur apprend le
  // résultat (terminé + motif / rejeté + motif) ici, avec son historique.
  const { role: userRole } = useAuth();
  const announcedRef = useRef<Set<string>>(new Set());
  const announcingRef = useRef(false);
  const ticketQ = useQuery({
    queryKey: ["feature-ticket-notifications"],
    queryFn: fetchFeatureTicketNotifications,
    enabled: userRole === "directeur",
    refetchInterval: 60_000,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const ticketUnread = ticketQ.data?.unread ?? 0;

  useEffect(() => {
    const items = ticketQ.data?.items ?? [];
    // Acquittements restés en échec : le serveur dit encore non lu alors que
    // c'est déjà annoncé → on réessaie sans réannoncer.
    const retryAck = items.filter((n) => !n.luParDemandeur && announcedRef.current.has(n.id));
    if (retryAck.length && !announcingRef.current) {
      (async () => {
        for (const n of retryAck) {
          try {
            await markFeatureTicketNotificationRead(n.id);
          } catch { /* prochain passage */ }
        }
        qc.invalidateQueries({ queryKey: ["feature-ticket-notifications"] });
      })();
    }
    const fresh = items.filter((n) => !n.luParDemandeur && !announcedRef.current.has(n.id));
    if (!fresh.length || announcingRef.current || detailQ.isLoading || detailQ.isError) return;
    announcingRef.current = true;
    (async () => {
      try {
        let convoId = activeId;
        if (!convoId) {
          // Première annonce sans conversation : on en ouvre une dédiée.
          const created = await createAiConvo({
            title: "Suivi des demandes",
            messages: [{ role: "assistant", content: GREETING }],
          });
          convoId = created.convo.id;
          setActiveId(convoId);
          messagesRef.current = created.convo.messages;
          setMessagesState(created.convo.messages);
          qc.invalidateQueries({ queryKey: ["ai-convos"] });
        }
        const next = [...messagesRef.current, ...fresh.map(formatVerdictMessage)];
        setMessages(next);
        // Persistance d'abord : en cas d'échec on réessaie au prochain passage
        // (rien n'est marqué comme lu).
        const prevTitle = (listQ.data?.convos ?? []).find((c) => c.id === convoId)?.title;
        const computed = titleFor(next);
        await saveAiConvo(convoId, {
          title: computed === "Nouvelle conversation" ? (prevTitle ?? "Suivi des demandes") : computed,
          messages: next.slice(-100),
        });
        qc.invalidateQueries({ queryKey: ["ai-convos"] });
        for (const n of fresh) {
          announcedRef.current.add(n.id);
          try {
            await markFeatureTicketNotificationRead(n.id);
          } catch { /* réessayé implicitement : le serveur reste non lu */ }
        }
        qc.invalidateQueries({ queryKey: ["feature-ticket-notifications"] });
      } catch {
        // Silence : le sondage suivant réessaiera (aucun marquage effectué).
      } finally {
        announcingRef.current = false;
      }
    })();
  }, [ticketQ.data, activeId, detailQ.isLoading, listQ.data, qc]);
  const [creating, setCreating] = useState(false);

  const selectConvo = (id: string) => {
    if (loading || id === activeId) return;
    setActiveId(id);
    setMessages([]);
    setPendingActions([]);
    setShowHistory(false);
    setActiveAiConvo(id)
      .then(() => qc.invalidateQueries({ queryKey: ["ai-convos"] }))
      .catch(() => toast.error("Sélection impossible"));
  };

  const newConvo = () => {
    if (loading || creating) return;
    setCreating(true);
    createAiConvo({ title: "Nouvelle conversation", messages: [{ role: "assistant", content: GREETING }] })
      .then((r) => {
        qc.invalidateQueries({ queryKey: ["ai-convos"] });
        setActiveId(r.convo.id);
        setMessages(r.convo.messages);
        setPendingActions([]);
        setShowHistory(false);
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Création impossible"))
      .finally(() => setCreating(false));
  };

  const deleteConvo = (id: string) => {
    if (loading) return;
    deleteAiConvo(id)
      .then((r) => {
        qc.invalidateQueries({ queryKey: ["ai-convos"] });
        if (id === activeId) {
          if (r.activeId) {
            setActiveId(r.activeId);
            setMessages([]);
          } else {
            newConvo();
            return;
          }
        }
        setPendingActions([]);
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Suppression impossible"));
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
      saveNow(activeId, messagesRef.current);

      if (result.proposedActions.length > 0) {
        // Exécution immédiate, sans vérification : les lectures ET la création
        // de ticket (l'IA annonce elle-même la prise en charge). Tout le reste
        // passe par Accepter/Refuser.
        const isAuto = (a: ProposedAction) =>
          a.actionName.startsWith("get_") ||
          a.actionName.startsWith("list_") ||
          a.actionName === "create_feature_ticket";
        const auto = result.proposedActions.filter(isAuto);
        const manual = result.proposedActions.filter((a) => !isAuto(a));

        for (const action of auto) {
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
        if (manual.length > 0) {
          setPendingActions(manual);
        }
        saveNow(activeId, messagesRef.current);
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
      saveNow(activeId, messagesRef.current);
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
      saveNow(activeId, messagesRef.current);
      setPendingActions([]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `❌ Erreur lors de l'exécution de **${action.actionName.replace(/_/g, " ")}** :\n${err instanceof Error ? err.message : "Erreur inconnue"}`,
        },
      ]);
      saveNow(activeId, messagesRef.current);
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
    saveNow(activeId, messagesRef.current);
  }

  return (
    <>
      <FloatingButton onClick={() => setOpen((o) => !o)} open={open} hasNews={ticketUnread > 0} />
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
                  {(listQ.data?.convos ?? []).find((c) => c.id === activeId)?.title ?? "Conversation"}
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
                        Conversations ({listQ.data?.convos.length ?? 0})
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
                      {listQ.isLoading ? (
                        <p className="px-3 py-6 text-center text-xs text-muted-foreground">
                          Chargement de l'historique…
                        </p>
                      ) : listQ.isError ? (
                        <div className="px-3 py-6 text-center">
                          <p className="text-xs text-muted-foreground">Historique indisponible.</p>
                          <button
                            type="button"
                            onClick={() => listQ.refetch()}
                            className="mt-2 text-xs font-semibold text-brand-dk hover:underline"
                          >
                            Réessayer
                          </button>
                        </div>
                      ) : (
                        (listQ.data?.convos ?? []).map((c) => {
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
                                  · {c.messageCount} message{c.messageCount > 1 ? "s" : ""}
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
                        })
                      )}
                    </div>
                  </motion.aside>
                )}
              </AnimatePresence>

              <div className="flex h-full min-h-0 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto space-y-4 px-4 py-4">
              {detailQ.isLoading && !messages.length ? (
                <div className="flex justify-start">
                  <div className="flex items-center gap-3 rounded-2xl bg-muted/70 px-4 py-3">
                    <LoadingDots />
                    <span className="text-xs text-muted-foreground">Chargement de la conversation...</span>
                  </div>
                </div>
              ) : null}
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
