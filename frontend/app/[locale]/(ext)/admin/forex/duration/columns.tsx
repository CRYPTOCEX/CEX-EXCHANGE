"use client";
import { Shield, Clock, Calendar } from "lucide-react";
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
      description: t("unique_system_identifier_for_this_investment"),
      priority: 3,
      expandedOnly: true,
    },
    {
      key: "duration",
      title: tCommon("duration"),
      type: "number",
      icon: Clock,
      sortable: true,
      searchable: false,
      filterable: true,
      description: t("numeric_value_representing_the_length_of"),
      priority: 1,
    },
    {
      key: "timeframe",
      title: tCommon("timeframe"),
      type: "select",
      icon: Calendar,
      sortable: true,
      searchable: true,
      filterable: true,
      description: t("time_unit_for_the_duration_hourly"),
      options: [
        { value: "HOUR", label: tCommon("hour") },
        { value: "DAY", label: tCommon("day") },
        { value: "WEEK", label: tCommon("week") },
        { value: "MONTH", label: tCommon("month") },
      ],
      priority: 1,
      render: {
        type: "badge",
        config: {
          variant: (value: any) => {
            switch (value) {
              case "HOUR":
                return "secondary";
              case "DAY":
                return "primary";
              case "WEEK":
                return "success";
              case "MONTH":
                return "warning";
              default:
                return "secondary";
            }
          },
        },
      },
    },
  ] as ColumnDefinition[];
}

export function useFormConfig() {
  const t = useTranslations("ext_admin");
  const tCommon = useTranslations("common");
  return {
    create: {
      title: t("create_new_investment_duration"),
      description: t("define_a_new_time_period_option"),
      groups: [
        {
          id: "investment-duration",
          title: tCommon("investment_duration"),
          icon: Clock,
          priority: 1,
          fields: [
            { key: "duration", required: true, min: 1 },
            {
              key: "timeframe",
              required: true,
              options: [
                { value: "HOUR", label: tCommon("hour") },
                { value: "DAY", label: tCommon("day") },
                { value: "WEEK", label: tCommon("week") },
                { value: "MONTH", label: tCommon("month") },
              ],
            },
          ],
        },
      ],
    },
    edit: {
      title: t("edit_investment_duration"),
      description: t("modify_the_duration_settings_and_timeframe"),
      groups: [
        {
          id: "investment-duration",
          title: tCommon("investment_duration"),
          icon: Clock,
          priority: 1,
          fields: [
            { key: "duration", required: true, min: 1 },
            {
              key: "timeframe",
              required: true,
              options: [
                { value: "HOUR", label: tCommon("hour") },
                { value: "DAY", label: tCommon("day") },
                { value: "WEEK", label: tCommon("week") },
                { value: "MONTH", label: tCommon("month") },
              ],
            },
          ],
        },
      ],
    },
  } as FormConfig;
}
