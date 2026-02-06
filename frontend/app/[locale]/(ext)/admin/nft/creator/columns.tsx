"use client";

import React from "react";
import { Users, Shield, Package, DollarSign, TrendingUp, Eye, User } from "lucide-react";
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
      type: "string",
      sortable: true,
      filterable: false,
      description: tExt("unique_identifier_for_this_nft_creator_profile"),
      priority: 4,
      render: {
        type: "id"
      },
      expandedOnly: true
    },
    {
      key: "user",
      title: tExt("creator"),
      type: "compound",
      sortable: true,
      searchable: true,
      filterable: true,
      icon: User,
      description: t("nft_artist_or_creator_account_with"),
      priority: 1,
      sortKey: "user.firstName",
      render: {
        type: "compound",
        config: {
          image: {
            key: "avatar",
            fallback: "/img/placeholder.svg",
            type: "image",
            title: tCommon("avatar"),
            description: tExt("creators_profile_picture")
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
      key: "displayName",
      title: tExt("display_name"),
      type: "string",
      sortable: true,
      filterable: true,
      icon: Users,
      description: t("public_artist_name_shown_on_nft"),
      priority: 2,
      render: {
        type: "text"
      }
    },
    {
      key: "isVerified",
      title: tCommon("verified"),
      type: "boolean",
      sortable: true,
      filterable: true,
      icon: Shield,
      description: t("platform_verification_badge_confirms_authentic_cre"),
      priority: 1,
      render: {
        type: "badge",
        config: {
          true: { label: tCommon("verified"), variant: "success", icon: "CheckCircle" },
          false: { label: tExt("unverified"), variant: "secondary", icon: "XCircle" }
        }
      }
    },
    {
      key: "verificationTier",
      title: tExt("tier"),
      type: "enum",
      sortable: true,
      filterable: true,
      icon: Shield,
      description: t("creator_reputation_level_based_on_sales"),
      priority: 3,
      render: {
        type: "badge",
        config: {
          BRONZE: { label: tExt("bronze"), variant: "secondary", icon: "Award" },
          SILVER: { label: tExt("silver"), variant: "default", icon: "Award" },
          GOLD: { label: tExt("gold"), variant: "default", icon: "Award" },
          PLATINUM: { label: tExt("platinum"), variant: "default", icon: "Crown" }
        }
      },
      expandedOnly: true
    },
    {
      key: "totalItems",
      title: tExt("nfts"),
      type: "number",
      sortable: true,
      filterable: true,
      icon: Package,
      description: t("total_number_of_nfts_created_and"),
      priority: 1,
      render: {
        type: "number",
        format: { notation: "compact" }
      }
    },
    {
      key: "totalSales",
      title: tExt("sales"),
      type: "number",
      sortable: true,
      filterable: true,
      icon: TrendingUp,
      description: tExt("lifetime_count_of_successful_nft_sales"),
      priority: 2,
      render: {
        type: "number",
        format: { notation: "compact" }
      }
    },
    {
      key: "totalVolume",
      title: tCommon("volume"),
      type: "number",
      sortable: true,
      filterable: true,
      icon: DollarSign,
      description: tExt("total_trading_volume_across_all_nft_sales_in_usd"),
      priority: 1,
      render: {
        type: "number",
        format: { style: "currency", currency: "USD" }
      }
    },
    {
      key: "floorPrice",
      title: tExt("floor_price"),
      type: "number",
      sortable: true,
      filterable: true,
      icon: DollarSign,
      description: tExt("current_lowest_price_for_available_nfts"),
      priority: 3,
      render: {
        type: "number",
        format: { style: "currency", currency: "USD" }
      },
      expandedOnly: true
    },
    {
      key: "profilePublic",
      title: tExt("public_profile"),
      type: "boolean",
      sortable: true,
      filterable: true,
      icon: Eye,
      description: tCommon("profile_visibility_visible_to_marketplace_visitors"),
      priority: 3,
      render: {
        type: "badge",
        config: {
          true: { label: tCommon("public"), variant: "success", icon: "Eye" },
          false: { label: tCommon("private"), variant: "secondary", icon: "EyeOff" }
        }
      },
      expandedOnly: true
    },
    {
      key: "bio",
      title: tCommon("bio"),
      type: "text",
      sortable: false,
      filterable: false,
      description: tExt("creators_artist_statement_and_background_informati"),
      priority: 4,
      render: {
        type: "text",
        truncate: 100
      },
      expandedOnly: true
    },
    {
      key: "createdAt",
      title: tCommon("joined"),
      type: "date",
      sortable: true,
      filterable: true,
      icon: Users,
      description: t("date_when_creator_account_was_registered"),
      priority: 3,
      render: {
        type: "date",
        format: "MMM dd, yyyy"
      },
      expandedOnly: true
    },
  ];
}

export function useFormConfig(): FormConfig {
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  const tExtAdmin = useTranslations("ext_admin");
  return {
    edit: {
      title: tExt("edit_creator"),
      description: tExtAdmin("update_creator_profile_verification_status_and"),
      groups: [
        {
          id: "creator-profile",
          title: tExt("creator_profile"),
          icon: User,
          priority: 1,
          fields: [
            { key: "displayName", required: false, minLength: 1, maxLength: 255 },
            { key: "bio", required: false, maxLength: 1000 },
          ]
        },
        {
          id: "verification",
          title: tCommon("verification_status"),
          icon: Shield,
          priority: 2,
          fields: [
            {
              key: "isVerified",
              required: true,
              options: [
                { value: true, label: tCommon("verified") },
                { value: false, label: tExt("unverified") }
              ]
            },
            {
              key: "verificationTier",
              required: false,
              options: [
                { value: "BRONZE", label: tExt("bronze") },
                { value: "SILVER", label: tExt("silver") },
                { value: "GOLD", label: tExt("gold") },
                { value: "PLATINUM", label: tExt("platinum") }
              ]
            },
          ]
        },
        {
          id: "visibility",
          title: tExt("profile_visibility"),
          icon: Eye,
          priority: 3,
          fields: [
            {
              key: "profilePublic",
              required: true,
              options: [
                { value: true, label: tCommon("public") },
                { value: false, label: tCommon("private") }
              ]
            },
          ]
        },
      ]
    }
  };
}
