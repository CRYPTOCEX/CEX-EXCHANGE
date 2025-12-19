"use client";

import React from "react";
import { Tag, FileText, Calendar, Image as ImageIcon } from "lucide-react";
import type { FormConfig } from "@/components/blocks/data-table/types/table";

import { useTranslations } from "next-intl";
export function useColumns() {
  const t = useTranslations("ext_admin");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  return [
    {
      key: "id",
      title: tCommon("id"),
      type: "text",
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExt("unique_identifier_for_this_nft_category"),
      priority: 4,
      expandedOnly: true,
    },
    {
      key: "name",
      title: tExt("category_name"),
      type: "text",
      sortable: true,
      searchable: true,
      filterable: true,
      icon: Tag,
      description: t("display_name_shown_for_this_nft"),
      priority: 1,
    },
    {
      key: "slug",
      title: tCommon("slug"),
      type: "text",
      sortable: true,
      searchable: true,
      filterable: true,
      description: t("url_friendly_identifier_used_in_marketplace"),
      priority: 2,
    },
    {
      key: "status",
      title: tCommon("status"),
      type: "boolean",
      sortable: true,
      filterable: true,
      description: t("category_visibility_active_categories_appear_in"),
      render: {
        type: "custom",
        render: (value) => {
          const isActive = value === true || value === 1 || value === "true" || value === "1";
          return (
            <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${
              isActive
                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                : "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
            }`}>
              {isActive ? "Active" : "Inactive"}
            </span>
          );
        }
      },
      priority: 1,
    },
    {
      key: "description",
      title: tCommon("description"),
      type: "textarea",
      sortable: false,
      searchable: true,
      filterable: false,
      icon: FileText,
      description: t("category_description_explaining_what_types_of"),
      priority: 3,
      expandedOnly: true,
    },
    {
      key: "image",
      title: tCommon("image"),
      type: "image",
      sortable: false,
      searchable: false,
      filterable: false,
      icon: ImageIcon,
      description: t("category_banner_or_icon_image_displayed"),
      priority: 3,
      render: {
        type: "image",
        fallback: "/img/placeholder.svg"
      },
      expandedOnly: true,
    },
    {
      key: "createdAt",
      title: tCommon("created"),
      type: "date",
      sortable: true,
      filterable: true,
      icon: Calendar,
      description: tExt("when_this_category_was_added_to_the_marketplace"),
      render: {
        type: "date",
        format: "MMM dd, yyyy"
      },
      priority: 3,
      expandedOnly: true,
    },
    {
      key: "updatedAt",
      title: tCommon("updated"),
      type: "date",
      sortable: true,
      filterable: true,
      icon: Calendar,
      description: tExt("most_recent_modification_date_for_category_details"),
      render: {
        type: "date",
        format: "MMM dd, yyyy"
      },
      priority: 4,
      expandedOnly: true,
    }
  ];
}

export function useFormConfig(): FormConfig {
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  const tExtAdmin = useTranslations("ext_admin");
  return {
    create: {
      title: tCommon("create_new_category"),
      description: tExtAdmin("add_a_new_nft_category_to"),
      groups: [
        {
          id: "category-details",
          title: tCommon("category_information"),
          icon: Tag,
          priority: 1,
          fields: [
            { key: "name", required: true, minLength: 1, maxLength: 255 },
            { key: "slug", required: true, maxLength: 255 },
            { key: "description", required: false },
            { key: "status", required: true },
          ],
        },
        {
          id: "category-media",
          title: tExt("category_media"),
          icon: ImageIcon,
          priority: 2,
          fields: [
            { key: "image", required: false, maxLength: 1000 },
          ],
        },
      ],
    },
    edit: {
      title: tCommon("edit_category"),
      description: tExtAdmin("modify_nft_category_settings_visibility_and"),
      groups: [
        {
          id: "category-details",
          title: tCommon("category_information"),
          icon: Tag,
          priority: 1,
          fields: [
            { key: "name", required: true, minLength: 1, maxLength: 255 },
            { key: "slug", required: true, maxLength: 255 },
            { key: "description", required: false },
            { key: "status", required: true },
          ],
        },
        {
          id: "category-media",
          title: tExt("category_media"),
          icon: ImageIcon,
          priority: 2,
          fields: [
            { key: "image", required: false, maxLength: 1000 },
          ],
        },
      ],
    },
  };
}
