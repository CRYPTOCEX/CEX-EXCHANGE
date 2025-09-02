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
            {value.map((method: any, index: number) => (
              <Badge key={index} variant="outline" className="text-xs">
                {typeof method === 'string' ? method : method.name || 'Unknown'}
              </Badge>
            ))}
          </div>
        );
      },
    },
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
          const status = value?.toLowerCase().replace('_', '');
          switch (status) {
            case "active":
              return "default";
            case "pending":
            case "pendingapproval":
              return "outline";
            case "flagged":
              return "secondary";
            case "disabled":
            case "rejected":
              return "destructive";
            default:
              return "outline";
          }
        },
      },
    },
    options: [
      { value: "ACTIVE", label: "Active" },
      { value: "PENDING_APPROVAL", label: "Pending Approval" },
      { value: "FLAGGED", label: "Flagged" },
      { value: "DISABLED", label: "Disabled" },
      { value: "REJECTED", label: "Rejected" },
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
