"use client";

import React from "react";
import { format } from "date-fns";
import { ShoppingBag, Package, User, DollarSign, Calendar, Coins, Hash, Link2, Percent, Receipt, Wallet } from 'lucide-react';
import type { ColumnDefinition, ViewConfig } from "@/components/blocks/data-table/types/table";
import { Badge } from "@/components/ui/badge";
import { statusLabel, statusTone } from "@/lib/status-tone";

import { useTranslations } from "next-intl";
export function useColumns() {
  const t = useTranslations("ext_admin");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  return [
  {
    key: "id",
    title: t("sale_id"),
    type: "text",
    sortable: true,
    searchable: true,
    filterable: true,
    icon: ShoppingBag,
    description: t("unique_identifier_for_this_completed_nft"),
    priority: 4,
    expandedOnly: true,
  },
  {
    key: "token",
    title: "NFT",
    type: "compound",
    sortable: true,
    searchable: true,
    filterable: true,
    icon: Package,
    description: t("digital_artwork_or_collectible_that_was_sold"),
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
          description: t("nft_token_image"),
        },
        primary: {
          key: "name",
          title: tCommon("name"),
        },
        secondary: {
          key: "tokenId",
          title: tExt("token_id"),
        },
        metadata: [
          { key: "collection.name", title: tCommon("collection"), type: "text" }
        ]
      }
    }
  },
  {
    key: "price",
    title: tExt("sale_price"),
    type: "number",
    sortable: true,
    searchable: false,
    filterable: true,
    icon: DollarSign,
    description: t("final_transaction_price_paid_for_this_nft"),
    priority: 1,
    render: {
      type: "number",
      format: { style: "currency", currency: "USD" }
    }
  },
  {
    key: "status",
    title: tCommon("status"),
    type: "select",
    sortable: true,
    filterable: true,
    description: t("transaction_status_completed_pending_failed_or"),
    options: [
      { value: "PENDING", label: tCommon("pending") },
      { value: "COMPLETED", label: tCommon("completed") },
      { value: "FAILED", label: tCommon("failed") },
      { value: "CANCELLED", label: tCommon("cancelled") }
    ],
    render: {
      type: "badge",
      config: {
        variant: (value: string) => value === "COMPLETED" ? "success" :
                           value === "PENDING" ? "warning" :
                           value === "FAILED" ? "destructive" : "secondary"
      }
    },
    priority: 1,
  },
  {
    key: "seller",
    title: tCommon("seller"),
    type: "compound",
    sortable: true,
    searchable: true,
    filterable: true,
    icon: User,
    description: t("previous_nft_owner_who_sold_the_asset"),
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
          description: t("sellers_profile_picture"),
        },
        primary: {
          key: ["firstName", "lastName"],
          title: [tCommon("first_name"), tCommon("last_name")],
          icon: User,
        },
        secondary: {
          key: "email",
          title: tCommon("email"),
        }
      }
    }
  },
  {
    key: "buyer",
    title: tExt("buyer"),
    type: "compound",
    sortable: true,
    searchable: true,
    filterable: true,
    icon: User,
    description: t("new_nft_owner_who_purchased_the_asset"),
    priority: 2,
    sortKey: "buyer.firstName",
    render: {
      type: "compound",
      config: {
        image: {
          key: "avatar",
          fallback: "/img/placeholder.svg",
          type: "image",
          title: tCommon("avatar"),
          description: t("buyers_profile_picture"),
        },
        primary: {
          key: ["firstName", "lastName"],
          title: [tCommon("first_name"), tCommon("last_name")],
          icon: User,
        },
        secondary: {
          key: "email",
          title: tCommon("email"),
        }
      }
    }
  },
  {
    key: "createdAt",
    title: t("sale_date"),
    type: "date",
    sortable: true,
    filterable: true,
    icon: Calendar,
    description: t("date_and_time_when_this_sale_was_completed"),
    render: {
      type: "date",
      format: "MMM dd, yyyy HH:mm"
    },
    priority: 2,
  }
] as ColumnDefinition[];
}

/* --------------------------------------------------------------------------
 * View dialog
 *
 * A settled sale is a receipt. The three figures that matter are the gross,
 * the fees taken out of it and what the seller actually received, so those are
 * the stat strip; the section below shows the arithmetic that produced them
 * rather than repeating the same three numbers as tiles.
 * ----------------------------------------------------------------------- */

function formatMoney(value: any, currency?: string): string {
  if (value === null || value === undefined || value === "") return "—";
  const amount = Number(value);
  if (Number.isNaN(amount)) return "—";
  const formatted =
    amount > 0 && amount < 0.01
      ? amount.toFixed(8).replace(/\.?0+$/, "")
      : amount.toFixed(4).replace(/\.?0+$/, "");
  return currency ? `${formatted} ${currency}` : formatted;
}

function formatSaleDate(value: any): string {
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
            {row.token?.image ? (
              <img
                src={row.token.image}
                alt={row.token?.name || "NFT"}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center">
                <Package className="h-4 w-4 text-muted-foreground" />
              </span>
            )}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-lg font-semibold text-foreground">
              {row.token?.name || tExt("untitled_nft")}
            </span>
            <span className="block truncate text-sm font-normal text-muted-foreground">
              {row.token?.tokenId ? t("token", { tokenId: String(row.token.tokenId) }) : t("sale")}
            </span>
          </span>
        </div>
      ),

      badges: (row) => (
        <Badge tone={statusTone(row.status)} appearance="soft">
          {statusLabel(row.status) || tCommon("unknown")}
        </Badge>
      ),

      stats: [
        {
          label: tExt("sale_price"),
          icon: DollarSign,
          value: (row) => formatMoney(row.price, row.currency),
        },
        {
          label: tCommon("total_fees"),
          icon: Percent,
          tone: "warning",
          value: (row) => formatMoney(row.totalFee, row.currency),
        },
        {
          label: t("net_to_seller"),
          icon: Coins,
          tone: "success",
          value: (row) => formatMoney(row.netAmount, row.currency),
        },
        {
          label: tCommon("settled"),
          icon: Calendar,
          value: (row) => formatSaleDate(row.createdAt),
        },
      ],

      sections: [
        {
          id: "parties",
          title: t("parties"),
          icon: User,
          columns: 2,
          fields: [
            { key: "seller" },
            { key: "buyer" },
            {
              key: "sellerId",
              title: t("seller_id"),
              icon: Hash,
              copyable: true,
              render: (_value, row) => (
                <span className="font-mono text-xs break-all">{row.sellerId}</span>
              ),
            },
            {
              key: "buyerId",
              title: t("buyer_id"),
              icon: Hash,
              copyable: true,
              render: (_value, row) => (
                <span className="font-mono text-xs break-all">{row.buyerId}</span>
              ),
            },
          ],
        },
        {
          id: "fees",
          title: tCommon("fee_breakdown"),
          icon: Receipt,
          description: t("how_the_gross_sale_price_was_split"),
          render: (row) => {
            const price = Number(row.price);
            const totalFee = Number(row.totalFee);
            const rate =
              Number.isFinite(price) && price > 0 && Number.isFinite(totalFee)
                ? `${((totalFee / price) * 100).toFixed(2)}%`
                : "—";

            const lines = [
              { label: t("marketplace_fee"), value: formatMoney(row.marketplaceFee, row.currency) },
              { label: t("royalty_fee"), value: formatMoney(row.royaltyFee, row.currency) },
              { label: t("effective_fee_rate"), value: rate },
            ];

            return (
              <div className="rounded-lg border border-border">
                {lines.map((line) => (
                  <div
                    key={line.label}
                    className="flex items-center justify-between gap-4 px-3 py-2.5 border-b border-border/60 last:border-b-0"
                  >
                    <span className="text-xs font-medium text-muted-foreground">
                      {line.label}
                    </span>
                    <span className="text-sm font-medium">{line.value}</span>
                  </div>
                ))}
              </div>
            );
          },
        },
        {
          id: "settlement",
          title: tCommon("settlement"),
          icon: Wallet,
          columns: 3,
          fields: [
            {
              key: "currency",
              title: tCommon("currency"),
              icon: Coins,
              render: (_value, row) => row.currency || "—",
            },
            {
              // A settled sale need not be on chain, and "Off-chain" is the
              // real state — but it has to arrive via `emptyText`, because
              // DetailField resolves an empty value to the placeholder before
              // `render` is consulted.
              // `render` is still required: no column backs this key, and a
              // field with neither a column nor a renderer is dropped outright.
              key: "transactionHash",
              title: tCommon("transaction_hash"),
              icon: Hash,
              copyable: true,
              fullWidth: true,
              emptyText: t("off_chain"),
              render: (_value, row) => (
                <span className="font-mono text-xs break-all">
                  {row.transactionHash}
                </span>
              ),
            },
            {
              key: "blockNumber",
              title: tCommon("block"),
              icon: Wallet,
              condition: (row) => Boolean(row.blockNumber),
              render: (_value, row) =>
                Number(row.blockNumber).toLocaleString(),
            },
          ],
        },
        {
          id: "links",
          title: t("linked_records"),
          icon: Link2,
          columns: 3,
          collapsible: true,
          defaultCollapsed: true,
          fields: [
            {
              key: "id",
              title: t("sale_id"),
              icon: ShoppingBag,
              copyable: true,
              render: (_value, row) => (
                <span className="font-mono text-xs break-all">{row.id}</span>
              ),
            },
            {
              key: "tokenId",
              title: t("token_record_id"),
              icon: Hash,
              copyable: true,
              render: (_value, row) => (
                <span className="font-mono text-xs break-all">{row.tokenId}</span>
              ),
            },
            {
              key: "listingId",
              title: t("listing_id"),
              icon: Hash,
              copyable: true,
              condition: (row) => Boolean(row.listingId),
              render: (_value, row) => (
                <span className="font-mono text-xs break-all">{row.listingId}</span>
              ),
            },
          ],
        },
      ],
    }),
    []
  );
}

// Form configuration - no create/edit forms needed (view-only)
