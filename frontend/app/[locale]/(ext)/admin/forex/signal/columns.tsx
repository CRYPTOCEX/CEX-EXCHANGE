"use client";
import {
  Shield,
  ClipboardList,
  Image as ImageIcon,
  CheckSquare,
  CalendarIcon,
  FileText,
  TrendingUp,
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
      key: "title",
      title: tCommon("title"),
      type: "text",
      icon: ClipboardList,
      sortable: true,
      searchable: true,
      filterable: true,
      description: t("signal_name_or_description_e_g"),
      priority: 1,
    },
    {
      key: "image",
      title: tCommon("image"),
      type: "image",
      icon: ImageIcon,
      sortable: false,
      searchable: false,
      filterable: false,
      description: t("chart_screenshot_or_visual_representation_of"),
      priority: 1,
      render: { type: "image", size: "lg" },
    },
    {
      key: "status",
      title: tCommon("status"),
      type: "boolean",
      icon: CheckSquare,
      sortable: true,
      searchable: true,
      filterable: true,
      description: t("signal_availability_active_signals_are_visible"),
      priority: 1,
    },
    {
      key: "createdAt",
      title: tCommon("created_at"),
      type: "date",
      icon: CalendarIcon,
      sortable: true,
      searchable: true,
      filterable: true,
      description: t("date_and_time_when_the_trading"),
      render: { type: "date", format: "PPP" },
      priority: 2,
      expandedOnly: true,
    },
  ] as ColumnDefinition[];
}

export function useFormConfig() {
  const t = useTranslations("ext_admin");
  return {
    create: {
      title: t("create_new_trading_signal"),
      description: t("publish_a_new_forex_trading_signal"),
      groups: [
        {
          id: "signal-details",
          title: t("signal_details"),
          icon: TrendingUp,
          priority: 1,
          fields: [
            { key: "image", fallback: "/img/placeholder.svg", required: true, maxLength: 191 },
            { key: "title", required: true, maxLength: 191 },
          ],
        },
        {
          id: "signal-settings",
          title: t("signal_settings"),
          icon: CheckSquare,
          priority: 2,
          fields: [{ key: "status" }],
        },
      ],
    },
    edit: {
      title: t("edit_trading_signal"),
      description: t("update_trading_signal_details_chart_image"),
      groups: [
        {
          id: "signal-details",
          title: t("signal_details"),
          icon: TrendingUp,
          priority: 1,
          fields: [
            { key: "image", fallback: "/img/placeholder.svg", required: true, maxLength: 191 },
            { key: "title", required: true, maxLength: 191 },
          ],
        },
        {
          id: "signal-settings",
          title: t("signal_settings"),
          icon: CheckSquare,
          priority: 2,
          fields: [{ key: "status" }],
        },
      ],
    },
  } as FormConfig;
}
