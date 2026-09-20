"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import DataTable from "@/components/blocks/data-table";
import { $fetch } from "@/lib/api";
import { toast } from "sonner";
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Coins,
  BarChart3,
  Settings,
  ArrowLeft,
  ArrowRight,
  Play,
  Pause,
  StopCircle,
  Wallet,
  ExternalLink,
} from "lucide-react";
import { Link } from "@/i18n/routing";
import { formatDistanceToNow } from "date-fns";
import { StatsCard, statsCardColors } from "@/components/ui/card/stats-card";
import { PAGE_PADDING } from "@/app/[locale]/(dashboard)/theme-config";
import {
  useColumns as useTradeColumns,
  useViewConfig as useTradeViewConfig,
} from "../../trade/columns";
import {
  useColumns as useTransactionColumns,
  useViewConfig as useTransactionViewConfig,
} from "../../transaction/columns";
import { useTranslations } from "next-intl";

const COPY_TRADING_PERMISSIONS = {
  access: "access.copy_trading",
  view: "view.copy_trading",
  create: "create.copy_trading",
  edit: "edit.copy_trading",
  delete: "delete.copy_trading",
};

interface Allocation {
  id: string;
  symbol: string;
  marketType: "SPOT" | "BINARY";
  baseAmount: number;
  baseUsedAmount: number;
  quoteAmount: number;
  quoteUsedAmount: number;
  isActive: boolean;
}

interface FollowerData {
  id: string;
  userId: string;
  leaderId: string;
  copyMode: "PROPORTIONAL" | "FIXED_AMOUNT" | "FIXED_RATIO";
  fixedAmount: number | null;
  fixedRatio: number | null;
  maxDailyLoss: number | null;
  maxPositionSize: number | null;
  stopLossPercent: number | null;
  takeProfitPercent: number | null;
  totalProfit: number;
  totalTrades: number;
  winRate: number;
  roi: number;
  status: "ACTIVE" | "PAUSED" | "STOPPED";
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatar: string | null;
  };
  leader: {
    id: string;
    displayName: string;
    avatar: string | null;
    tradingStyle: string | null;
    riskLevel: string | null;
    profitSharePercent: number | null;
    status: string | null;
  };
  allocations: Allocation[];
  tradeCount: number;
  transactionCount: number;
}

type FollowerAction = "resume" | "pause" | "stop";

const COPY_MODE_LABELS: Record<string, string> = {
  PROPORTIONAL: "Proportional",
  FIXED_AMOUNT: "Fixed Amount",
  FIXED_RATIO: "Fixed Ratio",
};

const ACTION_COPY: Record<
  FollowerAction,
  { title: string; description: string; confirm: string; needsReason: boolean }
> = {
  resume: {
    title: "Resume subscription",
    description:
      "Copying restarts from the next leader trade. Trades the leader made while this subscription was paused are not backfilled.",
    confirm: "Resume",
    needsReason: false,
  },
  pause: {
    title: "Pause subscription",
    description:
      "New leader trades stop being copied. Allocated funds and open positions are left exactly as they are, and the subscription can be resumed.",
    confirm: "Pause",
    needsReason: true,
  },
  stop: {
    title: "Stop subscription",
    description:
      "This is terminal — a stopped subscription cannot be resumed. Funds stay in the per-market allocations below and are released only when those allocations are removed.",
    confirm: "Stop subscription",
    needsReason: true,
  },
};

/** A labelled figure in the settings grid. `null` reads as "Not set", not as absent. */
function Field({
  label,
  value,
  hint,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
}) {
  const t = useTranslations("ext_admin");
  const tCommon = useTranslations("common");
  const unset = value === null || value === undefined || value === "";
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p
        className={
          unset
            ? "text-sm text-subtle-foreground"
            : "font-medium font-mono tabular-nums"
        }
      >
        {unset ? tCommon("not_set") : value}
      </p>
      {hint ? (
        <p className="mt-0.5 text-[11px] text-subtle-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

export default function CopyTradingFollowerDetailClient() {
  const t = useTranslations("ext_admin");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  const params = useParams();
  const id = params?.id as string;
  const tradeColumns = useTradeColumns();
  const transactionColumns = useTransactionColumns();
  /* The same dialogs the standalone Trades and Transactions pages use. These
     embedded tables are the only place a subscription's own trades and ledger
     entries can be opened, and the columns shown here are the narrow subset that
     fits beside a tab bar — the panel is where the rest of the record lives. */
  const tradeViewConfig = useTradeViewConfig();
  const transactionViewConfig = useTransactionViewConfig();

  /**
   * One state cell holding the id the result BELONGS to, so "still loading" is
   * derived rather than stored.
   *
   * Two things fall out of that. A separate `loading` flag would have to be set
   * synchronously inside the effect, which is a cascading render
   * (react-hooks/set-state-in-effect). And navigating between two subscriptions
   * re-renders this same component instance — `useParams` returns the new id
   * while the old record is still in state — so a stored flag left the previous
   * follower's name, stats and settings on screen under the new URL until the
   * fetch landed. Comparing `result.id` to the route id cannot show that.
   *
   * It also means a REFRESH after pause/stop never flashes: `result` is replaced
   * only once the new data is in hand, so `loaded` never goes false and the
   * DataTable below is not unmounted back to page 1.
   */
  const [result, setResult] = useState<{
    id: string;
    data: FollowerData | null;
  } | null>(null);
  const [pendingAction, setPendingAction] = useState<FollowerAction | null>(null);
  const [actionReason, setActionReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const fetchFollower = useCallback(async () => {
    const { data, error } = await $fetch({
      url: `/api/admin/copy-trading/follower/${id}`,
      method: "GET",
      silentSuccess: true,
    });

    if (error) {
      toast.error((error as any)?.message || t("failed_to_fetch_follower_details"));
    }
    setResult({ id, data: data ?? null });
  }, [id]);

  useEffect(() => {
    if (id) fetchFollower();
  }, [id, fetchFollower]);

  const loaded = result?.id === id;
  const follower = loaded ? result.data : null;

  const runAction = async () => {
    if (!pendingAction) return;
    const copy = ACTION_COPY[pendingAction];

    if (copy.needsReason && !actionReason.trim()) {
      toast.error(t("please_provide_a_reason"));
      return;
    }

    setActionLoading(true);
    // Each action has its OWN endpoint. `pause` used to POST to `stop`, so the
    // button labelled Pause moved the subscription to the terminal STOPPED state
    // and then reported "paused" — and since `resume` only accepts PAUSED, the
    // Resume button beside it could never become reachable.
    const { error } = await $fetch({
      url: `/api/admin/copy-trading/follower/${id}/${pendingAction}`,
      method: "POST",
      body: actionReason.trim() ? { reason: actionReason.trim() } : undefined,
    });

    if (error) {
      toast.error((error as any)?.message || t("failed_to_subscription", { pendingAction: String(pendingAction) }));
    } else {
      setPendingAction(null);
      setActionReason("");
      await fetchFollower();
    }
    setActionLoading(false);
  };

  if (!loaded) {
    return (
      <div className={`container ${PAGE_PADDING} space-y-6`}>
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-40 w-full" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
        <Skeleton className="h-56 w-full" />
      </div>
    );
  }

  if (!follower) {
    return (
      <div className={`container ${PAGE_PADDING}`}>
        <Card padding="xl" className="text-center">
          <p className="font-medium">{t("subscription_not_found")}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("it_may_have_been_deleted_or")}
          </p>
          <Button asChild variant="outline" size="sm" className="mt-4">
            <Link href="/admin/copy-trading/follower">
              <ArrowLeft className="h-4 w-4 me-2" />
              {t("back_to_subscriptions")}
            </Link>
          </Button>
        </Card>
      </div>
    );
  }

  const roi = follower.roi ?? 0;
  const totalProfit = follower.totalProfit ?? 0;
  const isPositiveRoi = roi >= 0;
  const allocations = follower.allocations ?? [];
  const activeAllocations = allocations.filter((a) => a.isActive);
  const userName =
    `${follower.user?.firstName ?? ""} ${follower.user?.lastName ?? ""}`.trim() ||
    "Unknown user";

  return (
    <div className={`container ${PAGE_PADDING} space-y-6`}>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon">
            <Link href="/admin/copy-trading/follower">
              <ArrowLeft className="h-5 w-5" />
              <span className="sr-only">Back to subscriptions</span>
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {t("follower_subscription")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {userName} copying {follower.leader?.displayName ?? t("a_leader")}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {follower.status === "PAUSED" && (
            <Button size="sm" onClick={() => setPendingAction("resume")}>
              <Play className="h-4 w-4 me-2" />
              Resume
            </Button>
          )}
          {follower.status === "ACTIVE" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPendingAction("pause")}
            >
              <Pause className="h-4 w-4 me-2" />
              Pause
            </Button>
          )}
          {follower.status !== "STOPPED" && (
            <Button
              size="sm"
              variant="destructive"
              onClick={() => setPendingAction("stop")}
            >
              <StopCircle className="h-4 w-4 me-2" />
              Stop
            </Button>
          )}
        </div>
      </div>

      {/*
        One card for the relationship, not two disconnected profile cards. A
        subscription IS the edge between a user and a leader; showing them side
        by side with an arrow says that, and leaves the status where the eye
        already is instead of buried next to the user's name.
      */}
      <Card padding="xl">
        <div className="grid gap-6 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
          {/* Follower */}
          <div className="flex items-start gap-4">
            <Avatar className="h-14 w-14">
              {follower.user?.avatar && <AvatarImage src={follower.user.avatar} />}
              <AvatarFallback>
                {follower.user?.firstName?.[0]}
                {follower.user?.lastName?.[0]}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium uppercase tracking-wide text-subtle-foreground">
                Follower
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-lg font-semibold">{userName}</h2>
                <StatusBadge status={follower.status} />
              </div>
              <p className="truncate text-sm text-muted-foreground">
                {follower.user?.email}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-subtle-foreground">
                <span>
                  {t("following_for")}{" "}
                  {formatDistanceToNow(new Date(follower.createdAt))}
                </span>
                {follower.user?.id && (
                  <Link
                    href={`/admin/crm/user/${follower.user.id}`}
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    {t("user_profile")}
                  </Link>
                )}
              </div>
            </div>
          </div>

          <ArrowRight className="hidden h-5 w-5 shrink-0 text-subtle-foreground lg:block rtl:rotate-180" />

          {/* Leader */}
          <div className="flex items-start gap-4 border-t border-border pt-6 lg:border-t-0 lg:border-s lg:ps-6 lg:pt-0">
            <Avatar className="h-14 w-14">
              {follower.leader?.avatar && (
                <AvatarImage src={follower.leader.avatar} />
              )}
              <AvatarFallback>
                {follower.leader?.displayName?.[0]}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium uppercase tracking-wide text-subtle-foreground">
                Leader
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-lg font-semibold">
                  {follower.leader?.displayName}
                </h2>
                {/* A suspended leader is the first thing that explains a
                    subscription that has gone quiet, so it belongs here. */}
                {follower.leader?.status && follower.leader.status !== "ACTIVE" && (
                  <StatusBadge status={follower.leader.status} />
                )}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                {follower.leader?.tradingStyle && (
                  <Badge tone="neutral" appearance="outline">
                    {follower.leader.tradingStyle.replace(/_/g, " ")}
                  </Badge>
                )}
                {follower.leader?.riskLevel && (
                  <Badge tone="neutral" appearance="outline">
                    {follower.leader.riskLevel} risk
                  </Badge>
                )}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-subtle-foreground">
                {follower.leader?.profitSharePercent !== null &&
                  follower.leader?.profitSharePercent !== undefined && (
                    <span>
                      {follower.leader.profitSharePercent}% profit share
                    </span>
                  )}
                {follower.leader?.id && (
                  <Link
                    href={`/admin/copy-trading/leader/${follower.leader.id}`}
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    {tCommon("leader_profile")}
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Performance */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          label="ROI"
          value={`${isPositiveRoi ? "+" : ""}${roi.toFixed(2)}%`}
          icon={isPositiveRoi ? TrendingUp : TrendingDown}
          index={0}
          {...(isPositiveRoi ? statsCardColors.success : statsCardColors.red)}
        />
        <StatsCard
          label={tCommon("win_rate")}
          value={`${(follower.winRate ?? 0).toFixed(1)}%`}
          icon={BarChart3}
          index={1}
          progress={follower.winRate ?? 0}
          {...statsCardColors.neutral}
        />
        <StatsCard
          label={tCommon("total_trades")}
          value={follower.totalTrades ?? 0}
          icon={Activity}
          index={2}
          {...statsCardColors.neutral}
        />
        <StatsCard
          label={tCommon("total_profit")}
          value={totalProfit.toFixed(2)}
          icon={Coins}
          index={3}
          {...(totalProfit >= 0 ? statsCardColors.success : statsCardColors.red)}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Copy settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-surface-3 text-muted-foreground">
                <Settings className="h-3.5 w-3.5" />
              </span>
              {t("copy_settings")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <Field
                label={tExt("copy_mode")}
                value={COPY_MODE_LABELS[follower.copyMode] || follower.copyMode}
              />
              {/*
                Only the parameter the SELECTED mode actually uses. Rendering
                whichever happened to be non-null implied both were in play; a
                FIXED_RATIO subscription with a stale fixedAmount read as if it
                were sizing by amount.
              */}
              {follower.copyMode === "FIXED_AMOUNT" && (
                <Field label={tCommon("fixed_amount")} value={follower.fixedAmount} />
              )}
              {follower.copyMode === "FIXED_RATIO" && (
                <Field
                  label={t("fixed_ratio")}
                  value={
                    follower.fixedRatio !== null
                      ? `${follower.fixedRatio}x`
                      : null
                  }
                />
              )}
              {follower.copyMode === "PROPORTIONAL" && (
                <Field
                  label="Sizing"
                  value="Scaled to allocation"
                  hint={t("each_copy_is_sized_from_the")}
                />
              )}
            </div>

            <div>
              <p className="mb-3 text-xs font-medium uppercase tracking-wide text-subtle-foreground">
                {t("risk_limits_1")}
              </p>
              {/*
                All four, always — with "Not set" where a limit is absent. They
                used to be dropped when null, so an unlimited subscription and a
                capped one rendered the same shape and the grid re-flowed per
                row. "No limit configured" is the single most important thing a
                risk panel can tell you, and it was the one thing it hid.
              */}
              <div className="grid grid-cols-2 gap-4">
                <Field label={tExt("max_daily_loss")} value={follower.maxDailyLoss} />
                <Field
                  label={tExt("max_position_size")}
                  value={follower.maxPositionSize}
                />
                <Field
                  label={tCommon("stop_loss")}
                  value={
                    follower.stopLossPercent !== null
                      ? `${follower.stopLossPercent}%`
                      : null
                  }
                />
                <Field
                  label={tCommon("take_profit")}
                  value={
                    follower.takeProfitPercent !== null
                      ? `${follower.takeProfitPercent}%`
                      : null
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/*
          Allocations. This page never showed them, and they are where a
          subscription's money physically is: stopping a subscription does NOT
          release them, so an operator deciding whether to stop one had no way
          to see what was still committed.
        */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-surface-3 text-muted-foreground">
                <Wallet className="h-3.5 w-3.5" />
              </span>
              Allocations
              <span className="text-sm font-normal text-muted-foreground">
                {activeAllocations.length} active / {allocations.length} total
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {allocations.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {t("no_funds_allocated_to_any_market")}
              </p>
            ) : (
              <div className="space-y-2">
                {allocations.map((allocation) => (
                  <div
                    key={allocation.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-medium">
                        {allocation.symbol}
                      </span>
                      <Badge
                        tone={allocation.marketType === "BINARY" ? "warning" : "info"}
                        appearance="soft"
                        size="xs"
                      >
                        {allocation.marketType}
                      </Badge>
                      {!allocation.isActive && (
                        <Badge tone="neutral" appearance="soft" size="xs">
                          Inactive
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      <div className="text-end">
                        <p className="text-subtle-foreground">Quote</p>
                        <p className="font-mono tabular-nums">
                          {(allocation.quoteUsedAmount ?? 0).toLocaleString(
                            undefined,
                            { maximumFractionDigits: 8 }
                          )}{" "}
                          /{" "}
                          {(allocation.quoteAmount ?? 0).toLocaleString(
                            undefined,
                            { maximumFractionDigits: 8 }
                          )}
                        </p>
                      </div>
                      <div className="text-end">
                        <p className="text-subtle-foreground">Base</p>
                        <p className="font-mono tabular-nums">
                          {(allocation.baseUsedAmount ?? 0).toLocaleString(
                            undefined,
                            { maximumFractionDigits: 8 }
                          )}{" "}
                          /{" "}
                          {(allocation.baseAmount ?? 0).toLocaleString(undefined, {
                            maximumFractionDigits: 8,
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                <p className="pt-1 text-[11px] text-subtle-foreground">
                  {t("shown_as_in_use_allocated_in")}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/*
        Trades and transactions are DataTables scoped to this subscription, not
        hand-rolled lists. They were `follower.trades.map(...)` over a payload
        the route capped at 50 — no paging, no sorting, no filtering, and a tab
        label that read "Trades (50)" whether there were 50 or 5,000.

        Only ONE of these is mounted at a time, which is load-bearing:
        `useTableStore` is a module-level singleton, so two DataTables rendered
        together would share one set of columns, filters and rows. Radix unmounts
        the inactive TabsContent, so switching tabs remounts and re-scopes the
        one table that is on screen.
      */}
      <Tabs defaultValue="trades" className="w-full">
        <TabsList>
          <TabsTrigger value="trades">
            Trades ({follower.tradeCount ?? 0})
          </TabsTrigger>
          <TabsTrigger value="transactions">
            Transactions ({follower.transactionCount ?? 0})
          </TabsTrigger>
        </TabsList>

        {/*
          No Card around these. `TableContent` is already a bordered
          `rounded-xl` surface, so a Card here is a second border at a different
          radius wrapped around the first — which is exactly the card-shell drift
          the design system's ratchet exists to keep out.
        */}
        <TabsContent value="trades" className="mt-4">
          <DataTable
            key={`follower-trades-${id}`}
            apiEndpoint="/api/admin/copy-trading/trade"
            model="copyTradingTrade"
            modelConfig={{ followerId: id }}
            columns={tradeColumns}
            viewConfig={tradeViewConfig}
            itemTitle="Trade"
            permissions={COPY_TRADING_PERMISSIONS}
            pageSize={10}
            canCreate={false}
            canEdit={false}
            canDelete={false}
            // `canView` gates the row EXPAND, not just a detail link: with it off
            // no row can open and the dialog above would never render. There is
            // no viewLink/onViewClick here, so this adds no row action.
            canView
            isParanoid={false}
          />
        </TabsContent>

        <TabsContent value="transactions" className="mt-4">
          <DataTable
            key={`follower-transactions-${id}`}
            apiEndpoint="/api/admin/copy-trading/transaction"
            model="copyTradingTransaction"
            modelConfig={{ followerId: id }}
            columns={transactionColumns}
            viewConfig={transactionViewConfig}
            itemTitle="Transaction"
            permissions={COPY_TRADING_PERMISSIONS}
            pageSize={10}
            canCreate={false}
            canEdit={false}
            canDelete={false}
            // See the trades table above: `canView` is what lets a row expand.
            canView
            isParanoid={false}
          />
        </TabsContent>
      </Tabs>

      {/*
        A confirm step, and a reason on the two destructive actions — matching
        what the subscriptions LIST page already required. The detail page fired
        Stop straight off a single click with no reason and no undo.
      */}
      <Dialog
        open={pendingAction !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingAction(null);
            setActionReason("");
          }
        }}
      >
        <DialogContent>
          {pendingAction && (
            <>
              <DialogHeader>
                <DialogTitle>{ACTION_COPY[pendingAction].title}</DialogTitle>
                <DialogDescription>
                  {ACTION_COPY[pendingAction].description}
                </DialogDescription>
              </DialogHeader>
              {ACTION_COPY[pendingAction].needsReason && (
                <Textarea
                  placeholder="Reason (recorded in the audit log)"
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  rows={3}
                />
              )}
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setPendingAction(null);
                    setActionReason("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant={pendingAction === "stop" ? "destructive" : "default"}
                  onClick={runAction}
                  disabled={actionLoading}
                >
                  {ACTION_COPY[pendingAction].confirm}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
