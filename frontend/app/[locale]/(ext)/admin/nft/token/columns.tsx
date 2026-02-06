"use client";

import React from "react";
import { Coins, Package, User, Shield, TrendingUp, Eye, Calendar, Star, Gem, Hexagon, Image as ImageIcon } from "lucide-react";
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
    icon: Shield,
    description: t("unique_identifier_for_this_nft_token_record"),
    priority: 4,
    expandedOnly: true
  },
  {
    key: "token",
    title: t("token"),
    type: "compound",
    sortable: true,
    searchable: true,
    filterable: true,
    icon: Gem,
    description: t("nft_token_name_image_and_blockchain_identifier"),
    priority: 1,
    sortKey: "name",
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
          title: tExt("token_name"),
          description: t("nft_token_name"),
          icon: Hexagon,
          validation: (value) => value?.length < 2 ? "Name too short" : null
        },
        secondary: {
          key: "tokenId",
          title: tExt("token_id"),
          description: t("blockchain_token_id")
        }
      }
    }
  },
  {
    key: "collection",
    title: tCommon("collection"),
    type: "compound",
    sortable: true,
    searchable: true,
    filterable: true,
    icon: Package,
    description: t("parent_nft_collection_this_token_belongs_to"),
    priority: 1,
    sortKey: "collection.name",
    render: {
      type: "compound",
      config: {
        image: {
          key: "logoImage",
          fallback: "/img/placeholder.svg",
          type: "image",
          title: tExt("logo"),
          description: tExt("collection_logo")
        },
        primary: {
          key: "name",
          title: tCommon("collection")
        },
        secondary: {
          key: "symbol",
          title: tCommon("symbol")
        },
        metadata: [
          {
            key: "isVerified",
            title: tCommon("verified"),
            type: "custom",
            render: (value) => {
              if (value === true || value === 1 || value === "true") {
                return <span className="text-xs text-green-600 dark:text-green-400">Verified</span>;
              }
              return null;
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
    description: t("token_lifecycle_state_draft_minted_or_burned"),
    options: [
      { value: "DRAFT", label: tCommon("draft"), color: "secondary" },
      { value: "MINTED", label: t("minted"), color: "success" },
      { value: "BURNED", label: t("burned"), color: "destructive" }
    ],
    render: {
      type: "badge",
      config: {
        variant: (value) => {
          const variants = {
            DRAFT: "secondary",
            MINTED: "success",
            BURNED: "destructive"
          };
          return variants[value] || "secondary";
        }
      }
    },
    priority: 1
  },
  {
    key: "owner",
    title: t("owner"),
    type: "compound",
    sortable: true,
    searchable: true,
    filterable: true,
    icon: User,
    description: t("current_nft_owner_changes_with_each"),
    priority: 2,
    sortKey: "owner.firstName",
    render: {
      type: "compound",
      config: {
        image: {
          key: "avatar",
          fallback: "/img/placeholder.svg",
          type: "image",
          title: tCommon("avatar"),
          description: t("owners_profile_picture")
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
    key: "rarity",
    title: t("rarity"),
    type: "select",
    sortable: true,
    filterable: true,
    icon: Star,
    description: t("rarity_classification_based_on_token_traits"),
    options: [
      { value: "COMMON", label: t("common"), color: "secondary" },
      { value: "UNCOMMON", label: t("uncommon"), color: "blue" },
      { value: "RARE", label: t("rare"), color: "purple" },
      { value: "EPIC", label: t("epic"), color: "amber" },
      { value: "LEGENDARY", label: t("legendary"), color: "yellow" }
    ],
    render: {
      type: "custom",
      render: (value) => {
        if (!value || value === null || value === undefined) {
          return (
            <span className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
              {t("not_set")}
            </span>
          );
        }

        const variants = {
          COMMON: "secondary",
          UNCOMMON: "blue",
          RARE: "purple",
          EPIC: "amber",
          LEGENDARY: "yellow"
        };

        const labels = {
          COMMON: "Common",
          UNCOMMON: "Uncommon",
          RARE: "Rare",
          EPIC: "Epic",
          LEGENDARY: "Legendary"
        };

        const variant = variants[value] || "secondary";
        const label = labels[value] || value;

        const variantClasses = {
          secondary: "bg-secondary text-secondary-foreground",
          blue: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
          purple: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
          amber: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300",
          yellow: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
        };

        return (
          <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${variantClasses[variant]}`}>
            {label}
          </span>
        );
      }
    },
    priority: 2
  },
  {
    key: "isListed",
    title: t("listed"),
    type: "boolean",
    sortable: true,
    filterable: true,
    icon: TrendingUp,
    description: t("whether_token_is_currently_listed_for"),
    priority: 1,
    render: {
      type: "badge",
      config: {
        variant: (value) => value ? "warning" : "secondary",
        text: (value) => value ? "Listed" : "Not Listed"
      }
    }
  },
  {
    key: "isMinted",
    title: t("minted"),
    type: "boolean",
    sortable: true,
    filterable: true,
    description: t("whether_token_has_been_minted_on_blockchain"),
    priority: 3,
    render: {
      type: "badge",
      config: {
        variant: (value) => value ? "success" : "secondary",
        text: (value) => value ? "Minted" : "Not Minted"
      }
    },
    expandedOnly: true
  },
  {
    key: "creator",
    title: tExt("creator"),
    type: "compound",
    sortable: true,
    searchable: true,
    filterable: true,
    icon: User,
    description: t("original_artist_who_created_this_nft_never_changes"),
    priority: 3,
    sortKey: "creator.user.firstName",
    render: {
      type: "custom",
      render: (value, row) => {
        if (!row.creator || !row.creator.user) {
          return <span className="text-muted-foreground">—</span>;
        }

        const creator = row.creator;
        const user = creator.user;
        const displayName = creator.displayName || [user.firstName, user.lastName].filter(Boolean).join(" ");

        return (
          <div className="flex items-center gap-3">
            <div className="relative h-8 w-8 rounded-full overflow-hidden bg-muted">
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={displayName || "Creator"}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    const nextSibling = e.currentTarget.nextElementSibling as HTMLElement | null;
                    if (nextSibling) nextSibling.style.display = 'flex';
                  }}
                />
              ) : null}
              <div className="absolute inset-0 flex items-center justify-center bg-muted" style={{ display: user.avatar ? 'none' : 'flex' }}>
                <User className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1">
                <span className="font-medium text-sm">{displayName || "Unknown Creator"}</span>
                {creator.isVerified && (
                  <span className="text-blue-600 dark:text-blue-400 text-xs">✓</span>
                )}
              </div>
              {user.email && (
                <span className="text-xs text-muted-foreground">{user.email}</span>
              )}
            </div>
          </div>
        );
      }
    },
    expandedOnly: true
  },
  {
    key: "rarityScore",
    title: t("rarity_score"),
    type: "number",
    sortable: true,
    filterable: true,
    description: t("calculated_numerical_rarity_score_based_on"),
    priority: 4,
    render: {
      type: "number",
      format: { minimumFractionDigits: 2, maximumFractionDigits: 2 }
    },
    expandedOnly: true
  },
  {
    key: "views",
    title: tExt("views"),
    type: "number",
    sortable: true,
    filterable: true,
    icon: Eye,
    description: t("total_number_of_views_on_token_detail_page"),
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
    description: t("number_of_users_who_favorited_this_nft"),
    priority: 4,
    render: {
      type: "number",
      format: { notation: "compact" }
    },
    expandedOnly: true
  },
  {
    key: "mintedAt",
    title: t("minted"),
    type: "date",
    sortable: true,
    filterable: true,
    description: t("date_and_time_when_token_was_minted_on_blockchain"),
    render: {
      type: "date",
      format: "MMM dd, yyyy"
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
    description: t("when_this_token_record_was_created_on_platform"),
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
      title: t("edit_token"),
      description: t("modify_nft_token_metadata_and_attributes"),
      groups: [
        {
          id: "token-basics",
          title: tExt("token_information"),
          icon: Gem,
          priority: 1,
          fields: [
            { key: "name", required: true, minLength: 1, maxLength: 255 },
            { key: "description", required: false },
            { key: "image", required: false, maxLength: 1000 },
          ]
        },
        {
          id: "token-attributes",
          title: t("token_attributes"),
          icon: Star,
          priority: 2,
          fields: [
            {
              key: "status",
              required: true,
              options: [
                { value: "DRAFT", label: tCommon("draft") },
                { value: "MINTED", label: t("minted") },
                { value: "BURNED", label: t("burned") }
              ]
            },
            {
              key: "rarity",
              required: false,
              options: [
                { value: "COMMON", label: t("common") },
                { value: "UNCOMMON", label: t("uncommon") },
                { value: "RARE", label: t("rare") },
                { value: "EPIC", label: t("epic") },
                { value: "LEGENDARY", label: t("legendary") }
              ]
            },
            { key: "rarityScore", required: false, min: 0 },
          ]
        },
      ]
    }
  } as FormConfig;
}
