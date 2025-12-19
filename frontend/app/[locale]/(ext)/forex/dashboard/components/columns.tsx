import { useTranslations } from "next-intl";
import {
  Shield,
  DollarSign,
  Clock,
  TrendingUp,
  BarChart,
  Calendar,
  Activity,
  Wallet,
} from "lucide-react";

export function useForexInvestmentColumns() {
  const t = useTranslations("ext_forex");
  const tCommon = useTranslations("common");
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
    description: t("unique_identifier_for_this_forex_investment"),
    priority: 3,
    expandedOnly: true,
  },
  {
    key: "plan",
    title: tCommon("plan"),
    type: "custom",
    icon: BarChart,
    sortable: true,
    searchable: true,
    filterable: true,
    description: t("your_selected_forex_trading_plan_with"),
    priority: 1,
    render: {
      type: "custom",
      render: (value) => {
        if (!value) return "N/A";
        return value.title;
      },
    },
  },
  {
    key: "duration",
    title: tCommon("duration"),
    type: "custom",
    icon: Clock,
    sortable: true,
    searchable: true,
    filterable: true,
    description: t("investment_period_length_before_completion_and"),
    priority: 2,
    render: {
      type: "custom",
      render: (value) => {
        if (!value) return "N/A";
        return `${value.duration} ${value.timeframe}`;
      },
    },
  },
  {
    key: "amount",
    title: tCommon("amount"),
    type: "number",
    icon: Wallet,
    sortable: true,
    filterable: true,
    description: t("your_initial_investment_amount_deposited_into"),
    priority: 1,
  },
  {
    key: "profit",
    title: tCommon("profit_loss"),
    type: "number",
    icon: TrendingUp,
    sortable: true,
    filterable: true,
    description: tExtAdmin("total_profit_or_loss_generated_from"),
    priority: 1,
  },
  {
    key: "result",
    title: tCommon("result"),
    type: "select",
    icon: Activity,
    sortable: true,
    filterable: true,
    options: [
      { value: "WIN", label: tCommon("win") },
      { value: "LOSS", label: tCommon("loss") },
      { value: "DRAW", label: tCommon("draw") },
    ],
    render: {
      type: "badge",
      config: {
        variant: (value) => {
          switch (value) {
            case "WIN":
              return "success";
            case "LOSS":
              return "destructive";
            case "DRAW":
              return "secondary";
            default:
              return "secondary";
          }
        },
      },
    },
    description: tExtAdmin("final_trading_outcome_win_profit_loss"),
    priority: 2,
  },
  {
    key: "status",
    title: tCommon("status"),
    type: "select",
    icon: Activity,
    sortable: true,
    filterable: true,
    options: [
      { value: "ACTIVE", label: tCommon("active") },
      { value: "COMPLETED", label: tCommon("completed") },
      { value: "CANCELLED", label: tCommon("cancelled") },
      { value: "REJECTED", label: tCommon("rejected") },
    ],
    render: {
      type: "badge",
      config: {
        variant: (value) => {
          switch (value) {
            case "ACTIVE":
              return "success";
            case "COMPLETED":
              return "info";
            case "CANCELLED":
              return "secondary";
            case "REJECTED":
              return "destructive";
            default:
              return "secondary";
          }
        },
      },
    },
    description: t("current_status_of_your_investment_in"),
    priority: 1,
  },
  {
    key: "createdAt",
    title: tCommon("created_at"),
    type: "date",
    icon: Calendar,
    sortable: true,
    filterable: true,
    description: t("date_and_time_when_this_investment"),
    priority: 2,
  },
] as ColumnDefinition[];
}
