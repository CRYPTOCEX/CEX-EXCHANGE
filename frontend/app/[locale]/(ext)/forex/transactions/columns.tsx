import {
  Receipt,
  DollarSign,
  Calendar,
  ClipboardList,
  Hash,
  FileText,
  Wallet,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";

export const columns: ColumnDefinition[] = [
  {
    key: "id",
    title: "ID",
    type: "text",
    icon: Hash,
    sortable: true,
    searchable: true,
    filterable: true,
    editable: false,
    usedInCreate: false,
    description: "Transaction ID",
    priority: 3,
    expandedOnly: true,
  },
  {
    key: "type",
    title: "Type",
    type: "select",
    icon: ClipboardList,
    sortable: true,
    searchable: true,
    filterable: true,
    editable: false,
    usedInCreate: false,
    description: "Transaction type",
    render: {
      type: "badge",
      config: {
        withDot: true,
        variant: (value: string) => {
          switch (value) {
            case "FOREX_DEPOSIT":
              return "success";
            case "FOREX_WITHDRAW":
              return "destructive";
            default:
              return "default";
          }
        },
      },
    },
    options: [
      { value: "FOREX_DEPOSIT", label: "Forex Deposit" },
      { value: "FOREX_WITHDRAW", label: "Forex Withdraw" },
    ],
    priority: 1,
  },
  {
    key: "status",
    title: "Status",
    type: "select",
    icon: ClipboardList,
    sortable: true,
    searchable: true,
    filterable: true,
    editable: false,
    usedInCreate: false,
    description: "Transaction status",
    options: [
      { value: "PENDING", label: "Pending" },
      { value: "COMPLETED", label: "Completed" },
      { value: "FAILED", label: "Failed" },
      { value: "CANCELLED", label: "Cancelled" },
      { value: "EXPIRED", label: "Expired" },
      { value: "REJECTED", label: "Rejected" },
      { value: "REFUNDED", label: "Refunded" },
      { value: "FROZEN", label: "Frozen" },
      { value: "PROCESSING", label: "Processing" },
      { value: "TIMEOUT", label: "Timeout" },
    ],
    priority: 1,
    render: {
      type: "badge",
      config: {
        variant: (value: string) => {
          switch (value) {
            case "PENDING":
              return "secondary";
            case "PROCESSING":
              return "outline";
            case "COMPLETED":
              return "success";
            case "FAILED":
            case "CANCELLED":
            case "EXPIRED":
            case "REJECTED":
            case "REFUNDED":
            case "FROZEN":
            case "TIMEOUT":
              return "destructive";
            default:
              return "default";
          }
        },
      },
    },
  },
  {
    key: "amount",
    title: "Amount",
    type: "number",
    icon: DollarSign,
    sortable: true,
    searchable: false,
    filterable: true,
    editable: false,
    usedInCreate: false,
    description: "Transaction amount",
    priority: 1,
    render: {
      type: "number",
      format: { minimumFractionDigits: 2, maximumFractionDigits: 8 },
    },
  },
  {
    key: "wallet",
    title: "Wallet",
    type: "custom",
    icon: Wallet,
    sortable: true,
    searchable: true,
    filterable: true,
    editable: false,
    usedInCreate: false,
    description: "Wallet information",
    priority: 1,
    render: (value: any, row: any) => {
      const wallet = row?.wallet || value;
      if (!wallet) return "N/A";
      // If wallet has 'currency' and 'type', show them in a formatted string.
      if (wallet.currency && wallet.type) {
        return `${wallet.currency} (${wallet.type})`;
      }
      // Otherwise fallback to wallet.name or wallet.id
      return wallet.name || wallet.id || "N/A";
    },
  },
  {
    key: "createdAt",
    title: "Created",
    type: "date",
    icon: Calendar,
    sortable: true,
    searchable: false,
    filterable: true,
    editable: false,
    usedInCreate: false,
    description: "Transaction creation date",
    priority: 2,
    render: {
      type: "date",
      format: "MMM dd, yyyy HH:mm",
    },
  },
  {
    key: "fee",
    title: "Fee",
    type: "number",
    icon: Receipt,
    sortable: true,
    searchable: false,
    filterable: true,
    editable: false,
    usedInCreate: false,
    description: "Transaction fee",
    priority: 2,
    expandedOnly: true,
    render: {
      type: "number",
      format: { minimumFractionDigits: 2, maximumFractionDigits: 8 },
    },
  },
  {
    key: "description",
    title: "Description",
    type: "text",
    icon: FileText,
    sortable: false,
    searchable: true,
    filterable: false,
    editable: false,
    usedInCreate: false,
    description: "Transaction description",
    priority: 2,
    expandedOnly: true,
  },
  {
    key: "metadata",
    title: "Details",
    type: "text",
    icon: ClipboardList,
    sortable: false,
    searchable: false,
    filterable: false,
    editable: false,
    usedInCreate: false,
    description: "Transaction metadata",
    priority: 3,
    expandedOnly: true,
    render: {
      type: "custom",
      render: (value: any) => {
        if (!value) return <span className="text-gray-400">-</span>;
        
        try {
          const metadata = typeof value === "string" ? JSON.parse(value) : value;
          return (
            <div className="space-y-1">
              {metadata.accountId && (
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  Account: {metadata.accountId}
                </div>
              )}
              {metadata.currency && (
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  Currency: {metadata.currency}
                </div>
              )}
              {metadata.chain && (
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  Chain: {metadata.chain}
                </div>
              )}
              {metadata.price && (
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  Price: ${metadata.price}
                </div>
              )}
            </div>
          );
        } catch (e) {
          return <span className="text-gray-400">-</span>;
        }
      },
    },
  },
]; 