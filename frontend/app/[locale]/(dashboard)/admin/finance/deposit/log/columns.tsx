import {
  Shield,
  User,
  DollarSign,
  ClipboardList,
  CalendarIcon,
} from "lucide-react";
import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useTranslations } from "next-intl";

// Mapping for friendly labels
const metadataLabels: Record<string, string> = {
  fromWallet: "From Wallet",
  toWallet: "To Wallet",
  fromCurrency: "From Currency",
  toCurrency: "To Currency",
};

export function renderTransactionMetadata(value: any) {
  const t = useTranslations("dashboard");
  if (!value) return "N/A";

  let parsed: Record<string, any>;
  try {
    parsed = typeof value === "string" ? JSON.parse(value) : value;
  } catch (error) {
    return <span className="text-red-500">{t("invalid_metadata")}</span>;
  }

  const entries = Object.entries(parsed);
  if (entries.length === 0) return "None";

  return (
    <Card className="bg-muted/10">
      <CardHeader>
        <CardTitle className="text-xs font-semibold">{t("Metadata")}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {entries.map(([key, val]) => (
            <div key={key} className="flex justify-between text-xs">
              <span className="font-bold">{metadataLabels[key] || key}</span>
              <span className="text-muted-foreground">{val}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
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
    description: "Unique identifier for the transaction",
    priority: 3,
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
    description: "User associated with the transaction",
    render: {
      type: "compound",
      config: {
        image: {
          key: "avatar",
          fallback: "/img/placeholder.svg",
          type: "image",
          title: "Avatar",
          description: "User avatar",
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
          icon: ClipboardList,
          editable: false,
          usedInCreate: false,
        },
      },
    },
    priority: 1,
  },
  {
    key: "wallet",
    title: "Wallet",
    type: "custom",
    icon: DollarSign,
    sortable: true,
    searchable: true,
    filterable: true,
    description: "Associated wallet",
    render: (value: any, row: any) => {
      const wallet = row?.wallet || value;
      if (!wallet) return "N/A";
      // If wallet has 'currency' and 'type', show them in a formatted string.
      if (wallet.currency && wallet.type) {
        return `${wallet.currency} (${wallet.type})`;
      }
      // Otherwise fallback to wallet.name or wallet.id
      return wallet.name || wallet.id || "N/A";
    },
    priority: 2,
  },
  {
    key: "status",
    title: "Status",
    type: "select",
    icon: ClipboardList,
    sortable: true,
    searchable: true,
    filterable: true,
    editable: true,
    description: "Transaction status",
    options: [
      { value: "PENDING", label: "Pending" },
      { value: "COMPLETED", label: "Completed" },
      { value: "FAILED", label: "Failed" },
      { value: "CANCELLED", label: "Cancelled" },
      { value: "EXPIRED", label: "Expired" },
      { value: "REJECTED", label: "Rejected" },
      { value: "REFUNDED", label: "Refunded" },
      { value: "FROZEN", label: "Frozen" },
      { value: "PROCESSING", label: "Processing" },
      { value: "TIMEOUT", label: "Timeout" },
    ],
    priority: 1,
    render: {
      type: "badge",
      config: {
        variant: (value: string) => {
          switch (value) {
            case "PENDING":
              return "warning";
            case "COMPLETED":
              return "success";
            case "FAILED":
              return "danger";
            case "CANCELLED":
              return "danger";
            case "EXPIRED":
              return "danger";
            case "REJECTED":
              return "danger";
            case "REFUNDED":
              return "danger";
            case "FROZEN":
              return "danger";
            case "PROCESSING":
              return "info";
            case "TIMEOUT":
              return "danger";
            default:
              return "info";
          }
        },
      },
    },
  },
  {
    key: "amount",
    title: "Amount",
    type: "number",
    icon: DollarSign,
    sortable: true,
    searchable: false,
    filterable: true,
    description: "Transaction amount",
    priority: 1,
    render: {
      type: "custom",
      render: (value: any) => {
        if (value === null || value === undefined) return "N/A";
        const num = typeof value === "number" ? value : parseFloat(value);
        if (isNaN(num)) return "N/A";
        return num.toFixed(8);
      },
    },
  },
  {
    key: "fee",
    title: "Fee",
    type: "number",
    icon: DollarSign,
    sortable: true,
    searchable: false,
    filterable: true,
    description: "Transaction fee",
    priority: 2,
    expandedOnly: true,
    render: {
      type: "custom",
      render: (value: any) => {
        if (value === null || value === undefined) return "N/A";
        const num = typeof value === "number" ? value : parseFloat(value);
        if (isNaN(num)) return "N/A";
        return num.toFixed(8);
      },
    },
  },
  {
    key: "description",
    title: "Description",
    type: "text",
    icon: ClipboardList,
    sortable: false,
    searchable: true,
    filterable: false,
    description: "Additional information",
    priority: 2,
    expandedOnly: true,
  },
  {
    key: "referenceId",
    title: "Reference ID",
    type: "text",
    icon: ClipboardList,
    sortable: true,
    searchable: true,
    filterable: true,
    description: "Reference identifier (for spot trading)",
    priority: 2,
    expandedOnly: true,
  },
  {
    key: "trxId",
    title: "Transaction Hash",
    type: "text",
    icon: ClipboardList,
    sortable: true,
    searchable: true,
    filterable: true,
    description: "Blockchain transaction hash (for ecosystem)",
    priority: 2,
    expandedOnly: true,
  },
  {
    key: "createdAt",
    title: "Created At",
    type: "date",
    icon: CalendarIcon,
    sortable: true,
    searchable: true,
    filterable: true,
    description: "Creation date",
    priority: 2,
    expandedOnly: true,
    render: { type: "date", format: "PPP", fullDate: true },
  },
  {
    key: "metadata",
    title: "Metadata",
    type: "custom",
    icon: ClipboardList,
    sortable: false,
    searchable: false,
    filterable: false,
    description: "Transaction metadata",
    render: {
      type: "custom",
      render: (value: any) => renderTransactionMetadata(value),
      title: false,
    },
    priority: 2,
    expandedOnly: true,
  },
];
