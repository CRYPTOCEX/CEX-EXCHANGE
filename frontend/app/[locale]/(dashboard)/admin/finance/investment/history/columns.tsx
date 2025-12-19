"use client";
import {
  Shield,
  User,
  DollarSign,
  ClipboardList,
  CalendarIcon,
  TrendingUp,
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
      description: tDashboardAdmin("unique_identifier_for_the_investment"),
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
      description: tDashboardAdmin("investor_information"),
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
            description: [tDashboardAdmin("investors_first_name"), tDashboardAdmin("investors_last_name")],
            sortable: true,
            searchable: true,
            filterable: true,
            icon: User,
          },
          secondary: {
            key: "email",
            title: tCommon("email"),
            icon: ClipboardList,
            sortable: true,
            searchable: true,
            filterable: true,
          },
        },
      },
      priority: 1,
    },
    {
      key: "plan",
      idKey: "id",
      labelKey: "name",
      title: tCommon("plan"),
      type: "select",
      icon: TrendingUp,
      sortable: true,
      searchable: true,
      filterable: true,
      sortKey: "plan.title",
      description: tDashboardAdmin("investment_plan_selected"),
      render: (value: any, row: any) => {
        const plan = row?.plan || value;
        return plan ? plan.title : "N/A";
      },
      apiEndpoint: {
        url: "/api/admin/finance/investment/plan/options",
        method: "GET",
      },
      priority: 1,
    },
    {
      key: "duration",
      idKey: "id",
      labelKey: "name",
      title: tCommon("duration"),
      type: "select",
      icon: CalendarIcon,
      sortable: true,
      searchable: false,
      filterable: false,
      description: tDashboardAdmin("investment_time_period"),
      sortKey: "duration",
      render: (value: any, row: any) => {
        const duration = row?.duration || value;
        return duration ? `${duration.duration} ${duration.timeframe}` : "N/A";
      },
      apiEndpoint: {
        url: "/api/admin/finance/investment/duration/options",
        method: "GET",
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
      description: tDashboardAdmin("amount_invested_by_user"),
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
      key: "result",
      title: tCommon("result"),
      type: "select",
      icon: TrendingUp,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tDashboardAdmin("investment_outcome"),
      options: [
        { value: "WIN", label: tCommon("win") },
        { value: "LOSS", label: tCommon("loss") },
        { value: "DRAW", label: tCommon("draw") },
      ],
      render: {
        type: "badge",
        config: {
          variant: (value: string) => {
            switch (value?.toUpperCase()) {
              case "WIN":
                return "success";
              case "LOSS":
                return "danger";
              case "DRAW":
                return "warning";
              default:
                return "default";
            }
          },
        },
      },
      priority: 1,
    },
    {
      key: "status",
      title: tCommon("status"),
      type: "select",
      icon: ClipboardList,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tDashboardAdmin("current_investment_status"),
      options: [
        { value: "ACTIVE", label: tCommon("active") },
        { value: "COMPLETED", label: tCommon("completed") },
        { value: "CANCELLED", label: tCommon("cancelled") },
        { value: "REJECTED", label: tCommon("rejected") },
      ],
      render: {
        type: "badge",
        config: {
          variant: (value: string) => {
            switch (value?.toUpperCase()) {
              case "ACTIVE":
                return "primary";
              case "COMPLETED":
                return "success";
              case "CANCELLED":
                return "muted";
              case "REJECTED":
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
      key: "endDate",
      title: tCommon("end_date"),
      type: "date",
      icon: CalendarIcon,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tDashboardAdmin("when_the_investment_period_ends"),
      render: { type: "date", format: "PPP" },
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
      description: tDashboardAdmin("when_the_investment_was_created"),
      render: { type: "date", format: "PPP" },
      priority: 2,
      expandedOnly: true,
    },
  ];
}
