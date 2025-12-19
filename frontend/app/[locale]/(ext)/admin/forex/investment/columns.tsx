"use client";
import {
  Shield,
  ClipboardList,
  DollarSign,
  CalendarIcon,
  User,
  TrendingUp,
  Settings,
  Mail,
} from "lucide-react";
import type { FormConfig } from "@/components/blocks/data-table/types/table";

import { useTranslations } from "next-intl";
export function useColumns() {
  const t = useTranslations("ext_admin");
  const tCommon = useTranslations("common");
  return [
    {
      key: "id",
      title: tCommon("id"),
      type: "text",
      icon: Shield,
      sortable: true,
      searchable: true,
      filterable: true,
      description: t("unique_system_identifier_for_this_forex"),
      priority: 3,
      expandedOnly: true,
    },
    {
      key: "user",
      title: tCommon("user"),
      type: "compound",
      expandedTitle: (row) => `User: ${row.id}`,
      icon: User,
      sortable: true,
      searchable: true,
      filterable: true,
      description: t("investor_details_including_profile_picture_full"),
      render: {
        type: "compound",
        config: {
          image: {
            key: "avatar",
            fallback: "/img/placeholder.svg",
            type: "image",
            title: tCommon("avatar"),
            description: tCommon("users_profile_picture"),
            filterable: false,
            sortable: false,
          },
          primary: {
            key: ["firstName", "lastName"],
            title: [tCommon("first_name"), tCommon("last_name")],
            icon: User,
          },
          secondary: {
            key: "email",
            title: tCommon("email"),
            icon: Mail,
          },
        },
      },
      priority: 1,
    },
    {
      key: "plan",
      title: tCommon("plan"),
      type: "custom",
      icon: ClipboardList,
      sortable: true,
      searchable: true,
      filterable: true,
      description: t("selected_forex_trading_plan_with_specific"),
      render: (value: any, row: any) => (row?.plan ? row.plan.title : "N/A"),
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
      description: t("initial_investment_amount_deposited_into_the"),
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
      description: t("total_profit_or_loss_generated_from"),
      priority: 1,
    },
    {
      key: "status",
      title: tCommon("status"),
      type: "select",
      icon: Settings,
      sortable: true,
      searchable: true,
      filterable: true,
      description: t("current_investment_status_in_the_trading_lifecycle"),
      options: [
        { value: "ACTIVE", label: tCommon("active") },
        { value: "COMPLETED", label: tCommon("completed") },
        { value: "CANCELLED", label: tCommon("cancelled") },
        { value: "REJECTED", label: tCommon("rejected") },
      ],
      priority: 1,
      render: {
        type: "badge",
        config: {
          variant: (value: any) => {
            switch (value) {
              case "ACTIVE":
                return "success";
              case "COMPLETED":
                return "success";
              case "CANCELLED":
                return "secondary";
              case "REJECTED":
                return "destructive";
              default:
                return "secondary";
            }
          },
        },
      },
    },
    {
      key: "duration",
      title: tCommon("duration"),
      type: "custom",
      icon: CalendarIcon,
      sortable: true,
      searchable: false,
      filterable: false,
      description: t("investment_period_length_e_g_7"),
      render: (value: any, row: any) => {
        const duration = row?.duration || value;
        return duration ? `${duration.duration} ${duration.timeframe}` : "N/A";
      },
      priority: 2,
      expandedOnly: true,
    },
    {
      key: "result",
      title: tCommon("result"),
      type: "select",
      icon: TrendingUp,
      sortable: true,
      searchable: true,
      filterable: true,
      description: t("final_trading_outcome_win_profit_loss"),
      options: [
        { value: "WIN", label: tCommon("win") },
        { value: "LOSS", label: tCommon("loss") },
        { value: "DRAW", label: tCommon("draw") },
      ],
      priority: 2,
      expandedOnly: true,
      render: {
        type: "badge",
        config: {
          variant: (value: any) => {
            switch (value) {
              case "WIN":
                return "success";
              case "LOSS":
                return "destructive";
              case "DRAW":
                return "secondary";
              default:
                return "secondary";
            }
          },
        },
      },
    },
    {
      key: "createdAt",
      title: tCommon("created_at"),
      type: "date",
      icon: CalendarIcon,
      sortable: true,
      searchable: true,
      filterable: true,
      description: t("date_and_time_when_the_investment"),
      render: { type: "date", format: "PPP" },
      priority: 2,
      expandedOnly: true,
    },
  ] as ColumnDefinition[];
}

export function useFormConfig() {
  const t = useTranslations("ext_admin");
  const tCommon = useTranslations("common");
  return {
    create: {
      title: t("create_new_forex_investment"),
      description: t("manually_create_a_forex_investment_transaction"),
      groups: [],
    },
    edit: {
      title: t("edit_forex_investment"),
      description: t("update_investment_status_trading_results_and"),
      groups: [
        {
          id: "trading-results",
          title: t("trading_results"),
          icon: TrendingUp,
          priority: 1,
          fields: [
            { key: "profit", required: false },
            {
              key: "result",
              required: false,
              options: [
                { value: "WIN", label: tCommon("win") },
                { value: "LOSS", label: tCommon("loss") },
                { value: "DRAW", label: tCommon("draw") },
              ],
            },
          ],
        },
        {
          id: "investment-status",
          title: t("investment_status"),
          icon: Settings,
          priority: 2,
          fields: [
            {
              key: "status",
              required: true,
              options: [
                { value: "ACTIVE", label: tCommon("active") },
                { value: "COMPLETED", label: tCommon("completed") },
                { value: "CANCELLED", label: tCommon("cancelled") },
                { value: "REJECTED", label: tCommon("rejected") },
              ],
            },
          ],
        },
      ],
    },
  } as FormConfig;
}
