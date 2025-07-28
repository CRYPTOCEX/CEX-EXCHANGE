import React from "react";
import {
  Hash, // For unique ID
  Tag, // For offer type
  Wallet, // For wallet type (ensure your lucide-react version includes this or substitute an alternative)
  DollarSign, // For price
  TrendingUp, // For market diff
  User, // For user information
  CreditCard, // For payment methods
  Clipboard, // For limits
  CheckCircle2, // For status
  CalendarIcon, // For creation date
  Mail,
  Coins, // For user's email
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";

export const columns: ColumnDefinition[] = [
  {
    key: "id",
    title: "ID",
    type: "text",
    icon: Hash,
    sortable: true,
    searchable: true,
    filterable: true,
    description: "Unique identifier for the offer",
    priority: 1,
    expandedOnly: true,
  },
  {
    key: "user",
    title: "User",
    type: "compound",
    icon: User,
    sortable: true,
    searchable: true,
    filterable: true,
    description: "The user who created the ticket",
    priority: 1, // important
    render: {
      type: "compound",
      config: {
        image: {
          key: "avatar", // expects row.user.avatar
          fallback: "/img/placeholder.svg",
          type: "image",
          title: "Avatar",
          description: "User's avatar",
          editable: false,
          usedInCreate: false,
        },
        primary: {
          key: ["firstName", "lastName"],
          title: ["First Name", "Last Name"],
          description: ["User's first name", "User's last name"],
          editable: false,
          usedInCreate: false,
          icon: User,
        },
        secondary: {
          key: "email",
          title: "Email",
          icon: Mail,
          editable: false,
          usedInCreate: false,
        },
      },
    },
  },
  {
    key: "type",
    title: "Type",
    type: "select",
    icon: Tag,
    sortable: true,
    searchable: true,
    filterable: true,
    editable: true,
    usedInCreate: true,
    description: "Offer type: BUY or SELL",
    render: {
      type: "badge",
      config: {
        withDot: false,
        variant: (value: string) =>
          value.toUpperCase() === "BUY" ? "outline" : "secondary",
      },
    },
    options: [
      { value: "BUY", label: "Buy" },
      { value: "SELL", label: "Sell" },
    ],
  },
  {
    key: "currency",
    title: "Currency",
    type: "text",
    icon: Coins,
    sortable: true,
    searchable: true,
    filterable: true,
    editable: true,
    usedInCreate: true,
    description: "The cryptocurrency or currency used in the offer",
  },
  {
    key: "walletType",
    title: "Wallet Type",
    type: "select",
    icon: Wallet,
    sortable: true,
    searchable: true,
    filterable: true,
    editable: true,
    usedInCreate: true,
    description: "Type of wallet (FIAT, SPOT, ECO)",
    options: [
      { value: "FIAT", label: "Fiat" },
      { value: "SPOT", label: "Spot" },
      { value: "ECO", label: "Eco" },
    ],
  },
  {
    key: "priceConfig",
    title: "Price",
    type: "custom",
    icon: DollarSign,
    sortable: false, // Can't sort on JSON field
    searchable: false,
    filterable: false,
    editable: false,
    usedInCreate: false,
    description: "Offer price configuration",
    render: {
      type: "custom",
      render: (value: any) => {
        if (!value || typeof value !== 'object') {
          return <span>-</span>;
        }
        const finalPrice = value.finalPrice || value.value || 0;
        const model = value.model || 'FIXED';
        return (
          <div className="text-sm">
            <div className="font-medium">{finalPrice.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">{model}</div>
          </div>
        );
      },
    },
  },
  {
    key: "marketDiff",
    title: "Market Diff",
    type: "text",
    icon: TrendingUp,
    sortable: true,
    searchable: false,
    filterable: true,
    editable: false,
    description: "Market difference (e.g., percentage or value)",
    render: {
      type: "custom",
      render: (value: any) => {
        // Apply a green color if the market difference is positive, otherwise red.
        const textClass =
          value && value.toString().startsWith("+")
            ? "text-green-600"
            : "text-red-600";
        return <span className={textClass}>{value}</span>;
      },
    },
    expandedOnly: true,
  },
  {
    key: "paymentMethods",
    title: "Payment Methods",
    type: "custom",
    icon: CreditCard,
    sortable: false,
    searchable: false,
    filterable: false,
    editable: false,
    usedInCreate: false,
    description: "Accepted payment methods for the offer",
    render: {
      type: "custom",
      render: (value: any) => {
        const t = useTranslations("ext");
        if (!value || !Array.isArray(value) || value.length === 0) {
          return <span>{t("no_methods")}</span>;
        }
        return (
          <div className="flex flex-wrap gap-1">
            {value.map((method: string, index: number) => (
              <Badge key={index} variant="outline" className="text-xs">
                {method}
              </Badge>
            ))}
          </div>
        );
      },
    },
    expandedOnly: true,
  },
  {
    key: "limits",
    title: "Limits",
    type: "text",
    icon: Clipboard,
    sortable: true,
    searchable: true,
    filterable: true,
    editable: true,
    usedInCreate: true,
    description: "Transaction limits",
    expandedOnly: true,
  },
  {
    key: "status",
    title: "Status",
    type: "select",
    icon: CheckCircle2,
    sortable: true,
    searchable: true,
    filterable: true,
    editable: true,
    usedInCreate: true,
    description: "Offer status",
    render: {
      type: "badge",
      config: {
        withDot: true,
        variant: (value: string) => {
          switch (value.toLowerCase()) {
            case "active":
              return "default";
            case "pending":
              return "outline";
            case "flagged":
              return "secondary";
            default:
              return "destructive";
          }
        },
      },
    },
    options: [
      { value: "active", label: "Active" },
      { value: "pending", label: "Pending" },
      { value: "flagged", label: "Flagged" },
      { value: "disabled", label: "Disabled" },
    ],
  },
  {
    key: "createdAt",
    title: "Created At",
    type: "date",
    icon: CalendarIcon,
    sortable: true,
    searchable: true,
    filterable: true,
    description: "Date when the offer was created",
    render: {
      type: "date",
      format: "PPP",
    },
    priority: 3,
  },
];
