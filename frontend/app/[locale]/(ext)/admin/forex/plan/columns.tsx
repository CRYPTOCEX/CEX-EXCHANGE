"use client";
import { Shield, ClipboardList, DollarSign, Image as ImageIcon, Wallet, TrendingUp, Settings, Clock } from "lucide-react";
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
      key: "image",
      title: tCommon("image"),
      type: "image",
      icon: ImageIcon,
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
    // Compound column for image and title
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
      description: t("plan_display_name_and_featured_image"),
      render: {
        type: "compound",
        config: {
          image: {
            key: "image",
            fallback: "/img/placeholder.svg",
            type: "image",
            title: tCommon("image"),
            description: tCommon("plan_image"),
            filterable: false,
            sortable: false,
          },
          primary: {
            key: "title",
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
      description: t("internal_system_name_for_the_plan"),
      priority: 1,
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
      description: t("wallet_type_for_deposits_and_withdrawals"),
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
      description: t("trading_currency_for_investments_usd_eur_btc_etc"),
      priority: 1,
      dynamicSelect: {
        refreshOn: "walletType",
        endpointBuilder: (walletTypeValue: string | undefined) =>
          walletTypeValue
            ? {
                url: `/api/admin/finance/currency/options?type=${walletTypeValue}`,
                method: "GET",
              }
            : null,
        disableWhenEmpty: true,
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
      description: t("minimum_investment_amount_required_to_participate"),
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
      description: t("maximum_investment_amount_allowed_per_transaction"),
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
      description: t("expected_profit_percentage_return_on_investment"),
      priority: 1,
    },
    {
      key: "trending",
      title: tCommon("trending"),
      type: "boolean",
      icon: TrendingUp,
      sortable: true,
      searchable: true,
      filterable: true,
      description: t("mark_as_trending_to_feature_this"),
      priority: 1,
      render: {
        type: "badge",
        config: {
          variant: (value: boolean) => (value ? "info" : "secondary"),
          labels: {
            true: "Trending",
            false: "Not Trending",
          },
        },
      },
    },
    {
      key: "status",
      title: tCommon("status"),
      type: "boolean",
      icon: Settings,
      sortable: true,
      searchable: true,
      filterable: true,
      description: t("plan_availability_active_plans_accept_new"),
      priority: 1,
      render: {
        type: "badge",
        config: {
          variant: (value: boolean) => (value ? "success" : "secondary"),
          labels: {
            true: "Active",
            false: "Inactive",
          },
        },
      },
    },
    {
      key: "description",
      title: tCommon("description"),
      type: "text",
      icon: ClipboardList,
      sortable: false,
      searchable: true,
      filterable: false,
      description: t("detailed_explanation_of_plan_features_strategy"),
      priority: 3,
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
      description: t("minimum_profit_amount_that_can_be"),
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
      description: t("maximum_profit_amount_that_can_be"),
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
      description: t("standard_profit_amount_applied_when_auto"),
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
      description: t("default_trading_outcome_when_auto_completing"),
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
      key: "durations",
      title: tCommon("durations"),
      type: "multiselect",
      icon: Clock,
      sortable: false,
      searchable: false,
      filterable: false,
      description: t("available_investment_duration_options_e_g"),
      priority: 2,
      expandedOnly: true,
      apiEndpoint: {
        url: "/api/admin/forex/duration/options",
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
      description: t("date_and_time_when_the_plan"),
      render: { type: "date", format: "PPP" },
      priority: 3,
      expandedOnly: true,
    },
  ] as ColumnDefinition[];
}

export function useFormConfig() {
  const t = useTranslations("ext_admin");
  const tCommon = useTranslations("common");
  return {
    create: {
      title: t("create_new_forex_plan"),
      description: t("design_a_new_forex_investment_plan"),
      groups: [
        {
          id: "plan-identity",
          title: t("plan_identity"),
          icon: ClipboardList,
          priority: 1,
          fields: [
            { key: "image", fallback: "/img/placeholder.svg", required: false, maxLength: 191 },
            { key: "title", required: false, maxLength: 191 },
            { key: "name", required: true, maxLength: 191 },
            { key: "description", required: false, maxLength: 191 },
          ],
        },
        {
          id: "wallet-currency",
          title: t("wallet_currency"),
          icon: Wallet,
          priority: 2,
          fields: [
            {
              key: "walletType",
              required: true,
              maxLength: 191,
              apiEndpoint: {
                url: "/api/admin/finance/wallet/options",
                method: "GET",
              },
            },
            {
              key: "currency",
              required: true,
              maxLength: 191,
              dynamicSelect: {
                refreshOn: "walletType",
                endpointBuilder: (walletTypeValue: string | undefined) =>
                  walletTypeValue
                    ? {
                        url: `/api/admin/finance/currency/options?type=${walletTypeValue}`,
                        method: "GET",
                      }
                    : null,
                disableWhenEmpty: true,
              },
            },
          ],
        },
        {
          id: "investment-limits",
          title: t("investment_limits"),
          icon: DollarSign,
          priority: 3,
          fields: [
            { key: "minAmount", required: false, min: 0 },
            { key: "maxAmount", required: false, min: 0 },
          ],
        },
        {
          id: "profit-configuration",
          title: tCommon("profit_configuration"),
          icon: TrendingUp,
          priority: 4,
          fields: [
            { key: "profitPercentage", required: true, min: 0 },
            { key: "minProfit", required: true, min: 0 },
            { key: "maxProfit", required: true, min: 0 },
            { key: "defaultProfit", required: true, min: 0 },
            {
              key: "defaultResult",
              required: true,
              options: [
                { value: "WIN", label: tCommon("win") },
                { value: "LOSS", label: tCommon("loss") },
                { value: "DRAW", label: tCommon("draw") },
              ],
            },
          ],
        },
        {
          id: "duration-options",
          title: t("duration_options"),
          icon: Clock,
          priority: 5,
          fields: [
            {
              key: "durations",
              required: true,
              apiEndpoint: {
                url: "/api/admin/forex/duration/options",
                method: "GET",
              },
            },
          ],
        },
        {
          id: "plan-settings",
          title: tCommon("plan_settings"),
          icon: Settings,
          priority: 6,
          fields: [
            { key: "trending" },
            { key: "status" },
          ],
        },
      ],
    },
    edit: {
      title: t("edit_forex_plan"),
      description: t("modify_forex_plan_settings_including_profit"),
      groups: [
        {
          id: "plan-identity",
          title: t("plan_identity"),
          icon: ClipboardList,
          priority: 1,
          fields: [
            { key: "image", fallback: "/img/placeholder.svg", required: false, maxLength: 191 },
            { key: "title", required: false, maxLength: 191 },
            { key: "name", required: true, maxLength: 191 },
            { key: "description", required: false, maxLength: 191 },
          ],
        },
        {
          id: "wallet-currency",
          title: t("wallet_currency"),
          icon: Wallet,
          priority: 2,
          fields: [
            {
              key: "walletType",
              required: true,
              maxLength: 191,
              apiEndpoint: {
                url: "/api/admin/finance/wallet/options",
                method: "GET",
              },
            },
            {
              key: "currency",
              required: true,
              maxLength: 191,
              dynamicSelect: {
                refreshOn: "walletType",
                endpointBuilder: (walletTypeValue: string | undefined) =>
                  walletTypeValue
                    ? {
                        url: `/api/admin/finance/currency/options?type=${walletTypeValue}`,
                        method: "GET",
                      }
                    : null,
                disableWhenEmpty: true,
              },
            },
          ],
        },
        {
          id: "investment-limits",
          title: t("investment_limits"),
          icon: DollarSign,
          priority: 3,
          fields: [
            { key: "minAmount", required: false, min: 0 },
            { key: "maxAmount", required: false, min: 0 },
          ],
        },
        {
          id: "profit-configuration",
          title: tCommon("profit_configuration"),
          icon: TrendingUp,
          priority: 4,
          fields: [
            { key: "profitPercentage", required: true, min: 0 },
            { key: "minProfit", required: true, min: 0 },
            { key: "maxProfit", required: true, min: 0 },
            { key: "defaultProfit", required: true, min: 0 },
            {
              key: "defaultResult",
              required: true,
              options: [
                { value: "WIN", label: tCommon("win") },
                { value: "LOSS", label: tCommon("loss") },
                { value: "DRAW", label: tCommon("draw") },
              ],
            },
          ],
        },
        {
          id: "duration-options",
          title: t("duration_options"),
          icon: Clock,
          priority: 5,
          fields: [
            {
              key: "durations",
              required: true,
              apiEndpoint: {
                url: "/api/admin/forex/duration/options",
                method: "GET",
              },
            },
          ],
        },
        {
          id: "plan-settings",
          title: tCommon("plan_settings"),
          icon: Settings,
          priority: 6,
          fields: [
            { key: "trending" },
            { key: "status" },
          ],
        },
      ],
    },
  } as FormConfig;
}
