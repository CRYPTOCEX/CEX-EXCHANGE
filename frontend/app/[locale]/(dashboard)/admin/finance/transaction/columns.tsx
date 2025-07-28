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
    key: "type",
    title: "Type",
    type: "select",
    icon: ClipboardList,
    sortable: true,
    searchable: true,
    filterable: true,
    editable: true,
    usedInCreate: true,
    description: "Transaction type",
    render: {
      type: "badge",
      config: {
        withDot: true,
        variant: (value: string) => {
          switch (value.toUpperCase()) {
            case "DEPOSIT":
              return "success";
            case "WITHDRAW":
              return "danger";
            case "OUTGOING_TRANSFER":
              return "warning";
            case "INCOMING_TRANSFER":
              return "info";
            case "PAYMENT":
              return "primary";
            case "REFUND":
              return "secondary";
            case "BINARY_ORDER":
              return "info";
            case "EXCHANGE_ORDER":
              return "primary";
            case "INVESTMENT":
              return "secondary";
            case "INVESTMENT_ROI":
              return "secondary";
            case "AI_INVESTMENT":
              return "secondary";
            case "AI_INVESTMENT_ROI":
              return "secondary";
            case "INVOICE":
              return "info";
            case "FOREX_DEPOSIT":
              return "success";
            case "FOREX_WITHDRAW":
              return "danger";
            case "FOREX_INVESTMENT":
              return "secondary";
            case "FOREX_INVESTMENT_ROI":
              return "secondary";
            case "ICO_CONTRIBUTION":
              return "info";
            case "REFERRAL_REWARD":
              return "primary";
            case "STAKING":
              return "info";
            case "STAKING_REWARD":
              return "info";
            case "P2P_OFFER_TRANSFER":
              return "warning";
            case "P2P_TRADE":
              return "primary";
            case "FAILED":
              return "danger";
            default:
              return "default";
          }
        },
      },
    },
    options: [
      { value: "FAILED", label: "Failed" },
      { value: "DEPOSIT", label: "Deposit" },
      { value: "WITHDRAW", label: "Withdraw" },
      { value: "OUTGOING_TRANSFER", label: "Outgoing Transfer" },
      { value: "INCOMING_TRANSFER", label: "Incoming Transfer" },
      { value: "PAYMENT", label: "Payment" },
      { value: "REFUND", label: "Refund" },
      { value: "BINARY_ORDER", label: "Binary Order" },
      { value: "EXCHANGE_ORDER", label: "Exchange Order" },
      { value: "INVESTMENT", label: "Investment" },
      { value: "INVESTMENT_ROI", label: "Investment ROI" },
      { value: "AI_INVESTMENT", label: "AI Investment" },
      { value: "AI_INVESTMENT_ROI", label: "AI Investment ROI" },
      { value: "INVOICE", label: "Invoice" },
      { value: "FOREX_DEPOSIT", label: "Forex Deposit" },
      { value: "FOREX_WITHDRAW", label: "Forex Withdraw" },
      { value: "FOREX_INVESTMENT", label: "Forex Investment" },
      { value: "FOREX_INVESTMENT_ROI", label: "Forex Investment ROI" },
      { value: "ICO_CONTRIBUTION", label: "ICO Contribution" },
      { value: "REFERRAL_REWARD", label: "Referral Reward" },
      { value: "STAKING", label: "Staking" },
      { value: "STAKING_REWARD", label: "Staking Reward" },
      { value: "P2P_OFFER_TRANSFER", label: "P2P Offer Transfer" },
      { value: "P2P_TRADE", label: "P2P Trade" },
    ],
    priority: 1,
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
    description: "Reference identifier",
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
