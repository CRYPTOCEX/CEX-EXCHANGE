"use client";
import { ChartLine, Activity, Wallet, Bot, DollarSign, Percent, TrendingUp, CalendarIcon, Shield, Settings } from "lucide-react";
import { StatusBadge } from "../components/StatusBadge";
import type { FormConfig } from "@/components/blocks/data-table/types/table";

import { useTranslations } from "next-intl";
export function useColumns(): ColumnDefinition[] {
  const tCommon = useTranslations("common");
  const tDashboardAdmin = useTranslations("dashboard_admin");
  const tExt = useTranslations("ext");
  const tExtAdmin = useTranslations("ext_admin");
  return [
    {
      key: "market",
      title: tCommon("market"),
      type: "compound",
      icon: ChartLine,
      sortable: true,
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
            title: tDashboardAdmin("pair"),
            description: tExtAdmin("trading_pair"),
            render: (value: string, row: any) => {
              const market = row.market;
              return market ? `${market.currency}/${market.pair}` : "-";
            },
          },
        },
      },
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
      title: tExt("target_price"),
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
      title: tExtAdmin("tvl"),
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
      title: tExtAdmin("p_l"),
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
            <span className={isPositive ? "text-green-500" : "text-red-500"}>
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
      title: tExtAdmin('real_liquidity'),
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
      title: tCommon("id"),
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
          title: tExtAdmin("trading_settings"),
          icon: Settings,
          priority: 2,
          fields: [
            {
              key: "aggressionLevel",
              required: true,
              options: [
                { value: "CONSERVATIVE", label: tExtAdmin("conservative") },
                { value: "MODERATE", label: tExtAdmin("moderate") },
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
