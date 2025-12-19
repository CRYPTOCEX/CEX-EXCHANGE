"use client";

import { Shield, Image as ImageIcon, CheckSquare, Tag, Settings } from "lucide-react";
import type { FormConfig } from "@/components/blocks/data-table/types/table";

import { useTranslations } from "next-intl";
export function useColumns(): ColumnDefinition[] {
  const tCommon = useTranslations("common");
  const tExtAdmin = useTranslations("ext_admin");
  return [
    {
      key: "id",
      title: tCommon("id"),
      type: "text",
      icon: Shield,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("unique_identifier_for_the_product_category"),
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
      description: tExtAdmin("category_thumbnail_image"),
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
      description: tCommon("display_name_of_the_category"),
      priority: 3,
      expandedOnly: true,
    },
    {
      key: "slug",
      title: tCommon("slug"),
      type: "text",
      icon: Tag,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("url_friendly_identifier_for_the_category"),
      priority: 3,
      expandedOnly: true,
    },
    {
      key: "category",
      title: tCommon("category"),
      disablePrefixSort: true,
      type: "compound",
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("category_name_image_and_url_slug"),
      priority: 1,
      render: {
        type: "compound",
        config: {
          image: {
            key: "image",
            title: tCommon("image"),
            type: "image",
            fallback: "/img/placeholder.svg",
            icon: ImageIcon,
            sortable: false,
            searchable: false,
            filterable: false,
            description: tExtAdmin("category_thumbnail_image"),
          },
          primary: {
            key: "name",
            title: tCommon("name"),
            type: "text",
            sortable: true,
            searchable: true,
            filterable: true,
            description: tCommon("display_name_of_the_category"),
          },
          secondary: {
            key: "slug",
            title: tCommon("slug"),
            type: "text",
            sortable: true,
            searchable: true,
            filterable: true,
            description: tExtAdmin("url_friendly_identifier_for_the_category"),
          },
        },
      },
    },
    {
      key: "status",
      title: tCommon("status"),
      type: "toggle",
      icon: CheckSquare,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("whether_the_category_is_active_and"),
      priority: 1,
      render: {
        type: "badge",
        config: {
          variant: (value) => (value ? "success" : "secondary"),
          labels: {
            true: "Active",
            false: "Inactive",
          },
        },
      },
    },
    {
      key: "description",
      title: tCommon("description"),
      type: "textarea",
      sortable: false,
      searchable: true,
      filterable: false,
      description: tExtAdmin("brief_description_of_what_products_belong"),
      priority: 2,
      expandedOnly: true,
    },
  ];
}

export function useFormConfig(): FormConfig {
  const tCommon = useTranslations("common");
  const tExtAdmin = useTranslations("ext_admin");
  const tDashboardAdmin = useTranslations("dashboard_admin");
  return {
    create: {
      title: tCommon("create_new_category"),
      description: tExtAdmin("add_a_new_product_category_to"),
      groups: [
        {
          id: "basic-info",
          title: tDashboardAdmin("basic_information"),
          icon: Tag,
          priority: 1,
          fields: [
            { key: "name", required: true, maxLength: 191 },
            { key: "slug", required: true, maxLength: 191 },
            { key: "image", required: false, maxLength: 191 },
            { key: "description", required: true, maxLength: 191 },
          ],
        },
        {
          id: "status",
          title: tCommon("status"),
          icon: Settings,
          priority: 2,
          fields: [{ key: "status" }],
        },
      ],
    },
    edit: {
      title: tCommon("edit_category"),
      description: tExtAdmin("update_category_information_image_and_visibility"),
      groups: [
        {
          id: "basic-info",
          title: tDashboardAdmin("basic_information"),
          icon: Tag,
          priority: 1,
          fields: [
            { key: "name", required: true, maxLength: 191 },
            { key: "slug", required: true, maxLength: 191 },
            { key: "image", required: false, maxLength: 191 },
            { key: "description", required: true, maxLength: 191 },
          ],
        },
        {
          id: "status",
          title: tCommon("status"),
          icon: Settings,
          priority: 2,
          fields: [{ key: "status" }],
        },
      ],
    },
  };
}
