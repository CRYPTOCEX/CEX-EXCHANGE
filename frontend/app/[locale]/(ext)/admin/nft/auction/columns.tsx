"use client";

import React from "react";
import { format } from "date-fns";
import {
  Activity,
  Coins,
  Calendar,
  Clock,
  DollarSign,
  Eye,
  Gavel,
  Hash,
  Heart,
  Power,
  ShieldAlert,
  Tag,
  TrendingUp,
  User,
  Wallet,
} from "lucide-react";
import type {
  ColumnDefinition,
  FormConfig,
  ViewConfig,
} from "@/components/blocks/data-table/types/table";
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
          title: tCommon("token")
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
      { value: "ACTIVE", label: tCommon("active") },
      { value: "ENDED", label: tExt("ended") },
      { value: "CANCELLED", label: tCommon("cancelled") },
      { value: "PENDING", label: tCommon("pending") }
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
    description: t("toggle_to_disable_or_re_enable_this_auction"),
    priority: 1,
    render: {
      type: "custom",
      render: createNftStatusToggleCell((_value, row) => row?.status === "ACTIVE"),
    },
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
    title: tExt("starting_price"),
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
    title: tExt("reserve_price"),
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
    title: tExt("buy_now_price"),
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

/* --------------------------------------------------------------------------
 * View dialog
 *
 * An auction is a money record with a live bid book, so the panel leads with
 * the four figures an operator opens it for (start / current / reserve / bid
 * count) and keeps the bid history as its own rendered list rather than a
 * key/value tile. Amounts are printed in the listing's OWN currency: these are
 * crypto tickers (ETH, USDC, ...), not USD, so the table's currency formatter
 * is deliberately overridden here.
 * ----------------------------------------------------------------------- */

/** `1200` -> `1200`, `0.0004` -> `0.0004`, in the listing's own ticker. */
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
              {row.token?.tokenId ? t("token", { tokenId: String(row.token.tokenId) }) : tCommon("auction")}
            </span>
          </span>
        </div>
      ),

      badges: (row) => (
        <>
          <Badge tone={statusTone(row.status)} appearance="soft">
            {statusLabel(row.status) || tCommon("unknown")}
          </Badge>
          {row.buyNowPrice !== null && row.buyNowPrice !== undefined && (
            <Badge tone="info" appearance="soft">
              {tCommon("buy_now")}
            </Badge>
          )}
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
          label: tExt("starting_price"),
          icon: DollarSign,
          value: (row) => formatAmount(row.price, row.currency) ?? "—",
        },
        {
          label: tCommon("current_bid"),
          icon: Gavel,
          tone: "primary",
          value: (row) =>
            formatAmount(row.currentBid, row.currency) ?? "No bids yet",
        },
        {
          label: t("reserve"),
          icon: TrendingUp,
          value: (row) => formatAmount(row.reservePrice, row.currency) ?? "None",
        },
        {
          label: t("bids_placed"),
          icon: Activity,
          value: (row) => (row.bids?.length ?? 0).toLocaleString(),
        },
      ],

      tabs: [
        { id: "overview", title: tCommon("overview"), icon: Tag },
        { id: "bidding", title: t("bidding"), icon: Gavel },
        { id: "timeline", title: tCommon("timeline"), icon: Clock },
      ],

      sections: [
        {
          id: "parties",
          tab: "overview",
          title: t("seller_asset"),
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
            {
              key: "tokenId",
              title: t("token_record_id"),
              icon: Hash,
              copyable: true,
              render: (_value, row) => <MonoValue value={row.tokenId} />,
            },
            {
              key: "id",
              title: t("auction_id"),
              icon: Hash,
              copyable: true,
              render: (_value, row) => <MonoValue value={row.id} />,
            },
          ],
        },
        {
          id: "engagement",
          tab: "overview",
          title: t("engagement"),
          icon: Eye,
          columns: 2,
          fields: [
            {
              key: "views",
              title: tCommon("views"),
              icon: Eye,
              render: (_value, row) => (Number(row.views) || 0).toLocaleString(),
            },
            {
              key: "likes",
              title: t("likes"),
              icon: Heart,
              render: (_value, row) => (Number(row.likes) || 0).toLocaleString(),
            },
          ],
        },
        {
          id: "terms",
          tab: "bidding",
          title: t("auction_terms"),
          icon: Gavel,
          columns: 3,
          fields: [
            {
              key: "currency",
              title: tCommon("currency"),
              icon: Coins,
              render: (_value, row) => row.currency || "—",
            },
            {
              key: "startingBid",
              title: t("starting_bid"),
              icon: Gavel,
              render: (_value, row) =>
                formatAmount(row.startingBid, row.currency) ?? "—",
            },
            {
              key: "minBidIncrement",
              title: t("min_bid_increment"),
              icon: TrendingUp,
              render: (_value, row) =>
                formatAmount(row.minBidIncrement, row.currency) ?? "—",
            },
            {
              key: "buyNowPrice",
              title: tExt("buy_now_price"),
              icon: DollarSign,
              render: (_value, row) =>
                formatAmount(row.buyNowPrice, row.currency) ?? "—",
            },
          ],
        },
        {
          id: "bids",
          tab: "bidding",
          title: tCommon("bid_history"),
          icon: Activity,
          description: t("highest_bid_first"),
          condition: (row) => Boolean(row.bids?.length),
          render: (row) => {
            const bids = [...(row.bids ?? [])].sort(
              (a: any, b: any) => Number(b.amount) - Number(a.amount)
            );
            const shown = bids.slice(0, 12);
            return (
              <div className="space-y-2">
                {shown.map((bid: any, index: number) => (
                  <div
                    key={bid.id ?? index}
                    className="flex items-center justify-between gap-4 rounded-lg border border-border p-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium break-words">
                        {formatAmount(bid.amount, bid.currency || row.currency) ??
                          "—"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatDateTime(bid.createdAt)}
                      </p>
                    </div>
                    {index === 0 && (
                      <Badge tone="success" appearance="soft">
                        Highest
                      </Badge>
                    )}
                  </div>
                ))}
                {bids.length > shown.length && (
                  <p className="text-xs text-muted-foreground">
                    {`+${bids.length - shown.length} more bids`}
                  </p>
                )}
              </div>
            );
          },
        },
        {
          id: "schedule",
          tab: "timeline",
          title: t("schedule"),
          icon: Clock,
          columns: 2,
          fields: [
            { key: "startTime" },
            { key: "endTime" },
            {
              key: "endedAt",
              title: t("ended_at"),
              icon: Clock,
              condition: (row) => Boolean(row.endedAt),
              render: (_value, row) => formatDateTime(row.endedAt),
            },
            {
              key: "soldAt",
              title: t("sold_at"),
              icon: Clock,
              condition: (row) => Boolean(row.soldAt),
              render: (_value, row) => formatDateTime(row.soldAt),
            },
            {
              key: "cancelledAt",
              title: t("cancelled_at"),
              icon: Clock,
              condition: (row) => Boolean(row.cancelledAt),
              render: (_value, row) => formatDateTime(row.cancelledAt),
            },
          ],
        },
        {
          id: "settlement",
          tab: "timeline",
          title: tCommon("settlement"),
          icon: Wallet,
          columns: 2,
          condition: (row) =>
            Boolean(row.auctionContractAddress || row.settlementBlockedAt),
          fields: [
            {
              key: "auctionContractAddress",
              title: t("auction_contract"),
              icon: Wallet,
              copyable: true,
              condition: (row) => Boolean(row.auctionContractAddress),
              render: (_value, row) => (
                <MonoValue value={row.auctionContractAddress} />
              ),
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
          fields: ["createdAt", "updatedAt"],
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
