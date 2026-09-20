"use client";
import React from "react";
import { ChartLine, Activity, Wallet, Bot, DollarSign, Percent, TrendingUp, CalendarIcon, Shield, Settings, Gauge } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "../components/StatusBadge";
import type {
  FormConfig,
  ViewConfig,
} from "@/components/blocks/data-table/types/table";

import { useTranslations } from "next-intl";
export function useColumns(): ColumnDefinition[] {
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  const tExtAdmin = useTranslations("ext_admin");
  const tMm = useTranslations("ext_admin_ai_market-maker");
  return [
    {
      key: "market",
      title: tCommon("market"),
      type: "compound",
      icon: ChartLine,
      sortable: true,
      // Filterable across BOTH venues, which needed a fix in `getFiltered`.
      //
      // A maker's market is joined from one of two tables under two aliases,
      // and `getFiltered` promotes any include a column FILTER names to
      // `required: true`. The filter is emitted under the alias `market`, so
      // filtering by pair INNER-JOINed the ecosystem side and silently dropped
      // every futures maker from the rows AND the count.
      //
      // `makerMarketIncludes()` now declares both aliases as one
      // `polymorphicGroup`, and `getFiltered` rewrites a filter on either into
      // a top-level OR across the group — which keeps both joins optional. That
      // is the same shape the search box has always produced, which is why
      // search worked across both venues while the filter did not.
      searchable: true,
      filterable: true,
      description: tExtAdmin("trading_market_with_symbol_and_currency"),
      priority: 1,
      render: {
        type: "compound",
        config: {
          primary: {
            key: "symbol",
            title: tCommon("symbol"),
            description: tExtAdmin("market_symbol"),
          },
          secondary: {
            key: "pair",
            title: tCommon("pair"),
            description: tCommon("trading_pair"),
            render: (value: string, row: any) => {
              const market = row.market;
              return market ? `${market.currency}/${market.pair}` : "-";
            },
          },
        },
      },
    },
    {
      /*
       * THE VENUE, BECAUSE THE SYMBOL DOES NOT CARRY IT.
       *
       * BTC/USDT can exist on both the ecosystem and futures, and the two are
       * different markets with different books, different keyspaces and
       * different money. Without this column an operator looking at a list of
       * makers cannot tell which one a row is quoting — and the two behave
       * differently enough that "pause the BTC/USDT maker" is an ambiguous
       * instruction.
       *
       * Filterable rather than merely visible: on an install running both, the
       * first thing anyone wants is one venue at a time.
       */
      key: "marketType",
      title: tExtAdmin("venue"),
      type: "select",
      icon: Activity,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tMm("venue_column_description"),
      render: {
        type: "custom",
        render: (value: string) => (
          <span className="text-xs font-medium text-muted-foreground">
            {value === "FUTURES" ? tMm("venue_futures") : tMm("venue_eco")}
          </span>
        ),
      },
      options: [
        { value: "ECO", label: tMm("venue_eco") },
        { value: "FUTURES", label: tMm("venue_futures") },
      ],
      priority: 2,
    },
    {
      key: "status",
      title: tCommon("status"),
      type: "select",
      icon: Activity,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("current_operational_status_of_the_market_maker_bot"),
      render: {
        type: "custom",
        render: (value: string) => <StatusBadge status={value} />,
      },
      options: [
        { value: "ACTIVE", label: tCommon("active") },
        { value: "PAUSED", label: tCommon("paused") },
        { value: "STOPPED", label: tCommon("stopped") },
        { value: "INITIALIZING", label: tExtAdmin("initializing") },
      ],
      priority: 1,
    },
    {
      key: "targetPrice",
      title: tCommon("target_price"),
      type: "number",
      icon: DollarSign,
      sortable: true,
      searchable: false,
      filterable: false,
      description: tExtAdmin("target_price_level_the_market_maker_is_maintaining"),
      render: {
        type: "custom",
        render: (value: string, row: any) => `${Number(value).toFixed(6)} ${row.market?.pair || ""}`,
      },
      priority: 1,
    },
    {
      key: "pool.totalValueLocked",
      title: "TVL",
      type: "number",
      icon: Wallet,
      sortable: true,
      searchable: false,
      filterable: false,
      description: tExtAdmin("total_value_locked_amount_of_funds"),
      render: {
        type: "custom",
        render: (value: string, row: any) => {
          const tvl = row.pool?.totalValueLocked || 0;
          return `${Number(tvl).toLocaleString()} ${row.market?.pair || ""}`;
        },
      },
      priority: 1,
    },
    {
      key: "currentDailyVolume",
      title: `24h ${tCommon('volume')}`,
      type: "number",
      icon: TrendingUp,
      sortable: true,
      searchable: false,
      filterable: false,
      description: tExtAdmin("trading_volume_generated_in_the_last_24_hours"),
      render: {
        type: "custom",
        render: (value: string, row: any) => `${Number(value || 0).toLocaleString()} ${row.market?.pair || ""}`,
      },
      priority: 2,
    },
    {
      key: "pnl",
      title: tCommon("total_p_l"),
      type: "number",
      icon: DollarSign,
      sortable: false,
      searchable: false,
      filterable: false,
      description: tExtAdmin("total_profit_loss_realized_unrealized_from"),
      render: {
        type: "custom",
        render: (value: any, row: any) => {
          const pnl = Number(row.pool?.realizedPnL || 0) + Number(row.pool?.unrealizedPnL || 0);
          const isPositive = pnl >= 0;
          return (
            <span className={isPositive ? "text-up" : "text-down"}>
              {isPositive ? "+" : ""}{pnl.toFixed(2)} {row.market?.pair || ""}
            </span>
          );
        },
      },
      priority: 2,
    },
    {
      key: "activeBots",
      title: tCommon("active_bots"),
      type: "number",
      icon: Bot,
      sortable: true,
      searchable: false,
      filterable: false,
      description: tExtAdmin("number_of_trading_bots_currently_active"),
      priority: 2,
      expandedOnly: true,
    },
    {
      key: "realLiquidityPercent",
      title: `${tExtAdmin('real_liquidity')} %`,
      type: "number",
      icon: Percent,
      sortable: true,
      searchable: false,
      filterable: false,
      description: tExtAdmin("percentage_of_real_liquidity_vs_synthetic"),
      render: {
        type: "custom",
        render: (value: number) => `${value || 0}%`,
      },
      priority: 2,
      expandedOnly: true,
    },
    {
      key: "createdAt",
      title: tCommon("created"),
      type: "date",
      icon: CalendarIcon,
      sortable: true,
      searchable: false,
      filterable: false,
      description: tExtAdmin("date_when_the_market_maker_configuration"),
      render: {
        type: "date",
        format: "PPP",
      },
      priority: 3,
      expandedOnly: true,
    },
    {
      key: "id",
      title: "ID",
      type: "text",
      icon: Shield,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("unique_system_identifier_for_this_market"),
      priority: 3,
      expandedOnly: true,
    },
  ];
}

/* -------------------------------------------------------------------------- *
 * View dialog
 *
 * A market maker is the densest record in this extension: roughly thirty
 * persisted fields plus a 1:1 liquidity pool, spanning four facets that have
 * nothing to do with each other — what pair it runs on, how much money is in
 * it, how it is configured, and what the price engine is currently doing. The
 * table shows nine of those columns; the flat dialog showed the same nine as
 * one column of tiles and dropped the pool, the price bands, the aggression
 * level and the whole engine state on the floor.
 *
 * Two columns are deliberately NOT referenced here: `pnl` has no value on the
 * row (it is computed from `pool` inside the cell renderer, and the detail
 * grid short-circuits on an empty value before any renderer runs), and
 * `activeBots` is not returned by the list endpoint at all. P&L is therefore
 * computed in the stat strip, where the row is passed in whole.
 * -------------------------------------------------------------------------- */

function toNumber(value: any): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatNumber(value: any, digits = 2): string {
  return toNumber(value).toLocaleString(undefined, {
    maximumFractionDigits: digits,
  });
}

/** Realized + unrealized, the figure the P&L column paints in the table. */
function poolPnl(row: any): number {
  return toNumber(row?.pool?.realizedPnL) + toNumber(row?.pool?.unrealizedPnL);
}

function quoteOf(row: any): string {
  return row?.market?.pair || "";
}

/** ENUM_VALUE -> "enum value", capitalised by the class on the wrapper. */
function humanEnum(value: any): string {
  return String(value ?? "")
    .toLowerCase()
    .replace(/_/g, " ");
}

function EnumValue({ value }: { value: any }) {
  return <span className="capitalize">{humanEnum(value)}</span>;
}

function SignedAmount({ value, suffix }: { value: any; suffix?: string }) {
  const amount = toNumber(value);
  return (
    <span className={amount >= 0 ? "text-success" : "text-destructive"}>
      {amount >= 0 ? "+" : ""}
      {formatNumber(amount)}
      {suffix ? ` ${suffix}` : ""}
    </span>
  );
}

function formatDate(value: any): string {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "—" : format(parsed, "PPp");
}

export function useViewConfig(): ViewConfig {
  const t = useTranslations("ext_admin");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  return React.useMemo<ViewConfig>(
    () => ({
      size: "4xl",

      /* The compound column's primary key is `symbol`, which this model does
         not have — only `market.currency` / `market.pair` — so the derived
         header fell through to the raw uuid. */
      title: (row) =>
        row.market ? `${row.market.currency}/${row.market.pair}` : tCommon("market_maker"),

      badges: (row) => (
        <>
          <StatusBadge status={row.status} />
          {row.currentPhase && (
            <Badge tone="info" appearance="soft" className="capitalize">
              {humanEnum(row.currentPhase)}
            </Badge>
          )}
          {row.marketBias && row.marketBias !== "NEUTRAL" && (
            <Badge
              tone={row.marketBias === "BULLISH" ? "success" : "destructive"}
              appearance="soft"
              className="capitalize"
            >
              {humanEnum(row.marketBias)}
            </Badge>
          )}
          {row.pauseOnHighVolatility && (
            <Badge tone="warning" appearance="soft">
              {t("volatility_pause")}
            </Badge>
          )}
        </>
      ),

      stats: [
        {
          label: tCommon("target_price"),
          icon: DollarSign,
          value: (row) => `${formatNumber(row.targetPrice, 6)} ${quoteOf(row)}`,
        },
        {
          label: tCommon("total_value_locked"),
          icon: Wallet,
          value: (row) =>
            `${formatNumber(row.pool?.totalValueLocked)} ${quoteOf(row)}`,
        },
        // `tone` is fixed per entry, so the signed figure is two exclusive ones.
        {
          label: t("profit_loss"),
          icon: TrendingUp,
          tone: "success",
          condition: (row) => poolPnl(row) >= 0,
          value: (row) => `+${formatNumber(poolPnl(row))} ${quoteOf(row)}`,
        },
        {
          label: t("profit_loss"),
          icon: TrendingUp,
          tone: "destructive",
          condition: (row) => poolPnl(row) < 0,
          value: (row) => `${formatNumber(poolPnl(row))} ${quoteOf(row)}`,
        },
        {
          label: `24h ${tCommon('volume')}`,
          icon: Activity,
          value: (row) =>
            `${formatNumber(row.currentDailyVolume)} / ${formatNumber(row.maxDailyVolume)}`,
        },
      ],

      tabs: [
        { id: "overview", title: tCommon("overview"), icon: ChartLine },
        { id: "configuration", title: tCommon("configuration"), icon: Settings },
        { id: "engine", title: t("price_engine"), icon: Bot },
      ],

      sections: [
        {
          id: "pair",
          tab: "overview",
          title: tCommon("trading_pair"),
          icon: ChartLine,
          columns: 3,
          fields: [
            {
              key: "market.currency",
              title: t("base_currency"),
              icon: ChartLine,
              render: (value) => String(value),
            },
            {
              key: "market.pair",
              title: t("quote_currency"),
              icon: ChartLine,
              render: (value) => String(value),
            },
            {
              key: "lastKnownPrice",
              title: t("last_known_price"),
              icon: DollarSign,
              render: (value) => formatNumber(value, 6),
            },
          ],
        },
        {
          id: "pool",
          tab: "overview",
          title: t("liquidity_pool"),
          icon: Wallet,
          columns: 3,
          // A market maker that has never been funded has no pool row at all.
          condition: (row) => Boolean(row.pool),
          fields: [
            {
              key: "pool.baseCurrencyBalance",
              title: t("base_balance"),
              icon: Wallet,
              render: (value) => formatNumber(value),
            },
            {
              key: "pool.quoteCurrencyBalance",
              title: t("quote_balance"),
              icon: Wallet,
              render: (value) => formatNumber(value),
            },
            // `pool.totalValueLocked` is deliberately absent: it is already the
            // headline figure in the stat strip.
            {
              key: "pool.initialBaseBalance",
              title: t("initial_base"),
              icon: Wallet,
              render: (value) => formatNumber(value),
            },
            {
              key: "pool.initialQuoteBalance",
              title: t("initial_quote"),
              icon: Wallet,
              render: (value) => formatNumber(value),
            },
            {
              key: "pool.realizedPnL",
              title: tExt("realized_p_l"),
              icon: TrendingUp,
              render: (value, row) => (
                <SignedAmount value={value} suffix={quoteOf(row)} />
              ),
            },
            {
              key: "pool.unrealizedPnL",
              title: t("unrealized_p_l"),
              icon: TrendingUp,
              render: (value, row) => (
                <SignedAmount value={value} suffix={quoteOf(row)} />
              ),
            },
            {
              key: "pool.lastRebalanceAt",
              title: t("last_rebalance"),
              icon: CalendarIcon,
              render: (value) => formatDate(value),
            },
          ],
        },
        {
          id: "record",
          tab: "overview",
          title: tCommon("record"),
          icon: Shield,
          columns: 2,
          fields: [
            { key: "id", icon: Shield, copyable: true },
            { key: "createdAt", icon: CalendarIcon },
          ],
        },
        {
          id: "price-configuration",
          tab: "configuration",
          title: t("price_configuration"),
          icon: DollarSign,
          columns: 3,
          fields: [
            {
              key: "priceRangeLow",
              title: t("price_range_low"),
              icon: DollarSign,
              render: (value) => formatNumber(value, 6),
            },
            {
              key: "priceRangeHigh",
              title: t("price_range_high"),
              icon: DollarSign,
              render: (value) => formatNumber(value, 6),
            },
            {
              key: "phaseTargetPrice",
              title: t("phase_target_price"),
              icon: DollarSign,
              render: (value) => formatNumber(value, 6),
            },
          ],
        },
        {
          id: "trading-settings",
          tab: "configuration",
          title: tCommon("trading_settings"),
          icon: Settings,
          columns: 3,
          fields: [
            {
              key: "aggressionLevel",
              title: t("aggression_level"),
              icon: Gauge,
              render: (value) => <EnumValue value={value} />,
            },
            {
              key: "maxDailyVolume",
              title: t("max_daily_volume"),
              icon: Activity,
              render: (value) => formatNumber(value),
            },
            { key: "realLiquidityPercent", icon: Percent },
          ],
        },
        {
          id: "risk-management",
          tab: "configuration",
          title: tCommon("risk_management"),
          icon: Activity,
          columns: 3,
          fields: [
            {
              key: "volatilityThreshold",
              title: t("volatility_threshold"),
              icon: Activity,
              render: (value) => `${formatNumber(value)}%`,
            },
            {
              key: "pauseOnHighVolatility",
              title: t("pause_on_high_volatility"),
              icon: Shield,
              render: (value) => (
                <Badge tone={value ? "warning" : "neutral"} appearance="soft">
                  {value ? tCommon("enabled") : tCommon("disabled")}
                </Badge>
              ),
            },
          ],
        },
        {
          id: "engine",
          tab: "engine",
          title: t("price_engine"),
          icon: Bot,
          columns: 3,
          fields: [
            {
              key: "priceMode",
              title: t("price_mode"),
              icon: Bot,
              render: (value) => <EnumValue value={value} />,
            },
            {
              key: "externalSymbol",
              title: t("external_symbol"),
              icon: ChartLine,
              render: (value) => String(value),
            },
            {
              key: "correlationStrength",
              title: t("correlation_strength"),
              icon: Percent,
              render: (value) => formatNumber(value),
            },
            {
              key: "biasStrength",
              title: t("bias_strength"),
              icon: Gauge,
              render: (value) => formatNumber(value),
            },
          ],
        },
        {
          id: "momentum",
          tab: "engine",
          title: t("volatility_momentum"),
          icon: TrendingUp,
          columns: 4,
          fields: [
            {
              key: "baseVolatility",
              title: t("base_volatility"),
              icon: Activity,
              render: (value) => formatNumber(value, 4),
            },
            {
              key: "volatilityMultiplier",
              title: t("volatility_multiplier"),
              icon: Activity,
              render: (value) => formatNumber(value, 4),
            },
            {
              key: "momentumDecay",
              title: t("momentum_decay"),
              icon: TrendingUp,
              render: (value) => formatNumber(value, 4),
            },
            {
              key: "trendMomentum",
              title: t("trend_momentum"),
              icon: TrendingUp,
              render: (value) => <SignedAmount value={value} />,
            },
          ],
        },
        {
          id: "phase-timeline",
          tab: "engine",
          title: t("phase_timeline"),
          icon: CalendarIcon,
          columns: 3,
          fields: [
            {
              key: "phaseStartedAt",
              title: t("phase_started"),
              icon: CalendarIcon,
              render: (value) => formatDate(value),
            },
            {
              key: "nextPhaseChangeAt",
              title: t("next_phase_change"),
              icon: CalendarIcon,
              render: (value) => formatDate(value),
            },
            {
              key: "lastMomentumUpdate",
              title: t("last_momentum_update"),
              icon: CalendarIcon,
              render: (value) => formatDate(value),
            },
          ],
        },
      ],
    }),
    []
  );
}

export function useFormConfig(): FormConfig {
  const tCommon = useTranslations("common");
  const tExtAdmin = useTranslations("ext_admin");
  return {
    create: {
      title: tExtAdmin("create_new_market_maker"),
      description: tExtAdmin("set_up_a_new_ai_market"),
      groups: [],
    },
    edit: {
      title: tExtAdmin("edit_market_maker"),
      description: tExtAdmin("modify_ai_market_maker_settings_price"),
      groups: [
        {
          id: "price-configuration",
          title: tExtAdmin("price_configuration"),
          icon: DollarSign,
          priority: 1,
          fields: [
            { key: "targetPrice", required: true, min: 0 },
            { key: "priceRangeLow", required: true, min: 0 },
            { key: "priceRangeHigh", required: true, min: 0 },
          ],
        },
        {
          id: "trading-settings",
          title: tCommon("trading_settings"),
          icon: Settings,
          priority: 2,
          fields: [
            {
              key: "aggressionLevel",
              required: true,
              options: [
                { value: "CONSERVATIVE", label: tExtAdmin("conservative") },
                { value: "MODERATE", label: tCommon("moderate") },
                { value: "AGGRESSIVE", label: tExtAdmin("aggressive") },
              ],
            },
            { key: "maxDailyVolume", required: true, min: 0 },
            { key: "realLiquidityPercent", required: true, min: 0, max: 100 },
          ],
        },
        {
          id: "risk-management",
          title: tCommon("risk_management"),
          icon: Activity,
          priority: 3,
          fields: [
            { key: "volatilityThreshold", required: true, min: 0, max: 100 },
            { key: "pauseOnHighVolatility", required: true },
          ],
        },
        {
          id: "status-control",
          title: tExtAdmin("status_control"),
          icon: Activity,
          priority: 4,
          fields: [
            {
              key: "status",
              required: true,
              options: [
                { value: "ACTIVE", label: tCommon("active") },
                { value: "PAUSED", label: tCommon("paused") },
                { value: "STOPPED", label: tCommon("stopped") },
              ],
            },
          ],
        },
      ],
    },
  };
}
