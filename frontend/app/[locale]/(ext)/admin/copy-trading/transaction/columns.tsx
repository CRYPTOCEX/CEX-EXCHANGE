"use client";
import {
  Shield,
  DollarSign,
  Calendar,
  User,
  Mail,
  FileText,
  ArrowUpRight,
  ArrowDownRight,
  Tag,
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
  const tExt = useTranslations("ext");

  const isCredit = (type: string) => {
    return ["ALLOCATION", "PROFIT_SHARE"].includes(type);
  };

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
      key: "type",
      title: tCommon("type"),
      type: "select",
      icon: Tag,
      sortable: true,
      searchable: false,
      filterable: true,
      options: [
        { value: "ALLOCATION", label: tExt("allocation"), color: "info" },
        { value: "WITHDRAWAL", label: tCommon("withdrawal"), color: "warning" },
        { value: "PROFIT_SHARE", label: tCommon("profit_share"), color: "success" },
        { value: "PLATFORM_FEE", label: tCommon("platform_fee"), color: "primary" },
        { value: "REVERSAL", label: t("reversal"), color: "danger" },
        { value: "ADJUSTMENT", label: t("adjustment"), color: "muted" },
      ],
      render: {
        type: "custom",
        render: (value: string) => {
          const colors: Record<string, string> = {
            ALLOCATION: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
            WITHDRAWAL: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
            PROFIT_SHARE: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
            PLATFORM_FEE: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
            REVERSAL: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
            ADJUSTMENT: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
          };
          return (
            <Badge className={colors[value] || ""}>
              {value?.replace("_", " ")}
            </Badge>
          );
        },
      },
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
      key: "description",
      title: tCommon("description"),
      type: "text",
      icon: FileText,
      sortable: false,
      searchable: true,
      filterable: false,
      priority: 2,
      render: {
        type: "custom",
        render: (value: string, row: any) => (
          <div className="max-w-[200px]">
            <div className="truncate">{value}</div>
            {row.subscription?.leader && (
              <div className="text-xs text-muted-foreground">
                Leader: {row.subscription.leader.displayName}
              </div>
            )}
          </div>
        ),
      },
    },
    {
      key: "amount",
      title: tCommon("amount"),
      type: "number",
      icon: DollarSign,
      sortable: true,
      searchable: false,
      filterable: true,
      priority: 1,
      render: {
        type: "custom",
        render: (value: number, row: any) => {
          const credit = isCredit(row.type);
          return (
            <span
              className={`flex items-center justify-end ${
                credit ? "text-green-600" : "text-red-600"
              }`}
            >
              {credit ? (
                <ArrowUpRight className="h-3 w-3 mr-1" />
              ) : (
                <ArrowDownRight className="h-3 w-3 mr-1" />
              )}
              ${Math.abs(value || 0).toLocaleString()}
            </span>
          );
        },
      },
    },
    {
      key: "fee",
      title: tCommon("fee"),
      type: "number",
      icon: DollarSign,
      sortable: true,
      searchable: false,
      filterable: false,
      priority: 2,
      render: {
        type: "custom",
        render: (value: number) =>
          value > 0 ? `$${value.toFixed(2)}` : "-",
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
        { value: "COMPLETED", label: tCommon("completed"), color: "success" },
        { value: "PENDING", label: tCommon("pending"), color: "warning" },
        { value: "FAILED", label: tCommon("failed"), color: "danger" },
        { value: "REVERSED", label: t("reversed"), color: "muted" },
      ],
      render: {
        type: "badge",
        config: {
          variant: (value: string) => {
            switch (value) {
              case "COMPLETED":
                return "success";
              case "PENDING":
                return "warning";
              case "FAILED":
                return "danger";
              case "REVERSED":
                return "muted";
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
      priority: 1,
      render: {
        type: "date",
        format: "PPpp",
      },
    },
  ] as ColumnDefinition[];
}

export function useFormConfig(): FormConfig {
  // Transactions are read-only, no create/edit forms needed
  return {};
}
