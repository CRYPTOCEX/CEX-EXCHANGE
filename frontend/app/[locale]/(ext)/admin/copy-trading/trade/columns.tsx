"use client";
import React from "react";
import {
  Shield,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  User,
  Award,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Users,
  Zap,
  Hash,
  Clock,
  AlertTriangle,
  Percent,
  Receipt,
} from "lucide-react";
import type {
  ColumnDefinition,
  FormConfig,
  ViewConfig,
} from "@/components/blocks/data-table/types/table";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { statusTone, statusLabel } from "@/lib/status-tone";
import { BadgeCell } from "@/components/blocks/data-table/content/rows/cells/badge";

// The bullish-side list that used to live here (`["BUY","RISE","HIGHER",
// "TOUCH","CALL","UP"]`) is now in `lib/status-tone.ts`, where every binary
// side name aliases onto UP or DOWN — so direction is decided in one place and
// the arrow, the hue and the filter chip cannot drift apart.

export function useColumns() {
  const t = useTranslations("ext_admin");
  const tCommon = useTranslations("common");

  return [
    {
      key: "id",
      title: "ID",
      type: "text",
      icon: Shield,
      sortable: true,
      searchable: true,
      filterable: false,
      priority: 3,
      expandedOnly: true,
    },
    {
      key: "symbol",
      title: tCommon("symbol"),
      type: "text",
      icon: Activity,
      sortable: true,
      searchable: true,
      filterable: true,
      priority: 1,
      render: {
        type: "custom",
        render: (value: string) => (
          <span className="font-medium">{value}</span>
        ),
      },
    },
    {
      key: "marketType",
      title: tCommon("market"),
      type: "select",
      icon: Activity,
      sortable: true,
      searchable: false,
      filterable: true,
      options: [
        { value: "SPOT", label: tCommon("spot"), color: "info" },
        { value: "BINARY", label: tCommon("binary"), color: "warning" },
      ],
      render: {
        type: "badge",
        config: {
          variant: (value: string) =>
            value === "BINARY" ? "warning" : "info",
        },
      },
      priority: 1,
    },
    {
      key: "side",
      title: tCommon("side"),
      type: "select",
      icon: TrendingUp,
      sortable: true,
      searchable: false,
      filterable: true,
      options: [
        { value: "BUY", label: tCommon("buy") },
        { value: "SELL", label: tCommon("sell") },
        { value: "RISE", label: tCommon("rise") },
        { value: "FALL", label: tCommon("fall") },
        { value: "HIGHER", label: tCommon("higher") },
        { value: "LOWER", label: tCommon("lower") },
        { value: "TOUCH", label: t("touch") },
        { value: "NO_TOUCH", label: t("no_touch") },
        { value: "CALL", label: tCommon("call") },
        { value: "PUT", label: tCommon("put") },
        { value: "UP", label: tCommon("up") },
        { value: "DOWN", label: tCommon("down") },
      ],
      render: {
        type: "custom",
        render: (value: string) => {
          const label = String(value || "").replace(/_/g, " ");
          const up = statusTone(value) === "success";
          const Arrow = up ? ArrowUpRight : ArrowDownRight;
          return (
            <Badge tone={up ? "success" : "destructive"} appearance="soft">
              <Arrow className="h-3 w-3 mr-1" />
              {label}
            </Badge>
          );
        },
      },
      priority: 1,
    },
    {
      key: "isLeaderTrade",
      title: tCommon("type"),
      type: "toggle",
      icon: Award,
      sortable: true,
      searchable: false,
      filterable: true,
      render: {
        type: "custom",
        render: (value: boolean) => (
          <Badge variant="outline">
            {value ? tCommon("leader") : t("follower")}
          </Badge>
        ),
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
      render: {
        type: "custom",
        render: (value: any, row: any) => {
          if (!value) return "-";
          return (
            <span className="text-primary hover:underline cursor-pointer">
              {value.displayName}
            </span>
          );
        },
      },
      priority: 1,
    },
    {
      key: "follower",
      title: t("follower"),
      type: "compound",
      icon: User,
      sortable: true,
      searchable: true,
      filterable: true,
      render: {
        type: "custom",
        render: (value: any, row: any) => {
          if (!value || row.isLeaderTrade) return "-";
          return (
            <div>
              <div className="text-sm">
                {value.firstName} {value.lastName}
              </div>
              <div className="text-xs text-muted-foreground">{value.email}</div>
            </div>
          );
        },
      },
      priority: 2,
    },
    {
      key: "amount",
      title: tCommon("amount"),
      type: "number",
      icon: Activity,
      sortable: true,
      searchable: false,
      filterable: true,
      priority: 1,
      render: {
        type: "custom",
        render: (value: number) => value?.toFixed(4) || "0",
      },
    },
    {
      key: "price",
      title: tCommon("price"),
      type: "number",
      icon: DollarSign,
      sortable: true,
      searchable: false,
      filterable: true,
      priority: 2,
      render: {
        type: "custom",
        render: (value: number) => `$${(value || 0).toLocaleString()}`,
      },
    },
    {
      key: "cost",
      title: tCommon("cost"),
      type: "number",
      icon: DollarSign,
      sortable: true,
      searchable: false,
      filterable: true,
      priority: 2,
      render: {
        type: "custom",
        render: (value: number) => `$${(value || 0).toLocaleString()}`,
      },
    },
    {
      // `profit`/`profitPercent`, NOT `pnl`/`pnlPercent`, which is what this
      // column read. copyTradingTrade has never had a `pnl` column and no route
      // maps one on, so the cell got `undefined` on every row and the whole
      // column rendered a dash — including for closed, settled, profitable
      // trades. The title stays "P&L"; only the field it reads was wrong.
      key: "profit",
      title: `${"PnL"}:`,
      type: "number",
      icon: TrendingUp,
      sortable: true,
      searchable: false,
      filterable: true,
      priority: 1,
      render: {
        type: "custom",
        render: (value: number, row: any) => {
          if (value === null || value === undefined) {
            return <span className="text-muted-foreground">-</span>;
          }
          const color = value >= 0 ? "text-success" : "text-destructive";
          const Icon = value >= 0 ? TrendingUp : TrendingDown;
          return (
            <span className={`flex items-center gap-1 ${color}`}>
              <Icon className="h-3 w-3" />
              {value >= 0 ? "+" : ""}${value.toFixed(2)}
              {row.profitPercent !== null && row.profitPercent !== undefined && (
                <span className="text-xs opacity-70">
                  ({row.profitPercent >= 0 ? "+" : ""}
                  {row.profitPercent.toFixed(1)}%)
                </span>
              )}
            </span>
          );
        },
      },
    },
    {
      key: "status",
      title: tCommon("status"),
      type: "select",
      icon: Shield,
      sortable: true,
      searchable: false,
      filterable: true,
      // The full `TradeStatus` union. Five of the ten were missing, so a trade
      // stuck in PENDING_REPLICATION or REPLICATION_FAILED — precisely the rows
      // an operator opens this table to find — was unreachable by the filter.
      options: [
        { value: "PENDING", label: tCommon("pending") },
        { value: "PENDING_REPLICATION", label: t("pending_replication") },
        { value: "REPLICATED", label: t("replicated") },
        { value: "REPLICATION_FAILED", label: t("replication_failed") },
        { value: "OPEN", label: tCommon("open") },
        { value: "PARTIALLY_FILLED", label: t("partially_filled") },
        { value: "CLOSING", label: tCommon("closing") },
        { value: "CLOSED", label: tCommon("closed") },
        { value: "FAILED", label: tCommon("failed") },
        { value: "CANCELLED", label: tCommon("cancelled") },
      ],
      render: {
        type: "custom",
        render: (value: string, row: any) => {
          if (row?.binaryResult) {
            const result = String(row.binaryResult);
            return <StatusBadge status={result} label={result} />;
          }
          // No `variant` override: BadgeCell now resolves the hue through
          // `statusTone()` itself. The switch that used to sit here was the
          // private half of the exact defect this migration exists to remove —
          // the admin table said CLOSED was success and CANCELLED was muted
          // while the user-facing view of the SAME copyTradingTrade row took
          // its colours from the central table.
          return <BadgeCell value={value} row={row} config={{}} />;
        },
      },
      priority: 1,
    },
    {
      key: "createdAt",
      title: tCommon("date"),
      type: "date",
      icon: Calendar,
      sortable: true,
      searchable: false,
      filterable: true,
      priority: 2,
      render: {
        type: "date",
        format: "PPpp",
      },
    },
  ] as ColumnDefinition[];
}

export function useFormConfig(): FormConfig {
  // Trades are read-only, no create/edit forms needed
  return {};
}

/* -------------------------------------------------------------------------- *
 * View dialog
 *
 * A copy trade is three records in one: the order that was placed, how it
 * actually executed against the leader's fill, and what it eventually settled
 * for. The row shows the first of those; the other two — slippage, replication
 * latency, the leader/follower/close order ids, the failure message on a
 * REPLICATION_FAILED row — exist on the payload and had nowhere to render.
 * Hence tabs rather than one long grid.
 * -------------------------------------------------------------------------- */

const BINARY_RESULT_TONE: Record<string, "success" | "destructive" | "info"> = {
  WIN: "success",
  LOSS: "destructive",
  DRAW: "info",
};

function usd(value: any): string {
  return `$${Number(value ?? 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function dash(): React.ReactNode {
  return <span className="text-muted-foreground">—</span>;
}

function quantity(value: any): React.ReactNode {
  if (value === null || value === undefined) return dash();
  return <span className="font-mono tabular-nums">{Number(value).toFixed(4)}</span>;
}

function reference(value: any): React.ReactNode {
  if (!value) return dash();
  return <span className="font-mono text-xs break-all">{String(value)}</span>;
}

function dateTime(value: any): React.ReactNode {
  if (!value) return dash();
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return dash();
  return <span>{parsed.toLocaleString()}</span>;
}

/** The follower's human name lives on the joined user, not on the follower row. */
function followerName(row: any): string | null {
  const user = row?.follower?.user;
  if (!user) return null;
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return name || null;
}

export function useViewConfig(): ViewConfig {
  const tExt = useTranslations("ext");
  const t = useTranslations("ext_admin");
  const tCommon = useTranslations("common");

  return React.useMemo<ViewConfig>(
    () => ({
      size: "4xl",

      title: (row) => (
        <span className="flex flex-wrap items-baseline gap-2 min-w-0">
          <span className="truncate">{row.symbol || tCommon("trade")}</span>
          <span className="text-sm font-normal text-muted-foreground">
            {String(row.type ?? "").replace(/_/g, " ")}
          </span>
        </span>
      ),

      subtitle: (row) => {
        const leader = row.leader?.displayName || "unknown leader";
        if (row.isLeaderTrade) return `Leader fill by ${leader}`;
        return `Copied for ${followerName(row) || t("unknown_follower")}, following ${leader}`;
      },

      badges: (row) => (
        <>
          <Badge tone={statusTone(row.status)} appearance="soft">
            {statusLabel(row.status)}
          </Badge>
          <Badge tone="neutral" appearance="soft">
            {row.isLeaderTrade ? tCommon("leader") : t("follower")}
          </Badge>
          {row.binaryResult && (
            <Badge
              tone={BINARY_RESULT_TONE[String(row.binaryResult)] ?? "neutral"}
              appearance="soft"
            >
              {row.binaryResult}
            </Badge>
          )}
        </>
      ),

      stats: [
        { label: tCommon("amount"), icon: Activity, value: (row) => quantity(row.amount) },
        { label: tCommon("price"), icon: DollarSign, value: (row) => usd(row.price) },
        { label: tCommon("cost"), icon: DollarSign, value: (row) => usd(row.cost) },
        {
          label: `${"PnL"}:`,
          icon: TrendingUp,
          // `tone` is fixed per stat and this figure changes sign per row, so the
          // ink is picked inside the value.
          value: (row) => {
            if (row.profit === null || row.profit === undefined) return dash();
            const profit = Number(row.profit);
            const Icon = profit >= 0 ? TrendingUp : TrendingDown;
            return (
              <span
                className={`flex items-center gap-1 ${
                  profit >= 0 ? "text-success" : "text-destructive"
                }`}
              >
                <Icon className="h-4 w-4" />
                {profit >= 0 ? "+" : ""}
                {usd(profit)}
                {row.profitPercent !== null && row.profitPercent !== undefined && (
                  <span className="text-xs opacity-70">
                    ({Number(row.profitPercent) >= 0 ? "+" : ""}
                    {Number(row.profitPercent).toFixed(1)}%)
                  </span>
                )}
              </span>
            );
          },
        },
      ],

      tabs: [
        { id: "overview", title: tCommon("overview"), icon: Activity },
        { id: "execution", title: tCommon("execution"), icon: Zap },
        { id: "result", title: tCommon("result"), icon: TrendingUp },
      ],

      sections: [
        {
          id: "trade",
          tab: "overview",
          title: tCommon("order"),
          icon: Activity,
          columns: 3,
          priority: 1,
          fields: [
            { key: "side", icon: TrendingUp },
            { key: "marketType", icon: Activity },
            {
              key: "type",
              title: tCommon("order_type"),
              icon: Receipt,
              render: (value) => (
                <span>{String(value ?? "").replace(/_/g, " ")}</span>
              ),
            },
          ],
        },
        {
          id: "routing",
          tab: "overview",
          title: tCommon("routing"),
          description:
            t("who_the_fill_belongs_to_a"),
          icon: Users,
          columns: 2,
          priority: 2,
          fields: [
            {
              key: "leaderId",
              title: tCommon("leader"),
              icon: Award,
              render: (_value, row) => {
                const user = row.leader?.user;
                const name = user
                  ? [user.firstName, user.lastName].filter(Boolean).join(" ").trim()
                  : "";
                return (
                  <span className="min-w-0">
                    <span className="block break-words">
                      {row.leader?.displayName || reference(row.leaderId)}
                    </span>
                    {name && (
                      <span className="block text-xs text-muted-foreground">
                        {name}
                      </span>
                    )}
                  </span>
                );
              },
            },
            {
              key: "followerId",
              title: t("follower"),
              icon: User,
              // Null on a leader row — that is a fact about the record, not a
              // gap, so it gets a sentence rather than a dash.
              emptyText: t("leader_fill_no_follower"),
              render: (_value, row) => (
                <span className="min-w-0">
                  <span className="block break-words">
                    {followerName(row) || reference(row.followerId)}
                  </span>
                </span>
              ),
            },
          ],
        },
        {
          id: "execution",
          tab: "execution",
          title: t("fill_quality"),
          description:
            t("what_the_copy_actually_got_against"),
          icon: Zap,
          columns: 4,
          priority: 1,
          fields: [
            {
              key: "executedAmount",
              title: t("executed_amount"),
              icon: Activity,
              render: (value) => quantity(value),
            },
            {
              key: "executedPrice",
              title: t("executed_price"),
              icon: DollarSign,
              render: (value) =>
                value === null || value === undefined ? dash() : usd(value),
            },
            {
              key: "slippage",
              title: t("slippage"),
              icon: Percent,
              render: (value) =>
                value === null || value === undefined ? (
                  dash()
                ) : (
                  <span
                    className={`font-mono tabular-nums ${
                      Number(value) > 0 ? "text-warning" : "text-muted-foreground"
                    }`}
                  >
                    {Number(value).toFixed(4)}
                  </span>
                ),
            },
            {
              key: "latencyMs",
              title: t("replication_latency"),
              icon: Clock,
              render: (value) =>
                value === null || value === undefined ? (
                  dash()
                ) : (
                  <span className="font-mono tabular-nums">{Number(value)} ms</span>
                ),
            },
          ],
        },
        {
          id: "references",
          tab: "execution",
          title: t("order_references"),
          icon: Hash,
          columns: 2,
          priority: 2,
          fields: [
            { key: "id", title: tExt("trade_id"), icon: Shield, copyable: true },
            {
              key: "leaderOrderId",
              title: t("leader_order_id"),
              icon: Hash,
              copyable: true,
              render: (value) => reference(value),
            },
            {
              key: "followerOrderId",
              title: t("follower_order_id"),
              icon: Hash,
              copyable: true,
              render: (value) => reference(value),
            },
            {
              key: "closeOrderId",
              title: t("close_order_id"),
              icon: Hash,
              copyable: true,
              render: (value) => reference(value),
            },
          ],
        },
        {
          id: "failure",
          tab: "execution",
          title: tCommon("failure"),
          icon: AlertTriangle,
          columns: 1,
          priority: 3,
          // The only reason an operator opens a REPLICATION_FAILED row, and it
          // had no column at all.
          condition: (row) => Boolean(row.errorMessage),
          fields: [
            {
              key: "errorMessage",
              title: t("error_message"),
              icon: AlertTriangle,
              fullWidth: true,
              render: (value) => (
                <span className="text-destructive break-words">{String(value)}</span>
              ),
            },
          ],
        },
        {
          id: "settlement",
          tab: "result",
          title: tCommon("settlement"),
          icon: TrendingUp,
          columns: 3,
          priority: 1,
          fields: [
            {
              key: "binaryResult",
              title: t("binary_result"),
              icon: Award,
              condition: (row) => row.marketType === "BINARY",
              render: (value) => (
                <Badge
                  tone={BINARY_RESULT_TONE[String(value)] ?? "neutral"}
                  appearance="soft"
                >
                  {String(value)}
                </Badge>
              ),
            },
            {
              key: "fee",
              title: tCommon("fee"),
              icon: Receipt,
              render: (value, row) => (
                <span className="font-mono tabular-nums">
                  {Number(value ?? 0).toFixed(4)}{" "}
                  <span className="text-muted-foreground">{row.feeCurrency}</span>
                </span>
              ),
            },
            {
              key: "profitCurrency",
              title: t("p_l_currency"),
              icon: DollarSign,
              render: (value) => <span>{String(value)}</span>,
            },
          ],
        },
        {
          id: "timeline",
          tab: "result",
          title: tCommon("timeline"),
          icon: Clock,
          columns: 3,
          priority: 2,
          fields: [
            { key: "createdAt", title: tCommon("placed"), icon: Calendar },
            {
              key: "expiresAt",
              title: tCommon("expires"),
              icon: Clock,
              condition: (row) => row.marketType === "BINARY",
              render: (value) => dateTime(value),
            },
            {
              key: "closedAt",
              title: tCommon("closed"),
              icon: Clock,
              render: (value) => dateTime(value),
            },
          ],
        },
      ],
    }),
    [t, tCommon]
  );
}
