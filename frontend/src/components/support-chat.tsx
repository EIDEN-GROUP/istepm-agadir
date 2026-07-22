import { useState, useEffect, useRef, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { useDashboardI18n } from "@/lib/dashboard-i18n";
import { LifeBuoy, X, Send, Plus, MessageCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";

function msgTime(ts: string) {
  const d = new Date(ts);
  return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

export function SupportChat() {
  const { t } = useDashboardI18n();
  const [open, setOpen] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const { user } = useAuth();
  const bottomRef = useRef<HTMLDivElement>(null);

  const createOrGetSession = useCallback(async () => {
    try {
      const sessions = await api.get<any[]>("/support/sessions/open");
      if (sessions.length > 0) {
        setSessionId(sessions[0].id);
        return sessions[0].id;
      }
      const created = await api.post<{ id: string }>("/support/sessions", {
        adminName: user?.name,
      });
      setSessionId(created.id);
      return created.id;
    } catch {
      return null;
    }
  }, [user]);

  const loadMessages = useCallback(async (sid: string) => {
    try {
      setMessages(await api.get<any[]>(`/support/sessions/${sid}/messages`));
    } catch {}
  }, []);

  useEffect(() => {
    if (!open) return;
    createOrGetSession().then((sid) => {
      if (sid) {
        loadMessages(sid);
        const iv = setInterval(() => loadMessages(sid), 5000);
        return () => clearInterval(iv);
      }
    });
  }, [open, createOrGetSession, loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!input.trim() || !sessionId) return;
    try {
      await api.post(`/support/sessions/${sessionId}/messages`, {
        content: input,
      });
      setInput("");
      loadMessages(sessionId);
    } catch {}
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 grid h-12 w-12 place-items-center rounded-full bg-[#28396C] text-white shadow-lg hover:bg-[#1f2d55]"
      >
        <MessageCircle className="h-5 w-5" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-24 right-6 z-50 flex w-80 flex-col rounded-2xl border border-border bg-card shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <p className="text-sm font-semibold text-foreground">Support</p>
              <button
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex max-h-96 min-h-[200px] flex-col overflow-y-auto p-4">
              {messages.map((m: any) => (
                <div
                  key={m.id}
                  className={cn(
                    "mb-3 max-w-[80%] rounded-xl px-3 py-2 text-sm",
                    m.senderRole === "superadmin"
                      ? "bg-[#28396C] text-white ml-auto"
                      : "bg-muted text-foreground",
                  )}
                >
                  <p>{m.content}</p>
                  <p className="mt-0.5 text-[10px] opacity-60">
                    {msgTime(m.createdAt)}
                  </p>
                </div>
              ))}
              <div ref={bottomRef} />
              <div className="mt-3 flex gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && send()}
                  placeholder="Votre message..."
                  className="flex-1 rounded-full border border-border bg-background px-3 py-2 text-xs outline-none focus:border-[#28396C]"
                />
                <button
                  onClick={send}
                  className="grid h-8 w-8 place-items-center rounded-full bg-[#28396C] text-white"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
