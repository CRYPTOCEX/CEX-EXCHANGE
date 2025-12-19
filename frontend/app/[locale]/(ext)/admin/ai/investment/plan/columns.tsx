"use client";
import {
  Shield,
  ClipboardList,
  Image as ImageIcon,
  CheckSquare,
  DollarSign,
  CalendarIcon,
  Sparkles,
  TrendingUp,
  Settings,
  Clock,
  Percent,
} from "lucide-react";
import type { FormConfig } from "@/components/blocks/data-table/types/table";

import { useTranslations } from "next-intl";
export function useColumns(): ColumnDefinition[] {
  const tCommon = useTranslations("common");
  const tExtAdmin = useTranslations("ext_admin");
  return [
    {
      key: "image",
      title: tCommon("image"),
      type: "image",
      icon: ImageIcon,
      sortable: false,
      searchable: false,
      filterable: false,
      description: tExtAdmin("plan_image_url"),
      priority: 3,
      expandedOnly: true,
    },
    {
      key: "name",
      title: tCommon("name"),
      type: "text",
      icon: Sparkles,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("internal_plan_name"),
      priority: 3,
      expandedOnly: true,
    },
    {
      key: "plan",
      title: tCommon("plan"),
      type: "compound",
      expandedTitle: (row) => `Plan: ${row.name}`,
      disablePrefixSort: true,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("ai_investment_plan_with_name_and_image"),
      render: {
        type: "compound",
        config: {
          image: {
            key: "image",
            fallback: "/img/placeholder.svg",
            type: "image",
            title: tCommon("image"),
            description: tExtAdmin("plan_image_url"),
            filterable: false,
            sortable: false,
          },
          primary: {
            key: "name",
            title: tCommon("name"),
          },
        },
      },
      priority: 1,
    },
    {
      key: "title",
      title: tCommon("title"),
      type: "text",
      icon: ClipboardList,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("public_facing_title_displayed_to_users"),
      priority: 1,
    },
    {
      key: "profitPercentage",
      title: tCommon("profit"),
      type: "number",
      icon: Percent,
      sortable: true,
      searchable: false,
      filterable: true,
      description: tExtAdmin("expected_profit_percentage_for_this_investment"),
      priority: 1,
    },
    {
      key: "status",
      title: tCommon("status"),
      type: "toggle",
      icon: CheckSquare,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("plan_availability_status_active_or_inactive"),
      priority: 1,
    },
    {
      key: "durations",
      title: tCommon("durations"),
      type: "multiselect",
      icon: Clock,
      sortable: false,
      searchable: false,
      filterable: false,
      description: tExtAdmin("available_investment_duration_options_for_this"),
      priority: 2,
      apiEndpoint: {
        url: "/api/admin/ai/investment/duration/options",
        method: "GET",
      },
      render: {
        type: "custom",
        render: (value: any, row: any) => {
          if (!value || !Array.isArray(value) || value.length === 0)
            return "None";
          const tags = value.map((d: any) => `${d.duration} ${d.timeframe}`);
          return (
            <div className="flex flex-wrap gap-1">
              {tags.map((tag: string, index: number) => (
                <span
                  key={index}
                  className="rounded bg-purple-100 px-2 py-1 text-xs font-medium text-purple-800"
                >
                  {tag}
                </span>
              ))}
            </div>
          );
        },
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
      description: tExtAdmin(
        "minimum_investment_amount_required_to_participate"
      ),
      priority: 2,
      expandedOnly: true,
    },
    {
      key: "maxAmount",
      title: tCommon("max_amount"),
      type: "number",
      icon: DollarSign,
      sortable: true,
      searchable: false,
      filterable: true,
      description: tExtAdmin(
        "maximum_investment_amount_allowed_per_transaction"
      ),
      priority: 2,
      expandedOnly: true,
    },
    {
      key: "invested",
      title: tCommon("invested"),
      type: "number",
      icon: DollarSign,
      sortable: true,
      searchable: false,
      filterable: true,
      description: tExtAdmin("total_amount_currently_invested_in_this_plan"),
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
      description: tExtAdmin("minimum_profit_value_that_can_be_generated"),
      priority: 3,
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
      description: tExtAdmin("maximum_profit_value_that_can_be_generated"),
      priority: 3,
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
      description: tExtAdmin("default_profit_value_used_for_new_investments"),
      priority: 3,
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
      description: tExtAdmin("default_outcome_assigned_to_new_investments"),
      options: [
        { value: "WIN", label: tCommon("win") },
        { value: "LOSS", label: tCommon("loss") },
        { value: "DRAW", label: tCommon("draw") },
      ],
      priority: 3,
      expandedOnly: true,
      render: {
        type: "badge",
        config: {
          variant: (value) => {
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
      description: tExtAdmin(
        "whether_this_plan_is_marked_as_trending_or_popular"
      ),
      priority: 3,
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
      description: tExtAdmin("detailed_description_of_the_investment_plan"),
      priority: 3,
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
      description: tExtAdmin("date_when_this_investment_plan_was_created"),
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
  const tDashboardAdmin = useTranslations("dashboard_admin");
  const tExtAdmin = useTranslations("ext_admin");
  return {
    create: {
      title: tExtAdmin("create_new_investment_plan"),
      description: tExtAdmin("set_up_a_new_ai_investment"),
      groups: [
        {
          id: "basic-information",
          title: tDashboardAdmin("basic_information"),
          icon: Sparkles,
          priority: 1,
          fields: [
            { key: "name", required: true, maxLength: 191 },
            { key: "image", required: false, maxLength: 1000 },
            { key: "title", required: true, maxLength: 191 },
            { key: "description", required: false },
          ],
        },
        {
          id: "investment-limits",
          title: tExtAdmin("investment_limits"),
          icon: DollarSign,
          priority: 2,
          fields: [
            { key: "invested", required: true, min: 0 },
            { key: "minAmount", required: true, min: 0 },
            { key: "maxAmount", required: true, min: 0 },
          ],
        },
        {
          id: "profit-configuration",
          title: tCommon("profit_configuration"),
          icon: TrendingUp,
          priority: 3,
          fields: [
            { key: "profitPercentage", required: true, min: 0 },
            { key: "minProfit", required: true },
            { key: "maxProfit", required: true },
            { key: "defaultProfit", required: true },
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
          title: tExtAdmin("duration_options"),
          icon: Clock,
          priority: 4,
          fields: [
            {
              key: "durations",
              required: true,
              apiEndpoint: {
                url: "/api/admin/ai/investment/duration/options",
                method: "GET",
              },
            },
          ],
        },
        {
          id: "plan-settings",
          title: tCommon("plan_settings"),
          icon: Settings,
          priority: 5,
          fields: [
            { key: "trending", required: false },
            { key: "status", required: true },
          ],
        },
      ],
    },
    edit: {
      title: tCommon("edit_investment_plan"),
      description: tExtAdmin("modify_ai_investment_plan_settings_profit"),
      groups: [
        {
          id: "basic-information",
          title: tDashboardAdmin("basic_information"),
          icon: Sparkles,
          priority: 1,
          fields: [
            { key: "name", required: true, maxLength: 191 },
            { key: "image", required: false, maxLength: 1000 },
            { key: "title", required: true, maxLength: 191 },
            { key: "description", required: false },
          ],
        },
        {
          id: "investment-limits",
          title: tExtAdmin("investment_limits"),
          icon: DollarSign,
          priority: 2,
          fields: [
            { key: "invested", required: true, min: 0 },
            { key: "minAmount", required: true, min: 0 },
            { key: "maxAmount", required: true, min: 0 },
          ],
        },
        {
          id: "profit-configuration",
          title: tCommon("profit_configuration"),
          icon: TrendingUp,
          priority: 3,
          fields: [
            { key: "profitPercentage", required: true, min: 0 },
            { key: "minProfit", required: true },
            { key: "maxProfit", required: true },
            { key: "defaultProfit", required: true },
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
          title: tExtAdmin("duration_options"),
          icon: Clock,
          priority: 4,
          fields: [
            {
              key: "durations",
              required: true,
              apiEndpoint: {
                url: "/api/admin/ai/investment/duration/options",
                method: "GET",
              },
            },
          ],
        },
        {
          id: "plan-settings",
          title: tCommon("plan_settings"),
          icon: Settings,
          priority: 5,
          fields: [
            { key: "trending", required: false },
            { key: "status", required: true },
          ],
        },
      ],
    },
  };
}
