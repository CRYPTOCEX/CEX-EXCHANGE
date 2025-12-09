import {
  Hash,
  Building2,
  User,
  Mail,
  DollarSign,
  CheckCircle2,
  CalendarIcon,
  FileText,
  Coins,
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
    key: "merchant",
    title: "Merchant",
    type: "compound",
    icon: Building2,
    sortable: true,
    searchable: true,
    filterable: true,
    description: "The merchant receiving the payment",
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
    key: "customer",
    title: "Customer",
    type: "compound",
    icon: User,
    sortable: true,
    searchable: true,
    filterable: true,
    description: "The customer who made the payment",
    render: {
      type: "compound",
      config: {
        image: {
          key: "avatar",
          fallback: "/img/placeholder.svg",
          type: "image",
          title: "Avatar",
          description: "Customer avatar",
          editable: false,
          usedInCreate: false,
        },
        primary: {
          key: ["firstName", "lastName"],
          title: ["First Name", "Last Name"],
          description: ["Customer first name", "Customer last name"],
          editable: false,
          usedInCreate: false,
          icon: User,
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
    key: "orderId",
    title: "Order ID",
    type: "text",
    icon: FileText,
    sortable: true,
    searchable: true,
    filterable: true,
    description: "External order identifier",
    expandedOnly: true,
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
    key: "fee",
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
            case "FAILED":
            case "CANCELLED":
              return "danger";
            case "EXPIRED":
              return "muted";
            case "REFUNDED":
              return "info";
            case "PARTIALLY_REFUNDED":
              return "secondary";
            default:
              return "default";
          }
        },
      },
    },
    options: [
      { value: "PENDING", label: "Pending" },
      { value: "COMPLETED", label: "Completed" },
      { value: "FAILED", label: "Failed" },
      { value: "CANCELLED", label: "Cancelled" },
      { value: "EXPIRED", label: "Expired" },
      { value: "REFUNDED", label: "Refunded" },
      { value: "PARTIALLY_REFUNDED", label: "Partially Refunded" },
    ],
  },
  {
    key: "createdAt",
    title: "Created At",
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
    title: "Completed At",
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
