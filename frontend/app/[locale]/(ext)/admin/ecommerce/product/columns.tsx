"use client";

import {
  Shield,
  ClipboardList,
  Image as ImageIcon,
  CheckSquare,
  DollarSign,
  Tag,
  Package,
  Wallet,
  Settings,
} from "lucide-react";
import type { FormConfig } from "@/components/blocks/data-table/types/table";

import { useTranslations } from "next-intl";
export function useColumns(): ColumnDefinition[] {
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
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
      description: tExtAdmin("unique_identifier_for_the_product"),
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
      description: tExtAdmin("product_thumbnail_image"),
      priority: 3,
      expandedOnly: true,
    },
    {
      key: "name",
      title: tCommon("name"),
      type: "text",
      icon: Package,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("display_name_of_the_product"),
      priority: 3,
      expandedOnly: true,
    },
    {
      key: "slug",
      title: tCommon("slug"),
      type: "text",
      icon: Package,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("url_friendly_product_identifier"),
      priority: 3,
      expandedOnly: true,
    },
    {
      key: "product",
      title: tExtAdmin("product"),
      disablePrefixSort: true,
      type: "compound",
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("product_name_image_and_url_slug"),
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
            description: tExtAdmin("display_name_of_the_product"),
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
      key: "status",
      title: tCommon("status"),
      type: "toggle",
      icon: CheckSquare,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("whether_the_product_is_active_and"),
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
      key: "price",
      title: tCommon("price"),
      type: "number",
      icon: DollarSign,
      sortable: true,
      searchable: false,
      filterable: true,
      description: tExtAdmin("product_selling_price_in_the_selected_currency"),
      priority: 1,
    },
    {
      key: "category",
      title: tCommon("category"),
      sortKey: "category.name",
      type: "text",
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("product_category_classification"),
      priority: 2,
      render: {
        type: "custom",
        render(data) {
          return data?.name;
        },
      },
    },
    {
      key: "categoryId",
      title: tCommon("category"),
      type: "select",
      sortable: false,
      searchable: false,
      filterable: false,
      description: tExtAdmin("category_this_product_belongs_to"),
      apiEndpoint: {
        url: "/api/admin/ecommerce/category/options",
        method: "GET",
      },
      priority: 2,
    },
    {
      key: "type",
      title: tCommon("type"),
      type: "select",
      icon: Package,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("whether_the_product_is_downloadable_or"),
      options: [
        { value: "DOWNLOADABLE", label: tExtAdmin("downloadable") },
        { value: "PHYSICAL", label: tExtAdmin("physical") },
      ],
      priority: 2,
      render: {
        type: "badge",
        config: {
          variant: (value) => {
            switch (value) {
              case "DOWNLOADABLE":
                return "primary";
              case "PHYSICAL":
                return "success";
              default:
                return "secondary";
            }
          },
        },
      },
    },
    {
      key: "inventoryQuantity",
      title: tExt("stock"),
      type: "number",
      icon: Package,
      sortable: true,
      searchable: false,
      filterable: true,
      description: tExtAdmin("current_inventory_quantity_available_for_sale"),
      priority: 2,
      render: {
        type: "badge",
        config: {
          variant: (value) => {
            if (value === 0) return "destructive";
            if (value < 10) return "warning";
            return "success";
          },
        },
      },
    },
    {
      key: "walletType",
      title: tCommon("wallet_type"),
      type: "select",
      icon: Wallet,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("type_of_wallet_used_for_payment"),
      apiEndpoint: {
        url: "/api/admin/finance/wallet/options",
        method: "GET",
      },
      priority: 3,
      expandedOnly: true,
      render: {
        type: "badge",
        config: {
          variant: (value) => {
            switch (value) {
              case "FIAT":
                return "primary";
              case "SPOT":
                return "success";
              case "ECO":
                return "warning";
              default:
                return "secondary";
            }
          },
          withDot: false,
        },
      },
    },
    {
      key: "currency",
      title: tCommon("currency"),
      type: "select",
      icon: DollarSign,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("currency_used_for_pricing_this_product"),
      priority: 3,
      expandedOnly: true,
      dynamicSelect: {
        refreshOn: "walletType",
        endpointBuilder: (walletTypeValue: string | undefined) =>
          walletTypeValue
            ? {
                url: `/api/admin/finance/currency/options?type=${walletTypeValue}`,
                method: "GET",
              }
            : null,
        disableWhenEmpty: true,
      },
    },
    {
      key: "description",
      title: tCommon("description"),
      type: "textarea",
      icon: ClipboardList,
      sortable: false,
      searchable: true,
      filterable: false,
      description: tExtAdmin("detailed_product_description_with_features_and"),
      priority: 3,
      expandedOnly: true,
    },
    {
      key: "shortDescription",
      title: tExtAdmin("short_desc"),
      type: "text",
      icon: ClipboardList,
      sortable: false,
      searchable: true,
      filterable: false,
      description: tExtAdmin("brief_product_summary_displayed_in_listings"),
      priority: 3,
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
      title: tExtAdmin("create_new_product"),
      description: tExtAdmin("add_a_new_product_to_your"),
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
            {
              key: "categoryId",
              required: true,
              apiEndpoint: {
                url: "/api/admin/ecommerce/category/options",
                method: "GET",
              },
            },
          ],
        },
        {
          id: "descriptions",
          title: tExtAdmin("descriptions"),
          icon: ClipboardList,
          priority: 2,
          fields: [
            { key: "shortDescription", required: false, maxLength: 191 },
            { key: "description", required: true },
          ],
        },
        {
          id: "product-type",
          title: tExtAdmin("product_type"),
          icon: Package,
          priority: 3,
          fields: [
            {
              key: "type",
              required: true,
              options: [
                { value: "DOWNLOADABLE", label: tExtAdmin("downloadable") },
                { value: "PHYSICAL", label: tExtAdmin("physical") },
              ],
            },
          ],
        },
        {
          id: "pricing",
          title: tExtAdmin("pricing_currency"),
          icon: DollarSign,
          priority: 4,
          fields: [
            {
              key: "walletType",
              required: true,
              apiEndpoint: {
                url: "/api/admin/finance/wallet/options",
                method: "GET",
              },
            },
            { key: "currency", required: true, maxLength: 191 },
            { key: "price", required: true, min: 0 },
          ],
        },
        {
          id: "inventory",
          title: tExtAdmin("inventory"),
          icon: Package,
          priority: 5,
          fields: [{ key: "inventoryQuantity", required: true, min: 0 }],
        },
        {
          id: "status",
          title: tCommon("status"),
          icon: Settings,
          priority: 6,
          fields: [{ key: "status" }],
        },
      ],
    },
    edit: {
      title: tExtAdmin("edit_product"),
      description: tExtAdmin("update_product_information_pricing_inventory_level"),
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
            {
              key: "categoryId",
              required: true,
              apiEndpoint: {
                url: "/api/admin/ecommerce/category/options",
                method: "GET",
              },
            },
          ],
        },
        {
          id: "descriptions",
          title: tExtAdmin("descriptions"),
          icon: ClipboardList,
          priority: 2,
          fields: [
            { key: "shortDescription", required: false, maxLength: 191 },
            { key: "description", required: true },
          ],
        },
        {
          id: "product-type",
          title: tExtAdmin("product_type"),
          icon: Package,
          priority: 3,
          fields: [
            {
              key: "type",
              required: true,
              options: [
                { value: "DOWNLOADABLE", label: tExtAdmin("downloadable") },
                { value: "PHYSICAL", label: tExtAdmin("physical") },
              ],
            },
          ],
        },
        {
          id: "pricing",
          title: tExtAdmin("pricing_currency"),
          icon: DollarSign,
          priority: 4,
          fields: [
            {
              key: "walletType",
              required: true,
              apiEndpoint: {
                url: "/api/admin/finance/wallet/options",
                method: "GET",
              },
            },
            { key: "currency", required: true, maxLength: 191 },
            { key: "price", required: true, min: 0 },
          ],
        },
        {
          id: "inventory",
          title: tExtAdmin("inventory"),
          icon: Package,
          priority: 5,
          fields: [{ key: "inventoryQuantity", required: true, min: 0 }],
        },
        {
          id: "status",
          title: tCommon("status"),
          icon: Settings,
          priority: 6,
          fields: [{ key: "status" }],
        },
      ],
    },
  };
}
