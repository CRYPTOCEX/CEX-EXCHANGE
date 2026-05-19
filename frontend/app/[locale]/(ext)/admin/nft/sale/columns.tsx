"use client";

import React from "react";
import { ShoppingBag, Package, User, DollarSign, Calendar } from 'lucide-react';
import type { ColumnDefinition } from "@/components/blocks/data-table/types/table";

import { useTranslations } from "next-intl";
export function useColumns() {
  const t = useTranslations("ext_admin");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  return [
  {
    key: "id",
    title: t("sale_id"),
    type: "text",
    sortable: true,
    searchable: true,
    filterable: true,
    icon: ShoppingBag,
    description: t("unique_identifier_for_this_completed_nft"),
    priority: 4,
    expandedOnly: true,
  },
  {
    key: "token",
    title: t("nft"),
    type: "compound",
    sortable: true,
    searchable: true,
    filterable: true,
    icon: Package,
    description: t("digital_artwork_or_collectible_that_was_sold"),
    priority: 1,
    sortKey: "token.name",
    render: {
      type: "compound",
      config: {
        image: {
          key: "image",
          fallback: "/img/placeholder.svg",
          type: "image",
          title: t("token_image"),
          description: t("nft_token_image"),
        },
        primary: {
          key: "name",
          title: tCommon("name"),
        },
        secondary: {
          key: "tokenId",
          title: tExt("token_id"),
        },
        metadata: [
          { key: "collection.name", title: tCommon("collection"), type: "text" }
        ]
      }
    }
  },
  {
    key: "price",
    title: t("sale_price"),
    type: "number",
    sortable: true,
    searchable: false,
    filterable: true,
    icon: DollarSign,
    description: t("final_transaction_price_paid_for_this_nft"),
    priority: 1,
    render: {
      type: "number",
      format: { style: "currency", currency: "USD" }
    }
  },
  {
    key: "status",
    title: tCommon("status"),
    type: "select",
    sortable: true,
    filterable: true,
    description: t("transaction_status_completed_pending_failed_or"),
    options: [
      { value: "PENDING", label: tCommon("pending"), color: "warning" },
      { value: "COMPLETED", label: tCommon("completed"), color: "success" },
      { value: "FAILED", label: tCommon("failed"), color: "destructive" },
      { value: "CANCELLED", label: tCommon("cancelled"), color: "secondary" }
    ],
    render: {
      type: "badge",
      config: {
        variant: (value: string) => value === "COMPLETED" ? "success" :
                           value === "PENDING" ? "warning" :
                           value === "FAILED" ? "destructive" : "secondary"
      }
    },
    priority: 1,
  },
  {
    key: "seller",
    title: tCommon("seller"),
    type: "compound",
    sortable: true,
    searchable: true,
    filterable: true,
    icon: User,
    description: t("previous_nft_owner_who_sold_the_asset"),
    priority: 2,
    sortKey: "seller.firstName",
    render: {
      type: "compound",
      config: {
        image: {
          key: "avatar",
          fallback: "/img/placeholder.svg",
          type: "image",
          title: tCommon("avatar"),
          description: t("sellers_profile_picture"),
        },
        primary: {
          key: ["firstName", "lastName"],
          title: [tCommon("first_name"), tCommon("last_name")],
          icon: User,
        },
        secondary: {
          key: "email",
          title: tCommon("email"),
        }
      }
    }
  },
  {
    key: "buyer",
    title: tExt("buyer"),
    type: "compound",
    sortable: true,
    searchable: true,
    filterable: true,
    icon: User,
    description: t("new_nft_owner_who_purchased_the_asset"),
    priority: 2,
    sortKey: "buyer.firstName",
    render: {
      type: "compound",
      config: {
        image: {
          key: "avatar",
          fallback: "/img/placeholder.svg",
          type: "image",
          title: tCommon("avatar"),
          description: t("buyers_profile_picture"),
        },
        primary: {
          key: ["firstName", "lastName"],
          title: [tCommon("first_name"), tCommon("last_name")],
          icon: User,
        },
        secondary: {
          key: "email",
          title: tCommon("email"),
        }
      }
    }
  },
  {
    key: "createdAt",
    title: t("sale_date"),
    type: "date",
    sortable: true,
    filterable: true,
    icon: Calendar,
    description: t("date_and_time_when_this_sale_was_completed"),
    render: {
      type: "date",
      format: "MMM dd, yyyy HH:mm"
    },
    priority: 2,
  }
] as ColumnDefinition[];
}

// Form configuration - no create/edit forms needed (view-only)
