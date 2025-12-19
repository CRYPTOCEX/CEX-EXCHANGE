"use client";
import { CheckSquare, CalendarIcon, FileText, Tag, Link2 } from "lucide-react";
import { format } from "date-fns";
import type { FormConfig } from "@/components/blocks/data-table/types/table";

import { useTranslations } from "next-intl";
export function useColumns() {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  return [
    {
      key: "id",
      title: tCommon("id"),
      type: "text",
      sortable: true,
      searchable: true,
      filterable: true,
      description: t("unique_identifier_for_the_announcement"),
      priority: 2,
      expandedOnly: true,
    },
    {
      key: "title",
      title: tCommon("title"),
      type: "text",
      sortable: true,
      searchable: true,
      filterable: true,
      description: t("announcement_title"),
      priority: 1,
    },
    {
      key: "type",
      title: tCommon("type"),
      type: "select",
      options: [
        { value: "GENERAL", label: tCommon("general") },
        { value: "EVENT", label: t("event") },
        { value: "UPDATE", label: tCommon("update") },
      ],
      sortable: true,
      filterable: true,
      description: t("announcement_type"),
      priority: 1,
      render: {
        type: "badge",
        config: {
          withDot: false,
          variant: (value: string) => {
            switch (value) {
              case "GENERAL":
                return "primary";
              case "EVENT":
                return "success";
              case "UPDATE":
                return "warning";
              default:
                return "primary";
            }
          },
        },
      },
    },
    {
      key: "message",
      title: tCommon("message"),
      type: "editor",
      filterable: false,
      sortable: false,
      expandedOnly: true,
      description: tCommon("announcement_message"),
      priority: 3,
    },
    {
      key: "link",
      title: t("link"),
      type: "text",
      searchable: true,
      filterable: true,
      description: t("related_link_for_the_announcement"),
      priority: 3,
    },
    {
      key: "status",
      title: tCommon("status"),
      type: "boolean",
      icon: CheckSquare,
      sortable: true,
      filterable: true,
      description: t("active_status_of_the_announcement"),
      priority: 2,
      render: {
        type: "badge",
        config: {
          withDot: true,
          variant: (value: boolean) => (value ? "success" : "secondary"),
          labels: {
            true: "Active",
            false: "Inactive",
          },
        },
      },
    },
    {
      key: "createdAt",
      title: tCommon("created_at"),
      type: "date",
      icon: CalendarIcon,
      sortable: true,
      searchable: true,
      filterable: true,
      description: t("announcement_creation_date"),
      render: {
        type: "date",
        format: "PPP",
      },
      priority: 4,
    },
  ] as ColumnDefinition[];
}

export function useFormConfig(): FormConfig {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  return {
    create: {
      title: t("create_new_announcement"),
      description: t("publish_a_new_system_announcement_for_users"),
      groups: [
        {
          id: "basic-info",
          title: t("basic_information"),
          icon: FileText,
          priority: 1,
          fields: [
            { key: "title", required: true },
            {
              key: "type",
              required: true,
              options: [
                { value: "GENERAL", label: tCommon("general") },
                { value: "EVENT", label: t("event") },
                { value: "UPDATE", label: tCommon("update") },
              ],
            },
          ],
        },
        {
          id: "content",
          title: tCommon("content"),
          icon: FileText,
          priority: 2,
          fields: [
            { key: "message", required: true },
            { key: "link" },
          ],
        },
        {
          id: "settings",
          title: tCommon("settings"),
          icon: CheckSquare,
          priority: 3,
          fields: [
            { key: "status" },
          ],
        },
      ],
    },
    edit: {
      title: t("edit_announcement"),
      description: t("update_system_announcement_details"),
      groups: [
        {
          id: "basic-info",
          title: t("basic_information"),
          icon: FileText,
          priority: 1,
          fields: [
            { key: "title", required: true },
            {
              key: "type",
              required: true,
              options: [
                { value: "GENERAL", label: tCommon("general") },
                { value: "EVENT", label: t("event") },
                { value: "UPDATE", label: tCommon("update") },
              ],
            },
          ],
        },
        {
          id: "content",
          title: tCommon("content"),
          icon: FileText,
          priority: 2,
          fields: [
            { key: "message", required: true },
            { key: "link" },
          ],
        },
        {
          id: "settings",
          title: tCommon("settings"),
          icon: CheckSquare,
          priority: 3,
          fields: [
            { key: "status" },
          ],
        },
      ],
    },
  };
}
