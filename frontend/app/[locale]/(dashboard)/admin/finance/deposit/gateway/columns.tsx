"use client";

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
import { useTranslations } from "next-intl";

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
const FeeStructure = ({ row }: { row: any }) => {
  const tDashboardAdmin = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  const fixedFee = row.fixedFee;
  const percentageFee = row.percentageFee;

  if (!fixedFee && !percentageFee) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <DollarSign className="h-4 w-4" />
        <span className="text-sm">{tDashboardAdmin("no_fees_configured")}</span>
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
              {tCommon("fixed_fee")}
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
              {tCommon("percentage_fee")}
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

const renderFeeStructure = (row: any) => <FeeStructure row={row} />;

// Enhanced limit structure renderer with better responsive design
const LimitStructure = ({ row }: { row: any }) => {
  const tCommon = useTranslations("common");
  const tDashboardAdmin = useTranslations("dashboard_admin");
  const minAmount = row.minAmount;
  const maxAmount = row.maxAmount;

  if (!minAmount && !maxAmount) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <ArrowUpDown className="h-4 w-4" />
        <span className="text-sm">{tDashboardAdmin("no_limits_configured")}</span>
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
              {tCommon("minimum_amount")}
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
              {tCommon("maximum_amount")}
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

const renderLimitStructure = (row: any) => <LimitStructure row={row} />;

// Helper component to render currency tags with responsive design
const CurrenciesList = ({ currencies }: { currencies: string[] | string }) => {
  const tDashboardAdmin = useTranslations("dashboard_admin");
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
    return <span className="text-muted-foreground text-sm">{tDashboardAdmin("no_currencies")}</span>;
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

const renderCurrencies = (currencies: string[] | string) => <CurrenciesList currencies={currencies} />;

export function useColumns(): ColumnDefinition[] {
  const tCommon = useTranslations("common");
  const tDashboardAdmin = useTranslations("dashboard_admin");
  return [
    {
      key: "id",
      title: tCommon("id"),
      type: "text",
      icon: Hash,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tDashboardAdmin("unique_identifier_for_the_deposit_gateway"),
      priority: 4,
      expandedOnly: true,
    },
    {
      key: "gatewayCompound",
      title: tDashboardAdmin("gateway"),
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
            title: tCommon("image"),
            description: tDashboardAdmin("gateway_image"),
            filterable: false,
            sortable: false,
            size: "gateway",
          },
          primary: {
            key: "title",
            title: tCommon("title"),
            description: tCommon("display_title"),
            sortable: true,
            sortKey: "title",
          },
        },
      },
    },
    {
      key: "currencies",
      title: tDashboardAdmin("supported_currencies"),
      type: "custom",
      icon: Coins,
      sortable: false,
      searchable: false,
      filterable: false,
      description: tDashboardAdmin("currencies_supported_by_this_gateway"),
      render: {
        type: "custom",
        render: (value: any) => renderCurrencies(value),
      },
      priority: 2,
    },
    {
      key: "type",
      title: tCommon("type"),
      type: "select",
      icon: ClipboardList,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tDashboardAdmin("gateway_type_fiat_or_crypto"),
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
        { value: "FIAT", label: tCommon("fiat") },
        { value: "CRYPTO", label: tDashboardAdmin("crypto") },
      ],
      priority: 2,
    },
    {
      key: "status",
      title: tCommon("status"),
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
      description: tDashboardAdmin("gateway_status_active_inactive"),
      priority: 1,
    },
    {
      key: "feeStructure",
      title: tCommon("fee_structure"),
      type: "custom",
      icon: DollarSign,
      sortable: false,
      searchable: false,
      filterable: false,
      description: tDashboardAdmin("complete_fee_structure_overview"),
      render: {
        type: "custom",
        render: (_: any, row: any) => renderFeeStructure(row),
      },
      priority: 3,
      expandedOnly: true,
    },
    {
      key: "limitStructure",
      title: tDashboardAdmin("transaction_limits"),
      type: "custom",
      icon: ArrowUpDown,
      sortable: false,
      searchable: false,
      filterable: false,
      description: tDashboardAdmin("complete_limit_structure_overview"),
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
      title: tDashboardAdmin("internal_name"),
      type: "text",
      icon: Tag,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tDashboardAdmin("internal_gateway_name_identifier"),
      priority: 4,
      expandedOnly: true,
    },
    {
      key: "alias",
      title: tDashboardAdmin("alias"),
      type: "text",
      icon: Hash,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tDashboardAdmin("gateway_alias_short_name_read_only"),
      priority: 4,
      expandedOnly: true,
      optional: true,
    },
    {
      key: "description",
      title: tCommon("description"),
      type: "text",
      icon: ClipboardList,
      sortable: false,
      searchable: true,
      filterable: false,
      description: tDashboardAdmin("gateway_description"),
      expandedOnly: true,
      priority: 4,
    },
    {
      key: "version",
      title: tCommon("version"),
      type: "text",
      icon: Package,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tDashboardAdmin("gateway_version"),
      priority: 4,
      expandedOnly: true,
      optional: true,
    },
  ];
}

