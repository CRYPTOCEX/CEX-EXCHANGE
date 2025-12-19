"use client";

import React from "react";
import { Gavel, Tag, DollarSign, Clock, Calendar, TrendingUp, User } from "lucide-react";
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
    description: t("unique_identifier_for_this_nft_auction_listing"),
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
    description: t("digital_artwork_or_collectible_being_auctioned"),
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
    icon: Gavel,
    description: t("current_auction_state_active_bids_completed"),
    options: [
      { value: "ACTIVE", label: tCommon("active"), color: "success" },
      { value: "ENDED", label: tExt("ended"), color: "secondary" },
      { value: "CANCELLED", label: tCommon("cancelled"), color: "destructive" },
      { value: "PENDING", label: tCommon("pending"), color: "warning" }
    ],
    render: {
      type: "badge",
      config: {
        variant: (value) => {
          const variants = {
            ACTIVE: "success",
            ENDED: "secondary",
            CANCELLED: "destructive",
            PENDING: "warning"
          };
          return variants[value] || "secondary";
        }
      }
    },
    priority: 1
  },
  {
    key: "seller",
    title: tCommon("seller"),
    type: "compound",
    sortable: true,
    searchable: true,
    filterable: true,
    icon: User,
    description: t("nft_owner_who_initiated_this_auction"),
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
    key: "price",
    title: t("starting_price"),
    type: "number",
    sortable: true,
    filterable: true,
    icon: DollarSign,
    description: t("initial_minimum_bid_amount_to_start_the_auction"),
    priority: 1,
    render: {
      type: "number",
      format: { style: "currency", currency: "USD" }
    }
  },
  {
    key: "reservePrice",
    title: t("reserve_price"),
    type: "number",
    sortable: true,
    filterable: true,
    icon: TrendingUp,
    description: t("minimum_acceptable_sale_price_auction_wont"),
    priority: 3,
    render: {
      type: "number",
      format: { style: "currency", currency: "USD" }
    },
    expandedOnly: true
  },
  {
    key: "buyNowPrice",
    title: t("buy_now_price"),
    type: "number",
    sortable: true,
    filterable: true,
    icon: DollarSign,
    description: t("optional_instant_purchase_price_to_skip"),
    priority: 3,
    render: {
      type: "number",
      format: { style: "currency", currency: "USD" }
    },
    expandedOnly: true
  },
  {
    key: "endTime",
    title: t("ends_at"),
    type: "date",
    sortable: true,
    filterable: true,
    icon: Clock,
    description: t("auction_closing_date_and_time_when_bidding_stops"),
    render: {
      type: "date",
      format: "MMM dd, yyyy HH:mm"
    },
    priority: 2
  },
  {
    key: "startTime",
    title: t("starts_at"),
    type: "date",
    sortable: true,
    filterable: true,
    icon: Clock,
    description: t("auction_opening_date_and_time_when_bidding_begins"),
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
    description: t("when_this_auction_listing_was_first_created"),
    render: {
      type: "date",
      format: "MMM dd, yyyy"
    },
    priority: 3,
    expandedOnly: true
  },
  {
    key: "updatedAt",
    title: tCommon("updated"),
    type: "date",
    sortable: true,
    filterable: true,
    icon: Calendar,
    description: t("most_recent_modification_date_for_auction_details"),
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
  const tExt = useTranslations("ext");
  return {
    edit: {
      title: t("edit_auction"),
      description: t("modify_auction_settings_including_status_pricing"),
      groups: [
        {
          id: "nft-details",
          title: t("nft_auction_details"),
          icon: Gavel,
          priority: 1,
          fields: [
            {
              key: "status",
              required: true,
              options: [
                { value: "ACTIVE", label: tCommon("active") },
                { value: "ENDED", label: tExt("ended") },
                { value: "CANCELLED", label: tCommon("cancelled") },
                { value: "PENDING", label: tCommon("pending") }
              ]
            },
          ]
        },
        {
          id: "pricing",
          title: t("pricing_bidding"),
          icon: DollarSign,
          priority: 2,
          fields: [
            { key: "price", required: true, min: 0 },
            { key: "reservePrice", required: true, min: 0 },
            { key: "buyNowPrice", min: 0 },
          ]
        },
        {
          id: "timing",
          title: t("auction_schedule"),
          icon: Clock,
          priority: 3,
          fields: [
            { key: "startTime" },
            { key: "endTime", required: true },
          ]
        },
      ]
    }
  } as FormConfig;
}
