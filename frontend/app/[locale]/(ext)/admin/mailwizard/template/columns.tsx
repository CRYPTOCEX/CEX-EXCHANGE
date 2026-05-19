"use client";

import { Shield, ClipboardList, FileText, CalendarIcon, Code, Palette } from "lucide-react";
import type { FormConfig } from "@/components/blocks/data-table/types/table";

import { useTranslations } from "next-intl";
export function useColumns(): ColumnDefinition[] {
  const tCommon = useTranslations("common");
  const tExtAdmin = useTranslations("ext_admin");
  return [
    {
      key: "name",
      title: tCommon("name"),
      type: "text",
      icon: ClipboardList,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("template_name_used_to_identify_this"),
      priority: 1,
    },
    {
      key: "content",
      title: tCommon("content"),
      type: "textarea",
      icon: Code,
      sortable: false,
      searchable: true,
      filterable: false,
      description: tExtAdmin("email_template_html_or_text_content"),
      priority: 2,
      expandedOnly: true,
    },
    {
      key: "design",
      title: tExtAdmin("design"),
      type: "textarea",
      icon: Palette,
      sortable: false,
      searchable: true,
      filterable: false,
      description: tExtAdmin("email_builder_design_configuration_stored_as"),
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
      description: tExtAdmin("date_and_time_when_this_email_template_was_created"),
      render: { type: "date", format: "PPP" },
      priority: 2,
    },
    {
      key: "id",
      title: tCommon("id"),
      type: "text",
      icon: Shield,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("unique_template_identifier_for_system_reference"),
      priority: 4,
      expandedOnly: true,
    },
  ];
}

export function useFormConfig(): FormConfig {
  const tCommon = useTranslations("common");
  const tExtAdmin = useTranslations("ext_admin");
  return {
    create: {
      title: tCommon("create_new_template"),
      description: tExtAdmin("design_a_new_email_template_with"),
      groups: [
        {
          id: "template-basics",
          title: tExtAdmin("template_basics"),
          icon: ClipboardList,
          priority: 1,
          fields: [
            { key: "name", required: true, maxLength: 191 },
          ],
        },
        {
          id: "email-content",
          title: tCommon("email_content"),
          icon: Code,
          priority: 2,
          fields: [
            { key: "content", required: true },
          ],
        },
        {
          id: "design-settings",
          title: tExtAdmin("design_settings"),
          icon: Palette,
          priority: 3,
          fields: [
            { key: "design", required: true },
          ],
        },
      ],
    },
    edit: {
      title: tExtAdmin("edit_template"),
      description: tExtAdmin("update_template_name_modify_html_content"),
      groups: [
        {
          id: "template-basics",
          title: tExtAdmin("template_basics"),
          icon: ClipboardList,
          priority: 1,
          fields: [
            { key: "name", required: true, maxLength: 191 },
          ],
        },
        {
          id: "email-content",
          title: tCommon("email_content"),
          icon: Code,
          priority: 2,
          fields: [
            { key: "content", required: true },
          ],
        },
        {
          id: "design-settings",
          title: tExtAdmin("design_settings"),
          icon: Palette,
          priority: 3,
          fields: [
            { key: "design", required: true },
          ],
        },
      ],
    },
  };
}
