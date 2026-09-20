"use client";

import React from "react";
import { format } from "date-fns";
import { HandHeart, User, DollarSign, Clock, Calendar, Tag, Power, Coins, Hash, Link2, MessageSquare, ShieldAlert } from "lucide-react";
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
    description: t("unique_identifier_for_this_nft_purchase_offer"),
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
    description: t("digital_artwork_or_collectible_that_received"),
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
    description: t("current_offer_state_pending_review_accepted"),
    options: [
      { value: "PENDING", label: tCommon("pending") },
      { value: "ACCEPTED", label: t("accepted") },
      { value: "REJECTED", label: tCommon("rejected") },
      { value: "EXPIRED", label: tCommon("expired") },
      { value: "CANCELLED", label: tCommon("cancelled") }
    ],
    render: {
      type: "badge",
      // Hue resolves centrally through `lib/status-tone.ts`; do not re-add a
      // local `variant` here (ACCEPTED is aliased to APPROVED there).
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
    description: t("toggle_to_disable_or_re_enable_this_offer"),
    priority: 1,
    render: {
      type: "custom",
      render: createNftStatusToggleCell((_value, row) => row?.status === "ACTIVE"),
    },
  },
  {
    key: "offerer",
    title: t("offerer"),
    type: "compound",
    sortable: true,
    searchable: true,
    filterable: true,
    icon: User,
    description: t("buyer_who_submitted_this_purchase_offer"),
    priority: 2,
    sortKey: "offerer.firstName",
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
    key: "amount",
    title: tCommon("offer_amount"),
    type: "number",
    sortable: true,
    filterable: true,
    icon: DollarSign,
    description: t("proposed_purchase_price_in_selected_cryptocurrency"),
    priority: 1,
    render: {
      type: "number",
      format: { style: "currency", currency: "USD" }
    }
  },
  {
    key: "currency",
    title: tCommon("currency"),
    type: "select",
    sortable: true,
    filterable: true,
    description: t("cryptocurrency_or_token_used_for_this_offer"),
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
    key: "type",
    title: tCommon("type"),
    type: "select",
    sortable: true,
    filterable: true,
    icon: HandHeart,
    description: t("offer_category_standard_offer_auction_bid"),
    options: [
      { value: "OFFER", label: tExt("offer"), color: "default" },
      { value: "BID", label: tCommon("bid"), color: "secondary" },
      { value: "COUNTER_OFFER", label: t("counter_offer"), color: "outline" }
    ],
    render: {
      type: "badge",
      config: {
        variant: (value) => {
          const variants = {
            OFFER: "default",
            BID: "secondary",
            COUNTER_OFFER: "muted"
          };
          return variants[value] || "secondary";
        }
      }
    },
    priority: 2
  },
  {
    key: "expiresAt",
    title: t("expires_at"),
    type: "date",
    sortable: true,
    filterable: true,
    icon: Clock,
    description: t("expiration_date_and_time_when_offer"),
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
    description: t("when_this_offer_was_initially_submitted"),
    render: {
      type: "date",
      format: "MMM dd, yyyy"
    },
    priority: 2
  },
  {
    key: "updatedAt",
    title: tCommon("updated"),
    type: "date",
    sortable: true,
    filterable: true,
    icon: Calendar,
    description: t("most_recent_update_to_offer_status_or_details"),
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
 * An offer is a short record with a long history: the money never changes, but
 * it is accepted, rejected, cancelled, expired or flagged, each stamped on its
 * own column. Those stamps are rendered as one timeline instead of five tiles
 * that are empty on every row but one.
 *
 * The offerer is read off `row.user`, which is what `/api/admin/nft/offer`
 * actually joins. The table's `offerer` column has no backing field. See the
 * report.
 * ----------------------------------------------------------------------- */

function formatOfferAmount(value: any, currency?: string): string {
  if (value === null || value === undefined || value === "") return "—";
  const amount = Number(value);
  if (Number.isNaN(amount)) return "—";
  const formatted =
    amount > 0 && amount < 0.01
      ? amount.toFixed(8).replace(/\.?0+$/, "")
      : amount.toFixed(4).replace(/\.?0+$/, "");
  return currency ? `${formatted} ${currency}` : formatted;
}

function formatOfferDate(value: any): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : format(date, "MMM d, yyyy HH:mm");
}

const OFFER_SCOPE_LABEL: Record<string, string> = {
  TOKEN: "Single token",
  COLLECTION: "Collection-wide",
};

export function useViewConfig(): ViewConfig {
  const t = useTranslations("ext_admin");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  return React.useMemo<ViewConfig>(
    () => ({
      size: "3xl",

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
              {row.token?.name || t("collection_offer")}
            </span>
            <span className="block truncate text-sm font-normal text-muted-foreground">
              {row.token?.tokenId ? t("token", { tokenId: String(row.token.tokenId) }) : t("no_token_attached")}
            </span>
          </span>
        </div>
      ),

      badges: (row) => (
        <>
          <Badge tone={statusTone(row.status)} appearance="soft">
            {statusLabel(row.status) || tCommon("unknown")}
          </Badge>
          {row.flaggedAt && (
            <Badge tone="destructive" appearance="soft">
              <ShieldAlert className="h-3 w-3" />
              Flagged
            </Badge>
          )}
        </>
      ),

      stats: [
        {
          label: tCommon("offer_amount"),
          icon: DollarSign,
          tone: "primary",
          value: (row) => formatOfferAmount(row.amount, row.currency),
        },
        {
          label: tCommon("scope"),
          icon: HandHeart,
          value: (row) => OFFER_SCOPE_LABEL[row.type] || row.type || "—",
        },
        {
          label: tCommon("expires"),
          icon: Clock,
          value: (row) =>
            row.expiresAt ? formatOfferDate(row.expiresAt) : "No expiry",
        },
      ],

      sections: [
        {
          id: "offerer",
          title: t("offerer"),
          icon: User,
          columns: 2,
          fields: [
            {
              key: "userId",
              title: t("offered_by"),
              icon: User,
              fullWidth: true,
              copyable: true,
              render: (_value, row) => {
                const user = row.user;
                if (!user) {
                  return <span className="text-muted-foreground">{t("unknown_user")}</span>;
                }
                const name =
                  [user.firstName, user.lastName].filter(Boolean).join(" ") ||
                  user.email ||
                  user.id;
                return (
                  <span className="flex items-center gap-3 min-w-0">
                    <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full border border-border bg-muted">
                      {user.avatar ? (
                        <img
                          src={user.avatar}
                          alt={name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center">
                          <User className="h-4 w-4 text-muted-foreground" />
                        </span>
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{name}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {user.email}
                      </span>
                    </span>
                  </span>
                );
              },
            },
            {
              key: "sellerId",
              title: tCommon("accepted_by"),
              icon: User,
              condition: (row) => Boolean(row.sellerId),
              copyable: true,
              render: (_value, row) => (
                <span className="font-mono text-xs break-all">{row.sellerId}</span>
              ),
            },
          ],
        },
        {
          id: "terms",
          title: t("offer_terms"),
          icon: HandHeart,
          columns: 2,
          fields: [
            { key: "currency", icon: Coins },
            {
              // `emptyText` rather than a fallback inside `render` — DetailField
              // short-circuits an empty value to the placeholder before the
              // renderer runs, so the fallback would never be reached.
              // `render` is still required: no column backs this key, and a
              // field with neither a column nor a renderer is dropped outright.
              key: "message",
              title: tCommon("message"),
              icon: MessageSquare,
              fullWidth: true,
              emptyText: t("no_message"),
              render: (_value, row) => row.message,
            },
          ],
        },
        {
          id: "links",
          title: t("linked_records"),
          icon: Link2,
          columns: 3,
          fields: [
            {
              key: "tokenId",
              title: tExt("token_id"),
              icon: Hash,
              copyable: true,
              condition: (row) => Boolean(row.tokenId),
              render: (_value, row) => (
                <span className="font-mono text-xs break-all">{row.tokenId}</span>
              ),
            },
            {
              key: "collectionId",
              title: t("collection_id"),
              icon: Hash,
              copyable: true,
              condition: (row) => Boolean(row.collectionId),
              render: (_value, row) => (
                <span className="font-mono text-xs break-all">
                  {row.collectionId}
                </span>
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
        {
          id: "lifecycle",
          title: t("lifecycle"),
          icon: Clock,
          render: (row) => {
            const steps: { label: string; at: any; tone: string }[] = [
              { label: tCommon("submitted"), at: row.createdAt, tone: "text-muted-foreground" },
              { label: t("accepted"), at: row.acceptedAt, tone: "text-success" },
              { label: tCommon("rejected"), at: row.rejectedAt, tone: "text-destructive" },
              { label: tCommon("cancelled"), at: row.cancelledAt, tone: "text-muted-foreground" },
              { label: tCommon("expired"), at: row.expiredAt, tone: "text-warning" },
              { label: t("flagged_for_review"), at: row.flaggedAt, tone: "text-destructive" },
            ].filter((step) => Boolean(step.at));

            if (!steps.length) {
              return (
                <p className="text-sm text-muted-foreground">
                  {t("no_lifecycle_events_recorded")}
                </p>
              );
            }

            return (
              <div className="space-y-2">
                {steps.map((step) => (
                  <div
                    key={step.label}
                    className="flex items-center justify-between gap-4 rounded-lg border border-border p-3"
                  >
                    <span className={`text-sm font-medium ${step.tone}`}>
                      {step.label}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatOfferDate(step.at)}
                    </span>
                  </div>
                ))}
              </div>
            );
          },
        },
        {
          id: "record",
          title: tCommon("record"),
          icon: Calendar,
          columns: 2,
          collapsible: true,
          defaultCollapsed: true,
          fields: [
            {
              key: "id",
              title: t("offer_id"),
              icon: Hash,
              copyable: true,
              render: (_value, row) => (
                <span className="font-mono text-xs break-all">{row.id}</span>
              ),
            },
            { key: "updatedAt" },
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
  return {
    edit: {
      title: tCommon("edit_offer"),
      description: t("modify_offer_amount_currency_status_and"),
      groups: [
        {
          id: "offer-details",
          title: tCommon("offer_details"),
          icon: HandHeart,
          priority: 1,
          fields: [
            { key: "amount", required: true, min: 0 },
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
            {
              key: "type",
              required: false,
              options: [
                { value: "TOKEN", label: tCommon("token") },
                { value: "COLLECTION", label: tCommon("collection") }
              ]
            },
          ]
        },
        {
          id: "offer-status",
          title: t("status_expiration"),
          icon: Clock,
          priority: 2,
          fields: [
            {
              key: "status",
              required: true,
              options: [
                { value: "ACTIVE", label: tCommon("active") },
                { value: "ACCEPTED", label: t("accepted") },
                { value: "REJECTED", label: tCommon("rejected") },
                { value: "EXPIRED", label: tCommon("expired") },
                { value: "CANCELLED", label: tCommon("cancelled") }
              ]
            },
            { key: "expiresAt", required: false },
          ]
        },
      ]
    }
  } as FormConfig;
}
