import {
  Shield,
  ClipboardList,
  DollarSign,
  CalendarIcon,
  User,
} from "lucide-react";

export const columns: ColumnDefinition[] = [
  {
    key: "id",
    title: "ID",
    type: "text",
    icon: Shield,
    sortable: true,
    searchable: true,
    filterable: true,
    description: "Unique investment ID",
    priority: 3,
    expandedOnly: true,
  },
  {
    key: "user",
    title: "User",
    type: "compound",
    expandedTitle: (row) => `User: ${row.id}`,
    icon: User,
    sortable: true,
    searchable: true,
    filterable: true,
    description: "Investor",
    render: {
      type: "compound",
      config: {
        image: {
          key: "avatar",
          fallback: "/img/placeholder.svg",
          type: "image",
          title: "Avatar",
          description: "User's profile picture",
          filterable: false,
          sortable: false,
        },
        primary: {
          key: ["firstName", "lastName"],
          title: ["First Name", "Last Name"],
          icon: User,
          editable: false,
          usedInCreate: false,
        },
        secondary: {
          key: "email",
          title: "Email",
          editable: false,
          usedInCreate: false,
        },
      },
    },
    priority: 1,
  },
  {
    key: "plan",
    title: "Plan",
    type: "custom",

    sortable: true,
    searchable: true,
    filterable: true,
    description: "Investment plan",
    render: (value: any, row: any) => (row?.plan ? row.plan.title : "N/A"),
    priority: 1,
  },
  {
    key: "duration",
    title: "Duration",
    type: "custom",

    sortable: true,
    searchable: false,
    filterable: false,
    description: "Duration details",
    render: (value: any, row: any) => {
      const duration = row?.duration || value;
      return duration ? `${duration.duration} ${duration.timeframe}` : "N/A";
    },
    priority: 2,
    expandedOnly: true,
  },
  {
    key: "amount",
    title: "Amount",
    type: "number",
    icon: DollarSign,
    sortable: true,
    searchable: false,
    filterable: true,
    description: "Invested amount",
    priority: 1,
  },
  {
    key: "profit",
    title: "Profit",
    type: "number",
    icon: DollarSign,
    sortable: true,
    searchable: false,
    filterable: true,
    editable: true,
    description: "Profit earned",
    priority: 1,
  },
  {
    key: "result",
    title: "Result",
    type: "select",
    sortable: true,
    searchable: true,
    filterable: true,
    editable: true,
    description: "WIN, LOSS, or DRAW",
    options: [
      { value: "WIN", label: "Win" },
      { value: "LOSS", label: "Loss" },
      { value: "DRAW", label: "Draw" },
    ],
    priority: 2,
    expandedOnly: true,
  },
  {
    key: "status",
    title: "Status",
    type: "select",
    sortable: true,
    searchable: true,
    filterable: true,
    editable: true,
    description: "Investment status",
    options: [
      { value: "ACTIVE", label: "Active" },
      { value: "COMPLETED", label: "Completed" },
      { value: "CANCELLED", label: "Cancelled" },
      { value: "REJECTED", label: "Rejected" },
    ],
    priority: 1,
    render: {
      type: "badge",
      config: {
        variant: (value: any) => {
          switch (value) {
            case "ACTIVE":
              return "primary";
            case "COMPLETED":
              return "success";
            case "CANCELLED":
              return "warning";
            case "REJECTED":
              return "danger";
            default:
              return "secondary";
          }
        },
      },
    },
  },
  {
    key: "createdAt",
    title: "Created At",
    type: "date",
    icon: CalendarIcon,
    sortable: true,
    searchable: true,
    filterable: true,
    description: "Investment date",
    render: { type: "date", format: "PPP" },
    priority: 2,
    expandedOnly: true,
  },
];
