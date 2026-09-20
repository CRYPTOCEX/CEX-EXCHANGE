"use client";
import React from "react";
import {
  User,
  Mail,
  Shield,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Award,
  Percent,
  Target,
  AlertTriangle,
  Activity,
  SlidersHorizontal,
  Wallet,
  Clock,
} from "lucide-react";
import type {
  ColumnDefinition,
  FormConfig,
  ViewConfig,
} from "@/components/blocks/data-table/types/table";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { statusTone, statusLabel } from "@/lib/status-tone";
import { formatMoney } from "@/utils/currency";

/**
 * A follower's P&L IS NOT DOLLARS. It settles in the quote asset of whatever
 * market the leader trades, and the row says which in `profitCurrency` — this
 * cell printed a bare `12.34` for a follower whose gains were 12.34 ETH.
 *
 * Eight decimals at the top end because 0.004 BTC (~$260) is a real balance
 * that `toFixed(2)` renders as 0.00; two at the bottom so a USDT figure still
 * reads as money. `formatMoney` keeps a non-ISO ticker as "USDT 12.34" instead
 * of forcing it through a "$".
 */
function profitFigure(value: number, currency?: string): string {
  return formatMoney(value, currency || "USD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 8,
  });
}

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
      description: t("unique_identifier_for_the_subscription"),
      priority: 3,
      expandedOnly: true,
    },
    {
      key: "follower",
      title: t("follower"),
      type: "compound",
      icon: User,
      sortable: true,
      searchable: true,
      filterable: true,
      description: t("follower_user_information"),
      render: {
        type: "compound",
        config: {
          image: {
            key: "user.avatar",
            fallback: "/img/placeholder.svg",
            type: "image",
            title: tCommon("avatar"),
          },
          primary: {
            key: ["user.firstName", "user.lastName"],
            title: [tCommon("first_name"), tCommon("last_name")],
            icon: User,
          },
          secondary: {
            key: "user.email",
            title: tCommon("email"),
            icon: Mail,
          },
        },
      },
      priority: 1,
    },
    {
      key: "leader",
      title: tCommon("leader"),
      type: "compound",
      icon: Award,
      sortable: true,
      searchable: true,
      filterable: true,
      description: t("leader_being_followed"),
      render: {
        type: "compound",
        config: {
          primary: {
            key: "leader.displayName",
            title: tExt("display_name"),
            icon: Award,
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
      description: t("current_status_of_the_subscription"),
      options: [
        { value: "ACTIVE", label: tCommon("active") },
        { value: "PAUSED", label: tCommon("paused") },
        { value: "STOPPED", label: tCommon("stopped") },
        { value: "PENDING", label: tCommon("pending") },
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
      key: "allocations",
      title: tCommon("markets"),
      type: "text",
      icon: Target,
      sortable: false,
      searchable: false,
      filterable: false,
      description: t("number_of_active_markets"),
      priority: 1,
      render: {
        type: "custom",
        render: (_: any, row: any) => {
          const count = row?.allocations?.filter((a: any) => a.isActive).length || 0;
          return count;
        },
      },
    },
    {
      key: "currentValue",
      title: tExt("current_value"),
      type: "number",
      icon: DollarSign,
      sortable: true,
      searchable: false,
      filterable: true,
      description: t("current_portfolio_value"),
      priority: 2,
      render: {
        type: "custom",
        render: (_: any, row: any) => {
          // Calculate total allocated from base and quote amounts
          const totalValue = row?.allocations?.reduce((sum: number, alloc: any) => {
            return sum + (parseFloat(alloc.baseAmount) || 0) + (parseFloat(alloc.quoteAmount) || 0);
          }, 0) || 0;
          return totalValue.toLocaleString();
        },
      },
    },
    {
      key: "totalProfit",
      title: `${"PnL"}:`,
      type: "number",
      icon: TrendingUp,
      sortable: true,
      searchable: false,
      filterable: true,
      description: t("total_profit_and_loss"),
      priority: 1,
      render: {
        type: "custom",
        render: (value: number, row: any) => {
          const roi = row?.roi || 0;
          const color = value >= 0 ? "text-success" : "text-danger";
          const Icon = value >= 0 ? TrendingUp : TrendingDown;
          // `roiAvailable: false` means the backend could not price part of
          // this follower's profit, so the ratio would be over two different
          // portfolios. A dash, not "0.0%", which reads as flat.
          const roiKnown = row?.roiAvailable !== false;
          return (
            <span className={`flex items-center gap-1 ${color}`}>
              <Icon className="h-3 w-3" />
              {value >= 0 ? "+" : ""}
              {profitFigure(value || 0, row?.profitCurrency)}
              <span className="text-xs opacity-70">
                {roiKnown ? (
                  <>
                    ({roi >= 0 ? "+" : ""}
                    {roi.toFixed(1)}%)
                  </>
                ) : (
                  "(—)"
                )}
              </span>
            </span>
          );
        },
      },
    },
    {
      key: "copyMode",
      title: tCommon("risk"),
      type: "text",
      icon: Target,
      sortable: true,
      searchable: false,
      filterable: true,
      description: t("risk_multiplier_applied_to_trades"),
      priority: 2,
      render: {
        type: "custom",
        render: (value: string, row: any) => {
          if (value === "FIXED_RATIO" && row.fixedRatio) {
            return `${row.fixedRatio}x`;
          }
          return value === "PROPORTIONAL" ? "1x" : "-";
        },
      },
    },
    {
      key: "maxDailyLoss",
      title: tExt("max_daily_loss"),
      type: "number",
      icon: AlertTriangle,
      sortable: true,
      searchable: false,
      filterable: false,
      description: t("maximum_daily_loss_limit"),
      priority: 3,
      expandedOnly: true,
      render: {
        type: "custom",
        render: (value: number) =>
          value ? value.toLocaleString() : "-",
      },
    },
    {
      key: "maxPositionSize",
      title: tExt("max_position_size"),
      type: "number",
      icon: Target,
      sortable: true,
      searchable: false,
      filterable: false,
      description: t("maximum_position_size_limit"),
      priority: 3,
      expandedOnly: true,
      render: {
        type: "custom",
        render: (value: number) =>
          value ? value.toLocaleString() : "-",
      },
    },
    {
      key: "createdAt",
      title: tCommon("started"),
      type: "date",
      icon: Calendar,
      sortable: true,
      searchable: false,
      filterable: true,
      description: t("date_when_subscription_started"),
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
 * A subscription is an EDGE, not a record: it is one user copying one leader
 * under a sizing rule, inside a set of risk limits, with money physically
 * committed per market. The flat grid lost all four of those — it printed
 * "RISK / 1x" beside "MARKETS / 3" and had nowhere at all for the allocations,
 * the sizing parameter the copy mode actually uses, or the stop-loss and
 * take-profit percentages (none of which have a column).
 *
 * The allocations matter most: stopping a subscription does NOT release them,
 * so an operator deciding whether to stop one needs to see what is still
 * committed. That is the one block here that is a `render` rather than fields.
 * -------------------------------------------------------------------------- */

const COPY_MODE_LABELS: Record<string, string> = {
  PROPORTIONAL: "Proportional",
  FIXED_AMOUNT: "Fixed Amount",
  FIXED_RATIO: "Fixed Ratio",
};

/** Amounts here are quote/base asset quantities, not dollars — never prefix `$`. */
function quantity(value: any, digits = 8): string {
  return Number(value ?? 0).toLocaleString(undefined, {
    maximumFractionDigits: digits,
  });
}

function signedInk(value: number): string {
  return value >= 0 ? "text-success" : "text-destructive";
}

export function useViewConfig(): ViewConfig {
  const t = useTranslations("ext_admin");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  return React.useMemo<ViewConfig>(
    () => ({
      size: "4xl",

      title: (row) =>
        [row.user?.firstName, row.user?.lastName].filter(Boolean).join(" ").trim() ||
        row.user?.email ||
        tCommon("subscription"),

      subtitle: (row) =>
        `Copying ${row.leader?.displayName || t("a_leader")}${
          row.user?.email ? ` · ${row.user.email}` : ""
        }`,

      badges: (row) => (
        <>
          <Badge tone={statusTone(row.status)} appearance="soft">
            {statusLabel(row.status)}
          </Badge>
          <Badge tone="neutral" appearance="soft">
            {COPY_MODE_LABELS[row.copyMode] || row.copyMode}
          </Badge>
        </>
      ),

      stats: [
        {
          label: "ROI",
          icon: TrendingUp,
          // `tone` is fixed per stat while this figure changes sign per row, so
          // the ink is chosen inside the value.
          value: (row) => {
            // Withheld rather than shown as 0.00% — see the P&L column.
            if (row.roiAvailable === false) {
              return <span className="text-muted-foreground">—</span>;
            }
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
          label: t("net_p_l"),
          icon: DollarSign,
          value: (row) => {
            const profit = Number(row.totalProfit ?? 0);
            return (
              <span className={signedInk(profit)}>
                {profit >= 0 ? "+" : ""}
                {profitFigure(profit, row.profitCurrency)}
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
          // See health/client.tsx: an ICU placeholder printed as a label.
          label: tCommon("trades"),
          icon: Activity,
          value: (row) => Number(row.totalTrades ?? 0).toLocaleString(),
        },
      ],

      sections: [
        {
          id: "leader",
          title: tCommon("leader"),
          icon: Award,
          columns: 3,
          priority: 1,
          fields: [
            { key: "leader.displayName", title: tCommon("leader"), icon: Award },
            {
              key: "leader.tradingStyle",
              title: tExt("trading_style"),
              icon: Activity,
              render: (value) => (
                <span>{String(value).replace(/_/g, " ")}</span>
              ),
            },
            {
              key: "leader.riskLevel",
              title: tCommon("risk_level"),
              icon: AlertTriangle,
              render: (value) => (
                <Badge tone="neutral" appearance="outline">
                  {String(value)}
                </Badge>
              ),
            },
          ],
        },
        {
          id: "copy-settings",
          title: t("copy_settings"),
          description:
            t("how_each_leader_trade_is_sized"),
          icon: SlidersHorizontal,
          columns: 3,
          priority: 2,
          fields: [
            {
              key: "copyMode",
              title: tExt("copy_mode"),
              icon: Target,
              render: (value) => (
                <span>{COPY_MODE_LABELS[String(value)] || String(value)}</span>
              ),
            },
            {
              key: "fixedAmount",
              title: tCommon("fixed_amount"),
              icon: DollarSign,
              condition: (row) => row.copyMode === "FIXED_AMOUNT",
              render: (value) => (
                <span className="font-mono tabular-nums">{quantity(value)}</span>
              ),
            },
            {
              key: "fixedRatio",
              title: t("fixed_ratio"),
              icon: Percent,
              condition: (row) => row.copyMode === "FIXED_RATIO",
              render: (value) => (
                <span className="font-mono tabular-nums">{Number(value)}x</span>
              ),
            },
          ],
        },
        {
          id: "risk-limits",
          title: t("risk_limits_1"),
          /* All four, always, with "No limit" where one is absent. "No limit
             configured" is the single most important thing a risk panel can
             say, and it is exactly what a hidden-when-null tile suppresses. */
          icon: AlertTriangle,
          columns: 4,
          priority: 3,
          fields: [
            {
              key: "maxDailyLoss",
              icon: AlertTriangle,
              emptyText: t("no_limit"),
              render: (value) => (
                <span className="font-mono tabular-nums">{quantity(value)}</span>
              ),
            },
            {
              key: "maxPositionSize",
              icon: Target,
              emptyText: t("no_limit"),
              render: (value) => (
                <span className="font-mono tabular-nums">{quantity(value)}</span>
              ),
            },
            {
              key: "stopLossPercent",
              title: tCommon("stop_loss"),
              icon: TrendingDown,
              emptyText: t("no_limit"),
              render: (value) => (
                <span className="font-mono tabular-nums">{Number(value)}%</span>
              ),
            },
            {
              key: "takeProfitPercent",
              title: tCommon("take_profit"),
              icon: TrendingUp,
              emptyText: t("no_limit"),
              render: (value) => (
                <span className="font-mono tabular-nums">{Number(value)}%</span>
              ),
            },
          ],
        },
        {
          id: "allocations",
          title: tExt("allocations"),
          description:
            t("where_this_subscriptions_money_physically_is"),
          icon: Wallet,
          priority: 4,
          /* No `condition`: an empty allocation set is a real, load-bearing
             state (a stopped subscription with nothing left committed), so it
             gets a sentence rather than a vanished section. */
          render: (row) => {
            const allocations: any[] = row.allocations ?? [];
            if (!allocations.length) {
              return (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  {t("no_funds_allocated_to_any_market")}
                </p>
              );
            }
            return (
              <div className="space-y-2">
                {allocations.map((allocation, index) => (
                  <div
                    key={allocation.id ?? index}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono text-sm font-medium">
                        {allocation.symbol}
                      </span>
                      <Badge
                        tone={allocation.marketType === "BINARY" ? "warning" : "info"}
                        appearance="soft"
                      >
                        {allocation.marketType}
                      </Badge>
                      {!allocation.isActive && (
                        <Badge tone="neutral" appearance="soft">
                          Inactive
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      <div className="text-end">
                        <p className="text-muted-foreground">Quote</p>
                        <p className="font-mono tabular-nums">
                          {quantity(allocation.quoteUsedAmount)} /{" "}
                          {quantity(allocation.quoteAmount)}
                        </p>
                      </div>
                      <div className="text-end">
                        <p className="text-muted-foreground">Base</p>
                        <p className="font-mono tabular-nums">
                          {quantity(allocation.baseUsedAmount)} /{" "}
                          {quantity(allocation.baseAmount)}
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
          id: "reference",
          title: tCommon("reference"),
          icon: Clock,
          columns: 2,
          priority: 5,
          fields: [
            { key: "createdAt", title: tCommon("started"), icon: Calendar },
            { key: "id", title: t("subscription_id"), icon: Shield, copyable: true },
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
  const tExt = useTranslations("ext");

  return {
    edit: {
      title: t("edit_subscription"),
      description: t("update_subscription_settings"),
      groups: [
        {
          id: "subscription-settings",
          title: tExt("subscription_settings"),
          icon: Target,
          priority: 1,
          fields: [
            {
              key: "status",
              required: true,
              options: [
                { value: "ACTIVE", label: tCommon("active") },
                { value: "PAUSED", label: tCommon("paused") },
                { value: "STOPPED", label: tCommon("stopped") },
              ],
            },
            { key: "riskMultiplier", required: false, min: 0.1, max: 10 },
            { key: "maxDailyLoss", required: false, min: 0 },
            { key: "maxPositionSize", required: false, min: 0 },
          ],
        },
      ],
    },
  } as FormConfig;
}
