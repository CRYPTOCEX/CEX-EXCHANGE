"use client";
import React from "react";
import { useTranslations } from "next-intl";
import {
  Shield,
  User,
  DollarSign,
  ClipboardList,
  TrendingUp,
  ArrowLeftRight,
  Gauge,
} from "lucide-react";
import { TradesCell } from "../ecosystem/columns";
export function useColumns(): ColumnDefinition[] {
  const tCommon = useTranslations("common");
  const tDashboardAdmin = useTranslations("dashboard_admin");
  return [
    {
      key: "id",
      title: tCommon("id"),
      type: "text",
      icon: Shield,
      description: tDashboardAdmin("unique_order_identifier"),
      sortable: true,
      filterable: true,
      priority: 2,
      expandedOnly: true,
    },
    {
      key: "userId",
      title: tCommon("user_id"),
      type: "text",
      icon: User,
      description: tDashboardAdmin("id_of_the_user_who_placed_the_order"),
      sortable: true,
      filterable: true,
      priority: 3,
      expandedOnly: true,
    },
    {
      key: "status",
      title: tCommon("status"),
      type: "select",
      icon: ClipboardList,
      description: tDashboardAdmin("current_order_status"),
      sortable: true,
      filterable: true,
      required: true,
      options: [
        { value: "OPEN", label: tCommon("open") },
        { value: "CLOSED", label: tCommon("closed") },
        { value: "CANCELLED", label: tCommon("cancelled") },
      ],
      render: {
        type: "badge",
        config: {
          variant: (value) => {
            switch (value) {
              case "OPEN":
                return "primary";
              case "CLOSED":
                return "success";
              case "CANCELLED":
                return "danger";
              default:
                return "default";
            }
          },
        },
      },
      priority: 1,
    },
    {
      key: "symbol",
      title: tCommon("symbol"),
      type: "text",
      icon: TrendingUp,
      description: tDashboardAdmin("futures_trading_pair_e_g_btc_usdt"),
      sortable: true,
      filterable: true,
      required: true,
      priority: 1,
    },
    {
      key: "type",
      title: tDashboardAdmin("order_type"),
      type: "select",
      icon: ArrowLeftRight,
      description: tDashboardAdmin("market_or_limit_order_type"),
      sortable: true,
      filterable: true,
      required: true,
      options: [
        { value: "LIMIT", label: tCommon("limit") },
        { value: "MARKET", label: tCommon("market") },
      ],
      priority: 1,
    },
    {
      key: "timeInForce",
      title: tDashboardAdmin("time_in_force"),
      type: "select",
      icon: ClipboardList,
      description: tDashboardAdmin("how_long_the_order_remains_active"),
      sortable: true,
      filterable: false,
      required: true,
      options: [
        { value: "GTC", label: tDashboardAdmin("gtc") },
        { value: "IOC", label: tDashboardAdmin("ioc") },
      ],
      condition: (values) => values.type === "LIMIT",
      expandedOnly: true,
      priority: 2,
    },
    {
      key: "side",
      title: tCommon("side"),
      type: "select",
      icon: ArrowLeftRight,
      description: tDashboardAdmin("buy_or_sell"),
      sortable: true,
      filterable: true,
      required: true,
      options: [
        { value: "BUY", label: tCommon("buy") },
        { value: "SELL", label: tCommon("sell") },
      ],
      render: {
        type: "badge",
        config: {
          variant: (value) => {
            switch (value) {
              case "BUY":
                return "success";
              case "SELL":
                return "danger";
              default:
                return "default";
            }
          },
        },
      },
      priority: 1,
    },
    {
      key: "price",
      title: tCommon("price"),
      type: "number",
      icon: DollarSign,
      description: tDashboardAdmin("order_price"),
      sortable: true,
      filterable: true,
      required: false,
      condition: (values) => values.type === "LIMIT",
      priority: 1,
    },
    {
      key: "amount",
      title: tCommon("amount"),
      type: "number",
      icon: DollarSign,
      description: tDashboardAdmin("order_size"),
      sortable: true,
      filterable: true,
      required: true,
      priority: 1,
    },
    {
      key: "leverage",
      title: tCommon("leverage"),
      type: "number",
      icon: Gauge,
      description: tDashboardAdmin("leverage_multiplier"),
      sortable: true,
      filterable: true,
      required: false,
      priority: 1,
    },
    {
      key: "fee",
      title: tCommon("fee"),
      type: "number",
      icon: DollarSign,
      description: tDashboardAdmin("fee_paid_for_the_order"),
      sortable: true,
      filterable: false,
      required: false,
      priority: 2,
      expandedOnly: true,
    },
    {
      key: "feeCurrency",
      title: tDashboardAdmin("fee_currency"),
      type: "text",
      icon: DollarSign,
      description: tDashboardAdmin("currency_for_fee_e_g_usdt"),
      sortable: false,
      filterable: false,
      required: false,
      priority: 3,
      expandedOnly: true,
    },
    {
      key: "average",
      title: tCommon("average"),
      type: "number",
      icon: DollarSign,
      description: tDashboardAdmin("average_fill_price"),
      sortable: true,
      filterable: false,
      priority: 2,
      expandedOnly: true,
    },
    {
      key: "filled",
      title: tCommon("filled"),
      type: "number",
      icon: DollarSign,
      description: tDashboardAdmin("amount_filled"),
      sortable: true,
      filterable: false,
      priority: 2,
      expandedOnly: true,
    },
    {
      key: "remaining",
      title: tDashboardAdmin("remaining"),
      type: "number",
      icon: DollarSign,
      description: tDashboardAdmin("amount_remaining_to_be_filled"),
      sortable: true,
      filterable: false,
      priority: 2,
      expandedOnly: true,
    },
    {
      key: "cost",
      title: tCommon("cost"),
      type: "number",
      icon: DollarSign,
      description: tDashboardAdmin("total_cost_so_far"),
      sortable: true,
      filterable: false,
      priority: 2,
      expandedOnly: true,
    },
    {
      key: "stopLossPrice",
      title: tCommon("stop_loss"),
      type: "number",
      icon: TrendingUp,
      description: tDashboardAdmin("stop_loss_trigger_price"),
      sortable: false,
      filterable: false,
      priority: 2,
      expandedOnly: true,
    },
    {
      key: "takeProfitPrice",
      title: tCommon("take_profit"),
      type: "number",
      icon: TrendingUp,
      description: tDashboardAdmin("take_profit_trigger_price"),
      sortable: false,
      filterable: false,
      priority: 2,
      expandedOnly: true,
    },
    {
      key: "trades",
      title: tCommon("trades"),
      type: "custom",
      icon: ClipboardList,
      description: tDashboardAdmin("raw_trade_data_json"),
      sortable: false,
      filterable: false,
      priority: 3,
      expandedOnly: true,
      render: (value: any) => <TradesCell value={value} />,
    },
  ];
}
