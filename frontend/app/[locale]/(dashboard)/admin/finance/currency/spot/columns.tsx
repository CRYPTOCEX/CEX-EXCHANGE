"use client";
import { Shield, DollarSign, ClipboardList, CheckSquare } from "lucide-react";
import { format } from "date-fns";

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
      description: tDashboardAdmin("unique_identifier_for_the_exchange_currency"),
      priority: 2,
      expandedOnly: true,
    },
    {
      key: "currency",
      title: tDashboardAdmin("currency_code"),
      type: "text",
      icon: DollarSign,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tDashboardAdmin("currency_symbol_e_g_btc_eth_usdt"),
      priority: 1,
    },
    {
      key: "name",
      title: tCommon("name"),
      type: "text",
      icon: Shield,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tDashboardAdmin("full_name_of_the_currency_e_g_bitcoin_ethereum"),
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
      description: tDashboardAdmin("current_price_of_the_currency"),
      priority: 2,
    },
    {
      key: "fee",
      title: tCommon("fee"),
      type: "number",
      icon: DollarSign,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tDashboardAdmin("trading_fee_percentage_for_this_currency"),
      expandedOnly: true,
      priority: 2,
    },
    {
      key: "status",
      title: tCommon("status"),
      type: "boolean",
      render: {
        type: "toggle",
        config: {
          url: "/api/admin/finance/currency/spot/[id]/status",
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
      description: tDashboardAdmin("currency_availability_status_active_inactive"),
      priority: 1,
    },
  ];
}

