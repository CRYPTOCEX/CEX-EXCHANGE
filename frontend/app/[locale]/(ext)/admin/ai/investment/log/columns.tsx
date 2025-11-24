import {
  Shield,
  User,
  ClipboardList,
  DollarSign,
  CalendarIcon,
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
    description: "Unique investment identifier",
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
    description: "Investment plan used",
    render: (value: any, row: any) => {
      const plan = row?.plan || value;
      return plan ? plan.title : "N/A";
    },
    priority: 1,
  },
  {
    key: "duration",
    title: "Duration",
    type: "custom",
    sortable: true,
    searchable: false,
    filterable: false,
    description: "Investment duration details",
    render: (value: any, row: any) => {
      const duration = row?.duration || value;
      if (!duration) return "N/A";
      return `${duration.duration} ${duration.timeframe}`;
    },
    priority: 1,
    expandedOnly: true,
  },
  {
    key: "symbol",
    title: "Symbol",
    type: "text",
    sortable: true,
    searchable: true,
    filterable: true,
    description: "Market or pair symbol",
    priority: 1,
  },
  {
    key: "type",
    title: "Wallet Type",
    type: "select",
    sortable: true,
    searchable: true,
    filterable: true,
    editable: true,

    description: "SPOT or ECO",
    options: [
      { value: "SPOT", label: "Spot" },
      { value: "ECO", label: "Eco" },
    ],
    priority: 1,
    render: {
      type: "badge",
      config: {
        variant: (value) => {
          switch (value) {
            case "SPOT":
              return "success";
            case "ECO":
              return "info";
            default:
              return "secondary";
          }
        },
        withDot: false,
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
    render: {
      type: "badge",
      config: {
        variant: (value: any) => {
          switch (value) {
            case "WIN":
              return "success";
            case "LOSS":
              return "danger";
            case "DRAW":
              return "info";
            default:
              return "default";
          }
        },
        withDot: false,
      },
    },
  },
  {
    key: "status",
    title: "Status",
    type: "select",
    sortable: true,
    searchable: true,
    filterable: true,
    editable: true,
    description: "ACTIVE, COMPLETED, CANCELLED, REJECTED",
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
              return "default";
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
    description: "Log creation date",
    render: { type: "date", format: "PPP" },
    priority: 2,
    expandedOnly: true,
  },
];
