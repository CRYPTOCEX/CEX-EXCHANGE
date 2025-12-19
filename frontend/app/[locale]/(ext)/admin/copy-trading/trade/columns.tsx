"use client";
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
} from "lucide-react";
import type {
  ColumnDefinition,
  FormConfig,
} from "@/components/blocks/data-table/types/table";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";

export function useColumns() {
  const t = useTranslations("ext_admin");
  const tCommon = useTranslations("common");

  return [
    {
      key: "id",
      title: tCommon("id"),
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
      key: "side",
      title: tCommon("side"),
      type: "select",
      icon: TrendingUp,
      sortable: true,
      searchable: false,
      filterable: true,
      options: [
        { value: "BUY", label: tCommon("buy"), color: "success" },
        { value: "SELL", label: tCommon("sell"), color: "danger" },
      ],
      render: {
        type: "custom",
        render: (value: string) => {
          if (value === "BUY") {
            return (
              <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                <ArrowUpRight className="h-3 w-3 mr-1" />
                BUY
              </Badge>
            );
          }
          return (
            <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
              <ArrowDownRight className="h-3 w-3 mr-1" />
              SELL
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
            {value ? t("leader") : t("follower")}
          </Badge>
        ),
      },
      priority: 1,
    },
    {
      key: "leader",
      title: t("leader"),
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
      key: "pnl",
      title: t("pnl"),
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
          const color = value >= 0 ? "text-green-600" : "text-red-600";
          const Icon = value >= 0 ? TrendingUp : TrendingDown;
          return (
            <span className={`flex items-center gap-1 ${color}`}>
              <Icon className="h-3 w-3" />
              {value >= 0 ? "+" : ""}${value.toFixed(2)}
              {row.pnlPercent !== null && row.pnlPercent !== undefined && (
                <span className="text-xs opacity-70">
                  ({row.pnlPercent >= 0 ? "+" : ""}
                  {row.pnlPercent.toFixed(1)}%)
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
      options: [
        { value: "OPEN", label: tCommon("open"), color: "info" },
        { value: "CLOSED", label: tCommon("closed"), color: "success" },
        { value: "CANCELLED", label: tCommon("cancelled"), color: "muted" },
        { value: "FAILED", label: tCommon("failed"), color: "danger" },
        { value: "PENDING", label: tCommon("pending"), color: "warning" },
      ],
      render: {
        type: "badge",
        config: {
          variant: (value: string) => {
            switch (value) {
              case "OPEN":
                return "info";
              case "CLOSED":
                return "success";
              case "CANCELLED":
                return "muted";
              case "FAILED":
                return "danger";
              case "PENDING":
                return "warning";
              default:
                return "secondary";
            }
          },
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
