import {
  CalendarIcon,
  DollarSign,
  TrendingUp,
  ClipboardList,
  Link as LinkIcon,
} from "lucide-react";
import { format } from "date-fns";
import { Link } from "@/i18n/routing";

export const columns: ColumnDefinition[] = [
  {
    key: "id",
    title: "ID",
    type: "text",
    icon: ClipboardList,
    sortable: true,
    searchable: true,
    filterable: true,
    description: "Unique identifier for the profit record",
    priority: 1,
  },
  {
    key: "transaction",
    title: "Transaction",
    type: "custom",
    icon: LinkIcon,
    sortable: true,
    searchable: true,
    filterable: true,
    description: "Associated transaction",
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
    title: "Type",
    type: "select",
    icon: TrendingUp,
    sortable: true,
    searchable: true,
    filterable: true,
    editable: true,
    usedInCreate: true,
    description: "Profit type",
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
      { value: "DEPOSIT", label: "Deposit" },
      { value: "WITHDRAW", label: "Withdraw" },
      { value: "TRANSFER", label: "Transfer" },
      { value: "BINARY_ORDER", label: "Binary Order" },
      { value: "EXCHANGE_ORDER", label: "Exchange Order" },
      { value: "INVESTMENT", label: "Investment" },
      { value: "AI_INVESTMENT", label: "AI Investment" },
      { value: "FOREX_DEPOSIT", label: "Forex Deposit" },
      { value: "FOREX_WITHDRAW", label: "Forex Withdraw" },
      { value: "FOREX_INVESTMENT", label: "Forex Investment" },
      { value: "ICO_CONTRIBUTION", label: "ICO Contribution" },
      { value: "STAKING", label: "Staking" },
      { value: "P2P_TRADE", label: "P2P Trade" },
    ],
    priority: 1,
  },
  {
    key: "amount",
    title: "Amount",
    type: "number",
    icon: DollarSign,
    sortable: true,
    searchable: true,
    filterable: true,
    editable: true,
    usedInCreate: true,
    description: "Profit amount",
    priority: 1,
  },
  {
    key: "currency",
    title: "Currency",
    type: "text",
    icon: DollarSign,
    sortable: true,
    searchable: true,
    filterable: true,
    editable: true,
    usedInCreate: true,
    description: "Currency of the profit",
    priority: 1,
  },
  {
    key: "chain",
    title: "Chain",
    type: "text",
    icon: ClipboardList,
    sortable: true,
    searchable: true,
    filterable: true,
    editable: true,
    usedInCreate: true,
    description: "Blockchain or chain (if applicable)",
    expandedOnly: true,
    priority: 2,
  },
  {
    key: "description",
    title: "Description",
    type: "text",
    icon: ClipboardList,
    sortable: false,
    searchable: true,
    filterable: false,
    editable: true,
    usedInCreate: true,
    description: "Additional description",
    expandedOnly: true,
    priority: 3,
  },
  {
    key: "createdAt",
    title: "Created At",
    type: "date",
    icon: CalendarIcon,
    sortable: true,
    searchable: true,
    filterable: true,
    description: "Date when the profit record was created",
    render: {
      type: "date",
      format: "PPP",
    },
    expandedOnly: true,
    priority: 2,
  },
];
