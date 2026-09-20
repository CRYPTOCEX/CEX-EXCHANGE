"use client";

import React from "react";
import { Users, Shield, Package, DollarSign, TrendingUp, Eye, User, Power, Award, Calendar, Hash, Mail, Image as ImageIcon } from "lucide-react";
import type { FormConfig, ViewConfig } from "@/components/blocks/data-table/types/table";
import { Badge } from "@/components/ui/badge";
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
      title: tCommon("creator"),
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
      key: "_statusToggle",
      title: tCommon("active"),
      type: "text",
      icon: Power,
      sortable: false,
      searchable: false,
      filterable: false,
      description: t("toggle_to_disable_hide_or_re_enable_this_creator"),
      priority: 1,
      render: {
        type: "custom",
        render: createNftStatusToggleCell((_value, row) => row?.profilePublic !== false),
      },
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
          false: { label: tCommon("unverified"), variant: "secondary", icon: "XCircle" }
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
      title: "NFTs",
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
      title: tCommon("sales"),
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

/* --------------------------------------------------------------------------
 * View dialog
 *
 * A creator record is an identity plus four lifetime figures. The figures go
 * in the stat strip (that is what an operator opens the row for), the standing
 * flags go in the header as pills, and the body is left to the identity and
 * the profile copy.
 * ----------------------------------------------------------------------- */

/** Tier is a reputation ladder, so the pill climbs with it. */
const TIER_TONE: Record<string, "neutral" | "info" | "warning" | "success"> = {
  BRONZE: "neutral",
  SILVER: "info",
  GOLD: "warning",
  PLATINUM: "success",
};

function formatUsd(value: any): string {
  const amount = Number(value);
  if (value === null || value === undefined || value === "" || Number.isNaN(amount)) {
    return "—";
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatCount(value: any): string {
  const amount = Number(value);
  if (value === null || value === undefined || value === "" || Number.isNaN(amount)) {
    return "0";
  }
  return new Intl.NumberFormat("en-US").format(amount);
}

export function useViewConfig(): ViewConfig {
  const t = useTranslations("ext_admin");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  return React.useMemo<ViewConfig>(
    () => ({
      size: "3xl",

      title: (row) => {
        const name =
          row.displayName ||
          [row.user?.firstName, row.user?.lastName].filter(Boolean).join(" ") ||
          "Unnamed creator";
        return (
          <div className="flex items-center gap-3">
            <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full border border-border bg-muted">
              {row.user?.avatar ? (
                <img
                  src={row.user.avatar}
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
              <span className="block truncate text-lg font-semibold text-foreground">
                {name}
              </span>
              <span className="block truncate text-sm font-normal text-muted-foreground">
                {row.user?.email || ""}
              </span>
            </span>
          </div>
        );
      },

      badges: (row) => (
        <>
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
          {row.verificationTier && (
            <Badge
              tone={TIER_TONE[row.verificationTier] ?? "neutral"}
              appearance="soft"
            >
              <Award className="h-3 w-3" />
              {row.verificationTier.charAt(0) +
                row.verificationTier.slice(1).toLowerCase()}
            </Badge>
          )}
          {row.profilePublic === false && (
            <Badge tone="warning" appearance="soft">
              {t("private_profile")}
            </Badge>
          )}
        </>
      ),

      stats: [
        {
          label: tExt("nfts_created"),
          icon: Package,
          value: (row) => formatCount(row.totalItems),
        },
        {
          label: tCommon("sales"),
          icon: TrendingUp,
          value: (row) => formatCount(row.totalSales),
        },
        {
          label: t("lifetime_volume"),
          icon: DollarSign,
          tone: "success",
          value: (row) => formatUsd(row.totalVolume),
        },
        {
          label: tExt("floor_price"),
          icon: DollarSign,
          value: (row) => formatUsd(row.floorPrice),
        },
      ],

      sections: [
        {
          id: "account",
          title: t("linked_account"),
          icon: User,
          columns: 2,
          fields: [
            // NOT `{ key: "user" }`. `user` is this table's only compound, so it
            // is the PRIMARY column — the dialog already renders it as the
            // header plate and `resolveViewSections` drops any field naming it.
            // The platform account behind the creator profile is still worth
            // showing, because `displayName` is a pseudonym that need not match
            // it, so the two parts are read off the joined relation directly.
            {
              // Keyed on `user.firstName` rather than a synthetic `user.name`:
              // DetailField short-circuits an EMPTY raw value to an em dash
              // before `render` ever runs, so a key that resolves to nothing
              // renders nothing no matter what the renderer returns.
              key: "user.firstName",
              title: tCommon("account_name"),
              icon: User,
              render: (_value, row) =>
                [row.user?.firstName, row.user?.lastName]
                  .filter(Boolean)
                  .join(" "),
            },
            {
              // `render` is still required: the compound only registers the
              // bare key `email`, so nothing backs `user.email` and a field with
              // neither a column nor a renderer is dropped outright.
              key: "user.email",
              title: t("account_email"),
              icon: Mail,
              copyable: true,
              render: (_value, row) => row.user?.email,
            },
            {
              key: "userId",
              title: tCommon("user_id"),
              icon: Hash,
              copyable: true,
              render: (_value, row) => (
                <span className="font-mono text-xs break-all">{row.userId}</span>
              ),
            },
            {
              key: "id",
              title: t("creator_id"),
              icon: Hash,
              copyable: true,
              render: (_value, row) => (
                <span className="font-mono text-xs break-all">{row.id}</span>
              ),
            },
          ],
        },
        {
          id: "profile",
          title: tExt("public_profile"),
          icon: Users,
          columns: 2,
          fields: [
            { key: "displayName" },
            { key: "profilePublic", icon: Eye },
            {
              key: "banner",
              title: tExt("banner"),
              icon: ImageIcon,
              fullWidth: true,
              condition: (row) => Boolean(row.banner),
              render: (_value, row) => (
                <span className="block overflow-hidden rounded-md border border-border bg-muted">
                  <img
                    src={String(row.banner)}
                    alt={tExt("creator_banner")}
                    className="h-28 w-full object-cover"
                  />
                </span>
              ),
            },
            {
              key: "bio",
              fullWidth: true,
              emptyText: t("no_bio_provided"),
            },
          ],
        },
        {
          id: "record",
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
              render: (_value, row) =>
                row.updatedAt ? new Date(row.updatedAt).toLocaleString() : "—",
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
                { value: false, label: tCommon("unverified") }
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
