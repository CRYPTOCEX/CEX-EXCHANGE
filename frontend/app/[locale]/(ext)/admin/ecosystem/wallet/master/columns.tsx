import { Shield, ClipboardList, DollarSign } from "lucide-react";

export const columns: ColumnDefinition[] = [
  {
    key: "id",
    title: "ID",
    type: "text",
    icon: Shield,
    sortable: true,
    searchable: true,
    filterable: true,
    description: "Unique master wallet identifier",
    priority: 3,
    expandedOnly: true,
  },
  {
    key: "chain",
    title: "Chain",
    type: "select",
    icon: ClipboardList,
    sortable: true,
    searchable: true,
    filterable: true,
    usedInCreate: true,
    description: "Blockchain chain",
    priority: 1,
    options: [], // Initialize with empty array
    apiEndpoint: {
      method: "GET",
      url: "/api/admin/ecosystem/wallet/master/options",
    },
    render: {
      type: "custom",
      render: (item: any) => {
        // Handle undefined/null values gracefully
        const chainValue = item || "unknown";
        return (
          <div className="flex items-center gap-4">
            <img
              src={`/img/crypto/${chainValue.toLowerCase()}.webp`}
              alt={`${chainValue} logo`}
              className="w-10 h-10 rounded-full"
              onError={(e) => {
                // Prevent infinite loops by checking if we already tried fallback
                const target = e.target as HTMLImageElement;
                if (!target.dataset.fallbackAttempted) {
                  target.dataset.fallbackAttempted = 'true';
                  // Use a data URI as fallback to prevent further errors
                  target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiNGM0Y0RjYiLz4KPHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4PSI4IiB5PSI4Ij4KPGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMTAiIHN0cm9rZT0iIzY5NzA3QiIgc3Ryb2tlLXdpZHRoPSIyIi8+CjxwYXRoIGQ9Im0xNSA5LTYgNiIgc3Ryb2tlPSIjNjk3MDdCIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8cGF0aCBkPSJtOSA5IDYgNiIgc3Ryb2tlPSIjNjk3MDdCIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8L3N2Zz4KPC9zdmc+';
                }
              }}
            />
            <span className="capitalize">{chainValue}</span>
          </div>
        );
      },
    },
  },
  {
    key: "currency",
    title: "Currency",
    type: "text",
    icon: DollarSign,
    sortable: true,
    searchable: true,
    filterable: true,
    description: "Currency code",
    priority: 1,
  },
  {
    key: "address",
    title: "Address",
    type: "text",
    icon: ClipboardList,
    sortable: true,
    searchable: true,
    filterable: true,
    description: "Master wallet address",
    priority: 1,
  },
  {
    key: "balance",
    title: "Balance",
    type: "number",
    icon: DollarSign,
    sortable: true,
    searchable: false,
    filterable: true,
    description: "Wallet balance",
    priority: 1,
    render: {
      type: "custom",
      render: (value: any) => {
        // Format balance to 8 decimal places
        const formattedBalance = value ? parseFloat(value).toFixed(8) : "0.00000000";
        return (
          <span className="font-mono">
            {formattedBalance}
          </span>
        );
      },
    },
  },
  {
    key: "lastIndex",
    title: "Last Index",
    type: "number",
    icon: ClipboardList,
    sortable: true,
    searchable: false,
    filterable: true,
    description: "Last used index",
    priority: 2,
    expandedOnly: true,
  },
];
