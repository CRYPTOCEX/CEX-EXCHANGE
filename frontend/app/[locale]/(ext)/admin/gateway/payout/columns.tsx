import {
  Hash,
  Building2,
  Mail,
  DollarSign,
  CheckCircle2,
  CalendarIcon,
  Wallet,
  FileText,
} from "lucide-react";

export const columns: ColumnDefinition[] = [
  {
    key: "id",
    title: "Payout ID",
    type: "text",
    icon: Hash,
    sortable: true,
    searchable: true,
    filterable: true,
    description: "Unique payout identifier",
    priority: 1,
  },
  {
    key: "merchant",
    title: "Merchant",
    type: "compound",
    icon: Building2,
    sortable: true,
    searchable: true,
    filterable: true,
    description: "The merchant receiving the payout",
    priority: 1,
    render: {
      type: "compound",
      config: {
        primary: {
          key: "name",
          title: "Merchant Name",
          description: "Merchant business name",
          editable: false,
          usedInCreate: false,
          icon: Building2,
        },
        secondary: {
          key: "email",
          title: "Email",
          icon: Mail,
          editable: false,
          usedInCreate: false,
        },
      },
    },
  },
  {
    key: "grossAmount",
    title: "Gross Amount",
    type: "number",
    icon: DollarSign,
    sortable: true,
    searchable: false,
    filterable: false,
    description: "Total amount before fees",
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
    key: "feeAmount",
    title: "Fee",
    type: "number",
    icon: DollarSign,
    sortable: true,
    searchable: false,
    filterable: false,
    description: "Payout fee",
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
    priority: 1,
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
    key: "walletType",
    title: "Wallet Type",
    type: "text",
    icon: Wallet,
    sortable: true,
    searchable: false,
    filterable: true,
    description: "Type of wallet for payout",
    expandedOnly: true,
  },
  {
    key: "paymentCount",
    title: "Payments",
    type: "number",
    icon: FileText,
    sortable: true,
    searchable: false,
    filterable: false,
    description: "Number of payments in this payout",
    expandedOnly: true,
  },
  {
    key: "refundCount",
    title: "Refunds",
    type: "number",
    icon: FileText,
    sortable: true,
    searchable: false,
    filterable: false,
    description: "Number of refunds deducted",
    expandedOnly: true,
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
    description: "Payout status",
    priority: 1,
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
    ],
  },
  {
    key: "periodStart",
    title: "Period Start",
    type: "date",
    icon: CalendarIcon,
    sortable: true,
    searchable: false,
    filterable: false,
    description: "Start of payout period",
    render: {
      type: "date",
      format: "PPP",
    },
    expandedOnly: true,
  },
  {
    key: "periodEnd",
    title: "Period End",
    type: "date",
    icon: CalendarIcon,
    sortable: true,
    searchable: false,
    filterable: false,
    description: "End of payout period",
    render: {
      type: "date",
      format: "PPP",
    },
    expandedOnly: true,
  },
  {
    key: "createdAt",
    title: "Created At",
    type: "date",
    icon: CalendarIcon,
    sortable: true,
    searchable: false,
    filterable: true,
    description: "Date when the payout was created",
    render: {
      type: "date",
      format: "PPP p",
    },
    priority: 3,
  },
];
