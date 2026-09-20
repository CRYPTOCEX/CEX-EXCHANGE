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
  Clock,
  Crosshair,
  ListOrdered,
  Percent,
  ShieldAlert,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { statusLabel, statusTone } from "@/lib/status-tone";
import type { ViewConfig } from "@/components/blocks/data-table/types/table";
import {
  OrderFillSummary,
  OrderFillsTable,
  OrderSideMark,
  TradesCell,
  formatOrderDate,
  formatOrderNumber,
  parseTrades,
  renderOrderId,
} from "../ecosystem/columns";
export function useColumns(): ColumnDefinition[] {
  const tCommon = useTranslations("common");
  const tDashboardAdmin = useTranslations("dashboard_admin");
  return [
    {
      key: "id",
      title: "ID",
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
        // No local `variant`: the hue comes from `lib/status-tone.ts`. Adding one
        // back here silently overrides the platform's canonical status colours.
        type: "badge",
        config: {},
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
      title: tCommon("order_type"),
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
      title: tCommon("time_in_force"),
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
      description: tCommon("buy_or_sell"),
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
      description: tCommon("order_price"),
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
      description: tCommon("order_size"),
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
      title: `${tCommon("remaining")}:`,
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
      title: "({completedTradesCount} trades)",
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

/* -------------------------------------------------------------------------- *
 * View dialog
 *
 * A futures order carries everything a spot order does plus the three fields
 * that decide whether it can wipe an account — leverage, stop loss and take
 * profit — and the position it belongs to. In the flat default panel those sat
 * between `feeCurrency` and the raw `trades` JSON, in the same grey tile, in
 * the same type size. Leverage is a header badge here because it is read at a
 * glance or not at all; the exits get their own section next to it.
 *
 * The fills table, the number/date formatters and the fill summary are shared
 * with the ecosystem order table, which is where they live.
 * -------------------------------------------------------------------------- */

export function useViewConfig(): ViewConfig {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  return React.useMemo<ViewConfig>(
    () => ({
      size: "5xl",

      title: (row) => (
        <span className="flex items-center gap-2 min-w-0">
          <OrderSideMark side={row.side} />
          <span className="truncate">{row.symbol || `#${row.id}`}</span>
        </span>
      ),

      subtitle: (row) =>
        [row.type, row.timeInForce].filter(Boolean).join(" · ") || undefined,

      badges: (row) => (
        <>
          <Badge tone={statusTone(row.status)} appearance="soft">
            {statusLabel(row.status) || tCommon("unknown")}
          </Badge>
          {row.side && (
            <Badge tone={statusTone(row.side)} appearance="soft">
              {String(row.side).toUpperCase()}
            </Badge>
          )}
          {Number(row.leverage) > 0 && (
            <Badge tone="warning" appearance="soft">
              <Gauge className="h-3 w-3" />
              {formatOrderNumber(row.leverage, 2)}x
            </Badge>
          )}
          {row.reduceOnly === true && (
            <Badge tone="info" appearance="soft">
              {tCommon("reduce_only")}
            </Badge>
          )}
        </>
      ),

      stats: [
        {
          label: tCommon("filled"),
          icon: Percent,
          value: (row) => <OrderFillSummary row={row} />,
        },
        {
          label: tCommon("remaining"),
          icon: ArrowLeftRight,
          value: (row) => formatOrderNumber(row.remaining),
        },
        {
          label: tCommon("total_cost"),
          icon: DollarSign,
          value: (row) => formatOrderNumber(row.cost),
        },
        {
          label: tCommon("fee"),
          icon: DollarSign,
          value: (row) =>
            [formatOrderNumber(row.fee), row.feeCurrency].filter(Boolean).join(" "),
        },
      ],

      sections: [
        {
          id: "pricing",
          title: tCommon("pricing"),
          icon: DollarSign,
          columns: 2,
          fields: ["price", "average"],
        },
        {
          id: "exits",
          title: t("risk_exits"),
          description:
            t("trigger_prices_that_close_this_orders"),
          icon: Crosshair,
          columns: 2,
          fields: ["stopLossPrice", "takeProfitPrice"],
        },
        {
          id: "position",
          title: tCommon("position"),
          icon: ShieldAlert,
          columns: 2,
          // Older rows predate these columns, and a market order that never
          // reached the book has no position to point at.
          condition: (row) => Boolean(row.positionId) || row.isTaker != null,
          fields: [
            {
              key: "positionId",
              title: tCommon("position_id"),
              icon: ShieldAlert,
              copyable: true,
              render: renderOrderId,
            },
            {
              key: "isTaker",
              title: tCommon("liquidity"),
              icon: ArrowLeftRight,
              // A raw `true` tells an operator nothing; the words taker and
              // maker are what the fee schedule is written in.
              render: (value) => (value === true ? "Taker" : "Maker"),
              condition: (row) => row.isTaker != null,
            },
          ],
        },
        {
          id: "fills",
          title: t("fills"),
          icon: ListOrdered,
          condition: (row) => parseTrades(row.trades).length > 0,
          render: (row) => <OrderFillsTable trades={parseTrades(row.trades)} />,
        },
        {
          id: "reference",
          title: t("order_account"),
          icon: Shield,
          columns: 2,
          fields: ["id", "userId"],
        },
        {
          id: "timeline",
          title: tCommon("timeline"),
          icon: Clock,
          columns: 2,
          fields: [
            {
              key: "createdAt",
              title: tCommon("placed"),
              icon: Clock,
              render: (value) => formatOrderDate(value),
            },
            {
              key: "updatedAt",
              title: tCommon("last_updated"),
              icon: Clock,
              render: (value) => formatOrderDate(value),
            },
          ],
        },
      ],
    }),
    []
  );
}
