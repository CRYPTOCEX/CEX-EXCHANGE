import React from "react";
import { TradesCell } from "../ecosystem/columns"; // or define your own
// If you have a custom cell for trades, import or replicate it here.

export const futuresOrderColumns: ColumnDefinition[] = [
  {
    key: "userId",
    title: "User ID",
    type: "text",
    description: "ID of the user",
    sortable: true,
    filterable: true,
    editable: false,
    usedInCreate: false,
  },
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
      { value: "OPEN", label: "Open" },
      { value: "CLOSED", label: "Closed" },
      { value: "CANCELLED", label: "Cancelled" },
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
      },
    },
  },
  {
    key: "symbol",
    title: "Symbol",
    type: "text",
    description: "Futures trading pair (e.g. BTC/USDT)",
    sortable: true,
    filterable: true,
    editable: true,
    usedInCreate: true,
    required: true,
  },
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
      { value: "LIMIT", label: "Limit" },
      { value: "MARKET", label: "Market" },
    ],
  },
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
      { value: "GTC", label: "GTC" },
      { value: "IOC", label: "IOC" },
    ],
    condition: (values) => values.type === "LIMIT",
    expandedOnly: true,
  },
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
      { value: "BUY", label: "Buy" },
      { value: "SELL", label: "Sell" },
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
  {
    key: "price",
    title: "Price",
    type: "number",
    description: "Order price",
    sortable: true,
    filterable: true,
    editable: true,
    usedInCreate: true,
    required: false,
    condition: (values) => values.type === "LIMIT",
  },
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
  {
    key: "leverage",
    title: "Leverage",
    type: "number",
    description: "Leverage multiplier",
    sortable: true,
    filterable: true,
    editable: true,
    usedInCreate: true,
    required: false,
  },
  {
    key: "fee",
    title: "Fee",
    type: "number",
    description: "Fee paid",
    sortable: true,
    filterable: false,
    editable: true,
    usedInCreate: true,
    required: false,
  },
  {
    key: "feeCurrency",
    title: "Fee Currency",
    type: "text",
    description: "Currency for fee (e.g. USDT)",
    sortable: false,
    filterable: false,
    editable: true,
    usedInCreate: true,
    required: false,
  },
  {
    key: "average",
    title: "Average",
    type: "number",
    description: "Average fill price",
    sortable: true,
    filterable: false,
    editable: false,
    usedInCreate: false,
    expandedOnly: true,
  },
  {
    key: "filled",
    title: "Filled",
    type: "number",
    description: "Filled amount",
    sortable: true,
    filterable: false,
    editable: false,
    usedInCreate: false,
    expandedOnly: true,
  },
  {
    key: "remaining",
    title: "Remaining",
    type: "number",
    description: "Remaining amount",
    sortable: true,
    filterable: false,
    editable: false,
    usedInCreate: false,
    expandedOnly: true,
  },
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
