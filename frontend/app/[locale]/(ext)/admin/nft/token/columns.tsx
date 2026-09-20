"use client";

import React from "react";
import { format } from "date-fns";
import { Coins, Package, User, Shield, TrendingUp, Eye, Calendar, Star, Gem, Hexagon, Image as ImageIcon, Power, FileText, Hash, Heart, Link2, Sparkles, Wallet } from "lucide-react";
import type { ColumnDefinition, FormConfig, ViewConfig } from "@/components/blocks/data-table/types/table";
import { Badge } from "@/components/ui/badge";
import { statusLabel, statusTone } from "@/lib/status-tone";
import { createNftStatusToggleCell } from "../_components/status-toggle-cell";

import { useTranslations } from "next-intl";
export function useColumns() {
  const t = useTranslations("ext_admin");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  return [
  {
    key: "id",
    title: "ID",
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
    title: tCommon("token"),
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
          title: tCommon("token_name"),
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
          title: tCommon("logo"),
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
                return <span className="text-xs text-success">Verified</span>;
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
      // Hue resolves centrally through `lib/status-tone.ts`; do not re-add a
      // local `variant` here. NOTE: `BURNED` has no entry in that table yet, so
      // it currently resolves to `neutral` — it needs adding centrally, not here.
      config: {}
    },
    priority: 1
  },
  {
    key: "_statusToggle",
    title: tCommon("active"),
    type: "text",
    icon: Power,
    sortable: false,
    searchable: false,
    filterable: false,
    description: t("toggle_to_disable_burn_or_re_enable_this_token"),
    priority: 1,
    render: {
      type: "custom",
      render: createNftStatusToggleCell((_value, row) => row?.status === "MINTED"),
    },
  },
  {
    key: "owner",
    title: tCommon("owner"),
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
              {tCommon("not_set")}
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
          blue: "bg-primary/10 text-primary-ink",
          purple: "bg-primary/10 text-primary-ink",
          amber: "bg-warning/10 text-warning-ink",
          yellow: "bg-warning/10 text-warning-ink"
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
    title: tExt("listed"),
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
    title: tCommon("creator"),
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
                  alt={displayName || tCommon("creator")}
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
                <span className="font-medium text-sm">{displayName || t("unknown_creator")}</span>
                {creator.isVerified && (
                  <span className="text-primary text-xs">✓</span>
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
    title: tCommon("views"),
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

/* --------------------------------------------------------------------------
 * View dialog
 *
 * A token is a catalogue entry, a trait sheet and an on-chain artefact at
 * once, and the three audiences barely overlap — a moderator reads the first,
 * a curator the second, support the third. Hence three tabs rather than one
 * twenty-tile column.
 * ----------------------------------------------------------------------- */

const RARITY_LABEL: Record<string, string> = {
  COMMON: "Common",
  UNCOMMON: "Uncommon",
  RARE: "Rare",
  EPIC: "Epic",
  LEGENDARY: "Legendary",
};

/** `attributes` arrives as an array, an object map, or a JSON string. */
function parseTraits(raw: any): { name: string; value: string }[] {
  let source: any = raw;
  if (typeof source === "string") {
    const text = source.trim();
    if (!text) return [];
    try {
      source = JSON.parse(text);
    } catch {
      return [];
    }
  }
  if (Array.isArray(source)) {
    return source
      .map((entry: any) => {
        if (!entry || typeof entry !== "object") {
          return { name: "Trait", value: String(entry ?? "") };
        }
        const name = entry.trait_type ?? entry.traitType ?? entry.name ?? "Trait";
        const value = entry.value ?? entry.val ?? "";
        return {
          name: String(name),
          value:
            value && typeof value === "object"
              ? JSON.stringify(value)
              : String(value ?? ""),
        };
      })
      .filter((trait) => trait.value !== "");
  }
  if (source && typeof source === "object") {
    return Object.entries(source).map(([name, value]) => ({
      name,
      value:
        value && typeof value === "object"
          ? JSON.stringify(value)
          : String(value ?? ""),
    }));
  }
  return [];
}

function formatTokenDate(value: any): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : format(date, "MMM d, yyyy HH:mm");
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
            {row.image ? (
              <img
                src={row.image}
                alt={row.name || "NFT"}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center">
                <Gem className="h-4 w-4 text-muted-foreground" />
              </span>
            )}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-lg font-semibold text-foreground">
              {row.name || tExt("untitled_nft")}
            </span>
            <span className="block truncate text-sm font-normal text-muted-foreground">
              {row.collection?.name || t("no_collection")}
            </span>
          </span>
        </div>
      ),

      badges: (row) => (
        <>
          <Badge tone={statusTone(row.status)} appearance="soft">
            {statusLabel(row.status) || tCommon("unknown")}
          </Badge>
          <Badge tone={row.isListed ? "warning" : "neutral"} appearance="soft">
            {row.isListed ? tExt("listed") : tCommon("not_listed")}
          </Badge>
          {row.collection?.isVerified && (
            <Badge tone="success" appearance="soft">
              <Shield className="h-3 w-3" />
              {t("verified_collection")}
            </Badge>
          )}
        </>
      ),

      stats: [
        {
          label: t("rarity"),
          icon: Star,
          value: (row) => RARITY_LABEL[row.rarity] || "Not set",
        },
        {
          label: t("rarity_score"),
          icon: TrendingUp,
          value: (row) =>
            row.rarityScore === null || row.rarityScore === undefined
              ? "—"
              : Number(row.rarityScore).toFixed(2),
        },
        {
          label: tCommon("views"),
          icon: Eye,
          value: (row) => (Number(row.views) || 0).toLocaleString(),
        },
        {
          label: t("likes"),
          icon: Heart,
          value: (row) => (Number(row.likes) || 0).toLocaleString(),
        },
      ],

      tabs: [
        { id: "overview", title: tCommon("overview"), icon: Gem },
        { id: "traits", title: t("traits"), icon: Star },
        { id: "chain", title: t("on_chain"), icon: Hexagon },
      ],

      sections: [
        {
          id: "about",
          tab: "overview",
          title: tCommon("about"),
          icon: FileText,
          columns: 1,
          fields: [
            {
              // The placeholder arrives via `emptyText`, not via a fallback
              // inside `render`: DetailField resolves an empty value to the
              // placeholder BEFORE the renderer runs, so an `||` fallback is
              // dead on exactly the rows it was written for. `render` still has
              // to exist, though — no column backs this key, and a field with
              // neither a column nor a renderer is dropped outright.
              key: "description",
              title: tCommon("description"),
              fullWidth: true,
              emptyText: t("no_description"),
              render: (_value, row) => row.description,
            },
          ],
        },
        {
          id: "collection",
          tab: "overview",
          title: tCommon("collection"),
          icon: Package,
          columns: 2,
          fields: [
            { key: "collection" },
            {
              key: "collectionId",
              title: t("collection_id"),
              icon: Hash,
              copyable: true,
              render: (_value, row) => (
                <span className="font-mono text-xs break-all">
                  {row.collectionId}
                </span>
              ),
            },
          ],
        },
        {
          id: "ownership",
          tab: "overview",
          title: t("ownership"),
          icon: User,
          columns: 2,
          fields: [
            { key: "owner" },
            { key: "creator" },
            {
              key: "ownerId",
              title: t("owner_id"),
              icon: Hash,
              copyable: true,
              condition: (row) => Boolean(row.ownerId),
              render: (_value, row) => (
                <span className="font-mono text-xs break-all">{row.ownerId}</span>
              ),
            },
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
          id: "state",
          tab: "overview",
          title: t("mint_state"),
          icon: Sparkles,
          columns: 2,
          fields: [{ key: "isMinted" }, { key: "mintedAt" }],
        },
        {
          id: "traits",
          tab: "traits",
          title: t("traits"),
          icon: Star,
          description: t("attributes_recorded_on_the_token_metadata"),
          render: (row) => {
            const traits = parseTraits(row.attributes);
            if (!traits.length) {
              return (
                <p className="text-sm text-muted-foreground">
                  {t("no_traits_recorded_for_this_token")}
                </p>
              );
            }
            return (
              <div className="grid grid-cols-1 @md:grid-cols-2 @3xl:grid-cols-3 gap-3">
                {traits.map((trait, index) => (
                  <div
                    key={`${trait.name}-${index}`}
                    className="rounded-lg border border-border p-3 min-w-0"
                  >
                    <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1 truncate">
                      {trait.name}
                    </p>
                    <p className="text-sm font-medium break-words">{trait.value}</p>
                  </div>
                ))}
              </div>
            );
          },
        },
        {
          id: "blockchain",
          tab: "chain",
          title: tExt("blockchain"),
          icon: Hexagon,
          columns: 2,
          fields: [
            {
              key: "tokenId",
              title: tExt("token_id"),
              icon: Hash,
              copyable: true,
              render: (_value, row) => (
                <span className="font-mono text-xs break-all">{row.tokenId}</span>
              ),
            },
            {
              key: "blockchainTokenId",
              title: t("on_chain_token_id"),
              icon: Hash,
              copyable: true,
              emptyText: t("not_minted_on_chain"),
              render: (_value, row) => (
                <span className="font-mono text-xs break-all">
                  {row.blockchainTokenId}
                </span>
              ),
            },
            {
              key: "collection.chain",
              title: tExt("chain"),
              icon: Coins,
              render: (_value, row) =>
                row.collection?.chain ? (
                  <span className="uppercase">{row.collection.chain}</span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                ),
            },
            {
              key: "ownerWalletAddress",
              title: t("owner_wallet"),
              icon: Wallet,
              copyable: true,
              fullWidth: true,
              emptyText: t("not_held_on_chain"),
              render: (_value, row) => (
                <span className="font-mono text-xs break-all">
                  {row.ownerWalletAddress}
                </span>
              ),
            },
          ],
        },
        {
          id: "metadata",
          tab: "chain",
          title: tCommon("metadata"),
          icon: Link2,
          columns: 1,
          fields: [
            {
              key: "metadataUri",
              title: t("metadata_uri"),
              icon: Link2,
              copyable: true,
              fullWidth: true,
              emptyText: t("not_pinned"),
              render: (_value, row) => (
                <a
                  href={String(row.metadataUri)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-xs text-primary hover:underline break-all"
                >
                  {row.metadataUri}
                </a>
              ),
            },
            {
              key: "metadataHash",
              title: t("metadata_hash"),
              icon: Hash,
              copyable: true,
              fullWidth: true,
              condition: (row) => Boolean(row.metadataHash),
              render: (_value, row) => (
                <span className="font-mono text-xs break-all">
                  {row.metadataHash}
                </span>
              ),
            },
          ],
        },
        {
          id: "record",
          tab: "chain",
          title: tCommon("record"),
          icon: Calendar,
          columns: 2,
          collapsible: true,
          defaultCollapsed: true,
          fields: [
            { key: "id", title: t("token_record_id"), icon: Hash, copyable: true },
            { key: "createdAt" },
            {
              key: "updatedAt",
              title: tCommon("updated"),
              icon: Calendar,
              render: (_value, row) => formatTokenDate(row.updatedAt),
            },
          ],
        },
      ],
    }),
    []
  );
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
            { key: "name", compoundKey: "token", required: true, minLength: 1, maxLength: 255 },
            { key: "description", required: false },
            { key: "image", compoundKey: "token", required: false, maxLength: 1000 },
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
