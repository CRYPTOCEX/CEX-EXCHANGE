"use client";

import React from "react";
import { HandHeart, User, DollarSign, Clock, Calendar, Tag } from "lucide-react";
import type { ColumnDefinition, FormConfig } from "@/components/blocks/data-table/types/table";

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
    description: t("unique_identifier_for_this_nft_purchase_offer"),
    priority: 4,
    expandedOnly: true
  },
  {
    key: "token",
    title: t("nft_token"),
    type: "compound",
    sortable: true,
    searchable: true,
    filterable: true,
    icon: Tag,
    description: t("digital_artwork_or_collectible_that_received"),
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
          description: t("nft_token_image")
        },
        primary: {
          key: "name",
          title: t("token")
        },
        secondary: {
          key: "tokenId",
          title: tExt("token_id")
        },
        metadata: [
          { key: "collection.name", title: tCommon("collection"), type: "text" }
        ]
      }
    }
  },
  {
    key: "status",
    title: tCommon("status"),
    type: "select",
    sortable: true,
    filterable: true,
    description: t("current_offer_state_pending_review_accepted"),
    options: [
      { value: "PENDING", label: tCommon("pending"), color: "warning" },
      { value: "ACCEPTED", label: t("accepted"), color: "success" },
      { value: "REJECTED", label: tCommon("rejected"), color: "destructive" },
      { value: "EXPIRED", label: tCommon("expired"), color: "destructive" },
      { value: "CANCELLED", label: tCommon("cancelled"), color: "destructive" }
    ],
    render: {
      type: "badge",
      config: {
        variant: (value) => {
          const variants = {
            PENDING: "warning",
            ACCEPTED: "success",
            REJECTED: "destructive",
            EXPIRED: "destructive",
            CANCELLED: "destructive"
          };
          return variants[value] || "secondary";
        }
      }
    },
    priority: 1
  },
  {
    key: "offerer",
    title: t("offerer"),
    type: "compound",
    sortable: true,
    searchable: true,
    filterable: true,
    icon: User,
    description: t("buyer_who_submitted_this_purchase_offer"),
    priority: 2,
    sortKey: "offerer.firstName",
    render: {
      type: "compound",
      config: {
        image: {
          key: "avatar",
          fallback: "/img/placeholder.svg",
          type: "image",
          title: tCommon("avatar"),
          description: tCommon("users_profile_picture")
        },
        primary: {
          key: ["firstName", "lastName"],
          title: [tCommon("first_name"), tCommon("last_name")],
          icon: User
        },
        secondary: {
          key: "email",
          title: tCommon("email")
        }
      }
    }
  },
  {
    key: "amount",
    title: tCommon("offer_amount"),
    type: "number",
    sortable: true,
    filterable: true,
    icon: DollarSign,
    description: t("proposed_purchase_price_in_selected_cryptocurrency"),
    priority: 1,
    render: {
      type: "number",
      format: { style: "currency", currency: "USD" }
    }
  },
  {
    key: "currency",
    title: tCommon("currency"),
    type: "select",
    sortable: true,
    filterable: true,
    description: t("cryptocurrency_or_token_used_for_this_offer"),
    options: [
      { value: "ETH", label: "ETH", color: "blue" },
      { value: "USDC", label: "USDC", color: "green" },
      { value: "USDT", label: "USDT", color: "green" },
      { value: "BNB", label: "BNB", color: "yellow" },
      { value: "MATIC", label: "MATIC", color: "purple" }
    ],
    render: {
      type: "badge",
      config: {
        variant: (value) => {
          const variants = {
            ETH: "blue",
            USDC: "green",
            USDT: "green",
            BNB: "yellow",
            MATIC: "purple"
          };
          return variants[value] || "secondary";
        }
      }
    },
    priority: 3,
    expandedOnly: true
  },
  {
    key: "type",
    title: tCommon("type"),
    type: "select",
    sortable: true,
    filterable: true,
    icon: HandHeart,
    description: t("offer_category_standard_offer_auction_bid"),
    options: [
      { value: "OFFER", label: tExt("offer"), color: "default" },
      { value: "BID", label: t("bid"), color: "secondary" },
      { value: "COUNTER_OFFER", label: t("counter_offer"), color: "outline" }
    ],
    render: {
      type: "badge",
      config: {
        variant: (value) => {
          const variants = {
            OFFER: "default",
            BID: "secondary",
            COUNTER_OFFER: "outline"
          };
          return variants[value] || "secondary";
        }
      }
    },
    priority: 2
  },
  {
    key: "expiresAt",
    title: t("expires_at"),
    type: "date",
    sortable: true,
    filterable: true,
    icon: Clock,
    description: t("expiration_date_and_time_when_offer"),
    render: {
      type: "date",
      format: "MMM dd, yyyy HH:mm"
    },
    priority: 3,
    expandedOnly: true
  },
  {
    key: "createdAt",
    title: tCommon("created"),
    type: "date",
    sortable: true,
    filterable: true,
    icon: Calendar,
    description: t("when_this_offer_was_initially_submitted"),
    render: {
      type: "date",
      format: "MMM dd, yyyy"
    },
    priority: 2
  },
  {
    key: "updatedAt",
    title: tCommon("updated"),
    type: "date",
    sortable: true,
    filterable: true,
    icon: Calendar,
    description: t("most_recent_update_to_offer_status_or_details"),
    render: {
      type: "date",
      format: "MMM dd, yyyy"
    },
    priority: 4,
    expandedOnly: true
  }
] as ColumnDefinition[];
}

// Form configuration
export function useFormConfig() {
  const t = useTranslations("ext_admin");
  const tCommon = useTranslations("common");
  return {
    edit: {
      title: tCommon("edit_offer"),
      description: t("modify_offer_amount_currency_status_and"),
      groups: [
        {
          id: "offer-details",
          title: tCommon("offer_details"),
          icon: HandHeart,
          priority: 1,
          fields: [
            { key: "amount", required: true, min: 0 },
            {
              key: "currency",
              required: true,
              maxLength: 10,
              options: [
                { value: "ETH", label: "ETH" },
                { value: "USDC", label: "USDC" },
                { value: "USDT", label: "USDT" },
                { value: "BNB", label: "BNB" },
                { value: "MATIC", label: "MATIC" }
              ]
            },
            {
              key: "type",
              required: false,
              options: [
                { value: "TOKEN", label: t("token") },
                { value: "COLLECTION", label: tCommon("collection") }
              ]
            },
          ]
        },
        {
          id: "offer-status",
          title: t("status_expiration"),
          icon: Clock,
          priority: 2,
          fields: [
            {
              key: "status",
              required: true,
              options: [
                { value: "ACTIVE", label: tCommon("active") },
                { value: "ACCEPTED", label: t("accepted") },
                { value: "REJECTED", label: tCommon("rejected") },
                { value: "EXPIRED", label: tCommon("expired") },
                { value: "CANCELLED", label: tCommon("cancelled") }
              ]
            },
            { key: "expiresAt", required: false },
          ]
        },
      ]
    }
  } as FormConfig;
}
