"use client";

import {
  Shield,
  ClipboardList,
  Image as ImageIcon,
  CalendarIcon,
  FolderTree,
  FileText,
} from "lucide-react";
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
      description: t("unique_system_identifier_for_the_blog_category"),
      priority: 3,
      expandedOnly: true,
    },
    {
      key: "image",
      title: tCommon("image"),
      type: "image",
      icon: ImageIcon,
      sortable: false,
      searchable: false,
      filterable: false,
      description: t("category_featured_image"),
      priority: 3,
      expandedOnly: true,
    },
    {
      key: "name",
      title: tCommon("name"),
      type: "text",
      icon: FolderTree,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tCommon("display_name_of_the_category"),
      priority: 3,
      expandedOnly: true,
    },
    {
      key: "compound",
      title: tCommon("category"),
      type: "compound",
      disablePrefixSort: true,
      sortable: true,
      searchable: true,
      filterable: true,
      priority: 1,
      icon: FolderTree,
      description: t("category_information_with_image_and_name"),
      render: {
        type: "compound",
        config: {
          image: {
            key: "image",
            fallback: "/img/placeholder.svg",
            type: "image",
            title: tCommon("image"),
            description: t("category_featured_image"),
            filterable: false,
            sortable: false,
          },
          primary: {
            key: "name",
            title: tCommon("name"),
            type: "text",
            sortable: true,
            searchable: true,
            filterable: true,
            description: tCommon("display_name_of_the_category"),
            priority: 1,
          },
        },
      },
    },
    {
      key: "slug",
      title: tCommon("slug"),
      type: "text",
      icon: ClipboardList,
      sortable: true,
      searchable: true,
      filterable: true,
      description: t("url_friendly_slug_for_the_category_used_in_urls"),
      priority: 2,
    },
    {
      key: "description",
      title: tCommon("description"),
      type: "text",
      icon: ClipboardList,
      sortable: false,
      searchable: true,
      filterable: false,
      description: t("detailed_description_of_the_blog_category"),
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
      description: t("date_when_the_category_was_created"),
      render: { type: "date", format: "PPP" },
      priority: 3,
    },
  ] as ColumnDefinition[];
}

// Form configuration - defines create/edit form structure
export function useFormConfig() {
  const t = useTranslations("blog_admin");
  const tCommon = useTranslations("common");
  return {
    create: {
      title: tCommon("create_new_category"),
      description: t("add_a_new_blog_category_to_organize_your_content"),
      groups: [
        {
          id: "category-basic",
          title: tCommon("category_information"),
          icon: FolderTree,
          priority: 1,
          fields: [
            { key: "image", required: false },
            { key: "name", required: true, maxLength: 255 },
            { key: "slug", required: true, maxLength: 255 },
            { key: "description", required: false },
          ],
        },
      ],
    },
    edit: {
      title: tCommon("edit_category"),
      description: t("update_category_details_and_organization_settings"),
      groups: [
        {
          id: "category-basic",
          title: tCommon("category_information"),
          icon: FolderTree,
          priority: 1,
          fields: [
            { key: "image", required: false },
            { key: "name", required: true, maxLength: 255 },
            { key: "slug", required: true, maxLength: 255 },
            { key: "description", required: false },
          ],
        },
      ],
    },
  } as FormConfig;
}
