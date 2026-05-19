"use client";
import {
  User,
  Mail,
  Shield,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Award,
  Percent,
  Target,
  AlertTriangle,
} from "lucide-react";
import type {
  ColumnDefinition,
  FormConfig,
} from "@/components/blocks/data-table/types/table";
import { useTranslations } from "next-intl";

export function useColumns() {
  const t = useTranslations("ext_admin");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");

  return [
    {
      key: "id",
      title: tCommon("id"),
      type: "text",
      icon: Shield,
      sortable: true,
      searchable: true,
      filterable: false,
      description: t("unique_identifier_for_the_subscription"),
      priority: 3,
      expandedOnly: true,
    },
    {
      key: "follower",
      title: t("follower"),
      type: "compound",
      icon: User,
      sortable: true,
      searchable: true,
      filterable: true,
      description: t("follower_user_information"),
      render: {
        type: "compound",
        config: {
          image: {
            key: "user.avatar",
            fallback: "/img/placeholder.svg",
            type: "image",
            title: tCommon("avatar"),
          },
          primary: {
            key: ["user.firstName", "user.lastName"],
            title: [tCommon("first_name"), tCommon("last_name")],
            icon: User,
          },
          secondary: {
            key: "user.email",
            title: tCommon("email"),
            icon: Mail,
          },
        },
      },
      priority: 1,
    },
    {
      key: "leader",
      title: t("leader"),
      type: "compound",
      icon: Award,
      sortable: true,
      searchable: true,
      filterable: true,
      description: t("leader_being_followed"),
      render: {
        type: "compound",
        config: {
          primary: {
            key: "leader.displayName",
            title: tExt("display_name"),
            icon: Award,
          },
        },
      },
      priority: 1,
    },
    {
      key: "status",
      title: tCommon("status"),
      type: "select",
      icon: Shield,
      sortable: true,
      searchable: false,
      filterable: true,
      description: t("current_status_of_the_subscription"),
      options: [
        { value: "ACTIVE", label: tCommon("active"), color: "success" },
        { value: "PAUSED", label: tCommon("paused"), color: "warning" },
        { value: "STOPPED", label: tCommon("stopped"), color: "danger" },
        { value: "PENDING", label: tCommon("pending"), color: "info" },
      ],
      render: {
        type: "badge",
        config: {
          variant: (value: string) => {
            switch (value) {
              case "ACTIVE":
                return "success";
              case "PAUSED":
                return "warning";
              case "STOPPED":
                return "danger";
              case "PENDING":
                return "info";
              default:
                return "secondary";
            }
          },
        },
      },
      priority: 1,
    },
    {
      key: "allocations",
      title: "Markets",
      type: "text",
      icon: Target,
      sortable: false,
      searchable: false,
      filterable: false,
      description: "Number of active markets",
      priority: 1,
      render: {
        type: "custom",
        render: (_: any, row: any) => {
          const count = row?.allocations?.filter((a: any) => a.isActive).length || 0;
          return count;
        },
      },
    },
    {
      key: "currentValue",
      title: tExt("current_value"),
      type: "number",
      icon: DollarSign,
      sortable: true,
      searchable: false,
      filterable: true,
      description: t("current_portfolio_value"),
      priority: 2,
      render: {
        type: "custom",
        render: (_: any, row: any) => {
          // Calculate total allocated from base and quote amounts
          const totalValue = row?.allocations?.reduce((sum: number, alloc: any) => {
            return sum + (parseFloat(alloc.baseAmount) || 0) + (parseFloat(alloc.quoteAmount) || 0);
          }, 0) || 0;
          return totalValue.toLocaleString();
        },
      },
    },
    {
      key: "totalProfit",
      title: t("pnl"),
      type: "number",
      icon: TrendingUp,
      sortable: true,
      searchable: false,
      filterable: true,
      description: t("total_profit_and_loss"),
      priority: 1,
      render: {
        type: "custom",
        render: (value: number, row: any) => {
          const roi = row?.roi || 0;
          const color = value >= 0 ? "text-success" : "text-danger";
          const Icon = value >= 0 ? TrendingUp : TrendingDown;
          return (
            <span className={`flex items-center gap-1 ${color}`}>
              <Icon className="h-3 w-3" />
              {value >= 0 ? "+" : ""}{(value || 0).toFixed(2)}
              <span className="text-xs opacity-70">
                ({roi >= 0 ? "+" : ""}
                {roi.toFixed(1)}%)
              </span>
            </span>
          );
        },
      },
    },
    {
      key: "copyMode",
      title: tCommon("risk"),
      type: "text",
      icon: Target,
      sortable: true,
      searchable: false,
      filterable: true,
      description: t("risk_multiplier_applied_to_trades"),
      priority: 2,
      render: {
        type: "custom",
        render: (value: string, row: any) => {
          if (value === "FIXED_RATIO" && row.fixedRatio) {
            return `${row.fixedRatio}x`;
          }
          return value === "PROPORTIONAL" ? "1x" : "-";
        },
      },
    },
    {
      key: "maxDailyLoss",
      title: tExt("max_daily_loss"),
      type: "number",
      icon: AlertTriangle,
      sortable: true,
      searchable: false,
      filterable: false,
      description: t("maximum_daily_loss_limit"),
      priority: 3,
      expandedOnly: true,
      render: {
        type: "custom",
        render: (value: number) =>
          value ? value.toLocaleString() : "-",
      },
    },
    {
      key: "maxPositionSize",
      title: tExt("max_position_size"),
      type: "number",
      icon: Target,
      sortable: true,
      searchable: false,
      filterable: false,
      description: t("maximum_position_size_limit"),
      priority: 3,
      expandedOnly: true,
      render: {
        type: "custom",
        render: (value: number) =>
          value ? value.toLocaleString() : "-",
      },
    },
    {
      key: "createdAt",
      title: t("started"),
      type: "date",
      icon: Calendar,
      sortable: true,
      searchable: false,
      filterable: true,
      description: t("date_when_subscription_started"),
      priority: 2,
      render: {
        type: "date",
        format: "PP",
      },
    },
  ] as ColumnDefinition[];
}

export function useFormConfig() {
  const t = useTranslations("ext_admin");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");

  return {
    edit: {
      title: t("edit_subscription"),
      description: t("update_subscription_settings"),
      groups: [
        {
          id: "subscription-settings",
          title: tExt("subscription_settings"),
          icon: Target,
          priority: 1,
          fields: [
            {
              key: "status",
              required: true,
              options: [
                { value: "ACTIVE", label: tCommon("active") },
                { value: "PAUSED", label: tCommon("paused") },
                { value: "STOPPED", label: tCommon("stopped") },
              ],
            },
            { key: "riskMultiplier", required: false, min: 0.1, max: 10 },
            { key: "maxDailyLoss", required: false, min: 0 },
            { key: "maxPositionSize", required: false, min: 0 },
          ],
        },
      ],
    },
  } as FormConfig;
}
