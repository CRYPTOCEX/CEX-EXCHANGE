"use client";

import {
  Shield,
  ClipboardList,
  CheckSquare,
  User,
  ImageIcon,
  Star,
  Tag,
  Settings,
} from "lucide-react";
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
      description: tExtAdmin("unique_identifier_for_the_product_review"),
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
      description: tExtAdmin("product_being_reviewed"),
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
            description: tExtAdmin("name_of_the_reviewed_product"),
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
      key: "user",
      title: tCommon("user"),
      type: "compound",
      expandedTitle: (row) => `User: ${row.id}`,
      icon: User,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("customer_who_submitted_the_review"),
      priority: 1,
      render: {
        type: "compound",
        config: {
          image: {
            key: "avatar",
            fallback: "/img/placeholder.svg",
            type: "image",
            title: tCommon("avatar"),
            description: tExtAdmin("customers_profile_picture"),
            filterable: false,
            sortable: false,
          },
          primary: {
            key: ["firstName", "lastName"],
            title: [tCommon("first_name"), tCommon("last_name")],
            icon: User,
          },
          secondary: {
            key: "email",
            title: tCommon("email"),
          },
        },
      },
    },
    {
      key: "rating",
      title: tCommon("rating"),
      type: "rating",
      icon: Star,
      sortable: true,
      searchable: false,
      filterable: true,
      description: tExtAdmin("star_rating_from_1_poor_to_5_excellent"),
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
      description: tExtAdmin("whether_the_review_is_approved_and"),
      priority: 1,
      render: {
        type: "badge",
        config: {
          variant: (value) => (value ? "success" : "warning"),
          labels: {
            true: "Approved",
            false: "Pending",
          },
        },
      },
    },
    {
      key: "comment",
      title: tExtAdmin("comment"),
      type: "text",
      icon: ClipboardList,
      sortable: false,
      searchable: true,
      filterable: false,
      description: tExtAdmin("customers_written_review_and_feedback"),
      priority: 2,
      expandedOnly: true,
    },
  ];
}

export function useFormConfig(): FormConfig {
  const tCommon = useTranslations("common");
  const tExtAdmin = useTranslations("ext_admin");
  return {
    create: {
      title: tExtAdmin("create_new_review"),
      description: tExtAdmin("add_a_new_product_review_with"),
      groups: [
        {
          id: "review-info",
          title: tExtAdmin("review_information"),
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
            { key: "comment", required: true },
          ],
        },
        {
          id: "rating",
          title: tCommon("rating"),
          icon: Star,
          priority: 2,
          fields: [{ key: "rating", required: true, min: 1, max: 5 }],
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
      title: tExtAdmin("edit_review"),
      description: tExtAdmin("update_review_content_rating_and_approval_status"),
      groups: [
        {
          id: "review-info",
          title: tExtAdmin("review_information"),
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
            { key: "comment", required: true },
          ],
        },
        {
          id: "rating",
          title: tCommon("rating"),
          icon: Star,
          priority: 2,
          fields: [{ key: "rating", required: true, min: 1, max: 5 }],
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
