"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownWideNarrow,
  ArrowLeft,
  ArrowUpDown,
  ArrowUpNarrowWide,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Headphones,
  Inbox,
  Loader2,
  Paperclip,
  RefreshCw,
  Search,
  Send,
  Table2,
  UserRound,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { $fetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import { imageUploader } from "@/utils/upload";
import { EditorShell, EditorBarDivider } from "@/components/layout/editor-shell";
import { EditorThemeToggle } from "@/components/layout/editor-theme-toggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { useUserStore } from "@/store/user";
import { wsManager, ConnectionStatus } from "@/services/ws-manager";
import { MessageBubble } from "@/components/support/message-bubble";
import {
  toThread,
  type SupportThreadMessage,
} from "@/lib/support/messages";
import { AiSupportBridge } from "./ai-bridge";
import { CollapsedTicketRail, TicketPane, type TicketTab } from "./ticket-pane";
import type {
  DeskQueue,
  DeskRow,
  DeskTicket,
  QueueOrder,
  QueueScope,
  QueueSort,
} from "./types";

/**
 * The support desk console.
 *
 * ---------------------------------------------------------------------------
 * WHAT THIS REPLACED, AND WHY A TABLE WAS THE WRONG SHAPE
 * ---------------------------------------------------------------------------
 * This route was a KPI band over a paged DataTable of tickets. Every column in
 * it was a fact about a ticket; none of them was the conversation, so the only
 * thing an operator could do here was decide which row to LEAVE for — and every
 * answer cost a full page navigation to `[id]` and another one back.
 *
 * It is now the same three-pane shape as the AI console's Live Inbox: the queue,
 * the conversation, and the case. An operator arrives, reads the oldest thing
 * waiting on us, answers it, sets its status, and moves to the next one without
 * the screen ever changing.
 *
 * The table did not go away — it moved to `/admin/crm/support/tickets`, where it
 * keeps analytics, export, bulk close/reopen/assign and search across the whole
 * desk. A console shows the work in front of you; the table is the archive.
 *
 * ---------------------------------------------------------------------------
 * NO AI ON THIS SCREEN, DELIBERATELY
 * ---------------------------------------------------------------------------
 * No drafted replies, no retrieval evidence, no confidence meters, no "teach
 * from this ticket". Those are the paid add-on's, they need data this route does
 * not have, and half of them would 403 for an operator who has not bought it.
 * The single place this console admits the add-on exists is `AiSupportBridge` at
 * the foot of the queue — which is a door when it is installed and a description
 * when it is not.
 *
 * AI-AUTHORED MESSAGES STILL RENDER AS SUCH. If the add-on is installed and has
 * answered a ticket, its replies arrive in this thread and `MessageBubble` draws
 * them with the AI badge and a bot glyph. That is a disclosure requirement, not
 * a feature, and it is why the thread is rendered through the shared bubble
 * rather than a local one.
 *
 * ---------------------------------------------------------------------------
 * IT OWNS THE VIEWPORT
 * ---------------------------------------------------------------------------
 * `/admin/crm/support` is on the admin layout's `CHROMELESS` list, so there is
 * no site header and no footer — and therefore NO `pt-header` either. Hiding
 * chrome without reclaiming its space is the documented failure mode. The bar
 * carries the way out, because removing the navbar removes every other one.
 */

/** The rail on the left edge of a queue row. */
const ROW_RAIL: Record<string, string> = {
  waiting: "bg-warning",
  replied: "bg-info/60",
  closed: "bg-border",
  idle: "bg-border",
};

const SCOPES: QueueScope[] = ["waiting", "mine", "unassigned", "open", "closed"];

const SORTS: QueueSort[] = [
  "queue",
  "activity",
  "created",
  "importance",
  "status",
  "subject",
  "customer",
  "response",
  "satisfaction",
];

const PAGE_SIZES = [25, 50, 100];

/**
 * Sort, direction and page size are a WORKING HABIT, not a per-visit choice.
 *
 * An operator whose desk triages by priority rather than by wait should not
 * have to say so again after every reload. The scope is deliberately NOT
 * persisted: coming back tomorrow to a queue still pinned to "Closed" reads as
 * an empty desk.
 */
const PREFS_KEY = "crm-support-queue-prefs";

interface QueuePrefs {
  sort: QueueSort;
  order: QueueOrder;
  perPage: number;
}

const DEFAULT_PREFS: QueuePrefs = { sort: "queue", order: "asc", perPage: 50 };

function readPrefs(): QueuePrefs {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(PREFS_KEY) || "{}");
    return {
      sort: SORTS.includes(parsed.sort) ? parsed.sort : DEFAULT_PREFS.sort,
      order: parsed.order === "desc" ? "desc" : "asc",
      perPage: PAGE_SIZES.includes(parsed.perPage)
        ? parsed.perPage
        : DEFAULT_PREFS.perPage,
    };
  } catch {
    // A corrupt entry must not take the console down with it; localStorage also
    // throws outright in some privacy modes.
    return DEFAULT_PREFS;
  }
}

/** Each sort's natural direction, applied when the operator picks it. */
const NATURAL_ASC = new Set<QueueSort>([
  "queue",
  "importance",
  "status",
  "subject",
  "customer",
  "response",
]);

export default function SupportDeskClient() {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  const { toast } = useToast();

  const [rows, setRows] = useState<DeskRow[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [ticket, setTicket] = useState<DeskTicket | null>(null);
  const [thread, setThread] = useState<SupportThreadMessage[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [scope, setScope] = useState<QueueScope>("waiting");
  const [query, setQuery] = useState("");
  /* What the SERVER is searching on. Separate from `query` because it lags a
     keystroke by a quarter second — the queue is paged, so the search cannot be
     a client-side filter over whatever page happens to be loaded. */
  const [search, setSearch] = useState("");
  const [prefs, setPrefs] = useState<QueuePrefs>(DEFAULT_PREFS);
  /* Nothing is fetched until the stored preferences have been read. Reading
     localStorage in a `useState` initialiser would run during SSR too, where it
     does not exist, and hydrate a queue sorted differently from the server's. */
  const [prefsReady, setPrefsReady] = useState(false);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  /** The last queue request was refused. See `loadList`. */
  const [listError, setListError] = useState(false);
  const [counts, setCounts] = useState<DeskQueue["counts"]>({
    open: 0,
    waiting: 0,
    mine: 0,
    unassigned: 0,
    closed: 0,
    all: 0,
  });
  const [draft, setDraft] = useState("");
  const [uploading, setUploading] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [paneTab, setPaneTab] = useState<TicketTab>("case");
  /** The pane is a preference, so it persists for the session, not per ticket. */
  const [paneOpen, setPaneOpen] = useState(true);
  /**
   * The same pane below `xl`, where there is no room for a third column.
   *
   * A separate piece of state on purpose: `paneOpen` is a persistent LAYOUT
   * preference and this is a transient overlay. Driving both from one boolean
   * meant opening the details on a laptop silently collapsed the column on the
   * desktop the operator moved to next.
   */
  const [sheetOpen, setSheetOpen] = useState(false);

  const threadRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  /** Discards a detail response whose ticket is no longer open. See `loadDetail`. */
  const detailGenerationRef = useRef(0);
  /** Mirrors `selected` so `selectTicket` can compare without a dependency. */
  const selectedRef = useRef<string | null>(null);
  /**
   * A J/K press that ran off the end of the page and turned it.
   *
   * The next page arrives asynchronously, so the row to land on cannot be
   * chosen at keypress time — this records WHICH end to land on and `loadList`
   * honours it when the rows come back.
   */
  const edgeJumpRef = useRef<null | "first" | "last">(null);
  /** A deep link must survive the first list load, which lands after it. */
  const deepLinkRef = useRef(false);

  const { user, hasPermission } = useUserStore();
  // Hoisted out of the dependency arrays below: an optional-chained member
  // expression in a `useMemo` dep is what the React compiler cannot preserve,
  // and it drops the memoisation silently rather than failing.
  const userId = user?.id;

  /*
   * Capability-gated controls are HIDDEN, not disabled.
   *
   * The route is gated on `access.support.ticket` so desk agents reach the
   * queue, but every write below is `edit.support.ticket`. Rendering them
   * regardless gives a view-only agent a row of buttons that 403 — which teaches
   * them the product is broken rather than that they lack the permission.
   */
  const can = useMemo(
    () => ({
      manage: hasPermission("edit.support.ticket"),
      viewUser: hasPermission("view.user"),
    }),
    [hasPermission]
  );

  /* ---------------------------------------------------------------- loading - */

  /**
   * Move to another conversation.
   *
   * Clears the previous one SYNCHRONOUSLY. Leaving `ticket` and `thread` in
   * place for the length of the fetch means the screen shows one conversation
   * while `selected` — the id every action posts to — is already the next, and a
   * Send in that window puts one customer's reply on another customer's ticket.
   *
   * Declared ABOVE `loadList` because that callback lists it as a dependency,
   * to land a page-turning J/K press on the row at the far end.
   */
  const selectTicket = useCallback((id: string) => {
    if (selectedRef.current === id) return;
    selectedRef.current = id;
    setTicket(null);
    setThread([]);
    setDraft("");
    setSelected(id);
  }, []);

  /**
   * Fetch one page of the queue.
   *
   * ---------------------------------------------------------------------------
   * THE SCOPE, THE SEARCH AND THE SORT ALL BELONG TO THE SERVER NOW
   * ---------------------------------------------------------------------------
   * Four of the five tabs used to be views of one fetched set, filtered in the
   * browser, and the search was a `.includes()` over the same rows. That is only
   * correct while the whole desk fits in one response. It did not: the endpoint
   * returned sixty tickets chosen by `updatedAt DESC`, so "Waiting" meant "the
   * waiting ones among the sixty most recently touched" — and the queue's own
   * order is oldest-wait-first, which means the rows it exists to show first
   * were the ones most likely to have been cut.
   */
  const loadList = useCallback(async () => {
    if (!prefsReady) return;

    const { data, error } = await $fetch<DeskQueue>({
      url: "/api/admin/crm/support/inbox",
      params: {
        scope,
        search,
        sort: prefs.sort,
        order: prefs.order,
        page,
        perPage: prefs.perPage,
      },
      silent: true,
    });

    /*
     * A REFUSED SEARCH MUST NOT LOOK LIKE ONE THAT MATCHED NOTHING — OR, WORSE,
     * LIKE ONE THAT MATCHED THE ROWS ALREADY ON SCREEN
     * -------------------------------------------------------------------------
     * `backend/src/handler/Request.ts` screens every query parameter on every
     * route for injection patterns before a handler runs, and one of them is a
     * SQL verb followed by a SQL keyword. Ordinary desk phrasing hits it —
     * "delete my withdrawal from history" is refused — and the refusal is a 400
     * that surfaces as a 500. The request is `silent`, so without this branch
     * the rail keeps the PREVIOUS query's rows under the new search text.
     */
    if (error) {
      setListError(true);
      setRows([]);
      setTotal(0);
      setPages(1);
      edgeJumpRef.current = null;
      setLoadingList(false);
      return;
    }

    if (data?.items) {
      setListError(false);
      setRows(data.items);
      setCounts(data.counts);
      setTotal(data.total);
      setPages(data.pages);
      // The server clamps a page that no longer exists and says which one it
      // served. Adopting it keeps the pager from reading "9 of 2".
      if (data.page !== page) setPage(data.page);

      // Consumed whether or not it can be honoured. Left set — the page turn
      // raced and came back empty — it would fire on the next 20s poll and move
      // the operator's selection out from under them minutes later.
      const jump = edgeJumpRef.current;
      edgeJumpRef.current = null;
      if (jump && data.items.length) {
        selectTicket(
          (jump === "first" ? data.items[0] : data.items[data.items.length - 1]).id
        );
      } else if (!deepLinkRef.current) {
        // Keep the ref in step with the auto-selection below, or the first
        // `selectTicket` call compares against a stale null and re-clears.
        if (!selectedRef.current && data.items[0]?.id) {
          selectedRef.current = data.items[0].id;
        }
        setSelected((current) => current ?? data.items[0]?.id ?? null);
      }
    }
    setLoadingList(false);
  }, [prefsReady, scope, search, prefs, page, selectTicket]);

  /**
   * The polling timer must not restart every time a control moves.
   *
   * `loadList` is rebuilt on every sort, page and keystroke, so an interval
   * keyed on it would be torn down and recreated on each one — a fast typist
   * would never reach the twenty seconds, and the queue would stop refreshing
   * itself for as long as they kept typing.
   */
  const loadListRef = useRef(loadList);
  useEffect(() => {
    loadListRef.current = loadList;
  }, [loadList]);

  /**
   * Load one conversation.
   *
   * ---------------------------------------------------------------------------
   * THE GENERATION COUNTER IS NOT DEFENSIVE PROGRAMMING
   * ---------------------------------------------------------------------------
   * Two fetches for two different tickets can be in flight at once — j/k through
   * the queue does it in a second — and they can resolve out of order. Without
   * the stamp the slower, older response wins and paints a conversation the
   * operator is no longer looking at, while `selected` says otherwise. That
   * disagreement is what the Send button would then post into.
   */
  const loadDetail = useCallback(async (id: string) => {
    const generation = ++detailGenerationRef.current;
    setLoadingDetail(true);
    const { data } = await $fetch<DeskTicket>({
      url: `/api/admin/crm/support/ticket/${id}`,
      silent: true,
    });
    // A response for a ticket already navigated away from must not paint, and
    // must not clear the newer request's loading state either.
    if (generation !== detailGenerationRef.current) return;
    if (data) {
      setTicket(data);
      // ONE reader for the column, shared with every customer surface. The
      // three on-disk shapes and every AI field (`ai`, `turnId`, `citations`)
      // are handled there; a local `.map()` here is exactly how the AI badge
      // once vanished from one screen and not the others.
      setThread(toThread(data.messages));
    }
    setLoadingDetail(false);
  }, []);

  /* Deep link. Read once, after hydration — reading `window.location` during
     render would make the server and client markup disagree over which row is
     highlighted. `deepLinkRef` is what stops the first list response from
     auto-selecting row one over it: the pasted ticket is frequently NOT on page
     one of the default queue, so "is `selected` already set" is no longer a
     sufficient guard now that the list is paged. */
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("ticket");
    if (!id) return;
    deepLinkRef.current = true;
    selectedRef.current = id;
    setSelected(id);
  }, []);

  /** The operator's stored sort, read once the browser is actually there. */
  useEffect(() => {
    setPrefs(readPrefs());
    setPrefsReady(true);
  }, []);

  const savePrefs = useCallback((next: Partial<QueuePrefs>) => {
    setPrefs((current) => {
      const merged = { ...current, ...next };
      try {
        window.localStorage.setItem(PREFS_KEY, JSON.stringify(merged));
      } catch {
        // Persisting is a nicety. A private-mode browser that refuses must
        // still get the sort it just asked for.
      }
      return merged;
    });
    // Any change to what the queue contains or how it is ordered invalidates
    // the page number: row 51 under one sort is a different ticket under
    // another. Reset here rather than in an effect, so the two land in one
    // render and no request is sent for a page that is about to change.
    setPage(1);
    edgeJumpRef.current = null;
  }, []);

  const changeScope = useCallback((next: QueueScope) => {
    setScope(next);
    setPage(1);
    edgeJumpRef.current = null;
  }, []);

  /** A quarter second: long enough to swallow a word, short enough to feel typed. */
  useEffect(() => {
    const next = query.trim();
    if (next === search) return;
    const timer = setTimeout(() => {
      setSearch(next);
      setPage(1);
      edgeJumpRef.current = null;
    }, 250);
    return () => clearTimeout(timer);
  }, [query, search]);

  /* …and written back, so the URL in the address bar is the conversation on
     screen and can be pasted to a colleague. `replaceState` rather than the
     router: this is the same screen, not a navigation, and pushing history
     entries would make Back walk the queue one ticket at a time. */
  useEffect(() => {
    if (!selected) return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("ticket") === selected) return;
    url.searchParams.set("ticket", selected);
    window.history.replaceState(null, "", url.toString());
  }, [selected]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  useEffect(() => {
    // Poll rather than subscribe: the queue is a list of conversations, not a
    // live transcript, and a 20s refresh is cheaper than holding a socket open
    // on every agent's browser for a list that changes a few times an hour. The
    // OPEN conversation is a socket — see below.
    const timer = setInterval(() => loadListRef.current(), 20_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (selected) loadDetail(selected);
  }, [selected, loadDetail]);

  /**
   * The open conversation, live.
   *
   * The backend broadcasts `reply` and `update` on `ticket-{id}` for EVERY
   * ticket, not just live chats — `broadcastSupportReply` runs at the end of the
   * admin reply route and the customer's. The old detail page subscribed only
   * when `type === "LIVE"`, so an agent reading a normal ticket never saw the
   * customer answer and had to reload to find out.
   */
  useEffect(() => {
    if (!selected) return;

    const connectionId = `desk-${selected}`;
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const isDev = process.env.NODE_ENV === "development";
    const backendPort = process.env.NEXT_PUBLIC_BACKEND_PORT || "4000";
    // In development connect straight to the backend: Next's rewrites do not
    // proxy a websocket upgrade.
    const host = isDev
      ? `${window.location.hostname}:${backendPort}`
      : window.location.host;
    const wsUrl = `${protocol}//${host}/api/user/support/ticket`;

    wsManager.connect(wsUrl, connectionId);

    const onStatus = (status: ConnectionStatus) => {
      setWsConnected(status === ConnectionStatus.CONNECTED);
      if (status === ConnectionStatus.CONNECTED) {
        wsManager.sendMessage(
          { action: "SUBSCRIBE", payload: { id: selected } },
          connectionId
        );
      }
    };

    const onFrame = (frame: any) => {
      if (!frame?.method) return;
      // `payload`, not `data` — every writer broadcasts under `payload`.
      const payload = frame.payload || {};

      if (frame.method === "reply" && payload.message) {
        // Refetch rather than merge one message: the row underneath carries the
        // status and the assignment the same write changed, and a thread that
        // has moved on beside a header that has not is a worse lie than a
        // half-second wait.
        loadDetail(selected);
        // Through the ref, NOT the callback. `loadList` is rebuilt whenever the
        // sort, page or search changes, and listing it here would tear the
        // socket down and re-subscribe on each — dropping frames across the gap
        // for a change that has nothing to do with this conversation.
        loadListRef.current();
        return;
      }
      if (frame.method === "update" || frame.method === "ai.handover") {
        loadDetail(selected);
        loadListRef.current();
      }
    };

    wsManager.addStatusListener(onStatus, connectionId);
    wsManager.subscribe(`ticket-${selected}`, onFrame, connectionId);

    return () => {
      if (wsManager.getStatus(connectionId) === ConnectionStatus.CONNECTED) {
        wsManager.sendMessage(
          { action: "UNSUBSCRIBE", payload: { id: selected } },
          connectionId
        );
      }
      wsManager.removeStatusListener(onStatus, connectionId);
      wsManager.unsubscribe(`ticket-${selected}`, onFrame, connectionId);
      wsManager.close(connectionId);
      setWsConnected(false);
    };
  }, [selected, loadDetail]);

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight });
  }, [thread.length, selected]);

  /* ---------------------------------------------------------------- actions - */

  /**
   * The conversation on screen is the conversation the actions will hit.
   *
   * False for the whole of the fetch after a selection change, which is exactly
   * the window in which Send would otherwise post the previous customer's draft.
   */
  const ready = Boolean(ticket && ticket.id === selected);
  const closed = ticket?.status === "CLOSED";

  const desk = useCallback(
    async (
      label: string,
      url: string,
      body: Record<string, unknown>,
      okTitle: string
    ) => {
      if (!selected) return;
      setBusy(label);
      const { error } = await $fetch({ url, method: "PUT", body, silent: true });
      setBusy(null);
      if (error) {
        toast({
          title: tCommon("action_failed"),
          description: String(error),
          variant: "destructive",
        });
        return;
      }
      toast({ title: okTitle });
      // The queue row carries status, priority and the assignee too, so both
      // have to move.
      await Promise.all([loadList(), loadDetail(selected)]);
    },
    [selected, toast, t, loadList, loadDetail]
  );

  const setStatus = (status: string) =>
    desk(
      "status",
      `/api/admin/crm/support/ticket/${selected}/status`,
      { status },
      status === "CLOSED" ? tCommon("ticket_closed") : tCommon("status_updated")
    );

  const setPriority = (importance: string) =>
    desk(
      "priority",
      `/api/admin/crm/support/ticket/${selected}`,
      { importance },
      tCommon("priority_updated")
    );

  const setAssignee = (agentId: string | null) =>
    desk(
      "assign",
      `/api/admin/crm/support/ticket/${selected}/assign`,
      { agentId },
      agentId ? t("assigned_to_you") : t("ticket_unassigned")
    );

  const send = async (text: string, attachment?: string) => {
    const body = text.trim();
    if ((!body && !attachment) || !selected || !ready) return;

    // Echoed locally so the agent sees their own sentence land immediately, and
    // reconciled by the refetch the server's broadcast triggers.
    const echo: SupportThreadMessage = {
      id: `pending-${Date.now()}`,
      type: "agent",
      text: body || "[Image]",
      time: new Date().toISOString(),
      userId: user?.id,
      senderName:
        [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
        tCommon("support"),
      ...(attachment ? { attachment } : {}),
      pending: true,
    };
    setThread((current) => [...current, echo]);
    setDraft("");
    setBusy("send");

    const { data, error } = await $fetch<{ data?: DeskTicket }>({
      url: `/api/admin/crm/support/ticket/${selected}/reply`,
      method: "POST",
      body: {
        type: "agent",
        time: echo.time,
        userId: user?.id || "",
        // The route requires non-empty text, and an image-only reply is a real
        // thing an agent sends.
        text: body || "[Image]",
        attachment: attachment ?? null,
      },
      silent: true,
    });
    setBusy(null);

    if (error) {
      setThread((current) => current.filter((m) => m.id !== echo.id));
      if (!attachment) setDraft(body);
      toast({
        title: t("message_failed"),
        description: String(error),
        variant: "destructive",
      });
      return;
    }

    // A normal ticket holds no socket on the CUSTOMER's side, but this screen
    // does — and the reply route's own response already carries the ticket as it
    // now stands (status REPLIED, the auto-assignment it just made). Taking it
    // means the pane and the composer are correct before any frame arrives.
    const updated = data?.data;
    if (updated) {
      setTicket((current) => (current ? { ...current, ...updated } : current));
      setThread(toThread(updated.messages));
    }
    loadList();
  };

  const onUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (fileRef.current) fileRef.current.value = "";
    if (!file || !selected) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: tCommon("invalid_file_type"),
        description: tCommon("please_select_an_image_file"),
        variant: "destructive",
      });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: tCommon("file_too_large"),
        description: tCommon("file_size_must_be_less_than_10mb"),
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    const result = await imageUploader({
      file,
      dir: "support-attachments",
      size: { maxWidth: 1200, maxHeight: 900 },
    });
    setUploading(false);

    if (!result.success || !result.url) {
      toast({
        title: tCommon("upload_failed"),
        description: result.error || tCommon("failed_to_upload_image"),
        variant: "destructive",
      });
      return;
    }
    await send(draft, result.url);
  };

  /* ----------------------------------------------------------------- queue - */

  /*
   * The tabs, their tallies and the sort menu.
   *
   * Every label is a LITERAL `t(...)` call. A computed key — `t(\`sort_${key}\`)`
   * — is invisible to the build-time key extractor, which does not fail on it:
   * the string is simply never emitted into any locale file and every language
   * but English renders the raw key.
   */
  const scopeLabels = useMemo<Record<QueueScope, string>>(
    () => ({
      waiting: tCommon("waiting"),
      mine: tCommon("mine"),
      unassigned: tCommon("free"),
      open: tCommon("open"),
      closed: tCommon("closed"),
    }),
    [t, tCommon]
  );

  const sortLabels = useMemo<Record<QueueSort, string>>(
    () => ({
      queue: t("queue_sort_queue"),
      activity: t("queue_sort_activity"),
      created: tCommon("ticket_created"),
      importance: tCommon("importance"),
      status: tCommon("status"),
      subject: tCommon("subject"),
      customer: tCommon("customer"),
      response: tCommon("response_time"),
      satisfaction: tCommon("rating"),
    }),
    [t, tCommon]
  );

  const firstOnPage = total === 0 ? 0 : (page - 1) * prefs.perPage + 1;
  const lastOnPage = Math.min(total, (page - 1) * prefs.perPage + rows.length);

  /*
   * J / K through the queue, ACROSS pages.
   *
   * A queue worked in sequence that stops dead at the last row of a page has a
   * page-sized ceiling, so running off either end turns the page and lands on
   * the row at the far edge — `edgeJumpRef` carries which edge, because the rows
   * to choose from do not exist yet at keypress time. Suppressed while a field
   * has focus, or "j" would be unusable in the composer and the search box.
   */
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const el = event.target as HTMLElement | null;
      const typing =
        el?.tagName === "INPUT" ||
        el?.tagName === "TEXTAREA" ||
        el?.isContentEditable;
      if (typing || event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key !== "j" && event.key !== "k") return;
      if (!rows.length) return;

      event.preventDefault();
      const index = rows.findIndex((r) => r.id === selected);
      // The open ticket is on another page — a deep link, or the scope changed
      // under it. Either key means "start here".
      if (index < 0) {
        selectTicket(rows[0].id);
        return;
      }

      if (event.key === "j") {
        if (index >= rows.length - 1) {
          if (page >= pages) return;
          edgeJumpRef.current = "first";
          setPage(page + 1);
          return;
        }
        selectTicket(rows[index + 1].id);
        return;
      }

      if (index === 0) {
        if (page <= 1) return;
        edgeJumpRef.current = "last";
        setPage(page - 1);
        return;
      }
      selectTicket(rows[index - 1].id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // `selectTicket` is a stable `useCallback([])`, so listing it costs nothing
    // and keeps the rule honest rather than silenced.
  }, [rows, selected, selectTicket, page, pages]);

  const canSend = busy === null && !uploading && ready && !closed;
  const customerName =
    [ticket?.user?.firstName, ticket?.user?.lastName].filter(Boolean).join(" ") ||
    tCommon("customer");

  return (
    <EditorShell
      /* The body is the only thing on the screen and it must NOT scroll — the
         three panes each own their own scroller. `EditorShell` defaults its body
         to `overflow-y-auto`, which would put a second, outer scrollbar around a
         layout that already fits exactly. */
      bodyClassName="overflow-hidden"
      bar={
        <>
          {/* The way out. Without the site nav this is the only one. */}
          <Button
            asChild
            size="icon"
            variant="ghost"
            className="size-7 shrink-0"
            aria-label={t("back_to_admin")}
          >
            <Link href="/admin">
              <ArrowLeft className="size-4 rtl:rotate-180" />
            </Link>
          </Button>
          <EditorBarDivider />
          <span className="bg-primary/10 grid size-6 shrink-0 place-items-center rounded-md">
            <Headphones className="text-primary size-3.5" />
          </span>
          <div className="flex min-w-0 items-baseline gap-2">
            <p className="truncate text-sm font-semibold">
              {tCommon("support_desk")}
            </p>
            <p className="text-muted-foreground hidden truncate text-[11px] md:block">
              {t("support_desk_subtitle")}
            </p>
          </div>
        </>
      }
      actions={
        <>
          {/* The live-poll indicator. A console that silently refreshes every 20s
              otherwise looks frozen, and an agent reloads the page to be sure —
              which is the exact behaviour polling exists to avoid. */}
          <span className="text-subtle-foreground hidden items-center gap-1.5 font-mono text-[10px] tracking-wider uppercase sm:flex">
            <span className="relative flex size-1.5">
              <span className="bg-success/60 absolute inline-flex size-full animate-ping rounded-full" />
              <span className="bg-success relative inline-flex size-1.5 rounded-full" />
            </span>
            {tCommon("live")}
          </span>
          <span className="text-subtle-foreground hidden font-mono text-[10px] tracking-wider uppercase lg:inline">
            {t("queue_keys_hint")}
          </span>

          {/* The archive. Everything this console deliberately does not carry —
              closed tickets in bulk, export, analytics, search across the whole
              desk — is one click away rather than gone. */}
          <Button
            asChild
            size="sm"
            variant="ghost"
            className="h-7 gap-1.5 text-[11px]"
          >
            <Link href="/admin/crm/support/tickets">
              <Table2 className="size-3.5" />
              <span className="hidden sm:inline">{t("all_tickets")}</span>
            </Link>
          </Button>

          {/* Chromeless route: the site header, and with it the theme control, is
              suppressed here. An operator works this screen all day. */}
          <EditorThemeToggle className="size-7" />

          <Button
            size="icon"
            variant="ghost"
            className="size-7"
            onClick={loadList}
            aria-label={tCommon("refresh")}
          >
            <RefreshCw className="size-3.5" />
          </Button>
        </>
      }
    >
      <div className="flex h-full flex-col">
        {/* ---- the three panes ------------------------------------------
            FLEX, NOT GRID. A fixed `lg:grid-cols-[20rem_1fr_24rem]` cannot
            express a pane that collapses to a 44px rail — the third column
            keeps its width whatever is in it. Both the collapse and the
            below-lg master/detail are width transitions on siblings, which
            flex does without rewriting the column template per breakpoint. */}
        <div className="flex min-h-0 flex-1">
          {/* ---- pane 1: the queue ---------------------------------------- */}
          <aside
            className={cn(
              "border-border bg-card/40 min-h-0 w-full shrink-0 flex-col lg:flex lg:w-80 lg:border-e",
              // Below lg this is a master/detail: one pane at a time, or the
              // queue takes the full width and squeezes the conversation to
              // zero, which is a screen with a scrollbar and nothing in it.
              selected ? "hidden" : "flex"
            )}
          >
            <div className="border-border shrink-0 space-y-2 border-b px-3 py-2.5">
              {/* EVERY tab now carries a count, Closed included. They come
                  from one aggregate over the whole desk rather than from the
                  fetched page, so Closed is no longer the one tab that could
                  not say how much was behind it. */}
              <div className="flex flex-wrap items-center gap-1">
                {SCOPES.map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => changeScope(id)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium transition-colors",
                      scope === id
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    {scopeLabels[id]}
                    <span
                      className={cn(
                        "font-mono tabular-nums",
                        id === "waiting" && counts.waiting > 0 && scope !== id
                          ? "text-warning-ink"
                          : "opacity-60"
                      )}
                    >
                      {counts[id]}
                    </span>
                  </button>
                ))}
              </div>

              <div className="relative">
                <Search className="text-muted-foreground pointer-events-none absolute start-2.5 top-1/2 size-3.5 -translate-y-1/2" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={t("search_this_queue")}
                  className="h-8 ps-8 text-xs"
                  aria-label={t("search_this_queue")}
                />
              </div>

              {/* ---- how the queue is ordered ---------------------------
                  Not decoration and not a preference panel: the sort decides
                  which tickets are ON the page at all, because the page is a
                  window onto an ordered set and the ordering happens in SQL.
                  An operator who cannot see it cannot know what the window is
                  showing them. */}
              <div className="flex items-center gap-1">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-muted-foreground hover:text-foreground h-7 gap-1.5 px-2 text-[11px] font-medium"
                      title={tCommon("sort_by")}
                    >
                      <ArrowUpDown className="size-3" />
                      {sortLabels[prefs.sort]}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56">
                    <DropdownMenuLabel className="text-muted-foreground text-[11px] uppercase tracking-wider">
                      {tCommon("sort_by")}
                    </DropdownMenuLabel>
                    <DropdownMenuRadioGroup
                      value={prefs.sort}
                      onValueChange={(value) =>
                        savePrefs({
                          sort: value as QueueSort,
                          // Each key gets its own natural direction on the way
                          // in. Carrying "ascending" over from Queue onto
                          // Satisfaction would open on the worst-rated tickets,
                          // and onto Ticket created on the oldest — neither is
                          // the question being asked.
                          order: NATURAL_ASC.has(value as QueueSort)
                            ? "asc"
                            : "desc",
                        })
                      }
                    >
                      {SORTS.map((key) => (
                        <DropdownMenuRadioItem
                          key={key}
                          value={key}
                          className="text-xs"
                        >
                          {sortLabels[key]}
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel className="text-muted-foreground text-[11px] uppercase tracking-wider">
                      {tCommon("rows_per_page")}
                    </DropdownMenuLabel>
                    <DropdownMenuRadioGroup
                      value={String(prefs.perPage)}
                      onValueChange={(value) =>
                        savePrefs({ perPage: Number(value) })
                      }
                    >
                      {PAGE_SIZES.map((size) => (
                        <DropdownMenuRadioItem
                          key={size}
                          value={String(size)}
                          className="font-mono text-xs tabular-nums"
                        >
                          {size}
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button
                  size="icon"
                  variant="ghost"
                  className="text-muted-foreground hover:text-foreground size-7"
                  onClick={() =>
                    savePrefs({ order: prefs.order === "asc" ? "desc" : "asc" })
                  }
                  title={tCommon("sort_order")}
                  aria-label={
                    prefs.order === "asc"
                      ? tCommon("ascending")
                      : tCommon("descending")
                  }
                >
                  {prefs.order === "asc" ? (
                    <ArrowUpNarrowWide className="size-3.5" />
                  ) : (
                    <ArrowDownWideNarrow className="size-3.5" />
                  )}
                </Button>

                {/* The default ordering is a policy, and it is the one question
                    an operator asks of a queue they did not sort themselves:
                    why is THAT one at the top. */}
                {prefs.sort === "queue" ? (
                  <span
                    className="text-subtle-foreground ms-auto truncate text-[10px]"
                    title={t("queue_sort_queue_help")}
                  >
                    {tCommon("queue_sort_queue_hint")}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {loadingList ? (
                <div className="space-y-2 p-3">
                  {[0, 1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 rounded-lg" />
                  ))}
                </div>
              ) : rows.length === 0 ? (
                <div className="p-6 text-center">
                  {/* An empty scope is not one message. "Nothing waiting" is
                      true of an empty queue and a lie about an empty Mine,
                      which means only that nobody has handed anything to THIS
                      operator. */}
                  {listError ? (
                    <p className="text-warning-ink text-xs">
                      {tCommon("queue_search_refused")}
                    </p>
                  ) : search ? (
                    <p className="text-muted-foreground text-xs">{t("no_match")}</p>
                  ) : scope === "closed" ? (
                    <p className="text-muted-foreground text-xs">
                      {t("no_closed_tickets")}
                    </p>
                  ) : scope === "mine" ? (
                    <p className="text-muted-foreground text-xs">
                      {t("queue_empty_mine")}
                    </p>
                  ) : (
                    <>
                      <CheckCircle2 className="text-muted-foreground/50 mx-auto mb-2 size-6" />
                      <p className="text-muted-foreground text-xs">
                        {t("queue_empty")}
                      </p>
                    </>
                  )}
                </div>
              ) : (
                rows.map((row) => (
                  <QueueRow
                    key={row.id}
                    row={row}
                    active={selected === row.id}
                    mine={Boolean(row.agentId && row.agentId === userId)}
                    onSelect={() => selectTicket(row.id)}
                  />
                ))
              )}
            </div>

            {/* ---- the pager -------------------------------------------
                OUTSIDE the scroller, so it is reachable at a hundred rows a
                page without scrolling to the bottom to find out there is a
                bottom. It also answers the question the queue could not answer
                at all before: how many tickets are there, really. The old
                endpoint could only say `capped: true` — "there is more desk
                than this, and I cannot tell you how much". */}
            {!loadingList && total > 0 ? (
              <div className="border-border flex shrink-0 items-center justify-between gap-2 border-t px-3 py-1.5">
                <span className="text-subtle-foreground truncate font-mono text-[10px] tabular-nums">
                  {tCommon("queue_range", { from: firstOnPage, to: lastOnPage, total })}
                </span>
                {pages > 1 ? (
                  <div className="flex shrink-0 items-center gap-0.5">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-6"
                      disabled={page <= 1}
                      onClick={() => setPage(page - 1)}
                      aria-label={tCommon("previous")}
                    >
                      <ChevronLeft className="size-3.5 rtl:rotate-180" />
                    </Button>
                    <span
                      className="text-muted-foreground font-mono text-[10px] tabular-nums"
                      title={tCommon("page")}
                    >
                      {page}/{pages}
                    </span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-6"
                      disabled={page >= pages}
                      onClick={() => setPage(page + 1)}
                      aria-label={tCommon("next")}
                    >
                      <ChevronRight className="size-3.5 rtl:rotate-180" />
                    </Button>
                  </div>
                ) : null}
              </div>
            ) : null}

            {/* The one block on this console that knows the add-on exists. */}
            <div className="border-border shrink-0 border-t p-2">
              <AiSupportBridge />
            </div>
          </aside>

          {/* ---- pane 2: the conversation --------------------------------- */}
          <section
            className={cn(
              "min-h-0 min-w-0 flex-1 flex-col",
              selected ? "flex" : "hidden lg:flex"
            )}
          >
            {!selected ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
                <span className="bg-muted grid size-12 place-items-center rounded-2xl">
                  <Inbox className="text-muted-foreground size-5" />
                </span>
                <p className="text-sm font-medium">{tCommon("select_conversation")}</p>
                <p className="text-muted-foreground max-w-xs text-xs leading-relaxed">
                  {t("select_a_conversation_help")}
                </p>
              </div>
            ) : (
              <>
                <header className="border-border bg-card/40 flex shrink-0 flex-wrap items-center justify-between gap-2 border-b px-3 py-2 lg:px-4">
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    {/* Below lg the queue is not on screen; without this there
                        is no way back to it. */}
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-7 shrink-0 lg:hidden"
                      aria-label={t("back_to_queue")}
                      onClick={() => {
                        selectedRef.current = null;
                        setSelected(null);
                      }}
                    >
                      <ArrowLeft className="size-4 rtl:rotate-180" />
                    </Button>
                    <Avatar className="size-7 shrink-0">
                      {ticket?.user?.avatar ? (
                        <AvatarImage src={ticket.user.avatar} alt={customerName} />
                      ) : null}
                      <AvatarFallback className="text-[10px]">
                        {customerName.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {ticket?.subject || "…"}
                      </p>
                      <p className="text-muted-foreground truncate text-[11px]">
                        {customerName}
                        {ticket?.user?.email ? ` · ${ticket.user.email}` : ""}
                        {ticket?.status ? ` · ${ticket.status}` : ""}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 gap-1.5">
                    {/* The pane holds the full set. This is the one verb an
                        operator reaches for often enough to deserve a place
                        beside the conversation itself. */}
                    {can.manage && ready ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy !== null}
                        onClick={() => setStatus(closed ? "OPEN" : "CLOSED")}
                      >
                        {busy === "status" ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : null}
                        {closed ? t("reopen_ticket") : tCommon("close_ticket")}
                      </Button>
                    ) : null}
                    {/* Below `xl` the case is an overlay, not a column: a 20rem
                        queue plus a 24rem pane leaves a laptop about 300px for
                        the conversation, which is not a conversation. */}
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-7 xl:hidden"
                      aria-label={tCommon("ticket_details")}
                      onClick={() => setSheetOpen(true)}
                    >
                      <UserRound className="size-4" />
                    </Button>
                  </div>
                </header>

                <div
                  ref={threadRef}
                  className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-5 lg:px-4"
                >
                  {loadingDetail && !ticket ? (
                    <div className="space-y-3">
                      {[0, 1, 2].map((i) => (
                        <Skeleton key={i} className="h-16 rounded-lg" />
                      ))}
                    </div>
                  ) : thread.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
                      <span className="bg-muted grid size-10 place-items-center rounded-full">
                        <Inbox className="text-muted-foreground size-4" />
                      </span>
                      <p className="text-sm font-medium">
                        {tCommon("no_messages_yet")}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {t("start_the_conversation")}
                      </p>
                    </div>
                  ) : (
                    thread.map((message, index) => (
                      <div key={message.id} className="space-y-3">
                        {/* A thread can span weeks and the bubble only prints a
                            clock, so without this "09:14" and "09:14" three days
                            apart read as one exchange. */}
                        {startsNewDay(thread, index) ? (
                          <DayRule time={message.time} />
                        ) : null}
                        <MessageBubble
                          message={message}
                          // The customer is the counterpart on this surface, so
                          // their messages sit on the start side and staff on
                          // the end.
                          isOwn={message.type !== "client"}
                          counterpartAvatar={ticket?.user?.avatar}
                          counterpartName={customerName}
                          className={cn(message.pending && "opacity-60")}
                        />
                      </div>
                    ))
                  )}
                </div>

                {/* ---- composer ------------------------------------------ */}
                <footer className="border-border bg-card/40 shrink-0 border-t p-3">
                  {closed ? (
                    <div className="border-success/20 bg-success/10 flex items-center justify-center gap-2 rounded-xl border px-4 py-3">
                      <CheckCircle2 className="text-success-ink size-4" />
                      <span className="text-success-ink text-sm font-medium">
                        {tCommon("this_ticket_has_been_resolved")}
                      </span>
                    </div>
                  ) : !can.manage ? (
                    /* A view-only agent gets the conversation and no composer,
                       rather than a box whose Send button 403s. */
                    <p className="text-muted-foreground text-center text-xs">
                      {t("read_only_no_reply")}
                    </p>
                  ) : (
                    <>
                      <Textarea
                        value={draft}
                        onChange={(event) => setDraft(event.target.value)}
                        onKeyDown={(event) => {
                          // Enter sends and Shift+Enter breaks the line, which is
                          // what this desk has always done; Cmd/Ctrl+Enter also
                          // sends, because that is what the AI console taught the
                          // same operators.
                          const submit =
                            (event.key === "Enter" && !event.shiftKey) ||
                            ((event.metaKey || event.ctrlKey) &&
                              event.key === "Enter");
                          if (!submit) return;
                          event.preventDefault();
                          if (canSend && draft.trim()) send(draft);
                        }}
                        placeholder={`${tCommon("type_your_message")}…`}
                        disabled={!ready}
                        className="min-h-20 resize-none text-sm"
                      />
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={!canSend}
                          onClick={() => fileRef.current?.click()}
                        >
                          {uploading ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <Paperclip className="size-3.5" />
                          )}
                          {tCommon("attach_image")}
                        </Button>
                        <Button
                          size="sm"
                          disabled={!canSend || !draft.trim()}
                          onClick={() => send(draft)}
                        >
                          {busy === "send" ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <Send className="size-3.5" />
                          )}
                          {tCommon("send")}
                        </Button>
                      </div>
                    </>
                  )}
                </footer>
              </>
            )}
          </section>

          {/* ---- pane 3: the case ------------------------------------------
              ONE FIXED WIDTH, ALWAYS. Without a width class the column sizes to
              its own content, so a ticket with tags is wider than one without,
              the conversation beside it resizes to match, and every switch
              between tickets reflows the whole screen. */}
          <aside
            className={cn(
              "border-border bg-card/40 min-h-0 w-96 shrink-0 flex-col overflow-hidden border-s",
              paneOpen && selected ? "hidden xl:flex" : "hidden"
            )}
          >
            <TicketPane
              ticket={ready ? ticket : null}
              loading={loadingDetail && !ready}
              currentUserId={userId}
              tab={paneTab}
              onTabChange={setPaneTab}
              busy={busy}
              can={can}
              wsConnected={wsConnected}
              messageCount={thread.filter((m) => !m.system).length}
              onStatus={setStatus}
              onPriority={setPriority}
              onAssign={setAssignee}
              onCollapse={() => setPaneOpen(false)}
            />
          </aside>

          {!paneOpen && selected ? (
            <CollapsedTicketRail
              messageCount={thread.filter((m) => !m.system).length}
              onExpand={() => setPaneOpen(true)}
            />
          ) : null}
        </div>
      </div>

      {/* The case pane below `xl`. Same component, same props — a second,
          smaller copy of a pane is how two surfaces start disagreeing about
          which controls exist. */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        {/* `gap-0 p-0` override `SheetContent`'s own `gap-4`: the pane draws its
            own hairlines and a 1rem gutter between the header and the first
            section would not match the column it is standing in for. */}
        <SheetContent
          side="right"
          className="w-[85%] gap-0 p-0 sm:w-96 sm:max-w-96 xl:hidden"
        >
          <SheetHeader className="border-border h-11 shrink-0 justify-center border-b px-3 py-0">
            <SheetTitle className="text-subtle-foreground font-mono text-[11px] tracking-wider uppercase">
              {tCommon("case")}
            </SheetTitle>
          </SheetHeader>
          <div className="flex min-h-0 flex-1 flex-col">
            <TicketPane
              ticket={ready ? ticket : null}
              loading={loadingDetail && !ready}
              currentUserId={userId}
              tab={paneTab}
              onTabChange={setPaneTab}
              busy={busy}
              can={can}
              wsConnected={wsConnected}
              messageCount={thread.filter((m) => !m.system).length}
              onStatus={setStatus}
              onPriority={setPriority}
              onAssign={setAssignee}
              /* The sheet supplies its own `SheetTitle` — Radix needs one for
                 the dialog to be announced at all, so keeping the pane's header
                 too would trade a visible duplicate for nothing. */
              showHeader={false}
            />
          </div>
        </SheetContent>
      </Sheet>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={onUpload}
        className="hidden"
      />
    </EditorShell>
  );
}

/* ------------------------------------------------------------------- rows - */

function QueueRow({
  row,
  active,
  mine,
  onSelect,
}: {
  row: DeskRow;
  active: boolean;
  mine: boolean;
  onSelect: () => void;
}) {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");

  const band =
    row.status === "CLOSED"
      ? "closed"
      : row.waitingOnUs
        ? "waiting"
        : row.lastMessageFrom === "agent"
          ? "replied"
          : "idle";

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "border-border/50 relative flex w-full items-start gap-2.5 border-b py-2.5 pe-3 ps-4 text-start transition-colors last:border-0",
        active ? "bg-primary/5" : "hover:bg-muted/50"
      )}
    >
      {/* Urgency has to work in peripheral vision. A 9px chip does not; a 3px
          full-height rule does. */}
      <span
        className={cn(
          "absolute inset-y-0 start-0 w-[3px]",
          active ? "bg-primary" : ROW_RAIL[band]
        )}
        aria-hidden
      />
      <Avatar className="mt-0.5 size-7 shrink-0">
        {row.customer.avatar ? (
          <AvatarImage src={row.customer.avatar} alt="" />
        ) : null}
        <AvatarFallback className="text-[10px]">
          {row.customer.name.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "truncate text-xs",
            row.waitingOnUs ? "font-semibold" : "font-medium"
          )}
        >
          {row.subject}
        </p>
        <p className="text-muted-foreground truncate text-[11px]">
          {row.customer.name}
        </p>
        {/* The last thing said, which is the only thing that tells one
            "Withdrawal problem" from the next one. */}
        {row.preview ? (
          <p className="text-subtle-foreground mt-0.5 truncate text-[10px]">
            {row.lastMessageFrom === "agent" ? `↩ ${row.preview}` : row.preview}
          </p>
        ) : null}
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          {row.importance === "HIGH" ? (
            <span className="border-destructive/30 bg-destructive/5 text-destructive-ink rounded-full border px-1.5 py-px text-[9px]">
              {tCommon("high_priority")}
            </span>
          ) : null}
          <span className="text-muted-foreground inline-flex items-center gap-0.5 text-[10px]">
            <Clock className="size-2.5" />
            {row.ageMinutes < 60
              ? `${row.ageMinutes}m`
              : row.ageMinutes < 60 * 24
                ? `${Math.floor(row.ageMinutes / 60)}h`
                : `${Math.floor(row.ageMinutes / 1440)}d`}
          </span>
          {row.messageCount > 0 ? (
            <span className="text-muted-foreground text-[10px]">
              {row.messageCount} {t("msgs")}
            </span>
          ) : null}
          {/*
            SOMEONE ELSE IS ALREADY ON IT.
            The queue puts the oldest waiting ticket at the top of EVERY agent's
            screen by design, so without this two of them open the same one and
            the customer gets two different answers.
          */}
          {row.agentId ? (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 text-[10px]",
                mine ? "text-primary" : "text-warning-ink"
              )}
            >
              <UserRound className="size-2.5" aria-hidden />
              {mine ? t("yours") : row.agentName || t("taken")}
            </span>
          ) : null}
        </div>
      </div>
    </button>
  );
}

/* -------------------------------------------------------------------- day - */

function startsNewDay(thread: SupportThreadMessage[], index: number): boolean {
  if (index === 0) return true;
  const current = new Date(thread[index].time);
  const previous = new Date(thread[index - 1].time);
  if (Number.isNaN(current.getTime()) || Number.isNaN(previous.getTime())) {
    return false;
  }
  return current.toDateString() !== previous.toDateString();
}

function DayRule({ time }: { time: string }) {
  const date = new Date(time);
  if (Number.isNaN(date.getTime())) return null;

  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const label =
    date.toDateString() === today.toDateString()
      ? new Intl.RelativeTimeFormat(undefined, { numeric: "auto" }).format(0, "day")
      : date.toDateString() === yesterday.toDateString()
        ? new Intl.RelativeTimeFormat(undefined, { numeric: "auto" }).format(
            -1,
            "day"
          )
        : date.toLocaleDateString(undefined, {
            weekday: "long",
            month: "short",
            day: "numeric",
          });

  return (
    <div className="flex items-center gap-3 py-1">
      <span className="bg-border h-px w-4 shrink-0 grow" aria-hidden />
      <span className="text-subtle-foreground min-w-0 font-mono text-[10px] tracking-wider uppercase">
        {label}
      </span>
      <span className="bg-border h-px w-4 shrink-0 grow" aria-hidden />
    </div>
  );
}
