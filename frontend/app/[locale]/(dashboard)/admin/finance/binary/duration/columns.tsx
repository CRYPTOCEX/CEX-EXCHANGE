"use client";
import { Shield, Clock, Percent, CheckSquare } from "lucide-react";
import type { FormConfig } from "@/components/blocks/data-table/types/table";

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
      description: tDashboardAdmin("unique_identifier_for_the_binary_duration"),
      priority: 2,
      expandedOnly: true,
    },
    {
      key: "duration",
      title: tDashboardAdmin("duration_minutes"),
      type: "number",
      icon: Clock,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tDashboardAdmin("duration_in_minutes_for_binary_option_expiry"),
      priority: 1,
    },
    {
      key: "profitPercentage",
      title: tDashboardAdmin("profit_percentage"),
      type: "number",
      icon: Percent,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tDashboardAdmin("profit_percentage_offered_for_this_duration"),
      priority: 1,
    },
    {
      key: "status",
      title: tCommon("status"),
      type: "boolean",
      icon: CheckSquare,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tDashboardAdmin("whether_this_duration_is_active_and"),
      priority: 1,
    },
  ];
}

export function useFormConfig(): FormConfig {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  return {
    create: {
      title: tCommon("create_new_duration"),
      description: t("set_up_a_new_binary_options"),
      groups: [
        {
          id: "binary-duration-info",
          title: t("binary_duration_information"),
          icon: Clock,
          priority: 1,
          fields: [
            {
              key: "duration",
              required: true,
              min: 1
            },
            {
              key: "profitPercentage",
              required: true,
              min: 0
            },
            { key: "status", required: true },
          ],
        },
      ],
    },
    edit: {
      title: tCommon("edit_duration"),
      description: t("update_binary_options_trading_duration_settings"),
      groups: [
        {
          id: "binary-duration-info",
          title: t("binary_duration_information"),
          icon: Clock,
          priority: 1,
          fields: [
            {
              key: "duration",
              required: true,
              min: 1
            },
            {
              key: "profitPercentage",
              required: true,
              min: 0
            },
            { key: "status", required: true },
          ],
        },
      ],
    },
  };
}
