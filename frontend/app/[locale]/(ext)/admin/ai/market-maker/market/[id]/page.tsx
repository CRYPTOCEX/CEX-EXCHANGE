"use client";

/**
 * WHO — the operator who owns this synthetic market. Every price, order and
 *       trade on the pair is produced by this market maker, and the pool behind
 *       it is the platform's own capital.
 * WHAT — decides whether this one market is doing its job right now: is the
 *       engine allowed to trade it at all, is the price still inside the range
 *       they configured, and has the pool been pushed to one side.
 * CLICK — the gate that is closed (fund the pool, activate bots, reset the daily
 *       counters, widen the range), or start/pause/stop the market outright.
 *
 * ---------------------------------------------------------------------------
 * WHAT THIS REPLACED, AND WHY IT WAS HARD TO USE
 *
 * The page was four tabs over a heading, and the FIRST tab was a read-only copy
 * of the other three. "Price settings", "Trading config" and "Safety settings"
 * restated the Configuration tab; "Pool summary" and "P&L summary" restated the
 * Pool tab; "Volume stats" restated the progress bar in the heading directly
 * above it. Every figure on Overview was editable somewhere else, and nothing
 * said where — so reading a number and wanting to change it meant guessing which
 * of three other tabs owned it. That is the "easy to get lost".
 *
 * It also carried FOUR KPI rows. The heading had four `StatsCard`s, Pool had its
 * own four, Bots had its own four, and TVL and P&L appeared twice on screen at
 * once in two different formats. R3 allows one row per page.
 *
 * And the single most important thing the page had to say — *why isn't this
 * market trading* — was in a `group-hover` tooltip on a disabled button, built
 * from a rule (`pool > 0 && bots.length > 0`) that was not the engine's rule.
 * `MarketInstance.passesTradeGates()` needs TWO ACTIVE bots, needs a funded pool
 * only when real liquidity is switched on, and stops dead when the daily volume
 * budget is spent. A market could sit at ACTIVE, green, doing nothing, with this
 * page reporting no problem at all.
 *
 * WHAT IT IS NOW
 *
 *  - A masthead in the console's own three tiers — provenance, identity, state —
 *    so the addon's dashboard and its record page are recognisably one product.
 *    The state tier is two instruments: where price sits in its range, and how
 *    much of today's volume budget is left. Both are trade GATES, both are
 *    continuous, and both stay visible from every tab.
 *  - The gate verdict comes from `utils/assessment.ts` on the server — the same
 *    function the dashboard ranks markets with. The console says "not quoting ·
 *    pool"; this page opens with that same sentence and a button that fixes it.
 *  - One KPI row, every tile clickable through to the tab that owns it.
 *  - Four tabs that no longer overlap: state and activity, liquidity, bots,
 *    configuration. The active tab is in the URL, so a link can point at the
 *    remedy and the browser's Back button works inside the page.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState, use } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  Bot,
  Coins,
  Droplets,
  LayoutDashboard,
  Pause,
  Play,
  RefreshCw,
  Scale,
  Settings,
  Square,
  TrendingUp,
  Wallet,
} from "lucide-react";

import { $fetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Link, useRouter } from "@/i18n/routing";
import { useUserStore } from "@/store/user";
import WebSocketManager from "@/utils/ws";
import { PageHeader, PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatsCard, statsCardColors } from "@/components/ui/card/stats-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Loadable } from "@/components/ui/skeleton";
import ErrorBoundary from "@/components/error-boundary";

import { PoolManagement } from "../../components/PoolManagement";
import { BotManagement, LiveEvent } from "../../components/BotManagement";
import { MarketConfig } from "../../components/MarketConfig";
import { MarketOverview } from "../../components/MarketOverview";
import { BudgetMeter, PriceBandMeter, type BandState } from "../../components/instruments";

// ---------------------------------------------------------------------------
// Payload
// ---------------------------------------------------------------------------

/** The server's verdict on this market. See `backend .../utils/assessment.ts`. */
interface Assessment {
  band: BandState;
  bandPosition: number | null;
  targetPosition: number | null;
  quoting: boolean;
  blockers: ("bots" | "pool" | "budget")[];
  inventory: {
    baseShare: number;
    fundedBaseShare: number;
    skew: number;
  } | null;
}

interface MarketMakerData {
  id: string;
  marketId?: string;
  status: string;
  targetPrice: string;
  priceRangeLow: string;
  priceRangeHigh: string;
  aggressionLevel: string;
  realLiquidityPercent: number;
  maxDailyVolume: string;
  currentDailyVolume: string;
  pauseOnHighVolatility?: boolean;
  volatilityThreshold: number;
  /** Last price the running engine checkpointed; null until it has ticked. */
  lastKnownPrice?: string | number | null;
  assessment?: Assessment;
  market?: { symbol?: string; currency: string; pair: string };
  pool?: {
    id: string;
    baseCurrencyBalance?: string;
    quoteCurrencyBalance?: string;
    totalValueLocked: string;
    realizedPnL: string;
    unrealizedPnL: string;
  };
  bots?: any[];
  recentActivity?: any[];
}

type TabId = "overview" | "pool" | "bots" | "config";

const TAB_IDS: TabId[] = ["overview", "pool", "bots", "config"];

/**
 * The dialog copy for each status action, keyed by the verb the endpoint takes.
 * Declared once so the confirmation, the toast and the button cannot disagree
 * about what is being done (R6 part 1).
 */
type StatusAction = "START" | "PAUSE" | "STOP" | "RESUME";

export default function MarketDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const t = useTranslations("ext_admin_ai_market-maker");
  const tCommon = useTranslations("common");
  const tExtAdmin = useTranslations("ext_admin");
  const tExt = useTranslations("ext");
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useUserStore();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [data, setData] = useState<MarketMakerData | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [liveEvents, setLiveEvents] = useState<LiveEvent[]>([]);
  const wsManagerRef = useRef<WebSocketManager | null>(null);

  const requestedTab = searchParams.get("tab") as TabId | null;
  const [activeTab, setActiveTab] = useState<TabId>(
    requestedTab && TAB_IDS.includes(requestedTab) ? requestedTab : "overview"
  );

  const [pendingAction, setPendingAction] = useState<StatusAction | null>(null);
  const [actionRunning, setActionRunning] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetRunning, setResetRunning] = useState(false);

  // Track seen event keys to deduplicate
  const seenEventKeys = useRef<Set<string>>(new Set());
  // Ref for the message handler, so the socket does not reconnect per render.
  const handleWsMessageRef = useRef<(message: any) => void>(() => {});

  /**
   * THE TAB LIVES IN THE URL.
   *
   * `history.replaceState` rather than the router: this is the same document and
   * the same data, so a Next navigation would re-run the route for a value only
   * this component reads. What it buys is real — a blocker alert can link
   * straight at the tab that fixes it, an operator can send that link to a
   * colleague, and Back leaves the page instead of silently doing nothing.
   */
  const selectTab = useCallback(
    (next: string) => {
      const tab = (TAB_IDS as string[]).includes(next) ? (next as TabId) : "overview";
      setActiveTab(tab);
      if (typeof window === "undefined") return;
      const url = new URL(window.location.href);
      url.searchParams.set("tab", tab);
      window.history.replaceState(null, "", url.toString());
    },
    []
  );

  useEffect(() => {
    handleWsMessageRef.current = (message: any) => {
      if (message.stream === "ai-market-maker-data" && message.data) {
        setData((prev) => {
          const next = prev ? { ...prev, ...message.data } : message.data;
          // The socket omits the market relation on some pushes; never let a
          // live update blank the pair the whole page is titled with.
          next.market = message.data.market || prev?.market;
          return next;
        });
        setLastUpdated(new Date().toISOString());
      } else if (message.stream === "ai-market-maker-event" && message.data) {
        const event = message.data as LiveEvent;

        const dataId =
          event.data?.tradeId || event.data?.orderId || event.data?.id || "";
        const eventKey = `${event.timestamp}-${event.type}-${dataId}`;
        if (seenEventKeys.current.has(eventKey)) return;

        seenEventKeys.current.add(eventKey);
        if (seenEventKeys.current.size > 200) {
          const keysArray = Array.from(seenEventKeys.current);
          seenEventKeys.current = new Set(keysArray.slice(-100));
        }

        setLiveEvents((prev) => [event, ...prev.slice(0, 49)]);
        setLastUpdated(new Date().toISOString());

        if (event.type === "TRADE") {
          const { amount, price, buyBotId, sellBotId } = event.data;
          const tradeValue = Number(amount) * Number(price);

          setData((prevData) => {
            if (!prevData) return prevData;
            const updatedBots = prevData.bots?.map((bot: any) => {
              if (bot.id === buyBotId || bot.id === sellBotId) {
                return {
                  ...bot,
                  dailyTradeCount: (bot.dailyTradeCount || 0) + 1,
                  totalVolume: (Number(bot.totalVolume) || 0) + tradeValue,
                };
              }
              return bot;
            });
            const newDailyVolume =
              (Number(prevData.currentDailyVolume) || 0) + Number(amount);
            return {
              ...prevData,
              bots: updatedBots,
              currentDailyVolume: newDailyVolume.toString(),
            };
          });
        } else if (event.type === "STATUS_CHANGE") {
          toast.info(t("status_changed_to", { newStatus: String(event.data.newStatus) }));
        }
      }
    };
  });

  const fetchMarketData = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const { data: payload, error } = await $fetch({
        url: `/api/admin/ai/market-maker/market/${id}`,
        silent: true,
      });

      // `$fetch` resolves to `{data, error}` and never throws, so this is the
      // only place a failure can be caught.
      if (error) {
        setErrorText(
          typeof error === "string" ? error : tExtAdmin("refresh_failed")
        );
      } else if (payload) {
        setData(payload as MarketMakerData);
        setErrorText(null);
        setLastUpdated(new Date().toISOString());
      }

      setLoading(false);
      setRefreshing(false);
    },
    [id, tExtAdmin]
  );

  useEffect(() => {
    fetchMarketData();
  }, [fetchMarketData]);

  // WebSocket — stable across handler changes, torn down on id/user change.
  useEffect(() => {
    if (!user?.id) return;

    const wsManager = new WebSocketManager(
      `/api/admin/ai/market-maker/market?userId=${user.id}`
    );
    wsManagerRef.current = wsManager;

    wsManager.on("open", () => {
      setWsConnected(true);
      wsManager.send({ action: "SUBSCRIBE", payload: { marketMakerId: id } });
    });
    wsManager.on("close", () => setWsConnected(false));
    wsManager.on("message", (message: any) => {
      handleWsMessageRef.current?.(message);
    });
    wsManager.connect();

    return () => {
      wsManager.manualDisconnect = true;
      if (wsManager.isConnected()) {
        try {
          wsManager.send({
            action: "UNSUBSCRIBE",
            payload: { marketMakerId: id },
          });
        } catch {
          /* the socket is going away regardless */
        }
      }
      wsManager.disconnect();
      wsManagerRef.current = null;
    };
  }, [id, user?.id]);

  // -------------------------------------------------------------------------
  // Derived state
  // -------------------------------------------------------------------------

  /**
   * ONE PENDING VIEW OBJECT, NOT TWENTY OPTIONAL CHAINS.
   *
   * `Partial<>` makes every field explicitly optional, so the compiler names
   * each site that assumed a value and each of those gets a `<Loadable>` rather
   * than a `?? 0` that would render a confident zero.
   */
  const mm: Partial<MarketMakerData> = data ?? {};
  const assessment = mm.assessment;
  const quote = mm.market?.pair ?? "";
  const base = mm.market?.currency ?? "";
  const symbol = base && quote ? `${base}/${quote}` : null;

  const bots = mm.bots ?? [];
  const activeBots = bots.filter((bot: any) => bot.status === "ACTIVE").length;
  const tvl = Number(mm.pool?.totalValueLocked || 0);
  const totalPnL =
    Number(mm.pool?.realizedPnL || 0) + Number(mm.pool?.unrealizedPnL || 0);
  const usedVolume = Number(mm.currentDailyVolume || 0);
  const budget = Number(mm.maxDailyVolume || 0);
  const lastPrice = Number(mm.lastKnownPrice) || null;

  /**
   * What the START endpoint itself refuses, in its own terms.
   *
   * Deliberately NOT the same list as `assessment.blockers`: those are the
   * engine's *running* gates, and START activates every bot as part of the
   * transition, so "fewer than two bots are ACTIVE" does not block a start. What
   * `status.put.ts` actually rejects is an unfunded pool and a market with no
   * bot rows at all.
   */
  const startBlockers = useMemo(() => {
    const list: { id: string; text: string; tab?: TabId }[] = [];
    if (!(tvl > 0)) {
      list.push({ id: "pool", text: t("start_needs_pool"), tab: "pool" });
    }
    if (bots.length === 0) {
      list.push({ id: "bots", text: t("start_needs_bots"), tab: "bots" });
    }
    return list;
  }, [tvl, bots.length, t]);

  const statusActions = useMemo((): {
    action: StatusAction;
    label: string;
    icon: React.ElementType;
    variant: "default" | "outline";
    tone?: "destructive";
    disabled?: boolean;
  }[] => {
    switch (mm.status) {
      case "STOPPED":
      case "INITIALIZING":
        return [
          {
            action: "START",
            label: tCommon("start"),
            icon: Play,
            variant: "default",
            disabled: startBlockers.length > 0,
          },
        ];
      case "ACTIVE":
        return [
          { action: "PAUSE", label: tCommon("pause"), icon: Pause, variant: "outline" },
          {
            action: "STOP",
            label: tCommon("stop"),
            icon: Square,
            variant: "outline",
            tone: "destructive",
          },
        ];
      case "PAUSED":
        return [
          { action: "RESUME", label: tCommon("resume"), icon: Play, variant: "default" },
          {
            action: "STOP",
            label: tCommon("stop"),
            icon: Square,
            variant: "outline",
            tone: "destructive",
          },
        ];
      default:
        return [];
    }
  }, [mm.status, startBlockers.length, tCommon]);

  const actionCopy: Record<StatusAction, { title: string; body: string }> = {
    START: { title: t("confirm_start_title"), body: t("confirm_start_body") },
    RESUME: { title: t("confirm_resume_title"), body: t("confirm_resume_body") },
    PAUSE: { title: t("confirm_pause_title"), body: t("confirm_pause_body") },
    STOP: { title: t("confirm_stop_title"), body: t("confirm_stop_body") },
  };

  const runStatusAction = useCallback(async () => {
    if (!pendingAction) return;
    setActionRunning(true);
    const { error } = await $fetch({
      url: `/api/admin/ai/market-maker/market/${id}/status`,
      method: "PUT",
      body: { action: pendingAction },
      silent: true,
    });
    setActionRunning(false);
    if (error) {
      // The 400 body names the exact precondition that failed — minimum
      // liquidity, an invalid transition — and truncating it to "failed" throws
      // away the only actionable part.
      toast.error(typeof error === "string" ? error : t("status_change_failed"));
      return;
    }
    setPendingAction(null);
    toast.success(t("status_change_done"));
    fetchMarketData(true);
  }, [pendingAction, id, t, fetchMarketData]);

  const runDailyReset = useCallback(async () => {
    setResetRunning(true);
    const { error } = await $fetch({
      url: `/api/admin/ai/market-maker/market/${id}/reset-daily`,
      method: "POST",
      silent: true,
    });
    setResetRunning(false);
    if (error) {
      toast.error(typeof error === "string" ? error : t("reset_daily_failed"));
      return;
    }
    setResetOpen(false);
    toast.success(t("reset_daily_done"));
    fetchMarketData(true);
  }, [id, t, fetchMarketData]);

  // -------------------------------------------------------------------------
  // Masthead — provenance, identity, state. The console's three tiers.
  // -------------------------------------------------------------------------

  const masthead = (
    <div className="border-b border-border bg-card">
      {/* Supplying `header` flips `PageShell`'s container to a plain `py-8`, so
          `pt-header-clear` here is the only thing keeping the page out from
          under the fixed site header. The inner container string repeats
          PageShell's own because `containerVariants` is not exported. */}
      <div className="mx-auto w-full px-4 container pt-header-clear pb-8">
        <div className="divide-y divide-border">
          {/* 1 — PROVENANCE ------------------------------------------------ */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pb-3 font-mono text-[11px] uppercase tracking-wider text-subtle-foreground">
            <Link
              href="/admin/ai/market-maker/market"
              className="flex items-center gap-1.5 rounded-sm text-muted-foreground outline-hidden transition-colors hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              <ArrowLeft className="h-3 w-3" />
              {tCommon("back_to_markets")}
            </Link>

            <span aria-hidden className="h-3 w-px shrink-0 bg-border" />

            <span
              className={cn(
                "flex items-center gap-1.5 font-medium",
                wsConnected ? "text-muted-foreground" : "text-warning-ink"
              )}
            >
              <span className="relative flex h-1.5 w-1.5 shrink-0">
                {/* `animate-ping` is neutralised under `prefers-reduced-motion`
                    (it sets both `animation: none` and `opacity: 0`), which is
                    why the meaning lives on the solid dot underneath. */}
                {wsConnected ? (
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success/60" />
                ) : null}
                <span
                  className={cn(
                    "relative inline-flex h-1.5 w-1.5 rounded-full",
                    wsConnected ? "bg-success" : "bg-warning"
                  )}
                />
              </span>
              {wsConnected ? tCommon("live") : tExt("offline")}
            </span>

            {lastUpdated ? (
              <>
                <span aria-hidden className="hidden h-3 w-px shrink-0 bg-border sm:inline-block" />
                <span className="hidden sm:inline">
                  {tCommon("last_updated")}{" "}
                  {new Date(lastUpdated).toLocaleTimeString()}
                </span>
              </>
            ) : null}

            {quote ? (
              <>
                <span aria-hidden className="h-3 w-px shrink-0 bg-border" />
                <span className="text-muted-foreground">{quote}</span>
              </>
            ) : null}
          </div>

          {/* 2 — IDENTITY -------------------------------------------------- */}
          <PageHeader
            className="py-5"
            title={
              <span className="flex flex-wrap items-center gap-3">
                {/* The pair is the title. While it is in flight the em dash
                    holds the line box; "Unknown market" is a CLAIM and is
                    reserved for a payload that resolved without one. */}
                {symbol ?? (loading ? "—" : t("unlinked_market"))}
                {mm.status ? (
                  <StatusBadge
                    status={mm.status}
                    className="translate-y-0.5 text-xs font-semibold uppercase tracking-wide"
                  />
                ) : null}
                {assessment && mm.status === "ACTIVE" ? (
                  <span
                    className={cn(
                      "translate-y-0.5 rounded-md border px-2 py-1 text-xs font-semibold uppercase tracking-wide",
                      assessment.quoting
                        ? "border-success/20 bg-success/10 text-success-ink"
                        : "border-destructive/20 bg-destructive/10 text-destructive-ink"
                    )}
                  >
                    {assessment.quoting ? tExtAdmin("quoting") : t("not_quoting")}
                  </span>
                ) : null}
              </span>
            }
            description={t("record_description")}
            actions={
              <>
                <Button
                  variant="outline"
                  onClick={() => fetchMarketData(true)}
                  disabled={loading || refreshing}
                >
                  <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
                  {tCommon("refresh")}
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    router.push(`/admin/ai/market-maker/analytics?market=${id}`)
                  }
                >
                  <BarChart3 className="h-4 w-4" />
                  {tCommon("analytics")}
                </Button>
                {statusActions.map((action) => {
                  const ActionIcon = action.icon;
                  return (
                    <Button
                      key={action.action}
                      variant={action.variant}
                      tone={action.tone}
                      disabled={action.disabled}
                      onClick={() => setPendingAction(action.action)}
                    >
                      <ActionIcon className="h-4 w-4" />
                      {action.label}
                    </Button>
                  );
                })}
              </>
            }
          />

          {/* 3 — STATE ----------------------------------------------------- */}
          <div className="grid gap-6 pt-4 lg:grid-cols-2 lg:gap-10">
            <PriceBandMeter
              band={assessment?.band ?? "unknown"}
              position={assessment?.bandPosition ?? null}
              targetPosition={assessment?.targetPosition ?? null}
              low={Number(mm.priceRangeLow || 0)}
              high={Number(mm.priceRangeHigh || 0)}
              target={Number(mm.targetPrice || 0)}
              last={lastPrice}
              quote={quote}
              loading={loading}
              labels={{
                title: t("price_vs_range"),
                inBand: tExtAdmin("in_range"),
                atEdge: t("at_range_edge"),
                outside: t("outside_range"),
                unpriced: t("no_price_yet"),
                target: tExtAdmin("target"),
                last: tCommon("last"),
              }}
            />
            <BudgetMeter
              used={usedVolume}
              budget={budget}
              quote={quote}
              loading={loading}
              labels={{
                title: tExtAdmin("volume_today"),
                percentOfBudget: (pct) => t("pct_of_budget", { pct }),
                noBudget: t("no_budget"),
                spent: t("daily_budget_spent"),
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );

  // -------------------------------------------------------------------------
  // The record could not be read at all
  // -------------------------------------------------------------------------

  if (!loading && !data) {
    return (
      <PageShell ground="subtle" width="wide" rhythm="lg" header={masthead}>
        <Alert tone="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{tExtAdmin("market_maker_not_found")}</AlertTitle>
          <AlertDescription className="flex flex-col items-start gap-3">
            <span>
              {errorText ??
                tExtAdmin("the_requested_market_maker_could_not_be_found")}
            </span>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => fetchMarketData(true)}>
                <RefreshCw className="h-4 w-4" />
                {tCommon("refresh")}
              </Button>
              <Button
                onClick={() => router.push("/admin/ai/market-maker/market")}
              >
                <ArrowLeft className="h-4 w-4" />
                {tCommon("back_to_markets")}
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </PageShell>
    );
  }

  // -------------------------------------------------------------------------
  // Blockers — the page's most important sentence, in the engine's own words
  // -------------------------------------------------------------------------

  const blockerDetail: Record<string, { text: string; tab: TabId }> = {
    bots: { text: t("blocker_bots"), tab: "bots" },
    pool: { text: t("blocker_pool"), tab: "pool" },
    budget: { text: t("blocker_budget"), tab: "config" },
  };

  const runningBlockers = (assessment?.blockers ?? []).map((key) => ({
    key,
    ...blockerDetail[key],
  }));

  const inventorySkew = assessment?.inventory?.skew ?? null;

  return (
    <PageShell ground="subtle" width="wide" rhythm="lg" header={masthead}>
      {/* ALERT — an ACTIVE market the engine refuses to trade. Every reason
          carries the control that closes it (R7). */}
      {mm.status === "ACTIVE" && runningBlockers.length > 0 ? (
        <Alert tone="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{t("active_but_not_quoting")}</AlertTitle>
          <AlertDescription className="flex flex-col items-start gap-3">
            <ul className="list-inside list-disc space-y-1">
              {runningBlockers.map((blocker) => (
                <li key={blocker.key}>{blocker.text}</li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-2">
              {runningBlockers.map((blocker) => (
                <Button
                  key={blocker.key}
                  size="sm"
                  variant="outline"
                  onClick={() => selectTab(blocker.tab)}
                >
                  {blocker.key === "pool" ? (
                    <Droplets className="h-4 w-4" />
                  ) : blocker.key === "bots" ? (
                    <Bot className="h-4 w-4" />
                  ) : (
                    <Settings className="h-4 w-4" />
                  )}
                  {blocker.key === "pool"
                    ? t("fund_the_pool")
                    : blocker.key === "bots"
                      ? t("open_bots")
                      : t("raise_the_budget")}
                </Button>
              ))}
              {assessment?.blockers.includes("budget") ? (
                <Button size="sm" variant="outline" onClick={() => setResetOpen(true)}>
                  <RefreshCw className="h-4 w-4" />
                  {t("reset_daily_counters")}
                </Button>
              ) : null}
            </div>
          </AlertDescription>
        </Alert>
      ) : null}

      {/* ALERT — a market that cannot be started yet. This is what used to be a
          hover tooltip on a disabled button. */}
      {mm.status !== "ACTIVE" && startBlockers.length > 0 ? (
        <Alert tone="warning">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{t("cannot_start_yet")}</AlertTitle>
          <AlertDescription className="flex flex-col items-start gap-3">
            <ul className="list-inside list-disc space-y-1">
              {startBlockers.map((blocker) => (
                <li key={blocker.id}>{blocker.text}</li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-2">
              {startBlockers.map((blocker) => (
                <Button
                  key={blocker.id}
                  size="sm"
                  variant="outline"
                  onClick={() => blocker.tab && selectTab(blocker.tab)}
                >
                  {blocker.id === "pool" ? (
                    <Droplets className="h-4 w-4" />
                  ) : (
                    <Bot className="h-4 w-4" />
                  )}
                  {blocker.id === "pool" ? t("fund_the_pool") : t("open_bots")}
                </Button>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      ) : null}

      {/* A price outside the configured range is not a blocker — the engine is
          still trading — but it is the state that makes prices predictable, so
          it gets its own line rather than only a colour on the meter. */}
      {assessment?.band === "out" && mm.status === "ACTIVE" ? (
        <Alert tone="warning">
          <TrendingUp className="h-4 w-4" />
          <AlertTitle>{t("price_left_the_range")}</AlertTitle>
          <AlertDescription className="flex flex-col items-start gap-3">
            <span>{t("price_left_the_range_detail")}</span>
            <Button size="sm" variant="outline" onClick={() => selectTab("config")}>
              <Settings className="h-4 w-4" />
              {t("widen_the_range")}
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      {/* SUMMARY — one KPI row, every tile a way into the tab that owns it. */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatsCard
          label={`${tCommon("total_value_locked")}${quote ? ` (${quote})` : ""}`}
          value={tvl.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          icon={Wallet}
          loading={loading}
          onClick={() => selectTab("pool")}
          {...statsCardColors.primary}
          index={0}
        />
        <StatsCard
          label={`${tCommon("total_p_l")}${quote ? ` (${quote})` : ""}`}
          value={`${totalPnL >= 0 ? "+" : "-"}${Math.abs(totalPnL).toFixed(2)}`}
          change={tvl > 0 ? Number(((totalPnL / tvl) * 100).toFixed(2)) : undefined}
          isPercent
          icon={TrendingUp}
          loading={loading}
          onClick={() => selectTab("pool")}
          {...(totalPnL >= 0 ? statsCardColors.success : statsCardColors.red)}
          index={1}
        />
        <StatsCard
          label={t("inventory_vs_funded")}
          /* Percentage POINTS of base share against the mix the pool was funded
             with — not a percentage change, and not P&L. */
          value={
            inventorySkew === null
              ? "—"
              : `${inventorySkew >= 0 ? "+" : "-"}${Math.abs(inventorySkew).toFixed(1)} ${t("percentage_points_short")}`
          }
          description={
            inventorySkew === null
              ? undefined
              : inventorySkew >= 0
                ? t("holding_more_base_than_funded")
                : t("holding_less_base_than_funded")
          }
          icon={Scale}
          loading={loading}
          onClick={() => selectTab("pool")}
          {...statsCardColors.primary}
          index={2}
        />
        <StatsCard
          label={tCommon("active_bots")}
          value={`${activeBots} / ${bots.length}`}
          icon={Bot}
          loading={loading}
          onClick={() => selectTab("bots")}
          {...(activeBots >= 2 ? statsCardColors.success : statsCardColors.warning)}
          index={3}
        />
      </div>

      {/* BODY */}
      <Tabs value={activeTab} onValueChange={selectTab} className="space-y-6">
        <TabsList variant="underline" className="overflow-x-auto">
          <TabsTrigger value="overview">
            <LayoutDashboard className="h-4 w-4" />
            {tCommon("overview")}
          </TabsTrigger>
          <TabsTrigger value="pool">
            <Droplets className="h-4 w-4" />
            {tCommon("liquidity")}
          </TabsTrigger>
          <TabsTrigger value="bots">
            <Bot className="h-4 w-4" />
            {tCommon("bots")}
            {/* The count is navigation AND state: an operator can see the roster
                is short without opening the tab. */}
            <span className="font-mono text-xs tabular-nums text-muted-foreground">
              <Loadable loading={loading} placeholder="0/0">
                {`${activeBots}/${bots.length}`}
              </Loadable>
            </span>
          </TabsTrigger>
          <TabsTrigger value="config">
            <Settings className="h-4 w-4" />
            {tCommon("configuration")}
          </TabsTrigger>
        </TabsList>

        {/*
          EVERY PANEL BELOW TAKES THE RESOLVED PAYLOAD.
          `MarketOverview` opens with `data.pool` and `MarketConfig` SEEDS its
          form state from `data` on first render, so a panel mounted before the
          fetch lands either dereferences null or freezes a form seeded from an
          absent payload. The tab strip is chrome and stays; only the body waits.
        */}
        {!data ? (
          <div
            className="flex items-center justify-center py-16 text-muted-foreground"
            aria-busy="true"
          >
            <RefreshCw className="h-5 w-5 animate-spin" />
            <span className="sr-only">{tCommon("loading")}</span>
          </div>
        ) : (
          <>
            <TabsContent value="overview" className="mt-0 space-y-6">
              <ErrorBoundary resetKeys={[id, "overview"]} showDetails>
                <MarketOverview
                  data={data}
                  liveEvents={liveEvents}
                  onConfigure={() => selectTab("config")}
                />
              </ErrorBoundary>
            </TabsContent>

            <TabsContent value="pool" className="mt-0 space-y-6">
              <ErrorBoundary resetKeys={[id, "pool"]} showDetails>
                <PoolManagement
                  marketId={id}
                  pool={data.pool}
                  inventory={assessment?.inventory ?? null}
                  onRefresh={() => fetchMarketData(true)}
                  quoteCurrency={quote}
                  baseCurrency={base}
                  /* The pool row carries no price, so the base leg's share of
                     TVL was computed against a fallback of 1 — which reads as
                     "base is ~0% of the pool" on any market priced above 1. */
                  basePrice={lastPrice ?? (Number(data.targetPrice) || 0)}
                />
              </ErrorBoundary>
            </TabsContent>

            <TabsContent value="bots" className="mt-0 space-y-6">
              <ErrorBoundary resetKeys={[id, "bots"]} showDetails>
                <BotManagement
                  marketId={id}
                  bots={data.bots || []}
                  onRefresh={() => fetchMarketData(true)}
                  quoteCurrency={quote}
                  liveEvents={liveEvents}
                />
              </ErrorBoundary>
            </TabsContent>

            <TabsContent value="config" className="mt-0 space-y-6">
              <ErrorBoundary resetKeys={[id, "config"]} showDetails>
                <MarketConfig
                  data={data}
                  onRefresh={() => fetchMarketData(true)}
                  onResetDaily={() => setResetOpen(true)}
                />
              </ErrorBoundary>
            </TabsContent>
          </>
        )}
      </Tabs>

      {/* R6: a confirmation that names the exact object and what will happen. */}
      <AlertDialog
        open={pendingAction !== null}
        onOpenChange={(open) => {
          if (!open && !actionRunning) setPendingAction(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingAction ? actionCopy[pendingAction].title : ""}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAction ? actionCopy[pendingAction].body : ""}
              {symbol ? (
                <>
                  {" "}
                  <span className="font-medium text-foreground">{symbol}</span>.
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionRunning}>
              {tCommon("cancel")}
            </AlertDialogCancel>
            {/* Deliberately NOT `AlertDialogAction`: it closes on click, which
                would dismiss the dialog before the request settles and lose the
                failure toast's context. */}
            <Button
              variant={pendingAction === "STOP" ? "destructive" : "default"}
              disabled={actionRunning}
              onClick={runStatusAction}
            >
              {actionRunning ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Activity className="h-4 w-4" />
              )}
              {pendingAction ? actionCopy[pendingAction].title : ""}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={resetOpen}
        onOpenChange={(open) => {
          if (!open && !resetRunning) setResetOpen(false);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("reset_daily_counters")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("reset_daily_confirm", { count: bots.length })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resetRunning}>
              {tCommon("cancel")}
            </AlertDialogCancel>
            <Button disabled={resetRunning} onClick={runDailyReset}>
              {resetRunning ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Coins className="h-4 w-4" />
              )}
              {t("reset_daily_counters")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  );
}
