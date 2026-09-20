"use client";
import React from "react";
import {
  Shield,
  User,
  DollarSign,
  ClipboardList,
  CalendarIcon,
  TrendingUp,
  ArrowUp,
  ArrowDown,
  FlaskConical,
  Percent,
  Wallet,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { statusLabel, statusTone } from "@/lib/status-tone";
import type { ViewConfig } from "@/components/blocks/data-table/types/table";
import { useTranslations } from "next-intl";
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
      key: "user",
      title: tCommon("user"),
      type: "compound",
      icon: User,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tDashboardAdmin("trader_information"),
      render: {
        type: "compound",
        config: {
          image: {
            key: "avatar",
            fallback: "/img/placeholder.svg",
            type: "image",
            title: tCommon("avatar"),
            description: tCommon("user_avatar"),
          },
          primary: {
            key: ["firstName", "lastName"],
            title: [tCommon("first_name"), tCommon("last_name")],
            description: [tDashboardAdmin("traders_first_name"), tDashboardAdmin("traders_last_name")],
            icon: User,
          },
          secondary: {
            key: "email",
            title: tCommon("email"),
            icon: ClipboardList,
          },
        },
      },
      priority: 1,
      expandedOnly: true,
    },
    {
      key: "symbol",
      title: tCommon("symbol"),
      type: "text",
      icon: TrendingUp,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tDashboardAdmin("trading_pair_or_asset"),
      priority: 1,
    },
    {
      key: "price",
      title: tCommon("price"),
      type: "number",
      icon: DollarSign,
      sortable: true,
      searchable: false,
      filterable: true,
      description: tDashboardAdmin("entry_price_when_order_placed"),
      priority: 1,
    },
    {
      key: "amount",
      title: tCommon("amount"),
      type: "number",
      icon: DollarSign,
      sortable: true,
      searchable: false,
      filterable: true,
      description: tDashboardAdmin("order_stake_amount"),
      priority: 1,
    },
    {
      key: "profit",
      title: tCommon("profit"),
      type: "number",
      icon: DollarSign,
      sortable: true,
      searchable: false,
      filterable: true,
      description: tDashboardAdmin("profit_or_loss_amount"),
      priority: 1,
    },
    {
      key: "side",
      title: tCommon("side"),
      type: "select",
      icon: ArrowUp,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tDashboardAdmin("trade_direction_prediction"),
      options: [
        { value: "RISE", label: tCommon("rise") },
        { value: "FALL", label: tCommon("fall") },
      ],
      priority: 1,
      render: {
        type: "badge",
        config: {
          variant: (value) => {
            if (value === "RISE") {
              return "success";
            } else if (value === "FALL") {
              return "danger";
            }
            return "default";
          },
        },
      },
    },
    {
      key: "status",
      title: tCommon("status"),
      type: "select",
      icon: ClipboardList,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tDashboardAdmin("current_order_status"),
      options: [
        { value: "PENDING", label: tCommon("pending") },
        { value: "WIN", label: tCommon("win") },
        { value: "LOSS", label: tCommon("loss") },
        { value: "DRAW", label: tCommon("draw") },
        { value: "CANCELED", label: tDashboardAdmin("canceled") },
      ],
      render: {
        // No local `variant`: the hue comes from `lib/status-tone.ts`. Adding one
        // back here silently overrides the platform's canonical status colours.
        type: "badge",
        config: {},
      },
      priority: 1,
    },
    {
      key: "closePrice",
      title: tCommon("close_price"),
      type: "number",
      icon: DollarSign,
      sortable: true,
      searchable: false,
      filterable: true,
      description: tDashboardAdmin("final_closing_price"),
      priority: 2,
      expandedOnly: true,
    },
    {
      key: "createdAt",
      title: tCommon("created_at"),
      type: "date",
      icon: CalendarIcon,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tDashboardAdmin("when_order_was_placed"),
      priority: 2,
      render: { type: "date", format: "PPP", fullDate: true },
    },
    {
      key: "closedAt",
      title: tCommon("closed_at"),
      type: "date",
      icon: CalendarIcon,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tDashboardAdmin("when_order_was_closed"),
      priority: 2,
      render: { type: "date", format: "PPP", fullDate: true },
    },
    {
      key: "isDemo",
      title: tCommon("demo"),
      type: "boolean",
      icon: ClipboardList,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tDashboardAdmin("demo_account_order_flag"),
      priority: 1,
      expandedOnly: true,
    },
  ];
}

/**
 * mysql2 returns every DECIMAL as a STRING, so a price arrives as "104.50" and
 * arithmetic on it concatenates. Coerce once, and treat anything non-numeric as
 * absent rather than as NaN.
 */
function toNumber(value: any): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatAmount(value: any, signed = false): string {
  const amount = toNumber(value);
  if (amount === null) return "—";
  const abs = Math.abs(amount);
  return amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    // Binary markets quote crypto pairs to eight places; a flat 2 rounded a
    // 0.00004312 entry price to 0.00.
    maximumFractionDigits: abs > 0 && abs < 1 ? 8 : 2,
    signDisplay: signed ? "exceptZero" : "auto",
  });
}

/**
 * Ink for a signed figure. The sign is always printed beside it, so colour is
 * never the only thing separating a win from a loss.
 */
function signedInk(value: any): string {
  const amount = toNumber(value);
  if (amount === null || amount === 0) return "text-foreground";
  return amount < 0 ? "text-destructive" : "text-success";
}

/**
 * The view dialog for a binary order.
 *
 * Twelve columns in one flat grid put the stake, the payout, the entry price
 * and the close price in four identical tiles with nothing to say which of them
 * is the outcome — and the trader, an avatar/name/email compound, rendered as a
 * caption. The money becomes the stat strip, direction and outcome become
 * header pills, and the contract, the trader and the record's clock become
 * three groups.
 */
export function useViewConfig(): ViewConfig {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");

  return React.useMemo<ViewConfig>(
    () => ({
      size: "3xl",

      /* The primary column is `symbol`, a plain text cell, so the default
         header rendered the market at body size. Naming it explicitly puts it
         in the panel's title treatment. */
      title: (row) => row.symbol || `#${row.id}`,

      badges: (row) => (
        <>
          <Badge
            tone={row.side === "FALL" ? "destructive" : "success"}
            appearance="soft"
          >
            {row.side === "FALL" ? (
              <ArrowDown className="h-3 w-3" />
            ) : (
              <ArrowUp className="h-3 w-3" />
            )}
            {row.side === "FALL" ? tCommon("fall") : tCommon("rise")}
          </Badge>
          <Badge tone={statusTone(row.status)} appearance="soft">
            {statusLabel(row.status) || tCommon("unknown")}
          </Badge>
          {/* Unconditional: "no demo pill" is indistinguishable from "the flag
              did not load", and whether an order touched real funds is the
              first thing an operator has to be sure of. */}
          <Badge tone={row.isDemo ? "warning" : "neutral"} appearance="soft">
            {row.isDemo ? <FlaskConical className="h-3 w-3" /> : null}
            {row.isDemo ? tCommon("demo") : tCommon("live")}
          </Badge>
        </>
      ),

      stats: [
        {
          label: tCommon("stake"),
          icon: Wallet,
          value: (row) => formatAmount(row.amount),
        },
        {
          label: tCommon("profit"),
          icon: DollarSign,
          value: (row) => (
            <span className={signedInk(row.profit)}>
              {formatAmount(row.profit, true)}
            </span>
          ),
        },
        {
          label: tCommon("return"),
          icon: Percent,
          // Derived from the two figures the table already carries. A zero
          // stake has no return, and printing "Infinity%" for one was the
          // alternative.
          value: (row) => {
            const amount = toNumber(row.amount);
            const profit = toNumber(row.profit);
            if (amount === null || profit === null || amount === 0) return "—";
            const pct = (profit / amount) * 100;
            return (
              <span className={signedInk(profit)}>
                {pct > 0 ? "+" : ""}
                {pct.toFixed(2)}%
              </span>
            );
          },
        },
      ],

      sections: [
        {
          id: "binary-contract",
          title: tCommon("contract"),
          description: t("the_prices_the_outcome_was_settled_against"),
          icon: TrendingUp,
          columns: 2,
          fields: [
            {
              key: "price",
              title: tCommon("entry_price"),
              icon: DollarSign,
              render: (value) => formatAmount(value),
            },
            {
              key: "closePrice",
              title: tCommon("close_price"),
              icon: DollarSign,
              // A pending order has no close price yet; the dash the generic
              // renderer prints reads as missing data rather than as "open".
              render: (value, row) =>
                toNumber(value) === null
                  ? row.status === "PENDING"
                    ? "Still open"
                    : "—"
                  : formatAmount(value),
            },
          ],
        },
        {
          id: "binary-trader",
          title: tCommon("user"),
          icon: User,
          columns: 1,
          fields: [{ key: "user", title: tCommon("trader"), icon: User }],
        },
        {
          id: "binary-record",
          title: t("record_timeline"),
          icon: CalendarIcon,
          columns: 3,
          fields: [
            { key: "id", icon: Shield, copyable: true },
            { key: "createdAt", title: tCommon("placed"), icon: CalendarIcon },
            {
              key: "closedAt",
              title: tCommon("closed_at"),
              icon: CalendarIcon,
              emptyText: t("not_closed"),
            },
          ],
        },
      ],
    }),
    [tCommon]
  );
}
