"use client";
import {
  Shield,
  ClipboardList,
  CheckSquare,
  CalendarIcon,
  TrendingUp,
  Flame,
  Network,
  Percent,
  Hash,
  Gauge,
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowDownUp,
  DollarSign,
  Coins,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";
import type { FormConfig } from "@/components/blocks/data-table/types/table";

export function useColumns(): ColumnDefinition[] {
  const tCommon = useTranslations("common");
  const tDashboardAdmin = useTranslations("dashboard_admin");
  const tExtAdmin = useTranslations("ext_admin");
  const t = useTranslations("ext");
  return [
    {
      key: "id",
      title: tCommon("id"),
      type: "text",
      icon: Shield,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("unique_market_identifier_in_the_ecosystem_database"),
      priority: 3,
      expandedOnly: true,
    },
    {
      key: "currency",
      title: tCommon("currency"),
      type: "text",
      icon: ClipboardList,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("base_cryptocurrency_asset_symbol_for_the"),
      priority: 1,
    },
    {
      key: "pair",
      title: tDashboardAdmin("pair"),
      type: "text",
      icon: Network,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("complete_trading_pair_notation_e_g"),
      priority: 1,
    },
    {
      key: "status",
      title: tCommon("status"),
      type: "toggle",
      icon: CheckSquare,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("market_trading_status_active_or_inactive"),
      priority: 1,
    },
    {
      key: "isTrending",
      title: tCommon("trending"),
      type: "boolean",
      icon: TrendingUp,
      sortable: true,
      searchable: false,
      filterable: true,
      description: tExtAdmin("market_is_currently_trending_with_high"),
      priority: 2,
      expandedOnly: true,
      render: {
        type: "badge",
        config: {
          variant: (value: boolean) => (value ? "info" : "secondary"),
          labels: {
            true: "Trending",
            false: "Not Trending",
          },
        },
      },
    },
    {
      key: "isHot",
      title: tCommon("hot"),
      type: "boolean",
      icon: Flame,
      sortable: true,
      searchable: false,
      filterable: true,
      description: tExtAdmin("market_is_featured_as_hot_with"),
      priority: 2,
      expandedOnly: true,
      render: {
        type: "badge",
        config: {
          variant: (value: boolean) => (value ? "warning" : "secondary"),
          labels: {
            true: "Hot",
            false: "Not Hot",
          },
        },
      },
    },
    {
      key: "createdAt",
      title: tCommon("created_at"),
      type: "date",
      icon: CalendarIcon,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("date_and_time_when_the_market"),
      render: { type: "date", format: "PPP" },
      priority: 3,
      expandedOnly: true,
    },
    {
      key: "metadata",
      title: tCommon("metadata"),
      type: "custom",
      icon: ClipboardList,
      sortable: false,
      searchable: false,
      filterable: false,
      description: tExtAdmin("trading_fees_precision_settings_and_market"),
      render: {
        type: "custom",
        render: (value: any) => {
          if (!value) {
            return (
              <span className="text-sm text-muted-foreground">N/A</span>
            );
          }

          return (
            <div className="w-full space-y-4">
              {/* Trading Fees Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Taker Fee */}
                <div className="flex items-center gap-3 p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                  <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                    <ArrowDownToLine className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{tCommon("taker_fee")}</p>
                    <p className="text-lg font-semibold">{value.taker}%</p>
                  </div>
                </div>

                {/* Maker Fee */}
                <div className="flex items-center gap-3 p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                  <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                    <ArrowUpFromLine className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{tCommon("maker_fee")}</p>
                    <p className="text-lg font-semibold">{value.maker}%</p>
                  </div>
                </div>
              </div>

              {/* Precision Section */}
              {value.precision && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex items-center gap-3 p-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
                    <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0">
                      <Hash className="h-5 w-5 text-purple-500" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{tCommon("amount_precision")}</p>
                      <p className="text-lg font-semibold">{value.precision.amount} <span className="text-sm font-normal text-muted-foreground">decimals</span></p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-cyan-500/10 rounded-lg border border-cyan-500/20">
                    <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center shrink-0">
                      <DollarSign className="h-5 w-5 text-cyan-500" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{tCommon("price_precision")}</p>
                      <p className="text-lg font-semibold">{value.precision.price} <span className="text-sm font-normal text-muted-foreground">decimals</span></p>
                    </div>
                  </div>
                </div>
              )}

              {/* Limits Section */}
              {value.limits && (
                <div className="p-4 bg-muted/30 rounded-lg border">
                  <div className="flex items-center gap-2 mb-3">
                    <Gauge className="h-4 w-4 text-primary" />
                    <h4 className="text-sm font-semibold">{t("trading_limits")}</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* Amount Limits */}
                    <div className="p-3 bg-background rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <ArrowDownUp className="h-4 w-4 text-purple-500" />
                        <span className="text-xs font-medium text-muted-foreground uppercase">Amount</span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{tCommon("min")}</span>
                          <span className="font-mono">{value.limits.amount?.min ?? 0}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{tCommon("max")}</span>
                          <span className="font-mono">{value.limits.amount?.max || "∞"}</span>
                        </div>
                      </div>
                    </div>

                    {/* Price Limits */}
                    <div className="p-3 bg-background rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <DollarSign className="h-4 w-4 text-cyan-500" />
                        <span className="text-xs font-medium text-muted-foreground uppercase">Price</span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{tCommon("min")}</span>
                          <span className="font-mono">{value.limits.price?.min ?? 0}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{tCommon("max")}</span>
                          <span className="font-mono">{value.limits.price?.max || "∞"}</span>
                        </div>
                      </div>
                    </div>

                    {/* Cost Limits */}
                    <div className="p-3 bg-background rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Coins className="h-4 w-4 text-green-500" />
                        <span className="text-xs font-medium text-muted-foreground uppercase">Cost</span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{tCommon("min")}</span>
                          <span className="font-mono">{value.limits.cost?.min ?? 0}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{tCommon("max")}</span>
                          <span className="font-mono">{value.limits.cost?.max || "∞"}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        },
      },
      priority: 3,
      expandedOnly: true,
      fullWidth: true,
    },
  ];
}

export function useFormConfig(): FormConfig {
  const tCommon = useTranslations("common");
  const tExtAdmin = useTranslations("ext_admin");
  return {
    create: {
      groups: [
        {
          id: "market-basics",
          title: tExtAdmin("market_configuration"),
          icon: Network,
          priority: 1,
          fields: [
            { key: "currency", required: true },
            { key: "pair", required: true },
          ],
        },
        {
          id: "market-features",
          title: tExtAdmin("market_features"),
          icon: TrendingUp,
          priority: 2,
          fields: [{ key: "isTrending" }, { key: "isHot" }],
        },
        {
          id: "status",
          title: tCommon("status"),
          icon: CheckSquare,
          priority: 3,
          fields: [{ key: "status" }],
        },
      ],
    },
    edit: {
      groups: [
        {
          id: "market-features",
          title: tExtAdmin("market_features"),
          icon: TrendingUp,
          priority: 1,
          fields: [{ key: "isTrending" }, { key: "isHot" }],
        },
        {
          id: "status",
          title: tCommon("status"),
          icon: CheckSquare,
          priority: 2,
          fields: [{ key: "status" }],
        },
      ],
    },
  };
}
