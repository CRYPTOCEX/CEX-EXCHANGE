"use client";
import React from "react";
import {
  Shield,
  User,
  DollarSign,
  ClipboardList,
  TrendingUp,
  ArrowLeftRight,
} from "lucide-react";
import { useTranslations } from "next-intl";

interface Trade {
  id: string;
  amount: number;
  price: number;
  cost: number;
  side: string;
  timestamp: number;
}

interface TradesCellProps {
  value: string; // Raw trades JSON string from the API response
}

export function TradesCell({ value }: TradesCellProps) {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  let trades: Trade[] = [];
  try {
    // The API returns a string that might be double-encoded.
    // First, try parsing the value.
    const parsed = JSON.parse(value);

    // If the result is still a string, try parsing it again.
    if (typeof parsed === "string") {
      trades = JSON.parse(parsed);
    } else if (Array.isArray(parsed)) {
      trades = parsed;
    }
  } catch (error) {
    console.error("Error parsing trades:", error);
    return <span className="text-red-500">{t("invalid_trades_data")}</span>;
  }
  if (!trades.length) {
    return <span>{t("no_trades")}</span>;
  }
  return (
    <div className="space-y-2">
      {trades.map((trade) => {
        return (
          <div
            key={trade.id}
            className="border p-2 rounded bg-default-900 dark:bg-default-100"
          >
            <div>
              <strong>ID:</strong> {trade.id}
            </div>
            <div>
              <strong>{tCommon("amount")}:</strong> {trade.amount}
            </div>
            <div>
              <strong>{tCommon('price')}:</strong> {trade.price}
            </div>
            <div>
              <strong>{tCommon("cost")}:</strong> {trade.cost}
            </div>
            <div>
              <strong>{tCommon("side")}:</strong> {trade.side}
            </div>
            <div>
              <strong>{tCommon("timestamp")}:</strong>{" "}
              {new Date(trade.timestamp).toLocaleString()}
            </div>
          </div>
        );
      })}
    </div>
  );
}

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
      description: tDashboardAdmin("unique_order_identifier"),
      priority: 2,
      expandedOnly: true,
    },
    {
      key: "userId",
      title: tCommon("user_id"),
      type: "text",
      icon: User,
      description: tDashboardAdmin("id_of_the_user_who_placed_this_order"),
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
          withDot: false,
        },
      },
      priority: 1,
    },
    {
      key: "symbol",
      title: tCommon("symbol"),
      type: "text",
      icon: TrendingUp,
      description: tDashboardAdmin("trading_pair_e_g_btc_usd"),
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
        { value: "GTC", label: tDashboardAdmin("good_till_cancel") },
        { value: "IOC", label: tDashboardAdmin("immediate_or_cancel") },
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
      description: tDashboardAdmin("limit_or_executed_price"),
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
      description: tDashboardAdmin("currency_used_for_the_fee_e_g_usd"),
      sortable: false,
      filterable: false,
      required: false,
      priority: 3,
      expandedOnly: true,
    },
    {
      key: "average",
      title: tDashboardAdmin("average_price"),
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
      description: tDashboardAdmin("how_much_of_the_order_was_filled"),
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
      description: tDashboardAdmin("remaining_amount_to_be_filled"),
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
