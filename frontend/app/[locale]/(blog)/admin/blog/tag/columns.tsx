"use client";

import { Shield, ClipboardList, CalendarIcon, Tag, Hash } from "lucide-react";
import type { FormConfig } from "@/components/blocks/data-table/types/table";

import { useTranslations } from "next-intl";
// Column definitions for table display only
export function useColumns() {
  const t = useTranslations("blog_admin");
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
      description: t("unique_system_identifier_for_the_blog_tag"),
      priority: 3,
      expandedOnly: true,
    },
    {
      key: "name",
      title: tCommon("name"),
      type: "text",
      icon: Tag,
      sortable: true,
      searchable: true,
      filterable: true,
      description: t("display_name_of_the_tag"),
      priority: 1,
    },
    {
      key: "slug",
      title: tCommon("slug"),
      type: "text",
      icon: ClipboardList,
      sortable: true,
      searchable: true,
      filterable: true,
      description: t("url_friendly_slug_for_the_tag_used_in_urls"),
      priority: 2,
    },
    {
      key: "createdAt",
      title: tCommon("created_at"),
      type: "date",
      icon: CalendarIcon,
      sortable: true,
      searchable: true,
      filterable: true,
      description: t("date_when_the_tag_was_created"),
      render: { type: "date", format: "PPP" },
      priority: 3,
    },
  ] as ColumnDefinition[];
}

// Form configuration - defines create/edit form structure
export function useFormConfig() {
  const t = useTranslations("blog_admin");
  return {
    create: {
      title: t("create_new_tag"),
      description: t("add_a_new_tag_to_categorize"),
      groups: [
        {
          id: "tag-basic",
          title: t("tag_information"),
          icon: Tag,
          priority: 1,
          fields: [
            { key: "name", required: true, maxLength: 255 },
            { key: "slug", required: true, maxLength: 255 },
          ],
        },
      ],
    },
    edit: {
      title: t("edit_tag"),
      description: t("update_tag_name_and_slug_information"),
      groups: [
        {
          id: "tag-basic",
          title: t("tag_information"),
          icon: Tag,
          priority: 1,
          fields: [
            { key: "name", required: true, maxLength: 255 },
            { key: "slug", required: true, maxLength: 255 },
          ],
        },
      ],
    },
  } as FormConfig;
}
