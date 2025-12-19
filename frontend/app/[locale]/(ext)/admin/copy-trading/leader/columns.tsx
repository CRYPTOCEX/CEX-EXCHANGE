"use client";
import {
  User,
  Mail,
  Shield,
  TrendingUp,
  Users,
  DollarSign,
  Calendar,
  Award,
  Percent,
  LineChart,
} from "lucide-react";
import type {
  ColumnDefinition,
  FormConfig,
} from "@/components/blocks/data-table/types/table";
import { useTranslations } from "next-intl";

export function useColumns() {
  const t = useTranslations("ext_admin");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");

  return [
    {
      key: "id",
      title: tCommon("id"),
      type: "text",
      icon: Shield,
      sortable: true,
      searchable: true,
      filterable: false,
      description: t("unique_identifier_for_the_leader"),
      priority: 3,
      expandedOnly: true,
    },
    {
      key: "displayName",
      title: tExt("display_name"),
      type: "text",
      icon: Award,
      sortable: true,
      searchable: true,
      filterable: true,
      description: t("leaders_public_display_name"),
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
      description: t("account_owner_information"),
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
      key: "status",
      title: tCommon("status"),
      type: "select",
      icon: Shield,
      sortable: true,
      searchable: false,
      filterable: true,
      description: t("current_status_of_the_leader"),
      options: [
        { value: "PENDING", label: tCommon("pending"), color: "warning" },
        { value: "ACTIVE", label: tCommon("active"), color: "success" },
        { value: "SUSPENDED", label: tCommon("suspended"), color: "danger" },
        { value: "REJECTED", label: tCommon("rejected"), color: "muted" },
        { value: "INACTIVE", label: tCommon("inactive"), color: "muted" },
      ],
      render: {
        type: "badge",
        config: {
          variant: (value: string) => {
            switch (value) {
              case "PENDING":
                return "warning";
              case "ACTIVE":
                return "success";
              case "SUSPENDED":
                return "danger";
              case "REJECTED":
                return "muted";
              case "INACTIVE":
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
      key: "winRate",
      title: tCommon("win_rate"),
      type: "number",
      icon: Percent,
      sortable: true,
      searchable: false,
      filterable: true,
      description: t("percentage_of_winning_trades"),
      priority: 1,
      render: {
        type: "custom",
        render: (value: number) => `${value?.toFixed(1) || 0}%`,
      },
    },
    {
      key: "roi",
      title: tCommon("roi"),
      type: "number",
      icon: TrendingUp,
      sortable: true,
      searchable: false,
      filterable: true,
      description: t("return_on_investment_percentage"),
      priority: 1,
      render: {
        type: "custom",
        render: (value: number) => {
          const formatted = `${value >= 0 ? "+" : ""}${value?.toFixed(2) || 0}%`;
          const color = value >= 0 ? "text-success" : "text-danger";
          return <span className={color}>{formatted}</span>;
        },
      },
    },
    {
      key: "totalFollowers",
      title: tExt("followers"),
      type: "number",
      icon: Users,
      sortable: true,
      searchable: false,
      filterable: true,
      description: t("total_number_of_followers"),
      priority: 2,
    },
    {
      key: "marketsCount",
      title: "Markets",
      type: "number",
      icon: LineChart,
      sortable: false,
      searchable: false,
      filterable: false,
      description: "Number of markets declared for trading",
      priority: 1,
      render: {
        type: "custom",
        render: (_: any, row: any) => {
          const markets = row?.markets || [];
          const activeCount = markets.filter((m: any) => m.isActive).length;
          return `${activeCount} market${activeCount !== 1 ? "s" : ""}`;
        },
      },
    },
    {
      key: "totalVolume",
      title: tExt("total_volume"),
      type: "number",
      icon: DollarSign,
      sortable: true,
      searchable: false,
      filterable: true,
      description: t("total_trading_volume"),
      priority: 2,
      render: {
        type: "custom",
        render: (value: number) => `$${(value || 0).toLocaleString()}`,
      },
    },
    {
      key: "createdAt",
      title: t("applied_date"),
      type: "date",
      icon: Calendar,
      sortable: true,
      searchable: false,
      filterable: true,
      description: t("date_when_leader_applied"),
      priority: 2,
      render: {
        type: "date",
        format: "PP",
      },
    },
  ] as ColumnDefinition[];
}

export function useFormConfig() {
  const t = useTranslations("ext_admin");
  const tCommon = useTranslations("common");

  return {
    edit: {
      title: t("edit_leader"),
      description: t("update_leader_settings"),
      groups: [
        {
          id: "leader-info",
          title: t("leader_information"),
          icon: Award,
          priority: 1,
          fields: [
            { key: "displayName", required: true },
            {
              key: "status",
              required: true,
              options: [
                { value: "PENDING", label: tCommon("pending") },
                { value: "ACTIVE", label: tCommon("active") },
                { value: "SUSPENDED", label: tCommon("suspended") },
                { value: "REJECTED", label: tCommon("rejected") },
                { value: "INACTIVE", label: tCommon("inactive") },
              ],
            },
          ],
        },
      ],
    },
  } as FormConfig;
}
