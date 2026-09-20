"use client";

import { useEffect, useMemo, useState } from "react";
import { m, AnimatePresence } from "framer-motion";
import {
  Eye,
  EyeOff,
  TrendingUp,
  TrendingDown,
  Wallet as WalletIcon,
  Sparkles,
  RefreshCw,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { useWalletStore } from "@/store/finance/wallet-store";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { formatNumber, getWalletTheme } from "../../_components/finance-ui";
import { useConfigStore } from "@/store/config";

export function WalletHero() {
  const tFinance = useTranslations("finance");
  const t = useTranslations("finance");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const { settings, extensions } = useConfigStore();
  const {
    totalBalance,
    totalPending,
    totalChange,
    totalChangePercent,
    totalWallets,
    activeWallets,
    walletsByType,
    unpricedCurrencies,
    fetchStats,
    isLoadingStats,
  } = useWalletStore();

  const [hidden, setHidden] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  const positive = (totalChange ?? 0) >= 0;

  /**
   * ALLOCATION IS IN DOLLARS, AND ONLY `balanceUSD` IS IN DOLLARS.
   *
   * `walletsByType[type].balance` is a raw sum of NATIVE currency units across
   * every wallet of that type — 40,000 NGN + 12 ZAR adds up to "40,012". This
   * panel prints its figures with a `$` and divides them to get share
   * percentages, so reading `balance` here labelled a 40,000 NGN deposit as
   * $40K (≈ $29 in reality, a 1,360x overstatement) and handed Fiat 100% of a
   * portfolio that was mostly crypto. The backend already converts each wallet
   * at its own rate; `balanceUSD` is that figure, and it is the only one that
   * can be compared across types or prefixed with a dollar sign.
   *
   * There is deliberately no client-side fallback that sums the wallet list:
   * the raw wallet rows carry native balances and no rates, so any total built
   * from them is the same category error. Until the stats call lands there is
   * no honest number to show, and the loading state below says so.
   */
  const allocation = useMemo(() => {
    if (!walletsByType) return [];

    const types = Object.entries(walletsByType).map(([k, v]: [string, any]) => ({
      key: k,
      balance: typeof v?.balanceUSD === "number" ? v.balanceUSD : 0,
      pending: typeof v?.pendingUSD === "number" ? v.pendingUSD : 0,
      count: typeof v?.count === "number" ? v.count : 0,
    }));

    const total = types.reduce((s, t) => s + t.balance, 0);
    return types
      .map((t) => ({
        ...t,
        share: total > 0 ? Math.max(0, (t.balance / total) * 100) : 0,
      }))
      .sort((a, b) => b.balance - a.balance);
  }, [walletsByType]);

  const hasAllocation = allocation.some((a) => a.balance > 0);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      useWalletStore.getState().fetchWallets(),
      useWalletStore.getState().fetchStats({ force: true }),
    ]);
    setTimeout(() => setRefreshing(false), 400);
  };

  const formatted = (n: number) => {
    if (hidden) return "•••••";
    return formatNumber(n, { decimals: 2 });
  };

  return (
    <m.div
      data-tour="wallet-balance"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="relative overflow-hidden rounded-3xl border border-border/70 bg-card/80 p-5 backdrop-blur-2xl shadow-xl sm:p-7"
    >
      {/* Hero ambient gradients */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        {/* Both blooms are the accent. The second was a second hue purely for
            decoration, which put an unexplained green wash in the corner of the
            balance card — the loudest colour on a finance page should be the
            balance figure, not the background. */}
        <div className="absolute -top-32 left-1/4 h-72 w-72 rounded-full bg-primary/30 blur-3xl dark:bg-primary/20" />
        <div className="absolute -bottom-32 right-1/4 h-72 w-72 rounded-full bg-primary/20 blur-3xl dark:bg-primary/10" />
        <div
          className="absolute inset-0 opacity-[0.04] dark:opacity-[0.08]"
          style={{
            backgroundImage:
              "linear-gradient(hsl(var(--border)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />
      </div>

      <div className="relative grid gap-6 lg:grid-cols-[1.2fr_1fr] lg:items-center">
        {/* Hero left — total balance */}
        <div>
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-subtle-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            {tCommon("your_wallets")}
          </div>
          <div className="mt-3 flex items-center gap-3">
            {/* The testid lives on this PLAIN wrapper, not on the `m.span`
                inside. Framer's motion components do not forward `data-testid`
                to the DOM, so the attribute simply vanished and a cross-layer
                spec failed with "no element matched" — indistinguishable, from
                the outside, from a figure that never rendered. The wrapper also
                carries the `$`, which the money parser strips, so the value read
                from it is the same. */}
            <div
              data-testid="wallet-total-usd"
              className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl"
            >
              <span className="mr-1 align-top text-base font-semibold text-subtle-foreground">
                $
              </span>
              <AnimatePresence mode="wait">
                <m.span
                  key={hidden ? "hidden" : `value-${totalBalance}`}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18 }}
                  className="inline-block tabular-nums"
                >
                  {formatted(totalBalance || 0)}
                </m.span>
              </AnimatePresence>
            </div>
            <button
              onClick={() => setHidden((v) => !v)}
              aria-label={hidden ? tFinance("show_balance") : tFinance("hide_balance")}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card/70 text-subtle-foreground transition hover:bg-card hover:text-foreground dark:border-border/70 dark:hover:bg-surface-2"
            >
              {hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
            <button
              onClick={handleRefresh}
              aria-label="Refresh"
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card/70 text-subtle-foreground transition hover:bg-card hover:text-foreground",
                "dark:border-border/70 text-muted-foreground dark:hover:bg-surface-2 dark:hover:text-foreground",
                (refreshing || isLoadingStats) && "animate-spin"
              )}
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <div
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold",
                positive
                  ? "border-success/30 bg-success/10 text-up"
                  : "border-destructive/30 bg-destructive/10 text-down"
              )}
            >
              {positive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
              {positive ? "+" : ""}
              {formatNumber(totalChange ?? 0, { decimals: 2 })} ({(totalChangePercent ?? 0).toFixed(2)}%)
            </div>
            <span className="text-xs text-subtle-foreground">
              24h • Across {totalWallets || 0} wallets ({activeWallets || 0} active)
            </span>
          </div>

          {/* Awaiting approval. This money is NOT in the figure above and must
              not read as though it were — it is a deposit the user has declared
              that no admin has confirmed, and it disappears if it is rejected. */}
          {(totalPending ?? 0) > 0 && (
            <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-warning/30 bg-warning/10 px-3 py-1.5 text-xs font-medium text-warning-ink">
              <Clock className="h-3.5 w-3.5 shrink-0" />
              <span className="tabular-nums" data-testid="wallet-pending-usd">
                {hidden ? "•••" : `$${formatNumber(totalPending, { decimals: 2 })}`}
              </span>
              <span className="text-warning/80">
                {t("awaiting_approval_not_included_in_your_balance")}
              </span>
            </div>
          )}

          {/* A currency we cannot price contributes $0 to the total above. Saying
              so is the difference between an incomplete total and a wrong one. */}
          {unpricedCurrencies?.length > 0 && (
            <div className="mt-2 flex items-start gap-2 text-[11px] text-subtle-foreground">
              <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
              <span>
                {t("no_exchange_rate_for")} {unpricedCurrencies.join(", ")} —{" "}
                {t("these_balances_are_excluded_from_the_total")}
              </span>
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-2">
            <button
              onClick={() => router.push("/finance/deposit")}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition hover:brightness-110"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M19 12l-7 7-7-7" />
              </svg>
              {tCommon("add_funds")}
            </button>
            <button
              onClick={() => router.push("/finance/withdraw")}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-card/70 px-4 py-2.5 text-sm font-semibold text-foreground backdrop-blur transition hover:bg-card dark:border-border/70 text-foreground dark:hover:bg-surface-2"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5M5 12l7-7 7 7" />
              </svg>
              {tCommon("withdraw")}
            </button>
            <button
              onClick={() => router.push("/finance/transfer")}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-card/70 px-4 py-2.5 text-sm font-semibold text-foreground backdrop-blur transition hover:bg-card dark:border-border/70 text-foreground dark:hover:bg-surface-2"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4M3 8l4-4 4 4M17 8v12M21 16l-4 4-4-4" />
              </svg>
              {tCommon("transfer")}
            </button>
          </div>
        </div>

        {/* Hero right — allocation breakdown */}
        <div className="rounded-2xl border border-border/60 bg-linear-to-br from-card/90 to-muted/40 p-4 sm:p-5 dark:from-surface-2/70 dark:to-background/40">
          <div className="mb-4 flex items-center justify-between">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-subtle-foreground">
              Allocation
            </div>
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              {tFinance("by_type")}
            </span>
          </div>

          {/* Stacked bar */}
          <div className="mb-5 h-3 w-full overflow-hidden rounded-full bg-muted">
            <div className="flex h-full">
              {!hasAllocation ? (
                <div className="h-full w-full animate-pulse bg-muted" />
              ) : (
                allocation.map((a) => {
                  const theme = getWalletTheme(a.key);
                  return (
                    <div
                      key={a.key}
                      style={{ width: `${a.share}%` }}
                      className={cn("h-full transition-all", theme.gradient)}
                      title={`${a.key} • ${a.share.toFixed(1)}%`}
                    />
                  );
                })
              )}
            </div>
          </div>

          <div className="space-y-2.5">
            {allocation.length === 0 ? (
              <div className="flex items-center gap-2 rounded-xl border border-dashed border-border bg-card/40 p-3 text-xs text-subtle-foreground dark:bg-surface-2/40">
                <WalletIcon className="h-4 w-4" />
                {t("no_balance_data_available")}
              </div>
            ) : (
              allocation.map((a) => {
                const theme = getWalletTheme(a.key);
                return (
                  <div
                    key={a.key}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border/40 bg-card/60 px-3 py-2 dark:bg-surface-2/40"
                  >
                    <div className="flex items-center gap-2">
                      <span className={cn("h-2 w-2 rounded-full", theme.gradient)} />
                      <span className="text-xs font-semibold text-muted-foreground">{theme.label}</span>
                      <span className="text-[10px] font-medium text-muted-foreground">
                        {a.count}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <div className="flex flex-col items-end">
                        <span className="tabular-nums text-xs font-semibold text-foreground">
                          {hidden ? "•••" : `$${formatNumber(a.balance, { decimals: 2, compact: true })}`}
                        </span>
                        {a.pending > 0 && !hidden && (
                          <span className="tabular-nums text-[10px] font-medium text-warning">
                            +${formatNumber(a.pending, { decimals: 2, compact: true })} {tCommon("pending")}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-medium text-muted-foreground">
                        {a.share.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </m.div>
  );
}
