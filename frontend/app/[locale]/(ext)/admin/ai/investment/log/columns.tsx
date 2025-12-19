"use client";
import {
  Shield,
  User,
  ClipboardList,
  DollarSign,
  CalendarIcon,
  Settings,
  Wallet,
  TrendingUp,
  Clock,
} from "lucide-react";
import type { FormConfig } from "@/components/blocks/data-table/types/table";

import { useTranslations } from "next-intl";
export function useColumns(): ColumnDefinition[] {
  const tCommon = useTranslations("common");
  const tExtAdmin = useTranslations("ext_admin");
  return [
    {
      key: "user",
      title: tCommon("user"),
      type: "compound",
      expandedTitle: (row) => `User: ${row.id}`,
      icon: User,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("investor_who_created_this_ai_investment"),
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
      description: tExtAdmin("ai_investment_plan_selected_by_the_user"),
      render: (value: any, row: any) => {
        const plan = row?.plan || value;
        return plan ? plan.title : "N/A";
      },
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
      description: tExtAdmin("total_amount_invested_in_this_ai_investment"),
      priority: 1,
    },
    {
      key: "status",
      title: tCommon("status"),
      type: "select",
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("current_status_of_the_ai_investment"),
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
                return "warning";
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
      key: "profit",
      title: tCommon("profit"),
      type: "number",
      icon: TrendingUp,
      sortable: true,
      searchable: false,
      filterable: true,
      description: tExtAdmin("total_profit_earned_from_this_ai_investment"),
      priority: 1,
    },
    {
      key: "symbol",
      title: tCommon("symbol"),
      type: "text",
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("trading_market_or_pair_symbol_used"),
      priority: 2,
    },
    {
      key: "type",
      title: tCommon("wallet_type"),
      type: "select",
      icon: Wallet,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("type_of_wallet_used_spot_or_eco_wallet"),
      options: [
        { value: "SPOT", label: tCommon("spot") },
        { value: "ECO", label: tCommon("eco") },
      ],
      priority: 2,
      render: {
        type: "badge",
        config: {
          variant: (value) => {
            switch (value) {
              case "SPOT":
                return "success";
              case "ECO":
                return "info";
              default:
                return "secondary";
            }
          },
          withDot: false,
        },
      },
    },
    {
      key: "result",
      title: tCommon("result"),
      type: "select",
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("investment_outcome_win_loss_or_draw"),
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
                return "warning";
              default:
                return "secondary";
            }
          },
          withDot: false,
        },
      },
    },
    {
      key: "duration",
      title: tCommon("duration"),
      type: "custom",
      icon: Clock,
      sortable: true,
      searchable: false,
      filterable: false,
      description: tExtAdmin("investment_duration_with_timeframe_e_g"),
      render: (value: any, row: any) => {
        const duration = row?.duration || value;
        if (!duration) return "N/A";
        return `${duration.duration} ${duration.timeframe}`;
      },
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
      description: tExtAdmin("date_and_time_when_the_ai_investment_was_created"),
      render: { type: "date", format: "PPP" },
      priority: 3,
      expandedOnly: true,
    },
    {
      key: "id",
      title: tCommon("id"),
      type: "text",
      icon: Shield,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("unique_system_identifier_for_this_ai"),
      priority: 3,
      expandedOnly: true,
    },
  ];
}

export function useFormConfig(): FormConfig {
  const tCommon = useTranslations("common");
  const tExtAdmin = useTranslations("ext_admin");
  return {
    create: {
      title: tExtAdmin("create_new_investment_log"),
      description: tExtAdmin("record_a_new_ai_investment_transaction"),
      groups: [],
    },
    edit: {
      title: tExtAdmin("edit_investment_log"),
      description: tExtAdmin("modify_ai_investment_log_details_results"),
      groups: [
        {
          id: "investment-details",
          title: tCommon("investment_details"),
          icon: DollarSign,
          priority: 1,
          fields: [
            {
              key: "type",
              required: true,
              options: [
                { value: "SPOT", label: tCommon("spot") },
                { value: "ECO", label: tCommon("eco") },
              ],
            },
          ],
        },
        {
          id: "results",
          title: tExtAdmin("investment_results"),
          icon: TrendingUp,
          priority: 2,
          fields: [
            {
              key: "profit",
              required: false,
            },
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
          id: "status-control",
          title: tExtAdmin("status_control"),
          icon: Settings,
          priority: 3,
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
  };
}
