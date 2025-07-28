import {
  Shield,
  DollarSign,
  CheckSquare,
  TrendingUp,
  Clock,
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
    description: "Unique identifier for the exchange market",
    priority: 3,
    expandedOnly: true,
  },
  {
    key: "currency",
    title: "Currency",
    type: "text",
    icon: DollarSign,
    sortable: true,
    searchable: true,
    filterable: true,
    editable: true,
    usedInCreate: true,
    description: "Base currency",
    priority: 1,
  },
  {
    key: "pair",
    title: "Pair",
    type: "text",
    icon: DollarSign,
    sortable: true,
    searchable: true,
    filterable: true,
    editable: true,
    usedInCreate: true,
    description: "Quote currency",
    priority: 1,
  },
  {
    key: "symbol",
    title: "Symbol",
    type: "text",
    icon: TrendingUp,
    sortable: true,
    searchable: true,
    filterable: true,
    editable: false,
    usedInCreate: false,
    description: "Trading pair symbol",
    priority: 1,
    render: {
      type: "custom",
      render: (value: any, row: any) => {
        const currency = row.currency || "";
        const pair = row.pair || "";
        return `${currency}/${pair}`;
      },
    },
  },
  {
    key: "metadata",
    title: "Precision",
    type: "text",
    icon: Shield,
    sortable: false,
    searchable: false,
    filterable: false,
    editable: false,
    usedInCreate: false,
    description: "Price and amount precision",
    priority: 2,
    expandedOnly: true,
    render: {
      type: "custom",
      render: (value: any) => {
        if (!value?.precision) return "-";
        return `Price: ${value.precision.price}, Amount: ${value.precision.amount}`;
      },
    },
  },
  {
    key: "fees",
    title: "Fees",
    type: "text",
    icon: DollarSign,
    sortable: false,
    searchable: false,
    filterable: false,
    editable: false,
    usedInCreate: false,
    description: "Trading fees (taker/maker)",
    priority: 2,
    expandedOnly: true,
    render: {
      type: "custom",
      render: (value: any, row: any) => {
        const metadata = row.metadata;
        if (!metadata?.taker && !metadata?.maker) return "-";

        const parts: string[] = [];
        if (metadata.taker)
          parts.push(`Taker: ${(metadata.taker * 100).toFixed(3)}%`);
        if (metadata.maker)
          parts.push(`Maker: ${(metadata.maker * 100).toFixed(3)}%`);
        return parts.join(", ");
      },
    },
  },
  {
    key: "status",
    title: "Status",
    type: "boolean",
    render: {
      type: "toggle",
      config: {
        url: "/api/admin/finance/exchange/market/[id]/status",
        method: "PUT",
        field: "status",
        trueValue: true,
        falseValue: false,
      },
    },
    icon: CheckSquare,
    sortable: true,
    searchable: true,
    filterable: true,
    editable: false,
    usedInCreate: false,
    description: "Market status",
    priority: 1,
  },
  {
    key: "createdAt",
    title: "Created At",
    type: "date",
    icon: Clock,
    sortable: true,
    searchable: true,
    filterable: true,
    description: "Creation date",
    render: { type: "date", format: "PPP" },
    priority: 3,
    expandedOnly: true,
  },
];
