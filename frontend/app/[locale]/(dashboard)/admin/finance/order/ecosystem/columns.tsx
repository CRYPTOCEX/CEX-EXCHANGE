"use client";
import React from "react";
import {
  Shield,
  User,
  DollarSign,
  ClipboardList,
  TrendingUp,
  ArrowLeftRight,
  ArrowDownRight,
  ArrowUpRight,
  Bot,
  Clock,
  ListOrdered,
  Percent,
  Wallet,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { statusLabel, statusTone } from "@/lib/status-tone";
import type { ViewConfig } from "@/components/blocks/data-table/types/table";

export interface Trade {
  id: string;
  amount: number;
  price: number;
  cost: number;
  side: string;
  timestamp: number;
}

interface TradesCellProps {
  value: string; // Raw trades JSON string from the API response
}

export function TradesCell({ value }: TradesCellProps) {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  let trades: Trade[] = [];
  try {
    // The API returns a string that might be double-encoded.
    // First, try parsing the value.
    const parsed = JSON.parse(value);

    // If the result is still a string, try parsing it again.
    if (typeof parsed === "string") {
      trades = JSON.parse(parsed);
    } else if (Array.isArray(parsed)) {
      trades = parsed;
    }
  } catch (error) {
    console.error("Error parsing trades:", error);
    return <span className="text-destructive">{t("invalid_trades_data")}</span>;
  }
  if (!trades.length) {
    return <span>{t("no_trades")}</span>;
  }
  return (
    <div className="space-y-2">
      {trades.map((trade) => {
        return (
          <div
            key={trade.id}
            className="border p-2 rounded bg-default-900 dark:bg-default-100"
          >
            <div>
              <strong>ID</strong> {trade.id}
            </div>
            <div>
              <strong>{tCommon("amount")}:</strong> {trade.amount}
            </div>
            <div>
              <strong>{tCommon('price')}:</strong> {trade.price}
            </div>
            <div>
              <strong>{tCommon("cost")}:</strong> {trade.cost}
            </div>
            <div>
              <strong>{tCommon("side")}:</strong> {trade.side}
            </div>
            <div>
              <strong>{tCommon("timestamp")}:</strong>{" "}
              {new Date(trade.timestamp).toLocaleString()}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function useColumns(): ColumnDefinition[] {
  const tCommon = useTranslations("common");
  const tDashboardAdmin = useTranslations("dashboard_admin");
  return [
    {
      key: "id",
      title: "ID",
      type: "text",
      icon: Shield,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tDashboardAdmin("unique_order_identifier"),
      priority: 2,
      expandedOnly: true,
    },
    {
      key: "userId",
      title: tCommon("user_id"),
      type: "text",
      icon: User,
      description: tDashboardAdmin("id_of_the_user_who_placed_this_order"),
      sortable: true,
      filterable: true,
      priority: 3,
      expandedOnly: true,
    },
    {
      key: "status",
      title: tCommon("status"),
      type: "select",
      icon: ClipboardList,
      description: tDashboardAdmin("current_order_status"),
      sortable: true,
      filterable: true,
      required: true,
      options: [
        { value: "OPEN", label: tCommon("open") },
        { value: "CLOSED", label: tCommon("closed") },
        { value: "CANCELLED", label: tCommon("cancelled") },
      ],
      render: {
        // No local `variant`: the hue comes from `lib/status-tone.ts`. Adding one
        // back here silently overrides the platform's canonical status colours.
        type: "badge",
        config: {
          withDot: false,
        },
      },
      priority: 1,
    },
    {
      key: "symbol",
      title: tCommon("symbol"),
      type: "text",
      icon: TrendingUp,
      description: tDashboardAdmin("trading_pair_e_g_btc_usd"),
      sortable: true,
      filterable: true,
      required: true,
      priority: 1,
    },
    {
      key: "type",
      title: tCommon("order_type"),
      type: "select",
      icon: ArrowLeftRight,
      description: tDashboardAdmin("market_or_limit_order_type"),
      sortable: true,
      filterable: true,
      required: true,
      options: [
        { value: "LIMIT", label: tCommon("limit") },
        { value: "MARKET", label: tCommon("market") },
      ],
      priority: 1,
    },
    {
      key: "timeInForce",
      title: tCommon("time_in_force"),
      type: "select",
      icon: ClipboardList,
      description: tDashboardAdmin("how_long_the_order_remains_active"),
      sortable: true,
      filterable: false,
      required: true,
      options: [
        { value: "GTC", label: tDashboardAdmin("good_till_cancel") },
        { value: "IOC", label: tDashboardAdmin("immediate_or_cancel") },
      ],
      condition: (values) => values.type === "LIMIT",
      expandedOnly: true,
      priority: 2,
    },
    {
      key: "side",
      title: tCommon("side"),
      type: "select",
      icon: ArrowLeftRight,
      description: tCommon("buy_or_sell"),
      sortable: true,
      filterable: true,
      required: true,
      options: [
        { value: "BUY", label: tCommon("buy") },
        { value: "SELL", label: tCommon("sell") },
      ],
      render: {
        type: "badge",
        config: {
          variant: (value) => {
            switch (value) {
              case "BUY":
                return "success";
              case "SELL":
                return "danger";
              default:
                return "default";
            }
          },
        },
      },
      priority: 1,
    },
    {
      key: "price",
      title: tCommon("price"),
      type: "number",
      icon: DollarSign,
      description: tDashboardAdmin("limit_or_executed_price"),
      sortable: true,
      filterable: true,
      required: false,
      condition: (values) => values.type === "LIMIT",
      priority: 1,
    },
    {
      key: "amount",
      title: tCommon("amount"),
      type: "number",
      icon: DollarSign,
      description: tCommon("order_size"),
      sortable: true,
      filterable: true,
      required: true,
      priority: 1,
    },
    {
      key: "fee",
      title: tCommon("fee"),
      type: "number",
      icon: DollarSign,
      description: tDashboardAdmin("fee_paid_for_the_order"),
      sortable: true,
      filterable: false,
      required: false,
      priority: 2,
      expandedOnly: true,
    },
    {
      key: "feeCurrency",
      title: tDashboardAdmin("fee_currency"),
      type: "text",
      icon: DollarSign,
      description: tDashboardAdmin("currency_used_for_the_fee_e_g_usd"),
      sortable: false,
      filterable: false,
      required: false,
      priority: 3,
      expandedOnly: true,
    },
    {
      key: "average",
      title: tCommon("average_price"),
      type: "number",
      icon: DollarSign,
      description: tDashboardAdmin("average_fill_price"),
      sortable: true,
      filterable: false,
      priority: 2,
      expandedOnly: true,
    },
    {
      key: "filled",
      title: tCommon("filled"),
      type: "number",
      icon: DollarSign,
      description: tDashboardAdmin("how_much_of_the_order_was_filled"),
      sortable: true,
      filterable: false,
      priority: 2,
      expandedOnly: true,
    },
    {
      key: "remaining",
      title: `${tCommon("remaining")}:`,
      type: "number",
      icon: DollarSign,
      description: tDashboardAdmin("remaining_amount_to_be_filled"),
      sortable: true,
      filterable: false,
      priority: 2,
      expandedOnly: true,
    },
    {
      key: "cost",
      title: tCommon("cost"),
      type: "number",
      icon: DollarSign,
      description: tDashboardAdmin("total_cost_so_far"),
      sortable: true,
      filterable: false,
      priority: 2,
      expandedOnly: true,
    },
    {
      key: "trades",
      title: "({completedTradesCount} trades)",
      type: "custom",
      icon: ClipboardList,
      description: tDashboardAdmin("raw_trade_data_json"),
      sortable: false,
      filterable: false,
      priority: 3,
      expandedOnly: true,
      render: (value: any) => <TradesCell value={value} />,
    },
  ];
}

/* -------------------------------------------------------------------------- *
 * View dialog
 *
 * An order is not a flat bag of sixteen numbers. It is a price, an execution
 * (filled / remaining / cost / fee), a routing decision (which wallet, whose
 * bot) and a list of fills — and the default panel flattened all four into one
 * 600px column of key/value tiles with the raw `trades` JSON string dumped at
 * the bottom. The two figures an operator actually opens an order for, how much
 * of it filled and what it cost, were indistinguishable from `feeCurrency`.
 *
 * The helpers below are exported because the futures and exchange order tables
 * show the same fills in the same shape; futures already imports `TradesCell`
 * from this file for exactly that reason.
 * -------------------------------------------------------------------------- */

/**
 * Trades arrive as a JSON string that is sometimes DOUBLE-encoded (the value was
 * stringified, stored in a TEXT column, and stringified again on the way out),
 * and on the MySQL-backed exchange table as an already-parsed array. All three
 * shapes have to land on the same array.
 */
export function parseTrades(value: any): Trade[] {
  if (!value) return [];
  let parsed: any = value;
  for (let attempt = 0; attempt < 2 && typeof parsed === "string"; attempt++) {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return [];
    }
  }
  return Array.isArray(parsed) ? (parsed as Trade[]) : [];
}

/** Order quantities are small decimals; a plain `toString()` prints 1e-7. */
export function formatOrderNumber(value: any, maximumFractionDigits = 8): string {
  if (value === null || value === undefined || value === "") return "—";
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return String(value);
  return numeric.toLocaleString(undefined, { maximumFractionDigits });
}

/** Accepts an ISO string, a Date, or the epoch-millis a fill carries. */
export function formatOrderDate(value: any): string {
  if (value === null || value === undefined || value === "") return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : format(date, "PPp");
}

/** How much of the order is done, or null when the amount is unusable. */
export function fillRatio(row: any): number | null {
  const amount = Number(row?.amount);
  const filled = Number(row?.filled);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  if (!Number.isFinite(filled)) return null;
  return Math.min(1, filled / amount);
}

/** Directional arrow for the dialog title — the first thing to read on an order. */
export function OrderSideMark({ side }: { side?: string }) {
  const normalised = String(side ?? "").toUpperCase();
  if (normalised === "SELL") {
    return <ArrowDownRight className="h-5 w-5 shrink-0 text-destructive" />;
  }
  return <ArrowUpRight className="h-5 w-5 shrink-0 text-success" />;
}

/** `filled / amount` plus the percentage, for the headline stat strip. */
export function OrderFillSummary({ row }: { row: any }) {
  const ratio = fillRatio(row);
  const percent = ratio === null ? null : Math.round(ratio * 100);
  return (
    <span className="inline-flex items-baseline gap-1.5 min-w-0">
      <span className="truncate">{formatOrderNumber(row?.filled)}</span>
      <span className="text-xs font-normal text-muted-foreground">
        / {formatOrderNumber(row?.amount)}
      </span>
      {percent !== null && (
        <span
          className={cn(
            "text-xs font-medium",
            percent >= 100
              ? "text-success"
              : percent > 0
                ? "text-warning"
                : "text-muted-foreground"
          )}
        >
          {percent}%
        </span>
      )}
    </span>
  );
}

/**
 * The fills that make up an order.
 *
 * A key/value tile cannot hold an array of trade objects — the generic renderer
 * stringifies it into one unbroken line of braces — so this is the one part of
 * the panel that brings its own markup.
 */
export function OrderFillsTable({ trades }: { trades: Trade[] }) {
  const t = useTranslations("dashboard_admin");
  if (!trades.length) {
    return (
      <p className="text-sm text-muted-foreground">
        {t("no_fills_recorded_for_this_order")}
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-muted text-muted-foreground">
            <th className="px-3 py-2 text-start font-medium">Side</th>
            <th className="px-3 py-2 text-end font-medium">Price</th>
            <th className="px-3 py-2 text-end font-medium">Amount</th>
            <th className="px-3 py-2 text-end font-medium">Cost</th>
            <th className="px-3 py-2 text-end font-medium">Time</th>
          </tr>
        </thead>
        <tbody>
          {trades.map((trade: any, index: number) => {
            const side = String(trade?.side ?? "").toUpperCase();
            return (
              <tr key={trade?.id ?? index} className="border-t border-border">
                <td
                  className={cn(
                    "px-3 py-2 font-medium",
                    side === "BUY"
                      ? "text-success"
                      : side === "SELL"
                        ? "text-destructive"
                        : "text-muted-foreground"
                  )}
                >
                  {side || "—"}
                </td>
                <td className="px-3 py-2 text-end tabular-nums">
                  {formatOrderNumber(trade?.price)}
                </td>
                <td className="px-3 py-2 text-end tabular-nums">
                  {formatOrderNumber(trade?.amount)}
                </td>
                <td className="px-3 py-2 text-end tabular-nums">
                  {formatOrderNumber(trade?.cost)}
                </td>
                <td className="px-3 py-2 text-end whitespace-nowrap text-muted-foreground">
                  {formatOrderDate(trade?.timestamp)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** A uuid is only ever copied; it is illegible in a proportional font. */
export function renderOrderId(value: any) {
  return <span className="font-mono text-xs break-all">{String(value)}</span>;
}

export function useViewConfig(): ViewConfig {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  return React.useMemo<ViewConfig>(
    () => ({
      size: "4xl",

      title: (row) => (
        <span className="flex items-center gap-2 min-w-0">
          <OrderSideMark side={row.side} />
          <span className="truncate">{row.symbol || `#${row.id}`}</span>
        </span>
      ),

      subtitle: (row) =>
        [row.type, row.timeInForce].filter(Boolean).join(" · ") || undefined,

      badges: (row) => (
        <>
          <Badge tone={statusTone(row.status)} appearance="soft">
            {statusLabel(row.status) || tCommon("unknown")}
          </Badge>
          {row.side && (
            <Badge tone={statusTone(row.side)} appearance="soft">
              {String(row.side).toUpperCase()}
            </Badge>
          )}
          {(row.marketMakerId || row.botId) && (
            <Badge tone="info" appearance="soft">
              <Bot className="h-3 w-3" />
              {t("bot_order")}
            </Badge>
          )}
        </>
      ),

      stats: [
        {
          label: tCommon("filled"),
          icon: Percent,
          value: (row) => <OrderFillSummary row={row} />,
        },
        {
          label: tCommon("remaining"),
          icon: ArrowLeftRight,
          value: (row) => formatOrderNumber(row.remaining),
        },
        {
          label: tCommon("total_cost"),
          icon: DollarSign,
          value: (row) => formatOrderNumber(row.cost),
        },
        {
          label: tCommon("fee"),
          icon: DollarSign,
          value: (row) =>
            [formatOrderNumber(row.fee), row.feeCurrency].filter(Boolean).join(" "),
        },
      ],

      sections: [
        {
          id: "pricing",
          title: tCommon("pricing"),
          icon: DollarSign,
          columns: 2,
          fields: ["price", "average"],
        },
        {
          id: "fills",
          title: t("fills"),
          icon: ListOrdered,
          // Hidden rather than shown empty: most orders on this table are open
          // and have never traded, and an empty table is a worse answer than no
          // section at all.
          condition: (row) => parseTrades(row.trades).length > 0,
          render: (row) => <OrderFillsTable trades={parseTrades(row.trades)} />,
        },
        {
          id: "routing",
          title: tCommon("routing"),
          description:
            t("which_wallet_the_order_settles_against"),
          icon: Bot,
          columns: 3,
          condition: (row) =>
            Boolean(row.walletType || row.marketMakerId || row.botId),
          fields: [
            {
              key: "walletType",
              title: tCommon("wallet_type"),
              icon: Wallet,
              render: (value) => String(value),
            },
            {
              key: "marketMakerId",
              title: tCommon("market_maker"),
              icon: Bot,
              copyable: true,
              render: renderOrderId,
            },
            {
              key: "botId",
              title: tCommon("bot"),
              icon: Bot,
              copyable: true,
              render: renderOrderId,
            },
          ],
        },
        {
          id: "reference",
          title: t("order_account"),
          icon: Shield,
          columns: 2,
          fields: ["id", "userId"],
        },
        {
          id: "timeline",
          title: tCommon("timeline"),
          icon: Clock,
          columns: 2,
          fields: [
            {
              key: "createdAt",
              title: tCommon("placed"),
              icon: Clock,
              render: (value) => formatOrderDate(value),
            },
            {
              key: "updatedAt",
              title: tCommon("last_updated"),
              icon: Clock,
              render: (value) => formatOrderDate(value),
            },
          ],
        },
      ],
    }),
    []
  );
}
