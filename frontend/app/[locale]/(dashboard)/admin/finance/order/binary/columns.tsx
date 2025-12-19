"use client";
import {
  Shield,
  User,
  DollarSign,
  ClipboardList,
  CalendarIcon,
  TrendingUp,
  ArrowUp,
} from "lucide-react";
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
      description: tDashboardAdmin("unique_order_identifier"),
      priority: 2,
      expandedOnly: true,
    },
    {
      key: "user",
      title: tCommon("user"),
      type: "compound",
      icon: User,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tDashboardAdmin("trader_information"),
      render: {
        type: "compound",
        config: {
          image: {
            key: "avatar",
            fallback: "/img/placeholder.svg",
            type: "image",
            title: tCommon("avatar"),
            description: tCommon("user_avatar"),
          },
          primary: {
            key: ["firstName", "lastName"],
            title: [tCommon("first_name"), tCommon("last_name")],
            description: [tDashboardAdmin("traders_first_name"), tDashboardAdmin("traders_last_name")],
            icon: User,
          },
          secondary: {
            key: "email",
            title: tCommon("email"),
            icon: ClipboardList,
          },
        },
      },
      priority: 1,
      expandedOnly: true,
    },
    {
      key: "symbol",
      title: tCommon("symbol"),
      type: "text",
      icon: TrendingUp,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tDashboardAdmin("trading_pair_or_asset"),
      priority: 1,
    },
    {
      key: "price",
      title: tCommon("price"),
      type: "number",
      icon: DollarSign,
      sortable: true,
      searchable: false,
      filterable: true,
      description: tDashboardAdmin("entry_price_when_order_placed"),
      priority: 1,
    },
    {
      key: "amount",
      title: tCommon("amount"),
      type: "number",
      icon: DollarSign,
      sortable: true,
      searchable: false,
      filterable: true,
      description: tDashboardAdmin("order_stake_amount"),
      priority: 1,
    },
    {
      key: "profit",
      title: tCommon("profit"),
      type: "number",
      icon: DollarSign,
      sortable: true,
      searchable: false,
      filterable: true,
      description: tDashboardAdmin("profit_or_loss_amount"),
      priority: 1,
    },
    {
      key: "side",
      title: tCommon("side"),
      type: "select",
      icon: ArrowUp,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tDashboardAdmin("trade_direction_prediction"),
      options: [
        { value: "RISE", label: tCommon("rise") },
        { value: "FALL", label: tCommon("fall") },
      ],
      priority: 1,
      render: {
        type: "badge",
        config: {
          variant: (value) => {
            if (value === "RISE") {
              return "success";
            } else if (value === "FALL") {
              return "danger";
            }
            return "default";
          },
        },
      },
    },
    {
      key: "status",
      title: tCommon("status"),
      type: "select",
      icon: ClipboardList,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tDashboardAdmin("current_order_status"),
      options: [
        { value: "PENDING", label: tCommon("pending") },
        { value: "WIN", label: tCommon("win") },
        { value: "LOSS", label: tCommon("loss") },
        { value: "DRAW", label: tCommon("draw") },
        { value: "CANCELED", label: tDashboardAdmin("canceled") },
      ],
      render: {
        type: "badge",
        config: {
          variant: (value: string) => {
            switch (value?.toUpperCase()) {
              case "PENDING":
                return "warning";
              case "WIN":
                return "success";
              case "LOSS":
                return "danger";
              case "DRAW":
                return "muted";
              case "CANCELED":
                return "muted";
              default:
                return "default";
            }
          },
        },
      },
      priority: 1,
    },
    {
      key: "closePrice",
      title: tDashboardAdmin("close_price"),
      type: "number",
      icon: DollarSign,
      sortable: true,
      searchable: false,
      filterable: true,
      description: tDashboardAdmin("final_closing_price"),
      priority: 2,
      expandedOnly: true,
    },
    {
      key: "createdAt",
      title: tCommon("created_at"),
      type: "date",
      icon: CalendarIcon,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tDashboardAdmin("when_order_was_placed"),
      priority: 2,
      render: { type: "date", format: "PPP", fullDate: true },
    },
    {
      key: "closedAt",
      title: tDashboardAdmin("closed_at"),
      type: "date",
      icon: CalendarIcon,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tDashboardAdmin("when_order_was_closed"),
      priority: 2,
      render: { type: "date", format: "PPP", fullDate: true },
    },
    {
      key: "isDemo",
      title: tCommon("demo"),
      type: "boolean",
      icon: ClipboardList,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tDashboardAdmin("demo_account_order_flag"),
      priority: 1,
      expandedOnly: true,
    },
  ];
}
