import {
  Hash,
  DollarSign,
  CheckCircle2,
  CalendarIcon,
  FileText,
  Coins,
  User,
  Mail,
  Wallet,
} from "lucide-react";

export const columns: ColumnDefinition[] = [
  {
    key: "id",
    title: "Payment ID",
    type: "text",
    icon: Hash,
    sortable: true,
    searchable: true,
    filterable: true,
    description: "Unique payment identifier",
    priority: 1,
  },
  {
    key: "orderId",
    title: "Order ID",
    type: "text",
    icon: FileText,
    sortable: true,
    searchable: true,
    filterable: true,
    description: "External order identifier",
    priority: 2,
  },
  {
    key: "amount",
    title: "Amount",
    type: "number",
    icon: DollarSign,
    sortable: true,
    searchable: false,
    filterable: false,
    description: "Payment amount",
    priority: 1,
    render: {
      type: "custom",
      render: (value: number, row: any) => (
        <span className="font-medium">
          {value?.toFixed(2)} {row.currency}
        </span>
      ),
    },
  },
  {
    key: "walletType",
    title: "Wallet Type",
    type: "select",
    icon: Wallet,
    sortable: true,
    searchable: false,
    filterable: true,
    description: "Type of wallet used for payment",
    expandedOnly: true,
    options: [
      { value: "FIAT", label: "Fiat" },
      { value: "SPOT", label: "Spot" },
      { value: "ECO", label: "Ecosystem" },
    ],
  },
  {
    key: "currency",
    title: "Currency",
    type: "text",
    icon: Coins,
    sortable: true,
    searchable: false,
    filterable: true,
    description: "Payment currency",
    expandedOnly: true,
  },
  {
    key: "feeAmount",
    title: "Fee",
    type: "number",
    icon: DollarSign,
    sortable: true,
    searchable: false,
    filterable: false,
    description: "Transaction fee",
    expandedOnly: true,
    render: {
      type: "custom",
      render: (value: number, row: any) => (
        <span className="text-muted-foreground">
          {value?.toFixed(2)} {row.currency}
        </span>
      ),
    },
  },
  {
    key: "netAmount",
    title: "Net Amount",
    type: "number",
    icon: DollarSign,
    sortable: true,
    searchable: false,
    filterable: false,
    description: "Amount after fees",
    expandedOnly: true,
    render: {
      type: "custom",
      render: (value: number, row: any) => (
        <span className="font-medium text-green-600">
          {value?.toFixed(2)} {row.currency}
        </span>
      ),
    },
  },
  {
    key: "status",
    title: "Status",
    type: "select",
    icon: CheckCircle2,
    sortable: true,
    searchable: true,
    filterable: true,
    editable: false,
    usedInCreate: false,
    description: "Payment status",
    render: {
      type: "badge",
      config: {
        withDot: true,
        variant: (value: string) => {
          switch (value) {
            case "COMPLETED":
              return "success";
            case "PENDING":
              return "warning";
            case "PROCESSING":
              return "info";
            case "FAILED":
            case "CANCELLED":
              return "danger";
            case "EXPIRED":
              return "muted";
            case "REFUNDED":
              return "secondary";
            case "PARTIALLY_REFUNDED":
              return "warning";
            default:
              return "default";
          }
        },
      },
    },
    options: [
      { value: "PENDING", label: "Pending" },
      { value: "PROCESSING", label: "Processing" },
      { value: "COMPLETED", label: "Completed" },
      { value: "FAILED", label: "Failed" },
      { value: "CANCELLED", label: "Cancelled" },
      { value: "EXPIRED", label: "Expired" },
      { value: "REFUNDED", label: "Refunded" },
      { value: "PARTIALLY_REFUNDED", label: "Partially Refunded" },
    ],
  },
  {
    key: "customerEmail",
    title: "Customer",
    type: "text",
    icon: Mail,
    sortable: true,
    searchable: true,
    filterable: false,
    description: "Customer email",
    priority: 3,
  },
  {
    key: "customerName",
    title: "Customer Name",
    type: "text",
    icon: User,
    sortable: true,
    searchable: true,
    filterable: false,
    description: "Customer name",
    expandedOnly: true,
  },
  {
    key: "createdAt",
    title: "Created",
    type: "date",
    icon: CalendarIcon,
    sortable: true,
    searchable: false,
    filterable: true,
    description: "Date when the payment was created",
    render: {
      type: "date",
      format: "PPP p",
    },
    priority: 3,
  },
  {
    key: "completedAt",
    title: "Completed",
    type: "date",
    icon: CalendarIcon,
    sortable: true,
    searchable: false,
    filterable: false,
    description: "Date when the payment was completed",
    render: {
      type: "date",
      format: "PPP p",
    },
    expandedOnly: true,
  },
];
