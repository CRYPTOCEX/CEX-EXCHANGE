"use client";

import React from "react";
import { format } from "date-fns";
import { ShoppingCart, Coins, User, DollarSign, Clock, Eye, Calendar, Gavel, ShoppingBag, Tag, Store, Power, Hash, Heart, Layers, ShieldAlert, TrendingUp, Wallet } from "lucide-react";
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
          title: tCommon("token")
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
      { value: "ACTIVE", label: tCommon("active") },
      { value: "SOLD", label: tCommon("sold") },
      { value: "CANCELLED", label: tCommon("cancelled") },
      { value: "EXPIRED", label: tCommon("expired") }
    ],
    render: {
      type: "badge",
      // Hue resolves centrally through `lib/status-tone.ts`; do not re-add a
      // local `variant` here.
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
    description: t("toggle_to_disable_or_re_enable_this_listing"),
    priority: 1,
    render: {
      type: "custom",
      render: createNftStatusToggleCell((_value, row) => row?.status === "ACTIVE"),
    },
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
            FIXED_PRICE: "info",
            AUCTION: "primary",
            BUNDLE: "warning"
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
            ETH: "info",
            USDC: "success",
            USDT: "success",
            BNB: "warning",
            MATIC: "primary"
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
    title: tExt("reserve_price"),
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
    title: tExt("buy_now_price"),
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
    title: tExt("end_time"),
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
    title: tCommon("views"),
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
    title: tExt("listed"),
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

/* --------------------------------------------------------------------------
 * View dialog
 *
 * One row of this table is any of three different records — a fixed-price
 * sale, an auction, or a bundle — so the panel is shaped by `type`: the
 * auction economics and the bundle contents each appear only for the listing
 * that actually has them, instead of every row showing a column of dashes.
 *
 * `bidCount` is deliberately absent: it has a table column but `nftListing`
 * has no such attribute, so the value never arrives. See the report.
 * ----------------------------------------------------------------------- */

/** Amounts here are crypto tickers (ETH, USDC, ...), never USD. */
function formatAmount(value: any, currency?: string): string | null {
  if (value === null || value === undefined || value === "") return null;
  const amount = Number(value);
  if (Number.isNaN(amount)) return null;
  const formatted =
    amount > 0 && amount < 0.01
      ? amount.toFixed(8).replace(/\.?0+$/, "")
      : amount.toFixed(4).replace(/\.?0+$/, "");
  return currency ? `${formatted} ${currency}` : formatted;
}

function formatDateTime(value: any): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : format(date, "MMM d, yyyy HH:mm");
}

function MonoValue({ value }: { value: any }) {
  if (!value) return <span className="text-muted-foreground">—</span>;
  return <span className="font-mono text-xs break-all">{String(value)}</span>;
}

/** `bundleTokenIds` is a TEXT column holding either a JSON array or a CSV. */
function parseBundleTokenIds(raw: any): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(String);
  const text = String(raw).trim();
  if (text.startsWith("[")) {
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch {
      /* fall through to the CSV reading below */
    }
  }
  return text
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

const LISTING_TYPE_LABEL: Record<string, string> = {
  FIXED_PRICE: "Fixed price",
  AUCTION: "Auction",
  BUNDLE: "Bundle",
};

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
            {row.token?.image ? (
              <img
                src={row.token.image}
                alt={row.token?.name || "NFT"}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center">
                <Tag className="h-4 w-4 text-muted-foreground" />
              </span>
            )}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-lg font-semibold text-foreground">
              {row.token?.name || tExt("untitled_nft")}
            </span>
            <span className="block truncate text-sm font-normal text-muted-foreground">
              {row.token?.collection?.name || t("no_collection")}
            </span>
          </span>
        </div>
      ),

      badges: (row) => (
        <>
          <Badge tone={statusTone(row.status)} appearance="soft">
            {statusLabel(row.status) || tCommon("unknown")}
          </Badge>
          <Badge tone="info" appearance="soft">
            {LISTING_TYPE_LABEL[row.type] || row.type || tExt("listing")}
          </Badge>
          {row.settlementBlockedAt && (
            <Badge tone="destructive" appearance="soft">
              <ShieldAlert className="h-3 w-3" />
              {t("settlement_blocked")}
            </Badge>
          )}
        </>
      ),

      stats: [
        {
          label: t("listed_price"),
          icon: DollarSign,
          value: (row) => formatAmount(row.price, row.currency) ?? "—",
        },
        {
          label: tCommon("current_bid"),
          icon: Gavel,
          tone: "primary",
          condition: (row) => row.type === "AUCTION",
          value: (row) =>
            formatAmount(row.currentBid, row.currency) ?? "No bids yet",
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
        { id: "overview", title: tCommon("overview"), icon: ShoppingBag },
        { id: "pricing", title: tCommon("pricing"), icon: DollarSign },
        { id: "timeline", title: tCommon("timeline"), icon: Clock },
      ],

      sections: [
        {
          id: "listing",
          tab: "overview",
          title: tExt("listing"),
          icon: Store,
          columns: 2,
          fields: [
            { key: "type" },
            { key: "currency" },
            {
              key: "id",
              title: t("listing_id"),
              icon: Hash,
              copyable: true,
              render: (_value, row) => <MonoValue value={row.id} />,
            },
          ],
        },
        {
          id: "asset",
          tab: "overview",
          title: tCommon("asset"),
          icon: Tag,
          columns: 2,
          fields: [
            {
              key: "token.collection.name",
              title: tCommon("collection"),
              icon: Layers,
              render: (_value, row) =>
                row.token?.collection?.name || (
                  <span className="text-muted-foreground">—</span>
                ),
            },
            {
              key: "token.tokenId",
              title: t("on_chain_token_id"),
              icon: Hash,
              render: (_value, row) => <MonoValue value={row.token?.tokenId} />,
            },
            {
              key: "tokenId",
              title: t("token_record_id"),
              icon: Hash,
              copyable: true,
              render: (_value, row) => <MonoValue value={row.tokenId} />,
            },
          ],
        },
        {
          id: "seller",
          tab: "overview",
          title: tCommon("seller"),
          icon: User,
          columns: 2,
          fields: [
            { key: "seller" },
            {
              key: "sellerId",
              title: t("seller_id"),
              icon: Hash,
              copyable: true,
              render: (_value, row) => <MonoValue value={row.sellerId} />,
            },
          ],
        },
        {
          id: "pricing",
          tab: "pricing",
          title: tCommon("pricing"),
          icon: DollarSign,
          columns: 3,
          fields: [
            { key: "buyNowPrice" },
            { key: "reservePrice" },
            {
              key: "startingBid",
              title: t("starting_bid"),
              icon: Gavel,
              condition: (row) => row.type === "AUCTION",
              render: (_value, row) =>
                formatAmount(row.startingBid, row.currency) ?? "—",
            },
            {
              key: "minBidIncrement",
              title: t("min_bid_increment"),
              icon: TrendingUp,
              condition: (row) => row.type === "AUCTION",
              render: (_value, row) =>
                formatAmount(row.minBidIncrement, row.currency) ?? "—",
            },
          ],
        },
        {
          id: "bundle",
          tab: "pricing",
          title: t("bundled_tokens"),
          icon: Layers,
          condition: (row) =>
            row.type === "BUNDLE" && parseBundleTokenIds(row.bundleTokenIds).length > 0,
          render: (row) => {
            const ids = parseBundleTokenIds(row.bundleTokenIds);
            return (
              <div className="space-y-2">
                {ids.map((id, index) => (
                  <div
                    key={`${id}-${index}`}
                    className="flex items-center gap-3 rounded-lg border border-border p-3"
                  >
                    <span className="text-xs text-muted-foreground shrink-0">
                      {index + 1}
                    </span>
                    <span className="font-mono text-xs break-all">{id}</span>
                  </div>
                ))}
              </div>
            );
          },
        },
        {
          id: "contract",
          tab: "pricing",
          title: t("auction_contract"),
          icon: Wallet,
          columns: 1,
          condition: (row) => Boolean(row.auctionContractAddress),
          fields: [
            {
              key: "auctionContractAddress",
              title: tExt("contract_address"),
              icon: Wallet,
              copyable: true,
              render: (_value, row) => (
                <MonoValue value={row.auctionContractAddress} />
              ),
            },
          ],
        },
        {
          id: "schedule",
          tab: "timeline",
          title: t("schedule"),
          icon: Clock,
          columns: 2,
          fields: [{ key: "startTime" }, { key: "endTime" }],
        },
        {
          id: "lifecycle",
          tab: "timeline",
          title: t("lifecycle"),
          icon: ShoppingCart,
          columns: 2,
          condition: (row) =>
            Boolean(
              row.soldAt || row.cancelledAt || row.endedAt || row.settlementBlockedAt
            ),
          fields: [
            {
              key: "soldAt",
              title: t("sold_at"),
              icon: Coins,
              condition: (row) => Boolean(row.soldAt),
              render: (_value, row) => formatDateTime(row.soldAt),
            },
            {
              key: "endedAt",
              title: t("ended_at"),
              icon: Clock,
              condition: (row) => Boolean(row.endedAt),
              render: (_value, row) => formatDateTime(row.endedAt),
            },
            {
              key: "cancelledAt",
              title: t("cancelled_at"),
              icon: Clock,
              condition: (row) => Boolean(row.cancelledAt),
              render: (_value, row) => formatDateTime(row.cancelledAt),
            },
            {
              key: "settlementBlockedAt",
              title: t("settlement_blocked_at"),
              icon: ShieldAlert,
              condition: (row) => Boolean(row.settlementBlockedAt),
              render: (_value, row) => (
                <span className="text-destructive">
                  {formatDateTime(row.settlementBlockedAt)}
                </span>
              ),
            },
          ],
        },
        {
          id: "record",
          tab: "timeline",
          title: tCommon("record"),
          icon: Calendar,
          columns: 2,
          collapsible: true,
          defaultCollapsed: true,
          fields: [
            { key: "createdAt" },
            {
              key: "updatedAt",
              title: tCommon("updated"),
              icon: Calendar,
              render: (_value, row) => formatDateTime(row.updatedAt),
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
                { value: "SOLD", label: tCommon("sold") },
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
