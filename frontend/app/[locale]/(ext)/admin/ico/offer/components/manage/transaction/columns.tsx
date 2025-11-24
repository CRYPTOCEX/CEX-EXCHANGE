import {
  CalendarIcon,
  DollarSign,
  ClipboardCheck,
  Clock,
  FileText,
  Wallet as WalletIcon,
} from "lucide-react";
import { format } from "date-fns";

export const columns: ColumnDefinition[] = [
  {
    key: "id",
    title: "ID",
    type: "text",
    sortable: true,
    searchable: true,
    filterable: true,
    icon: ClipboardCheck,
    description: "Unique identifier for the transaction",
    priority: 2,
    expandedOnly: true,
  },
  {
    key: "offering.name",
    title: "Offering",
    sortKey: "offering.name",
    type: "text",
    sortable: true,
    searchable: true,
    filterable: true,
    icon: FileText,
    description: "Name of the ICO offering",
  },
  {
    key: "transactionId",
    title: "Transaction ID",
    type: "text",
    sortable: true,
    searchable: true,
    filterable: true,
    icon: FileText,
    description: "Unique transaction ID",
    expandedOnly: true,
  },
  {
    key: "walletAddress",
    title: "Wallet Address",
    type: "text",
    sortable: true,
    searchable: true,
    filterable: true,
    icon: WalletIcon,
    description: "Wallet address used for the transaction",
    expandedOnly: true,
  },
  {
    key: "amount",
    title: "Token Amount",
    type: "number",
    icon: DollarSign,
    sortable: true,
    searchable: true,
    filterable: true,
    description: "Number of tokens purchased",
  },
  {
    key: "price",
    title: "Token Price (USD)",
    type: "number",
    icon: DollarSign,
    sortable: true,
    searchable: true,
    filterable: true,
    description: "Price per token at purchase",
  },
  {
    key: "status",
    title: "Status",
    type: "select",
    icon: Clock,
    sortable: true,
    searchable: true,
    filterable: true,
    description: "Transaction status",
    render: {
      type: "badge",
      config: {
        withDot: true,
        variant: (value: string) => {
          switch (value.toUpperCase()) {
            case "PENDING":
              return "warning";
            case "VERIFICATION":
              return "info";
            case "RELEASED":
              return "success";
            case "REJECTED":
              return "destructive";
            default:
              return "default";
          }
        },
      },
    },
    options: [
      { value: "PENDING", label: "Pending" },
      { value: "VERIFICATION", label: "Verification" },
      { value: "RELEASED", label: "Released" },
      { value: "REJECTED", label: "Rejected" },
    ],
  },
  {
    key: "createdAt",
    title: "Created At",
    type: "date",
    icon: CalendarIcon,
    sortable: true,
    searchable: true,
    filterable: true,
    description: "Date when the transaction was created",
    render: {
      type: "date",
      format: "PPP",
    },
    priority: 3,
  },
];
