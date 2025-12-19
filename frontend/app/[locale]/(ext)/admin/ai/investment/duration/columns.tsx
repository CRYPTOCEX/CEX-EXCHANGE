"use client";
import { Shield, ClipboardList, Clock } from "lucide-react";
import type { FormConfig } from "@/components/blocks/data-table/types/table";

import { useTranslations } from "next-intl";
export function useColumns(): ColumnDefinition[] {
  const tCommon = useTranslations("common");
  const tExtAdmin = useTranslations("ext_admin");
  return [
    {
      key: "duration",
      title: tCommon("duration"),
      type: "number",
      icon: Clock,
      sortable: true,
      searchable: false,
      filterable: true,
      description: tExtAdmin("number_of_time_units_for_the"),
      priority: 1,
    },
    {
      key: "timeframe",
      title: tCommon("timeframe"),
      type: "select",
      icon: ClipboardList,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("time_unit_hour_day_week_or"),
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
          variant: (value) => {
            switch (value) {
              case "HOUR":
                return "info";
              case "DAY":
                return "success";
              case "WEEK":
                return "warning";
              case "MONTH":
                return "secondary";
              default:
                return "secondary";
            }
          },
          withDot: false,
        },
      },
    },
    {
      key: "id",
      title: tCommon("id"),
      type: "text",
      icon: Shield,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("unique_system_identifier_for_this_duration"),
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
      title: tCommon("create_new_duration"),
      description: tExtAdmin("set_up_a_new_ai_investment"),
      groups: [
        {
          id: "duration-configuration",
          title: tExtAdmin("duration_configuration"),
          icon: Clock,
          priority: 1,
          fields: [
            {
              key: "duration",
              required: true,
              min: 1,
            },
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
      title: tCommon("edit_duration"),
      description: tExtAdmin("modify_the_ai_investment_duration_settings"),
      groups: [
        {
          id: "duration-configuration",
          title: tExtAdmin("duration_configuration"),
          icon: Clock,
          priority: 1,
          fields: [
            {
              key: "duration",
              required: true,
              min: 1,
            },
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
  };
}
