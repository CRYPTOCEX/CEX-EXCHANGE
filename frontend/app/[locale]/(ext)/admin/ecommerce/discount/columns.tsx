"use client";

import { Shield, ClipboardList, CheckSquare, ImageIcon, Tag, Percent, Settings, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
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
      description: tExtAdmin("unique_identifier_for_the_discount_code"),
      priority: 3,
      expandedOnly: true,
    },
    {
      key: "product",
      idKey: "id",
      labelKey: "name",
      title: tExtAdmin("product"),
      baseKey: "productId",
      sortKey: "product.name",
      disablePrefixSort: true,
      type: "select",
      apiEndpoint: {
        url: "/api/admin/ecommerce/product/options",
        method: "GET",
      },
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("product_this_discount_applies_to"),
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
            description: tExtAdmin("product_thumbnail_image"),
          },
          primary: {
            key: "name",
            title: tCommon("name"),
            type: "text",
            sortable: true,
            searchable: true,
            filterable: true,
            description: tExtAdmin("name_of_the_discounted_product"),
          },
          secondary: {
            key: "slug",
            title: tCommon("slug"),
            type: "text",
            sortable: true,
            searchable: true,
            filterable: true,
            description: tExtAdmin("url_friendly_product_identifier"),
          },
        },
      },
    },
    {
      key: "code",
      title: tExtAdmin("code"),
      type: "text",
      icon: Tag,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("promotional_code_customers_enter_at_checkout"),
      priority: 1,
    },
    {
      key: "percentage",
      title: tCommon("percentage"),
      type: "number",
      icon: Percent,
      sortable: true,
      searchable: false,
      filterable: true,
      description: tExtAdmin("discount_percentage_amount_0_100"),
      priority: 1,
    },
    {
      key: "validUntil",
      title: tExtAdmin("valid_until"),
      type: "date",
      icon: CalendarIcon,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("expiration_date_when_the_discount_code"),
      render: { type: "date", format: "PPP" },
      priority: 1,
    },
    {
      key: "status",
      title: tCommon("status"),
      type: "boolean",
      icon: CheckSquare,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("whether_the_discount_code_is_currently_active"),
      priority: 1,
      render: {
        type: "badge",
        config: {
          variant: (value) => (value ? "success" : "secondary"),
        },
      },
    },
  ];
}

export function useFormConfig(): FormConfig {
  const tCommon = useTranslations("common");
  const tExtAdmin = useTranslations("ext_admin");
  const tDashboardAdmin = useTranslations("dashboard_admin");
  return {
    create: {
      title: tExtAdmin("create_new_discount"),
      description: tExtAdmin("add_a_new_promotional_discount_code"),
      groups: [
        {
          id: "basic-info",
          title: tDashboardAdmin("basic_information"),
          icon: Tag,
          priority: 1,
          fields: [
            {
              key: "productId",
              required: true,
              apiEndpoint: {
                url: "/api/admin/ecommerce/product/options",
                method: "GET",
              },
            },
            { key: "code", required: true, maxLength: 191 },
          ],
        },
        {
          id: "discount-details",
          title: tExtAdmin("discount_details"),
          icon: Percent,
          priority: 2,
          fields: [
            { key: "percentage", required: true, min: 0, max: 100 },
            { key: "validUntil", required: true },
          ],
        },
        {
          id: "status",
          title: tCommon("status"),
          icon: Settings,
          priority: 3,
          fields: [{ key: "status" }],
        },
      ],
    },
    edit: {
      title: tExtAdmin("edit_discount"),
      description: tExtAdmin("update_discount_code_details_percentage_rate"),
      groups: [
        {
          id: "basic-info",
          title: tDashboardAdmin("basic_information"),
          icon: Tag,
          priority: 1,
          fields: [
            {
              key: "productId",
              required: true,
              apiEndpoint: {
                url: "/api/admin/ecommerce/product/options",
                method: "GET",
              },
            },
            { key: "code", required: true, maxLength: 191 },
          ],
        },
        {
          id: "discount-details",
          title: tExtAdmin("discount_details"),
          icon: Percent,
          priority: 2,
          fields: [
            { key: "percentage", required: true, min: 0, max: 100 },
            { key: "validUntil", required: true },
          ],
        },
        {
          id: "status",
          title: tCommon("status"),
          icon: Settings,
          priority: 3,
          fields: [{ key: "status" }],
        },
      ],
    },
  };
}
