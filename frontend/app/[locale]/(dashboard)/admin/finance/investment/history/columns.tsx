import {
  Shield,
  User,
  DollarSign,
  ClipboardList,
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
    description: "Unique identifier for the investment",
    priority: 2,
    expandedOnly: true,
  },
  {
    key: "user",
    title: "User",
    type: "compound",
    icon: User,
    sortable: true,
    searchable: true,
    filterable: true,
    description: "Investor information",
    render: {
      type: "compound",
      config: {
        image: {
          key: "avatar",
          fallback: "/img/placeholder.svg",
          type: "image",
          title: "Avatar",
          description: "User avatar",
          editable: false,
          usedInCreate: false,
        },
        primary: {
          key: ["firstName", "lastName"],
          title: ["First Name", "Last Name"],
          description: ["Investor's first name", "Investor's last name"],
          sortable: true,
          searchable: true,
          filterable: true,
          editable: false,
          usedInCreate: false,
          icon: User,
        },
        secondary: {
          key: "email",
          title: "Email",
          icon: ClipboardList,
          sortable: true,
          searchable: true,
          filterable: true,
          editable: false,
          usedInCreate: false,
        },
      },
    },
    priority: 1,
  },
  {
    key: "plan",
    idKey: "id",
    labelKey: "name",
    title: "Plan",
    type: "select",
    icon: ClipboardList,
    sortable: true,
    searchable: true,
    filterable: true,
    editable: true,
    sortKey: "plan.title",
    description: "Investment plan",
    render: (value: any, row: any) => {
      const plan = row?.plan || value;
      return plan ? plan.title : "N/A";
    },
    apiEndpoint: {
      url: "/api/admin/finance/investment/plan/options",
      method: "GET",
    },
    priority: 1,
  },
  {
    key: "duration",
    idKey: "id",
    labelKey: "name",
    title: "Duration",
    type: "select",
    icon: ClipboardList,
    sortable: true,
    searchable: false,
    filterable: false,
    editable: true,
    description: "Investment duration",
    // TODO: Fix sorting issue
    // sortKey: ["duration", "timeframe"],
    render: (value: any, row: any) => {
      const duration = row?.duration || value;
      return duration ? `${duration.duration} ${duration.timeframe}` : "N/A";
    },
    apiEndpoint: {
      url: "/api/admin/finance/investment/duration/options",
      method: "GET",
    },
    priority: 1,
  },
  {
    key: "amount",
    title: "Amount",
    type: "number",
    icon: DollarSign,
    sortable: true,
    searchable: false,
    filterable: true,
    editable: true,
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
    icon: ClipboardList,
    sortable: true,
    searchable: true,
    filterable: true,
    editable: true,
    description: "Investment result",
    options: [
      { value: "WIN", label: "Win" },
      { value: "LOSS", label: "Loss" },
      { value: "DRAW", label: "Draw" },
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
    editable: true,
    description: "Investment status",
    options: [
      { value: "ACTIVE", label: "Active" },
      { value: "COMPLETED", label: "Completed" },
      { value: "CANCELLED", label: "Cancelled" },
      { value: "REJECTED", label: "Rejected" },
    ],
    priority: 1,
  },
  {
    key: "endDate",
    title: "End Date",
    type: "date",
    icon: CalendarIcon,
    sortable: true,
    searchable: true,
    filterable: true,
    editable: true,
    description: "Investment end date",
    render: { type: "date", format: "PPP" },
    priority: 2,
    expandedOnly: true,
  },
  {
    key: "createdAt",
    title: "Created At",
    type: "date",
    icon: CalendarIcon,
    sortable: true,
    searchable: true,
    filterable: true,
    description: "Creation date",
    render: { type: "date", format: "PPP" },
    priority: 2,
    expandedOnly: true,
  },
];
