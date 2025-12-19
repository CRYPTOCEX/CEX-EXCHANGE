"use client";
import {
  Shield,
  DollarSign,
  CheckSquare,
  TrendingUp,
  Clock,
  Flame,
  Hash,
  Coins
} from "lucide-react";
import type { FormConfig } from "@/components/blocks/data-table/types/table";

import { useTranslations } from "next-intl";
export function useColumns(): ColumnDefinition[] {
  const tCommon = useTranslations("common");
  const tDashboardAdmin = useTranslations("dashboard_admin");
  return [
    {
      key: "id",
      title: tCommon("id"),
      type: "text",
      icon: Hash,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tDashboardAdmin("unique_identifier_for_the_exchange_market"),
      priority: 3,
      expandedOnly: true
    },
    {
      key: "currency",
      title: tCommon("currency"),
      type: "text",
      icon: Coins,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tDashboardAdmin("base_currency_of_the_trading_pair"),
      priority: 1
    },
    {
      key: "pair",
      title: tDashboardAdmin("pair"),
      type: "text",
      icon: Coins,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tDashboardAdmin("quote_currency_of_the_trading_pair"),
      priority: 1
    },
    {
      key: "symbol",
      title: tCommon("symbol"),
      type: "text",
      icon: TrendingUp,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tDashboardAdmin("trading_pair_symbol_e_g_btc_usd"),
      priority: 1,
      render: {
        type: "custom",
        render: (value: any, row: any) => {
          const currency = row.currency || "";
          const pair = row.pair || "";
          return `${currency}/${pair}`;
        }
      }
    },
    {
      key: "isTrending",
      title: tCommon("trending"),
      type: "boolean",
      icon: TrendingUp,
      sortable: true,
      searchable: false,
      filterable: true,
      description: tDashboardAdmin("mark_market_as_trending_for_visibility"),
      priority: 2,
      render: {
        type: "badge",
        config: {
          withDot: true,
          variant: (value: boolean) => (value ? "info" : "secondary"),
          labels: {
            true: "Trending",
            false: "Not Trending",
          },
        }
      }
    },
    {
      key: "isHot",
      title: tCommon("hot"),
      type: "boolean",
      icon: Flame,
      sortable: true,
      searchable: false,
      filterable: true,
      description: tDashboardAdmin("mark_market_as_hot_for_featured_display"),
      priority: 2,
      expandedOnly: true,
      render: {
        type: "badge",
        config: {
          withDot: true,
          variant: (value: boolean) => (value ? "warning" : "secondary"),
          labels: {
            true: "Hot",
            false: "Not Hot",
          },
        }
      }
    },
    {
      key: "metadata.precision.price",
      title: tCommon("price_precision"),
      type: "number",
      icon: Hash,
      sortable: false,
      searchable: false,
      filterable: false,
      description: tDashboardAdmin("number_of_decimal_places_for_price_display"),
      priority: 3,
      expandedOnly: true
    },
    {
      key: "metadata.precision.amount",
      title: tCommon("amount_precision"),
      type: "number",
      icon: Hash,
      sortable: false,
      searchable: false,
      filterable: false,
      description: tDashboardAdmin("number_of_decimal_places_for_amount_display"),
      priority: 3,
      expandedOnly: true
    },
    {
      key: "metadata.taker",
      title: tCommon("taker_fee"),
      type: "number",
      icon: DollarSign,
      sortable: false,
      searchable: false,
      filterable: false,
      description: tDashboardAdmin("fee_percentage_charged_to_taker_orders"),
      priority: 2,
      render: {
        type: "custom",
        render: (value: any) => {
          if (value === undefined || value === null) return "-";
          return `${(value * 100).toFixed(3)}%`;
        }
      }
    },
    {
      key: "metadata.maker",
      title: tCommon("maker_fee"),
      type: "number",
      icon: DollarSign,
      sortable: false,
      searchable: false,
      filterable: false,
      description: tDashboardAdmin("fee_percentage_charged_to_maker_orders"),
      priority: 2,
      render: {
        type: "custom",
        render: (value: any) => {
          if (value === undefined || value === null) return "-";
          return `${(value * 100).toFixed(3)}%`;
        }
      }
    },
    {
      key: "status",
      title: tCommon("status"),
      type: "boolean",
      render: {
        type: "toggle",
        config: {
          url: "/api/admin/finance/exchange/market/[id]/status",
          method: "PUT",
          field: "status",
          trueValue: true,
          falseValue: false
        }
      },
      icon: CheckSquare,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tDashboardAdmin("active_status_of_the_trading_market"),
      priority: 1
    },
    {
      key: "createdAt",
      title: tCommon("created_at"),
      type: "date",
      icon: Clock,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tDashboardAdmin("date_when_the_market_was_created"),
      render: { type: "date", format: "PPP" },
      priority: 3,
      expandedOnly: true
    },
  ];
}

export function useFormConfig(): FormConfig {
  const t = useTranslations("dashboard_admin");
  return {
    edit: {
      title: t("edit_market"),
      description: t("update_trading_pair_configuration"),
      groups: [
        {
          id: "market-basic",
          title: t("market_information"),
          icon: Coins,
          priority: 1,
          fields: [
            { key: "currency", required: true },
            { key: "pair", required: true },
            "isTrending",
            "isHot",
          ]
        },
        {
          id: "market-precision",
          title: t("precision_settings"),
          icon: Hash,
          priority: 2,
          fields: [
            { key: "metadata.precision.price", required: true },
            { key: "metadata.precision.amount", required: true },
          ]
        },
        {
          id: "market-fees",
          title: t("trading_fees"),
          icon: DollarSign,
          priority: 3,
          fields: [
            { key: "metadata.taker", required: true },
            { key: "metadata.maker", required: true },
          ]
        },
      ]
    }
  };
}
