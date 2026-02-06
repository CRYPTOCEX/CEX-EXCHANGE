"use client";

import React from "react";
import { ShoppingCart, Coins, User, DollarSign, Clock, Eye, Calendar, Gavel, ShoppingBag, Tag, Store } from "lucide-react";
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
    description: t("unique_identifier_for_this_nft_marketplace_listing"),
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
    icon: ShoppingBag,
    description: t("digital_artwork_or_collectible_available_for"),
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
          {
            key: "collection.name",
            title: tCommon("collection"),
            type: "custom",
            render: (value) => {
              if (!value) return null;
              return <span className="text-xs">{value}</span>;
            }
          }
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
    description: t("current_listing_state_active_for_sale"),
    options: [
      { value: "ACTIVE", label: tCommon("active"), color: "success" },
      { value: "SOLD", label: tExt("sold"), color: "success" },
      { value: "CANCELLED", label: tCommon("cancelled"), color: "destructive" },
      { value: "EXPIRED", label: tCommon("expired"), color: "destructive" }
    ],
    render: {
      type: "badge",
      config: {
        variant: (value) => {
          const variants = {
            ACTIVE: "success",
            SOLD: "success",
            CANCELLED: "destructive",
            EXPIRED: "destructive"
          };
          return variants[value] || "secondary";
        }
      }
    },
    priority: 1
  },
  {
    key: "type",
    title: tCommon("type"),
    type: "select",
    sortable: true,
    filterable: true,
    icon: Tag,
    description: t("listing_format_fixed_price_auction_or_bundled_sale"),
    options: [
      { value: "FIXED_PRICE", label: tExt("fixed_price"), color: "blue" },
      { value: "AUCTION", label: tCommon("auction"), color: "purple" },
      { value: "BUNDLE", label: tCommon("bundle"), color: "orange" }
    ],
    render: {
      type: "badge",
      config: {
        variant: (value) => {
          const variants = {
            FIXED_PRICE: "blue",
            AUCTION: "purple",
            BUNDLE: "orange"
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
    description: t("nft_owner_who_created_this_marketplace_listing"),
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
          description: t("sellers_profile_picture")
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
    title: tCommon("price"),
    type: "number",
    sortable: true,
    filterable: true,
    icon: DollarSign,
    description: t("listed_price_in_cryptocurrency_or_fiat"),
    priority: 1,
    render: {
      type: "custom",
      render: (value, row) => {
        if (value === null || value === undefined || isNaN(parseFloat(value))) {
          return <span className="text-muted-foreground">—</span>;
        }
        const amount = parseFloat(value);
        const currency = row.currency || 'USD';
        let formatted;
        if (amount < 0.01) {
          formatted = amount.toFixed(8).replace(/\.?0+$/, '');
        } else {
          formatted = amount.toFixed(4).replace(/\.?0+$/, '');
        }
        return <span className="font-medium">{formatted} {currency}</span>;
      }
    }
  },
  {
    key: "currency",
    title: tCommon("currency"),
    type: "select",
    sortable: true,
    filterable: true,
    description: t("cryptocurrency_accepted_for_this_listing"),
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
    key: "currentBid",
    title: tCommon("current_bid"),
    type: "number",
    sortable: true,
    filterable: true,
    icon: Gavel,
    description: t("highest_current_bid_for_auction_listings"),
    priority: 2,
    render: {
      type: "custom",
      render: (value, row) => {
        if (value === null || value === undefined || isNaN(parseFloat(value))) {
          return <span className="text-muted-foreground">—</span>;
        }
        const amount = parseFloat(value);
        const currency = row.currency || 'USD';
        let formatted;
        if (amount < 0.01) {
          formatted = amount.toFixed(8).replace(/\.?0+$/, '');
        } else {
          formatted = amount.toFixed(4).replace(/\.?0+$/, '');
        }
        return <span>{formatted} {currency}</span>;
      }
    }
  },
  {
    key: "reservePrice",
    title: t("reserve_price"),
    type: "number",
    sortable: true,
    filterable: true,
    description: t("minimum_acceptable_price_for_auction_sales"),
    priority: 4,
    render: {
      type: "custom",
      render: (value, row) => {
        if (value === null || value === undefined || isNaN(parseFloat(value))) {
          return <span className="text-muted-foreground">—</span>;
        }
        const amount = parseFloat(value);
        const currency = row.currency || 'USD';
        let formatted;
        if (amount < 0.01) {
          formatted = amount.toFixed(8).replace(/\.?0+$/, '');
        } else {
          formatted = amount.toFixed(4).replace(/\.?0+$/, '');
        }
        return <span>{formatted} {currency}</span>;
      }
    },
    expandedOnly: true
  },
  {
    key: "buyNowPrice",
    title: t("buy_now_price"),
    type: "number",
    sortable: true,
    filterable: true,
    description: t("optional_instant_purchase_price_to_skip"),
    priority: 4,
    render: {
      type: "custom",
      render: (value, row) => {
        if (value === null || value === undefined || isNaN(parseFloat(value))) {
          return <span className="text-muted-foreground">—</span>;
        }
        const amount = parseFloat(value);
        const currency = row.currency || 'USD';
        let formatted;
        if (amount < 0.01) {
          formatted = amount.toFixed(8).replace(/\.?0+$/, '');
        } else {
          formatted = amount.toFixed(4).replace(/\.?0+$/, '');
        }
        return <span>{formatted} {currency}</span>;
      }
    },
    expandedOnly: true
  },
  {
    key: "endTime",
    title: t("end_time"),
    type: "date",
    sortable: true,
    filterable: true,
    icon: Clock,
    description: t("listing_expiration_or_auction_end_date_and_time"),
    render: {
      type: "date",
      format: "MMM dd, yyyy HH:mm"
    },
    priority: 2
  },
  {
    key: "startTime",
    title: t("start_time"),
    type: "date",
    sortable: true,
    filterable: true,
    icon: Clock,
    description: t("when_listing_becomes_active_or_auction_begins"),
    render: {
      type: "date",
      format: "MMM dd, yyyy HH:mm"
    },
    priority: 3,
    expandedOnly: true
  },
  {
    key: "views",
    title: tExt("views"),
    type: "number",
    sortable: true,
    filterable: true,
    icon: Eye,
    description: t("total_number_of_users_who_viewed_this_listing"),
    priority: 4,
    render: {
      type: "number",
      format: { notation: "compact" }
    },
    expandedOnly: true
  },
  {
    key: "likes",
    title: t("likes"),
    type: "number",
    sortable: true,
    filterable: true,
    description: t("number_of_users_who_favorited_this_listing"),
    priority: 4,
    render: {
      type: "number",
      format: { notation: "compact" }
    },
    expandedOnly: true
  },
  {
    key: "bidCount",
    title: t("bids"),
    type: "number",
    sortable: true,
    filterable: true,
    description: t("total_number_of_bids_placed_on_auction"),
    priority: 4,
    render: {
      type: "number",
      format: { notation: "compact" }
    },
    expandedOnly: true
  },
  {
    key: "createdAt",
    title: t("listed"),
    type: "date",
    sortable: true,
    filterable: true,
    icon: Calendar,
    description: t("when_this_listing_was_created_on_the_marketplace"),
    render: {
      type: "date",
      format: "MMM dd, yyyy"
    },
    priority: 3,
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
      title: t("edit_listing"),
      description: t("modify_marketplace_listing_settings_and_pricing"),
      groups: [
        {
          id: "listing-type",
          title: t("listing_type_status"),
          icon: ShoppingBag,
          priority: 1,
          fields: [
            {
              key: "type",
              required: true,
              options: [
                { value: "FIXED_PRICE", label: tExt("fixed_price") },
                { value: "AUCTION", label: tCommon("auction") },
                { value: "BUNDLE", label: tCommon("bundle") }
              ]
            },
            {
              key: "status",
              required: true,
              options: [
                { value: "ACTIVE", label: tCommon("active") },
                { value: "SOLD", label: tExt("sold") },
                { value: "CANCELLED", label: tCommon("cancelled") },
                { value: "EXPIRED", label: tCommon("expired") }
              ]
            },
          ]
        },
        {
          id: "pricing",
          title: t("pricing_details"),
          icon: DollarSign,
          priority: 2,
          fields: [
            { key: "price", required: false, min: 0 },
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
            { key: "reservePrice", required: false, min: 0 },
            { key: "buyNowPrice", required: false, min: 0 },
          ]
        },
        {
          id: "timing",
          title: t("listing_schedule"),
          icon: Clock,
          priority: 3,
          fields: [
            { key: "startTime", required: false },
            { key: "endTime", required: false },
          ]
        },
      ]
    }
  } as FormConfig;
}
