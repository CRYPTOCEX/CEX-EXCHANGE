"use client";
import {
  CheckSquare,
  FileText,
  Mail,
  Smartphone,
  Bell,
  Code,
} from "lucide-react";
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
      description: t("unique_identifier_for_the_notification_template"),
      priority: 2,
      expandedOnly: true,
    },
    {
      key: "name",
      title: tCommon("name"),
      type: "text",
      sortable: true,
      searchable: true,
      filterable: true,
      description: tCommon("template_name"),
      priority: 1,
    },
    {
      key: "subject",
      title: tCommon("subject"),
      type: "text",
      sortable: true,
      searchable: true,
      filterable: true,
      description: t("notification_subject"),
      priority: 1,
    },
    {
      key: "email",
      title: tCommon("email"),
      type: "boolean",
      icon: CheckSquare,
      sortable: true,
      filterable: true,
      description: t("email_notification_enabled"),
      priority: 2,
    },
    {
      key: "sms",
      title: t("sms"),
      type: "boolean",
      icon: CheckSquare,
      sortable: true,
      filterable: true,
      description: t("sms_notification_enabled"),
      priority: 2,
    },
    {
      key: "push",
      title: t("push"),
      type: "boolean",
      icon: CheckSquare,
      sortable: true,
      filterable: true,
      description: t("push_notification_enabled"),
      priority: 2,
    },
    {
      key: "shortCodes",
      title: t("short_codes"),
      type: "text",
      sortable: false,
      searchable: true,
      filterable: true,
      expandedOnly: true,
      description: t("available_short_codes_for_the_template"),
      priority: 3,
    },
    {
      key: "emailBody",
      title: t("email_body"),
      type: "textarea",
      filterable: false,
      sortable: false,
      expandedOnly: true,
      description: t("content_for_email_notifications"),
      priority: 4,
      render: (value: string) => (
        <div dangerouslySetInnerHTML={{ __html: value }} />
      ),
    },
    {
      key: "smsBody",
      title: t("sms_body"),
      type: "textarea",
      filterable: false,
      sortable: false,
      expandedOnly: true,
      description: t("content_for_sms_notifications"),
      priority: 4,
    },
    {
      key: "pushBody",
      title: t("push_body"),
      type: "textarea",
      filterable: false,
      sortable: false,
      expandedOnly: true,
      description: t("content_for_push_notifications"),
      priority: 4,
    },
  ] as ColumnDefinition[];
}

export function useFormConfig(): FormConfig {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  return {
    edit: {
      title: t("edit_notification_template"),
      description: t("update_notification_message_template_configuration"),
      groups: [
        {
          id: "channels",
          title: t("notification_channels"),
          icon: Bell,
          priority: 2,
          fields: [{ key: "email" }, { key: "sms" }, { key: "push" }],
        },
        {
          id: "email-content",
          title: tCommon("email_content"),
          icon: Mail,
          priority: 3,
          fields: [{ key: "emailBody" }],
        },
        {
          id: "sms-content",
          title: t("sms_content"),
          icon: Smartphone,
          priority: 4,
          fields: [{ key: "smsBody" }],
        },
        {
          id: "push-content",
          title: t("push_notification_content"),
          icon: Bell,
          priority: 5,
          fields: [{ key: "pushBody" }],
        },
      ],
    },
  };
}
