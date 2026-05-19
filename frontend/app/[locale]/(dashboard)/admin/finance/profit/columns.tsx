"use client";

import {
  CalendarIcon,
  DollarSign,
  TrendingUp,
  ClipboardList,
  Link as LinkIcon,
} from "lucide-react";
import { format } from "date-fns";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
export function useColumns(): ColumnDefinition[] {
  const tCommon = useTranslations("common");
  const tDashboardAdmin = useTranslations("dashboard_admin");
  const tExt = useTranslations("ext");
  return [
    {
      key: "id",
      title: tCommon("id"),
      type: "text",
      icon: ClipboardList,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tDashboardAdmin("unique_identifier_for_the_profit_record"),
      priority: 1,
    },
    {
      key: "transaction",
      title: tCommon("transaction"),
      type: "custom",
      icon: LinkIcon,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tDashboardAdmin("associated_transaction"),
      render: (value: any, row: any) => {
        const tx = row?.transaction || value;
        if (tx && typeof tx === "object" && tx.id) {
          return (
            <Link
              href={`/admin/finance/transaction/${tx.id}`}
              className="text-blue-600 hover:underline"
            >
              {tx.id}
            </Link>
          );
        }
        return "N/A";
      },
      priority: 1,
    },
    {
      key: "type",
      title: tCommon("type"),
      type: "select",
      icon: TrendingUp,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tDashboardAdmin("profit_type"),
      render: {
        type: "badge",
        config: {
          withDot: true,
          variant: (value: string) => {
            switch (value.toUpperCase()) {
              case "DEPOSIT":
                return "success";
              case "WITHDRAW":
                return "danger";
              case "TRANSFER":
                return "warning";
              case "BINARY_ORDER":
                return "info";
              case "EXCHANGE_ORDER":
                return "primary";
              case "INVESTMENT":
                return "secondary";
              case "AI_INVESTMENT":
                return "secondary";
              case "FOREX_DEPOSIT":
                return "success";
              case "FOREX_WITHDRAW":
                return "danger";
              case "FOREX_INVESTMENT":
                return "secondary";
              case "ICO_CONTRIBUTION":
                return "info";
              case "STAKING":
                return "primary";
              case "P2P_TRADE":
                return "warning";
              default:
                return "default";
            }
          },
        },
      },
      options: [
        { value: "DEPOSIT", label: tCommon("deposit") },
        { value: "WITHDRAW", label: tCommon("withdraw") },
        { value: "TRANSFER", label: tCommon("transfer") },
        { value: "BINARY_ORDER", label: tCommon("binary_order") },
        { value: "EXCHANGE_ORDER", label: tCommon("exchange_order") },
        { value: "INVESTMENT", label: tCommon("investment") },
        { value: "AI_INVESTMENT", label: tCommon("ai_investment") },
        { value: "FOREX_DEPOSIT", label: tCommon("forex_deposit") },
        { value: "FOREX_WITHDRAW", label: tCommon("forex_withdraw") },
        { value: "FOREX_INVESTMENT", label: tCommon("forex_investment") },
        { value: "ICO_CONTRIBUTION", label: tCommon("ico_contribution") },
        { value: "STAKING", label: tCommon("staking") },
        { value: "P2P_TRADE", label: tCommon("p2p_trade") },
      ],
      priority: 1,
    },
    {
      key: "amount",
      title: tCommon("amount"),
      type: "number",
      icon: DollarSign,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tDashboardAdmin("profit_amount"),
      priority: 1,
    },
    {
      key: "currency",
      title: tCommon("currency"),
      type: "text",
      icon: DollarSign,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tDashboardAdmin("currency_of_the_profit"),
      priority: 1,
    },
    {
      key: "chain",
      title: tExt("chain"),
      type: "text",
      icon: ClipboardList,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tDashboardAdmin("blockchain_or_chain_if_applicable"),
      expandedOnly: true,
      priority: 2,
    },
    {
      key: "description",
      title: tCommon("description"),
      type: "text",
      icon: ClipboardList,
      sortable: false,
      searchable: true,
      filterable: false,
      description: tDashboardAdmin("additional_description"),
      expandedOnly: true,
      priority: 3,
    },
    {
      key: "createdAt",
      title: tCommon("created_at"),
      type: "date",
      icon: CalendarIcon,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tDashboardAdmin("date_when_the_profit_record_was_created"),
      render: {
        type: "date",
        format: "PPP",
      },
      expandedOnly: true,
      priority: 2,
    },
  ];
}
