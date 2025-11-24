// columns.ts
import { ClipboardCheck, DollarSign, FileText, Check, X } from "lucide-react";

export const columns = [
  {
    key: "order",
    title: "Order",
    type: "number",
    sortable: true,
    searchable: false,
    filterable: false,
  },
  {
    key: "name",
    title: "Pool Name",
    type: "text",
    sortable: true,
    searchable: true,
    filterable: true,
    icon: ClipboardCheck,
    description: "Name of the staking pool",
  },
  {
    key: "token",
    title: "Token",
    type: "text",
    sortable: true,
    searchable: true,
    filterable: true,
    icon: FileText,
    description: "Token name (with symbol)",
    render: {
      type: "custom",
      render: (value: any, row: any) => `${row.token} (${row.symbol})`,
    },
  },
  {
    key: "apr",
    title: "APR",
    type: "number",
    sortable: true,
    searchable: false,
    filterable: false,
    icon: DollarSign,
    description: "Annual Percentage Rate",
    render: {
      type: "custom",
      render: (value: number) => `${value}%`,
    },
  },
  {
    key: "minStake",
    title: "Min Stake",
    type: "number",
    sortable: true,
    searchable: false,
    filterable: false,
    description: "Minimum stake amount",
  },
  {
    key: "lockPeriod",
    title: "Lock Period",
    type: "number",
    sortable: true,
    searchable: false,
    filterable: false,
    description: "Lock period (days)",
    render: {
      type: "custom",
      render: (value: number) => `${value} days`,
    },
  },
  {
    key: "status",
    title: "Status",
    type: "select",
    sortable: true,
    searchable: true,
    filterable: true,
    description: "Current pool status",
    render: {
      type: "badge",
      config: {
        withDot: true,
        variant: (value: string) => {
          switch (value.toUpperCase()) {
            case "ACTIVE":
              return "success";
            case "INACTIVE":
              return "default";
            case "COMING_SOON":
              return "info";
            default:
              return "default";
          }
        },
      },
    },
    options: [
      { value: "ACTIVE", label: "Active" },
      { value: "INACTIVE", label: "Inactive" },
      { value: "COMING_SOON", label: "Coming Soon" },
    ],
  },
  {
    key: "isPromoted",
    title: "Promoted",
    type: "select",
    sortable: false,
    searchable: false,
    filterable: true,
    description: "Featured pool",
    render: {
      type: "custom",
      render: (value: boolean) => {
        return value ? (
          <Check className="h-4 w-4 text-green-500" />
        ) : (
          <X className="h-4 w-4 text-red-500" />
        );
      },
    },
  },
  {
    key: "createdAt",
    title: "Created At",
    type: "date",
    sortable: true,
    searchable: false,
    filterable: false,
    description: "Creation date",
    render: {
      type: "date",
      format: "PPP",
    },
    priority: 3,
  },
];
