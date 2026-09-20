"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronRight,
  Filter,
  MessageCircle,
  Plus,
  Search,
  Sparkles,
  Ticket as TicketIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { $fetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/utils/format";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { PageShell } from "@/components/layout/page-shell";
import { readSupportMessages, toThreadMessage } from "@/lib/support/messages";
import { useAiSupport } from "@/lib/support/use-ai-support";
import { useUserStore } from "@/store/user";

import { Pagination } from "./ticket/components/pagination";
import { SupportMasthead, RailStat } from "./components/masthead";

/**
 * The support centre. ONE room, one door.
 *
 * ---------------------------------------------------------------------------
 * WHY `/support` AND `/support/ticket` BECAME ONE PAGE
 * ---------------------------------------------------------------------------
 * They were a lobby and the room behind it. `/support` held two buttons — start
 * a chat, open a ticket — and a truncated preview of the first four
 * conversations; `/support/ticket` held the real list, with the filters, the
 * search and the pager. Everything on the lobby was either a link to the room
 * or a worse copy of what was already in it.
 *
 * That cost more than a click. It forced a bespoke two-item navbar onto the
 * whole section (`layout.tsx` used to pass a custom `menu`), whose first entry
 * was "Support Center" → `/support` — the same destination `config/menu.ts`
 * ALREADY offers under Services. So a customer could reach the same place from
 * two navs, and the section replaced the app's navigation with a smaller one
 * for no gain. It also produced the double-underline bug: `/support` is a
 * prefix of `/support/ticket`, and `isActiveMenu` is a prefix test, so both
 * entries lit up at once.
 *
 * Merging deletes all of it. There is no support nav, the main nav stays where
 * it is, and `/support/ticket` redirects here.
 *
 * ---------------------------------------------------------------------------
 * THE LIST IS AN INBOX, NOT A DASHBOARD
 * ---------------------------------------------------------------------------
 * The four KPI tiles that used to head the list are gone: three of the four
 * were the same numbers as the filter the customer was about to apply. A
 * support list is a queue with one question attached to every row — WHOSE TURN
 * IS IT — and `supportTicket.status` is exactly that axis (the backend says so
 * outright in `user/support/ticket/[id]/index.post.ts`):
 *
 *     PENDING  no agent has ever replied     waiting on US
 *     OPEN     the customer spoke last       waiting on US
 *     REPLIED  an agent spoke last           waiting on YOU
 *     CLOSED   done
 *
 * So the buckets ARE the status column grouped by what it already means, and
 * their counts come from `/stat` — SQL over the whole account, never a sum of
 * whichever page happens to be loaded.
 */

interface SupportTicket {
  id: string;
  userId: string;
  agentId?: string;
  agentName?: string;
  subject: string;
  importance: "LOW" | "MEDIUM" | "HIGH";
  status: "PENDING" | "OPEN" | "REPLIED" | "CLOSED";
  messages?: unknown;
  type: "LIVE" | "TICKET";
  createdAt: string;
  updatedAt: string;
  tags?: string[];
  responseTime?: number;
  satisfaction?: number;
}

interface TicketStats {
  total: number;
  open: number;
  pending: number;
  replied: number;
  closed: number;
  awaitingUs: number;
  avgResponseTime: number | null;
  satisfaction: number | null;
}

/** The whose-turn axis, as buckets. */
type Bucket = "all" | "us" | "you" | "done";

const BUCKET_STATUSES: Record<Exclude<Bucket, "all">, string[]> = {
  us: ["PENDING", "OPEN"],
  you: ["REPLIED"],
  done: ["CLOSED"],
};

/**
 * One window of the account's conversations.
 *
 * Large enough that essentially every customer holds their entire history in
 * one request — which is what makes instant client-side search honest — and
 * bounded so an account with thousands cannot pull them all into the browser.
 */
const WINDOW = 200;
const PAGE_SIZE = 12;

const openLiveChat = () =>
  window.dispatchEvent(new CustomEvent("openLiveChat", { detail: {} }));

export default function SupportCenterPage() {
  const t = useTranslations("common");
  const tTicket = useTranslations("support_ticket");
  const ai = useAiSupport();
  const { user } = useUserStore();

  const [allTickets, setAllTickets] = useState<SupportTicket[]>([]);
  const [totalOnServer, setTotalOnServer] = useState<number | null>(null);
  const [stats, setStats] = useState<TicketStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [bucket, setBucket] = useState<Bucket>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [importanceFilter, setImportanceFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  const load = useCallback(async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const [list, counters] = await Promise.all([
      $fetch<{ items?: SupportTicket[]; pagination?: { totalItems?: number } }>({
        url: `/api/user/support/ticket?perPage=${WINDOW}&page=1&sortField=updatedAt&sortOrder=desc`,
        silent: true,
      }),
      $fetch<TicketStats>({
        url: "/api/user/support/ticket/stat",
        silent: true,
      }),
    ]);

    setAllTickets(Array.isArray(list.data?.items) ? list.data.items : []);
    setTotalOnServer(
      typeof list.data?.pagination?.totalItems === "number"
        ? list.data.pagination.totalItems
        : null
    );
    setStats(counters.data ?? null);
    setIsLoading(false);
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const needle = searchQuery.trim().toLowerCase();
    return allTickets.filter((ticket) => {
      const inBucket =
        bucket === "all" || BUCKET_STATUSES[bucket].includes(ticket.status);
      const matchesSearch =
        !needle ||
        ticket.subject.toLowerCase().includes(needle) ||
        ticket.tags?.some((tag) => tag.toLowerCase().includes(needle)) ||
        lastLine(ticket.messages).text.toLowerCase().includes(needle);
      const matchesImportance =
        importanceFilter === "all" || ticket.importance === importanceFilter;
      return inBucket && matchesSearch && matchesImportance;
    });
  }, [allTickets, bucket, searchQuery, importanceFilter]);

  /**
   * The empty state is a RESULT, and `!isLoading` is what makes it one.
   *
   * Without it, a customer with forty open tickets is shown "No conversations"
   * on every visit for the length of the fetch.
   */
  const showEmptyState = !isLoading && filtered.length === 0;
  const isFiltered =
    bucket !== "all" ||
    Boolean(searchQuery.trim()) ||
    importanceFilter !== "all";

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const paginated = filtered.slice(startIndex, startIndex + PAGE_SIZE);

  /** True when the account holds conversations this page has not loaded. */
  const truncated = totalOnServer !== null && totalOnServer > allTickets.length;

  const resetFilters = () => {
    setBucket("all");
    setSearchQuery("");
    setImportanceFilter("all");
    setCurrentPage(1);
  };

  return (
    <PageShell
      width="default"
      rhythm="md"
      header={
        <SupportMasthead
          rail={
            <>
              <RailStat
                label={
                  isLoading
                    ? tTicket("loading_conversations")
                    : tTicket("n_awaiting_reply", {
                        count: stats?.awaitingUs ?? 0,
                      })
                }
                tone={stats && stats.awaitingUs > 0 ? "warn" : "ok"}
              />
              {/* An em dash, not a zero. `avgResponseTime` is null until the
                  desk has answered something, and "0 min" is a boast rather
                  than an absence. */}
              <RailStat
                label={tTicket("avg_reply_rail", {
                  value:
                    stats?.avgResponseTime == null
                      ? "—"
                      : `${stats.avgResponseTime} min`,
                })}
                tone="muted"
              />
              {ai.enabled ? (
                <RailStat label={tTicket("assistant_answers_first")} tone="ok" />
              ) : null}
            </>
          }
          title={t("support_center")}
          description={tTicket("hub_description")}
          actions={
            <>
              <Button variant="outline" onClick={openLiveChat}>
                <MessageCircle className="mr-2 size-4" />
                {t("start_live_chat")}
              </Button>
              <Button asChild>
                <Link href="/support/new" data-tour="support-new">
                  <Plus className="mr-2 size-4" />
                  {t("new_ticket")}
                </Link>
              </Button>
            </>
          }
        />
      }
    >
      {/* ---- the whose-turn axis, and the two filters that are not it --- */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Tabs
          value={bucket}
          onValueChange={(value) => {
            setBucket(value as Bucket);
            setCurrentPage(1);
          }}
        >
          <TabsList variant="segmented" size="sm" className="w-full lg:w-auto">
            <BucketTab value="all" label={t("all")} count={stats?.total} />
            <BucketTab
              value="us"
              label={tTicket("bucket_waiting_on_us")}
              count={stats?.awaitingUs}
            />
            <BucketTab
              value="you"
              label={t("waiting_on_you")}
              count={stats?.replied}
              /* The one bucket that is a call to action. */
              emphasise
            />
            <BucketTab value="done" label={t("resolved")} count={stats?.closed} />
          </TabsList>
        </Tabs>

        <div className="flex flex-col gap-2 sm:flex-row lg:shrink-0">
          <div className="relative sm:w-64">
            <Search className="text-muted-foreground absolute start-3 top-1/2 size-4 -translate-y-1/2" />
            <Input
              placeholder={`${tTicket("search_conversations")}…`}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="ps-9"
            />
          </div>
          <Select
            value={importanceFilter}
            onValueChange={(value) => {
              setImportanceFilter(value);
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="h-9 w-full sm:w-40">
              <Filter className="me-2 size-4" />
              <SelectValue placeholder={tTicket("filter_by_priority")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{tTicket("all_priority")}</SelectItem>
              <SelectItem value="HIGH">{t("high")}</SelectItem>
              <SelectItem value="MEDIUM">{t("medium")}</SelectItem>
              <SelectItem value="LOW">{t("low")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Say it plainly rather than letting the search quietly miss rows. */}
      {!isLoading && truncated ? (
        <p className="text-warning-ink text-xs">
          {tTicket("window_note", { count: allTickets.length })}
        </p>
      ) : null}

      {/* ---- the inbox --------------------------------------------------
          One bordered surface with hairline-separated rows, rather than a
          stack of individually bordered cards. Twelve cards each with their own
          frame is twelve competing rectangles; one frame with twelve rows is a
          list, and a list is what this is. */}
      <Card padding="none" className="overflow-hidden" data-tour="support-list">
        <div className="divide-border divide-y">
          {isLoading
            ? [0, 1, 2, 3, 4, 5].map((i) => <PendingRow key={`pending-${i}`} />)
            : paginated.map((ticket) => (
                <TicketRow key={ticket.id} ticket={ticket} />
              ))}

          {showEmptyState ? (
            <EmptyState
              filtered={isFiltered}
              signedIn={Boolean(user?.id)}
              onClear={resetFilters}
            />
          ) : null}
        </div>
      </Card>

      {filtered.length > PAGE_SIZE ? (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filtered.length}
          pageSize={PAGE_SIZE}
          showPageSizeSelector={false}
          onPageChange={(nextPage) => {
            setCurrentPage(nextPage);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          onPageSizeChange={() => undefined}
        />
      ) : null}

      {/* ---- the honest footnote ---------------------------------------
          Only rendered when an assistant really is answering. A plain statement
          of who writes first and how to get past it, which is the one thing a
          customer needs to know before they start typing. */}
      {ai.enabled && (ai.liveChat || ai.tickets) ? (
        <p className="text-muted-foreground border-border flex items-start gap-2 rounded-lg border border-dashed px-3 py-2.5 text-xs leading-relaxed">
          <Sparkles className="text-info mt-0.5 size-3.5 shrink-0" aria-hidden />
          <span className="min-w-0">{tTicket("hub_ai_footnote")}</span>
        </p>
      ) : null}
    </PageShell>
  );
}

function BucketTab({
  value,
  label,
  count,
  emphasise,
}: {
  value: Bucket;
  label: string;
  count?: number;
  emphasise?: boolean;
}) {
  return (
    <TabsTrigger value={value} className="flex-1 gap-1.5 lg:flex-none">
      {label}
      {/* The count is the whole reason these are tabs rather than a dropdown,
          so it renders as soon as `/stat` lands — and stays absent rather than
          showing 0 while it is in flight, because a 0 that becomes a 7 reads as
          data changing rather than data arriving. */}
      {typeof count === "number" ? (
        <span
          className={cn(
            "rounded-full px-1.5 py-px font-mono text-[10px] tabular-nums",
            emphasise && count > 0
              ? "bg-warning/15 text-warning-ink"
              : "bg-muted-foreground/10"
          )}
        >
          {count}
        </span>
      ) : null}
    </TabsTrigger>
  );
}

/**
 * The last thing said, and who said it.
 *
 * A subject line tells you what a conversation was about when it opened; the
 * last message tells you where it is now, which is the thing you are scanning
 * for. `toThreadMessage` is the shared normaliser, so `ai` survives here too
 * and an assistant's reply is attributed to the assistant rather than to a
 * nameless "Support".
 */
function lastLine(raw: unknown): {
  text: string;
  from: "you" | "ai" | "agent" | null;
} {
  const messages = readSupportMessages(raw);
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i]?.system === true) continue;
    const message = toThreadMessage(messages[i], i);
    if (!message.text.trim()) continue;
    return {
      text: message.text.trim(),
      from: message.type === "client" ? "you" : message.ai ? "ai" : "agent",
    };
  }
  return { text: "", from: null };
}

function TicketRow({ ticket }: { ticket: SupportTicket }) {
  const t = useTranslations("common");
  const tTicket = useTranslations("support_ticket");

  const { text: preview, from } = lastLine(ticket.messages);
  const isLive = ticket.type === "LIVE";
  /** REPLIED is the one status that means the ball is in the customer's court. */
  const yourTurn = ticket.status === "REPLIED";
  const closed = ticket.status === "CLOSED";

  const openLive = () =>
    window.dispatchEvent(
      new CustomEvent("openLiveChat", { detail: { sessionId: ticket.id } })
    );

  const inner = (
    <>
      {/* The leading rail carries the state at a glance. A 9px chip cannot
          survive peripheral vision; a 3px bar down the full row height can. */}
      <span
        className={cn(
          "w-[3px] shrink-0 self-stretch rounded-full",
          closed ? "bg-transparent" : yourTurn ? "bg-warning" : "bg-primary/60"
        )}
        aria-hidden
      />

      <span className="min-w-0 flex-1 space-y-1">
        <span className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "truncate text-sm",
              closed ? "text-muted-foreground font-medium" : "font-semibold"
            )}
          >
            {ticket.subject}
          </span>
          {ticket.importance === "HIGH" && !closed ? (
            <Badge appearance="soft" tone="destructive" className="text-[10px]">
              {t("high")}
            </Badge>
          ) : null}
          {isLive ? (
            <Badge appearance="soft" tone="info" className="text-[10px]">
              {t("live_chat")}
            </Badge>
          ) : null}
          {yourTurn ? (
            <Badge appearance="soft" tone="warning" className="text-[10px]">
              {tTicket("your_turn")}
            </Badge>
          ) : null}
        </span>

        {preview ? (
          <span className="text-muted-foreground flex min-w-0 items-center gap-1.5 text-xs">
            {from === "ai" ? (
              <Sparkles className="text-info size-3 shrink-0" aria-hidden />
            ) : null}
            <span className="truncate">
              <span className="text-foreground/70 font-medium">
                {from === "you"
                  ? `${t("You")}: `
                  : from === "ai"
                    ? `${t("assistant")}: `
                    : ticket.agentName
                      ? `${ticket.agentName}: `
                      : `${t("support")}: `}
              </span>
              {preview}
            </span>
          </span>
        ) : (
          <span className="text-subtle-foreground block text-xs">
            {t("no_messages_yet")}
          </span>
        )}
      </span>

      <span className="flex shrink-0 items-center gap-3">
        <span className="text-subtle-foreground hidden text-[11px] whitespace-nowrap sm:block">
          {formatRelativeTime(ticket.updatedAt)}
        </span>
        <ChevronRight className="text-muted-foreground/50 size-4" aria-hidden />
      </span>
    </>
  );

  const rowClass = cn(
    "focus-visible:ring-ring/50 hover:bg-muted/40 flex w-full items-center gap-3 px-4 py-3.5 text-start transition-colors focus-visible:ring-[3px] focus-visible:outline-hidden",
    closed && "opacity-70 hover:opacity-100"
  );

  /* A LIVE conversation has no route of its own — it lives in the floating
     widget — so this row opens the widget rather than pretending to navigate.
     Two destinations behind one visual row is exactly the case where a link and
     a button must actually BE a link and a button. */
  if (isLive) {
    return (
      <button type="button" onClick={openLive} className={rowClass}>
        {inner}
      </button>
    );
  }

  return (
    <Link href={`/support/ticket/${ticket.id}` as any} className={rowClass}>
      {inner}
    </Link>
  );
}

function EmptyState({
  filtered,
  signedIn,
  onClear,
}: {
  filtered: boolean;
  signedIn: boolean;
  onClear: () => void;
}) {
  const t = useTranslations("common");
  const tTicket = useTranslations("support_ticket");

  if (!signedIn) {
    return (
      <div className="px-6 py-16 text-center">
        <span className="bg-muted text-muted-foreground mx-auto mb-3 grid size-10 place-items-center rounded-sm">
          <TicketIcon className="size-5" />
        </span>
        <h3 className="font-semibold">
          {tTicket("sign_in_to_see_conversations")}
        </h3>
        <p className="text-muted-foreground mx-auto mt-1 mb-4 max-w-md text-sm leading-relaxed">
          {tTicket("sign_in_body")}
        </p>
        <Button asChild>
          <Link href="/login">{t("sign_in")}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="px-6 py-16 text-center">
      <span className="bg-muted text-muted-foreground mx-auto mb-3 grid size-10 place-items-center rounded-sm">
        <TicketIcon className="size-5" />
      </span>
      <h3 className="font-semibold">
        {filtered ? tTicket("no_conversations_here") : tTicket("nothing_open")}
      </h3>
      <p className="text-muted-foreground mx-auto mt-1 mb-4 max-w-md text-sm leading-relaxed">
        {filtered ? tTicket("no_tickets_filtered_body") : tTicket("no_tickets_body")}
      </p>
      {filtered ? (
        <Button variant="outline" onClick={onClear}>
          {t("clear_filters")}
        </Button>
      ) : (
        <Button asChild>
          <Link href="/support/new">
            <Plus className="mr-2 size-4" />
            {tTicket("create_your_first_ticket")}
          </Link>
        </Button>
      )}
    </div>
  );
}

/** A pending row at the real row height, in the real container. */
function PendingRow() {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <span className="bg-border w-[3px] shrink-0 self-stretch rounded-full" />
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-4 w-56 max-w-full" />
        <Skeleton className="h-3 w-80 max-w-full" />
      </div>
      <Skeleton className="hidden h-3 w-20 shrink-0 sm:block" />
    </div>
  );
}
