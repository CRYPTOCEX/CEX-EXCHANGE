// src/config/tradeColumns.ts

import { User } from "lucide-react";
import { Mail } from "lucide-react";
export const tradeColumns: ColumnDefinition[] = [
  {
    key: "id",
    title: "Trade ID",
    type: "text",
    sortable: true,
    searchable: true,
    filterable: true,
    description: "Unique identifier for the trade",
    expandedOnly: true,
  },
  {
    key: "buyer",
    title: "Buyer",
    type: "compound",
    icon: User,
    sortable: true,
    searchable: true,
    filterable: true,
    description: "Buyer details",
    render: {
      type: "compound",
      config: {
        image: {
          key: "buyer.avatar",
          // expects row.buyer.avatar
          fallback: "/img/placeholder.svg",
          type: "image",
          title: "Buyer Avatar",
          description: "Buyer's avatar",
          editable: false,
          usedInCreate: false,
        },
        primary: {
          key: ["buyer.firstName", "buyer.lastName"],
          title: ["First Name", "Last Name"],
          description: ["Buyer first name", "Buyer last name"],
          editable: false,
          usedInCreate: false,
          icon: User,
        },
        secondary: {
          key: "buyer.email",
          title: "Email",
          icon: Mail,
          editable: false,
          usedInCreate: false,
        },
      },
    },
  },
  {
    key: "seller",
    title: "Seller",
    type: "compound",
    icon: User,
    sortable: true,
    searchable: true,
    filterable: true,
    description: "Seller details",
    render: {
      type: "compound",
      config: {
        image: {
          key: "seller.avatar",
          // expects row.seller.avatar
          fallback: "/img/placeholder.svg",
          type: "image",
          title: "Seller Avatar",
          description: "Seller's avatar",
          editable: false,
          usedInCreate: false,
        },
        primary: {
          key: ["seller.firstName", "seller.lastName"],
          title: ["First Name", "Last Name"],
          description: ["Seller first name", "Seller last name"],
          editable: false,
          usedInCreate: false,
          icon: User,
        },
        secondary: {
          key: "seller.email",
          title: "Email",
          icon: Mail,
          editable: false,
          usedInCreate: false,
        },
      },
    },
  },
  {
    key: "currency",
    title: "Currency",
    type: "text",
    sortable: true,
    searchable: true,
    filterable: true,
    editable: false,
    description: "Currency used in the trade",
  },
  {
    key: "amount",
    title: "Amount",
    type: "number",
    sortable: true,
    searchable: false,
    filterable: true,
    editable: false,
    description: "Trade amount",
  },
  {
    key: "price",
    title: "Price",
    type: "number",
    sortable: true,
    searchable: false,
    filterable: true,
    editable: false,
    description: "Trade price",
  },
  {
    key: "total",
    title: "Total",
    type: "number",
    sortable: true,
    searchable: false,
    filterable: true,
    editable: false,
    description: "Total trade value",
    expandedOnly: true,
  },
  {
    key: "status",
    title: "Status",
    type: "select",
    sortable: true,
    searchable: true,
    filterable: true,
    editable: false,
    description: "Trade status",
    render: {
      type: "badge",
      config: {
        withDot: true,
        variant: (value: string) => {
          switch (value) {
            case "PENDING":
              return "outline";
            case "PAYMENT_SENT":
              return "info";
            case "COMPLETED":
              return "default";
            case "CANCELLED":
              return "destructive";
            case "DISPUTED":
              return "secondary";
            default:
              return "default";
          }
        },
      },
    },
    options: [
      {
        value: "PENDING",
        label: "Pending",
      },
      {
        value: "PAYMENT_SENT",
        label: "Payment Sent",
      },
      {
        value: "COMPLETED",
        label: "Completed",
      },
      {
        value: "CANCELLED",
        label: "Cancelled",
      },
      {
        value: "DISPUTED",
        label: "Disputed",
      },
    ],
  },
  {
    key: "createdAt",
    title: "Created At",
    type: "date",
    sortable: true,
    searchable: false,
    filterable: true,
    editable: false,
    description: "Date when the trade was created",
    render: {
      type: "date",
      format: "PPP",
    },
  },
  {
    key: "actions",
    title: "Actions",
    type: "custom",
    editable: false,
    usedInCreate: false,
    filterable: false,
    searchable: false,
    render: {
      type: "custom",
      render: (_: any, row: any) => {
        return (
          <a
            href={`/admin/trades/${row.id}`}
            className="text-blue-500 underline"
          >
            View Details
          </a>
        );
      },
    },
  },
];
