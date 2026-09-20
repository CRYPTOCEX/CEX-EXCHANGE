"use client";
import React from "react";
import {
  User,
  Mail,
  Shield,
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Calendar,
  Award,
  Percent,
  LineChart,
  Activity,
  AlertTriangle,
  FileText,
  Coins,
  Clock,
  Eye,
  EyeOff,
} from "lucide-react";
import type {
  ColumnDefinition,
  FormConfig,
  ViewConfig,
} from "@/components/blocks/data-table/types/table";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { statusTone, statusLabel } from "@/lib/status-tone";

export function useColumns() {
  const t = useTranslations("ext_admin");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");

  return [
    {
      key: "id",
      title: "ID",
      type: "text",
      icon: Shield,
      sortable: true,
      searchable: true,
      filterable: false,
      description: t("unique_identifier_for_the_leader"),
      priority: 3,
      expandedOnly: true,
    },
    {
      key: "displayName",
      title: tExt("display_name"),
      type: "text",
      icon: Award,
      sortable: true,
      searchable: true,
      filterable: true,
      description: t("leaders_public_display_name"),
      priority: 1,
    },
    {
      key: "user",
      title: tCommon("user"),
      type: "compound",
      icon: User,
      sortable: true,
      searchable: true,
      filterable: true,
      description: t("account_owner_information"),
      render: {
        type: "compound",
        config: {
          image: {
            key: "avatar",
            fallback: "/img/placeholder.svg",
            type: "image",
            title: tCommon("avatar"),
          },
          primary: {
            key: ["firstName", "lastName"],
            title: [tCommon("first_name"), tCommon("last_name")],
            icon: User,
          },
          secondary: {
            key: "email",
            title: tCommon("email"),
            icon: Mail,
          },
        },
      },
      priority: 1,
    },
    {
      key: "status",
      title: tCommon("status"),
      type: "select",
      icon: Shield,
      sortable: true,
      searchable: false,
      filterable: true,
      description: t("current_status_of_the_leader"),
      options: [
        { value: "PENDING", label: tCommon("pending") },
        { value: "ACTIVE", label: tCommon("active") },
        { value: "SUSPENDED", label: tCommon("suspended") },
        { value: "REJECTED", label: tCommon("rejected") },
        { value: "INACTIVE", label: tCommon("inactive") },
      ],
      render: {
        type: "badge",
        // Hue resolves centrally through `lib/status-tone.ts`; do not re-add a
        // local `variant` here.
        config: {},
      },
      priority: 1,
    },
    {
      key: "tradingType",
      title: tExt("trading_type"),
      type: "select",
      icon: LineChart,
      sortable: true,
      searchable: false,
      filterable: true,
      description: t("trading_class_the_leader_offers_spot"),
      options: [
        { value: "SPOT", label: tCommon("spot"), color: "info" },
        { value: "BINARY", label: tCommon("binary"), color: "warning" },
        { value: "BOTH", label: tCommon("both"), color: "success" },
      ],
      render: {
        type: "badge",
        config: {
          variant: (value: string) => {
            switch (value) {
              case "SPOT":
                return "info";
              case "BINARY":
                return "warning";
              case "BOTH":
                return "success";
              default:
                return "secondary";
            }
          },
        },
      },
      priority: 1,
    },
    {
      key: "winRate",
      title: tCommon("win_rate"),
      type: "number",
      icon: Percent,
      sortable: true,
      searchable: false,
      filterable: true,
      description: t("percentage_of_winning_trades"),
      priority: 1,
      render: {
        type: "custom",
        render: (value: number) => `${value?.toFixed(1) || 0}%`,
      },
    },
    {
      key: "roi",
      title: "ROI",
      type: "number",
      icon: TrendingUp,
      sortable: true,
      searchable: false,
      filterable: true,
      description: t("return_on_investment_percentage"),
      priority: 1,
      render: {
        type: "custom",
        render: (value: number) => {
          const formatted = `${value >= 0 ? "+" : ""}${value?.toFixed(2) || 0}%`;
          const color = value >= 0 ? "text-success" : "text-danger";
          return <span className={color}>{formatted}</span>;
        },
      },
    },
    {
      key: "totalFollowers",
      title: tExt("followers"),
      type: "number",
      icon: Users,
      sortable: true,
      searchable: false,
      filterable: true,
      description: t("total_number_of_followers"),
      priority: 2,
    },
    {
      key: "marketsCount",
      title: tCommon("markets"),
      type: "number",
      icon: LineChart,
      sortable: false,
      searchable: false,
      filterable: false,
      description: t("number_of_markets_declared_for_trading"),
      priority: 1,
      render: {
        type: "custom",
        render: (_: any, row: any) => {
          const markets = row?.markets || [];
          const activeCount = markets.filter((m: any) => m.isActive).length;
          return `${activeCount} market${activeCount !== 1 ? "s" : ""}`;
        },
      },
    },
    {
      key: "totalVolume",
      title: tCommon("total_volume"),
      type: "number",
      icon: DollarSign,
      sortable: true,
      searchable: false,
      filterable: true,
      description: t("total_trading_volume"),
      priority: 2,
      render: {
        type: "custom",
        render: (value: number) => `$${(value || 0).toLocaleString()}`,
      },
    },
    {
      key: "createdAt",
      title: t("applied_date"),
      type: "date",
      icon: Calendar,
      sortable: true,
      searchable: false,
      filterable: true,
      description: t("date_when_leader_applied"),
      priority: 2,
      render: {
        type: "date",
        format: "PP",
      },
    },
  ] as ColumnDefinition[];
}

/* -------------------------------------------------------------------------- *
 * View dialog
 *
 * A leader is three records wearing one row: an APPLICATION (who applied, with
 * what note, approved or rejected and why), a PUBLIC PROFILE (display name, bio,
 * style, risk, the terms a follower signs up to), and a TRACK RECORD (the
 * on-demand stats plus the markets they actually declared).
 *
 * The table shows the third one and half of the second. `bio`, `tradingStyle`,
 * `riskLevel`, `profitSharePercent`, `minFollowAmount`, `maxFollowers`,
 * `isPublic`, `applicationNote` and `rejectionReason` have no column at all, and
 * `markets` — the list the leader is allowed to trade in — was reduced to the
 * single number "3 markets". The rejection reason is the one an operator most
 * often opens a REJECTED leader to read, and it was unreachable.
 *
 * Three tabs rather than one long scroll, because those three facets are what
 * an operator arrives with: judging an application, checking a profile, or
 * auditing what is being copied.
 * -------------------------------------------------------------------------- */

function ownerName(row: any): string {
  return [row?.user?.firstName, row?.user?.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
}

function signedInk(value: number): string {
  return value >= 0 ? "text-success" : "text-destructive";
}

/** Plain quantity. These are summed across markets, so no currency is asserted. */
function quantity(value: any, digits = 2): string {
  return Number(value ?? 0).toLocaleString(undefined, {
    maximumFractionDigits: digits,
  });
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
          <Avatar className="size-11 border border-border">
            <AvatarImage
              src={row.avatar || row.user?.avatar || undefined}
              alt={row.displayName || tCommon("leader")}
            />
            <AvatarFallback className="text-sm font-semibold">
              {String(row.displayName || "?")
                .charAt(0)
                .toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="min-w-0">
            <span className="block truncate text-lg font-semibold text-foreground">
              {row.displayName || `#${row.id}`}
            </span>
            <span className="block truncate text-sm font-normal text-muted-foreground">
              {ownerName(row) || row.user?.email || ""}
            </span>
          </span>
        </div>
      ),

      badges: (row) => (
        <>
          <Badge tone={statusTone(row.status)} appearance="soft">
            {statusLabel(row.status)}
          </Badge>
          <Badge tone="neutral" appearance="soft">
            {statusLabel(row.tradingType)}
          </Badge>
          {/* Only the exception is flagged. Public is the default, so a "Public"
              pill on every row would say nothing; a hidden leader explains a
              profile nobody can find. */}
          {row.isPublic === false && (
            <Badge tone="warning" appearance="soft">
              <EyeOff className="h-3 w-3" />
              Hidden
            </Badge>
          )}
        </>
      ),

      stats: [
        {
          label: "ROI",
          icon: TrendingUp,
          // `tone` is fixed per stat while this figure changes sign per row, so
          // the ink is chosen inside the value.
          value: (row) => {
            const roi = Number(row.roi ?? 0);
            const Icon = roi >= 0 ? TrendingUp : TrendingDown;
            return (
              <span className={`flex items-center gap-1 ${signedInk(roi)}`}>
                <Icon className="h-4 w-4 shrink-0" />
                {roi >= 0 ? "+" : ""}
                {roi.toFixed(2)}%
              </span>
            );
          },
        },
        {
          label: tCommon("win_rate"),
          icon: Percent,
          value: (row) => `${Number(row.winRate ?? 0).toFixed(1)}%`,
        },
        {
          // Against the CAP, not on its own — "is this leader full?" is the
          // question a bare follower count cannot answer.
          label: t("followers_cap"),
          icon: Users,
          value: (row) =>
            `${Number(row.totalFollowers ?? 0).toLocaleString()} / ${Number(
              row.maxFollowers ?? 0
            ).toLocaleString()}`,
        },
        {
          label: tCommon("volume"),
          icon: DollarSign,
          value: (row) => (
            <span className="font-mono tabular-nums">
              {quantity(row.totalVolume)}
            </span>
          ),
        },
      ],

      tabs: [
        { id: "profile", title: tCommon("profile"), icon: Award },
        { id: "markets", title: tCommon("markets"), icon: LineChart },
        {
          id: "application",
          title: t("application"),
          icon: FileText,
          // Nothing to review on a leader who was approved without a note.
          condition: (row) =>
            Boolean(row.applicationNote || row.rejectionReason),
        },
      ],

      sections: [
        {
          id: "owner",
          tab: "profile",
          title: t("account_owner"),
          icon: User,
          columns: 3,
          priority: 1,
          fields: [
            {
              key: "userId",
              title: tCommon("name"),
              icon: User,
              render: (_value, row) => (
                <span className="break-words">
                  {ownerName(row) || row.user?.email || "—"}
                </span>
              ),
            },
            {
              key: "user.email",
              title: tCommon("email"),
              icon: Mail,
              copyable: true,
              render: (value) => (
                <span className="break-all">{String(value)}</span>
              ),
            },
            {
              key: "user.id",
              title: tCommon("user_id"),
              icon: Shield,
              copyable: true,
              render: (value) => (
                <span className="font-mono text-xs break-all">
                  {String(value)}
                </span>
              ),
            },
          ],
        },
        {
          id: "profile",
          tab: "profile",
          title: tExt("public_profile"),
          description: t("what_a_prospective_follower_sees_before"),
          icon: Award,
          columns: 3,
          priority: 2,
          fields: [
            {
              key: "tradingStyle",
              title: tExt("trading_style"),
              icon: Activity,
              render: (value) => (
                <span>{statusLabel(String(value))}</span>
              ),
            },
            {
              key: "riskLevel",
              title: tCommon("risk_level"),
              icon: AlertTriangle,
              render: (value) => (
                <Badge tone={statusTone(value)} appearance="outline">
                  {statusLabel(String(value))}
                </Badge>
              ),
            },
            {
              key: "isPublic",
              title: tCommon("visibility"),
              icon: Eye,
              render: (value) => (
                <span className="flex items-center gap-1.5">
                  {value === false ? (
                    <EyeOff className="h-3.5 w-3.5 text-warning" />
                  ) : (
                    <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                  {value === false ? t("hidden_from_the_leaderboard") : t("listed_publicly")}
                </span>
              ),
            },
            {
              key: "bio",
              title: tCommon("bio"),
              icon: FileText,
              fullWidth: true,
              emptyText: t("no_bio_written"),
              render: (value) => (
                <span className="break-words">{String(value)}</span>
              ),
            },
          ],
        },
        {
          id: "terms",
          tab: "profile",
          title: t("follow_terms"),
          description:
            t("the_deal_a_follower_accepts_what"),
          icon: Coins,
          columns: 2,
          priority: 3,
          // The follower CAP is deliberately absent here: it is already the
          // denominator of the "Followers / Cap" stat above.
          fields: [
            {
              key: "profitSharePercent",
              title: tCommon("profit_share"),
              icon: Percent,
              render: (value) => (
                <span className="font-mono tabular-nums">
                  {Number(value ?? 0)}%
                </span>
              ),
            },
            {
              key: "minFollowAmount",
              title: tExt("minimum_follow_amount"),
              icon: DollarSign,
              render: (value) => (
                <span className="font-mono tabular-nums">
                  {quantity(value)}
                </span>
              ),
            },
          ],
        },
        {
          id: "performance",
          tab: "profile",
          title: t("track_record"),
          icon: Activity,
          columns: 2,
          priority: 4,
          fields: [
            {
              key: "totalTrades",
              title: t("trades_copied"),
              icon: Activity,
              render: (value) => (
                <span className="font-mono tabular-nums">
                  {Number(value ?? 0).toLocaleString()}
                </span>
              ),
            },
            {
              key: "totalProfit",
              title: tCommon("net_profit"),
              icon: TrendingUp,
              render: (value) => {
                const profit = Number(value ?? 0);
                return (
                  <span className={`font-mono tabular-nums ${signedInk(profit)}`}>
                    {profit >= 0 ? "+" : ""}
                    {quantity(profit)}
                  </span>
                );
              },
            },
          ],
        },
        {
          id: "reference",
          tab: "profile",
          title: tCommon("reference"),
          icon: Clock,
          columns: 2,
          priority: 5,
          fields: [
            { key: "createdAt", title: t("applied_1"), icon: Calendar },
            { key: "id", title: t("leader_id"), icon: Shield, copyable: true },
          ],
        },
        {
          id: "markets",
          tab: "markets",
          title: t("declared_markets"),
          description:
            t("the_instruments_this_leader_may_trade"),
          icon: LineChart,
          priority: 1,
          /* No `condition`: a leader with no markets is a real and important
             state — an approved leader nobody can actually copy — so it gets a
             sentence rather than a vanished section. */
          render: (row) => {
            const markets: any[] = row.markets ?? [];
            if (!markets.length) {
              return (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  {t("no_markets_declared_nothing_this_leader")}
                </p>
              );
            }
            return (
              <div className="space-y-2">
                {markets.map((market, index) => (
                  <div
                    key={market.id ?? index}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono text-sm font-medium">
                        {market.symbol}
                      </span>
                      <Badge
                        tone={market.marketType === "BINARY" ? "warning" : "info"}
                        appearance="soft"
                      >
                        {market.marketType}
                      </Badge>
                      {market.isActive === false && (
                        <Badge tone="neutral" appearance="soft">
                          Inactive
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      <div className="text-end">
                        <p className="text-muted-foreground">
                          Min {market.baseCurrency}
                        </p>
                        <p className="font-mono tabular-nums">
                          {quantity(market.minBase, 8)}
                        </p>
                      </div>
                      <div className="text-end">
                        <p className="text-muted-foreground">
                          Min {market.quoteCurrency}
                        </p>
                        <p className="font-mono tabular-nums">
                          {quantity(market.minQuote, 8)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            );
          },
        },
        {
          id: "application",
          tab: "application",
          title: t("application_review"),
          icon: FileText,
          columns: 1,
          priority: 1,
          fields: [
            /* `condition`, not `hideEmpty`. The latter is declared on
               ViewFieldConfig but nothing reads it, so it would have left an
               em-dash tile captioned "Rejection Reason" on every approved
               leader — a reading of the record that is simply false. A section
               whose fields all condition away is dropped whole. */
            {
              key: "applicationNote",
              title: t("applicants_note"),
              icon: FileText,
              fullWidth: true,
              condition: (row) => Boolean(row.applicationNote),
              render: (value) => (
                <span className="break-words">{String(value)}</span>
              ),
            },
            {
              key: "rejectionReason",
              title: tCommon("rejection_reason"),
              icon: AlertTriangle,
              fullWidth: true,
              condition: (row) => Boolean(row.rejectionReason),
              render: (value) => (
                <span className="break-words text-destructive">
                  {String(value)}
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

export function useFormConfig() {
  const t = useTranslations("ext_admin");
  const tCommon = useTranslations("common");

  return {
    edit: {
      title: t("edit_leader"),
      description: t("update_leader_settings"),
      groups: [
        {
          id: "leader-info",
          title: t("leader_information"),
          icon: Award,
          priority: 1,
          fields: [
            { key: "displayName", required: true },
            {
              key: "status",
              required: true,
              options: [
                { value: "PENDING", label: tCommon("pending") },
                { value: "ACTIVE", label: tCommon("active") },
                { value: "SUSPENDED", label: tCommon("suspended") },
                { value: "REJECTED", label: tCommon("rejected") },
                { value: "INACTIVE", label: tCommon("inactive") },
              ],
            },
          ],
        },
      ],
    },
  } as FormConfig;
}
