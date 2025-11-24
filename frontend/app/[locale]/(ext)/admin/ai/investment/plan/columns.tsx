import {
  Shield,
  ClipboardList,
  Image as ImageIcon,
  CheckSquare,
  DollarSign,
  CalendarIcon,
} from "lucide-react";

export const columns: ColumnDefinition[] = [
  // Less critical (expanded only)
  {
    key: "id",
    title: "ID",
    type: "text",
    icon: Shield,
    sortable: true,
    searchable: true,
    filterable: true,
    description: "Unique plan identifier",
    priority: 3,
    expandedOnly: true,
  },
  {
    key: "plan",
    title: "Plan",
    type: "compound",
    expandedTitle: (row) => `Plan: ${row.name}`,
    disablePrefixSort: true,
    sortable: true,
    searchable: true,
    filterable: true,
    description: "Plan details",
    render: {
      type: "compound",
      config: {
        image: {
          key: "image",
          fallback: "/img/placeholder.svg",
          type: "image",
          title: "Image",
          description: "Plan image URL",
          filterable: false,
          sortable: false,
          editable: true,
          usedInCreate: true,
        },
        primary: {
          key: "name",
          title: "Name",
          editable: true,
          usedInCreate: true,
        },
      },
    },
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
    description: "Plan description",
    priority: 3,
    expandedOnly: true,
  },
  {
    key: "invested",
    title: "Invested",
    type: "number",
    icon: DollarSign,
    sortable: true,
    searchable: false,
    filterable: true,
    editable: true,
    usedInCreate: true,
    description: "Total amount invested",
    priority: 3,
    expandedOnly: true,
  },
  {
    key: "minProfit",
    title: "Min Profit",
    type: "number",
    icon: DollarSign,
    sortable: true,
    searchable: false,
    filterable: true,
    editable: true,
    usedInCreate: true,
    description: "Minimum profit",
    priority: 3,
    expandedOnly: true,
  },
  {
    key: "maxProfit",
    title: "Max Profit",
    type: "number",
    icon: DollarSign,
    sortable: true,
    searchable: false,
    filterable: true,
    editable: true,
    usedInCreate: true,
    description: "Maximum profit",
    priority: 3,
    expandedOnly: true,
  },
  {
    key: "minAmount",
    title: "Min Amount",
    type: "number",
    icon: DollarSign,
    sortable: true,
    searchable: false,
    filterable: true,
    editable: true,
    usedInCreate: true,
    description: "Minimum investment amount",
    priority: 3,
    expandedOnly: true,
  },
  {
    key: "maxAmount",
    title: "Max Amount",
    type: "number",
    icon: DollarSign,
    sortable: true,
    searchable: false,
    filterable: true,
    editable: true,
    usedInCreate: true,
    description: "Maximum investment amount",
    priority: 3,
    expandedOnly: true,
  },
  {
    key: "defaultProfit",
    title: "Default Profit",
    type: "number",
    icon: DollarSign,
    sortable: true,
    searchable: false,
    filterable: true,
    editable: true,
    usedInCreate: true,
    description: "Default profit value",
    priority: 3,
    expandedOnly: true,
  },
  {
    key: "defaultResult",
    title: "Default Result",
    type: "select",
    icon: ClipboardList,
    sortable: true,
    searchable: true,
    filterable: true,
    editable: true,
    usedInCreate: true,
    description: "WIN, LOSS, or DRAW",
    options: [
      { value: "WIN", label: "Win" },
      { value: "LOSS", label: "Loss" },
      { value: "DRAW", label: "Draw" },
    ],
    priority: 3,
    expandedOnly: true,
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
              return "info";
          }
        },
      },
    },
  },

  {
    key: "title",
    title: "Title",
    type: "text",
    icon: ClipboardList,
    sortable: true,
    searchable: true,
    filterable: true,
    editable: true,
    usedInCreate: true,
    description: "Public title of the plan",
    priority: 1,
  },
  {
    key: "profitPercentage",
    title: "Profit %",
    type: "number",
    icon: DollarSign,
    sortable: true,
    searchable: false,
    filterable: true,
    editable: true,
    usedInCreate: true,
    description: "Profit percentage",
    priority: 1,
  },
  {
    key: "trending",
    title: "Trending",
    type: "boolean",
    icon: CheckSquare,
    sortable: true,
    searchable: true,
    filterable: true,
    editable: true,
    usedInCreate: true,
    description: "Whether plan is trending",
    priority: 3,
    expandedOnly: true,
  },
  {
    key: "status",
    title: "Status",
    type: "toggle",
    icon: CheckSquare,
    sortable: true,
    searchable: true,
    filterable: true,
    editable: true,
    usedInCreate: true,
    description: "Plan status",
    priority: 1,
  },
  {
    key: "durations",
    title: "Durations",
    type: "multiselect",
    icon: ClipboardList,
    sortable: false,
    searchable: false,
    filterable: false,
    editable: true,
    usedInCreate: true,
    description: "Available durations for this plan",
    priority: 2,
    apiEndpoint: {
      url: "/api/admin/ai/investment/duration/options",
      method: "GET",
    },
    render: {
      type: "custom",
      render: (value: any, row: any) => {
        if (!value || !Array.isArray(value) || value.length === 0) return "None";
        const tags = value.map((d: any) => `${d.duration} ${d.timeframe}`);
        return (
          <div className="flex flex-wrap gap-1">
            {tags.map((tag: string, index: number) => (
              <span
                key={index}
                className="rounded bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800"
              >
                {tag}
              </span>
            ))}
          </div>
        );
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
    description: "Date when plan was created",
    render: { type: "date", format: "PPP" },
    priority: 2,
    expandedOnly: true,
  },
];
