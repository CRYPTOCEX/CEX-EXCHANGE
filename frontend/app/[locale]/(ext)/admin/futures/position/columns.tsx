export const futuresPositionsColumns: ColumnDefinition[] = [
  {
    key: "userId",
    title: "User ID",
    type: "text",
    description: "ID of the user holding the position",
    sortable: true,
    filterable: true,
    editable: false,
    usedInCreate: false,
  },
  {
    key: "symbol",
    title: "Symbol",
    type: "text",
    description: "Trading pair (e.g., BTC/USDT)",
    sortable: true,
    filterable: true,
    editable: true,
    usedInCreate: true,
    required: true,
  },
  {
    key: "side",
    title: "Side",
    type: "select",
    description: "Position side (Buy/Sell)",
    sortable: true,
    filterable: true,
    editable: true,
    usedInCreate: true,
    required: true,
    options: [
      { value: "BUY", label: "Buy" },
      { value: "SELL", label: "Sell" },
    ],
    render: {
      type: "badge",
      config: {
        variant: (value) => (value === "BUY" ? "success" : "danger"),
      },
    },
  },
  {
    key: "entryPrice",
    title: "Entry Price",
    type: "number",
    description: "Price at which the position was entered",
    sortable: true,
    filterable: true,
    editable: true,
    usedInCreate: true,
    required: true,
  },
  {
    key: "amount",
    title: "Amount",
    type: "number",
    description: "Position size",
    sortable: true,
    filterable: true,
    editable: true,
    usedInCreate: true,
    required: true,
  },
  {
    key: "leverage",
    title: "Leverage",
    type: "number",
    description: "Leverage used for the position",
    sortable: true,
    filterable: true,
    editable: true,
    usedInCreate: true,
  },
  {
    key: "unrealizedPnl",
    title: "Unrealized PnL",
    type: "number",
    description: "Unrealized profit or loss",
    sortable: true,
    filterable: false,
    editable: false,
    usedInCreate: false,
  },
  {
    key: "stopLossPrice",
    title: "Stop Loss",
    type: "number",
    description: "Stop Loss trigger price",
    sortable: false,
    filterable: false,
    editable: true,
    usedInCreate: true,
    expandedOnly: true,
  },
  {
    key: "takeProfitPrice",
    title: "Take Profit",
    type: "number",
    description: "Take Profit trigger price",
    sortable: false,
    filterable: false,
    editable: true,
    usedInCreate: true,
    expandedOnly: true,
  },
  {
    key: "status",
    title: "Status",
    type: "select",
    description: "Current status of the position",
    sortable: true,
    filterable: true,
    editable: true,
    usedInCreate: true,
    required: true,
    options: [
      { value: "ACTIVE", label: "Active" },
      { value: "CLOSED", label: "Closed" },
      { value: "LIQUIDATED", label: "Liquidated" },
    ],
    render: {
      type: "badge",
      config: {
        variant: (value) => {
          switch (value) {
            case "ACTIVE":
              return "primary";
            case "CLOSED":
              return "success";
            case "LIQUIDATED":
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
    description: "Position creation date",
    sortable: true,
    filterable: true,
    editable: false,
    usedInCreate: false,
  },
];
