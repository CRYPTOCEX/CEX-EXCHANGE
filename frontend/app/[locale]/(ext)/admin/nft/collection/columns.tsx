"use client";

import React from "react";
import { Package, User, Shield, TrendingUp, Eye, Calendar, Link as LinkIcon, Folder, FolderOpen, Grid3X3, Hexagon, Image as ImageIcon } from "lucide-react";
import type { FormConfig } from "@/components/blocks/data-table/types/table";

import { useTranslations } from "next-intl";
export function useColumns() {
  const t = useTranslations("ext_admin");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  const tExtNft = useTranslations("ext_nft");
  return [
    {
      key: "id",
      title: tCommon("id"),
      type: "text",
      sortable: true,
      searchable: true,
      filterable: true,
      icon: Shield,
      description: tExt("unique_identifier_for_this_nft_collection"),
      priority: 4,
      expandedOnly: true,
    },
    {
      key: "collection",
      title: tCommon("collection"),
      type: "compound",
      sortable: true,
      searchable: true,
      filterable: true,
      icon: Folder,
      description: tCommon("nft_collection_name_symbol_and_deployment_status"),
      priority: 1,
      sortKey: "name",
      render: {
        type: "compound",
        config: {
          image: {
            key: "logoImage",
            fallback: "/img/placeholder.svg",
            type: "image",
            title: tExt("logo"),
            description: tExt("collection_logo"),
          },
          primary: {
            key: "name",
            title: tExt("collection_name"),
            description: tExt("collection_display_name"),
            icon: FolderOpen,
            validation: (value) => value?.length < 2 ? "Name too short" : null,
          },
          secondary: {
            key: "symbol",
            title: tCommon("symbol"),
            description: tExt("collection_symbol_ticker"),
          },
          metadata: [
            {
              key: "chain",
              title: tExt("chain"),
              type: "custom",
              render: (value) => (
                <span className="text-xs font-medium uppercase">{value}</span>
              )
            },
            {
              key: "contractAddress",
              title: tExt("deployment"),
              type: "custom",
              render: (value) => (
                <span className={`text-xs px-1.5 py-0.5 rounded ${value ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'}`}>
                  {value ? 'Deployed' : 'Not Deployed'}
                </span>
              )
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
      description: t("collection_status_draft_pending_review_active"),
      options: [
        { value: "DRAFT", label: tCommon("draft"), color: "secondary" },
        { value: "PENDING", label: tCommon("pending"), color: "warning" },
        { value: "ACTIVE", label: tCommon("active"), color: "success" },
        { value: "INACTIVE", label: tCommon("inactive"), color: "secondary" },
        { value: "SUSPENDED", label: tCommon("suspended"), color: "destructive" }
      ],
      render: {
        type: "badge",
        config: {
          variant: (value) => {
            const variants = {
              DRAFT: "secondary",
              PENDING: "warning",
              ACTIVE: "success",
              INACTIVE: "secondary",
              SUSPENDED: "destructive"
            };
            return variants[value] || "secondary";
          }
        }
      },
      priority: 1,
    },
    {
      key: "isVerified",
      title: tCommon("verified"),
      type: "boolean",
      sortable: true,
      filterable: true,
      icon: Shield,
      description: t("platform_verification_badge_confirms_authentic_col"),
      priority: 1,
      render: {
        type: "custom",
        render: (value) => {
          const isTrue = value === true || value === "true" || value === 1;
          return (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              isTrue
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
            }`}>
              {isTrue ? "Verified" : "Unverified"}
            </span>
          );
        }
      }
    },
    {
      key: "creator",
      title: tExt("creator"),
      type: "custom",
      sortable: true,
      searchable: true,
      filterable: true,
      icon: User,
      description: tExt("artist_or_team_who_created_this_collection"),
      priority: 2,
      sortKey: "creator.user.firstName",
      render: {
        type: "custom",
        render: (value, row) => {
          const creator = row.creator;
          const user = creator?.user;
          if (!user) return <span className="text-muted-foreground">—</span>;

          const displayName = creator.displayName || `${user.firstName} ${user.lastName}`;

          return (
            <div className="flex items-center gap-3 min-w-0">
              <img
                src={user.avatar || "/img/placeholder.svg"}
                alt={displayName}
                className="w-8 h-8 rounded-full object-cover shrink-0"
              />
              <div className="min-w-0 flex-1">
                <div className="font-medium truncate" title={displayName}>{displayName}</div>
                {creator.isVerified && (
                  <div className="text-xs text-blue-600 dark:text-blue-400">Verified</div>
                )}
              </div>
            </div>
          );
        }
      }
    },
    {
      key: "volumeTraded",
      title: tCommon("volume"),
      type: "number",
      sortable: true,
      filterable: true,
      icon: TrendingUp,
      description: t("total_trading_volume_across_all_nfts_in_collection"),
      priority: 1,
      render: {
        type: "custom",
        render: (value) => {
          if (value === null || value === undefined || isNaN(value)) {
            return <span className="text-muted-foreground">—</span>;
          }
          return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
          }).format(value);
        }
      }
    },
    {
      key: "floorPrice",
      title: tExt("floor_price"),
      type: "number",
      sortable: true,
      filterable: true,
      icon: TrendingUp,
      description: tExt("lowest_price_for_available_nfts_in_this_collection"),
      priority: 2,
      render: {
        type: "custom",
        render: (value) => {
          if (value === null || value === undefined || isNaN(value)) {
            return <span className="text-muted-foreground">—</span>;
          }
          return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
          }).format(value);
        }
      }
    },
    {
      key: "standard",
      title: tCommon('standard'),
      type: "select",
      sortable: true,
      filterable: true,
      icon: Grid3X3,
      description: `${tExtNft("token_standard")} (${t("token_standard_erc_721_unique_or")})`,
      options: [
        { value: "ERC721", label: t("erc_721"), color: "blue" },
        { value: "ERC1155", label: t("erc_1155"), color: "purple" }
      ],
      render: {
        type: "badge",
        config: {
          variant: (value) => value === "ERC721" ? "blue" : "purple"
        }
      },
      priority: 3,
      expandedOnly: true,
    },
    {
      key: "totalSupply",
      title: tExt("supply"),
      type: "number",
      sortable: true,
      filterable: true,
      description: tExt("total_number_of_nfts_minted_in_this_collection"),
      priority: 3,
      render: {
        type: "number",
        format: { notation: "compact" }
      },
      expandedOnly: true,
    },
    {
      key: "maxSupply",
      title: tCommon("max_supply"),
      type: "number",
      sortable: true,
      filterable: true,
      description: tCommon("maximum_token_supply_limit_if_applicable"),
      priority: 4,
      render: {
        type: "custom",
        render: (value) => {
          if (value === null || value === undefined || isNaN(value)) {
            return <span className="text-muted-foreground">Unlimited</span>;
          }
          return new Intl.NumberFormat('en-US', { notation: 'compact' }).format(value);
        }
      },
      expandedOnly: true,
    },
    {
      key: "royaltyPercentage",
      title: tCommon("royalty"),
      type: "number",
      sortable: true,
      filterable: true,
      description: t("creator_royalty_percentage_on_secondary_sales_0_50"),
      priority: 4,
      render: {
        type: "custom",
        render: (value) => {
          if (value === null || value === undefined || isNaN(value)) {
            return <span className="text-muted-foreground">—</span>;
          }
          return `${parseFloat(value).toFixed(2)}%`;
        }
      },
      expandedOnly: true,
    },
    {
      key: "mintPrice",
      title: tCommon("mint_price"),
      type: "number",
      sortable: true,
      filterable: true,
      description: tExt("price_to_mint_new_tokens_from_this_collection"),
      priority: 4,
      render: {
        type: "custom",
        render: (value, row) => {
          if (value === null || value === undefined || isNaN(value)) {
            return <span className="text-muted-foreground">—</span>;
          }
          const currency = row.currency || 'USD';
          return `${parseFloat(value).toFixed(4)} ${currency}`;
        }
      },
      expandedOnly: true,
    },
    {
      key: "contractAddress",
      title: tExt("contract_address"),
      type: "text",
      sortable: false,
      searchable: true,
      filterable: false,
      description: t("blockchain_smart_contract_address_immutable_after"),
      priority: 4,
      render: {
        type: "custom",
        render: (value) => value ? (
          <code className="text-xs bg-muted px-2 py-1 rounded">
            {value.slice(0, 8)}...{value.slice(-6)}
          </code>
        ) : <span className="text-muted-foreground">—</span>
      },
      expandedOnly: true,
    },
    {
      key: "isLazyMinted",
      title: tExt("lazy_minted"),
      type: "boolean",
      sortable: true,
      filterable: true,
      description: `${tExtNft("uses_lazy_minting")} (${t("uses_lazy_minting_nfts_minted_on")})`,
      priority: 4,
      render: {
        type: "badge",
        config: {
          variant: (value) => value === true || value === "true" || value === 1 ? "blue" : "secondary",
          text: (value) => value === true || value === "true" || value === 1 ? "Lazy" : "Pre-minted"
        }
      },
      expandedOnly: true,
    },
    {
      key: "website",
      title: tCommon("website"),
      type: "text",
      sortable: false,
      searchable: false,
      filterable: false,
      icon: LinkIcon,
      description: tExt("official_project_website_url"),
      priority: 4,
      render: {
        type: "custom",
        render: (value) => value ? (
          <a href={value} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-xs">
            Visit
          </a>
        ) : <span className="text-muted-foreground">—</span>
      },
      expandedOnly: true,
    },
    {
      key: "views",
      title: tExt("views"),
      type: "number",
      sortable: true,
      filterable: true,
      icon: Eye,
      description: tExt("total_collection_page_views_from_marketplace"),
      priority: 4,
      render: {
        type: "custom",
        render: (value) => {
          if (value === null || value === undefined || isNaN(value)) {
            return <span className="text-muted-foreground">0</span>;
          }
          return new Intl.NumberFormat('en-US', { notation: 'compact' }).format(value);
        }
      },
      expandedOnly: true,
    },
    {
      key: "createdAt",
      title: tCommon("created"),
      type: "date",
      sortable: true,
      filterable: true,
      icon: Calendar,
      description: tExt("when_this_collection_was_created_on_the_platform"),
      render: {
        type: "date",
        format: "MMM dd, yyyy"
      },
      priority: 3,
      expandedOnly: true,
    }
  ];
}

export function useFormConfig(): FormConfig {
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  const tExtAdmin = useTranslations("ext_admin");
  return {
    edit: {
      title: tExt("edit_collection"),
      description: tExt("modify_nft_collection_settings_and_metadata"),
      groups: [
        {
          id: "collection-basics",
          title: tExt("collection_information"),
          icon: Folder,
          priority: 1,
          fields: [
            { key: "name", required: true, minLength: 1, maxLength: 255 },
            { key: "symbol", required: true, minLength: 1, maxLength: 10 },
            { key: "slug", required: true, maxLength: 255, pattern: /^[a-z0-9-]+$/ },
            { key: "description", required: false },
          ],
        },
        {
          id: "collection-blockchain",
          title: tExt("blockchain_settings"),
          icon: Grid3X3,
          priority: 2,
          fields: [
            { key: "chain", required: true, maxLength: 255 },
            { key: "network", required: true, maxLength: 255 },
            {
              key: "standard",
              required: true,
              options: [
                { value: "ERC721", label: tExtAdmin("erc_721") },
                { value: "ERC1155", label: tExtAdmin("erc_1155") }
              ]
            },
          ],
        },
        {
          id: "collection-media",
          title: tExt("collection_media"),
          icon: ImageIcon,
          priority: 3,
          fields: [
            { key: "logoImage", required: false, maxLength: 1000 },
            { key: "bannerImage", required: false, maxLength: 1000 },
            { key: "featuredImage", required: false, maxLength: 1000 },
          ],
        },
        {
          id: "verification",
          title: tExtAdmin("status_verification"),
          icon: Shield,
          priority: 4,
          fields: [
            { key: "isVerified", required: false },
            {
              key: "status",
              required: true,
              options: [
                { value: "DRAFT", label: tCommon("draft") },
                { value: "PENDING", label: tCommon("pending") },
                { value: "ACTIVE", label: tCommon("active") },
                { value: "INACTIVE", label: tCommon("inactive") },
                { value: "SUSPENDED", label: tCommon("suspended") }
              ]
            },
          ],
        },
      ],
    },
  };
}
