import { Shield, ClipboardList, CalendarIcon } from "lucide-react";

export const columns: ColumnDefinition[] = [
  {
    key: "id",
    title: "ID",
    type: "text",
    icon: Shield,
    sortable: true,
    searchable: true,
    filterable: true,
    description: "Unique custodial wallet identifier",
    priority: 3,
    expandedOnly: true,
  },
  {
    key: "masterWalletId",
    title: "Master Wallet",
    type: "select",
    icon: ClipboardList,
    sortable: true,
    searchable: true,
    filterable: true,
    editable: false,
    usedInCreate: true,
    description: "Master wallet to create custodial wallet from",
    priority: 1,
    apiEndpoint: {
      method: "GET",
      url: "/api/admin/ecosystem/wallet/custodial/options",
    },
  },
  {
    key: "chain",
    title: "Chain",
    type: "text",
    icon: ClipboardList,
    sortable: true,
    searchable: true,
    filterable: true,
    editable: false,
    usedInCreate: false,
    description: "Blockchain chain",
    priority: 1,
    render: {
      type: "custom",
      render: (item: any) => {
        return (
          <div className="flex items-center gap-4">
            <img
              src={`/img/crypto/${(item || "generic").toLowerCase()}.webp`}
              alt={`${item || "generic"} logo`}
              className="w-10 h-10 rounded-full"
            />
            <span>{item}</span>
          </div>
        );
      },
    },
  },
  {
    key: "address",
    title: "Address",
    type: "text",
    icon: ClipboardList,
    sortable: true,
    searchable: true,
    filterable: true,
    description: "Custodial wallet address",
    priority: 1,
  },
  {
    key: "network",
    title: "Network",
    type: "text",
    icon: ClipboardList,
    sortable: true,
    searchable: true,
    filterable: true,
    description: "Network (e.g., mainnet)",
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
    description: "ACTIVE, INACTIVE, or SUSPENDED",
    options: [
      { value: "ACTIVE", label: "Active" },
      { value: "INACTIVE", label: "Inactive" },
      { value: "SUSPENDED", label: "Suspended" },
    ],
    priority: 1,
    render: {
      type: "badge",
      config: {
        variant(value: string) {
          switch (value) {
            case "ACTIVE":
              return "success";
            case "INACTIVE":
              return "warning";
            case "SUSPENDED":
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
    description: "Creation date",
    render: { type: "date", format: "PPP" },
    priority: 2,
    expandedOnly: true,
  },
];
