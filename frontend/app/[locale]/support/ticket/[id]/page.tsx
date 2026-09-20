"use client";

import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Copy,
  Download,
  Loader2,
  MoreVertical,
  PanelRightClose,
  PanelRightOpen,
  Paperclip,
  Send,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { $fetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import { wsManager, ConnectionStatus } from "@/services/ws-manager";
import { imageUploader } from "@/utils/upload";
import { formatRelativeTime } from "@/utils/format";
import { useToast } from "@/hooks/use-toast";
import { useUserStore } from "@/store/user";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { EditorShell, EditorBarDivider } from "@/components/layout/editor-shell";
import { EditorThemeToggle } from "@/components/layout/editor-theme-toggle";
import { SupportThread } from "@/components/support/thread";
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
import {
  CollapsedPaneRail,
  ResolutionPane,
  submitSatisfaction,
  type PaneTab,
} from "@/components/support/resolution-pane";
import { readResolution } from "@/lib/support/resolution";

import {
  TicketPriorityBadge,
  TicketStatusBadge,
} from "../components/ticket-status";

/**
 * One conversation, as a full-screen application.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS OWNS THE VIEWPORT
 * ---------------------------------------------------------------------------
 * It was a `PageShell` page: header clearance, a masthead band repeating the
 * subject the bar already carries, `py-8` at both ends, and a conversation panel
 * pinned to a literal `lg:h-[42rem]` inside it. On a 1080p laptop that spent
 * roughly 17rem of vertical space before the first message and then constrained
 * the thread to a fixed box that could not use what was left.
 *
 * A support conversation is the same object as the admin Live Inbox — a thread
 * you sit in while someone waits — and that screen is an `EditorShell` for
 * exactly these reasons. The segment layout suppresses the site chrome for this
 * route (its `CHROMELESS` list) so this is an ordinary 100vh block rather than a
 * `fixed inset-0` overlay painting on top of a header that still eats clicks.
 *
 * THE BACK ARROW IS NOT DECORATION. Removing the navbar removes every way out
 * of this route, and browser-back is not an affordance a screen may rely on.
 *
 * ---------------------------------------------------------------------------
 * THE THREAD IS NOT RENDERED HERE
 * ---------------------------------------------------------------------------
 * This page used to map the raw message array onto a four-field local shape and
 * draw its own bubbles, discarding `ai`, `turnId`, `citations`, `actions`,
 * `steps`, `key` and `system` — every field the AI support addon writes. See
 * `components/support/thread.tsx` and `lib/support/messages.ts`, which the chat
 * widget shares.
 */

interface TicketRecord {
  id: string;
  userId: string;
  agentId?: string | null;
  agentName?: string | null;
  agent?: { firstName?: string; lastName?: string; avatar?: string } | null;
  subject: string;
  importance: "LOW" | "MEDIUM" | "HIGH";
  status: "PENDING" | "OPEN" | "REPLIED" | "CLOSED";
  messages?: unknown;
  type?: "LIVE" | "TICKET";
  tags?: string[] | null;
  responseTime?: number | null;
  satisfaction?: number | null;
  createdAt?: string;
  updatedAt?: string;
}

export default function TicketConversationPage() {
  const t = useTranslations("support_ticket");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const params = useParams<{ id: string }>();
  const { toast } = useToast();
  const { user } = useUserStore();
  // Hoisted out of every dependency array below: an optional-chained member
  // expression in `useCallback`/`useEffect` deps is what the React compiler
  // cannot preserve, and it drops the memoisation silently rather than failing.
  const userId = user?.id;

  const [ticket, setTicket] = useState<TicketRecord | null>(null);
  const [messages, setMessages] = useState<SupportThreadMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);
  /** The pane is a preference, so it persists for the session, not per ticket. */
  const [railOpen, setRailOpen] = useState(true);
  const [railSheet, setRailSheet] = useState(false);
  const [closing, setClosing] = useState(false);
  /*
   * A one-way door beside a text field gets pressed by accident, so the button
   * asks once. `index.post.ts` 403s on a closed ticket — the customer cannot
   * undo this by replying, and the confirm step is what makes that acceptable.
   */
  const [confirmClose, setConfirmClose] = useState(false);
  /**
   * Which tab the pane is showing, and which cards a reference strip pointed at.
   *
   * Both live HERE rather than inside the pane because the thread drives them:
   * pressing "2 sources" under a message has to be able to reach into the
   * column beside it. That binding is the direction's whole argument — a
   * citation you can read next to the answer instead of a chip that opens a new
   * tab and loses the conversation.
   */
  const [paneTab, setPaneTab] = useState<PaneTab>("ticket");
  const [markedSources, setMarkedSources] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Optional AI Support Agent. Resolves to a null session when the addon is
  // absent, so every branch below degrades to a plain human conversation.
  const {
    session: aiSession,
    thinking: aiThinking,
    streamed: aiStreamed,
    refresh: refreshAiSession,
    handleFrame: handleAiFrame,
  } = useAiSession(params?.id);

  /*
   * Latest-value ref, so the websocket effect depends only on the ticket id —
   * re-subscribing every time the AI hook returns a new closure would tear the
   * socket down and rebuild it on each frame.
   *
   * Written in an EFFECT, not during render: a render may be discarded and
   * re-run under concurrent rendering while the ref write is not, and
   * `react-hooks/refs` rejects it. An effect with no dependency array runs
   * after every commit, i.e. before any frame can arrive.
   */
  const aiFrameRef = useRef(handleAiFrame);
  useEffect(() => {
    aiFrameRef.current = handleAiFrame;
  });

  useEffect(() => {
    if (!params?.id) return;
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      const { data } = await $fetch<TicketRecord>({
        url: `/api/user/support/ticket/${params.id}`,
        silent: true,
      });
      if (cancelled) return;
      if (data?.id) {
        setTicket(data);
        setMessages(toThread(data.messages));
      }
      setIsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [params?.id]);

  const ticketId = ticket?.id;

  /**
   * The transcript, read as a resolution.
   *
   * Derived, not fetched — every citation, action and walkthrough already
   * arrived with the ticket. A second request could be empty while the thread
   * was full, which is the one state the pane's floor exists to prevent. See
   * `lib/support/resolution.ts`.
   *
   * MUST stay above the `!ticket` early return: it is a hook.
   */
  const resolution = useMemo(() => readResolution(messages), [messages]);

  useEffect(() => {
    if (!ticketId) return;

    const connectionId = `ticket-${ticketId}`;
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const isDev = process.env.NODE_ENV === "development";
    const backendPort = process.env.NEXT_PUBLIC_BACKEND_PORT || "4000";
    // In development connect straight to the backend: Next's rewrites do not
    // proxy a websocket upgrade.
    const host = isDev
      ? `${window.location.hostname}:${backendPort}`
      : window.location.host;
    const wsUrl = `${protocol}//${host}/api/user/support/ticket?userId=${userId || ""}`;

    wsManager.connect(wsUrl, connectionId);

    const handleStatusChange = (status: ConnectionStatus) => {
      setWsConnected(status === ConnectionStatus.CONNECTED);
      if (status === ConnectionStatus.CONNECTED) {
        wsManager.sendMessage(
          { action: "SUBSCRIBE", payload: { id: ticketId } },
          connectionId
        );
      }
    };

    const handleMessage = (frame: any) => {
      if (!frame?.method) return;
      // `payload`, not `data`. Every writer broadcasts under `payload`
      // (utils/support/broadcast.ts is the single writer); reading `data` here
      // threw a TypeError that ws-manager swallowed, so an agent's reply simply
      // never appeared with a clean log on both sides.
      const payload = frame.payload;

      switch (frame.method) {
        case "update":
          setTicket((prev) => (prev ? { ...prev, ...payload } : prev));
          break;
        case "reply": {
          if (payload?.message) {
            setMessages((prev) =>
              mergeMessage(prev, toThreadMessage(payload.message))
            );
          }
          if (payload?.status || payload?.updatedAt) {
            setTicket((prev) =>
              prev
                ? {
                    ...prev,
                    ...(payload.status ? { status: payload.status } : {}),
                    ...(payload.updatedAt
                      ? { updatedAt: payload.updatedAt }
                      : {}),
                  }
                : prev
            );
          }
          // A message arrived from anyone — the AI is no longer mid-answer.
          aiFrameRef.current("reply", payload);
          break;
        }
        default:
          // `ai.status`, `ai.delta`, `ai.done`, `ai.cancelled`, `ai.handover`.
          aiFrameRef.current(frame.method, payload);
          break;
      }
    };

    wsManager.addStatusListener(handleStatusChange, connectionId);
    wsManager.subscribe(`ticket-${ticketId}`, handleMessage, connectionId);

    return () => {
      if (wsManager.getStatus(connectionId) === ConnectionStatus.CONNECTED) {
        wsManager.sendMessage(
          { action: "UNSUBSCRIBE", payload: { id: ticketId } },
          connectionId
        );
      }
      wsManager.removeStatusListener(handleStatusChange, connectionId);
      wsManager.unsubscribe(`ticket-${ticketId}`, handleMessage, connectionId);
      wsManager.close(connectionId);
    };
  }, [ticketId, userId]);

  const post = useCallback(
    async (text: string, attachment?: string) => {
      if (!ticketId || !userId) return false;

      const echo = optimisticMessage(text, userId, attachment);
      setMessages((prev) => [...prev, echo]);

      const { error } = await $fetch({
        url: `/api/user/support/ticket/${ticketId}`,
        method: "POST",
        body: {
          type: "client",
          time: echo.time,
          userId,
          text,
          attachment: attachment ?? null,
          // The backend is locale-blind — there is no `locale` column on `user`
          // and NEXT_LOCALE is a frontend cookie — so the answering model is
          // told which language to reply in from here. Without it every install
          // answered in English regardless of the UI language.
          locale,
        },
        silent: true,
      });

      if (error) {
        setMessages((prev) => dropMessage(prev, echo.id));
        toast({
          title: t("message_failed"),
          description: String(error),
          variant: "destructive",
        });
        return false;
      }
      return true;
    },
    [ticketId, userId, locale, toast, t]
  );

  const handleSend = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    setDraft("");
    const ok = await post(text);
    if (!ok) setDraft(text);
    setSending(false);
  };

  /**
   * A reference strip was pressed: show the pane, on the right tab, with the
   * cards that message cited marked.
   *
   * Below `xl` the pane is a sheet, so open that instead — otherwise the
   * control does nothing at exactly the width where the chips it replaced were
   * the customer's only route to the source.
   */
  const handleOpenReferences = (
    messageId: string,
    target: "sources" | "actions"
  ) => {
    setPaneTab(target);
    setMarkedSources(
      target === "sources"
        ? (resolution.byMessage[messageId]?.sourceKeys ?? [])
        : []
    );
    if (window.matchMedia("(min-width: 80rem)").matches) setRailOpen(true);
    else setRailSheet(true);
  };

  const handleSatisfaction = async (value: number) => {
    if (!ticketId) return;
    const ok = await submitSatisfaction(ticketId, value);
    if (!ok) {
      toast({ title: t("rating_failed"), variant: "destructive" });
      return;
    }
    // Reflect it locally: the rating is one-shot server-side, so the control
    // must not come back while a refetch is in flight.
    setTicket((prev) => (prev ? { ...prev, satisfaction: value } : prev));
    toast({ title: t("thanks_for_rating"), variant: "success" });
  };

  /**
   * The customer saying "that's it, I'm done".
   *
   * ---------------------------------------------------------------------------
   * THE ROUTE EXISTED AND NOTHING CALLED IT
   * ---------------------------------------------------------------------------
   * `user/support/ticket/[id]/close.put.ts` has been shipping for a long time,
   * complete with ownership scoping and a broadcast. There was no button. A
   * customer whose problem was solved had exactly two options: leave the ticket
   * open forever, or reply "thanks" — which flips the status back to OPEN and
   * puts it back in the operator's queue as work.
   *
   * So the absence was not a missing nicety, it was a source of phantom queue
   * volume, and every operator was paying an agent to read "thanks".
   *
   * ---------------------------------------------------------------------------
   * CONFIRMED, BECAUSE THE CUSTOMER CANNOT UNDO IT
   * ---------------------------------------------------------------------------
   * `ticket/[id]/index.post.ts` returns 403 on a closed ticket — replying does
   * NOT reopen it. Closing is therefore a one-way door for the person pressing
   * the button, and a one-way door beside a text field gets pressed by accident.
   */
  const handleClose = async () => {
    if (!ticketId || closing) return;
    setClosing(true);
    const { error } = await $fetch({
      url: `/api/user/support/ticket/${ticketId}/close`,
      method: "PUT",
      silent: true,
    });
    setClosing(false);

    if (error) {
      toast({ title: t("close_failed"), variant: "destructive" });
      return;
    }
    // Reflected locally so the composer swaps to the closed state immediately,
    // rather than after whatever the next refetch costs.
    setTicket((prev) => (prev ? { ...prev, status: "CLOSED" } : prev));
    setConfirmClose(false);
    toast({ title: t("ticket_closed"), variant: "success" });
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (!file || !ticketId) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: tCommon("that_file_type_is_not_supported"),
        description: t("images_only"),
        variant: "destructive",
      });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: t("file_too_large"),
        description: t("max_10mb"),
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    const upload = await imageUploader({
      file,
      dir: "ticket-attachments",
      size: { maxWidth: 1024, maxHeight: 768 },
    });
    if (upload.success && upload.url) {
      await post(t("shared_an_image", { name: file.name }), upload.url);
    } else {
      toast({
        title: tCommon("upload_failed"),
        description: upload.error || tCommon("upload_failed"),
        variant: "destructive",
      });
    }
    setUploading(false);
  };

  const exportJson = () => {
    if (!ticket) return;
    download(
      new Blob(
        [
          JSON.stringify(
            {
              ticket: {
                id: ticket.id,
                subject: ticket.subject,
                status: ticket.status,
                priority: ticket.importance,
                created: ticket.createdAt ?? null,
                updated: ticket.updatedAt ?? null,
                tags: ticket.tags || [],
                agentName: ticket.agentName || null,
              },
              conversation: messages.map((m) => ({
                key: m.key ?? null,
                from: m.type === "client" ? "you" : m.ai ? "assistant" : "agent",
                text: m.text,
                time: m.time,
                attachment: m.attachment ?? null,
              })),
              exportedAt: new Date().toISOString(),
            },
            null,
            2
          ),
        ],
        { type: "application/json" }
      ),
      `ticket-${ticket.id}.json`
    );
  };

  const exportCsv = () => {
    if (!ticket) return;
    const escape = (value: string) => `"${String(value).replace(/"/g, '""')}"`;
    const rows = [
      ["time", "from", "text", "attachment"].join(","),
      ...messages.map((m) =>
        [
          escape(m.time),
          escape(m.type === "client" ? "you" : m.ai ? "assistant" : "agent"),
          escape(m.text),
          escape(m.attachment || ""),
        ].join(",")
      ),
    ].join("\n");
    download(
      new Blob([rows], { type: "text/csv;charset=utf-8;" }),
      `ticket-${ticket.id}.csv`
    );
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(
      `${window.location.origin}/support/ticket/${ticket?.id}`
    );
    toast({ title: tCommon("link_copied"), variant: "success" });
  };

  /**
   * `!isLoading &&` is the whole fix, not a nicety: `ticket` is null for the
   * length of the fetch, so without the guard every visit renders "Ticket not
   * found" first and the ticket second.
   *
   * Chromeless, so this branch supplies its own way out — there is no navbar
   * behind it to fall back on.
   */
  if (!isLoading && !ticket) {
    return (
      <div className="bg-background flex h-screen flex-col items-center justify-center px-6 text-center">
        <span className="bg-destructive/10 text-destructive mb-4 grid size-12 place-items-center rounded-lg">
          <AlertCircle className="size-6" />
        </span>
        <h1 className="text-xl font-semibold">{tCommon("ticket_not_found")}</h1>
        <p className="text-muted-foreground mt-1 mb-6 max-w-md text-sm leading-relaxed">
          {tCommon("the_ticket_youre_looking_for_doesnt")}
        </p>
        <Button asChild>
          <Link href="/support">
            <ArrowLeft className="mr-2 size-4" />
            {tCommon("back_to_support")}
          </Link>
        </Button>
      </div>
    );
  }

  const closed = ticket?.status === "CLOSED";
  const agentName =
    ticket?.agentName ||
    [ticket?.agent?.firstName, ticket?.agent?.lastName]
      .filter(Boolean)
      .join(" ") ||
    null;

  /**
   * ONE definition, rendered in the aside on wide viewports and in a sheet
   * below `xl`. Two copies is how the two drift.
   *
   * `collapsible` is the only thing that differs: the header's chevron collapses
   * the pane to its rail, which is meaningless inside a sheet the customer just
   * opened — there the close button already does it.
   */
  const paneFor = (collapsible: boolean) => (
    <ResolutionPane
      ticket={ticket}
      model={resolution}
      loading={isLoading}
      agentName={agentName}
      agentAvatar={ticket?.agent?.avatar}
      wsConnected={wsConnected}
      aiSession={aiSession}
      tab={paneTab}
      onTabChange={(next) => {
        setPaneTab(next);
        setMarkedSources([]);
      }}
      markedSources={markedSources}
      onCollapse={collapsible ? () => setRailOpen(false) : undefined}
      showHeader={collapsible}
      onSatisfaction={handleSatisfaction}
    />
  );

  return (
    <EditorShell
      /* `overflow-y-hidden`, not `overflow-hidden`: tailwind-merge keeps
         `overflow` and `overflow-y` in separate groups, so only the matching
         axis replaces the shell's default `overflow-y-auto`. The scroll belongs
         to the thread and to the rail, each of which owns its own. */
      bodyClassName="overflow-y-hidden"
      bar={
        <>
          <Button
            asChild
            variant="ghost"
            size="icon"
            className="size-8 shrink-0"
            aria-label={tCommon("back_to_support")}
          >
            <Link href="/support">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>

          {/* One dot carries "is this conversation live", so the title row does
              not need a second pill for it. Meaning lives on the dot's COLOUR
              and on its title text, never on an animation alone. */}
          <span
            className={cn(
              "size-1.5 shrink-0 rounded-full",
              closed
                ? "bg-muted-foreground/50"
                : wsConnected
                  ? "bg-success"
                  : "bg-warning animate-pulse"
            )}
            title={
              closed
                ? tCommon("this_ticket_has_been_resolved")
                : wsConnected
                  ? tCommon("live")
                  : `${tCommon("connecting")}…`
            }
            aria-hidden
          />

          <h1 className="min-w-0 truncate text-sm font-semibold">
            {isLoading ? (
              <Skeleton className="h-4 w-56" />
            ) : (
              ticket?.subject
            )}
          </h1>

          <EditorBarDivider />
          <span className="text-subtle-foreground shrink-0 font-mono text-[11px]">
            #{ticket?.id.slice(0, 8) ?? "········"}
          </span>
        </>
      }
      actions={
        <>
          <span className="hidden items-center gap-2 sm:flex">
            <TicketPriorityBadge
              importance={ticket?.importance ?? ""}
              loading={isLoading}
            />
            <TicketStatusBadge
              status={ticket?.status ?? ""}
              loading={isLoading}
            />
          </span>

          {/* Below xl the rail cannot be afforded beside the thread, so it
              becomes a sheet. Same component either way — a second copy of the
              details markup is how the two drift. */}
          {/* This route hides the site header, and the site header is where the
              theme control lives — so without this there is no way out of dark
              mode from a screen a customer may sit in for a long time. */}
          <EditorThemeToggle />

          <Button
            variant="ghost"
            size="icon"
            className="size-8 xl:hidden"
            onClick={() => setRailSheet(true)}
            aria-label={tCommon("details")}
          >
            <PanelRightOpen className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="hidden size-8 xl:inline-flex"
            onClick={() => setRailOpen((v) => !v)}
            aria-label={railOpen ? tCommon("hide_details") : tCommon("show_details")}
          >
            {railOpen ? (
              <PanelRightClose className="size-4" />
            ) : (
              <PanelRightOpen className="size-4" />
            )}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                disabled={isLoading}
                aria-label={tCommon("more")}
              >
                <MoreVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={exportJson}>
                <Download className="mr-2 size-4" />
                {tCommon("export_as_json")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportCsv}>
                <Download className="mr-2 size-4" />
                {t("export_as_csv")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={copyLink}>
                <Copy className="mr-2 size-4" />
                {t("copy_ticket_link")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      }
    >
      <div className="flex h-full">
        {/* ---- conversation ------------------------------------------- */}
        <section className="flex min-w-0 flex-1 flex-col">
          <SupportThread
            messages={messages}
            loading={isLoading}
            persona={aiSession?.persona}
            aiActive={Boolean(aiSession?.active)}
            disclosureEnabled={Boolean(aiSession?.enabled)}
            thinking={aiThinking}
            streamed={aiStreamed}
            counterpartName={agentName ?? undefined}
            counterpartAvatar={ticket?.agent?.avatar}
            /* So the workflow card can read the OUTSTANDING step rather than the
               step-0 snapshot persisted on the message — without it a reload
               strands a customer mid-process. */
            ticketId={ticketId}
            /* Citations and action pills collapse into one strip that hands off
               to the pane, where a source is a card with its quote visible.
               The floating widget and the admin thread pass nothing and keep
               today's inline chips — this is a prop, not a fork. */
            decorations="reference"
            onOpenReferences={handleOpenReferences}
            /* The bubbles cap at 42rem, but on a 2560px monitor an unbounded
               column leaves them adrift against the left edge. Centring the
               list keeps the reading column where the eye already is. */
            contentClassName="mx-auto w-full max-w-3xl"
            lead={
              !isLoading && ticket?.createdAt ? (
                <p className="text-subtle-foreground mx-auto mb-6 w-full max-w-3xl text-center text-[11px]">
                  {t("opened_relative", {
                    when: formatRelativeTime(ticket.createdAt),
                  })}
                </p>
              ) : null
            }
            empty={
              <p className="text-muted-foreground py-12 text-center text-sm">
                {tCommon("no_messages_yet")}
              </p>
            }
            /* The customer spoke last and nothing else on this screen says who
               is coming, so say it here. Without it the thread is a void after
               every message, which is indistinguishable from the product being
               broken; without the other half of the rule it repeated a promise
               the transcript had already made. See `shouldAcknowledge`. */
            foot={
              shouldAcknowledge({
                thread: messages,
                closed,
                aiActive: Boolean(aiSession?.active),
                aiThinking,
                statusShown: showsStatusLine(aiSession),
              }) ? (
                /*
                 * `xl:hidden` is the whole of the direction's "one surface
                 * answers what happens next" rule, applied honestly.
                 *
                 * From xl up the pane is beside the thread and its assignee
                 * block already says who has this — a second sentence under the
                 * transcript is the duplication the rule is about. BELOW xl the
                 * pane is a sheet, i.e. not on screen, and deleting the footer
                 * outright would leave a customer on a phone — most of support
                 * traffic — with nothing at all after they send a message.
                 */
                <p className="text-muted-foreground border-border bg-muted/40 mx-auto max-w-md rounded-xl border px-3 py-2 text-center text-xs leading-relaxed xl:hidden">
                  {t("ack_received")}
                </p>
              ) : null
            }
          />

          {/* ---- composer ---------------------------------------------- */}
          <div className="border-border bg-card/40 shrink-0 border-t px-4 py-3 sm:px-6">
            <div className="mx-auto w-full max-w-3xl">
              {closed ? (
                <div className="flex items-center justify-center gap-2 py-2 text-sm">
                  <CheckCircle2 className="text-success size-4" />
                  <span className="text-muted-foreground">
                    {tCommon("this_ticket_has_been_resolved")}
                  </span>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* ---- "did that solve it?" ---------------------------
                      Shown when an AGENT spoke last, which is exactly what
                      `REPLIED` means (`PENDING`/`OPEN` are waiting on us,
                      `REPLIED` is waiting on them). That is the one moment the
                      question is worth asking — offering it while the customer
                      is mid-problem would read as being shown the door.

                      Two presses, because `index.post.ts` 403s on a closed
                      ticket: the customer cannot undo this by replying. */}
                  {ticket?.status === "REPLIED" ? (
                    <div className="border-border bg-muted/30 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-dashed px-3 py-2">
                      <span className="text-muted-foreground text-xs leading-relaxed">
                        {confirmClose ? t("close_confirm") : t("did_that_help")}
                      </span>
                      <span className="flex shrink-0 items-center gap-1.5">
                        {confirmClose ? (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-xs"
                              onClick={() => setConfirmClose(false)}
                            >
                              {tCommon("cancel")}
                            </Button>
                            <Button
                              size="sm"
                              className="h-7 px-2.5 text-xs"
                              disabled={closing}
                              onClick={handleClose}
                            >
                              {closing ? (
                                <Loader2 className="mr-1 size-3 animate-spin" />
                              ) : (
                                <CheckCircle2 className="mr-1 size-3" />
                              )}
                              {t("close_confirm_yes")}
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2.5 text-xs"
                            onClick={() => setConfirmClose(true)}
                          >
                            <CheckCircle2 className="mr-1 size-3" />
                            {t("mark_resolved")}
                          </Button>
                        )}
                      </span>
                    </div>
                  ) : null}

                  {/* The composer is one bordered field with the controls
                      inside it, rather than a textarea and two floating square
                      buttons beside it — the previous arrangement put a 48px
                      column of chrome next to every message the customer
                      wrote. */}
                  <div className="border-border bg-background focus-within:border-border-strong rounded-xl border transition-colors">
                    <Textarea
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      placeholder={`${tCommon("type_your_message")}…`}
                      className="max-h-48 min-h-[60px] resize-none border-0 bg-transparent px-3.5 py-3 shadow-none focus-visible:ring-0"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSend();
                        }
                      }}
                    />
                    <div className="flex items-center justify-between gap-2 px-2 pb-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
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
                      <div className="flex items-center gap-2">
                        <span className="text-subtle-foreground hidden text-[11px] sm:inline">
                          {t("press_enter_to_send_shift_enter_for_new_line")}
                        </span>
                        <Button
                          size="sm"
                          className="h-8 gap-1.5"
                          onClick={handleSend}
                          disabled={!draft.trim() || sending}
                        >
                          {sending ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <Send className="size-3.5" />
                          )}
                          {tCommon("send")}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* One row, and it only exists when it has something to
                      say. It used to render an empty spacer plus a status
                      label plus a button whatever the state was, which left
                      "Waiting for a person" and "Talk to a person" sitting
                      under the composer as two competing sentences about the
                      same thing. */}
                  {!wsConnected || ticketId ? (
                    <div className="flex flex-wrap items-center justify-end gap-3">
                      {!wsConnected ? (
                        <span className="text-warning-ink me-auto flex items-center gap-1.5 text-[11px] font-medium">
                          <span
                            className="bg-warning size-1.5 shrink-0 rounded-full"
                            aria-hidden
                          />
                          {t("using_fallback_mode")}
                        </span>
                      ) : null}
                      {ticketId ? (
                        <AiSessionPanel
                          ticketId={ticketId}
                          session={aiSession}
                          onRequested={refreshAiSession}
                          className="w-auto gap-3"
                        />
                      ) : null}
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ---- resolution pane ----------------------------------------
            ALWAYS MOUNTED. Collapsing hides it with `hidden`; it is never
            unmounted, because the assignee's name is asserted by the browser
            e2e at every viewport and an unmounted aside fails that while
            looking perfectly fine to a human.

            It is also still the page's single `<aside>`, for the same reason. */}
        <aside
          className={cn(
            "border-border bg-card/40 shrink-0 flex-col overflow-hidden border-s",
            /*
             * ONE FIXED WIDTH, ALWAYS — same rule as the operator inbox.
             *
             * This used to widen from 20rem to 27rem the moment the ticket
             * turned out to have a resolution, so the reading column jumped
             * sideways once the fetch landed and the loading skeleton was
             * drawing a frame that was about to be the wrong size. A pane whose
             * width is data-dependent cannot have a stable skeleton.
             */
            "w-96",
            railOpen ? "hidden xl:flex" : "hidden"
          )}
        >
          {paneFor(true)}
        </aside>

        {!railOpen ? (
          <CollapsedPaneRail
            model={resolution}
            onExpand={() => setRailOpen(true)}
          />
        ) : null}
      </div>

      <Sheet open={railSheet} onOpenChange={setRailSheet}>
        {/* `flex-col` + `overflow-hidden`, NOT `overflow-y-auto`: the pane owns
            its own scroller, and two nested scrollers put the tab bar out of
            reach — you would have to scroll the sheet to find the control that
            changes what the sheet is showing. */}
        <SheetContent
          side="right"
          className="flex w-full max-w-sm flex-col overflow-hidden p-0"
        >
          <SheetHeader className="border-border shrink-0 border-b px-4 py-3">
            <SheetTitle className="text-sm">
              {resolution.isEmpty ? tCommon("details") : tCommon("resolution")}
            </SheetTitle>
          </SheetHeader>
          {paneFor(false)}
        </SheetContent>
      </Sheet>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileUpload}
      />
    </EditorShell>
  );
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
