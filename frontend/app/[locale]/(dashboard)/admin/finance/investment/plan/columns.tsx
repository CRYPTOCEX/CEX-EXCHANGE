"use client";
import { Shield, ClipboardList, DollarSign, TrendingUp, Wallet } from "lucide-react";
import type { FormConfig } from "@/components/blocks/data-table/types/table";

import { useTranslations } from "next-intl";
// Custom renderer for durations column
function renderDurations(value: any) {
  if (!value || !Array.isArray(value) || value.length === 0) return "None";
  const tags = value.map((d: any) => `${d.duration} ${d.timeframe}`);
  return (
    <div className="flex flex-wrap gap-1">
      {tags.map((tag: string, index: number) => (
        <span
          key={index}
          className="rounded bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800"
        >
          {tag}
        </span>
      ))}
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
      description: tDashboardAdmin("unique_identifier_for_the_plan"),
      priority: 3,
      expandedOnly: true,
    },
    {
      key: "image",
      title: tCommon("image"),
      type: "image",
      icon: Shield,
      sortable: false,
      searchable: false,
      filterable: false,
      description: tCommon("plan_image"),
      priority: 3,
      expandedOnly: true,
    },
    {
      key: "title",
      title: tCommon("title"),
      type: "text",
      icon: Shield,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tCommon("display_title"),
      priority: 3,
      expandedOnly: true,
    },
    // Compound column combining image and title for better preview
    {
      key: "planCompound",
      title: tCommon("plan"),
      type: "compound",
      disablePrefixSort: true,
      sortable: true,
      searchable: true,
      filterable: true,
      priority: 1,
      icon: Shield,
      description: tDashboardAdmin("plan_display_information"),
      render: {
        type: "compound",
        config: {
          image: {
            key: "image", // Row's image URL
            fallback: "/img/placeholder.svg",
            type: "image",
            title: tCommon("image"),
            description: tCommon("plan_image"),
            filterable: false,
            sortable: false,
          },
          primary: {
            key: "title", // Row's display title
            title: tCommon("title"),
            description: tCommon("display_title"),
            sortable: true,
            sortKey: "title",
          },
        },
      },
    },
    {
      key: "name",
      title: tCommon("name"),
      type: "text",
      icon: Shield,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tDashboardAdmin("internal_plan_name_identifier"),
      priority: 1,
      expandedOnly: true,
    },
    {
      key: "description",
      title: tCommon("description"),
      type: "text",
      icon: ClipboardList,
      sortable: false,
      searchable: true,
      filterable: false,
      description: tDashboardAdmin("plan_description_and_details"),
      priority: 3,
      expandedOnly: true,
    },
    {
      key: "walletType",
      title: tCommon("wallet"),
      type: "select",
      icon: Wallet,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tDashboardAdmin("type_of_wallet_for_the_plan"),
      priority: 1,
      apiEndpoint: {
        url: "/api/admin/finance/wallet/options",
        method: "GET",
      },
    },
    {
      key: "currency",
      title: tCommon("currency"),
      type: "select",
      icon: DollarSign,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tDashboardAdmin("currency_used_for_investments"),
      priority: 1,
      dynamicSelect: {
        refreshOn: "walletType", // watch the walletType field
        // When walletType changes, call endpointBuilder with its current value.
        endpointBuilder: (walletTypeValue: string | undefined) =>
          walletTypeValue
            ? {
                url: `/api/admin/finance/currency/options?type=${walletTypeValue}`,
                method: "GET",
              }
            : null,
        disableWhenEmpty: true, // disable currency select when walletType is not set
      },
    },
    {
      key: "minAmount",
      title: tCommon("min_amount"),
      type: "number",
      icon: DollarSign,
      sortable: true,
      searchable: false,
      filterable: true,
      description: tCommon("minimum_investment_amount"),
      priority: 1,
    },
    {
      key: "maxAmount",
      title: tCommon("max_amount"),
      type: "number",
      icon: DollarSign,
      sortable: true,
      searchable: false,
      filterable: true,
      description: tCommon("maximum_investment_amount"),
      priority: 1,
    },
    {
      key: "profitPercentage",
      title: tCommon("profit"),
      type: "number",
      icon: TrendingUp,
      sortable: true,
      searchable: false,
      filterable: true,
      description: tDashboardAdmin("profit_percentage"),
      priority: 1,
    },
    {
      key: "invested",
      title: tCommon("invested"),
      type: "number",
      icon: DollarSign,
      sortable: true,
      searchable: false,
      filterable: true,
      description: tDashboardAdmin("total_amount_invested_in_plan"),
      priority: 2,
      expandedOnly: true,
    },
    {
      key: "minProfit",
      title: tCommon("min_profit"),
      type: "number",
      icon: DollarSign,
      sortable: true,
      searchable: false,
      filterable: true,
      description: tDashboardAdmin("minimum_profit_amount"),
      priority: 2,
      expandedOnly: true,
    },
    {
      key: "maxProfit",
      title: tCommon("max_profit"),
      type: "number",
      icon: DollarSign,
      sortable: true,
      searchable: false,
      filterable: true,
      description: tDashboardAdmin("maximum_profit_amount"),
      priority: 2,
      expandedOnly: true,
    },
    {
      key: "defaultProfit",
      title: tCommon("default_profit"),
      type: "number",
      icon: DollarSign,
      sortable: true,
      searchable: false,
      filterable: true,
      description: tDashboardAdmin("default_profit_value"),
      priority: 2,
      expandedOnly: true,
    },
    {
      key: "defaultResult",
      title: tCommon("default_result"),
      type: "select",
      icon: TrendingUp,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tDashboardAdmin("default_result_win_loss_draw"),
      priority: 2,
      expandedOnly: true,
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
    },
    {
      key: "trending",
      title: tCommon("trending"),
      type: "boolean",
      icon: TrendingUp,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tDashboardAdmin("whether_the_plan_is_trending"),
      priority: 1,
    },
    {
      key: "status",
      title: tCommon("status"),
      type: "boolean",
      icon: ClipboardList,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tDashboardAdmin("plan_active_status"),
      priority: 1,
    },
    {
      key: "durations",
      title: tCommon("durations"),
      type: "multiselect",
      icon: ClipboardList,
      sortable: false,
      searchable: false,
      filterable: false,
      description: tDashboardAdmin("available_durations_for_this_plan"),
      priority: 2,
      apiEndpoint: {
        url: "/api/admin/finance/investment/duration/options",
        method: "GET",
      },
      render: {
        type: "custom",
        render: (value: any, row: any) => renderDurations(value),
      },
    },
    {
      key: "createdAt",
      title: tCommon("created_at"),
      type: "date",
      icon: ClipboardList,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tDashboardAdmin("creation_date"),
      render: { type: "date", format: "PPP" },
      priority: 3,
      expandedOnly: true,
    },
  ];
}

export function useFormConfig(): FormConfig {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  return {
    create: {
      title: t("create_new_plan"),
      description: t("set_up_a_new_investment_plan_with_returns"),
      groups: [
        {
          id: "plan-basic",
          title: t("basic_information"),
          icon: Shield,
          priority: 1,
          fields: [
            { key: "name", required: true },
            { key: "title", required: true },
            "image",
            { key: "description", required: true },
          ],
        },
        {
          id: "plan-financial",
          title: t("financial_settings"),
          icon: DollarSign,
          priority: 2,
          fields: [
            { key: "walletType", required: true },
            { key: "currency", required: true },
            { key: "minAmount", required: true },
            { key: "maxAmount", required: true },
            { key: "profitPercentage", required: true },
          ],
        },
        {
          id: "plan-profit",
          title: tCommon("profit_configuration"),
          icon: TrendingUp,
          priority: 3,
          fields: [
            { key: "minProfit", required: true },
            { key: "maxProfit", required: true },
            { key: "defaultProfit", required: true },
            { key: "defaultResult", required: true, options: [
              { value: "WIN", label: tCommon("win") },
              { value: "LOSS", label: tCommon("loss") },
              { value: "DRAW", label: tCommon("draw") },
            ]},
          ],
        },
        {
          id: "plan-settings",
          title: tCommon("plan_settings"),
          icon: ClipboardList,
          priority: 4,
          fields: [
            { key: "durations", required: true },
            "trending",
            { key: "status", required: true },
          ],
        },
      ],
    },
    edit: {
      title: tCommon("edit_investment_plan"),
      description: t("update_investment_plan_configuration"),
      groups: [
        {
          id: "plan-basic",
          title: t("basic_information"),
          icon: Shield,
          priority: 1,
          fields: [
            { key: "name", required: true },
            { key: "title", required: true },
            "image",
            { key: "description", required: true },
          ],
        },
        {
          id: "plan-financial",
          title: t("financial_settings"),
          icon: DollarSign,
          priority: 2,
          fields: [
            { key: "walletType", required: true },
            { key: "currency", required: true },
            { key: "minAmount", required: true },
            { key: "maxAmount", required: true },
            { key: "profitPercentage", required: true },
          ],
        },
        {
          id: "plan-profit",
          title: tCommon("profit_configuration"),
          icon: TrendingUp,
          priority: 3,
          fields: [
            { key: "minProfit", required: true },
            { key: "maxProfit", required: true },
            { key: "defaultProfit", required: true },
            { key: "defaultResult", required: true, options: [
              { value: "WIN", label: tCommon("win") },
              { value: "LOSS", label: tCommon("loss") },
              { value: "DRAW", label: tCommon("draw") },
            ]},
          ],
        },
        {
          id: "plan-settings",
          title: tCommon("plan_settings"),
          icon: ClipboardList,
          priority: 4,
          fields: [
            { key: "durations", required: true },
            "trending",
            { key: "status", required: true },
          ],
        },
      ],
    },
  };
}
