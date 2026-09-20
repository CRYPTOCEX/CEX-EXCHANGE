"use client";

/**
 * Per-strategy parameter forms.
 *
 * Each branch renders exactly the fields the backend's `getConfigSchema()`
 * declares for that strategy type — no more, no less — so whatever the user
 * builds here is directly submittable as `strategyConfig`.
 */

import React, { memo, useCallback } from "react";
import { ExternalLink, Workflow } from "lucide-react";
import { Link } from "@/i18n/routing";
import {
  NumberField,
  Section,
  Segmented,
  SelectField,
  SliderField,
  SwitchRow,
  FieldLabel,
} from "./fields";
import { roundPrice, type AlgoStrategyType } from "./strategies";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

interface StrategyParamsProps {
  type: AlgoStrategyType;
  config: Record<string, any>;
  onChange: (config: Record<string, any>) => void;
  price: number;
  base: string;
  quote: string;
}

export const StrategyParams = memo(function StrategyParams({
  type,
  config,
  onChange,
  price,
  base,
  quote,
}: StrategyParamsProps) {
  const patch = useCallback(
    (next: Record<string, any>) => onChange({ ...config, ...next }),
    [config, onChange]
  );

  switch (type) {
    case "GRID":
      return (
        <GridParams
          config={config}
          patch={patch}
          price={price}
          quote={quote}
        />
      );
    case "DCA":
      return <DcaParams config={config} patch={patch} quote={quote} />;
    case "INDICATOR":
      return (
        <IndicatorParams config={config} patch={patch} onChange={onChange} quote={quote} />
      );
    case "TRAILING_STOP":
      return <TrailingParams config={config} patch={patch} quote={quote} />;
    case "CUSTOM":
      return <CustomParams config={config} patch={patch} quote={quote} />;
    default:
      return null;
  }
});

/* ------------------------------------------------------------------ */
/* GRID                                                                */
/* ------------------------------------------------------------------ */

const BAND_PRESETS = [3, 5, 10, 20];

const GridParams = memo(function GridParams({
  config,
  patch,
  price,
  quote,
}: {
  config: Record<string, any>;
  patch: (next: Record<string, any>) => void;
  price: number;
  quote: string;
}) {
  const t = useTranslations("trade_components");
  const tCommon = useTranslations("common");
  /** Re-centre the band on the live price at ±percent. */
  const applyBand = useCallback(
    (percent: number) => {
      if (!(price > 0)) return;
      patch({
        lowerPrice: roundPrice(price * (1 - percent / 100)),
        upperPrice: roundPrice(price * (1 + percent / 100)),
      });
    },
    [price, patch]
  );

  const lower = Number(config.lowerPrice) || 0;
  const upper = Number(config.upperPrice) || 0;
  const outOfRange = price > 0 && (price < lower || price > upper);

  return (
    <>
      <Section
        title={tCommon("price_range")}
        action={
          <div className="flex gap-0.5">
            {BAND_PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => applyBand(p)}
                className="rounded bg-[var(--algo-bg-raised)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--algo-text-muted)] transition-colors hover:bg-[var(--algo-bg-elevated)] hover:text-[var(--algo-text)]"
              >
                ±{p}%
              </button>
            ))}
          </div>
        }
      >
        <div className="grid grid-cols-2 gap-2">
          <NumberField
            label="Lower"
            value={config.lowerPrice ?? 0}
            onChange={(v) => patch({ lowerPrice: v })}
            step={price > 1000 ? 10 : price > 1 ? 0.1 : 0.0001}
            min={0}
            unit={quote}
            showSteppers={false}
          />
          <NumberField
            label="Upper"
            value={config.upperPrice ?? 0}
            onChange={(v) => patch({ upperPrice: v })}
            step={price > 1000 ? 10 : price > 1 ? 0.1 : 0.0001}
            min={0}
            unit={quote}
            showSteppers={false}
          />
        </div>

        {outOfRange && (
          <p className="text-[10px] leading-snug text-[var(--algo-yellow)]">
            {t("market_price_is_outside_this_range")}
          </p>
        )}
      </Section>

      <Section title={t("grid_structure")}>
        <SliderField
          label={tCommon("grid_levels")}
          value={Number(config.gridCount) || 2}
          min={2}
          max={100}
          step={1}
          onChange={(v) => patch({ gridCount: v })}
          hint={t("more_levels_means_smaller_but_more")}
        />

        <Segmented
          label="Spacing"
          value={config.gridType === "geometric" ? "geometric" : "arithmetic"}
          onChange={(v) => patch({ gridType: v })}
          hint={t("arithmetic_spaces_levels_by_a_fixed")}
          options={[
            { value: "arithmetic", label: t("arithmetic") },
            { value: "geometric", label: t("geometric") },
          ]}
        />

        <NumberField
          label={t("amount_per_grid", { quote: String(quote) })}
          value={config.amountPerGrid ?? 0}
          onChange={(v) => patch({ amountPerGrid: v })}
          step={5}
          min={0}
          hint={t("order_size_placed_at_each_grid_level")}
        />
      </Section>

      <Section title="Execution" collapsible defaultOpen={false}>
        <SwitchRow
          label={t("initial_buy")}
          checked={!!config.initialBuy}
          onChange={(v) => patch({ initialBuy: v })}
          hint={t("open_a_market_position_immediately_so")}
        />
        <SwitchRow
          label={t("sell_all_on_stop")}
          checked={!!config.sellAllOnStop}
          onChange={(v) => patch({ sellAllOnStop: v })}
          hint={t("liquidate_the_accumulated_position_when_the")}
        />
      </Section>
    </>
  );
});

/* ------------------------------------------------------------------ */
/* DCA                                                                 */
/* ------------------------------------------------------------------ */

const DcaParams = memo(function DcaParams({
  config,
  patch,
  quote,
}: {
  config: Record<string, any>;
  patch: (next: Record<string, any>) => void;
  quote: string;
}) {
  const t = useTranslations("trade_components");
  const tCommon = useTranslations("common");
  const conditionEnabled = !!config.priceCondition?.enabled;

  const patchCondition = useCallback(
    (next: Record<string, any>) =>
      patch({ priceCondition: { ...(config.priceCondition ?? {}), ...next } }),
    [config.priceCondition, patch]
  );

  return (
    <>
      <Section title="Schedule">
        <SelectField
          label={t("buy_interval")}
          value={config.interval ?? "daily"}
          onChange={(v) => patch({ interval: v })}
          options={[
            { value: "hourly", label: t("hourly") },
            { value: "daily", label: tCommon("daily") },
            { value: "weekly", label: tCommon("weekly") },
            { value: "biweekly", label: "Every 2 weeks" },
            { value: "monthly", label: tCommon("monthly") },
          ]}
        />

        {config.interval === "hourly" && (
          <NumberField
            label={t("every_n_hours")}
            value={config.intervalHours ?? 1}
            onChange={(v) => patch({ intervalHours: v })}
            step={1}
            min={1}
            max={24}
          />
        )}
      </Section>

      <Section title={tCommon("order_size")}>
        <Segmented
          label={tCommon("amount_type")}
          value={config.amountType === "percentage" ? "percentage" : "fixed"}
          onChange={(v) => patch({ amountType: v })}
          hint={t("fixed_spends_a_set_amount_percentage")}
          options={[
            { value: "fixed", label: tCommon("fixed") },
            { value: "percentage", label: t("percent") },
          ]}
        />

        <NumberField
          label={
            config.amountType === "percentage"
              ? t("amount_per_buy")
              : t("amount_per_buy_1", { quote: String(quote) })
          }
          value={config.amount ?? 0}
          onChange={(v) => patch({ amount: v })}
          step={config.amountType === "percentage" ? 1 : 5}
          min={0}
        />

        <NumberField
          label={t("max_buys")}
          value={config.maxBuys ?? 0}
          onChange={(v) => patch({ maxBuys: v })}
          step={1}
          min={0}
          hint={t("bot_stops_after_this_many_purchases")}
        />
      </Section>

      <Section title={t("entry_filter")} collapsible defaultOpen={conditionEnabled}>
        <SwitchRow
          label={t("only_buy_on_dips")}
          checked={conditionEnabled}
          onChange={(v) => patchCondition({ enabled: v })}
          hint={t("skip_scheduled_buys_unless_the_price")}
        />

        {conditionEnabled && (
          <>
            <SelectField
              label="Condition"
              value={config.priceCondition?.type ?? "below_ma"}
              onChange={(v) => patchCondition({ type: v })}
              options={[
                { value: "below_ma", label: t("price_below_moving_average") },
                { value: "rsi_oversold", label: t("rsi_oversold") },
                { value: "below_price", label: t("price_below_level") },
              ]}
            />
            <NumberField
              label={
                config.priceCondition?.type === "below_price"
                  ? t("price_level", { quote: String(quote) })
                  : config.priceCondition?.type === "rsi_oversold"
                    ? t("rsi_threshold")
                    : t("ma_period")
              }
              value={config.priceCondition?.value ?? 0}
              onChange={(v) => patchCondition({ value: v })}
              step={1}
              min={0}
              showSteppers={false}
            />
          </>
        )}
      </Section>
    </>
  );
});

/* ------------------------------------------------------------------ */
/* INDICATOR                                                           */
/* ------------------------------------------------------------------ */

const IndicatorParams = memo(function IndicatorParams({
  config,
  patch,
  onChange,
  quote,
}: {
  config: Record<string, any>;
  patch: (next: Record<string, any>) => void;
  onChange: (config: Record<string, any>) => void;
  quote: string;
}) {
  const t = useTranslations("trade_components");
  const indicators = config.indicators ?? {};

  const patchIndicator = useCallback(
    (key: string, next: Record<string, any>) => {
      onChange({
        ...config,
        indicators: {
          ...indicators,
          [key]: { ...(indicators[key] ?? {}), ...next },
        },
      });
    },
    [config, indicators, onChange]
  );

  return (
    <>
      <Section title={t("signal_source")}>
        <SelectField
          label="Timeframe"
          value={config.timeframe ?? "1h"}
          onChange={(v) => patch({ timeframe: v })}
          options={[
            { value: "1m", label: "1 minute" },
            { value: "5m", label: "5 minutes" },
            { value: "15m", label: "15 minutes" },
            { value: "1h", label: "1 hour" },
            { value: "4h", label: "4 hours" },
            { value: "1d", label: "1 day" },
          ]}
        />

        <Segmented
          label="Confirmation"
          value={config.signalMode === "any" ? "any" : "all"}
          onChange={(v) => patch({ signalMode: v })}
          hint={t("all_needs_every_enabled_indicator_to")}
          options={[
            { value: "any", label: t("any_signal") },
            { value: "all", label: t("all_agree") },
          ]}
        />
      </Section>

      <Section title="Indicators">
        <IndicatorCard
          name="RSI"
          description={t("relative_strength_index")}
          enabled={!!indicators.rsi?.enabled}
          onToggle={(v) => patchIndicator("rsi", { enabled: v })}
        >
          <div className="grid grid-cols-3 gap-1.5">
            <NumberField
              label="Period"
              value={indicators.rsi?.period ?? 14}
              onChange={(v) => patchIndicator("rsi", { period: v })}
              step={1}
              min={1}
              showSteppers={false}
            />
            <NumberField
              label="Oversold"
              value={indicators.rsi?.oversold ?? 30}
              onChange={(v) => patchIndicator("rsi", { oversold: v })}
              step={1}
              min={0}
              max={100}
              showSteppers={false}
            />
            <NumberField
              label="Overbought"
              value={indicators.rsi?.overbought ?? 70}
              onChange={(v) => patchIndicator("rsi", { overbought: v })}
              step={1}
              min={0}
              max={100}
              showSteppers={false}
            />
          </div>
        </IndicatorCard>

        <IndicatorCard
          name="MACD"
          description={t("moving_average_convergence_divergence")}
          enabled={!!indicators.macd?.enabled}
          onToggle={(v) => patchIndicator("macd", { enabled: v })}
        >
          <div className="grid grid-cols-3 gap-1.5">
            <NumberField
              label="Fast"
              value={indicators.macd?.fastPeriod ?? 12}
              onChange={(v) => patchIndicator("macd", { fastPeriod: v })}
              step={1}
              min={1}
              showSteppers={false}
            />
            <NumberField
              label="Slow"
              value={indicators.macd?.slowPeriod ?? 26}
              onChange={(v) => patchIndicator("macd", { slowPeriod: v })}
              step={1}
              min={1}
              showSteppers={false}
            />
            <NumberField
              label="Signal"
              value={indicators.macd?.signalPeriod ?? 9}
              onChange={(v) => patchIndicator("macd", { signalPeriod: v })}
              step={1}
              min={1}
              showSteppers={false}
            />
          </div>
        </IndicatorCard>

        <IndicatorCard
          name="Bollinger"
          description={t("bollinger_bands")}
          enabled={!!indicators.bollingerBands?.enabled}
          onToggle={(v) => patchIndicator("bollingerBands", { enabled: v })}
        >
          <div className="grid grid-cols-2 gap-1.5">
            <NumberField
              label="Period"
              value={indicators.bollingerBands?.period ?? 20}
              onChange={(v) => patchIndicator("bollingerBands", { period: v })}
              step={1}
              min={1}
              showSteppers={false}
            />
            <NumberField
              label={t("std_dev")}
              value={indicators.bollingerBands?.stdDev ?? 2}
              onChange={(v) => patchIndicator("bollingerBands", { stdDev: v })}
              step={0.1}
              min={0.1}
              showSteppers={false}
            />
          </div>
        </IndicatorCard>

        <IndicatorCard
          name="Moving Average"
          description={t("sma_ema_crossover")}
          enabled={!!indicators.ma?.enabled}
          onToggle={(v) => patchIndicator("ma", { enabled: v })}
        >
          <Segmented
            size="sm"
            value={indicators.ma?.type === "SMA" ? "SMA" : "EMA"}
            onChange={(v) => patchIndicator("ma", { type: v })}
            options={[
              { value: "EMA", label: t("ema") },
              { value: "SMA", label: t("sma") },
            ]}
          />
          <Segmented
            size="sm"
            value={
              indicators.ma?.crossType === "ma_cross"
                ? "ma_cross"
                : "price_cross"
            }
            onChange={(v) => patchIndicator("ma", { crossType: v })}
            options={[
              { value: "price_cross", label: t("price_cross") },
              { value: "ma_cross", label: t("ma_cross") },
            ]}
          />
          <div className="grid grid-cols-2 gap-1.5">
            <NumberField
              label="Period"
              value={indicators.ma?.period ?? 50}
              onChange={(v) => patchIndicator("ma", { period: v })}
              step={1}
              min={1}
              showSteppers={false}
            />
            {indicators.ma?.crossType === "ma_cross" && (
              <NumberField
                label={t("slow_period")}
                value={indicators.ma?.secondPeriod ?? 200}
                onChange={(v) => patchIndicator("ma", { secondPeriod: v })}
                step={1}
                min={1}
                showSteppers={false}
              />
            )}
          </div>
        </IndicatorCard>
      </Section>

      <Section title="Position">
        <NumberField
          label={t("entry_amount", { quote: String(quote) })}
          value={config.entryAmount ?? 0}
          onChange={(v) => patch({ entryAmount: v })}
          step={10}
          min={0}
        />
        <SelectField
          label={t("exit_rule")}
          value={config.exitMode ?? "both"}
          onChange={(v) => patch({ exitMode: v })}
          options={[
            { value: "indicator", label: t("indicator_reversal") },
            { value: "take_profit", label: t("take_profit_only") },
            { value: "both", label: t("whichever_comes_first") },
          ]}
        />
      </Section>
    </>
  );
});

const IndicatorCard = memo(function IndicatorCard({
  name,
  description,
  enabled,
  onToggle,
  children,
}: {
  name: string;
  description: string;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded border p-2 transition-colors",
        enabled
          ? "algo-tint-accent-soft border-[var(--algo-accent)]"
          : "border-[var(--algo-border)] bg-[var(--algo-bg-raised)]"
      )}
    >
      <SwitchRow label={name} checked={enabled} onChange={onToggle} hint={description} />
      {enabled && <div className="mt-2 space-y-1.5">{children}</div>}
    </div>
  );
});

/* ------------------------------------------------------------------ */
/* TRAILING STOP                                                       */
/* ------------------------------------------------------------------ */

const TrailingParams = memo(function TrailingParams({
  config,
  patch,
  quote,
}: {
  config: Record<string, any>;
  patch: (next: Record<string, any>) => void;
  quote: string;
}) {
  const t = useTranslations("trade_components");
  const tCommon = useTranslations("common");
  const patchCondition = useCallback(
    (next: Record<string, any>) =>
      patch({ entryCondition: { ...(config.entryCondition ?? {}), ...next } }),
    [config.entryCondition, patch]
  );

  const conditionType = config.entryCondition?.type ?? "immediate";

  return (
    <>
      <Section title={tCommon("trailing_stop")}>
        <SliderField
          label={t("trail_distance")}
          value={Number(config.trailPercent) || 0.1}
          min={0.1}
          max={50}
          step={0.1}
          onChange={(v) => patch({ trailPercent: v })}
          format={(v) => `${v.toFixed(1)}%`}
          hint={t("how_far_price_may_retrace_from")}
        />
        <SliderField
          label={t("activate_after")}
          value={Number(config.activationPercent) || 0}
          min={0}
          max={20}
          step={0.1}
          onChange={(v) => patch({ activationPercent: v })}
          format={(v) => (v === 0 ? "Immediately" : `+${v.toFixed(1)}%`)}
          hint={t("profit_required_before_the_trailing_stop")}
        />
      </Section>

      <Section title="Entry">
        <Segmented
          label={tCommon("order_type")}
          value={config.entryMode === "limit" ? "limit" : "market"}
          onChange={(v) => patch({ entryMode: v })}
          options={[
            { value: "market", label: tCommon("market") },
            { value: "limit", label: tCommon("limit") },
          ]}
        />

        <NumberField
          label={t("entry_amount", { quote: String(quote) })}
          value={config.entryAmount ?? 0}
          onChange={(v) => patch({ entryAmount: v })}
          step={10}
          min={0}
        />

        <SelectField
          label={t("entry_trigger")}
          value={conditionType}
          onChange={(v) => patchCondition({ type: v })}
          options={[
            { value: "immediate", label: t("enter_immediately") },
            { value: "price_level", label: t("when_price_reaches") },
            { value: "indicator", label: t("on_indicator_signal") },
          ]}
        />

        {conditionType === "price_level" && (
          <NumberField
            label={t("trigger_price", { quote: String(quote) })}
            value={config.entryCondition?.value ?? 0}
            onChange={(v) => patchCondition({ value: v })}
            step={1}
            min={0}
            showSteppers={false}
          />
        )}
      </Section>
    </>
  );
});

/* ------------------------------------------------------------------ */
/* CUSTOM                                                              */
/* ------------------------------------------------------------------ */

const CustomParams = memo(function CustomParams({
  config,
  patch,
  quote,
}: {
  config: Record<string, any>;
  patch: (next: Record<string, any>) => void;
  quote: string;
}) {
  const t = useTranslations("trade_components");
  const nodeCount = Array.isArray(config.nodes) ? config.nodes.length : 0;

  return (
    <Section title={t("custom_strategy")}>
      <div className="rounded border border-[var(--algo-border)] bg-[var(--algo-bg-raised)] p-3 text-center">
        <Workflow className="mx-auto mb-2 h-6 w-6 text-[var(--algo-text-muted)]" />
        <p className="mb-1 text-[11px] font-medium text-[var(--algo-text)]">
          {nodeCount > 0
            ? t("blocks_configured", { nodeCount: String(nodeCount) })
            : t("no_strategy_loaded")}
        </p>
        <p className="mb-2.5 text-[10px] leading-snug text-[var(--algo-text-muted)]">
          {t("custom_strategies_are_designed_as_a")}
        </p>
        <Link
          href="/trading-bot/builder"
          className="inline-flex items-center gap-1 rounded bg-[var(--algo-blue)] px-2.5 py-1 text-[10px] font-medium text-[var(--algo-blue-fg)] transition-opacity hover:opacity-90"
        >
          {t("open_strategy_builder")}
          <ExternalLink className="h-2.5 w-2.5" />
        </Link>
      </div>

      <NumberField
        label={t("entry_amount", { quote: String(quote) })}
        value={config.entryAmount ?? 0}
        onChange={(v) => patch({ entryAmount: v })}
        step={10}
        min={0}
      />
    </Section>
  );
});
