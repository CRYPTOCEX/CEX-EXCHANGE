"use client";

import {
  Check,
  ExternalLink,
  Loader2,
  MessageSquare,
  Star,
  UserCheck,
  UserPlus,
  UserX,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/utils/format";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Fact,
  PaneHeader,
  PaneTabButton,
  SectionLabel,
} from "@/components/support/resolution-pane";
import type { DeskTicket } from "./types";

/**
 * The operator's third column — the desk's sibling of the AI console's case pane.
 *
 * ---------------------------------------------------------------------------
 * SAME GRAMMAR, NO ASSISTANT
 * ---------------------------------------------------------------------------
 * It is built from the same exported furniture as the customer's resolution pane
 * and the AI inbox's case pane (`PaneHeader`, `PaneTabButton`, `SectionLabel`,
 * `Fact`), so the three screens cannot drift into different tab bars and
 * different hairline rhythms the way the three message renderers once did.
 *
 * What it does NOT carry is every AI affordance: no retrieval evidence, no
 * confidence meters, no drafted reply, no "teach from this ticket". Those belong
 * to a paid add-on and a screen that has the data to justify them. The one place
 * this console admits the add-on exists is `AiSupportBridge`, in the queue pane.
 *
 * ---------------------------------------------------------------------------
 * THE FLOOR IS OWNERSHIP
 * ---------------------------------------------------------------------------
 * The AI console's floor answers "who holds this conversation — you, another
 * agent, or the assistant". Here there is no assistant, so the question is
 * narrower and sharper: WHO IS ANSWERING THIS CUSTOMER. That block is first, is
 * never gated behind a tab, and never scrolls away — two agents replying to the
 * same ticket is the failure a queue ordered by "oldest wait first" makes most
 * likely, because it puts the same row at the top of everyone's screen.
 */

export type TicketTab = "case" | "customer";

export interface TicketPaneCapabilities {
  /** `edit.support.ticket` — status, priority, assignment. */
  manage: boolean;
  /** `view.user` — the link through to the customer's admin profile. */
  viewUser: boolean;
}

export interface TicketPaneProps {
  ticket: DeskTicket | null;
  loading: boolean;
  /** The signed-in operator, so "you have this" can be told from "someone does". */
  currentUserId?: string | null;
  tab: TicketTab;
  onTabChange: (tab: TicketTab) => void;
  busy: string | null;
  can: TicketPaneCapabilities;
  wsConnected: boolean;
  messageCount: number;
  onStatus: (status: string) => void;
  onPriority: (importance: string) => void;
  onAssign: (agentId: string | null) => void;
  onCollapse?: () => void;
  showHeader?: boolean;
}

export function TicketPane({
  ticket,
  loading,
  currentUserId,
  tab,
  onTabChange,
  busy,
  can,
  wsConnected,
  messageCount,
  onStatus,
  onPriority,
  onAssign,
  onCollapse,
  showHeader = true,
}: TicketPaneProps) {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* "Case", NOT "Ticket details" — that key is already the heading over the
          fact grid inside the Ticket tab, and the two rendered as identical
          uppercase mono labels a few hundred pixels apart. Two identical
          headings stacked is how a reader concludes the second one is a
          rendering bug. Same split the AI console's pane makes. */}
      {showHeader ? (
        <PaneHeader title={tCommon("case")} onCollapse={onCollapse} />
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <Ownership
          ticket={ticket}
          loading={loading}
          currentUserId={currentUserId}
          busy={busy}
          can={can}
          wsConnected={wsConnected}
          onAssign={onAssign}
        />

        <div
          role="tablist"
          aria-label={tCommon("ticket_details")}
          className="border-border flex items-stretch gap-1 border-b px-3"
        >
          <PaneTabButton id="case" active={tab === "case"} onSelect={onTabChange}>
            {tCommon("ticket")}
          </PaneTabButton>
          <PaneTabButton
            id="customer"
            active={tab === "customer"}
            onSelect={onTabChange}
          >
            {tCommon("customer")}
          </PaneTabButton>
        </div>

        <div
          role="tabpanel"
          id={`pane-panel-${tab}`}
          aria-labelledby={`pane-tab-${tab}`}
        >
          {tab === "case" ? (
            <CaseTab
              ticket={ticket}
              loading={loading}
              busy={busy}
              can={can}
              messageCount={messageCount}
              onStatus={onStatus}
              onPriority={onPriority}
            />
          ) : (
            <CustomerTab ticket={ticket} loading={loading} can={can} />
          )}
        </div>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- ownership - */

/**
 * Who is answering this customer, and the one control that changes it.
 *
 * `agentId` and `agentName` are separate columns and the second is a denormalised
 * copy written at reply time, so the include is preferred and the string is the
 * fallback — a renamed employee otherwise keeps their old name on every ticket
 * they ever touched.
 */
function Ownership({
  ticket,
  loading,
  currentUserId,
  busy,
  can,
  wsConnected,
  onAssign,
}: {
  ticket: DeskTicket | null;
  loading: boolean;
  currentUserId?: string | null;
  busy: string | null;
  can: TicketPaneCapabilities;
  wsConnected: boolean;
  onAssign: (agentId: string | null) => void;
}) {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");

  const holder = ticket?.agentId ?? null;
  const mine = Boolean(holder && currentUserId && holder === currentUserId);
  const someoneElse = Boolean(holder && !mine);
  const closed = ticket?.status === "CLOSED";

  const agentName =
    [ticket?.agent?.firstName, ticket?.agent?.lastName].filter(Boolean).join(" ") ||
    ticket?.agentName ||
    null;

  const label = !holder
    ? tCommon("unassigned")
    : mine
      ? t("you_are_answering_this")
      : (agentName ?? tCommon("agent"));

  return (
    <div className="border-border border-b p-3">
      <div className="border-border bg-card rounded-lg border p-3">
        <div className="flex items-start gap-2.5">
          <Avatar className={cn("size-8 shrink-0", mine && "ring-primary ring-1")}>
            {ticket?.agent?.avatar ? (
              <AvatarImage src={ticket.agent.avatar} alt={agentName ?? ""} />
            ) : null}
            <AvatarFallback
              className={cn(
                "text-[11px] font-medium",
                someoneElse
                  ? "bg-warning/10 text-warning-ink"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {holder ? <UserCheck className="size-4" aria-hidden /> : "—"}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1">
            {loading ? (
              <>
                <Skeleton className="h-4 w-24" />
                <Skeleton className="mt-1.5 h-3 w-36" />
              </>
            ) : (
              <>
                <p className="truncate text-sm font-medium">{label}</p>
                <p className="text-muted-foreground text-[11px] leading-snug">
                  {holder
                    ? mine
                      ? t("replies_are_sent_as_you")
                      : t("another_agent_has_this")
                    : t("nobody_owns_this_yet")}
                </p>
              </>
            )}
          </div>

          {/* Live only means something while somebody is on it. On a closed
              ticket a green dot is a promise nobody is keeping. */}
          {!loading && !closed ? (
            <span
              className={cn(
                "mt-1.5 size-1.5 shrink-0 rounded-full",
                wsConnected ? "bg-success" : "bg-warning"
              )}
              title={wsConnected ? tCommon("live") : tCommon("connecting")}
              aria-hidden
            />
          ) : null}
        </div>

        {/* HIDDEN, not disabled, without `edit.support.ticket`: a view-only
            agent gets the conversation and no write control, rather than a
            button that 403s and teaches them the product is broken. */}
        {can.manage && !loading && ticket ? (
          <div className="border-border mt-2.5 flex flex-wrap gap-1.5 border-t pt-2.5">
            {mine ? (
              <Button
                size="sm"
                variant="outline"
                className="h-7 gap-1.5 text-[11px]"
                disabled={busy !== null}
                onClick={() => onAssign(null)}
              >
                {busy === "assign" ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <UserX className="size-3" />
                )}
                {tCommon("unassign")}
              </Button>
            ) : (
              <Button
                size="sm"
                variant={someoneElse ? "outline" : "default"}
                className="h-7 gap-1.5 text-[11px]"
                disabled={busy !== null}
                onClick={() => onAssign(currentUserId ?? null)}
              >
                {busy === "assign" ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <UserPlus className="size-3" />
                )}
                {someoneElse ? t("take_it_anyway") : tCommon("assign_to_me")}
              </Button>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/* --------------------------------------------------------------------- case - */

function CaseTab({
  ticket,
  loading,
  busy,
  can,
  messageCount,
  onStatus,
  onPriority,
}: {
  ticket: DeskTicket | null;
  loading: boolean;
  busy: string | null;
  can: TicketPaneCapabilities;
  messageCount: number;
  onStatus: (status: string) => void;
  onPriority: (importance: string) => void;
}) {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");

  const closed = ticket?.status === "CLOSED";

  /*
   * LITERAL KEYS, NOT `t(`status_${value}`)`.
   *
   * The i18n key extractor walks the source for literal strings; a key that only
   * exists after evaluation is silently absent from the optimised bundle, so the
   * control renders its own key path as its label in production and looks
   * perfect in dev.
   */
  const STATUS_LABEL: Record<string, string> = {
    PENDING: tCommon("pending"),
    OPEN: tCommon("open"),
    REPLIED: tCommon("replied"),
  };
  const PRIORITY_LABEL: Record<string, string> = {
    LOW: tCommon("low"),
    MEDIUM: tCommon("medium"),
    HIGH: tCommon("high"),
  };

  return (
    <section className="space-y-4 p-3">
      {can.manage ? (
        <div>
          <SectionLabel>{tCommon("status")}</SectionLabel>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {(["PENDING", "OPEN", "REPLIED"] as const).map((value) => (
              <Button
                key={value}
                size="sm"
                variant={ticket?.status === value ? "default" : "outline"}
                className="h-7 text-[11px]"
                disabled={busy !== null || loading || !ticket}
                onClick={() => onStatus(value)}
              >
                {ticket?.status === value ? (
                  <Check className="me-1 size-3" aria-hidden />
                ) : null}
                {STATUS_LABEL[value]}
              </Button>
            ))}
            {/* Close is separated: it ends the conversation, it emails the
                customer, and it is the only status change that also stops the
                composer below from accepting anything. */}
            <Button
              size="sm"
              variant={closed ? "default" : "outline"}
              className="h-7 text-[11px]"
              disabled={busy !== null || loading || !ticket}
              onClick={() => onStatus(closed ? "OPEN" : "CLOSED")}
            >
              {closed ? t("reopen_ticket") : tCommon("close_ticket")}
            </Button>
          </div>
        </div>
      ) : null}

      {can.manage ? (
        <div>
          <SectionLabel>{tCommon("priority")}</SectionLabel>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {(["LOW", "MEDIUM", "HIGH"] as const).map((value) => (
              <Button
                key={value}
                size="sm"
                variant={ticket?.importance === value ? "default" : "outline"}
                className="h-7 text-[11px]"
                disabled={busy !== null || loading || !ticket}
                onClick={() => onPriority(value)}
              >
                {PRIORITY_LABEL[value]}
              </Button>
            ))}
          </div>
        </div>
      ) : null}

      <div>
        <SectionLabel>{tCommon("ticket_details")}</SectionLabel>
        <dl className="border-border bg-border mt-2.5 grid grid-cols-2 gap-px overflow-hidden rounded-lg border">
          <Fact
            label={tCommon("created")}
            value={
              ticket?.createdAt ? new Date(ticket.createdAt).toLocaleString() : "—"
            }
            loading={loading}
          />
          <Fact
            label={tCommon("last_update")}
            value={ticket?.updatedAt ? formatRelativeTime(ticket.updatedAt) : "—"}
            loading={loading}
          />
          <Fact
            label={tCommon("channel")}
            value={ticket?.type || tCommon("ticket")}
            loading={loading}
          />
          <Fact
            label={tCommon("messages")}
            value={
              <span className="font-mono tabular-nums">{messageCount}</span>
            }
            loading={loading}
          />
          {/* null until the desk answers. An em dash says "not yet"; a 0 would
              claim an instant reply, which is the failure the KPI route's own
              `?? null` exists to prevent. */}
          <Fact
            label={tCommon("response_time")}
            value={
              ticket?.responseTime == null
                ? "—"
                : tCommon("n_minutes", { n: ticket.responseTime })
            }
            loading={loading}
          />
          <Fact
            label={tCommon("priority")}
            value={ticket?.importance || "—"}
            loading={loading}
          />
        </dl>
      </div>

      {ticket?.tags?.length ? (
        <div>
          <SectionLabel>{tCommon("tags")}</SectionLabel>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {ticket.tags.map((tag) => (
              <Badge
                key={tag}
                appearance="soft"
                tone="neutral"
                className="text-[11px]"
              >
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      ) : null}

      {/* Read-only, and only once the customer has rated. `satisfaction` is
          collected on the customer's own ticket page — the desk cannot score
          itself, so an empty star row here would be a control that never
          works. */}
      {ticket?.satisfaction ? (
        <div>
          <SectionLabel>{t("satisfaction")}</SectionLabel>
          <div className="mt-2.5 flex items-center gap-1.5">
            <span className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star
                  key={i}
                  className={cn(
                    "size-3.5",
                    i <= (ticket.satisfaction as number)
                      ? "text-warning fill-current"
                      : "text-border-strong"
                  )}
                  aria-hidden
                />
              ))}
            </span>
            <span className="text-muted-foreground font-mono text-[11px] tabular-nums">
              {ticket.satisfaction}/5
            </span>
          </div>
        </div>
      ) : null}
    </section>
  );
}

/* ----------------------------------------------------------------- customer - */

function CustomerTab({
  ticket,
  loading,
  can,
}: {
  ticket: DeskTicket | null;
  loading: boolean;
  can: TicketPaneCapabilities;
}) {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");

  const customer = ticket?.user ?? null;
  const name =
    [customer?.firstName, customer?.lastName].filter(Boolean).join(" ") ||
    tCommon("customer");

  return (
    <section className="space-y-4 p-3">
      <div>
        <SectionLabel>{tCommon("customer")}</SectionLabel>
        <div className="border-border bg-card mt-2.5 rounded-lg border p-3">
          <div className="flex items-center gap-2.5">
            <Avatar className="size-9 shrink-0">
              {customer?.avatar ? (
                <AvatarImage src={customer.avatar} alt={name} />
              ) : null}
              <AvatarFallback className="bg-muted text-muted-foreground text-[11px]">
                {name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              {loading ? (
                <>
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="mt-1.5 h-3 w-36" />
                </>
              ) : (
                <>
                  <p className="truncate text-xs font-medium">{name}</p>
                  <p className="text-muted-foreground truncate text-[11px]">
                    {customer?.email || t("no_email")}
                  </p>
                </>
              )}
            </div>
          </div>

          {/* The profile is where an operator checks a KYC state or a balance
              mid-conversation. Hidden without `view.user` rather than rendered
              as a link into a 403. */}
          {can.viewUser && customer?.id ? (
            <Link
              href={`/admin/crm/user/${customer.id}`}
              className="text-primary hover:text-primary-ink mt-2.5 inline-flex items-center gap-1 text-[11px] font-medium underline-offset-2 hover:underline"
            >
              {t("open_customer_profile")}
              <ExternalLink className="size-3" aria-hidden />
            </Link>
          ) : null}
        </div>
      </div>

      {/* Their history with the desk. Both figures come from the ticket detail
          route, which counts them per customer — so "3 of 11 resolved" is the
          context that decides whether this is a first-time question or the
          fourth time somebody has asked. */}
      <div>
        <SectionLabel>{t("their_history")}</SectionLabel>
        <dl className="border-border bg-border mt-2.5 grid grid-cols-2 gap-px overflow-hidden rounded-lg border">
          <Fact
            label={t("tickets_raised")}
            value={
              <span className="font-mono tabular-nums">
                {ticket?.userStats?.totalTickets ?? 0}
              </span>
            }
            loading={loading}
          />
          <Fact
            label={tCommon("resolved")}
            value={
              <span className="font-mono tabular-nums">
                {ticket?.userStats?.resolvedTickets ?? 0}
              </span>
            }
            loading={loading}
          />
        </dl>
      </div>

      {ticket?.agentStats ? (
        <div>
          <SectionLabel>{tCommon("assigned_agent")}</SectionLabel>
          <dl className="border-border bg-border mt-2.5 grid grid-cols-2 gap-px overflow-hidden rounded-lg border">
            <Fact
              label={tCommon("resolved")}
              value={
                <span className="font-mono tabular-nums">
                  {ticket.agentStats.resolved}
                </span>
              }
              loading={loading}
            />
            <Fact
              label={t("avg_rating")}
              value={
                ticket.agentStats.avgRating == null ? (
                  "—"
                ) : (
                  <span className="font-mono tabular-nums">
                    {ticket.agentStats.avgRating.toFixed(1)}
                  </span>
                )
              }
              loading={loading}
            />
          </dl>
        </div>
      ) : null}
    </section>
  );
}

/* --------------------------------------------------------------------- rail - */

/**
 * The 44px rail the pane collapses to.
 *
 * It carries the message count, so collapsing costs the operator the CONTENT of
 * the case but never the FACT that there is a conversation of some length behind
 * it. The AI bridge is deliberately NOT mirrored here — it lives in the queue
 * pane, which is on screen at every width, so a collapse can never be the thing
 * that hides a product from the person paying for the platform.
 */
export function CollapsedTicketRail({
  messageCount,
  onExpand,
}: {
  messageCount: number;
  onExpand: () => void;
}) {
  const tCommon = useTranslations("common");

  return (
    <button
      type="button"
      onClick={onExpand}
      aria-label={tCommon("ticket_details")}
      className="border-border bg-card/40 hover:bg-card/70 group hidden w-11 shrink-0 cursor-pointer flex-col items-center gap-3 border-s py-3 transition-colors xl:flex"
    >
      <UserCheck className="text-muted-foreground group-hover:text-foreground size-4 shrink-0 transition-colors" />
      <span
        className="text-subtle-foreground font-mono text-[10px] tracking-widest uppercase"
        style={{ writingMode: "vertical-rl" }}
      >
        {tCommon("details")}
      </span>
      {messageCount ? (
        <span className="text-muted-foreground flex flex-col items-center gap-0.5 font-mono text-[10px]">
          <MessageSquare className="size-3.5" aria-hidden />
          {messageCount}
        </span>
      ) : null}
    </button>
  );
}
