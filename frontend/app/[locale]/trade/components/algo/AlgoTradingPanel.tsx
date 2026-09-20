"use client";

/**
 * Algo Trading panel — the in-trade bot builder.
 *
 * Mounts as a third tab beside "Standard" / "AI Investment" in both the Pro and
 * Standard order-form columns, mirroring how KuCoin puts strategy creation
 * inside the trading view rather than on a separate page. Everything the user
 * needs to launch a bot on the symbol they are already looking at lives here:
 * strategy choice, parameters seeded from the live price, projected economics,
 * risk limits, and funding.
 *
 * Data contract notes (see `frontend/store/trading-bot/index.ts`):
 *  - `$fetch` resolves `{data, error}` and never throws, so errors are read off
 *    the envelope rather than caught.
 *  - `createBot` DOES throw on a failed create (it is the one action that does).
 *  - The POST handler reads `strategyConfig`; a `config` key is ignored.
 *
 * Deep links (this panel is the platform's only bot-creation surface — the old
 * `/trading-bot/create` wizard now redirects here):
 *  - `?panel=algo` opens this tab; handled by the two order forms that mount it.
 *  - `?strategy=GRID` preselects a strategy type.
 *  - `?strategyId=<uuid>` deploys a purchased marketplace strategy instead,
 *    which supplies the type and config, so the parameter editor is hidden.
 */

import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AlertTriangle,
  Bot,
  Check,
  ExternalLink,
  Gauge,
  Loader2,
  RotateCcw,
  ShoppingBag,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { useSearchParams } from "next/navigation";
import { Link } from "@/i18n/routing";
import { $fetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useKycGate } from "@/hooks/use-kyc-gate";
import { useUserStore } from "@/store/user";
import {
  useTradingBotStore,
  usePaperAccountStore,
} from "@/store/trading-bot";
import {
  NumberField,
  PercentSlider,
  Section,
  Segmented,
  SliderField,
  StatRow,
  FieldLabel,
} from "./fields";
import { StrategyParams } from "./StrategyParams";
import {
  STRATEGIES,
  STRATEGY_BY_TYPE,
  buildDefaults,
  buildRiskDefaults,
  computeProjection,
  suggestBotName,
  validateConfig,
  type AlgoMode,
  type AlgoStrategyType,
  type RiskPreset,
} from "./strategies";
import "./algo.css";
import { useTranslations } from "next-intl";

/**
 * No `marketType`. The panel used to take one and branch the funding wallet on
 * it, which is what produced the SPOT-balance bug — the engine is ecosystem-only
 * whatever the surrounding page shows. Both mount points now render this only on
 * eco markets, so there is nothing left for the prop to select and having it
 * would imply an adaptability the addon does not have.
 */
export interface AlgoTradingPanelProps {
  symbol: string;
  currentPrice?: number | null;
  className?: string;
}

/** Short labels: the preset control shares a 2-column row with Mode, so the
 *  full words ("Conservative") do not fit without truncating mid-word. */
const PRESETS: { value: RiskPreset; label: string; title: string }[] = [
  { value: "conservative", label: "Low", title: "Conservative" },
  { value: "balanced", label: "Med", title: "Balanced" },
  { value: "aggressive", label: "High", title: "Aggressive" },
];

export const AlgoTradingPanel = memo(function AlgoTradingPanel({
  symbol,
  currentPrice,
  className,
}: AlgoTradingPanelProps) {
  const t = useTranslations("trade_components");
  const tCommon = useTranslations("common");
  const user = useUserStore((s) => s.user);
  const createBot = useTradingBotStore((s) => s.createBot);
  const createBotFromStrategy = useTradingBotStore(
    (s) => s.createBotFromStrategy
  );
  const startBot = useTradingBotStore((s) => s.startBot);
  const fetchBots = useTradingBotStore((s) => s.fetchBots);

  const paperAccount = usePaperAccountStore((s) => s.account);
  const fetchPaperAccount = usePaperAccountStore((s) => s.fetchAccount);

  const searchParams = useSearchParams();
  /** A marketplace strategy to deploy instead of a hand-built one. */
  const marketplaceStrategyId = searchParams.get("strategyId");

  const [base, quote] = useMemo(() => parseSymbol(symbol), [symbol]);

  /* ---------------- form state ---------------- */
  const [strategy, setStrategy] = useState<AlgoStrategyType>(() => {
    const requested = (searchParams.get("strategy") || "").toUpperCase();
    return STRATEGIES.some((s) => s.type === requested)
      ? (requested as AlgoStrategyType)
      : "GRID";
  });
  const [preset, setPreset] = useState<RiskPreset>("balanced");
  const [mode, setMode] = useState<AlgoMode>("PAPER");
  const [config, setConfig] = useState<Record<string, any>>({});
  const [risk, setRisk] = useState(() => buildRiskDefaults("balanced"));
  const [name, setName] = useState("");
  const [nameTouched, setNameTouched] = useState(false);
  const [allocated, setAllocated] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const price = currentPrice ?? 0;

  /* ---------------- live balance ---------------- */
  const [walletBalance, setWalletBalance] = useState(0);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const balanceKeyRef = useRef("");

  useEffect(() => {
    if (!user || !quote) {
      setWalletBalance(0);
      return;
    }
    // ALWAYS ECO, whatever market the surrounding page is showing.
    //
    // This read `marketType === "eco" ? "ECO" : "SPOT"`, so on a spot market it
    // showed — and validated the allocation against — a wallet that has nothing
    // to do with the bot. The engine trades ecosystem books end to end
    // (`placeEcosystemOrder`) and the funds backing a live bot are held from the
    // ECO wallet, so ECO is the only balance that can back the cap. Showing SPOT
    // meant a user with 5,000 SPOT and 0 ECO was told the allocation was covered
    // and then watched every order get refused for insufficient funds.
    const key = `ECO:${base}:${quote}`;
    if (balanceKeyRef.current === key) return;
    balanceKeyRef.current = key;

    let cancelled = false;
    setBalanceLoading(true);
    (async () => {
      const { data, error } = await $fetch({
        url: `/api/finance/wallet/symbol?type=ECO&currency=${base}&pair=${quote}`,
        silentSuccess: true,
        silent: true,
      });
      if (cancelled) return;
      // Bots are funded in the quote currency, so the PAIR side is what matters.
      const balance = !error && data ? Number(data.PAIR?.balance ?? data.PAIR ?? 0) : 0;
      setWalletBalance(Number.isFinite(balance) ? balance : 0);
      setBalanceLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [user, base, quote]);

  useEffect(() => {
    if (user && mode === "PAPER") fetchPaperAccount(quote);
  }, [user, mode, quote, fetchPaperAccount]);

  /* ---------------- marketplace strategy (deep link) ----------------
   * Fetched locally rather than through `useMarketplaceStore` so opening the
   * trade page does not overwrite `currentStrategy` for the marketplace pages. */
  const [marketplaceStrategy, setMarketplaceStrategy] = useState<{
    name: string;
    type: string;
  } | null>(null);

  useEffect(() => {
    if (!marketplaceStrategyId) {
      setMarketplaceStrategy(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await $fetch({
        url: `/api/trading-bot/marketplace/strategy/${marketplaceStrategyId}`,
        silentSuccess: true,
        silent: true,
      });
      if (cancelled || error || !data) return;
      setMarketplaceStrategy({ name: data.name, type: data.type });
      // Keeps the suggested bot name and the header accent consistent with what
      // is actually going to run.
      if (STRATEGIES.some((s) => s.type === data.type)) {
        setStrategy(data.type as AlgoStrategyType);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [marketplaceStrategyId]);

  const availableBalance =
    mode === "PAPER" ? (paperAccount?.balance ?? 0) : walletBalance;

  /* ---------------- seed + reseed defaults ----------------
   * Reseeding is keyed on strategy/preset/symbol only. Price is read through a
   * ref so a ticking market does not reset a config the user is editing. */
  const priceRef = useRef(price);
  priceRef.current = price;

  const seedDefaults = useCallback(
    (nextStrategy: AlgoStrategyType, nextPreset: RiskPreset) => {
      setConfig(buildDefaults(nextStrategy, priceRef.current, nextPreset));
      setRisk(buildRiskDefaults(nextPreset));
    },
    []
  );

  useEffect(() => {
    seedDefaults(strategy, preset);
  }, [strategy, preset, symbol, seedDefaults]);

  // Seed once more when the first real price lands, so a panel opened before
  // the ticker connected does not keep a grid range of 0–0.
  const seededWithPrice = useRef(false);
  useEffect(() => {
    if (!seededWithPrice.current && price > 0) {
      seededWithPrice.current = true;
      seedDefaults(strategy, preset);
    }
  }, [price, strategy, preset, seedDefaults]);

  // Keep the suggested name in sync until the user types their own.
  useEffect(() => {
    if (!nameTouched) setName(suggestBotName(strategy, symbol));
  }, [strategy, symbol, nameTouched]);

  /* ---------------- derived ---------------- */
  const meta = STRATEGY_BY_TYPE[strategy];

  /**
   * LIVE mode only. Paper trading spends nothing real, so the whole panel stays
   * open for it and the gate applies to the one branch that risks real balance.
   *
   * The server enforces this too (`assertKycFeature` in the create route), so
   * its absence here was never a hole — but an ungated user got all the way
   * through configuring a bot before the submit came back refused. The wizard
   * gated it; this panel did not.
   */
  const liveGate = useKycGate("trade_bot_live");
  const isLive = mode === "LIVE";
  const liveBlocked = isLive && !liveGate.allowed;
  // Only "signed in but not cleared" gets the notice — loading and anonymous
  // still block the submit but must not tell a visitor to verify.
  const showLiveNotice =
    isLive &&
    (liveGate.state === "needs_kyc" || liveGate.state === "needs_level");

  const projection = useMemo(
    () => computeProjection(strategy, config, price, quote),
    [strategy, config, price, quote]
  );

  const errors = useMemo(
    // A marketplace strategy carries its own validated config; there is no
    // local parameter form to check, only the allocation.
    () =>
      marketplaceStrategyId
        ? allocated > 0
          ? []
          : ["Enter an allocation"]
        : validateConfig(strategy, config, allocated),
    [marketplaceStrategyId, strategy, config, allocated]
  );

  const insufficient = allocated > availableBalance;
  const canSubmit =
    !!user &&
    !liveBlocked &&
    errors.length === 0 &&
    !insufficient &&
    !submitting;

  const applyPercent = useCallback(
    (pct: number) => {
      setAllocated(Number(((availableBalance * pct) / 100).toFixed(2)));
    },
    [availableBalance]
  );

  // Derived, not stored: a `selectedPct` state could disagree with the amount
  // as soon as the field was typed into, which is exactly what the old chips
  // did — they stayed lit on 50% next to a hand-edited number.
  const allocatedPercent = useMemo(() => {
    if (availableBalance <= 0 || allocated <= 0) return 0;
    return Math.min(100, (allocated / availableBalance) * 100);
  }, [allocated, availableBalance]);

  /* ---------------- submit ---------------- */
  const handleSubmit = useCallback(
    async (startImmediately: boolean) => {
      if (!canSubmit) return;
      setSubmitting(true);
      try {
        const botName = name.trim() || suggestBotName(strategy, symbol);

        const bot = marketplaceStrategyId
          ? await createBotFromStrategy(marketplaceStrategyId, {
              name: botName,
              symbol,
              mode,
              allocatedAmount: allocated,
            })
          : await createBot({
              name: botName,
              symbol,
              type: strategy,
              mode,
              strategyConfig: config,
              allocatedAmount: allocated,
              maxPositionSize: Math.max(1, allocated),
              ...risk,
            } as any);

        // The bot EXISTS from here on. A failed start is reported as a failed
        // start, not a failed create — sharing one catch meant a start refusal
        // ("Bot has no allocated funds") surfaced as "Could not create bot" and
        // skipped the `fetchBots` below, so the draft that had just been created
        // was missing from the bots table until the next refresh.
        if (startImmediately && bot?.id) {
          try {
            await startBot(bot.id);
            toast.success(t("is_now_running", { name: String(bot.name) }));
          } catch (startErr: any) {
            toast.error(
              startErr?.message || t("was_created_but_could_not_start", { name: String(bot.name) })
            );
          }
        } else {
          toast.success(`${bot?.name ?? tCommon("bot")} saved as draft`);
        }

        setAllocated(0);
        await fetchBots();
      } catch (err: any) {
        toast.error(err?.message || t("could_not_create_bot"));
      } finally {
        setSubmitting(false);
      }
    },
    [
      canSubmit,
      createBot,
      createBotFromStrategy,
      marketplaceStrategyId,
      startBot,
      fetchBots,
      name,
      strategy,
      symbol,
      mode,
      config,
      allocated,
      risk,
    ]
  );

  /* ---------------- render ---------------- */
  return (
    <div
      className={cn("algo-panel flex h-full flex-col", className)}
      style={{ ["--algo-accent" as any]: meta?.accent }}
    >
      {/*
        No "Algo Trading" title bar. The tab the user just clicked already says
        Algo and the panel header above it already says Trade — a third label
        for the same thing cost a full row in a 300px column. What was actually
        useful in that bar (the dashboard link) moves onto the section header,
        which is the same header treatment every other section in the panel and
        in the order form uses.
      */}
      <div className="flex items-center justify-between gap-2 px-2 pt-2.5 pb-1.5">
        <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--algo-text-dim)]">
          <Bot className="h-3 w-3 text-[var(--algo-accent)]" />
          Strategy
        </span>
        <Link
          href="/trading-bot/dashboard"
          className="flex items-center gap-0.5 rounded px-1 text-[10px] text-[var(--algo-blue)] transition-colors hover:bg-[var(--algo-bg-raised)]"
        >
          Dashboard
          <ExternalLink className="h-2.5 w-2.5" />
        </Link>
      </div>

      {/* Strategy source: a marketplace strategy replaces the picker entirely —
          it supplies both the type and the parameters, so offering either would
          be offering to overwrite what the user bought. */}
      {marketplaceStrategyId ? (
        <div className="algo-card mx-2 flex items-start gap-2 px-2.5 py-2">
          <ShoppingBag className="mt-[1px] h-3.5 w-3.5 shrink-0 text-[var(--algo-blue)]" />
          <div className="min-w-0">
            <p className="truncate text-[12px] font-medium text-[var(--algo-text)]">
              {marketplaceStrategy?.name ?? t("marketplace_strategy")}
            </p>
            <p className="text-[10px] leading-snug text-[var(--algo-text-muted)]">
              {t("runs_the_purchased_configuration_pick_a")}
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-1 px-2">
            {STRATEGIES.map((s) => {
              const active = s.type === strategy;
              const Icon = s.icon;
              return (
                <button
                  key={s.type}
                  type="button"
                  title={s.tagline}
                  onClick={() => setStrategy(s.type)}
                  style={{ ["--algo-accent" as any]: s.accent }}
                  className={cn(
                    "algo-chip flex flex-col items-center gap-1 px-1 py-2",
                    active && "algo-chip-active"
                  )}
                >
                  <Icon
                    className="h-4 w-4"
                    style={{
                      color: active ? s.accent : "var(--algo-text-muted)",
                    }}
                  />
                  <span
                    className={cn(
                      "text-[10px] font-medium leading-none",
                      active
                        ? "text-[var(--algo-text)]"
                        : "text-[var(--algo-text-muted)]"
                    )}
                  >
                    {s.shortLabel}
                  </span>
                </button>
              );
            })}
          </div>

          <p className="px-2 pt-2 text-[10px] leading-snug text-[var(--algo-text-muted)]">
            {meta?.tagline}{" "}
            <span className="text-[var(--algo-text-dim)]">
              {tCommon("best_for")} {meta?.bestFor.toLowerCase()}.
            </span>
          </p>
        </>
      )}

      {/* Preset + mode */}
      <div className="grid grid-cols-2 gap-2 px-2 pt-2.5">
        <Segmented
          label={t("risk_profile")}
          size="sm"
          value={preset}
          onChange={(v) => setPreset(v)}
          options={PRESETS.map((p) => ({ value: p.value, label: p.label }))}
          hint={t("re_seeds_parameters_and_risk_limits")}
        />
        <Segmented
          label="Mode"
          size="sm"
          value={mode}
          onChange={(v) => setMode(v)}
          options={[
            { value: "PAPER", label: tCommon("paper") },
            { value: "LIVE", label: tCommon("live") },
          ]}
          hint={t("paper_trades_against_a_simulated_balance")}
        />
      </div>

      {/* Scrollable parameter column */}
      <div className="algo-scroll mt-1.5 min-h-0 flex-1 overflow-y-auto">
        {!marketplaceStrategyId && (
          <StrategyParams
            type={strategy}
            config={config}
            onChange={setConfig}
            price={price}
            base={base}
            quote={quote}
          />
        )}

        {/* Funding */}
        <Section title="Allocation">
          {/* Balance card, same shell as the order form's Available cells. */}
          <div>
            <div className="mb-1 flex min-h-[14px] items-center justify-between">
              <FieldLabel>
                {mode === "PAPER" ? tCommon("paper_balance") : tCommon("available")}
              </FieldLabel>
              {mode === "PAPER" && paperAccount && (
                <button
                  type="button"
                  title={t("reset_the_simulated_balance")}
                  onClick={async () => {
                    await usePaperAccountStore.getState().resetAccount(quote);
                    toast.success(t("paper_account_reset"));
                  }}
                  className="-mr-0.5 shrink-0 rounded p-0.5 text-[var(--algo-text-muted)] transition-colors hover:bg-[var(--algo-bg-elevated)] hover:text-[var(--algo-text)]"
                >
                  <RotateCcw className="h-3 w-3" />
                </button>
              )}
            </div>
            <div className="algo-card flex items-center justify-between px-2 py-1.5">
              <span className="flex items-center gap-1 text-[10px] text-[var(--algo-text-muted)]">
                <Wallet className="h-3 w-3" />
                {quote}
              </span>
              {balanceLoading && mode === "LIVE" ? (
                <Loader2 className="h-3 w-3 animate-spin text-[var(--algo-text-muted)]" />
              ) : (
                <span className="algo-num text-[12px] text-[var(--algo-text)]">
                  {availableBalance.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              )}
            </div>
          </div>

          <NumberField
            label={t("allocate", { quote: String(quote) })}
            value={allocated}
            onChange={setAllocated}
            step={10}
            min={0}
            showSteppers={false}
            hint={t("funds_reserved_for_this_bot_can_be_topped_up_later")}
          />

          <PercentSlider
            value={allocatedPercent}
            onSelect={applyPercent}
            disabled={availableBalance <= 0}
          />
        </Section>

        {/* Projection — derived from the local parameter form, so it says
            nothing about a marketplace strategy's own configuration. */}
        {!marketplaceStrategyId && projection.length > 0 && (
          <Section title="Projection">
            <div className="algo-card space-y-1.5 px-2.5 py-2">
              {projection.map((row) => (
                <StatRow
                  key={row.label}
                  label={row.label}
                  value={row.value}
                  tone={row.tone}
                  hint={row.hint}
                />
              ))}
            </div>
            <p className="text-[10px] leading-snug text-[var(--algo-text-muted)]">
              {t("estimates_only_actual_results_depend_on")}
            </p>
          </Section>
        )}

        {/* Risk & identity */}
        <Section
          title={marketplaceStrategyId ? t("bot_name") : tCommon("tab_risk")}
          collapsible
          defaultOpen={false}
        >
          <div className="space-y-1">
            <FieldLabel htmlFor="algo-bot-name">{t("bot_name")}</FieldLabel>
            <input
              id="algo-bot-name"
              value={name}
              maxLength={100}
              onChange={(e) => {
                setNameTouched(true);
                setName(e.target.value);
              }}
              className="algo-input h-8 px-2.5 text-[13px]"
            />
          </div>

          {/* The marketplace deploy endpoint accepts name, symbol, mode and
              allocation ONLY — the strategy's own envelope governs the rest.
              Rendering these controls on that path would collect six numbers
              and drop every one of them. */}
          {!marketplaceStrategyId && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <NumberField
                  label={`${tCommon("stop_loss")} %`}
                  value={risk.stopLossPercent}
                  onChange={(v) => setRisk((r) => ({ ...r, stopLossPercent: v }))}
                  step={0.5}
                  min={0.1}
                  max={50}
                  showSteppers={false}
                />
                <NumberField
                  label={`${tCommon("take_profit")} %`}
                  value={risk.takeProfitPercent}
                  onChange={(v) =>
                    setRisk((r) => ({ ...r, takeProfitPercent: v }))
                  }
                  step={0.5}
                  min={0.1}
                  max={100}
                  showSteppers={false}
                />
              </div>

              <SliderField
                label={tCommon("daily_loss_limit")}
                value={risk.dailyLossLimitPercent}
                min={1}
                max={100}
                step={1}
                onChange={(v) =>
                  setRisk((r) => ({ ...r, dailyLossLimitPercent: v }))
                }
                format={(v) => `${v}%`}
                hint={t("bot_pauses_for_the_day_once")}
              />

              <SliderField
                label={tCommon("max_drawdown")}
                value={risk.maxDrawdownPercent}
                min={1}
                max={50}
                step={1}
                onChange={(v) =>
                  setRisk((r) => ({ ...r, maxDrawdownPercent: v }))
                }
                format={(v) => `${v}%`}
                hint={t("bot_pauses_if_equity_falls_this_far_below_its_peak")}
              />

              <div className="grid grid-cols-2 gap-2">
                <NumberField
                  label={t("max_trades")}
                  value={risk.maxConcurrentTrades}
                  onChange={(v) =>
                    setRisk((r) => ({ ...r, maxConcurrentTrades: v }))
                  }
                  step={1}
                  min={1}
                  max={50}
                  showSteppers={false}
                  hint={t("concurrent_open_trades")}
                />
                <NumberField
                  label="Cooldown (s)"
                  value={risk.cooldownSeconds}
                  onChange={(v) =>
                    setRisk((r) => ({ ...r, cooldownSeconds: v }))
                  }
                  step={10}
                  min={0}
                  showSteppers={false}
                  hint={t("minimum_gap_between_trades")}
                />
              </div>
            </>
          )}
        </Section>
      </div>

      {/* Action bar — same anatomy as the order form's: primary control, then a
          fixed-height message slot so a validation line never resizes the
          panel as it appears. */}
      <div className="shrink-0 space-y-2 border-t border-[var(--algo-border)] p-2">
        {mode === "LIVE" && !showLiveNotice && (
          <div className="algo-tint-warn flex items-start gap-1.5 rounded-md border px-2 py-1.5">
            <Gauge className="mt-[1px] h-3 w-3 shrink-0 text-[var(--algo-yellow)]" />
            <p className="text-[10px] leading-snug text-[var(--algo-text-dim)]">
              {t("live_mode_trades_real_funds_test_in_paper_first")}
            </p>
          </div>
        )}

        {/* Verification gate replaces the generic live-mode warning: it is the
            blocking condition, so it is the one worth the space. */}
        {showLiveNotice && (
          <div className="algo-tint-warn flex items-start gap-1.5 rounded-md border px-2 py-1.5">
            <AlertTriangle className="mt-[1px] h-3 w-3 shrink-0 text-[var(--algo-yellow)]" />
            <p className="text-[10px] leading-snug text-[var(--algo-text-dim)]">
              {t("live_bots_need_identity_verification")}{" "}
              <Link
                href="/user/kyc"
                className="text-[var(--algo-blue)] underline-offset-2 hover:underline"
              >
                {t("verify_your_account")}
              </Link>{" "}
              or switch to Paper.
            </p>
          </div>
        )}

        {!user ? (
          <p className="py-1 text-center text-[11px] text-[var(--algo-text-muted)]">
            {t("sign_in_to_create_a_bot")}
          </p>
        ) : (
          <>
            <div className="space-y-1">
              <button
                type="button"
                disabled={!canSubmit}
                onClick={() => handleSubmit(true)}
                className={cn(
                  "flex w-full items-center justify-center gap-1.5 rounded-md py-2.5 text-[13px] font-semibold transition-all",
                  // The strategy accent is categorical and can be the yellow or
                  // the green one — no ink clears 4.5:1 on all five. A control
                  // with a label takes the interaction accent and its paired
                  // foreground; identity stays on the chips and the slider.
                  "bg-[var(--algo-blue)] text-[var(--algo-blue-fg)]",
                  "hover:opacity-90 active:scale-[0.99]",
                  "disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100"
                )}
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    {tCommon("creating")}…
                  </>
                ) : (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    Create &amp; Start {meta?.shortLabel} Bot
                  </>
                )}
              </button>

              <div className="flex min-h-[16px] items-start justify-center gap-1 px-1">
                {(errors.length > 0 || insufficient) && allocated > 0 && (
                  <>
                    <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-[var(--algo-red)]" />
                    <p className="text-[10px] leading-4 text-[var(--algo-red)]">
                      {insufficient ? tCommon("insufficient_balance") : errors[0]}
                    </p>
                  </>
                )}
              </div>
            </div>

            <button
              type="button"
              disabled={!canSubmit}
              onClick={() => handleSubmit(false)}
              className="w-full rounded-md py-1.5 text-[11px] font-medium text-[var(--algo-text-muted)] transition-colors hover:bg-[var(--algo-bg-raised)] hover:text-[var(--algo-text)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
            >
              {tCommon("save_as_draft")}
            </button>
          </>
        )}
      </div>
    </div>
  );
});

/** "BTC/USDT" and "BTCUSDT" both resolve to ["BTC", "USDT"]. */
function parseSymbol(symbol: string): [string, string] {
  if (!symbol) return ["BTC", "USDT"];
  if (symbol.includes("/")) {
    const [b, q] = symbol.split("/");
    return [b || "BTC", q || "USDT"];
  }
  for (const q of ["USDT", "BUSD", "USDC", "USD", "BTC", "ETH"]) {
    if (symbol.endsWith(q) && symbol.length > q.length) {
      return [symbol.slice(0, -q.length), q];
    }
  }
  return [symbol, "USDT"];
}

export default AlgoTradingPanel;
