"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  ArrowUpRight,
  BookOpen,
  Bot,
  ChevronRight,
  ExternalLink,
  Loader2,
  Lock,
  Star,
  Zap,
} from "lucide-react";
import { useTranslations } from "next-intl";
import {
  useLiveProcess,
  type LiveProcess,
} from "@/lib/support/use-live-process";
import { useRouter } from "@/i18n/routing";
import { $fetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/utils/format";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AiBadge } from "./ai-badge";
import type { AiSessionState } from "./ai-session-panel";
import {
  actionCount,
  blockedSteps,
  splitSourceTitle,
  type ResolutionModel,
  type ResolutionSource,
} from "@/lib/support/resolution";

/**
 * The second column, promoted from telemetry to a working surface.
 *
 * ---------------------------------------------------------------------------
 * WHAT WAS WRONG WITH THE RAIL IT REPLACES
 * ---------------------------------------------------------------------------
 * The old rail spent 20rem on when the ticket was created, how long the desk
 * took, and whether the websocket was up. Every one of those is a fact ABOUT
 * the ticket; none of them is help with the problem. Meanwhile the things that
 * actually resolve a case — the article the answer rested on, the page the
 * customer needs to open, the step that is blocked on verification — were 10px
 * chips inside a bubble that scrolled away, and the `quote` on a citation was
 * only ever a `title=` tooltip, i.e. never visible to anyone on a touch screen.
 *
 * So: the metadata is demoted to the third tab, and the column carries the
 * resolution. The tabs are COUNT-GATED — a tab that would be empty is not
 * rendered, because a tab bar advertising two empty rooms is worse than no tab
 * bar.
 *
 * ---------------------------------------------------------------------------
 * THE FLOOR
 * ---------------------------------------------------------------------------
 * The risk with promoting a rail is the ticket that has nothing in it, which is
 * the common one: one message, no agent, no AI, no tags. An empty half-screen
 * is worse than the rail was. So the pane has a FLOOR it can never fall below —
 * who has it, where it is in its life, and the handful of facts that always
 * exist — and it NARROWS to the old rail's width rather than keeping 27rem of
 * mostly-air. Nothing is invented to fill it.
 *
 * ---------------------------------------------------------------------------
 * THIS IS STILL THE PAGE'S SINGLE `<aside>`
 * ---------------------------------------------------------------------------
 * Collapsing hides it with `hidden`, never by unmounting: the assignee's name
 * is asserted by the browser e2e at every viewport, and an unmounted aside
 * fails that assertion while looking fine to a human.
 */

export type PaneTab = "sources" | "actions" | "ticket";

export interface ResolutionPaneProps {
  ticket: {
    id: string;
    status?: string;
    importance?: string;
    tags?: string[] | null;
    responseTime?: number | null;
    satisfaction?: number | null;
    createdAt?: string;
    updatedAt?: string;
    agentId?: string | null;
  } | null;
  model: ResolutionModel;
  loading: boolean;
  agentName: string | null;
  agentAvatar?: string | null;
  wsConnected: boolean;
  aiSession: AiSessionState | null;
  tab: PaneTab;
  onTabChange: (tab: PaneTab) => void;
  /** Source keys the customer arrived at from a message's reference strip. */
  markedSources?: string[];
  /** Collapse control. Absent in the sheet, where collapsing makes no sense. */
  onCollapse?: () => void;
  /**
   * Draw the pane's own header row.
   *
   * Off inside the sheet, which supplies its own `SheetTitle` — Radix needs one
   * for the dialog to be announced at all, so suppressing that and keeping this
   * would trade a visible duplicate for a screen-reader regression.
   */
  showHeader?: boolean;
  /**
   * Submit a rating.
   *
   * The promise is part of the contract, not an implementation detail of the
   * page: the stars disable themselves while it is in flight, and something
   * has to tell them when it landed. See `Satisfaction`.
   */
  onSatisfaction?: (value: number) => void | Promise<void>;
}

export function ResolutionPane({
  ticket,
  model,
  loading,
  agentName,
  agentAvatar,
  wsConnected,
  aiSession,
  tab,
  onTabChange,
  markedSources,
  onCollapse,
  showHeader = true,
  onSatisfaction,
}: ResolutionPaneProps) {
  const t = useTranslations("support_ticket");
  const tCommon = useTranslations("common");

  /*
   * The LIVE process, not the one photographed onto the message.
   *
   * `model.processes` still decides whether the Actions tab appears — it is
   * derivable with no round trip, so the tab does not flicker in on a fetch —
   * but everything the tab SAYS about a process comes from here. See
   * `use-live-process.ts` for the two panels that disagreed before it did.
   */
  const liveProcess = useLiveProcess(ticket?.id);

  const sourceCount = model.sources.length;
  const actions = actionCount(model);
  const blocked = useMemo(() => blockedSteps(model), [model]);

  /*
   * A tab exists only if it has something in it. `ticket` always does, so the
   * bar renders when at least one of the other two has content — one lone tab
   * labelled "Ticket" is a heading pretending to be a control.
   */
  const showSources = sourceCount > 0;
  /*
   * WHAT THE TAB CAN ACTUALLY SHOW, which is not what the model knows.
   *
   * `actionCount` counts the processes it parsed out of the transcript, and
   * that is right for the model — a ticket that ran one is not an empty ticket.
   * But the tab can only DRAW a process the server still reports, and once one
   * has been over for longer than its receipt window the endpoint stops
   * returning it. Counting the parsed one there opened a tab onto nothing,
   * which is the failure this pane's own count-gating exists to prevent.
   *
   * So the parsed processes come back out and the live one, if there is one,
   * goes in. Everything else in the count is unaffected.
   */
  const paneActions =
    actions - model.processes.length + (liveProcess ? 1 : 0);
  const showActions = paneActions > 0 || blocked.length > 0;
  const showTabs = showSources || showActions;

  /*
   * The requested tab may have emptied out (a refetch dropped a citation), so
   * resolve to one that still exists rather than rendering a blank panel.
   *
   * `ticket` IS ALWAYS REACHABLE. It has no count to gate it — the ticket
   * always exists — and an earlier version of this test only admitted `sources`
   * and `actions`, so asking for `ticket` fell through to the fallback and
   * bounced straight back to Sources. The tab rendered, highlighted nothing,
   * and did nothing when pressed.
   */
  const requestedIsAvailable =
    tab === "ticket" ||
    (tab === "sources" && showSources) ||
    (tab === "actions" && showActions);

  const active: PaneTab = requestedIsAvailable
    ? tab
    : showSources
      ? "sources"
      : showActions
        ? "actions"
        : "ticket";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {showHeader ? (
        <PaneHeader
          title={showTabs ? tCommon("resolution") : tCommon("ticket_details")}
          onCollapse={onCollapse}
        />
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <AssigneeState
          loading={loading}
          agentName={agentName}
          agentAvatar={agentAvatar}
          agentId={ticket?.agentId}
          aiSession={aiSession}
          wsConnected={wsConnected}
          closed={ticket?.status === "CLOSED"}
        />

        {showTabs ? (
          <div
            role="tablist"
            aria-label={tCommon("resolution")}
            className="border-border flex items-stretch gap-1 border-b px-3"
          >
            {showSources ? (
              <PaneTabButton
                id="sources"
                active={active === "sources"}
                count={sourceCount}
                onSelect={onTabChange}
              >
                {tCommon("sources")}
              </PaneTabButton>
            ) : null}
            {showActions ? (
              <PaneTabButton
                id="actions"
                active={active === "actions"}
                count={paneActions || undefined}
                onSelect={onTabChange}
              >
                {tCommon("actions")}
              </PaneTabButton>
            ) : null}
            <PaneTabButton
              id="ticket"
              active={active === "ticket"}
              onSelect={onTabChange}
            >
              {tCommon("ticket")}
            </PaneTabButton>
          </div>
        ) : null}

        <div
          role={showTabs ? "tabpanel" : undefined}
          id={showTabs ? `pane-panel-${active}` : undefined}
          aria-labelledby={showTabs ? `pane-tab-${active}` : undefined}
        >
          {active === "sources" ? (
            <SourcesTab sources={model.sources} marked={markedSources} />
          ) : null}

          {active === "actions" ? (
            <ActionsTab
              model={model}
              blocked={blocked}
              live={liveProcess}
            />
          ) : null}

          {active === "ticket" ? (
            <TicketTab
              ticket={ticket}
              loading={loading}
              wsConnected={wsConnected}
              hasResolution={showTabs}
              onSatisfaction={onSatisfaction}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ header - */

/*
 * EXPORTED FOR THE OPERATOR SIDE.
 *
 * `PaneHeader`, `PaneTabButton`, `SectionLabel` and `Fact` are the pane's
 * generic furniture — no customer vocabulary in any of them, every label a
 * prop. The admin AI-support inbox builds its own pane from the same pieces, so
 * the two screens cannot drift into different tab bars and different hairline
 * rhythms the way the three message renderers once did.
 *
 * What is NOT exported is deliberate: `AssigneeState`, `SourcesTab`,
 * `ActionsTab`, `TicketTab` and `Satisfaction` are all customer-shaped, and an
 * operator needs different content in the same frame.
 */
export function PaneHeader({
  title,
  onCollapse,
}: {
  title: string;
  onCollapse?: () => void;
}) {
  const tCommon = useTranslations("common");
  return (
    <div className="border-border flex h-11 shrink-0 items-center gap-2 border-b px-3">
      <h2 className="text-subtle-foreground min-w-0 flex-1 truncate font-mono text-[11px] tracking-wider uppercase">
        {title}
      </h2>
      {onCollapse ? (
        <Button
          variant="ghost"
          size="icon"
          className="size-7 shrink-0"
          onClick={onCollapse}
          aria-label={tCommon("hide_details")}
        >
          <ChevronRight className="size-4 rtl:rotate-180" />
        </Button>
      ) : null}
    </div>
  );
}

/**
 * The 44px rail the pane collapses to.
 *
 * It carries the counts, so collapsing costs the customer the CONTENT of the
 * resolution but never the FACT that a resolution exists. A collapse that
 * leaves no trace is indistinguishable from a feature that is not there.
 */
export function CollapsedPaneRail({
  model,
  onExpand,
}: {
  model: ResolutionModel;
  onExpand: () => void;
}) {
  const t = useTranslations("support_ticket");
  const tCommon = useTranslations("common");
  const sources = model.sources.length;
  const actions = actionCount(model);

  return (
    <button
      type="button"
      onClick={onExpand}
      aria-label={t("show_resolution")}
      className="border-border bg-card/40 hover:bg-card/70 group hidden w-11 shrink-0 cursor-pointer flex-col items-center gap-3 border-s py-3 transition-colors xl:flex"
    >
      <ChevronRight className="text-muted-foreground group-hover:text-foreground size-4 shrink-0 rotate-180 transition-colors rtl:rotate-0" />
      <span
        className="text-subtle-foreground font-mono text-[10px] tracking-widest uppercase"
        style={{ writingMode: "vertical-rl" }}
      >
        {tCommon("resolution")}
      </span>
      {sources ? (
        <span className="text-muted-foreground flex flex-col items-center gap-0.5 font-mono text-[10px]">
          <BookOpen className="size-3.5" aria-hidden />
          {sources}
        </span>
      ) : null}
      {actions ? (
        <span className="text-muted-foreground flex flex-col items-center gap-0.5 font-mono text-[10px]">
          <Zap className="size-3.5" aria-hidden />
          {actions}
        </span>
      ) : null}
    </button>
  );
}

/**
 * A count-gated tab.
 *
 * Generic in its id so the operator pane can use its own union
 * (`brief | evidence | case`) without either screen widening the other's type.
 */
export function PaneTabButton<T extends string>({
  id,
  active,
  count,
  onSelect,
  children,
}: {
  id: T;
  active: boolean;
  count?: number;
  onSelect: (tab: T) => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      id={`pane-tab-${id}`}
      aria-selected={active}
      aria-controls={`pane-panel-${id}`}
      tabIndex={active ? 0 : -1}
      onClick={() => onSelect(id)}
      className={cn(
        "-mb-px flex items-center gap-1.5 border-b-2 px-2 py-2.5 text-xs font-medium transition-colors",
        active
          ? "border-primary text-foreground"
          : "text-muted-foreground hover:text-foreground border-transparent"
      )}
    >
      {children}
      {count ? (
        <span
          className={cn(
            "rounded-md px-1 font-mono text-[10px]",
            active ? "bg-primary/12 text-primary-ink" : "bg-muted text-muted-foreground"
          )}
        >
          {count}
        </span>
      ) : null}
    </button>
  );
}

/* ---------------------------------------------------------------- assignee - */

/**
 * Who has this, and what changed hands.
 *
 * Handover used to be a sentence in the transcript that scrolled away. Here it
 * is a STATE at the top of the pane: the block flips from the assistant to the
 * person, and says why the assistant stood down. That is the fact a worried
 * customer re-reads, and it should not require scrolling up two days of thread.
 */
function AssigneeState({
  loading,
  agentName,
  agentAvatar,
  agentId,
  aiSession,
  wsConnected,
  closed,
}: {
  loading: boolean;
  agentName: string | null;
  agentAvatar?: string | null;
  agentId?: string | null;
  aiSession: AiSessionState | null;
  wsConnected: boolean;
  closed: boolean;
}) {
  const t = useTranslations("support_ticket");
  const tCommon = useTranslations("common");

  const persona = aiSession?.enabled ? (aiSession.persona ?? null) : null;
  const assistantAssigned = !agentName && Boolean(persona);
  const name = agentName ?? persona?.name ?? null;
  const avatar = agentAvatar ?? persona?.avatar ?? null;
  const handedOver = Boolean(aiSession?.waitingForHuman);

  const role = agentName
    ? t("assigned_to_your_ticket")
    : assistantAssigned
      ? handedOver
        ? t("assistant_handed_to_team")
        : t("assistant_handling_this")
      : t("assigned_when_picked_up");

  return (
    <div className="border-border border-b p-3">
      <div className="border-border bg-card rounded-lg border p-3">
        <div className="flex items-start gap-2.5">
          <Avatar
            className={cn(
              "size-8 shrink-0",
              assistantAssigned && "ring-info/30 ring-1"
            )}
          >
            {avatar ? <AvatarImage src={avatar} alt={name ?? ""} /> : null}
            <AvatarFallback
              className={cn(
                "text-[11px] font-medium",
                assistantAssigned
                  ? "bg-info/10 text-info"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {assistantAssigned ? (
                <Bot className="size-4" aria-hidden />
              ) : name ? (
                initials(name)
              ) : (
                "—"
              )}
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
                <div className="flex min-w-0 items-center gap-1.5">
                  <p className="truncate text-sm font-medium">
                    {name ?? t("not_assigned")}
                  </p>
                  {assistantAssigned ? <AiBadge className="shrink-0" /> : null}
                </div>
                <p className="text-muted-foreground text-[11px] leading-snug">
                  {role}
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

        {/* The handover, as data rather than as a line in the transcript. */}
        {!loading && handedOver && agentName ? (
          <p className="text-subtle-foreground border-border mt-2.5 flex items-start gap-1.5 border-t pt-2.5 font-mono text-[10px] leading-relaxed">
            <Zap className="mt-px size-3 shrink-0" aria-hidden />
            <span>{t("assistant_stood_down")}</span>
          </p>
        ) : null}
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- sources - */

function SourcesTab({
  sources,
  marked,
}: {
  sources: ResolutionSource[];
  marked?: string[];
}) {
  const t = useTranslations("support_ticket");
  return (
    <section className="p-3">
      <SectionLabel>{t("cited_in_this_conversation")}</SectionLabel>
      <div className="mt-2.5 space-y-2">
        {sources.map((source) => (
          <SourceCard
            key={source.key}
            source={source}
            marked={marked?.includes(source.key)}
          />
        ))}
      </div>
    </section>
  );
}

/**
 * A cited document as something you can actually read.
 *
 * The `quote` is the whole point: it is the passage the answer rested on, it
 * was already intersected server-side against the passages genuinely retrieved
 * (so it cannot point at a document the model invented), and until now it was
 * a tooltip. Showing it means the customer can check the answer without
 * leaving the conversation — which is the difference between a citation and a
 * decoration.
 */
/* Exported for the label test. The card is the one place a citation's title is
   turned into something a customer reads, and the two things it strips — the
   model's document number and the navigation chain — are both easy to
   reintroduce by editing the string upstream. */
export function SourceCard({
  source,
  marked,
}: {
  source: ResolutionSource;
  marked?: boolean;
}) {
  const t = useTranslations("support_ticket");
  // The URL-derived trail wins when there IS a url — it is the real location.
  // Shipped documentation has none by design, and there the title's own `›`
  // chain carries the same information. See `splitSourceTitle`.
  const parsed = splitSourceTitle(source.title || "");
  const crumb = breadcrumbOf(source.url) || parsed.crumb;

  return (
    <article
      className={cn(
        "border-border bg-card rounded-lg border p-3 transition-colors",
        marked && "border-primary/40 bg-primary/[0.04]"
      )}
    >
      {crumb ? (
        <p className="text-subtle-foreground mb-1.5 flex items-center gap-1.5 font-mono text-[10px] tracking-wider uppercase">
          <BookOpen className="size-3 shrink-0" aria-hidden />
          <span className="truncate">{crumb}</span>
        </p>
      ) : null}

      <h3 className="text-sm leading-snug font-medium">
        {parsed.title || t("untitled_source")}
      </h3>

      {source.quote ? (
        <blockquote className="border-info/40 text-muted-foreground mt-2 border-s-2 ps-2.5 text-xs leading-relaxed">
          {source.quote}
        </blockquote>
      ) : null}

      <div className="mt-2.5 flex items-center gap-2">
        <p className="text-subtle-foreground min-w-0 flex-1 truncate font-mono text-[10px]">
          {t("cited_in_reply", { n: source.reply })}
          {source.time ? ` · ${formatRelativeTime(source.time)}` : ""}
        </p>
        {source.url ? (
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:text-primary-ink inline-flex shrink-0 items-center gap-1 text-[11px] font-medium underline-offset-2 hover:underline"
          >
            {t("read_in_full")}
            <ExternalLink className="size-3" aria-hidden />
          </a>
        ) : null}
      </div>
    </article>
  );
}

/**
 * `/help/withdrawals/bank-transfer` → `HELP · WITHDRAWALS`.
 *
 * Derived from the URL rather than fetched: the corpus does not send a
 * breadcrumb, and two path segments are enough to tell a customer whether they
 * are about to open a help article or a page of their own account. Returns
 * null rather than a guess when the URL is external or unparseable — a wrong
 * breadcrumb is worse than none.
 */
/*
 * `splitSourceTitle` moved to `lib/support/resolution.ts`.
 *
 * It was private to this file, and the message bubble's citation chip — the
 * OTHER surface that renders a citation's title — therefore kept printing the
 * raw string, `[n]` prefix and all. See the note on the function itself.
 */

function breadcrumbOf(url?: string): string | null {
  if (!url) return null;
  try {
    const path = url.startsWith("http")
      ? new URL(url).pathname
      : url.split("?")[0];
    const parts = path
      .split("/")
      .filter(Boolean)
      // Drop a leading locale segment — `/en/help/x` and `/help/x` are one page.
      .filter((part, index) => !(index === 0 && /^[a-z]{2}(-[a-z]{2})?$/i.test(part)));
    if (!parts.length) return null;
    return parts
      .slice(0, 2)
      .map((part) => part.replace(/[-_]+/g, " "))
      .join(" · ")
      .toUpperCase();
  } catch {
    return null;
  }
}

/* ----------------------------------------------------------------- actions - */

function ActionsTab({
  model,
  blocked,
  live,
}: {
  model: ResolutionModel;
  blocked: { key: string; text: string; blocked: string }[];
  /** Server truth for this ticket's process, or null once it is over. */
  live: LiveProcess | null;
}) {
  const t = useTranslations("support_ticket");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const walkthroughLinks = model.walkthroughs.flatMap((walkthrough) =>
    walkthrough.steps
      .filter((step) => step.url && !step.blocked)
      .map((step) => ({
        key: `${walkthrough.key}-${step.n}`,
        label: step.text,
        url: step.url as string,
      }))
  );

  const rows = [
    ...model.actions.map((action) => ({
      key: action.key,
      label: action.label,
      url: action.url,
    })),
    ...walkthroughLinks,
  ];

  return (
    <section className="p-3">
      {rows.length ? (
        <>
          <SectionLabel>{tCommon("what_you_can_do")}</SectionLabel>
          <div className="mt-2.5 space-y-1.5">
            {rows.map((row) => (
              <button
                key={row.key}
                type="button"
                onClick={() => router.push(row.url)}
                className="border-border bg-card hover:border-border-strong group flex w-full items-center gap-2 rounded-lg border p-2.5 text-start transition-colors"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-medium">
                    {row.label}
                  </span>
                  <span className="text-subtle-foreground block truncate font-mono text-[10px]">
                    {destinationOf(row.url)}
                  </span>
                </span>
                <ArrowUpRight
                  className="text-muted-foreground group-hover:text-foreground size-3.5 shrink-0 transition-colors"
                  aria-hidden
                />
              </button>
            ))}
          </div>
        </>
      ) : null}

      {/*
       * A blocked step is TEXT with a reason, never a button.
       *
       * Its route failed a server-side pre-flight, so a control here would be
       * dead on arrival — and a dead control that looks live is worse than a
       * sentence explaining what is missing.
       */}
      {blocked.length ? (
        <div className={cn(rows.length && "mt-4")}>
          <SectionLabel>{t("needs_something_first")}</SectionLabel>
          <ul className="mt-2.5 space-y-1.5">
            {blocked.map((step) => (
              <li
                key={step.key}
                className="border-border bg-muted/40 text-muted-foreground flex items-start gap-2 rounded-lg border p-2.5 text-xs leading-relaxed"
              >
                <Lock className="mt-0.5 size-3 shrink-0" aria-hidden />
                <span className="min-w-0">
                  <span className="text-foreground/90 block">{step.text}</span>
                  <span className="text-subtle-foreground">
                    {step.blocked === "verification_required"
                      ? t("needs_verification")
                      : t("not_available")}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/*
       * THE PROCESS, WITH ITS WHOLE SHAPE.
       *
       * Two things were wrong before, from one cause. The pane read
       * `message.workflow` — the blob photographed onto the message when the
       * process was PROPOSED, always at step 0, never updated — so it announced
       * "Step 1 of 3, in progress" beside a transcript card that had reconciled
       * with the server and said "All done." And that blob carries `step` but no
       * `steps`, so there was no list of them to draw even if it had been right.
       *
       * `live` is the server's answer for this ticket: every step, each marked
       * done, current or upcoming, and a null `step` once the process is over.
       * See `use-live-process.ts`.
       */}
      {live ? (
        <div className={cn((rows.length || blocked.length) && "mt-4")}>
          {/*
            A NEUTRAL heading, because the row underneath states its own status.
            "In progress" as a heading is a claim about the contents, and it was
            the wrong claim on a finished process.
          */}
          <SectionLabel>{tCommon("progress")}</SectionLabel>
          {/* The primitive, not a hand-rolled copy of it. A literal border
              and padding here is the "same object, re-typed" the ratchet
              counts, and it stops following `--card-padding-scale`. */}
          <Card padding="sm" className="mt-2.5">
            <div className="flex items-baseline justify-between gap-2">
              <span className="min-w-0 truncate text-xs font-medium">
                {live.title}
              </span>
              <span className="text-subtle-foreground shrink-0 font-mono text-[10px] tabular-nums">
                {/* Done, not "the one in hand" — off the end when none is. */}
                {t("step_n_of_m", {
                  n: live.step ? live.step.index + 1 : live.totalSteps,
                  m: live.totalSteps,
                })}
              </span>
            </div>

            {/* The whole sequence. What a customer wants from a progress panel
                is what they have already done and what is still coming — the
                difference between a process and a series of surprises. */}
            <ol className="mt-2 space-y-1.5">
              {live.steps.map((entry) => (
                <li key={entry.index} className="flex items-start gap-2">
                  <span
                    aria-hidden
                    className={cn(
                      "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full text-[9px] font-semibold",
                      entry.state === "done" && "bg-success/15 text-success",
                      entry.state === "current" &&
                        "bg-primary text-primary-foreground",
                      entry.state === "upcoming" &&
                        "bg-muted text-muted-foreground"
                    )}
                  >
                    {entry.state === "done" ? "✓" : entry.index + 1}
                  </span>
                  <span
                    className={cn(
                      "min-w-0 flex-1 text-[11px] leading-relaxed",
                      entry.state === "current"
                        ? "text-foreground font-medium"
                        : "text-muted-foreground"
                    )}
                  >
                    {entry.label}
                  </span>
                </li>
              ))}
            </ol>

            <p className="text-muted-foreground border-border mt-2 border-t pt-2 text-[11px] leading-relaxed">
              {live.step ? live.step.description : t("process_finished")}
            </p>
          </Card>
        </div>
      ) : null}

      {/*
       * Offers to act stay in the transcript on purpose. Consent belongs beside
       * the sentence that asked for it; this line only says they are there.
       */}
      {model.operations.length ? (
        <p className="text-subtle-foreground border-border mt-4 border-t pt-3 text-[11px] leading-relaxed">
          {t("operations_await_you", { count: model.operations.length })}
        </p>
      ) : null}
    </section>
  );
}

/** `/finance/wallet/deposit` → `Finance › Wallet › Deposit`. */
function destinationOf(url: string): string {
  const crumb = breadcrumbOf(url);
  if (!crumb) return url;
  return crumb
    .split(" · ")
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" › ");
}

/* ------------------------------------------------------------------ ticket - */

function TicketTab({
  ticket,
  loading,
  wsConnected,
  hasResolution,
  onSatisfaction,
}: {
  ticket: ResolutionPaneProps["ticket"];
  loading: boolean;
  wsConnected: boolean;
  hasResolution: boolean;
  onSatisfaction?: ResolutionPaneProps["onSatisfaction"];
}) {
  const t = useTranslations("support_ticket");
  const tCommon = useTranslations("common");
  const closed = ticket?.status === "CLOSED";

  return (
    <section className="space-y-4 p-3">
      <LifecycleRibbon ticket={ticket} loading={loading} />

      <div>
        <SectionLabel>{tCommon("ticket_details")}</SectionLabel>
        {/* gap-px over the border colour: one hairline between cells, no
            doubled edges, and it stays correct when a value wraps. */}
        <dl className="border-border bg-border mt-2.5 grid grid-cols-2 gap-px overflow-hidden rounded-lg border">
          <Fact
            label={tCommon("created")}
            value={
              ticket?.createdAt
                ? new Date(ticket.createdAt).toLocaleString()
                : "—"
            }
            loading={loading}
          />
          <Fact
            label={tCommon("last_update")}
            value={
              ticket?.updatedAt ? formatRelativeTime(ticket.updatedAt) : "—"
            }
            loading={loading}
          />
          {/* null until the desk answers. An em dash says "not yet"; a 0 would
              claim an instant reply. */}
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
            label={t("connection")}
            value={
              <span className="inline-flex items-center gap-1.5">
                <span
                  className={cn(
                    "size-1.5 rounded-full",
                    closed
                      ? "bg-muted-foreground/50"
                      : wsConnected
                        ? "bg-success"
                        : "bg-warning"
                  )}
                  aria-hidden
                />
                {closed
                  ? tCommon("closed")
                  : wsConnected
                    ? tCommon("live")
                    : tCommon("connecting")}
              </span>
            }
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

      {closed ? (
        <Satisfaction
          value={ticket?.satisfaction ?? null}
          onSubmit={onSatisfaction}
        />
      ) : null}

      {/*
       * The floor's one quiet line. It exists so a ticket with nothing in the
       * pane still explains what this column is FOR — otherwise the first time
       * a source appears it reads as a new feature rather than as this column
       * doing its job.
       */}
      {!hasResolution && !loading ? (
        <div className="border-border mt-2 border-t pt-4 text-center">
          <BookOpen
            className="text-border-strong mx-auto size-6"
            aria-hidden
          />
          <p className="text-muted-foreground mt-2 text-xs leading-relaxed text-balance">
            {t("resolution_collects_here")}
          </p>
        </div>
      ) : null}
    </section>
  );
}

/**
 * The lifecycle as a horizontal ribbon with a real CURRENT step.
 *
 * The vertical four-dot list it replaces could only say reached / not reached,
 * so a ticket sitting in a queue looked identical to one being worked. The
 * medallion that is neither done nor idle is the entire point.
 */
function LifecycleRibbon({
  ticket,
  loading,
}: {
  ticket: ResolutionPaneProps["ticket"];
  loading: boolean;
}) {
  const t = useTranslations("support_ticket");
  const tCommon = useTranslations("common");

  const status = ticket?.status;
  const answered =
    status === "REPLIED" || status === "OPEN" || status === "CLOSED";
  const closed = status === "CLOSED";

  const steps = [
    { key: "opened", label: tCommon("created"), done: Boolean(ticket?.createdAt) },
    { key: "answered", label: tCommon("answered"), done: answered },
    {
      key: "assigned",
      label: t("timeline_assigned"),
      done: Boolean(ticket?.agentId) || closed,
    },
    { key: "resolved", label: tCommon("resolved"), done: closed },
  ];

  // The current step is the first unfinished one — the place the ticket is
  // actually sitting. On a closed ticket there is none, which is correct.
  const current = steps.findIndex((step) => !step.done);

  return (
    <div>
      <SectionLabel>{tCommon("progress_timeline")}</SectionLabel>
      <ol className="mt-3 flex items-start">
        {steps.map((step, index) => (
          <li
            key={step.key}
            className="flex min-w-0 flex-1 flex-col items-center gap-1.5"
          >
            <div className="flex w-full items-center">
              {/* The connector into this medallion belongs to the step BEFORE
                  it, so the line can never disagree with the dots when a label
                  wraps to two lines. */}
              <Connector
                on={!loading && index > 0 && steps[index - 1].done}
                hidden={index === 0}
              />
              <span
                className={cn(
                  "grid size-5 shrink-0 place-items-center rounded-full font-mono text-[10px] transition-colors",
                  loading
                    ? "bg-muted text-muted-foreground"
                    : step.done
                      ? "bg-success text-success-foreground"
                      : index === current
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                )}
              >
                {index + 1}
              </span>
              <Connector
                on={!loading && step.done}
                hidden={index === steps.length - 1}
              />
            </div>
            <span
              className={cn(
                "w-full text-center text-[10px] leading-tight text-balance",
                !loading && (step.done || index === current)
                  ? "text-foreground"
                  : "text-muted-foreground"
              )}
            >
              {step.label}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function Connector({ on, hidden }: { on: boolean; hidden?: boolean }) {
  return (
    <span
      className={cn(
        "h-px flex-1",
        hidden ? "bg-transparent" : on ? "bg-success/40" : "bg-border"
      )}
      aria-hidden
    />
  );
}

/** One cell of a `gap-px` hairline fact grid. Exported — see `PaneHeader`. */
export function Fact({
  label,
  value,
  loading,
}: {
  label: string;
  value: ReactNode;
  loading?: boolean;
}) {
  return (
    <div className="bg-card p-2.5">
      <dt className="text-subtle-foreground font-mono text-[10px] tracking-wide uppercase">
        {label}
      </dt>
      <dd className="mt-1 text-xs font-medium">
        {loading ? <Skeleton className="h-3.5 w-20" /> : value}
      </dd>
    </div>
  );
}

/**
 * The rating, as an ASK rather than a readout.
 *
 * The old rail could render `ticket.satisfaction` and offered no way to set it,
 * so on every install the stars were decoration for a value nothing collected.
 * `PUT /review` has existed the whole time. It is one-shot server-side — a
 * second submit 400s — so the control disappears once a rating exists.
 */
function Satisfaction({
  value,
  onSubmit,
}: {
  value: number | null;
  onSubmit?: ResolutionPaneProps["onSatisfaction"];
}) {
  const t = useTranslations("support_ticket");
  const [hover, setHover] = useState(0);
  const [sending, setSending] = useState(false);

  if (value) {
    return (
      <div className="border-border border-t pt-4">
        <SectionLabel>{t("satisfaction_rating")}</SectionLabel>
        <div className="mt-2.5 flex items-center gap-2">
          <span className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((i) => (
              <Star
                key={i}
                className={cn(
                  "size-4",
                  i <= value ? "text-warning fill-current" : "text-border-strong"
                )}
                aria-hidden
              />
            ))}
          </span>
          <span className="text-muted-foreground text-xs">
            {t("you_rated", { n: value })}
          </span>
        </div>
      </div>
    );
  }

  if (!onSubmit) return null;

  return (
    <div className="border-border border-t pt-4">
      <SectionLabel>{t("how_did_we_do")}</SectionLabel>
      <div
        className="mt-2.5 flex items-center gap-1"
        onMouseLeave={() => setHover(0)}
      >
        {[1, 2, 3, 4, 5].map((i) => (
          <button
            key={i}
            type="button"
            disabled={sending}
            onMouseEnter={() => setHover(i)}
            onFocus={() => setHover(i)}
            /*
             * AWAITED, AND CLEARED IN A `finally`.
             *
             * `submitSatisfaction` goes through `$fetch`, which never throws —
             * it resolves `{ data, error }` — so the page's handler swallows a
             * failed PUT into a toast and returns without setting
             * `ticket.satisfaction`. Fire-and-forget left `sending` latched
             * true forever: every star carries `disabled={sending}` plus
             * `disabled:pointer-events-none`, and the spinner below has no
             * other writer. A customer whose rating 400'd (already rated on
             * another device), 500'd or dropped was left with five dead stars
             * and a spinner that never stopped, with no way back short of a
             * full reload — this pane is ALWAYS MOUNTED, so collapsing it,
             * reopening it or closing the sheet does not reset the state.
             *
             * On success the parent sets `ticket.satisfaction` and this
             * component re-renders as the read-only branch above, so clearing
             * the flag here is only ever observed on the failure path — which
             * is the path that needs it.
             */
            onClick={async () => {
              setSending(true);
              try {
                await onSubmit(i);
              } finally {
                setSending(false);
              }
            }}
            aria-label={t("rate_n_of_5", { n: i })}
            className="rounded-md p-0.5 transition-transform hover:scale-110 disabled:pointer-events-none"
          >
            <Star
              className={cn(
                "size-5",
                i <= hover
                  ? "text-warning fill-current"
                  : "text-border-strong hover:text-warning"
              )}
              aria-hidden
            />
          </button>
        ))}
        {sending ? (
          <Loader2 className="text-muted-foreground ms-1 size-3.5 animate-spin" />
        ) : null}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ shared - */

/**
 * Section label with a hairline running to the pane edge.
 *
 * Same mono/uppercase/tracked treatment the rail used and the mastheads use, so
 * the pane reads as instrumentation rather than as four more card titles
 * competing with the conversation.
 */
export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    /* Same rule as the system notice: the label may wrap, the hairline keeps a
       floor. A `shrink-0` label plus a long translation would overflow a 27rem
       pane, and the pane clips rather than scrolls sideways — so the overflow
       would simply be invisible. */
    <h3 className="text-subtle-foreground flex items-center gap-2 font-mono text-[11px] tracking-wider uppercase">
      <span className="min-w-0">{children}</span>
      <span className="bg-border h-px w-4 shrink-0 grow" aria-hidden />
    </h3>
  );
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

/**
 * Submit a rating. Exported so the page owns the ticket state and the pane
 * stays a rendering concern.
 */
export async function submitSatisfaction(
  ticketId: string,
  satisfaction: number
): Promise<boolean> {
  const { error } = await $fetch({
    url: `/api/user/support/ticket/${ticketId}/review`,
    method: "PUT",
    body: { satisfaction },
    silent: true,
  });
  return !error;
}
