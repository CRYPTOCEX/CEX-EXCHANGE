"use client";
import { Shield, Clock } from "lucide-react";
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
      description: tDashboardAdmin("unique_identifier"),
      priority: 2,
      expandedOnly: true,
    },
    {
      key: "duration",
      title: tCommon("duration"),
      type: "number",
      icon: Clock,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tDashboardAdmin("duration_value"),
      priority: 1,
    },
    {
      key: "timeframe",
      title: tCommon("timeframe"),
      type: "select",
      icon: Clock,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tDashboardAdmin("time_unit"),
      options: [
        { value: "HOUR", label: tCommon("hour") },
        { value: "DAY", label: tCommon("day") },
        { value: "WEEK", label: tCommon("week") },
        { value: "MONTH", label: tCommon("month") },
      ],
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
      description: t("define_a_new_investment_period_option"),
      groups: [
        {
          id: "duration-info",
          title: tCommon("investment_duration"),
          icon: Clock,
          priority: 1,
          fields: [
            { key: "duration", required: true },
            { key: "timeframe", required: true, options: [
              { value: "HOUR", label: tCommon("hour") },
              { value: "DAY", label: tCommon("day") },
              { value: "WEEK", label: tCommon("week") },
              { value: "MONTH", label: tCommon("month") },
            ]},
          ],
        },
      ],
    },
    edit: {
      title: tCommon("edit_duration"),
      description: t("update_investment_period_option"),
      groups: [
        {
          id: "duration-info",
          title: tCommon("investment_duration"),
          icon: Clock,
          priority: 1,
          fields: [
            { key: "duration", required: true },
            { key: "timeframe", required: true, options: [
              { value: "HOUR", label: tCommon("hour") },
              { value: "DAY", label: tCommon("day") },
              { value: "WEEK", label: tCommon("week") },
              { value: "MONTH", label: tCommon("month") },
            ]},
          ],
        },
      ],
    },
  };
}
