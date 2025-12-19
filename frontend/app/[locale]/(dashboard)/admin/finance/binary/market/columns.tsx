"use client";
import { Shield, DollarSign, CheckSquare, TrendingUp } from "lucide-react";
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
      icon: Shield,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tDashboardAdmin("unique_identifier_for_the_binary_market"),
      priority: 2,
      expandedOnly: true,
    },
    {
      key: "currency",
      title: tCommon("currency"),
      type: "text",
      icon: DollarSign,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tDashboardAdmin("base_currency_symbol_e_g_btc_eth"),
      priority: 1,
    },
    {
      key: "pair",
      title: tDashboardAdmin("pair"),
      type: "text",
      icon: DollarSign,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tDashboardAdmin("trading_pair_symbol_e_g_usdt_usd"),
      priority: 1,
    },
    {
      key: "isTrending",
      title: tCommon("trending"),
      type: "boolean",
      icon: TrendingUp,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tDashboardAdmin("whether_this_market_is_currently_trending"),
      priority: 2,
      render: {
        type: "badge",
        config: {
          variant: (value: boolean) => (value ? "info" : "secondary"),
          labels: {
            true: "Trending",
            false: "Not Trending",
          },
        },
      },
    },
    {
      key: "isHot",
      title: tCommon("hot"),
      type: "boolean",
      icon: TrendingUp,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tDashboardAdmin("whether_this_market_is_marked_as_hot_popular"),
      priority: 2,
      render: {
        type: "badge",
        config: {
          variant: (value: boolean) => (value ? "warning" : "secondary"),
          labels: {
            true: "Hot",
            false: "Not Hot",
          },
        },
      },
    },
    {
      key: "status",
      title: tCommon("status"),
      type: "boolean",
      render: {
        type: "toggle",
        config: {
          url: "/api/admin/finance/binary/market/[id]/status",
          method: "PUT",
          field: "status",
          trueValue: true,
          falseValue: false,
        },
      },
      icon: CheckSquare,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tDashboardAdmin("market_availability_status_active_inactive"),
      priority: 1,
    },
  ];
}

export function useFormConfig(): FormConfig {
  const t = useTranslations("dashboard_admin");
  return {
    create: {
      title: t("create_new_market"),
      description: t("add_a_new_binary_options_trading_market"),
      groups: [
        {
          id: "binary-market-info",
          title: t("binary_market_information"),
          icon: DollarSign,
          priority: 1,
          fields: [
            {
              key: "currency",
              required: true
            },
            {
              key: "pair",
              required: true
            },
            { key: "isTrending", required: false },
            { key: "isHot", required: false },
            { key: "status", required: true },
          ],
        },
      ],
    },
    edit: {
      title: t("edit_market"),
      description: t("update_binary_options_trading_market_settings"),
      groups: [
        {
          id: "binary-market-info",
          title: t("binary_market_information"),
          icon: DollarSign,
          priority: 1,
          fields: [
            {
              key: "currency",
              required: true
            },
            {
              key: "pair",
              required: true
            },
            { key: "isTrending", required: false },
            { key: "isHot", required: false },
            { key: "status", required: true },
          ],
        },
      ],
    },
  };
}
