import React from "react";
interface Trade {
  id: string;
  amount: number;
  price: number;
  cost: number;
  side: string;
  timestamp: number;
}
interface TradesCellProps {
  value: string; // Raw trades JSON string from the API response
}
export function TradesCell({ value }: TradesCellProps) {
  let trades: Trade[] = [];
  try {
    // The API returns a string that might be double-encoded.
    // First, try parsing the value.
    const parsed = JSON.parse(value);

    // If the result is still a string, try parsing it again.
    if (typeof parsed === "string") {
      trades = JSON.parse(parsed);
    } else if (Array.isArray(parsed)) {
      trades = parsed;
    }
  } catch (error) {
    console.error("Error parsing trades:", error);
    return <span className="text-red-500">Invalid trades data</span>;
  }
  if (!trades.length) {
    return <span>No Trades</span>;
  }
  return (
    <div className="space-y-2">
      {trades.map((trade) => {
        return (
          <div
            key={trade.id}
            className="border p-2 rounded bg-default-900 dark:bg-default-100"
          >
            <div>
              <strong>ID:</strong> {trade.id}
            </div>
            <div>
              <strong>Amount:</strong> {trade.amount}
            </div>
            <div>
              <strong>Price:</strong> {trade.price}
            </div>
            <div>
              <strong>Cost:</strong> {trade.cost}
            </div>
            <div>
              <strong>Side:</strong> {trade.side}
            </div>
            <div>
              <strong>Timestamp:</strong>{" "}
              {new Date(trade.timestamp).toLocaleString()}
            </div>
          </div>
        );
      })}
    </div>
  );
}
export const ecosystemOrderColumns: ColumnDefinition[] = [
  // 2) USER ID (or user detail)
  // If you want to display user info or foreign key, you could do something simple like text:
  {
    key: "userId",
    title: "User ID",
    type: "text",
    description: "ID of the user who placed this order",
    sortable: true,
    filterable: true,
    editable: false,
    // typically read-only
    usedInCreate: false, // might not allow setting user in create form
  },
  // 3) STATUS
  {
    key: "status",
    title: "Status",
    type: "select",
    description: "Order status",
    sortable: true,
    filterable: true,
    editable: true,
    usedInCreate: true,
    required: true,
    options: [
      {
        value: "OPEN",
        label: "Open",
      },
      {
        value: "CLOSED",
        label: "Closed",
      },
      {
        value: "CANCELLED",
        label: "Cancelled",
      },
    ],
    render: {
      type: "badge",
      config: {
        variant: (value) => {
          switch (value) {
            case "OPEN":
              return "primary";
            case "CLOSED":
              return "success";
            case "CANCELLED":
              return "danger";
            default:
              return "default";
          }
        },
        withDot: false,
      },
    },
  },
  // 4) SYMBOL
  {
    key: "symbol",
    title: "Symbol",
    type: "text",
    description: "Trading pair (e.g. BTC/USD)",
    sortable: true,
    filterable: true,
    editable: true,
    usedInCreate: true,
    required: true,
  },
  // 5) TYPE
  {
    key: "type",
    title: "Order Type",
    type: "select",
    description: "Market or Limit order type",
    sortable: true,
    filterable: true,
    editable: true,
    usedInCreate: true,
    required: true,
    options: [
      {
        value: "LIMIT",
        label: "Limit",
      },
      {
        value: "MARKET",
        label: "Market",
      },
    ],
  },
  // 6) TIME IN FORCE
  // Condition: only relevant if type === 'LIMIT'
  {
    key: "timeInForce",
    title: "Time in Force",
    type: "select",
    description: "How long the order remains active",
    sortable: true,
    filterable: false,
    editable: true,
    usedInCreate: true,
    required: true,
    options: [
      {
        value: "GTC",
        label: "Good Till Cancel",
      },
      {
        value: "IOC",
        label: "Immediate or Cancel",
      },
    ],
    condition: (values) => values.type === "LIMIT",
    expandedOnly: true,
  },
  // 7) SIDE
  {
    key: "side",
    title: "Side",
    type: "select",
    description: "Buy or Sell",
    sortable: true,
    filterable: true,
    editable: true,
    usedInCreate: true,
    required: true,
    options: [
      {
        value: "BUY",
        label: "Buy",
      },
      {
        value: "SELL",
        label: "Sell",
      },
    ],
    render: {
      type: "badge",
      config: {
        variant: (value) => {
          switch (value) {
            case "BUY":
              return "success";
            case "SELL":
              return "danger";
            default:
              return "default";
          }
        },
      },
    },
  },
  // 8) PRICE
  {
    key: "price",
    title: "Price",
    type: "number",
    description: "Limit or executed price",
    sortable: true,
    filterable: true,
    editable: true,
    usedInCreate: true,
    required: false,
    // Example: only relevant if type === 'LIMIT'
    condition: (values) => values.type === "LIMIT",
  },
  // 9) AMOUNT
  {
    key: "amount",
    title: "Amount",
    type: "number",
    description: "Order size",
    sortable: true,
    filterable: true,
    editable: true,
    usedInCreate: true,
    required: true,
  },
  // 10) FEE
  {
    key: "fee",
    title: "Fee",
    type: "number",
    description: "Fee paid for the order",
    sortable: true,
    filterable: false,
    editable: true,
    usedInCreate: true,
    required: false,
  },
  // 11) FEE CURRENCY
  {
    key: "feeCurrency",
    title: "Fee Currency",
    type: "text",
    description: "Currency used for the fee (e.g. USD)",
    sortable: false,
    filterable: false,
    editable: true,
    usedInCreate: true,
    required: false,
  },
  // 12) AVERAGE PRICE (read-only, might be updated by the system)
  {
    key: "average",
    title: "Average Price",
    type: "number",
    description: "Average fill price",
    sortable: true,
    filterable: false,
    editable: false,
    usedInCreate: false,
    expandedOnly: true, // only show in expanded view
  },
  // 13) FILLED
  {
    key: "filled",
    title: "Filled",
    type: "number",
    description: "How much of the order was filled",
    sortable: true,
    filterable: false,
    editable: false,
    usedInCreate: false,
    expandedOnly: true,
  },
  // 14) REMAINING
  {
    key: "remaining",
    title: "Remaining",
    type: "number",
    description: "Remaining amount to be filled",
    sortable: true,
    filterable: false,
    editable: false,
    usedInCreate: false,
    expandedOnly: true,
  },
  // 15) COST
  {
    key: "cost",
    title: "Cost",
    type: "number",
    description: "Total cost so far",
    sortable: true,
    filterable: false,
    editable: false,
    usedInCreate: false,
    expandedOnly: true,
  },
  // 16) TRADES (JSON) - typically read-only
  {
    key: "trades",
    title: "Trades",
    type: "custom",
    description: "Raw trade data (JSON)",
    sortable: false,
    filterable: false,
    editable: false,
    usedInCreate: false,
    expandedOnly: true,
    render: (value: any) => <TradesCell value={value} />,
  },
];
