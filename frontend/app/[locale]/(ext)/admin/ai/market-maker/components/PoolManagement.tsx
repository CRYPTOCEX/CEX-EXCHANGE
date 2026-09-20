"use client";

/**
 * THE POOL: WHAT IT HOLDS, WHAT IT HAS EARNED, AND THE THREE WAYS TO MOVE IT.
 * ===========================================================================
 *
 * This tab used to open with four `StatsCard`s that restated the page's own KPI
 * row — TVL and total P&L appeared twice on screen at once, in two different
 * formats — and then said the same things again in a composition bar and a P&L
 * breakdown. R3 allows one KPI row per page, and it is the page's, not this
 * tab's. What is here now is the part only this tab can answer: the SPLIT of the
 * pool, how far that split has drifted from the mix it was funded with, and the
 * controls that change it.
 *
 * The inventory reading comes from the server (`utils/assessment.ts`), the same
 * function the console ranks markets by, so "pushed to one side" means the same
 * thing on both screens.
 */

import React, { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  ArrowDownRight,
  ArrowUpRight,
  Coins,
  MinusCircle,
  PieChart,
  PlusCircle,
  RefreshCw,
  Scale,
  TrendingDown,
  TrendingUp,
  WalletCards,
} from "lucide-react";

import { $fetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { MoneyFigure } from "@/components/ui/money-figure";

interface PoolManagementProps {
  marketId: string;
  pool: any;
  /** The server's inventory reading. `null` when the pool has never been funded. */
  inventory?: {
    baseShare: number;
    fundedBaseShare: number;
    skew: number;
  } | null;
  onRefresh: () => void;
  quoteCurrency?: string;
  baseCurrency?: string;
  /** Price of one base unit in quote currency, for valuing the base leg. */
  basePrice?: number;
}

interface WalletBalances {
  base: { currency: string; balance: number; walletId: string | null };
  quote: { currency: string; balance: number; walletId: string | null };
}

/**
 * A fresh de-duplication token for one pool movement.
 *
 * The server namespaces this into the wallet-ledger idempotency key, so two
 * submissions of the same click collapse into one debit while two deliberate
 * top-ups stay two.
 */
function newSubmitToken(): string {
  const c = globalThis.crypto as Crypto | undefined;
  if (c?.randomUUID) return c.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

/** Section chrome, so the six panels here cannot drift apart. */
function PanelHeader({
  icon: Icon,
  title,
  description,
  tone = "primary",
  action,
}: {
  icon: React.ElementType;
  title: React.ReactNode;
  description?: React.ReactNode;
  tone?: "primary" | "success" | "destructive" | "neutral";
  action?: React.ReactNode;
}) {
  const fill =
    tone === "success"
      ? "bg-success/10 text-success"
      : tone === "destructive"
        ? "bg-destructive/10 text-destructive"
        : tone === "neutral"
          ? "bg-surface-3 text-muted-foreground"
          : "bg-primary/10 text-primary";

  return (
    <CardHeader
      padding="md"
      className="flex-row items-center justify-between space-y-0"
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-sm", fill)}>
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <CardTitle className="text-base font-semibold text-foreground">
            {title}
          </CardTitle>
          {description ? (
            <p className="truncate text-xs text-muted-foreground">{description}</p>
          ) : null}
        </div>
      </div>
      {action}
    </CardHeader>
  );
}

function Figure({
  label,
  value,
  ink,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  ink?: string;
}) {
  return (
    <div className="min-w-0">
      <p className="font-mono text-[11px] uppercase tracking-wider text-subtle-foreground">
        {label}
      </p>
      <p className={cn("mt-1 text-lg font-semibold text-foreground", ink)}>
        {value}
      </p>
    </div>
  );
}

export const PoolManagement: React.FC<PoolManagementProps> = ({
  marketId,
  pool,
  inventory = null,
  onRefresh,
  quoteCurrency = "",
  baseCurrency = "",
  basePrice = 0,
}) => {
  const t = useTranslations("ext_admin_ai_market-maker");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  const tExtAdmin = useTranslations("ext_admin");

  const [depositAmount, setDepositAmount] = useState("");
  const [depositCurrency, setDepositCurrency] = useState<"BASE" | "QUOTE">("QUOTE");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawCurrency, setWithdrawCurrency] = useState<"BASE" | "QUOTE">("QUOTE");
  const [rebalanceRatio, setRebalanceRatio] = useState([50]);
  const [maxSlippage, setMaxSlippage] = useState("2");
  const [loading, setLoading] = useState<string | null>(null);
  const [walletBalances, setWalletBalances] = useState<WalletBalances | null>(null);
  const [loadingWallet, setLoadingWallet] = useState(false);

  // What the target ratio would require, once the server has been asked.
  const [rebalancePlan, setRebalancePlan] = useState<{
    message: string;
    requiredBaseChange: number;
    requiredQuoteChange: number;
  } | null>(null);

  const fetchWalletBalances = useCallback(async () => {
    setLoadingWallet(true);
    const { data: payload, error } = await $fetch({
      url: `/api/admin/ai/market-maker/pool/${marketId}/wallet`,
      method: "GET",
      silent: true,
    });
    if (error) toast.error(t("wallet_balances_unavailable"));
    else if (payload) setWalletBalances(payload as WalletBalances);
    setLoadingWallet(false);
  }, [marketId, t]);

  useEffect(() => {
    fetchWalletBalances();
  }, [fetchWalletBalances]);

  const handleDeposit = async () => {
    if (!depositAmount || Number(depositAmount) <= 0) {
      toast.error(tCommon("enter_a_valid_amount"));
      return;
    }
    setLoading("deposit");
    const { error } = await $fetch({
      url: `/api/admin/ai/market-maker/pool/${marketId}/deposit`,
      method: "POST",
      body: {
        currency: depositCurrency,
        amount: Number(depositAmount),
        // One token per submit. The server keys its wallet-ledger entry on this,
        // so a double-click or a retried request settles once instead of
        // debiting twice.
        idempotencyKey: newSubmitToken(),
      },
    });
    setLoading(null);
    if (error) {
      toast.error(typeof error === "string" ? error : t("deposit_failed"));
      return;
    }
    toast.success(t("deposit_done"));
    setDepositAmount("");
    onRefresh();
    fetchWalletBalances();
  };

  const handleWithdraw = async () => {
    if (!withdrawAmount || Number(withdrawAmount) <= 0) {
      toast.error(tCommon("enter_a_valid_amount"));
      return;
    }
    setLoading("withdraw");
    const { error } = await $fetch({
      url: `/api/admin/ai/market-maker/pool/${marketId}/withdraw`,
      method: "POST",
      body: {
        currency: withdrawCurrency,
        amount: Number(withdrawAmount),
        idempotencyKey: newSubmitToken(),
      },
    });
    setLoading(null);
    if (error) {
      toast.error(typeof error === "string" ? error : t("withdrawal_failed"));
      return;
    }
    toast.success(t("withdrawal_done"));
    setWithdrawAmount("");
    onRefresh();
    fetchWalletBalances();
  };

  const handleRebalance = async () => {
    setLoading("rebalance");
    setRebalancePlan(null);
    const { data, error } = await $fetch({
      url: `/api/admin/ai/market-maker/pool/${marketId}/rebalance`,
      method: "POST",
      body: { targetRatio: rebalanceRatio[0] / 100, mode: "REPORT" },
    });
    setLoading(null);
    if (error) {
      toast.error(typeof error === "string" ? error : t("rebalance_failed"));
      return;
    }
    // REPORT mode changes nothing: it sizes the trade the target ratio implies
    // so the operator can see it before agreeing to it.
    const details = (data as any)?.rebalanceDetails;
    setRebalancePlan({
      message: (data as any)?.message ?? "",
      requiredBaseChange: Number(details?.requiredBaseChange ?? 0),
      requiredQuoteChange: Number(details?.requiredQuoteChange ?? 0),
    });
    toast.success(t("rebalance_calculated"));
    onRefresh();
  };

  const handleExecuteRebalance = async () => {
    const slippage = Number(maxSlippage);
    if (!Number.isFinite(slippage) || slippage < 0) {
      toast.error(t("slippage_must_be_non_negative"));
      return;
    }
    setLoading("rebalance-execute");
    const { data, error } = await $fetch({
      url: `/api/admin/ai/market-maker/pool/${marketId}/rebalance`,
      method: "POST",
      body: {
        targetRatio: rebalanceRatio[0] / 100,
        mode: "EXECUTE",
        maxSlippagePercent: slippage,
      },
    });
    setLoading(null);
    if (error) {
      // A 409 body names the exact depth the book offers against what the move
      // needs. Truncating it would throw away the only actionable information.
      toast.error(typeof error === "string" ? error : t("rebalance_failed"));
      return;
    }
    setRebalancePlan({
      message: (data as any)?.message ?? "",
      requiredBaseChange: 0,
      requiredQuoteChange: 0,
    });
    toast.success(t("rebalance_executed"));
    onRefresh();
  };

  // -------------------------------------------------------------------------

  const baseBalance = Number(pool?.baseCurrencyBalance || pool?.baseBalance || 0);
  const quoteBalance = Number(pool?.quoteCurrencyBalance || pool?.quoteBalance || 0);
  const tvl = Number(pool?.totalValueLocked || 0);
  const realizedPnL = Number(pool?.realizedPnL || 0);
  const unrealizedPnL = Number(pool?.unrealizedPnL || 0);
  const totalPnL = realizedPnL + unrealizedPnL;
  const isPoolEmpty = baseBalance === 0 && quoteBalance === 0;

  /**
   * The split, by VALUE.
   *
   * The pool row carries no price, so this used to fall back to 1 quote unit per
   * base unit — which reported a pool holding 40 base and 90,000 quote as 0.04%
   * base on a market trading at 100, and then invited the operator to
   * "rebalance" toward a number that was never true. The price comes from the
   * market itself now, and the two shares are computed against the value the
   * pool actually HOLDS rather than against `totalValueLocked` — which is a
   * stored column that can lag a balance change and made the two bars fail to
   * fill the track.
   */
  const effectiveBasePrice = Number(basePrice) > 0 ? Number(basePrice) : 0;
  const baseValue = baseBalance * effectiveBasePrice;
  const heldValue = baseValue + quoteBalance;
  const baseValuePercent =
    isPoolEmpty || heldValue <= 0 ? 0 : (baseValue / heldValue) * 100;
  const quoteValuePercent = isPoolEmpty || heldValue <= 0 ? 0 : 100 - baseValuePercent;

  const currencyToggle = (
    value: "BASE" | "QUOTE",
    set: (next: "BASE" | "QUOTE") => void
  ) => (
    <div className="flex gap-1 rounded-md bg-muted p-1">
      {(["BASE", "QUOTE"] as const).map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => set(option)}
          className={cn(
            "flex-1 rounded-sm px-3 py-1.5 text-sm font-medium transition-colors",
            value === option
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {option === "BASE"
            ? baseCurrency || t("base")
            : quoteCurrency || tCommon("quote")}
        </button>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-3">
        {/* ---------------------------------------------------------------- */}
        {/* HOLDINGS                                                          */}
        {/* ---------------------------------------------------------------- */}
        <Card className="lg:col-span-2">
          <PanelHeader
            icon={PieChart}
            title={t("pool_holdings")}
            description={t("pool_holdings_hint")}
          />
          <CardContent padding="md" className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-3">
              <Figure
                label={`${tExtAdmin("base_balance")}${baseCurrency ? ` (${baseCurrency})` : ""}`}
                value={
                  <span className="font-mono tabular-nums">
                    {baseBalance.toLocaleString(undefined, {
                      maximumFractionDigits: 6,
                    })}
                  </span>
                }
              />
              <Figure
                label={`${tExtAdmin("quote_balance")}${quoteCurrency ? ` (${quoteCurrency})` : ""}`}
                value={
                  <span className="font-mono tabular-nums">
                    {quoteBalance.toLocaleString(undefined, {
                      maximumFractionDigits: 2,
                    })}
                  </span>
                }
              />
              <Figure
                label={`${tCommon("total_value_locked")}${quoteCurrency ? ` (${quoteCurrency})` : ""}`}
                value={
                  <span className="font-mono tabular-nums">
                    {tvl.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </span>
                }
              />
            </div>

            {/* The split. `role="img"` with a full label, because two coloured
                widths are not readable to a screen reader. */}
            <div>
              <div
                className="flex h-8 w-full overflow-hidden rounded-md bg-surface-3"
                role="img"
                aria-label={`${baseCurrency} ${baseValuePercent.toFixed(1)}%, ${quoteCurrency} ${quoteValuePercent.toFixed(1)}%`}
              >
                {isPoolEmpty || heldValue <= 0 ? (
                  <span className="flex w-full items-center justify-center text-xs text-muted-foreground">
                    {tExtAdmin("pool_is_empty_deposit_funds_to_start")}
                  </span>
                ) : (
                  <>
                    <div
                      className="flex h-full items-center justify-center bg-primary transition-[width] duration-500"
                      style={{ width: `${baseValuePercent}%` }}
                    >
                      {baseValuePercent > 12 ? (
                        <span className="font-mono text-xs font-medium tabular-nums text-primary-foreground">
                          {baseValuePercent.toFixed(1)}%
                        </span>
                      ) : null}
                    </div>
                    <div
                      className="flex h-full items-center justify-center bg-success transition-[width] duration-500"
                      style={{ width: `${quoteValuePercent}%` }}
                    >
                      {quoteValuePercent > 12 ? (
                        <span className="font-mono text-xs font-medium tabular-nums text-success-foreground">
                          {quoteValuePercent.toFixed(1)}%
                        </span>
                      ) : null}
                    </div>
                  </>
                )}
              </div>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-x-6 gap-y-1 text-xs">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <span aria-hidden className="h-2 w-2 shrink-0 rounded-full bg-primary" />
                  {tExtAdmin("base_asset")}
                  <span className="text-foreground">
                    <MoneyFigure
                      value={`${baseBalance.toFixed(4)} ${baseCurrency}`}
                    />
                  </span>
                </span>
                <span className="flex items-center gap-2 text-muted-foreground">
                  <span aria-hidden className="h-2 w-2 shrink-0 rounded-full bg-success" />
                  {tExtAdmin("quote_asset")}
                  <span className="text-foreground">
                    <MoneyFigure
                      value={`${quoteBalance.toFixed(2)} ${quoteCurrency}`}
                    />
                  </span>
                </span>
              </div>
            </div>

            {/* Drift against the funded mix — the console's own reading. */}
            {inventory ? (
              <div className="rounded-md border border-border bg-surface-2 px-4 py-3">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <p className="font-mono text-[11px] uppercase tracking-wider text-subtle-foreground">
                    {t("inventory_vs_funded")}
                  </p>
                  <p
                    className={cn(
                      "font-mono text-sm font-semibold tabular-nums",
                      Math.abs(inventory.skew) < 5
                        ? "text-foreground"
                        : "text-warning-ink"
                    )}
                  >
                    {inventory.skew >= 0 ? "+" : "-"}
                    {Math.abs(inventory.skew).toFixed(1)}{" "}
                    {t("percentage_points_short")}
                  </p>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {inventory.skew >= 0
                    ? t("holding_more_base_than_funded")
                    : t("holding_less_base_than_funded")}{" "}
                  {t("funded_at_base_share", {
                    funded: inventory.fundedBaseShare.toFixed(1),
                    now: inventory.baseShare.toFixed(1),
                  })}
                </p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* ---------------------------------------------------------------- */}
        {/* P&L                                                               */}
        {/* ---------------------------------------------------------------- */}
        <Card>
          <PanelHeader
            icon={totalPnL >= 0 ? TrendingUp : TrendingDown}
            title={tExtAdmin("p_l_breakdown")}
            description={tExtAdmin("profit_and_loss_analysis")}
            tone={totalPnL >= 0 ? "success" : "destructive"}
          />
          <CardContent padding="md" className="space-y-4">
            <div className="flex items-baseline justify-between gap-4">
              <span className="text-sm text-muted-foreground">
                {tExt("realized_p_l")}
              </span>
              <span
                className={cn(
                  "text-sm font-semibold",
                  realizedPnL >= 0 ? "text-up" : "text-down"
                )}
              >
                <MoneyFigure
                  value={`${realizedPnL >= 0 ? "+" : "-"}${Math.abs(realizedPnL).toFixed(2)} ${quoteCurrency}`}
                />
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-4">
              <span className="text-sm text-muted-foreground">
                {tExtAdmin("unrealized_p_l")}
              </span>
              <span
                className={cn(
                  "text-sm font-semibold",
                  unrealizedPnL >= 0 ? "text-up" : "text-down"
                )}
              >
                <MoneyFigure
                  value={`${unrealizedPnL >= 0 ? "+" : "-"}${Math.abs(unrealizedPnL).toFixed(2)} ${quoteCurrency}`}
                />
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-4 border-t border-border pt-4">
              <span className="text-sm font-medium text-foreground">
                {tCommon("total_p_l")}
              </span>
              <span className="flex items-center gap-1.5">
                {totalPnL >= 0 ? (
                  <ArrowUpRight className="h-4 w-4 text-success" />
                ) : (
                  <ArrowDownRight className="h-4 w-4 text-destructive" />
                )}
                <span
                  className={cn(
                    "text-lg font-semibold",
                    totalPnL >= 0 ? "text-success" : "text-destructive"
                  )}
                >
                  <MoneyFigure
                    value={`${totalPnL >= 0 ? "+" : "-"}${Math.abs(totalPnL).toFixed(2)} ${quoteCurrency}`}
                  />
                </span>
              </span>
            </div>
            {tvl > 0 ? (
              <p className="text-xs text-muted-foreground">
                {t("pnl_share_of_capital", {
                  pct: ((totalPnL / tvl) * 100).toFixed(2),
                })}
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* THE OPERATOR'S OWN WALLET                                           */}
      {/* ------------------------------------------------------------------ */}
      {/* An ordinary card. This was pinned to the dark palette with a `dark`
          class in BOTH themes — a workaround for a migration that had left white
          ink on a near-white ground. On tokens there is nothing to work around,
          and a single dark slab in the middle of a light page was the one
          surface here that did not belong to the design system. */}
      <Card>
        <PanelHeader
          icon={WalletCards}
          tone="neutral"
          title={tExt("your_wallet_balance")}
          description={tExtAdmin("available_funds_to_deposit_into_the_pool")}
          action={
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchWalletBalances}
              disabled={loadingWallet}
              aria-label={tCommon("refresh")}
            >
              <RefreshCw className={cn("h-4 w-4", loadingWallet && "animate-spin")} />
            </Button>
          }
        />
        <CardContent padding="md">
          <div className="grid gap-5 sm:grid-cols-2">
            <Figure
              label={`${t("base")} (${walletBalances?.base?.currency || baseCurrency || ""})`}
              value={
                <span className="font-mono tabular-nums">
                  {(walletBalances?.base?.balance || 0).toFixed(8)}
                </span>
              }
            />
            <Figure
              label={`${tCommon("quote")} (${walletBalances?.quote?.currency || quoteCurrency || ""})`}
              value={
                <span className="font-mono tabular-nums">
                  {(walletBalances?.quote?.balance || 0).toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })}
                </span>
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* ------------------------------------------------------------------ */}
      {/* MOVES                                                               */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* DEPOSIT ------------------------------------------------------- */}
        <Card>
          <PanelHeader
            icon={PlusCircle}
            tone="success"
            title={tExt("deposit_funds")}
            description={tExtAdmin("add_funds_to_the_liquidity_pool")}
          />
          <CardContent padding="md" className="space-y-4">
            {currencyToggle(depositCurrency, setDepositCurrency)}

            <div className="flex items-center justify-between gap-2 rounded-md bg-muted px-3 py-2 text-sm">
              <span className="text-muted-foreground">
                {tCommon("available")}{" "}
                <span className="font-mono font-medium tabular-nums text-foreground">
                  {depositCurrency === "BASE"
                    ? (walletBalances?.base?.balance || 0).toFixed(8)
                    : (walletBalances?.quote?.balance || 0).toLocaleString(
                        undefined,
                        { maximumFractionDigits: 2 }
                      )}
                </span>
              </span>
              <button
                type="button"
                className="rounded-sm text-xs font-medium text-primary outline-hidden hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50"
                onClick={() =>
                  setDepositAmount(
                    String(
                      depositCurrency === "BASE"
                        ? walletBalances?.base?.balance || 0
                        : walletBalances?.quote?.balance || 0
                    )
                  )
                }
              >
                MAX
              </button>
            </div>

            <div className="relative">
              <Input
                type="number"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                placeholder={tCommon("enter_amount")}
                className="pr-16"
                aria-label={`${tExt("deposit_funds")} ${depositCurrency === "BASE" ? baseCurrency : quoteCurrency}`}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                {depositCurrency === "BASE" ? baseCurrency : quoteCurrency}
              </span>
            </div>

            <Button
              tone="success"
              fullWidth
              onClick={handleDeposit}
              loading={loading === "deposit"}
            >
              {loading !== "deposit" ? <PlusCircle className="h-4 w-4" /> : null}
              {tExt("deposit_funds")}
            </Button>
          </CardContent>
        </Card>

        {/* WITHDRAW ------------------------------------------------------ */}
        <Card>
          <PanelHeader
            icon={MinusCircle}
            tone="destructive"
            title={tCommon("withdraw_funds")}
            description={tExtAdmin("remove_funds_from_the_pool")}
          />
          <CardContent padding="md" className="space-y-4">
            {currencyToggle(withdrawCurrency, setWithdrawCurrency)}

            <div className="flex items-center justify-between gap-2 rounded-md bg-muted px-3 py-2 text-sm">
              <span className="text-muted-foreground">
                {tExtAdmin("pool_balance")}{" "}
                <span className="font-mono font-medium tabular-nums text-foreground">
                  {withdrawCurrency === "BASE"
                    ? baseBalance.toFixed(8)
                    : quoteBalance.toLocaleString(undefined, {
                        maximumFractionDigits: 2,
                      })}
                </span>
              </span>
              <button
                type="button"
                className="rounded-sm text-xs font-medium text-primary outline-hidden hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50"
                onClick={() =>
                  setWithdrawAmount(
                    String(withdrawCurrency === "BASE" ? baseBalance : quoteBalance)
                  )
                }
              >
                MAX
              </button>
            </div>

            <div className="relative">
              <Input
                type="number"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder={tCommon("enter_amount")}
                className="pr-16"
                aria-label={`${tCommon("withdraw_funds")} ${withdrawCurrency === "BASE" ? baseCurrency : quoteCurrency}`}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                {withdrawCurrency === "BASE" ? baseCurrency : quoteCurrency}
              </span>
            </div>

            <Button
              variant="outline"
              tone="destructive"
              fullWidth
              onClick={handleWithdraw}
              loading={loading === "withdraw"}
            >
              {loading !== "withdraw" ? <MinusCircle className="h-4 w-4" /> : null}
              {tCommon("withdraw_funds")}
            </Button>
          </CardContent>
        </Card>

        {/* REBALANCE ----------------------------------------------------- */}
        <Card>
          <PanelHeader
            icon={Scale}
            title={t("rebalance")}
            description={tExtAdmin("adjust_pool_asset_distribution")}
          />
          <CardContent padding="md" className="space-y-4">
            <div className="flex items-center justify-between gap-4 rounded-md bg-muted px-4 py-3">
              <div className="text-center">
                <p className="font-mono text-xl font-semibold tabular-nums text-foreground">
                  {rebalanceRatio[0]}%
                </p>
                <p className="text-[11px] text-subtle-foreground">
                  {baseCurrency || t("base")}
                </p>
              </div>
              <Scale className="h-6 w-6 text-muted-foreground" />
              <div className="text-center">
                <p className="font-mono text-xl font-semibold tabular-nums text-foreground">
                  {100 - rebalanceRatio[0]}%
                </p>
                <p className="text-[11px] text-subtle-foreground">
                  {quoteCurrency || tCommon("quote")}
                </p>
              </div>
            </div>

            <div>
              <Slider
                value={rebalanceRatio}
                onValueChange={setRebalanceRatio}
                min={10}
                max={90}
                step={1}
                aria-label={tExtAdmin("pool_rebalance_ratio_percentage_of_base_asset")}
              />
              <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                <span>{tExtAdmin("more_quote")}</span>
                <span>50/50</span>
                <span>{tExtAdmin("more_base")}</span>
              </div>
            </div>

            {/* Pool balances back real assets: a withdrawal turns them into a
                real wallet credit, and the matching engine settles user fills
                against them. So the first button only CALCULATES the move —
                converting one balance into the other at an operator-chosen price,
                with no order and no counterparty, would create currency out of
                nothing. The second trades it against order-backed depth only. */}
            <p className="rounded-md border border-border bg-surface-2 px-3 py-2 text-xs text-muted-foreground">
              {t("rebalance_explainer")}
            </p>

            <Button
              fullWidth
              onClick={handleRebalance}
              loading={loading === "rebalance"}
            >
              {loading !== "rebalance" ? <RefreshCw className="h-4 w-4" /> : null}
              {t("calculate_rebalance")}
            </Button>

            {rebalancePlan ? (
              <div className="space-y-3 rounded-md border border-border bg-surface-2 p-3">
                {rebalancePlan.message ? (
                  <p className="text-xs text-muted-foreground">
                    {rebalancePlan.message}
                  </p>
                ) : null}
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">
                    {baseCurrency || t("base")}
                  </span>
                  <span className="font-mono font-semibold tabular-nums text-foreground">
                    {rebalancePlan.requiredBaseChange >= 0 ? "+" : ""}
                    {rebalancePlan.requiredBaseChange.toFixed(8)}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">
                    {quoteCurrency || tCommon("quote")}
                  </span>
                  <span className="font-mono font-semibold tabular-nums text-foreground">
                    {rebalancePlan.requiredQuoteChange >= 0 ? "+" : ""}
                    {rebalancePlan.requiredQuoteChange.toFixed(8)}
                  </span>
                </div>

                {/* Execution is offered only once a plan has been calculated: the
                    operator has to have SEEN the size before agreeing to trade
                    it. */}
                <div className="space-y-3 border-t border-border pt-3">
                  <div className="flex items-center gap-3">
                    <label
                      htmlFor="mm-max-slippage"
                      className="shrink-0 text-xs text-muted-foreground"
                    >
                      {tExt("max_slippage")}
                    </label>
                    <div className="relative flex-1">
                      <Input
                        id="mm-max-slippage"
                        type="number"
                        min={0}
                        step={0.1}
                        value={maxSlippage}
                        onChange={(e) => setMaxSlippage(e.target.value)}
                        className="pr-8"
                        aria-label={tExt("max_slippage")}
                      />
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                        %
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    tone="destructive"
                    fullWidth
                    onClick={handleExecuteRebalance}
                    loading={loading === "rebalance-execute"}
                  >
                    {loading !== "rebalance-execute" ? (
                      <Coins className="h-4 w-4" />
                    ) : null}
                    {t("execute_against_the_book")}
                  </Button>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PoolManagement;
