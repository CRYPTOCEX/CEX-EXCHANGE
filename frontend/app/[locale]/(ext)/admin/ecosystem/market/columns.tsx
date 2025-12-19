"use client";
import { Shield, ClipboardList, CheckSquare, CalendarIcon, TrendingUp, Flame, Network } from "lucide-react";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";
import type { FormConfig } from "@/components/blocks/data-table/types/table";

export function useColumns(): ColumnDefinition[] {
  const tCommon = useTranslations("common");
  const tDashboardAdmin = useTranslations("dashboard_admin");
  const tExtAdmin = useTranslations("ext_admin");
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
          variant: (value: boolean) => value ? "info" : "secondary",
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
          variant: (value: boolean) => value ? "warning" : "secondary",
          labels: {
            true: "Hot",
            false: "Not Hot",
          },
        },
      },
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
          const t = useTranslations("common");
          const tExtAdmin = useTranslations("ext_admin");
          const tDashboardAdmin = useTranslations("dashboard_admin");
          if (!value) {
            return (
              <span className="text-sm text-muted-foreground">N/A</span>
            );
          }

          return (
            <Card>
              <CardContent className="p-5 space-y-3">
                {/* Taker */}
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{tExtAdmin("taker")}</Badge>
                  <span className="text-sm">{value.taker}</span>
                </div>

                {/* Maker */}
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{tExtAdmin("maker")}</Badge>
                  <span className="text-sm">{value.maker}</span>
                </div>

                {/* Precision */}
                {value.precision && (
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{tCommon("precision")}</Badge>
                    <span className="text-sm">
                      {tCommon("amount")}
                      {value.precision.amount}
                      {tCommon("price")} {value.precision.price}
                    </span>
                  </div>
                )}

                {/* Limits */}
                {value.limits && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">{tCommon("limits")}</h4>
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="py-1 pr-2 text-left font-medium">
                            {tCommon("type")}
                          </th>
                          <th className="py-1 pr-2 text-left font-medium">
                            {tCommon("min")}
                          </th>
                          <th className="py-1 pr-2 text-left font-medium">
                            {tCommon("max")}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(value.limits).map(
                          ([key, limit]: [string, any]) => (
                            <tr key={key} className="border-b last:border-none">
                              <td className="py-1 pr-2 capitalize">{key}</td>
                              <td className="py-1 pr-2">{limit.min ?? "-"}</td>
                              <td className="py-1 pr-2">{limit.max ?? "-"}</td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        },
      },
      priority: 3,
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
      description: tExtAdmin("date_and_time_when_the_market"),
      render: { type: "date", format: "PPP" },
      priority: 3,
      expandedOnly: true,
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
          fields: [
            { key: "isTrending" },
            { key: "isHot" },
          ],
        },
        {
          id: "status",
          title: tCommon("status"),
          icon: CheckSquare,
          priority: 3,
          fields: [
            { key: "status" },
          ],
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
          fields: [
            { key: "isTrending" },
            { key: "isHot" },
          ],
        },
        {
          id: "status",
          title: tCommon("status"),
          icon: CheckSquare,
          priority: 2,
          fields: [
            { key: "status" },
          ],
        },
      ],
    },
  };
}
