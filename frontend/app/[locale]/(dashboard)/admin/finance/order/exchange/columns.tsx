"use client";
import React from "react";
import {
  Shield,
  User,
  DollarSign,
  ClipboardList,
  CalendarIcon,
  TrendingUp,
  ArrowLeftRight,
  Link as LinkIcon,
  Braces,
  Clock,
  ListOrdered,
  Percent,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { statusLabel, statusTone } from "@/lib/status-tone";
import type { ViewConfig } from "@/components/blocks/data-table/types/table";
import {
  OrderFillSummary,
  OrderFillsTable,
  OrderSideMark,
  formatOrderDate,
  formatOrderNumber,
  parseTrades,
  renderOrderId,
} from "../ecosystem/columns";
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
      description: tCommon("unique_identifier_for_the_order"),
      priority: 2,
      expandedOnly: true,
    },
    {
      key: "referenceId",
      title: tCommon("reference_id"),
      type: "text",
      icon: LinkIcon,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tDashboardAdmin("external_exchange_reference_id"),
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
      description: tDashboardAdmin("trader_details"),
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
    },
    {
      key: "symbol",
      title: tCommon("symbol"),
      type: "text",
      icon: TrendingUp,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tDashboardAdmin("trading_pair_e_g_btc_usdt"),
      priority: 1,
    },
    {
      key: "type",
      title: tCommon("order_type"),
      type: "select",
      icon: ArrowLeftRight,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tDashboardAdmin("market_or_limit_order"),
      options: [
        { value: "MARKET", label: tCommon("market") },
        { value: "LIMIT", label: tCommon("limit") },
      ],
      priority: 1,
    },
    {
      key: "timeInForce",
      title: tCommon("time_in_force"),
      /* THE VENUE ANSWERS THIS COLUMN, NOT THE PLATFORM.
       *
       * This was a select filter offering GTC / IOC / FOK / PO, which reads
       * as four policies an operator can trade spot with. The ccxt spot path
       * asks for none of them: `exchange.createOrder(symbol, type, side,
       * amount, price)` is five positional arguments with no `params` object
       * (backend/src/api/exchange/order/index.post.ts:299-305), and only
       * `limit` and `market` get that far (same file, line 160). Whatever
       * lands here is copied verbatim out of the venue's own order record
       * (`mapOrderData`, line 731), so the set of values belongs to the
       * venue — ccxt's kucoin can report GTD, which is not even in the
       * model ENUM. A free-text filter matches what a row actually holds;
       * a fixed list of four could only offer three that never occur.
       */
      type: "text",
      icon: ClipboardList,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tDashboardAdmin("gtc_ioc_fok_or_po"),
      priority: 1,
      expandedOnly: true,
    },
    {
      key: "side",
      title: tCommon("side"),
      type: "select",
      icon: ArrowLeftRight,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tCommon("buy_or_sell"),
      options: [
        { value: "BUY", label: tCommon("buy") },
        { value: "SELL", label: tCommon("sell") },
      ],
      render: {
        type: "badge",
        config: {
          variant: (value: string) => {
            switch (value?.toUpperCase()) {
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
      sortable: true,
      searchable: true,
      filterable: true,
      description: tDashboardAdmin("order_price_per_unit"),
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
      description: tDashboardAdmin("order_quantity"),
      priority: 1,
    },
    {
      key: "filled",
      title: tCommon("filled"),
      type: "number",
      icon: DollarSign,
      sortable: true,
      searchable: false,
      filterable: true,
      description: tDashboardAdmin("amount_filled"),
      priority: 1,
      expandedOnly: true,
    },
    {
      key: "remaining",
      title: `${tCommon("remaining")}:`,
      type: "number",
      icon: DollarSign,
      sortable: true,
      searchable: false,
      filterable: true,
      description: tDashboardAdmin("amount_remaining"),
      priority: 1,
      expandedOnly: true,
    },
    {
      key: "cost",
      title: tCommon("cost"),
      type: "number",
      icon: DollarSign,
      sortable: true,
      searchable: false,
      filterable: true,
      description: tCommon("total_cost"),
      priority: 1,
      expandedOnly: true,
    },
    {
      key: "fee",
      title: tCommon("fee"),
      type: "number",
      icon: DollarSign,
      sortable: true,
      searchable: false,
      filterable: true,
      description: tCommon("transaction_fee"),
      priority: 1,
      expandedOnly: true,
    },
    {
      key: "feeCurrency",
      title: tDashboardAdmin("fee_currency"),
      type: "text",
      icon: DollarSign,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tDashboardAdmin("currency_for_the_fee"),
      priority: 1,
      expandedOnly: true,
    },
    {
      key: "status",
      title: tCommon("status"),
      type: "select",
      icon: ClipboardList,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tCommon("order_status"),
      options: [
        { value: "OPEN", label: tCommon("open") },
        { value: "CLOSED", label: tCommon("closed") },
        { value: "CANCELED", label: tDashboardAdmin("canceled") },
        { value: "EXPIRED", label: tCommon("expired") },
        { value: "REJECTED", label: tCommon("rejected") },
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
      key: "createdAt",
      title: tCommon("created_at"),
      type: "date",
      icon: CalendarIcon,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tDashboardAdmin("order_creation_date"),
      priority: 2,
      expandedOnly: true,
      render: { type: "date", format: "PPP", fullDate: true },
    },
  ];
}

/* -------------------------------------------------------------------------- *
 * View dialog
 *
 * This is the only one of the three order tables that joins the trader, so the
 * record has a genuine identity facet on top of the money: who placed it, what
 * it filled at, what the venue called it (`referenceId`), and the per-order
 * `metadata` the HOLD-model settlement writes. The default panel showed the
 * first fifteen columns as one flat grid and none of the last three at all,
 * because they have no column of their own.
 *
 * The fills table and the number/date formatters are shared with the ecosystem
 * order table, where they live.
 * -------------------------------------------------------------------------- */

/** `metadata` arrives parsed by the model's getter, but a raw string is possible. */
function formatOrderMetadata(value: any): string {
  if (typeof value === "string") {
    try {
      return JSON.stringify(JSON.parse(value), null, 2);
    } catch {
      return value;
    }
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
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
          id: "trader",
          title: tCommon("trader"),
          icon: User,
          columns: 3,
          fields: [
            {
              // Keyed on `userId` rather than on a name field: a tile whose own
              // value is empty renders a dash and never reaches `render`, and
              // plenty of accounts have no first name.
              key: "userId",
              title: tCommon("name"),
              icon: User,
              render: (_value, row) =>
                [row.user?.firstName, row.user?.lastName]
                  .filter(Boolean)
                  .join(" ") ||
                row.user?.email ||
                "Unknown",
            },
            {
              key: "user.email",
              title: tCommon("email"),
              icon: ClipboardList,
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
              render: renderOrderId,
            },
          ],
        },
        {
          id: "pricing",
          title: tCommon("pricing"),
          icon: DollarSign,
          columns: 2,
          fields: [
            "price",
            {
              // No column of its own, so the generic grid never showed it —
              // even though it is the only field that says what the order
              // actually executed at.
              key: "average",
              title: t("average_fill_price"),
              icon: DollarSign,
              render: (value) => formatOrderNumber(value),
            },
          ],
        },
        {
          id: "fills",
          title: t("fills"),
          icon: ListOrdered,
          // Hidden rather than shown empty: an order that never traded has no
          // fills, and an empty table is a worse answer than no section.
          condition: (row) => parseTrades(row.trades).length > 0,
          render: (row) => <OrderFillsTable trades={parseTrades(row.trades)} />,
        },
        {
          id: "reference",
          title: t("order_reference"),
          description:
            t("the_local_order_id_and_the"),
          icon: LinkIcon,
          columns: 2,
          fields: ["id", "referenceId"],
        },
        {
          id: "metadata",
          title: tCommon("metadata"),
          icon: Braces,
          columns: 1,
          condition: (row) =>
            row.metadata != null &&
            (typeof row.metadata !== "object" ||
              Object.keys(row.metadata).length > 0),
          fields: [
            {
              key: "metadata",
              title: t("order_metadata"),
              icon: Braces,
              fullWidth: true,
              render: (value) => (
                <pre className="max-h-64 overflow-auto rounded-lg border border-border bg-muted p-3 text-xs whitespace-pre-wrap break-all">
                  {formatOrderMetadata(value)}
                </pre>
              ),
            },
          ],
        },
        {
          id: "timeline",
          title: tCommon("timeline"),
          icon: Clock,
          columns: 3,
          fields: [
            { key: "createdAt", title: tCommon("placed"), icon: Clock },
            {
              key: "updatedAt",
              title: tCommon("last_updated"),
              icon: Clock,
              render: (value) => formatOrderDate(value),
            },
            {
              key: "deletedAt",
              title: tCommon("deleted"),
              icon: Clock,
              condition: (row) => Boolean(row.deletedAt),
              render: (value) => (
                <span className="text-destructive">{formatOrderDate(value)}</span>
              ),
            },
          ],
        },
      ],
    }),
    []
  );
}
