"use client";
import { TrendingUp, LineChart, BarChart3, Settings } from "lucide-react";
import { useTranslations } from "next-intl";
export function useColumns(): ColumnDefinition[] {
  const tCommon = useTranslations("common");
  const tExtAdmin = useTranslations("ext_admin");
  return [
    {
      key: "currency",
      title: tExtAdmin("base_currency"),
      type: "text",
      description: tExtAdmin("base_asset_of_the_futures_trading"),
      sortable: true,
      filterable: true,
      required: true,
      priority: 1,
    },
    {
      key: "pair",
      title: tExtAdmin("quote_currency"),
      type: "text",
      description: tExtAdmin("quote_asset_used_to_value_the"),
      sortable: true,
      filterable: true,
      required: true,
      priority: 1,
    },
    {
      key: "status",
      title: tExtAdmin("market_status"),
      type: "toggle",
      description: tExtAdmin("trading_availability_enabled_markets_accept_new"),
      sortable: true,
      filterable: true,
      required: true,
      priority: 1,
      render: {
        type: "badge",
        config: {
          variant: (value) => (value ? "success" : "secondary"),
          labels: {
            true: "Active",
            false: "Inactive",
          },
        },
      },
    },
    {
      key: "isTrending",
      title: tCommon("trending"),
      type: "toggle",
      description: tExtAdmin("indicates_if_this_market_is_currently"),
      sortable: true,
      filterable: true,
      priority: 2,
      render: {
        type: "badge",
        config: {
          variant: (value) => (value ? "info" : "secondary"),
          labels: {
            true: "Trending",
            false: "Not Trending",
          },
        },
      },
    },
    {
      key: "isHot",
      title: tExtAdmin("hot_market"),
      type: "toggle",
      description: tExtAdmin("marks_this_market_as_hot_with"),
      sortable: true,
      filterable: true,
      priority: 2,
      render: {
        type: "badge",
        config: {
          variant: (value) => (value ? "warning" : "secondary"),
          labels: {
            true: "Hot",
            false: "Not Hot",
          },
        },
      },
    },
    {
      key: "metadata",
      title: tExtAdmin("trading_configuration"),
      type: "textarea",
      description: tExtAdmin("market_parameters_including_fees_precision_setting"),
      sortable: false,
      filterable: false,
      expandedOnly: true,
    },
    {
      key: "createdAt",
      title: tCommon("created_at"),
      type: "date",
      description: tExtAdmin("timestamp_when_this_futures_market_was"),
      sortable: true,
      filterable: true,
      expandedOnly: true,
    },
  ];
}
