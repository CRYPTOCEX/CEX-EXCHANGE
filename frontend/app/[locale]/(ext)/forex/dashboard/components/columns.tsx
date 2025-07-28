import {
  Shield,
  DollarSign,
  Clock,
  TrendingUp,
  BarChart,
  User as UserIcon,
  Calendar,
  CheckCircle,
  XCircle,
  PauseCircle,
  ArrowRightCircle,
} from "lucide-react";

export const forexInvestmentColumns: ColumnDefinition[] = [
  {
    key: "id",
    title: "ID",
    type: "text",
    icon: Shield,
    sortable: true,
    searchable: true,
    filterable: true,
    description: "Investment ID",
    priority: 3,
    expandedOnly: true,
  },
  {
    key: "userId",
    title: "User",
    type: "text",
    icon: UserIcon,
    sortable: true,
    searchable: true,
    filterable: true,
    editable: false,
    description: "Investor User ID",
    expandedOnly: true,
    // Optionally use a render function if you want to resolve user name/email by API.
  },
  {
    key: "plan",
    title: "Plan",
    type: "select",
    icon: BarChart,
    sortable: true,
    searchable: true,
    filterable: true,
    editable: true,
    usedInCreate: true,
    apiEndpoint: {
      url: "/api/admin/forex/plan/options",
      method: "GET",
    },
    description: "Investment Plan",
    priority: 2,
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
    title: "Duration",
    type: "select",
    icon: Clock,
    sortable: true,
    searchable: true,
    filterable: true,
    editable: true,
    usedInCreate: true,
    apiEndpoint: {
      url: "/api/admin/forex/duration/options",
      method: "GET",
    },
    description: "Investment Duration",
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
    title: "Amount",
    type: "number",
    icon: DollarSign,
    sortable: true,
    filterable: true,
    editable: true,
    usedInCreate: true,
    description: "Invested Amount",
    priority: 1,
  },
  {
    key: "profit",
    title: "Profit",
    type: "number",
    icon: TrendingUp,
    sortable: true,
    filterable: true,
    editable: false,
    description: "Profit (if completed)",
    priority: 1,
  },
  {
    key: "result",
    title: "Result",
    type: "select",
    sortable: true,
    filterable: true,
    editable: false,
    options: [
      { value: "WIN", label: "Win" },
      { value: "LOSS", label: "Loss" },
      { value: "DRAW", label: "Draw" },
    ],
    render: {
      type: "badge",
      config: {
        variant: (value) => {
          switch (value) {
            case "WIN":
              return "success";
            case "LOSS":
              return "danger";
            case "DRAW":
              return "warning";
            default:
              return "muted";
          }
        },
      },
    },
    description: "Result after completion",
    priority: 2,
  },
  {
    key: "status",
    title: "Status",
    type: "select",
    icon: ArrowRightCircle,
    sortable: true,
    filterable: true,
    editable: true,
    usedInCreate: true,
    options: [
      { value: "ACTIVE", label: "Active" },
      { value: "COMPLETED", label: "Completed" },
      { value: "CANCELLED", label: "Cancelled" },
      { value: "REJECTED", label: "Rejected" },
    ],
    render: {
      type: "badge",
      config: {
        variant: (value) => {
          switch (value) {
            case "ACTIVE":
              return "primary";
            case "COMPLETED":
              return "success";
            case "CANCELLED":
              return "danger";
            case "REJECTED":
              return "warning";
            default:
              return "muted";
          }
        },
      },
    },
    description: "Investment Status",
    priority: 1,
  },
  {
    key: "createdAt",
    title: "Created At",
    type: "date",
    icon: Calendar,
    sortable: true,
    filterable: true,
    editable: false,
    description: "Created Date",
    priority: 2,
    // expandedOnly: true,
  },
  // {
  //   key: "endDate",
  //   title: "End Date",
  //   type: "date",
  //   icon: Calendar,
  //   sortable: true,
  //   filterable: true,
  //   editable: false,
  //   description: "Investment End Date",
  //   priority: 2,
  //   // expandedOnly: true,
  // },
];
