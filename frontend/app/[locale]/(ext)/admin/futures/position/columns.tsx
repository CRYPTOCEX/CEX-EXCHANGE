"use client";
import { TrendingUp, DollarSign, Settings, Target, User, Activity } from "lucide-react";
import { useTranslations } from "next-intl";
export function useColumns(): ColumnDefinition[] {
  const tCommon = useTranslations("common");
  const tExtAdmin = useTranslations("ext_admin");
  return [
    {
      key: "symbol",
      title: tCommon("symbol"),
      type: "text",
      description: tExtAdmin("trading_pair_symbol_e_g_btc"),
      sortable: true,
      filterable: true,
      required: true,
      priority: 1,
    },
    {
      key: "side",
      title: tCommon("side"),
      type: "select",
      description: tExtAdmin("position_direction_long_buy_bullish_expects"),
      sortable: true,
      filterable: true,
      required: true,
      priority: 1,
      options: [
        { value: "BUY", label: tExtAdmin("long") },
        { value: "SELL", label: tExtAdmin("short") },
      ],
      render: {
        type: "badge",
        config: {
          variant: (value) => (value === "BUY" ? "success" : "destructive"),
        },
      },
    },
    {
      key: "unrealizedPnl",
      title: tExtAdmin("unrealized_pnl"),
      type: "number",
      description: tExtAdmin("current_profit_or_loss_on_open"),
      sortable: true,
      filterable: false,
      priority: 1,
      render: {
        type: "badge",
        config: {
          variant: (value) => (parseFloat(value) >= 0 ? "success" : "destructive"),
        },
      },
    },
    {
      key: "status",
      title: tCommon("status"),
      type: "select",
      description: tExtAdmin("position_lifecycle_status_open_active_trading"),
      sortable: true,
      filterable: true,
      required: true,
      priority: 1,
      options: [
        { value: "OPEN", label: tCommon("open") },
        { value: "CLOSED", label: tCommon("closed") },
        { value: "CANCELLED", label: tCommon("cancelled") },
        { value: "LIQUIDATED", label: tExtAdmin("liquidated") },
      ],
      render: {
        type: "badge",
        config: {
          variant: (value) => {
            switch (value) {
              case "OPEN":
                return "success";
              case "CLOSED":
                return "secondary";
              case "CANCELLED":
                return "warning";
              case "LIQUIDATED":
                return "destructive";
              default:
                return "default";
            }
          },
        },
      },
    },
    {
      key: "userId",
      title: tCommon("user_id"),
      type: "text",
      description: tExtAdmin("unique_identifier_of_the_trader_who"),
      sortable: true,
      filterable: true,
      priority: 2,
    },
    {
      key: "entryPrice",
      title: tCommon("entry_price"),
      type: "number",
      description: tExtAdmin("average_price_at_which_the_position"),
      sortable: true,
      filterable: true,
      required: true,
      priority: 2,
    },
    {
      key: "amount",
      title: tExtAdmin("position_size"),
      type: "number",
      description: tExtAdmin("total_contract_size_or_quantity_of"),
      sortable: true,
      filterable: true,
      required: true,
      priority: 2,
    },
    {
      key: "leverage",
      title: tCommon("leverage"),
      type: "number",
      description: tExtAdmin("multiplier_applied_to_position_e_g"),
      sortable: true,
      filterable: true,
      priority: 2,
    },
    {
      key: "stopLossPrice",
      title: tCommon("stop_loss"),
      type: "number",
      description: tExtAdmin("price_level_that_triggers_automatic_position"),
      sortable: false,
      filterable: false,
      expandedOnly: true,
    },
    {
      key: "takeProfitPrice",
      title: tCommon("take_profit"),
      type: "number",
      description: tExtAdmin("price_level_that_triggers_automatic_position"),
      sortable: false,
      filterable: false,
      expandedOnly: true,
    },
    {
      key: "createdAt",
      title: tExtAdmin("opened_at"),
      type: "date",
      description: tExtAdmin("timestamp_when_the_position_was_initially"),
      sortable: true,
      filterable: true,
      expandedOnly: true,
    },
  ];
}
