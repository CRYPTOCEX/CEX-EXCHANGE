"use client";

import React from "react";
import { Package, User, Shield, TrendingUp, Eye, Calendar, Link as LinkIcon, Folder, FolderOpen, Grid3X3, Hexagon, Image as ImageIcon, Power, Coins, DollarSign, Globe, Hash, Layers, Percent, Sparkles } from "lucide-react";
import type { FormConfig, ViewConfig } from "@/components/blocks/data-table/types/table";
import { Badge } from "@/components/ui/badge";
import { statusLabel, statusTone } from "@/lib/status-tone";
import { createNftStatusToggleCell } from "../_components/status-toggle-cell";

import { useTranslations } from "next-intl";
export function useColumns() {
  const t = useTranslations("ext_admin");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  const tExtNft = useTranslations("ext_nft");
  return [
    {
      key: "id",
      title: "ID",
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
            title: tCommon("logo"),
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
                <span className={`text-xs px-1.5 py-0.5 rounded ${value ? 'bg-success/10 text-success-ink' : 'bg-warning/10 text-warning-ink'}`}>
                  {value ? tExt("deployed") : tExt("not_deployed")}
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
        { value: "DRAFT", label: tCommon("draft") },
        { value: "PENDING", label: tCommon("pending") },
        { value: "ACTIVE", label: tCommon("active") },
        { value: "INACTIVE", label: tCommon("inactive") },
        { value: "SUSPENDED", label: tCommon("suspended") }
      ],
      render: {
        type: "badge",
        // Hue resolves centrally through `lib/status-tone.ts`; do not re-add a
        // local `variant` here.
        config: {}
      },
      priority: 1,
    },
    {
      key: "_statusToggle",
      title: tCommon("active"),
      type: "text",
      icon: Power,
      sortable: false,
      searchable: false,
      filterable: false,
      description: t("toggle_to_suspend_or_re_enable_this_collection"),
      priority: 1,
      render: {
        type: "custom",
        render: createNftStatusToggleCell((_value, row) => row?.status === "ACTIVE"),
      },
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
                ? 'bg-success/10 text-success-ink'
                : 'bg-destructive/10 text-destructive-ink'
            }`}>
              {isTrue ? tCommon("verified") : tCommon("unverified")}
            </span>
          );
        }
      }
    },
    {
      key: "creator",
      title: tCommon("creator"),
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
                  <div className="text-xs text-primary">Verified</div>
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
      description: `${tExt("token_standard")} (${t("token_standard_erc_721_unique_or")})`,
      options: [
        { value: "ERC721", label: t("erc_721"), color: "blue" },
        { value: "ERC1155", label: t("erc_1155"), color: "purple" }
      ],
      render: {
        type: "badge",
        config: {
          variant: (value) => value === "ERC721" ? "info" : "primary"
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
          <a href={value} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-xs">
            Visit
          </a>
        ) : <span className="text-muted-foreground">—</span>
      },
      expandedOnly: true,
    },
    {
      key: "views",
      title: tCommon("views"),
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

/* --------------------------------------------------------------------------
 * View dialog
 *
 * A collection is three records in one — a catalogue entry, a deployed
 * contract, and a public storefront — so the panel splits along those lines
 * rather than listing twenty tiles in one column.
 *
 * Deliberately absent: `volumeTraded`, `floorPrice` and `views`. They have
 * table columns but `nftCollection` has no such attributes and
 * `/api/admin/nft/collection` never returns them, so every one of those tiles
 * would be an em dash. The columns array is out of scope here; see the report.
 * ----------------------------------------------------------------------- */

function formatCount(value: any): string {
  const amount = Number(value);
  if (value === null || value === undefined || value === "" || Number.isNaN(amount)) {
    return "—";
  }
  return new Intl.NumberFormat("en-US", { notation: "compact" }).format(amount);
}

function ExternalLinkValue({ href }: { href: any }) {
  if (!href) return <span className="text-muted-foreground">—</span>;
  const url = String(href);
  return (
    <a
      href={url.startsWith("http") ? url : `https://${url}`}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary hover:underline break-all"
    >
      {url}
    </a>
  );
}

function ImagePreview({ src, label }: { src: any; label: string }) {
  if (!src) return <span className="text-muted-foreground">—</span>;
  return (
    <span className="block overflow-hidden rounded-md border border-border bg-muted">
      <img
        src={String(src)}
        alt={label}
        className="h-24 w-full object-cover"
      />
    </span>
  );
}

export function useViewConfig(): ViewConfig {
  const t = useTranslations("ext_admin");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  return React.useMemo<ViewConfig>(
    () => ({
      size: "4xl",

      title: (row) => (
        <div className="flex items-center gap-3">
          <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
            {row.logoImage ? (
              <img
                src={row.logoImage}
                alt={row.name || tCommon("collection")}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center">
                <Folder className="h-4 w-4 text-muted-foreground" />
              </span>
            )}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-lg font-semibold text-foreground">
              {row.name || t("untitled_collection")}
            </span>
            <span className="block truncate text-sm font-normal text-muted-foreground">
              {row.symbol || row.slug || ""}
            </span>
          </span>
        </div>
      ),

      badges: (row) => (
        <>
          <Badge tone={statusTone(row.status)} appearance="soft">
            {statusLabel(row.status) || tCommon("unknown")}
          </Badge>
          {row.isVerified ? (
            <Badge tone="success" appearance="soft">
              <Shield className="h-3 w-3" />
              Verified
            </Badge>
          ) : (
            <Badge tone="neutral" appearance="soft">
              Unverified
            </Badge>
          )}
          {row.isLazyMinted && (
            <Badge tone="info" appearance="soft">
              {tExt("lazy_minted")}
            </Badge>
          )}
          {!row.contractAddress && (
            <Badge tone="warning" appearance="soft">
              {tExt("not_deployed")}
            </Badge>
          )}
        </>
      ),

      stats: [
        {
          label: tExt("total_supply"),
          icon: Layers,
          value: (row) => formatCount(row.totalSupply),
        },
        {
          label: tCommon("mint_price"),
          icon: DollarSign,
          value: (row) =>
            row.mintPrice === null || row.mintPrice === undefined
              ? "—"
              : `${Number(row.mintPrice).toFixed(4).replace(/\.?0+$/, "")} ${row.currency || ""}`.trim(),
        },
        {
          label: tCommon("royalty"),
          icon: Percent,
          value: (row) =>
            row.royaltyPercentage === null || row.royaltyPercentage === undefined
              ? "—"
              : `${Number(row.royaltyPercentage).toFixed(2)}%`,
        },
        {
          label: tExt("chain"),
          icon: Hexagon,
          value: (row) =>
            [row.chain, row.network].filter(Boolean).join(" · ").toUpperCase() || "—",
        },
      ],

      tabs: [
        { id: "overview", title: tCommon("overview"), icon: Folder },
        { id: "chain", title: tExt("blockchain"), icon: Grid3X3 },
        { id: "presence", title: t("media_links"), icon: ImageIcon },
      ],

      sections: [
        {
          id: "catalogue",
          tab: "overview",
          title: t("catalogue_entry"),
          icon: FolderOpen,
          columns: 2,
          fields: [
            {
              key: "slug",
              title: tCommon("slug"),
              icon: Hash,
              copyable: true,
              render: (_value, row) =>
                row.slug ? (
                  <span className="font-mono text-xs break-all">{row.slug}</span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                ),
            },
            {
              // `emptyText`, not a fallback inside `render`: DetailField
              // short-circuits an empty raw value to the placeholder BEFORE the
              // renderer runs, so a fallback written into `render` is dead on
              // exactly the rows it was written for.
              key: "categoryId",
              title: tCommon("category"),
              icon: Package,
              emptyText: t("uncategorised"),
              render: (_value, row) => row.category?.name || "Uncategorised",
            },
            {
              // `render` is still required: no column backs this key, and a
              // field with neither a column nor a renderer is dropped outright.
              key: "description",
              title: tCommon("description"),
              fullWidth: true,
              emptyText: t("no_description"),
              render: (_value, row) => row.description,
            },
          ],
        },
        {
          id: "creator",
          tab: "overview",
          title: tCommon("creator"),
          icon: User,
          columns: 2,
          fields: [
            { key: "creator" },
            {
              key: "creatorId",
              title: t("creator_id"),
              icon: Hash,
              copyable: true,
              render: (_value, row) => (
                <span className="font-mono text-xs break-all">{row.creatorId}</span>
              ),
            },
          ],
        },
        {
          id: "contract",
          tab: "chain",
          title: tCommon("contract"),
          icon: Hexagon,
          columns: 2,
          fields: [
            { key: "contractAddress", copyable: true },
            { key: "standard" },
            { key: "isLazyMinted" },
            {
              key: "isPublicMintEnabled",
              title: t("public_mint"),
              icon: Sparkles,
              render: (_value, row) => (
                <Badge
                  tone={row.isPublicMintEnabled ? "success" : "neutral"}
                  appearance="soft"
                >
                  {row.isPublicMintEnabled ? tCommon("open") : tCommon("closed")}
                </Badge>
              ),
            },
          ],
        },
        {
          id: "economics",
          tab: "chain",
          title: t("supply_payouts"),
          icon: Coins,
          columns: 2,
          fields: [
            // The column's own renderer prints "Unlimited" for a null cap, but
            // the dialog short-circuits an empty value before the renderer ever
            // runs — so the same word has to be the empty text here.
            { key: "maxSupply", emptyText: tCommon("unlimited") },
            {
              key: "currency",
              title: t("mint_currency"),
              icon: Coins,
              render: (_value, row) => row.currency || "—",
            },
            {
              key: "royaltyAddress",
              title: t("royalty_address"),
              icon: Percent,
              copyable: true,
              condition: (row) => Boolean(row.royaltyAddress),
              render: (_value, row) => (
                <span className="font-mono text-xs break-all">
                  {row.royaltyAddress}
                </span>
              ),
            },
          ],
        },
        {
          id: "media",
          tab: "presence",
          title: tCommon("media"),
          icon: ImageIcon,
          columns: 3,
          fields: [
            {
              // `fullWidth: false` explicitly. `logoImage` resolves to the
              // compound's IMAGE entry, and an image-typed field spans the whole
              // grid row by default — which would have left the logo three
              // columns wide beside two one-column siblings.
              key: "logoImage",
              title: tCommon("logo"),
              fullWidth: false,
              render: (_value, row) => (
                <ImagePreview src={row.logoImage} label={tExt("collection_logo")} />
              ),
            },
            {
              key: "bannerImage",
              title: tExt("banner"),
              render: (_value, row) => (
                <ImagePreview src={row.bannerImage} label={tExt("collection_banner")} />
              ),
            },
            {
              key: "featuredImage",
              title: tCommon("featured"),
              render: (_value, row) => (
                <ImagePreview src={row.featuredImage} label={tCommon("featured_image")} />
              ),
            },
          ],
        },
        {
          id: "links",
          tab: "presence",
          title: tCommon("links"),
          icon: LinkIcon,
          columns: 2,
          fields: [
            {
              key: "website",
              title: tCommon("website"),
              icon: Globe,
              render: (_value, row) => <ExternalLinkValue href={row.website} />,
            },
            {
              key: "discord",
              title: t("discord"),
              icon: LinkIcon,
              render: (_value, row) => <ExternalLinkValue href={row.discord} />,
            },
            {
              key: "twitter",
              title: "Twitter",
              icon: LinkIcon,
              render: (_value, row) => <ExternalLinkValue href={row.twitter} />,
            },
            {
              key: "telegram",
              title: "Telegram",
              icon: LinkIcon,
              render: (_value, row) => <ExternalLinkValue href={row.telegram} />,
            },
          ],
        },
        {
          id: "record",
          tab: "overview",
          title: tCommon("record"),
          icon: Calendar,
          columns: 2,
          collapsible: true,
          defaultCollapsed: true,
          fields: [
            { key: "id", title: t("collection_id"), icon: Hash, copyable: true },
            { key: "createdAt" },
            {
              key: "updatedAt",
              title: tCommon("updated"),
              icon: Calendar,
              render: (_value, row) =>
                row.updatedAt
                  ? new Date(row.updatedAt).toLocaleString()
                  : "—",
            },
            {
              key: "deletedAt",
              title: tCommon("deleted"),
              icon: Calendar,
              condition: (row) => Boolean(row.deletedAt),
              render: (_value, row) => (
                <span className="text-destructive">
                  {new Date(row.deletedAt).toLocaleString()}
                </span>
              ),
            },
          ],
        },
      ],
    }),
    []
  );
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
            { key: "name", compoundKey: "collection", required: true, minLength: 1, maxLength: 255 },
            { key: "symbol", compoundKey: "collection", required: true, minLength: 1, maxLength: 10 },
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
            { key: "logoImage", compoundKey: "collection", required: false, maxLength: 1000 },
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
