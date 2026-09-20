"use client";

import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  Loader2,
  LogIn,
  MessageCircle,
  MoreVertical,
  Paperclip,
  Send,
  X,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { $fetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import { imageUploader } from "@/utils/upload";
import { wsManager, ConnectionStatus } from "@/services/ws-manager";
import { useUserStore } from "@/store/user";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SupportThread } from "@/components/support/thread";
import { AiBadge, AiDisclosureNotice } from "@/components/support/ai-badge";
import {
  AiSessionPanel,
  showsStatusLine,
  useAiSession,
} from "@/components/support/ai-session-panel";
import {
  dropMessage,
  mergeMessage,
  optimisticMessage,
  shouldAcknowledge,
  toThread,
  toThreadMessage,
  type SupportThreadMessage,
} from "@/lib/support/messages";

/**
 * The floating live-chat widget.
 *
 * ---------------------------------------------------------------------------
 * IT HAD NO AI WIRING AT ALL, AND THAT WAS A DISCLOSURE PROBLEM
 * ---------------------------------------------------------------------------
 * `user/support/chat/index.post.ts` calls `triggerAiSupport({ channel: "LIVE" })`
 * on every customer message, so with `aiSupportLiveChatEnabled` on, the agent
 * answered here. This component knew nothing about any of it: no
 * `useAiSession`, no `ai.*` frame handling, and a bubble renderer that mapped
 * the message array onto `{ id, content, sender, timestamp }` — dropping `ai`.
 *
 * The result was an AI reply presented to the customer as an indistinguishable
 * support agent, under an avatar, in first person, with no badge, no notice and
 * no way to ask for a person. That is precisely the arrangement
 * `components/support/ai-badge.tsx` documents as a legal requirement, shipped
 * on the admin's screen and absent here.
 *
 * It now runs the same `SupportThread` as the ticket page, so citations, action
 * buttons, walkthrough steps, the feedback control, the typing indicator and
 * the disclosure all arrive together or not at all.
 *
 * ---------------------------------------------------------------------------
 * OPENING THE WIDGET NO LONGER OPENS A TICKET
 * ---------------------------------------------------------------------------
 * `GET /api/user/support/chat` was get-or-create and was called on open, so
 * every customer who clicked the bubble and closed it left an empty PENDING
 * "Live Chat" row in the desk queue. The widget resumes with `create=false` and
 * only creates a conversation when the customer actually sends something.
 */

/** Where the panel sits, and how big it may get. */
const PANEL =
  "w-[min(24rem,calc(100vw-2rem))] h-[min(38rem,calc(100dvh-6rem))]";

export default function LiveChat() {
  const t = useTranslations("support_ticket");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const { user } = useUserStore();

  const [open, setOpen] = useState(false);
  const [minimised, setMinimised] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [agent, setAgent] = useState<{
    name: string | null;
    avatar: string | null;
  }>({ name: null, avatar: null });
  const [status, setStatus] = useState<
    "PENDING" | "OPEN" | "REPLIED" | "CLOSED" | null
  >(null);
  const [messages, setMessages] = useState<SupportThreadMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [resuming, setResuming] = useState(false);
  const [unread, setUnread] = useState(0);
  const [wsConnected, setWsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  /**
   * The assistant's opening line, and the one-tap starters under it.
   *
   * Fetched when the panel first opens and NOT persisted anywhere: the widget
   * deliberately creates no conversation until the customer actually writes, so
   * this is an interface affordance rather than a message. `enabled: false`
   * covers every reason it should stay quiet — addon absent, master switch off,
   * live chat off, copilot mode, or the operator having turned the greeting off
   * — and the panel falls back to its plain empty state.
   */
  const [greeting, setGreeting] = useState<{
    enabled: boolean;
    greeting: string | null;
    quickReplies: string[];
    persona: { name: string; avatar: string | null; disclosure: string } | null;
    /*
     * Whether the HUMAN desk is staffed right now — null when the operator has
     * not stated their hours. Carried separately from `enabled` on purpose: it
     * is a fact about the team, not about the assistant, and it is the more
     * useful of the two on an install that has switched the greeting off.
     */
    presence: { open: boolean; notice: string | null } | null;
  } | null>(null);

  const {
    session: aiSession,
    thinking: aiThinking,
    streamed: aiStreamed,
    refresh: refreshAiSession,
    handleFrame: handleAiFrame,
  } = useAiSession(sessionId);

  /*
   * Latest-value refs, so the websocket effect depends only on the session id.
   * Re-subscribing on every incoming frame would tear the socket down
   * mid-stream.
   *
   * Both are written in an EFFECT, not during render. A ref mutated during
   * render is not safe under concurrent rendering — the render may be thrown
   * away and re-run, and the write is not — and `react-hooks/refs` rejects it.
   * An effect with no dependency array runs after every commit, which is
   * exactly "before any frame can arrive".
   */
  const aiFrameRef = useRef(handleAiFrame);
  const visibleRef = useRef(false);
  useEffect(() => {
    aiFrameRef.current = handleAiFrame;
    visibleRef.current = open && !minimised;
  });

  /** Resume an existing conversation WITHOUT creating one. */
  const resume = useCallback(async () => {
    if (!user?.id) return;
    setResuming(true);
    const { data } = await $fetch<any>({
      url: "/api/user/support/chat?create=false",
      silent: true,
    });
    if (data?.id) {
      setSessionId(data.id);
      setStatus(data.status ?? null);
      setMessages(toThread(data.messages));
      setAgent({
        name:
          [data.agent?.firstName, data.agent?.lastName]
            .filter(Boolean)
            .join(" ") || null,
        avatar: data.agent?.avatar ?? null,
      });
    }
    setResuming(false);
  }, [user?.id]);

  /** Resume-or-create. Called on the first send, never on open. */
  const ensureSession = useCallback(async (): Promise<string | null> => {
    if (sessionId) return sessionId;
    const { data, error: err } = await $fetch<any>({
      url: "/api/user/support/chat",
      silent: true,
    });
    if (!data?.id) {
      setError(String(err || t("could_not_start_chat")));
      return null;
    }
    setSessionId(data.id);
    setStatus(data.status ?? null);
    setMessages(toThread(data.messages));
    return data.id as string;
  }, [sessionId, t]);

  /**
   * Make the panel visible and clear the unread badge.
   *
   * Clearing is done HERE rather than in an effect keyed on
   * `[open, minimised]`: the badge counts what the customer has not seen, and
   * "they just opened it" is an event, not a derived value. As an effect it was
   * also a plain `react-hooks/set-state-in-effect` violation.
   */
  const show = useCallback(() => {
    setOpen(true);
    setMinimised(false);
    setUnread(0);
  }, []);

  // ---- open / close, and the cross-page event ---------------------------
  useEffect(() => {
    const onOpen = (event: Event) => {
      const detail = (event as CustomEvent).detail || {};
      setOpen(true);
      setMinimised(false);
      setUnread(0);
      if (detail.sessionId) setSessionId(String(detail.sessionId));
    };
    window.addEventListener("openLiveChat", onOpen as EventListener);
    return () =>
      window.removeEventListener("openLiveChat", onOpen as EventListener);
  }, []);

  // Look for an existing conversation once the panel is actually opened, so a
  // customer who never opens it costs no request at all.
  useEffect(() => {
    if (!open || sessionId || !user?.id) return;
    void resume();
  }, [open, sessionId, user?.id, resume]);

  // The greeting, fetched once per mount and only when the panel is opened —
  // same rule as `resume`: a customer who never opens the widget costs nothing.
  // A 404 (addon not installed) resolves to `enabled: false` and the panel
  // renders its ordinary empty state.
  useEffect(() => {
    if (!open || greeting || !user?.id) return;
    let cancelled = false;
    (async () => {
      const { data } = await $fetch<any>({
        url: "/api/ai/support/greeting",
        silent: true,
      });
      if (cancelled) return;
      // `presence` is read on BOTH branches — the desk's hours do not stop being
      // true because the operator turned the opening line off.
      const presence =
        data?.presence && typeof data.presence.open === "boolean"
          ? { open: data.presence.open, notice: data.presence.notice ?? null }
          : null;
      setGreeting(
        data?.enabled
          ? {
              enabled: true,
              greeting: data.greeting ?? null,
              quickReplies: Array.isArray(data.quickReplies)
                ? data.quickReplies
                : [],
              persona: data.persona ?? null,
              presence,
            }
          : {
              enabled: false,
              greeting: null,
              quickReplies: [],
              persona: null,
              presence,
            }
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [open, greeting, user?.id]);

  // Grow the composer with its content, up to a cap.
  useEffect(() => {
    const node = textareaRef.current;
    if (!node) return;
    node.style.height = "auto";
    node.style.height = `${Math.min(node.scrollHeight, 140)}px`;
  }, [draft]);

  // ---- websocket ---------------------------------------------------------
  useEffect(() => {
    if (!sessionId) return;

    const connectionId = "live-chat";
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const isDev = process.env.NODE_ENV === "development";
    const backendPort = process.env.NEXT_PUBLIC_BACKEND_PORT || "4000";
    const host = isDev
      ? `${window.location.hostname}:${backendPort}`
      : window.location.host;
    const wsUrl = `${protocol}//${host}/api/user/support/ticket?userId=${user?.id || ""}`;

    wsManager.connect(wsUrl, connectionId);

    const onStatus = (state: ConnectionStatus) => {
      setWsConnected(state === ConnectionStatus.CONNECTED);
      if (state === ConnectionStatus.CONNECTED) {
        wsManager.sendMessage(
          { action: "SUBSCRIBE", payload: { id: sessionId } },
          connectionId
        );
      }
    };

    const onFrame = (frame: any) => {
      if (!frame?.method) return;
      const payload = frame.payload;

      switch (frame.method) {
        case "update":
          if (payload?.status) setStatus(payload.status);
          if (payload?.agentName || payload?.agentId) {
            setAgent((prev) => ({
              ...prev,
              name: payload.agentName ?? prev.name,
            }));
          }
          break;
        case "reply": {
          if (payload?.message) {
            const incoming = toThreadMessage(payload.message);
            setMessages((prev) => mergeMessage(prev, incoming));
            // Only the other side's messages count as unread, and only while
            // the customer cannot see them.
            if (incoming.type === "agent" && !visibleRef.current) {
              setUnread((n) => n + 1);
            }
          }
          if (payload?.status) setStatus(payload.status);
          aiFrameRef.current("reply", payload);
          break;
        }
        default:
          aiFrameRef.current(frame.method, payload);
          break;
      }
    };

    wsManager.addStatusListener(onStatus, connectionId);
    wsManager.subscribe(`ticket-${sessionId}`, onFrame, connectionId);

    return () => {
      if (wsManager.getStatus(connectionId) === ConnectionStatus.CONNECTED) {
        wsManager.sendMessage(
          { action: "UNSUBSCRIBE", payload: { id: sessionId } },
          connectionId
        );
      }
      wsManager.removeStatusListener(onStatus, connectionId);
      wsManager.unsubscribe(`ticket-${sessionId}`, onFrame, connectionId);
      // The connection itself is left open on purpose — the widget lives in the
      // layout and is re-subscribed on the next conversation.
    };
  }, [sessionId, user?.id]);

  // ---- sending -----------------------------------------------------------
  const post = useCallback(
    async (text: string, imageUrl?: string) => {
      setError(null);
      const id = await ensureSession();
      if (!id) return false;

      const echo = optimisticMessage(text, user?.id, imageUrl);
      setMessages((prev) => [...prev, echo]);

      const { error: err } = await $fetch({
        url: "/api/user/support/chat",
        method: "POST",
        body: {
          sessionId: id,
          content: text,
          sender: "user",
          ...(imageUrl ? { imageUrl } : {}),
          // Without this the assistant answers in English whatever language the
          // customer is reading the site in — the backend has no locale of its
          // own to fall back to.
          locale,
        },
        silent: true,
      });

      if (err) {
        setMessages((prev) => dropMessage(prev, echo.id));
        setError(String(err));
        return false;
      }
      return true;
    },
    [ensureSession, user?.id, locale]
  );

  const send = async () => {
    const text = draft.trim();
    if (!text || busy) return;
    setBusy(true);
    setDraft("");
    const ok = await post(text);
    if (!ok) setDraft(text);
    setBusy(false);
  };

  const onFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError(t("images_only"));
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError(t("max_10mb"));
      return;
    }

    setUploading(true);
    setError(null);
    const upload = await imageUploader({
      file,
      dir: "live-chat-images",
      size: { maxWidth: 800, maxHeight: 600 },
    });
    if (upload.success && upload.url) {
      await post(t("shared_an_image", { name: file.name }), upload.url);
    } else {
      setError(upload.error || tCommon("upload_failed"));
    }
    setUploading(false);
  };

  const endChat = async () => {
    if (!sessionId) return;
    await $fetch({
      url: "/api/user/support/chat",
      method: "DELETE",
      body: { sessionId },
      silent: true,
    });
    setSessionId(null);
    setMessages([]);
    setStatus(null);
    setAgent({ name: null, avatar: null });
    setUnread(0);
    setOpen(false);
  };

  // ---- render ------------------------------------------------------------
  const ended = status === "CLOSED";
  const aiActive = Boolean(aiSession?.active);
  const headline = aiActive
    ? aiSession?.persona?.name || tCommon("assistant")
    : agent.name || tCommon("support");
  const headlineAvatar = aiActive
    ? aiSession?.persona?.avatar || null
    : agent.avatar;

  /*
   * WHAT THIS LINE USED TO SAY WAS NOT TRUE.
   *
   * It read "Online" with a green dot whenever `wsConnected` — i.e. whenever
   * the BROWSER had a websocket. That is a statement about the customer's own
   * network, rendered directly under the word "Support", where it reads as "a
   * support agent is online". Nobody had to be there at all, and on this
   * install nobody was: the master switch was off, so the message sat in a
   * queue while the widget said Online.
   *
   * Every branch below is a claim the surface can actually support:
   * `status` is the ticket's whose-turn column, `aiActive` comes from the
   * session endpoint, and the socket only speaks for itself.
   */
  const presence: { label: string; tone: "ok" | "warn" | "muted" } = ended
    ? { label: t("status_chat_ended"), tone: "muted" }
    : !sessionId
      ? { label: t("status_send_to_start"), tone: "muted" }
      : !wsConnected
        ? { label: `${tCommon("connecting")}…`, tone: "warn" }
        : aiActive
          ? { label: t("status_assistant_answering"), tone: "ok" }
          : status === "REPLIED"
            ? { label: t("status_support_replied"), tone: "ok" }
            : { label: t("status_waiting_for_agent"), tone: "warn" };

  /*
   * The customer spoke last and nothing else on the panel says who is coming,
   * so say it. Without this the panel is a void after every message — which is
   * exactly what "why did I not see any response" looks like from the other
   * side — and without the other half of the rule it printed a second copy of a
   * promise the transcript had already made. See `shouldAcknowledge`.
   */
  const awaitingReply = shouldAcknowledge({
    thread: messages,
    closed: ended,
    aiActive,
    aiThinking,
    statusShown: showsStatusLine(aiSession),
  });

  return (
    <div className="fixed end-4 bottom-4 z-50 sm:end-6 sm:bottom-6">
      {!open ? (
        <div className="relative">
          <Button
            onClick={show}
            size="icon"
            className="size-12 rounded-full shadow-lg"
            aria-label={tCommon("start_live_chat")}
          >
            <MessageCircle className="size-5" />
          </Button>
          {unread > 0 ? (
            <span className="bg-destructive text-destructive-foreground absolute -end-1 -top-1 grid min-w-5 place-items-center rounded-full px-1.5 text-[11px] font-semibold">
              {unread > 9 ? "9+" : unread}
            </span>
          ) : null}
        </div>
      ) : (
        /* `elevated` is the documented exception to Ledger: this genuinely
           floats above the page rather than sitting in it. */
        <Card
          variant="elevated"
          padding="none"
          className={cn(
            "flex flex-col overflow-hidden",
            minimised ? "h-14 w-[min(20rem,calc(100vw-2rem))]" : PANEL
          )}
        >
          {/* ---- header ------------------------------------------------- */}
          <div className="border-border bg-surface-2 flex shrink-0 items-center gap-2.5 border-b px-3 py-2.5">
            <Avatar className={cn("size-8 shrink-0", aiActive && "ring-info/30 ring-1")}>
              {headlineAvatar ? (
                <AvatarImage src={headlineAvatar} alt={headline} />
              ) : null}
              <AvatarFallback
                className={cn(
                  "text-[11px] font-medium",
                  aiActive && "bg-info/10 text-info"
                )}
              >
                {headline.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="truncate text-sm font-semibold">{headline}</p>
                {aiActive ? <AiBadge /> : null}
              </div>
              <p className="text-muted-foreground flex items-center gap-1.5 text-[11px]">
                <span
                  className={cn(
                    "size-1.5 shrink-0 rounded-full",
                    presence.tone === "ok"
                      ? "bg-success"
                      : presence.tone === "warn"
                        ? "bg-warning"
                        : "bg-muted-foreground/50"
                  )}
                  aria-hidden
                />
                {presence.label}
              </p>
            </div>

            {sessionId && !ended ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    aria-label={tCommon("more")}
                  >
                    <MoreVertical className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={endChat}>
                    {t("end_chat")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}

            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={() => (minimised ? show() : setMinimised(true))}
              aria-label={minimised ? tCommon("expand") : tCommon("minimize")}
            >
              <ChevronDown
                className={cn("size-4 transition-transform", minimised && "rotate-180")}
              />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={() => setOpen(false)}
              aria-label={tCommon("close")}
            >
              <X className="size-4" />
            </Button>
          </div>

          {!minimised ? (
            <>
              {!user?.id ? (
                <SignInPanel />
              ) : (
                <>
                  <SupportThread
                    messages={messages}
                    density="compact"
                    loading={resuming}
                    persona={aiSession?.persona}
                    aiActive={aiActive}
                    disclosureEnabled={Boolean(aiSession?.enabled)}
                    thinking={aiThinking}
                    streamed={aiStreamed}
                    counterpartName={agent.name ?? undefined}
                    counterpartAvatar={agent.avatar}
                    /* The live-chat ticket. Same reason as the ticket page. */
                    ticketId={sessionId ?? undefined}
                    className="px-3 sm:px-3"
                    foot={
                      awaitingReply ? (
                        <p className="text-muted-foreground border-border bg-muted/40 mx-auto max-w-[18rem] rounded-xl border px-3 py-2 text-center text-[11px] leading-relaxed">
                          {t("ack_received")}
                        </p>
                      ) : null
                    }
                    empty={
                      greeting?.enabled && greeting.greeting ? (
                        <AssistantGreeting
                          text={greeting.greeting}
                          persona={greeting.persona}
                          quickReplies={greeting.quickReplies}
                          presence={greeting.presence}
                          disabled={busy}
                          onPick={(text) => {
                            setDraft("");
                            void (async () => {
                              setBusy(true);
                              const ok = await post(text);
                              if (!ok) setDraft(text);
                              setBusy(false);
                            })();
                          }}
                        />
                      ) : (
                        <div className="px-2 py-8 text-center">
                          <span className="bg-primary/10 text-primary mx-auto mb-3 grid size-10 place-items-center rounded-full">
                            <MessageCircle className="size-5" />
                          </span>
                          <p className="text-sm font-medium">
                            {tCommon("start_live_chat")}
                          </p>
                          <p className="text-muted-foreground mx-auto mt-1 max-w-[15rem] text-xs leading-relaxed">
                            {t("chat_intro")}
                          </p>
                        </div>
                      )
                    }
                  />

                  {/* ---- composer ------------------------------------- */}
                  <div className="border-border bg-surface-2 shrink-0 space-y-2 border-t p-3">
                    {ended ? (
                      <p className="text-muted-foreground py-1 text-center text-xs">
                        {t("chat_session_has_ended")}
                      </p>
                    ) : (
                      <>
                        <div className="flex items-end gap-2">
                          <Textarea
                            ref={textareaRef}
                            rows={1}
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            placeholder={`${tCommon("type_your_message")}…`}
                            className="max-h-36 min-h-9 flex-1 resize-none py-2 text-sm"
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                send();
                              }
                            }}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-9 shrink-0"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                            aria-label={t("attach_image")}
                          >
                            {uploading ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <Paperclip className="size-4" />
                            )}
                          </Button>
                          <Button
                            size="icon"
                            className="size-9 shrink-0"
                            onClick={send}
                            disabled={!draft.trim() || busy}
                            aria-label={tCommon("send")}
                          >
                            {busy ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <Send className="size-4" />
                            )}
                          </Button>
                        </div>

                        {error ? (
                          <p className="text-destructive text-[11px]">{error}</p>
                        ) : null}

                        {sessionId ? (
                          <AiSessionPanel
                            ticketId={sessionId}
                            session={aiSession}
                            onRequested={refreshAiSession}
                          />
                        ) : null}
                      </>
                    )}
                  </div>
                </>
              )}
            </>
          ) : null}
        </Card>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onFile}
      />
    </div>
  );
}

/**
 * The assistant's opening line, before there is a conversation.
 *
 * ---------------------------------------------------------------------------
 * THE DISCLOSURE COMES WITH IT, AND THAT IS AN IMPROVEMENT
 * ---------------------------------------------------------------------------
 * `SupportThread` normally puts the notice above the assistant's first reply.
 * Here the assistant speaks FIRST, so the notice belongs with the greeting —
 * which is closer to what the rule actually asks for than waiting for a reply:
 * the customer is told who they are talking to before they have typed anything,
 * rather than after.
 *
 * ---------------------------------------------------------------------------
 * THE STARTERS ARE THE POINT, NOT THE GREETING
 * ---------------------------------------------------------------------------
 * "How can I help?" hands the work back to the customer — they have to invent a
 * question and phrase it. A short list of the things people actually ask
 * removes that, and steers them toward questions the knowledge base can answer
 * rather than ones it will have to hand to the desk.
 *
 * They ship EMPTY. An invented starter that turns out to be undocumented is
 * worse than no starter at all: the product suggested the question and then
 * refused to answer it.
 */
function AssistantGreeting({
  text,
  persona,
  quickReplies,
  presence,
  disabled,
  onPick,
}: {
  text: string;
  persona: { name: string; avatar: string | null; disclosure: string } | null;
  quickReplies: string[];
  presence: { open: boolean; notice: string | null } | null;
  disabled?: boolean;
  onPick: (text: string) => void;
}) {
  const t = useTranslations("support_ticket");
  const tCommon = useTranslations("common");
  const name = persona?.name || tCommon("assistant");

  return (
    <div className="space-y-3 py-2">
      <div className="flex gap-2.5">
        <Avatar className="ring-info/30 mt-0.5 size-8 shrink-0 ring-1">
          {persona?.avatar ? (
            <AvatarImage src={persona.avatar} alt={name} />
          ) : null}
          <AvatarFallback className="bg-info/10 text-info text-[11px] font-medium">
            {name.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-1.5">
            <span className="text-xs font-medium">{name}</span>
            <AiBadge />
          </div>
          <div className="bg-muted/60 text-foreground rounded-2xl rounded-ss-sm px-3 py-2 text-sm leading-relaxed">
            {text}
          </div>
        </div>
      </div>

      {/* WHEN A PERSON IS AVAILABLE, stated before the customer types.
          The assistant answers around the clock; the team does not, and the
          greeting promises "I'll bring in a member of the team whenever you
          want one" — which at 02:00 on a Sunday is true but not immediate.
          Shown only where the operator has stated their hours, and only while
          the desk is shut. Once a conversation exists the handover message
          carries the same timing, so this never doubles up. */}
      {presence && !presence.open && presence.notice ? (
        <p className="text-muted-foreground ps-10 text-[11px] leading-relaxed">
          {presence.notice}
        </p>
      ) : null}

      {quickReplies.length ? (
        <div className="flex flex-wrap gap-1.5 ps-10">
          {quickReplies.map((reply) => (
            <button
              key={reply}
              type="button"
              disabled={disabled}
              onClick={() => onPick(reply)}
              className="border-border hover:border-border-strong hover:bg-muted/60 disabled:opacity-50 rounded-full border px-2.5 py-1 text-start text-xs transition-colors"
            >
              {reply}
            </button>
          ))}
        </div>
      ) : null}

      {persona?.disclosure ? (
        <AiDisclosureNotice text={persona.disclosure} />
      ) : null}
    </div>
  );
}

/**
 * Anonymous visitors.
 *
 * Every chat endpoint is `requiresAuth: true`, so the old widget's "Start Chat
 * Now" button 401'd and rendered "Unable to connect to chat service" — which
 * reads as an outage rather than as "you need to sign in".
 */
function SignInPanel() {
  const t = useTranslations("support_ticket");
  const tCommon = useTranslations("common");

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
      <span className="bg-muted text-muted-foreground grid size-10 place-items-center rounded-full">
        <LogIn className="size-5" />
      </span>
      <div>
        <p className="text-sm font-medium">{t("sign_in_to_chat")}</p>
        <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
          {t("sign_in_to_chat_body")}
        </p>
      </div>
      <Button asChild size="sm">
        <Link href="/login">{tCommon("sign_in")}</Link>
      </Button>
    </div>
  );
}
