import {
  Shield,
  User,
  DollarSign,
  ClipboardList,
  CalendarIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";

function renderEcoAddresses(value: any, row?: any) {
  const t = useTranslations("finance/wallet/columns");
  // 1) Check if we have a row
  if (!row) {
    // row is undefined, so we can't check row.type
    // Return a fallback or debug info:
    return "No row data";
  }

  // 2) If the wallet type isn't ECO
  if (row.type !== "ECO") {
    return "N/A";
  }

  // 3) If the address field is null/undefined
  if (!value) {
    return "No addresses";
  }

  // 4) Try to parse the address JSON
  let parsed: Record<string, any>;
  try {
    parsed = typeof value === "string" ? JSON.parse(value) : value;
  } catch (error) {
    return <span className="text-red-500">{t("invalid_address_json")}</span>;
  }
  const chains = Object.keys(parsed);
  if (!chains.length) {
    return "No addresses";
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
                {t("address")}{" "}
                {address}
              </div>
            )}
            {network && (
              <div>
                {t("network")}{" "}
                {network}
              </div>
            )}
            <div>
              {t("balance")}{" "}
              {(typeof balance === 'number' ? balance : parseFloat(balance) || 0).toFixed(8)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
export const columns: ColumnDefinition[] = [
  {
    key: "id",
    title: "ID",
    type: "text",
    icon: Shield,
    sortable: true,
    searchable: true,
    filterable: true,
    description: "Unique wallet identifier",
    priority: 3,
    expandedOnly: true,
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
    description: "Wallet type",
    options: [
      {
        value: "FIAT",
        label: "Fiat",
      },
      {
        value: "SPOT",
        label: "Spot",
      },
      {
        value: "ECO",
        label: "Eco",
      },
      {
        value: "FUTURES",
        label: "Futures",
      },
    ],
    priority: 1,
  },
  {
    key: "currency",
    title: "Currency",
    type: "text",
    icon: DollarSign,
    sortable: true,
    searchable: true,
    filterable: true,
    editable: false,
    description: "Currency code",
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
    editable: true,
    condition: (values) => !["ECO", "FUTURES"].includes(values.type),
    description: "Current balance",
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
    title: "In Order",
    type: "number",
    icon: DollarSign,
    sortable: true,
    searchable: false,
    filterable: true,
    editable: true,
    condition: (values) => !["ECO", "FUTURES"].includes(values.type),
    description: "Funds locked in orders",
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
    title: "Address",
    type: "custom",
    icon: ClipboardList,
    sortable: false,
    searchable: false,
    filterable: false,
    editable: false,
    description: "Wallet address details",
    render: {
      type: "custom",
      render: (value: any, row: any) => renderEcoAddresses(value, row),
    },
    priority: 2,
    expandedOnly: true,
  },
  // {
  //   key: "status",
  //   title: "Status",
  //   type: "boolean",
  //   icon: ClipboardList,
  //   sortable: true,
  //   searchable: true,
  //   filterable: true,
  //   editable: false,
  //   description: "Wallet status",
  //   priority: 1,
  // },
  {
    key: "createdAt",
    title: "Created At",
    type: "date",
    icon: CalendarIcon,
    sortable: true,
    searchable: true,
    filterable: true,
    description: "Creation date",
    render: {
      type: "date",
      format: "PPP",
    },
    priority: 3,
    expandedOnly: true,
  },
];
