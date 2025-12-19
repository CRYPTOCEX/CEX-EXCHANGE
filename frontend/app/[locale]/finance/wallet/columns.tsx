"use client";
import { useTranslations } from "next-intl";

import {
  Shield,
  User,
  DollarSign,
  Wallet,
  MapPin,
  Lock,
  CalendarIcon,
} from "lucide-react";

// Wallet type badge colors
const walletTypeStyles: Record<string, { dot: string; badge: string }> = {
  FIAT: {
    dot: "bg-green-500",
    badge: "bg-green-500/10 text-green-500",
  },
  SPOT: {
    dot: "bg-blue-500",
    badge: "bg-blue-500/10 text-blue-500",
  },
  ECO: {
    dot: "bg-purple-500",
    badge: "bg-purple-500/10 text-purple-500",
  },
  FUTURES: {
    dot: "bg-amber-500",
    badge: "bg-amber-500/10 text-amber-500",
  },
};

function renderWalletType(value: string) {
  const style = walletTypeStyles[value] || {
    dot: "bg-gray-500",
    badge: "bg-gray-500/10 text-gray-500",
  };

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${style.badge}`}>
      <span className={`mr-1.5 h-2 w-2 rounded-full ${style.dot}`} />
      {value}
    </span>
  );
}

const EcoAddresses = ({ value, row }: { value: any; row?: any }) => {
  const tCommon = useTranslations("common");
  // 1) Check if we have a row
  if (!row) {
    // row is undefined, so we can't check row.type
    // Return a fallback or debug info:
    return <>No Row Data</>;
  }

  // 2) If the wallet type isn't ECO
  if (row.type !== "ECO") {
    return <>N/A</>;
  }

  // 3) If the address field is null/undefined
  if (!value) {
    return <>No Addresses</>;
  }

  // 4) Try to parse the address JSON
  let parsed: Record<string, any>;
  try {
    parsed = typeof value === "string" ? JSON.parse(value) : value;
  } catch (error) {
    return <span className="text-red-500">{tCommon("invalid_address_json")}</span>;
  }
  const chains = Object.keys(parsed);
  if (!chains.length) {
    return <>No Addresses</>;
  }

  // 5) Render chain info
  return (
    <div className="space-y-2 text-sm">
      {chains.map((chain) => {
        const chainData = parsed[chain];
        const address = chainData?.address;
        const network = chainData?.network;
        const balance = chainData?.balance ?? 0;
        return (
          <div
            key={chain}
            className="rounded-md bg-muted/10 p-2 border border-muted"
          >
            <div className="font-bold">{chain}</div>
            {address && (
              <div>
                Address{" "}
                {address}
              </div>
            )}
            {network && (
              <div>
                Network{" "}
                {network}
              </div>
            )}
            <div>
              Balance{" "}
              {(typeof balance === 'number' ? balance : parseFloat(balance) || 0).toFixed(8)}
            </div>
          </div>
        );
      })}
    </div>
  );
};

function renderEcoAddresses(value: any, row?: any) {
  return <EcoAddresses value={value} row={row} />;
}

export function useColumns() {
  const t = useTranslations("finance_wallet");
  const tCommon = useTranslations("common");
  return [
  {
    key: "id",
    title: tCommon("id"),
    type: "text",
    icon: Shield,
    sortable: true,
    searchable: true,
    filterable: true,
    description: tCommon("unique_wallet_identifier"),
    priority: 3,
    expandedOnly: true,
  },
  {
    key: "type",
    title: tCommon("type"),
    type: "select",
    icon: Wallet,
    sortable: true,
    searchable: true,
    filterable: true,
    description: t("type_of_wallet_fiat_spot_eco_or_futures"),
    options: [
      {
        value: "FIAT",
        label: tCommon("fiat"),
      },
      {
        value: "SPOT",
        label: tCommon("spot"),
      },
      {
        value: "ECO",
        label: tCommon("eco"),
      },
      {
        value: "FUTURES",
        label: tCommon("futures"),
      },
    ],
    render: {
      type: "custom",
      render: (value: string) => renderWalletType(value),
    },
    priority: 1,
  },
  {
    key: "currency",
    title: tCommon("currency"),
    type: "text",
    icon: DollarSign,
    sortable: true,
    searchable: true,
    filterable: true,
    description: t("currency_code_for_this_wallet"),
    priority: 1,
  },
  {
    key: "balance",
    title: tCommon("balance"),
    type: "number",
    icon: DollarSign,
    sortable: true,
    searchable: false,
    filterable: true,
    condition: (values) => !["ECO", "FUTURES"].includes(values.type),
    description: t("available_balance_in_your_wallet"),
    priority: 1,
    render: {
      type: "custom",
      render: (value: any) => {
        const numValue = parseFloat(value) || 0;
        return numValue.toFixed(8);
      },
    },
  },
  {
    key: "inOrder",
    title: tCommon("in_order"),
    type: "number",
    icon: Lock,
    sortable: true,
    searchable: false,
    filterable: true,
    condition: (values) => !["ECO", "FUTURES"].includes(values.type),
    description: t("funds_currently_locked_in_open_orders"),
    priority: 2,
    render: {
      type: "custom",
      render: (value: any) => {
        const numValue = parseFloat(value) || 0;
        return numValue.toFixed(8);
      },
    },
  },
  {
    key: "address",
    title: tCommon("address"),
    type: "custom",
    icon: MapPin,
    sortable: false,
    searchable: false,
    filterable: false,
    description: t("blockchain_addresses_and_balances_for_eco_wallets"),
    render: {
      type: "custom",
      render: (value: any, row: any) => renderEcoAddresses(value, row),
    },
    priority: 2,
    expandedOnly: true,
  },
  // {
  //   key: "status",
  //   title: tCommon("status"),
  //   type: "boolean",
  //   icon: ClipboardList,
  //   sortable: true,
  //   searchable: true,
  //   filterable: true,
  //   editable: false,
  //   description: tCommon("wallet_status"),
  //   priority: 1,
  // },
  {
    key: "createdAt",
    title: tCommon("created_at"),
    type: "date",
    icon: CalendarIcon,
    sortable: true,
    searchable: true,
    filterable: true,
    description: t("date_when_this_wallet_was_created"),
    render: {
      type: "date",
      format: "PPP",
    },
    priority: 3,
    expandedOnly: true,
  },
] as ColumnDefinition[];
}
