"use client";
import React from "react";
import {
  Shield,
  DollarSign,
  CheckSquare,
  TrendingUp,
  Clock,
  Flame,
  Hash,
  Coins
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type {
  FormConfig,
  ViewConfig,
} from "@/components/blocks/data-table/types/table";

import { useTranslations } from "next-intl";
export function useColumns(): ColumnDefinition[] {
  const tCommon = useTranslations("common");
  const tDashboardAdmin = useTranslations("dashboard_admin");
  return [
    {
      key: "id",
      title: "ID",
      type: "text",
      icon: Hash,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tDashboardAdmin("unique_identifier_for_the_exchange_market"),
      priority: 3,
      expandedOnly: true
    },
    {
      key: "currency",
      title: tCommon("currency"),
      type: "text",
      icon: Coins,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tDashboardAdmin("base_currency_of_the_trading_pair"),
      priority: 1
    },
    {
      key: "pair",
      title: tCommon("pair"),
      type: "text",
      icon: Coins,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tDashboardAdmin("quote_currency_of_the_trading_pair"),
      priority: 1
    },
    {
      key: "symbol",
      title: tCommon("symbol"),
      type: "text",
      icon: TrendingUp,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tDashboardAdmin("trading_pair_symbol_e_g_btc_usd"),
      priority: 1,
      render: {
        type: "custom",
        render: (value: any, row: any) => {
          const currency = row.currency || "";
          const pair = row.pair || "";
          return `${currency}/${pair}`;
        }
      }
    },
    {
      key: "isTrending",
      title: tCommon("trending"),
      type: "boolean",
      icon: TrendingUp,
      sortable: true,
      searchable: false,
      filterable: true,
      description: tDashboardAdmin("mark_market_as_trending_for_visibility"),
      priority: 2,
      render: {
        type: "badge",
        config: {
          withDot: true,
          variant: (value: boolean) => (value ? "info" : "secondary"),
          labels: {
            true: "Trending",
            false: "Not Trending",
          },
        }
      }
    },
    {
      key: "isHot",
      title: tCommon("hot"),
      type: "boolean",
      icon: Flame,
      sortable: true,
      searchable: false,
      filterable: true,
      description: tDashboardAdmin("mark_market_as_hot_for_featured_display"),
      priority: 2,
      expandedOnly: true,
      render: {
        type: "badge",
        config: {
          withDot: true,
          variant: (value: boolean) => (value ? "warning" : "secondary"),
          labels: {
            true: "Hot",
            false: "Not Hot",
          },
        }
      }
    },
    {
      key: "metadata.precision.price",
      title: tCommon("price_precision"),
      type: "number",
      icon: Hash,
      sortable: false,
      searchable: false,
      filterable: false,
      description: tCommon("price_precision_explanation"),
      priority: 3,
      expandedOnly: true
    },
    {
      key: "metadata.precision.amount",
      title: tCommon("amount_precision"),
      type: "number",
      icon: Hash,
      sortable: false,
      searchable: false,
      filterable: false,
      description: tDashboardAdmin("number_of_decimal_places_for_amount_display"),
      priority: 3,
      expandedOnly: true
    },
    {
      key: "metadata.taker",
      title: tCommon("taker_fee"),
      type: "number",
      icon: DollarSign,
      sortable: false,
      searchable: false,
      filterable: false,
      description: tDashboardAdmin("fee_percentage_charged_to_taker_orders"),
      priority: 2,
      render: {
        type: "custom",
        render: (value: any) => {
          if (value === undefined || value === null) return "-";
          return `${(value * 100).toFixed(3)}%`;
        }
      }
    },
    {
      key: "metadata.maker",
      title: tCommon("maker_fee"),
      type: "number",
      icon: DollarSign,
      sortable: false,
      searchable: false,
      filterable: false,
      description: tDashboardAdmin("fee_percentage_charged_to_maker_orders"),
      priority: 2,
      render: {
        type: "custom",
        render: (value: any) => {
          if (value === undefined || value === null) return "-";
          return `${(value * 100).toFixed(3)}%`;
        }
      }
    },
    {
      key: "status",
      title: tCommon("status"),
      type: "boolean",
      render: {
        type: "toggle",
        config: {
          url: "/api/admin/finance/exchange/market/[id]/status",
          method: "PUT",
          field: "status",
          trueValue: true,
          falseValue: false
        }
      },
      icon: CheckSquare,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tDashboardAdmin("active_status_of_the_trading_market"),
      priority: 1
    },
    {
      key: "createdAt",
      title: tCommon("created_at"),
      type: "date",
      icon: Clock,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tDashboardAdmin("date_when_the_market_was_created"),
      render: { type: "date", format: "PPP" },
      priority: 3,
      expandedOnly: true
    },
  ];
}

/**
 * `metadata` is a TEXT column behind a JSON getter, so the row normally carries
 * a parsed object — but the same payload arrives as a raw string whenever the
 * getter is bypassed, and a market imported before a precision or fee key
 * existed carries only part of the object. Read it through one resolver so a
 * string never reaches `?.precision` and returns undefined silently.
 */
function marketMetadata(row: any): any {
  const metadata = row?.metadata;
  if (typeof metadata !== "string") return metadata ?? {};
  try {
    return JSON.parse(metadata) ?? {};
  } catch {
    return {};
  }
}

/**
 * Every figure below falls back to a dash rather than printing "undefined%" or
 * "NaN" for a market whose metadata never carried that key.
 */
function feePercent(value: any): string {
  const fee = Number(value);
  if (value === null || value === undefined || !Number.isFinite(fee)) return "—";
  // Stored as a fraction (0.001 = 0.1%), the same conversion the table cell does.
  return `${(fee * 100).toFixed(3)}%`;
}

function precisionValue(value: any): string {
  const places = Number(value);
  if (value === null || value === undefined || !Number.isFinite(places)) return "—";
  return `${places}`;
}

/**
 * The view dialog for an exchange market.
 *
 * The flat grid rendered a pair as twelve undifferentiated tiles in which
 * "CURRENCY / BTC" and "PAIR / USDT" sat apart from the SYMBOL that joins them,
 * and the four numbers that actually configure the market — two fees and two
 * precisions — were scattered between the boolean flags. The pair becomes the
 * header, the four numbers become the stat strip, and what is left is two small
 * groups: what the market shows as, and what the record is.
 */
export function useViewConfig(): ViewConfig {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");

  return React.useMemo<ViewConfig>(
    () => ({
      size: "3xl",

      // The primary column resolves to `currency` alone, so the header read
      // "BTC" — a base asset is not a market. The pair is.
      title: (row) => `${row.currency ?? "—"}/${row.pair ?? "—"}`,
      subtitle: (row) =>
        `Base ${row.currency ?? "—"} · Quote ${row.pair ?? "—"}`,

      badges: (row) => (
        <Badge tone={row.status ? "success" : "neutral"} appearance="soft">
          {row.status ? tCommon("active") : tCommon("disabled")}
        </Badge>
      ),

      stats: [
        {
          label: tCommon("maker_fee"),
          icon: DollarSign,
          value: (row) => feePercent(marketMetadata(row).maker),
        },
        {
          label: tCommon("taker_fee"),
          icon: DollarSign,
          value: (row) => feePercent(marketMetadata(row).taker),
        },
        {
          label: tCommon("price_precision"),
          icon: Hash,
          value: (row) => precisionValue(marketMetadata(row).precision?.price),
        },
        {
          label: tCommon("amount_precision"),
          icon: Hash,
          value: (row) => precisionValue(marketMetadata(row).precision?.amount),
        },
      ],

      sections: [
        {
          id: "market-visibility",
          title: t("visibility_availability"),
          description:
            t("whether_the_pair_is_tradable_and"),
          icon: Flame,
          columns: 3,
          fields: [
            // Keeps the column's toggle renderer, so a market can be taken
            // offline from the dialog rather than only from the table row.
            { key: "status", icon: CheckSquare },
            { key: "isTrending", icon: TrendingUp },
            { key: "isHot", icon: Flame },
          ],
        },
        {
          id: "market-record",
          title: tCommon("record"),
          icon: Shield,
          columns: 2,
          fields: [
            { key: "id", icon: Hash, copyable: true },
            { key: "createdAt", icon: Clock },
          ],
        },
      ],
    }),
    [tCommon]
  );
}

export function useFormConfig(): FormConfig {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  return {
    edit: {
      title: t("edit_market"),
      description: t("update_trading_pair_configuration"),
      groups: [
        {
          id: "market-basic",
          title: t("market_information"),
          icon: Coins,
          priority: 1,
          fields: [
            { key: "currency", required: true },
            { key: "pair", required: true },
            "isTrending",
            "isHot",
          ]
        },
        {
          id: "market-precision",
          title: t("precision_settings"),
          icon: Hash,
          priority: 2,
          fields: [
            { key: "metadata.precision.price", required: true },
            { key: "metadata.precision.amount", required: true },
          ]
        },
        {
          id: "market-fees",
          title: tCommon("trading_fees"),
          icon: DollarSign,
          priority: 3,
          fields: [
            { key: "metadata.taker", required: true },
            { key: "metadata.maker", required: true },
          ]
        },
      ]
    }
  };
}
