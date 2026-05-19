"use client";
import { Shield, ClipboardList, DollarSign, CheckSquare } from "lucide-react";

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
      description: tDashboardAdmin("unique_identifier_for_the_currency"),
      priority: 2,
      expandedOnly: true,
    },
    {
      key: "name",
      title: tCommon("name"),
      type: "text",
      icon: Shield,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tDashboardAdmin("full_name_of_the_currency_e_g_bitcoin_us_dollar"),
      priority: 1,
    },
    {
      key: "symbol",
      title: tCommon("symbol"),
      type: "text",
      icon: Shield,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tDashboardAdmin("currency_symbol_ticker_e_g_btc_usd_eth"),
      priority: 1,
    },
    {
      key: "precision",
      title: tCommon("precision"),
      type: "number",
      icon: ClipboardList,
      sortable: true,
      searchable: false,
      filterable: true,
      description: tDashboardAdmin("number_of_decimal_places_for_this_currency"),
      expandedOnly: true,
      priority: 2,
    },
    {
      key: "price",
      title: tCommon("price"),
      type: "number",
      icon: DollarSign,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tDashboardAdmin("current_price_of_the_currency_in_base_currency"),
      priority: 2,
    },
    {
      key: "status",
      title: tCommon("status"),
      type: "boolean",
      render: {
        type: "toggle",
        config: {
          url: "/api/admin/finance/currency/fiat/[id]/status",
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
      description: tDashboardAdmin("whether_this_currency_is_active_and"),
      priority: 1,
    },
  ];
}

