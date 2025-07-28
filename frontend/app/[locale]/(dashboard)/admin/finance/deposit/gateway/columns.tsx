import {
  Shield,
  DollarSign,
  ClipboardList,
  CheckSquare,
  PercentIcon,
  Hash,
  Tag,
  Settings,
  Package,
  Coins,
  TrendingUp,
  ArrowUpDown,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

// Helper function to render fee/limit values with better formatting
const renderValueOrObject = (value: any, type: "fee" | "limit" = "fee") => {
  if (value === null || value === undefined) return <span className="text-muted-foreground text-sm">-</span>;
  
  if (typeof value === "number") {
    const displayValue = type === "fee" && value > 0 && value < 1 
      ? `${(value * 100).toFixed(2)}%` 
      : value.toLocaleString();
    return <span className="font-mono text-sm">{displayValue}</span>;
  }
  
  if (typeof value === "object" && value !== null) {
    const entries = Object.entries(value);
    if (entries.length === 0) return <span className="text-muted-foreground text-sm">-</span>;
    
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-w-md">
        {entries.slice(0, 6).map(([currency, val]: [string, any]) => (
          <div key={currency} className="flex items-center justify-between gap-2 p-2 bg-muted/30 rounded-md">
            <Badge variant="outline" className="text-xs font-mono">
              {currency}
            </Badge>
            <span className="text-sm font-mono">
              {type === "fee" && typeof val === "number" && val > 0 && val < 1
                ? `${(val * 100).toFixed(2)}%`
                : val?.toLocaleString() || "-"}
            </span>
          </div>
        ))}
        {entries.length > 6 && (
          <div className="flex items-center justify-center p-2 text-xs text-muted-foreground">
            +{entries.length - 6} more
          </div>
        )}
      </div>
    );
  }
  
  return <span className="font-mono text-sm">{value?.toString() || "-"}</span>;
};

// Enhanced fee structure renderer with better responsive design
const renderFeeStructure = (row: any) => {
  const fixedFee = row.fixedFee;
  const percentageFee = row.percentageFee;
  
  if (!fixedFee && !percentageFee) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <DollarSign className="h-4 w-4" />
        <span className="text-sm">No fees configured</span>
      </div>
    );
  }
  
  return (
    <div className="space-y-3">
      {fixedFee && (
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Coins className="h-4 w-4 text-blue-500" />
              Fixed Fee
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {renderValueOrObject(fixedFee, "fee")}
          </CardContent>
        </Card>
      )}
      
      {percentageFee && (
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <PercentIcon className="h-4 w-4 text-green-500" />
              Percentage Fee
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {renderValueOrObject(percentageFee, "fee")}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// Enhanced limit structure renderer with better responsive design
const renderLimitStructure = (row: any) => {
  const minAmount = row.minAmount;
  const maxAmount = row.maxAmount;
  
  if (!minAmount && !maxAmount) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <ArrowUpDown className="h-4 w-4" />
        <span className="text-sm">No limits configured</span>
      </div>
    );
  }
  
  return (
    <div className="space-y-3">
      {minAmount && (
        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-orange-500" />
              Minimum Amount
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {renderValueOrObject(minAmount, "limit")}
          </CardContent>
        </Card>
      )}
      
      {maxAmount && (
        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-red-500 rotate-180" />
              Maximum Amount
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {renderValueOrObject(maxAmount, "limit")}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// Helper function to render currency tags with responsive design
const renderCurrencies = (currencies: string[] | string) => {
  let currencyArray: string[] = [];
  
  if (typeof currencies === 'string') {
    try {
      currencyArray = JSON.parse(currencies);
    } catch {
      currencyArray = currencies.split(',').map(c => c.trim());
    }
  } else if (Array.isArray(currencies)) {
    currencyArray = currencies;
  }
  
  if (!currencyArray.length) {
    return <span className="text-muted-foreground text-sm">No currencies</span>;
  }
  
  const displayCount = 4;
  const visibleCurrencies = currencyArray.slice(0, displayCount);
  const remainingCount = currencyArray.length - displayCount;
  
  return (
    <div className="flex flex-wrap gap-1">
      {visibleCurrencies.map((currency) => (
        <Badge 
          key={currency} 
          variant="secondary" 
          className="text-xs font-mono px-2 py-1"
        >
          {currency}
        </Badge>
      ))}
      {remainingCount > 0 && (
        <Badge variant="outline" className="text-xs">
          +{remainingCount}
        </Badge>
      )}
    </div>
  );
};

export const columns: ColumnDefinition[] = [
  {
    key: "id",
    title: "ID",
    type: "text",
    icon: Hash,
    sortable: true,
    searchable: true,
    filterable: true,
    description: "Unique identifier for the deposit gateway",
    priority: 4,
    expandedOnly: true,
  },
  {
    key: "gatewayCompound",
    title: "Gateway",
    type: "compound",
    disablePrefixSort: true,
    sortable: true,
    searchable: true,
    filterable: true,
    priority: 1,
    icon: Shield,
    render: {
      type: "compound",
      config: {
        image: {
          key: "image",
          fallback: "/img/placeholder.svg",
          type: "image",
          title: "Image",
          description: "Gateway image",
          editable: true,
          usedInCreate: true,
          filterable: false,
          sortable: false,
          size: "gateway",
        },
        primary: {
          key: "title",
          title: "Title",
          description: "Display title",
          editable: true,
          usedInCreate: true,
          sortable: true,
          sortKey: "title",
        },
      },
    },
  },
  {
    key: "currencies",
    title: "Supported Currencies",
    type: "custom",
    icon: Coins,
    sortable: false,
    searchable: false,
    filterable: false,
    editable: false,
    usedInCreate: false,
    description: "Currencies supported by this gateway",
    render: {
      type: "custom",
      render: (value: any) => renderCurrencies(value),
    },
    priority: 2,
  },
  {
    key: "type",
    title: "Type",
    type: "select",
    icon: ClipboardList,
    sortable: true,
    searchable: true,
    filterable: true,
    editable: false,
    usedInCreate: false,
    description: "Gateway type (FIAT or CRYPTO)",
    render: {
      type: "badge",
      config: {
        withDot: true,
        variant: (value: string) => {
          switch (value?.toUpperCase()) {
            case "FIAT":
              return "success";
            case "CRYPTO":
              return "info";
            default:
              return "default";
          }
        },
      },
    },
    options: [
      { value: "FIAT", label: "Fiat" },
      { value: "CRYPTO", label: "Crypto" },
    ],
    priority: 2,
  },
  {
    key: "status",
    title: "Status",
    type: "boolean",
    render: {
      type: "toggle",
      config: {
        url: "/api/admin/finance/deposit/gateway/[id]/status",
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
    description: "Gateway status (active/inactive)",
    priority: 1,
  },
  {
    key: "feeStructure",
    title: "Fee Structure",
    type: "custom",
    icon: DollarSign,
    sortable: false,
    searchable: false,
    filterable: false,
    editable: false,
    usedInCreate: false,
    description: "Complete fee structure overview",
    render: {
      type: "custom",
      render: (_: any, row: any) => renderFeeStructure(row),
    },
    priority: 3,
    expandedOnly: true,
  },
  {
    key: "limitStructure",
    title: "Transaction Limits",
    type: "custom",
    icon: ArrowUpDown,
    sortable: false,
    searchable: false,
    filterable: false,
    editable: false,
    usedInCreate: false,
    description: "Complete limit structure overview",
    render: {
      type: "custom",
      render: (_: any, row: any) => renderLimitStructure(row),
    },
    priority: 3,
    expandedOnly: true,
  },
  // Detailed fields for expanded view only
  {
    key: "name",
    title: "Internal Name",
    type: "text",
    icon: Tag,
    sortable: true,
    searchable: true,
    filterable: true,
    editable: true,
    usedInCreate: true,
    description: "Internal gateway name/identifier",
    priority: 4,
    expandedOnly: true,
  },
  {
    key: "alias",
    title: "Alias",
    type: "text",
    icon: Hash,
    sortable: true,
    searchable: true,
    filterable: true,
    editable: false, // Made read-only as per previous requirements
    usedInCreate: true,
    description: "Gateway alias/short name (read-only)",
    priority: 4,
    expandedOnly: true,
    optional: true,
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
    description: "Gateway description",
    expandedOnly: true,
    priority: 4,
  },
  {
    key: "version",
    title: "Version",
    type: "text",
    icon: Package,
    sortable: true,
    searchable: true,
    filterable: true,
    editable: true,
    usedInCreate: true,
    description: "Gateway version",
    priority: 4,
    expandedOnly: true,
    optional: true,
  },
];
