"use client";

/**
 * The Hummingbot bot terminal — full-page workspace, one shell, two audiences.
 *
 *   ┌─ header h-10 ───────────────────────────────────────────────────────┐
 *   │ ← │ subject │ LAMP │ QUOTES FILLS VOL RISK LAST │ ●live │ actions   │
 *   ├─────────────┬────────────────────────────┬────────────────────────┬─┤
 *   │  MARKETS    │  SPREAD INSTRUMENT h-[92]  │  HEALTH                │ │
 *   │  rail w-56  │  wedge · edge · quote age  │  verdict + remedy      │ │
 *   │  → 28px     ├────────────────────────────┤  skew · touch          │ │
 *   │             │  LADDER  flex-1            │  w-72 → 28px           │ │
 *   │             ├────────────────────────────┤  (dock tab < 1024)     │ │
 *   │             │  DOCK h-56: fills/quotes/… │                        │ │
 *   └─────────────┴────────────────────────────┴────────────────────────┴─┘
 *   └─ status bar h-6: live · feed age · quoted · engines · clock ────────┘
 *
 * WHY THE LADDER IS THE CENTRE AND NOT A CHART
 * On a trading terminal the chart is the hero because the operator is deciding
 * what the price will do. Nobody decides anything here — the bot already did.
 * The question is whether it is doing it, and the wedge plus the ladder are
 * that answer made visual. A chart would show the market and say nothing about
 * the bot.
 *
 * ADMIN vs CUSTOMER is a props difference, not a second component. The admin
 * hosts the process, so it injects process controls, a host block and a log
 * tab; the customer hosts it themselves and gets an emergency stop. Neither
 * gets a layout of its own to drift.
 *
 * DELIBERATE ABSENCES: no chart, no order ticket, no buy/sell, no
 * click-to-cancel on a ladder level. Nobody trades from this page — a ticket
 * would invite an operator to fight their own bot, and pulling one of its
 * quotes accomplishes nothing because it re-quotes within the second.
 */

import { useCallback, useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Activity,
  LayoutList,
  Layers,
  ListOrdered,
  ScrollText,
  SlidersHorizontal,
  Stethoscope,
} from "lucide-react";
import { Link } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import {
  TerminalShell,
  TerminalWorkspace,
  TerminalColumn,
  TerminalPanel,
} from "@/components/terminal/panel";
import {
  TerminalHeaderBar,
  HeaderSegment,
  HeaderSpacer,
  HeaderStat,
  ConnectionDot,
  headerIconCellClass,
} from "@/components/terminal/header";
import { EmptyState, TabButton } from "@/components/terminal";
import { QuoteLadder } from "./quote-ladder";
import { FillTape } from "./fill-tape";
import { SkewGauge } from "./skew-gauge";
import { SpreadInstrument } from "./spread-instrument";
import { QuotesTable } from "./quotes-table";
import { HbMarketsRail } from "./markets-rail";
import {
  isMultiMarket,
  readVerdict,
  windowFills,
  type BotLink,
  type Verdict,
} from "./metrics";
import { useMounted } from "@/hooks/use-mounted";
import { useNow, useDrift } from "./use-now";
import { useIsPhone, useIsWide } from "./use-viewport";
import { useTerminalLayout, type DockTab } from "./use-terminal-layout";
import {
  ConsoleSymbolView,
  TradingSnapshot,
  fmtAge,
  fmtAmount,
  fmtNotional,
  fmtPrice,
} from "./types";
import { useTranslations } from "next-intl";

export { readVerdict } from "./metrics";

/* ------------------------------------------------------------------ verdict */

const VERDICT_TINT: Record<Verdict["tone"], string> = {
  success: "bg-success/10 border-success/40",
  warning: "bg-warning/10 border-warning/40",
  destructive: "bg-destructive/10 border-destructive/40",
  neutral: "bg-surface-3 border-border",
};
const VERDICT_INK: Record<Verdict["tone"], string> = {
  success: "text-success",
  warning: "text-warning",
  destructive: "text-destructive",
  neutral: "text-muted-foreground",
};
const VERDICT_ICON: Record<Verdict["tone"], typeof CheckCircle2> = {
  success: CheckCircle2,
  warning: AlertTriangle,
  destructive: AlertTriangle,
  neutral: Activity,
};

/**
 * The verdict block.
 *
 * The label rides `--foreground`, not the status token: `text-warning` on
 * `bg-warning/10` measures 3.62:1 in light mode. The hue is carried by the icon
 * and the border, which is the platform's documented workaround.
 */
function VerdictBlock({
  verdict,
  remedy,
}: {
  verdict: Verdict;
  remedy?: ReactNode;
}) {
  const Icon = VERDICT_ICON[verdict.tone];
  return (
    <div className={cn("border-b p-3", VERDICT_TINT[verdict.tone])}>
      <div className="flex items-start gap-2">
        <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", VERDICT_INK[verdict.tone])} />
        <div className="min-w-0">
          <p className="text-xs font-semibold text-foreground">{verdict.label}</p>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
            {verdict.detail}
          </p>
          {remedy && <div className="mt-2 flex flex-wrap gap-1.5">{remedy}</div>}
        </div>
      </div>
    </div>
  );
}

/** A remedy button — same visual weight as the panel chrome around it. */
export function RemedyButton({
  onClick,
  href,
  children,
}: {
  onClick?: () => void;
  href?: string;
  children: ReactNode;
}) {
  const cls =
    "inline-flex items-center gap-1 rounded border border-border bg-card px-2 py-0.5 text-[10px] font-medium text-foreground transition-colors hover:bg-surface-3 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring";
  if (href) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={cls}>
      {children}
    </button>
  );
}

/* ---------------------------------------------------------------- bot link */

/**
 * Is anything actually talking to us.
 *
 * This is the one fact a self-hosted model makes hard to see and easy to
 * misread. Every other row on this page describes ORDERS; when there are none,
 * they all go quiet together and the page looks identical whether the bot was
 * never installed, is being refused at the door, or is connected and idle.
 *
 * Two clocks, deliberately, and they are not interchangeable:
 *   `feed` in the status bar   — age of the last frame WE pushed to this browser
 *   `last request` here        — age of the last request THEIR BOT signed
 * A dead socket and a dead bot are opposite problems, and each of these
 * measures exactly one of them.
 */
const LINK_LABEL: Record<BotLink["state"], string> = {
  connected: "Connected",
  rejected: "Refused",
  silent: "Silent",
  never: "Never connected",
  "no-key": "No API key",
};
const LINK_TONE: Record<BotLink["state"], string> = {
  connected: "text-success",
  rejected: "text-destructive",
  silent: "text-warning",
  never: "text-muted-foreground",
  "no-key": "text-muted-foreground",
};

function LinkRow({ link, now }: { link: BotLink; now: number }) {
  const t = useTranslations("components");
  const dot =
    link.state === "connected"
      ? "bg-success"
      : link.state === "rejected"
        ? "bg-destructive"
        : link.state === "silent"
          ? "bg-warning"
          : "bg-muted-foreground";

  return (
    <div className="border-b border-border px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {t("bot_link")}
        </span>
        <span className="flex items-center gap-1.5 text-[11px] font-medium text-foreground">
          <span className={cn("h-1.5 w-1.5 rounded-full", dot)} />
          {LINK_LABEL[link.state]}
        </span>
      </div>
      <p className={cn("mt-1 text-[10px]", LINK_TONE[link.state])}>
        {link.lastSeenAt
          ? `Last signed request ${fmtAge(Math.max(0, now - link.lastSeenAt))} ago`
          : link.state === "no-key"
            ? t("nothing_can_authenticate_as_you_yet")
            : t("no_signed_request_has_ever_arrived")}
      </p>
    </div>
  );
}

/**
 * The state lamp — the whole page in one word.
 *
 * It is never dropped at any breakpoint. If only one cell survives a narrow
 * viewport it should be this one, because it answers the first question an
 * operator has and it answers it in a saccade.
 */
const LAMP_STYLE: Record<Verdict["tone"], string> = {
  success: "bg-success/15 text-foreground",
  warning: "bg-warning/15 text-foreground",
  destructive: "bg-destructive/15 text-foreground",
  neutral: "bg-surface-3 text-muted-foreground",
};

function StateLamp({ verdict }: { verdict: Verdict }) {
  return (
    <span
      className={cn(
        "rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        LAMP_STYLE[verdict.tone]
      )}
      title={verdict.detail}
    >
      {verdict.lamp}
    </span>
  );
}

/* ------------------------------------------------------------------- shell */

export interface BotTerminalProps {
  snapshot: TradingSnapshot | null;
  connected: boolean;
  /** Which storage blob and which dock tabs this route owns. */
  audience: "admin" | "user";
  backHref: string;
  backLabel?: string;
  /** Subject line — bot name for the admin, the account for a customer. */
  title: ReactNode;
  subtitle?: ReactNode;
  /** Right-hand header cells — process controls, emergency stop. */
  actions?: ReactNode;
  /** Admin only: host facts pinned above the markets list. */
  hostBlock?: ReactNode;
  /**
   * A log dock tab. The admin passes its supervised process log; the customer
   * passes the agent's relayed telemetry. Same slot, because they answer the
   * same question — what is the bot itself saying.
   */
  logTab?: { label: string; content: ReactNode };
  /** Customer only: the remote-control panel, as a dock tab. */
  controlTab?: ReactNode;
  /**
   * Customer only: whether their self-hosted bot is reaching the exchange.
   *
   * Absent for the admin, which supervises the process directly and therefore
   * knows something strictly better — it can read the log and the exit code.
   */
  link?: BotLink | null;
  /** Buttons offered under the verdict, chosen from `verdict.remedy`. */
  renderRemedy?: (verdict: Verdict) => ReactNode;
  /** Shown instead of the workspace when there is nothing to render. */
  unavailable?: string | null;
  /** Extra content at the bottom of the health rail. */
  asideExtra?: ReactNode;
  exhausted?: boolean;
  feedError?: string | null;
}

export function BotTerminal({
  snapshot,
  connected,
  audience,
  backHref,
  backLabel = "Back",
  title,
  subtitle,
  actions,
  hostBlock,
  logTab,
  controlTab,
  link = null,
  renderRemedy,
  unavailable,
  asideExtra,
  exhausted = false,
  feedError = null,
}: BotTerminalProps) {
  const tComponents = useTranslations("components");
  const tCommon = useTranslations("common");
  const [activeSymbol, setActiveSymbol] = useState<string | null>(null);

  const allowedTabs = useMemo<DockTab[]>(
    () =>
      audience === "admin"
        ? ["fills", "quotes", "positions", "health", "log", "ladder"]
        : ["control", "fills", "quotes", "positions", "health", "log", "ladder"],
    [audience]
  );
  const { layout, set, toggle } = useTerminalLayout(audience, allowedTabs);

  /**
   * Below `lg` the 512px of side rails leave the centre column nothing, so the
   * health rail is UNMOUNTED and becomes a dock tab. Below `sm` the frame is
   * abandoned entirely for a single-column phone stack. Both are render-time
   * decisions — neither may write to the persisted layout, or a later desktop
   * session would find a panel collapsed with no explanation.
   */
  const wideEnough = useIsWide();
  const isPhone = useIsPhone();

  // Snapshot age drives every displayed age; consumed here because the header
  // and status bar both print it. Panel bodies read their own clock.
  const driftMs = useDrift(snapshot?.at);
  const now = useNow(1000);

  const keyOf = (s: ConsoleSymbolView) => `${s.market}:${s.symbol}`;
  /**
   * THE DEFAULT SELECTION DECIDES WHAT THE VERDICT IS ABOUT.
   *
   * Everything below — the ladder, the health panel, "no mid price" — reads
   * `view`, so whichever symbol lands here is the market the operator is told
   * about. The snapshot arrives sorted alphabetically, so falling straight to
   * `symbols[0]` hands that decision to `localeCompare`: a symbol the account
   * happens to have one stale order on outranks the pair the bot is actually
   * quoting, and the page reports an empty book for a market with a full one.
   *
   * Until the operator picks one, prefer a market with a two-sided book, then
   * one we are quoting, then anything. `symbols[0]` remains the last resort so
   * a single bookless market still renders rather than blanking the page.
   */
  const view = useMemo(() => {
    const all = snapshot?.symbols;
    if (!all?.length) return null;
    const chosen = all.find((s) => keyOf(s) === activeSymbol);
    if (chosen) return chosen;
    return (
      all.find((s) => s.bestBid != null && s.bestAsk != null) ??
      all.find((s) => s.bids.length > 0 || s.asks.length > 0) ??
      all[0]
    );
  }, [snapshot, activeSymbol]);

  const verdict = useMemo(
    () => (snapshot ? readVerdict(snapshot, view, driftMs, link) : null),
    [snapshot, view, driftMs, link]
  );

  const fills = useMemo(() => {
    if (!snapshot) return [];
    if (!view) return snapshot.fills;
    return snapshot.fills.filter(
      (f) => f.symbol === view.symbol && f.market === view.market
    );
  }, [snapshot, view]);

  /**
   * The ladder's empty state is the largest thing on the page when there is
   * nothing to draw, so it should not spend that space restating the obvious.
   * "This account has no resting orders" is a caption for the emptiness; for
   * someone who has never connected a bot it is not the reason for it.
   */
  const emptyHint = useMemo(() => {
    if (!snapshot) return undefined;
    if (link?.state === "no-key" || link?.state === "never") {
      return "No bot has connected to this account yet. As soon as one places an order, its quotes appear here — usually within a second.";
    }
    if (link?.state === "rejected") {
      return "Requests signed as you are being refused, so nothing can be placed. The health panel says why.";
    }
    return "This account has no resting orders. The ladder fills in as soon as the bot quotes.";
  }, [snapshot, link]);

  const multi = isMultiMarket(snapshot);
  /**
   * The account-wide figures describe MORE than the panel under them once the
   * bot runs two pairs. Unlabelled, a two-market operator reads the header as
   * describing the ladder.
   */
  const scope = multi ? " ·all" : "";

  /**
   * A maximized panel is `fixed inset-0 z-50`, so it covers any dialog opened
   * afterwards — including the kill switch. Routes dispatch this before opening
   * an overlay; panels listen and restore themselves.
   */
  const beforeOverlay = useCallback(() => {
    window.dispatchEvent(new CustomEvent("hb-terminal:restore-panels"));
  }, []);

  const healthContent = (
    <>
      {verdict && (
        <VerdictBlock verdict={verdict} remedy={renderRemedy?.(verdict)} />
      )}
      {link && <LinkRow link={link} now={now} />}
      <SkewGauge view={view} fills={fills} className="border-b border-border" />
      {view && (
        <div className="divide-y divide-border">
          <StatRow label={tComponents("best_bid")} value={fmtPrice(view.bestBid)} tone="up" />
          <StatRow label={tComponents("best_ask")} value={fmtPrice(view.bestAsk)} tone="down" />
          <StatRow
            label={tComponents("your_bid")}
            value={fmtPrice(view.ourBid)}
            tone={view.ourBid != null ? "accent" : "muted"}
          />
          <StatRow
            label={tComponents("your_ask")}
            value={fmtPrice(view.ourAsk)}
            tone={view.ourAsk != null ? "accent" : "muted"}
          />
        </div>
      )}
      {asideExtra}
    </>
  );

  const positionsContent = <PositionsTable snapshot={snapshot} />;

  /**
   * The stored tab, resolved against what THIS viewport can actually render.
   *
   * One field serves both layouts, so a phone session can store `ladder` (which
   * the desktop dock does not offer, since the dock sits under the ladder) and
   * a narrow session can store `health` (which the wide layout shows in its own
   * rail). Resolving once here keeps the tab strip's active state and the body
   * from ever disagreeing — a highlighted tab over unrelated content is worse
   * than the wrong tab.
   */
  const desktopTab: DockTab = useMemo(() => {
    if (layout.dockTab === "ladder") return "fills";
    if (layout.dockTab === "health" && wideEnough) return "fills";
    if (layout.dockTab === "log" && !logTab) return "fills";
    if (layout.dockTab === "control" && !controlTab) return "fills";
    return layout.dockTab;
  }, [layout.dockTab, wideEnough, logTab, controlTab]);

  return (
    <TerminalShell>
      <TerminalHeaderBar>
        <Link
          href={backHref}
          aria-label={backLabel}
          title={backLabel}
          className={headerIconCellClass}
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>

        {/* The only shrinkable cell — the designated pressure valve, so growth
            elsewhere clips a truncated name and never a control. */}
        <div className="flex h-10 min-w-0 flex-1 items-center gap-2 border-l border-border px-3">
          <span className="truncate text-xs font-semibold text-foreground">{title}</span>
          {subtitle}
          {verdict && <StateLamp verdict={verdict} />}
        </div>

        <HeaderStat
          label={tComponents("quotes", { scope: String(scope) })}
          value={snapshot ? snapshot.stats.openOrders : "—"}
          minWidth="min-w-[34px]"
          tone={snapshot?.stats.twoSided ? "up" : undefined}
          hint={
            multi
              ? tComponents("orders_resting_across_every_market_this")
              : tComponents("orders_resting_on_the_book_right_now")
          }
          className="hidden md:flex"
        />
        <HeaderStat
          label={tComponents("fills_5m", { scope: String(scope) })}
          value={snapshot ? snapshot.stats.fills5m : "—"}
          minWidth="min-w-[34px]"
          tone={snapshot && snapshot.stats.fills5m > 0 ? "accent" : undefined}
          hint={multi ? tComponents("across_every_market_on_this_account") : undefined}
          className="hidden md:flex"
        />
        <HeaderStat
          label={tComponents("vol_5m", { scope: String(scope) })}
          value={snapshot ? fmtNotional(snapshot.stats.volume5m) : "—"}
          minWidth="min-w-[56px]"
          className="hidden lg:flex"
        />
        <HeaderStat
          label={tComponents("at_risk", { scope: String(scope) })}
          value={snapshot ? fmtNotional(snapshot.stats.notionalAtRisk) : "—"}
          minWidth="min-w-[56px]"
          hint={tComponents("quote_currency_value_still_resting_on_the_book")}
          className="hidden lg:flex"
        />
        <HeaderStat
          label={tComponents("last_fill")}
          value={snapshot?.stats.lastFillAt ? fmtAge(now - snapshot.stats.lastFillAt) : "never"}
          minWidth="min-w-[48px]"
          className="hidden xl:flex"
        />

        {/* State-dependent cell at the END of the left group, so it expands into
            the spacer and displaces nothing when it changes. */}
        <HeaderSegment divider>
          <ConnectionDot connected={connected && !exhausted} label={connected ? tCommon("live") : tCommon("off")} />
        </HeaderSegment>

        <HeaderSpacer />
        {actions}
      </TerminalHeaderBar>

      {exhausted && (
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-destructive/40 bg-destructive/10 px-3 py-1.5">
          <span className="flex items-center gap-2 text-xs text-foreground">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-destructive" />
            {tComponents("live_feed_stopped_everything_below_is")}
          </span>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="shrink-0 rounded border border-border bg-card px-2 py-0.5 text-[11px] font-medium text-foreground transition-colors hover:bg-surface-3"
          >
            Reload
          </button>
        </div>
      )}

      {unavailable ? (
        <div className="flex min-h-0 flex-1 items-center justify-center bg-background p-6">
          <div className="max-w-md text-center">
            <AlertTriangle className="mx-auto h-6 w-6 text-warning" />
            <p className="mt-3 text-sm font-medium text-foreground">{tComponents("nothing_to_show")}</p>
            <p className="mt-1 text-xs text-muted-foreground">{unavailable}</p>
          </div>
        </div>
      ) : isPhone ? (
        /* The desktop frame is abandoned rather than compressed — 512px of
           rails does not fit a 390px screen at any breakpoint. One full-width
           view at a time, chosen from a tab strip. */
        <PhoneWorkspace
          snapshot={snapshot}
          view={view}
          fills={fills}
          driftMs={driftMs}
          tab={layout.dockTab}
          onTab={(t) => set("dockTab", t)}
          logTab={logTab}
          healthContent={healthContent}
          positionsContent={positionsContent}
          onSelectSymbol={setActiveSymbol}
          activeKey={view ? keyOf(view) : null}
          emptyHint={emptyHint}
          controlTab={controlTab}
        />
      ) : (
        <TerminalWorkspace>
          <TerminalPanel
            title="Markets"
            side="left"
            collapsed={layout.railCollapsed}
            onToggle={() => toggle("railCollapsed")}
            className="w-56"
            contentClassName="flex min-h-0 flex-col overflow-y-auto scrollbar-none"
          >
            <HbMarketsRail
              snapshot={snapshot}
              activeKey={view ? keyOf(view) : null}
              onSelect={setActiveSymbol}
              driftMs={driftMs}
              hostBlock={hostBlock}
            />
          </TerminalPanel>

          <TerminalColumn className="flex-1">
            <TerminalPanel
              title={view ? tComponents("your_quotes", { symbol: String(view.symbol) }) : tComponents("ladder")}
              className="min-h-0 flex-1"
              maximizable
              onRestoreRequest={beforeOverlay}
              contentClassName="flex min-h-0 flex-1 flex-col overflow-hidden"
            >
              {view ? (
                <>
                  <SpreadInstrument view={view} driftMs={driftMs} />
                  <QuoteLadder view={view} driftMs={driftMs} />
                </>
              ) : (
                <EmptyState
                  icon={<Layers className="h-6 w-6" />}
                  title={snapshot ? tComponents("nothing_on_the_book") : `${tCommon("connecting")}…`}
                  hint={emptyHint}
                />
              )}
            </TerminalPanel>

            <TerminalPanel
              title="Activity"
              side="bottom"
              collapsed={layout.dockCollapsed}
              onToggle={() => toggle("dockCollapsed")}
              keepMountedWhenCollapsed
              className="h-56 shrink-0"
              contentClassName="flex min-h-0 flex-1 flex-col overflow-hidden"
            >
              <div className="flex shrink-0 overflow-x-auto border-b border-border bg-surface-2 scrollbar-none">
                {controlTab && (
                  <TabButton
                    active={desktopTab === "control"}
                    onClick={() => set("dockTab", "control")}
                    icon={<SlidersHorizontal className="mr-1.5 h-3.5 w-3.5" />}
                  >
                    Control
                  </TabButton>
                )}
                <TabButton
                  active={desktopTab === "fills"}
                  onClick={() => set("dockTab", "fills")}
                  icon={<LayoutList className="mr-1.5 h-3.5 w-3.5" />}
                >
                  Fills
                </TabButton>
                <TabButton
                  active={desktopTab === "quotes"}
                  onClick={() => set("dockTab", "quotes")}
                  icon={<ListOrdered className="mr-1.5 h-3.5 w-3.5" />}
                >
                  Quotes
                </TabButton>
                <TabButton
                  active={desktopTab === "positions"}
                  onClick={() => set("dockTab", "positions")}
                  icon={<Layers className="mr-1.5 h-3.5 w-3.5" />}
                >
                  Positions
                </TabButton>
                {/* The health rail's content, only while it is unmounted — so
                    the words are never unreachable, and never duplicated. */}
                {!wideEnough && (
                  <TabButton
                    active={desktopTab === "health"}
                    onClick={() => set("dockTab", "health")}
                    icon={<Stethoscope className="mr-1.5 h-3.5 w-3.5" />}
                  >
                    Health
                  </TabButton>
                )}
                {logTab && (
                  <TabButton
                    active={desktopTab === "log"}
                    onClick={() => set("dockTab", "log")}
                    icon={<ScrollText className="mr-1.5 h-3.5 w-3.5" />}
                  >
                    {logTab.label}
                  </TabButton>
                )}
              </div>

              <DockBody
                tab={desktopTab}
                fills={fills}
                view={view}
                driftMs={driftMs}
                logTab={logTab}
                controlTab={controlTab}
                healthContent={healthContent}
                positionsContent={positionsContent}
              />
            </TerminalPanel>
          </TerminalColumn>

          {wideEnough && (
            <TerminalPanel
              title="Health"
              side="right"
              collapsed={layout.asideCollapsed}
              onToggle={() => toggle("asideCollapsed")}
              className="w-72"
              contentClassName="overflow-y-auto scrollbar-none"
            >
              {healthContent}
            </TerminalPanel>
          )}
        </TerminalWorkspace>
      )}

      <StatusBar
        connected={connected}
        exhausted={exhausted}
        feedError={feedError}
        driftMs={driftMs}
        snapshot={snapshot}
        now={now}
      />
    </TerminalShell>
  );
}

/**
 * Dock body. `tab` arrives already resolved against this viewport's
 * capabilities, so the strip's active state and the body can never disagree.
 */
function DockBody({
  tab,
  fills,
  view,
  driftMs,
  logTab,
  controlTab,
  healthContent,
  positionsContent,
}: {
  tab: DockTab;
  fills: TradingSnapshot["fills"];
  view: ConsoleSymbolView | null;
  driftMs: number;
  logTab?: { label: string; content: ReactNode };
  controlTab?: ReactNode;
  healthContent: ReactNode;
  positionsContent: ReactNode;
}) {
  if (tab === "control" && controlTab) return <>{controlTab}</>;
  if (tab === "log" && logTab) return <>{logTab.content}</>;
  if (tab === "quotes") return <QuotesTable view={view} driftMs={driftMs} />;
  if (tab === "positions") return <>{positionsContent}</>;
  if (tab === "health") {
    return <div className="min-h-0 flex-1 overflow-y-auto scrollbar-none">{healthContent}</div>;
  }
  return (
    <FillTape
      fills={fills}
      emptyHint="A row appears the moment someone trades against one of your quotes."
    />
  );
}

/**
 * The phone layout: one full-width view at a time behind a tab strip.
 *
 * The ladder is the default because it is still the answer to the first
 * question, and it is the one view that survives a narrow column intact — its
 * three columns are already only ~40 characters wide. The markets list becomes
 * a horizontal chip strip rather than a rail, so switching pairs stays one tap.
 */
function PhoneWorkspace({
  snapshot,
  view,
  fills,
  driftMs,
  tab,
  onTab,
  logTab,
  healthContent,
  positionsContent,
  onSelectSymbol,
  activeKey,
  emptyHint,
  controlTab,
}: {
  snapshot: TradingSnapshot | null;
  view: ConsoleSymbolView | null;
  fills: TradingSnapshot["fills"];
  driftMs: number;
  tab: DockTab;
  onTab: (t: DockTab) => void;
  logTab?: { label: string; content: ReactNode };
  healthContent: ReactNode;
  positionsContent: ReactNode;
  onSelectSymbol: (key: string) => void;
  activeKey: string | null;
  emptyHint?: string;
  controlTab?: ReactNode;
}) {
  const t = useTranslations("components");
  const tCommon = useTranslations("common");
  const keyOf = (s: ConsoleSymbolView) => `${s.market}:${s.symbol}`;
  // Everything except the phone-only `ladder` is renderable here, so the only
  // resolution needed is a stored `log` on a route that has none.
  const effective = tab === "log" && !logTab ? "ladder" : tab;

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-background">
      {snapshot && snapshot.symbols.length > 1 && (
        <div className="flex shrink-0 gap-px overflow-x-auto border-b border-border bg-surface-2 scrollbar-none">
          {snapshot.symbols.map((s) => (
            <button
              key={keyOf(s)}
              type="button"
              onClick={() => onSelectSymbol(keyOf(s))}
              className={cn(
                "flex shrink-0 items-center gap-1.5 border-b-2 px-2.5 py-1.5 text-[11px] font-medium transition-colors",
                keyOf(s) === activeKey
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground"
              )}
            >
              {s.symbol}
            </button>
          ))}
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden border-b border-border bg-card">
        {effective === "control" && controlTab ? (
          <>{controlTab}</>
        ) : effective === "health" ? (
          <div className="min-h-0 flex-1 overflow-y-auto scrollbar-none">{healthContent}</div>
        ) : effective === "fills" ? (
          <FillTape fills={fills} emptyHint="Fills appear here as they happen." />
        ) : effective === "quotes" ? (
          <QuotesTable view={view} driftMs={driftMs} />
        ) : effective === "positions" ? (
          <>{positionsContent}</>
        ) : effective === "log" && logTab ? (
          <>{logTab.content}</>
        ) : view ? (
          <>
            <SpreadInstrument view={view} driftMs={driftMs} />
            <QuoteLadder view={view} driftMs={driftMs} levels={7} />
          </>
        ) : (
          <EmptyState
            icon={<Layers className="h-6 w-6" />}
            title={snapshot ? t("nothing_on_the_book") : `${tCommon("connecting")}…`}
            hint={emptyHint}
          />
        )}
      </div>

      {/* Bottom tab bar — thumb-reachable, unlike a strip under the header. */}
      <div className="flex shrink-0 items-stretch overflow-x-auto border-t border-border bg-card scrollbar-none">
        {controlTab && (
          <PhoneTab
            active={effective === "control"}
            onClick={() => onTab("control")}
            icon={SlidersHorizontal}
            label="Control"
          />
        )}
        <PhoneTab active={effective === "ladder"} onClick={() => onTab("ladder" as DockTab)} icon={Layers} label="Ladder" />
        <PhoneTab active={effective === "fills"} onClick={() => onTab("fills")} icon={LayoutList} label="Fills" />
        <PhoneTab active={effective === "quotes"} onClick={() => onTab("quotes")} icon={ListOrdered} label="Quotes" />
        <PhoneTab active={effective === "health"} onClick={() => onTab("health")} icon={Stethoscope} label="Health" />
        {logTab && (
          <PhoneTab active={effective === "log"} onClick={() => onTab("log")} icon={ScrollText} label="Log" />
        )}
      </div>
    </div>
  );
}

function PhoneTab({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Layers;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-1 flex-col items-center gap-0.5 border-t-2 py-1.5 text-[9px] font-medium transition-colors",
        active ? "border-primary text-foreground" : "border-transparent text-muted-foreground"
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function PositionsTable({ snapshot }: { snapshot: TradingSnapshot | null }) {
  const t = useTranslations("components");
  const tCommon = useTranslations("common");
  const positions = snapshot?.positions ?? [];
  if (!positions.length) {
    return (
      <EmptyState
        compact
        icon={<Layers className="h-5 w-5" />}
        title={tCommon("book_is_empty")}
        hint={t("perpetual_positions_the_bot_is_carrying")}
      />
    );
  }
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="grid shrink-0 grid-cols-5 border-b border-border bg-surface-2 px-2 py-1 text-[9px] font-medium uppercase tracking-wide text-subtle-foreground">
        <span>Symbol</span>
        <span className="text-center">Side</span>
        <span className="text-center">Size</span>
        <span className="text-center">Entry</span>
        <span className="text-right">Unrealized</span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-none">
        {positions.map((p) => (
          <div
            key={p.id}
            className="grid grid-cols-5 border-b border-border px-2 py-1 text-[11px] transition-colors hover:bg-surface-3/60"
          >
            <span className="truncate font-medium text-foreground">{p.symbol}</span>
            <span className={cn("text-center", p.side === "BUY" ? "text-up" : "text-down")}>
              {p.side === "BUY" ? tCommon("long") : tCommon("short")}
              {p.leverage ? ` ${p.leverage}x` : ""}
            </span>
            <span className="text-center font-mono tabular-nums text-foreground">
              {fmtAmount(p.amount)}
            </span>
            <span className="text-center font-mono tabular-nums text-foreground">
              {fmtPrice(p.entryPrice)}
            </span>
            <span
              className={cn(
                "text-right font-mono tabular-nums",
                p.unrealizedPnl >= 0 ? "text-up" : "text-down"
              )}
            >
              {p.unrealizedPnl >= 0 ? "+" : ""}
              {fmtNotional(p.unrealizedPnl)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * The bottom status bar.
 *
 * It exists for one reason: without it a frozen socket and a quiet market look
 * exactly the same. Frames are pushed only on change, so "no new data" is the
 * normal state of a healthy idle bot — silence cannot be read as a fault, and a
 * fault cannot be read at all. `feed` is the age of the last frame received and
 * is the only thing on the page that tells the two apart. It is deliberately
 * distinct from quote age, which measures the BOT; this measures the SOCKET,
 * and they demand opposite responses.
 *
 * THE WALL CLOCK IS THE ONE THING HERE THAT CANNOT BE SERVER-RENDERED.
 * Everything else in this footer derives from `snapshot`, which is null until
 * the socket delivers — so the server has nothing to disagree with. The clock
 * does not: `useNow` seeds from `Date.now()` and `toLocaleTimeString` resolves
 * against the RUNTIME's locale and timezone, so the server painted its own wall
 * time, in its own zone, into the HTML. That is a hydration mismatch on every
 * single load — React reported it, threw the server's tree away and rebuilt the
 * whole terminal on the client — and on a server running UTC it was not even a
 * near miss: the markup shipped a time hours away from the reader's.
 *
 * So it renders a placeholder until mounted. Same width (tabular-nums, same
 * glyph count), so nothing shifts when the real time arrives one frame later.
 */
function StatusBar({
  connected,
  exhausted,
  feedError,
  driftMs,
  snapshot,
  now,
}: {
  connected: boolean;
  exhausted: boolean;
  feedError: string | null;
  driftMs: number;
  snapshot: TradingSnapshot | null;
  now: number;
}) {
  const t = useTranslations("components");
  const tCommon = useTranslations("common");
  const mounted = useMounted();
  // Thresholds sit well past the server's own idle heartbeat, so a healthy
  // idle bot never shows amber.
  const feedTone =
    !connected || exhausted
      ? "text-destructive"
      : driftMs > 90_000
        ? "text-destructive"
        : driftMs > 45_000
          ? "text-warning"
          : "text-muted-foreground";

  const recent = snapshot ? windowFills(snapshot.fills, now).length : 0;

  return (
    <footer className="flex h-6 shrink-0 items-center justify-between gap-3 border-t border-border bg-card px-3 text-[10px]">
      <span className="flex items-center gap-3">
        <ConnectionDot
          connected={connected && !exhausted}
          label={exhausted ? tCommon("stopped") : connected ? tCommon("live") : tCommon("reconnecting")}
        />
        <span
          className={cn("font-mono tabular-nums", feedTone)}
          title={t("age_of_the_last_frame_received")}
        >
          feed {snapshot ? fmtAge(driftMs) : "—"}
        </span>
        {snapshot && (
          <span className="hidden text-muted-foreground sm:inline">
            {snapshot.stats.quotedSymbols} quoted · {recent} fills/5m
          </span>
        )}
      </span>

      {feedError && <span className="truncate text-destructive">{feedError}</span>}

      <span className="font-mono tabular-nums text-muted-foreground">
        {mounted ? new Date(now).toLocaleTimeString(undefined, { hour12: false }) : "--:--:--"}
      </span>
    </footer>
  );
}

function StatRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "up" | "down" | "accent" | "muted";
}) {
  return (
    <div className="flex items-center justify-between gap-2 px-3 py-1.5">
      <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span
        className={cn(
          "font-mono text-xs tabular-nums",
          tone === "up" && "text-up",
          tone === "down" && "text-down",
          tone === "accent" && "text-primary",
          tone === "muted" && "text-muted-foreground",
          !tone && "text-foreground"
        )}
      >
        {value}
      </span>
    </div>
  );
}
