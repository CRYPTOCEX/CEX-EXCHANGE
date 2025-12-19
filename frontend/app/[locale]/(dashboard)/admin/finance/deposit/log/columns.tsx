"use client";

import {
  Shield,
  User,
  DollarSign,
  ClipboardList,
  CalendarIcon,
  ArrowDownCircle,
  Wallet,
  Hash,
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

export function RenderTransactionMetadata({ value }: { value: any }) {
  const tCommon = useTranslations("common");
  if (!value) return "N/A";

  let parsed: Record<string, any>;
  try {
    parsed = typeof value === "string" ? JSON.parse(value) : value;
  } catch (error) {
    return <span className="text-red-500">{tCommon("invalid_metadata")}</span>;
  }

  const entries = Object.entries(parsed);
  if (entries.length === 0) return "None";

  return (
    <Card className="bg-muted/10">
      <CardHeader>
        <CardTitle className="text-xs font-semibold">Metadata</CardTitle>
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

export function useColumns() {
  const t = useTranslations("dashboard_admin");
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
    description: t("unique_identifier_for_the_transaction"),
    priority: 3,
    expandedOnly: true,
  },
  {
    key: "user",
    title: tCommon("user"),
    type: "compound",
    icon: User,
    sortable: true,
    searchable: true,
    filterable: true,
    description: t("user_associated_with_the_transaction"),
    render: {
      type: "compound",
      config: {
        image: {
          key: "avatar",
          fallback: "/img/placeholder.svg",
          type: "image",
          title: tCommon("avatar"),
          description: tCommon("user_avatar"),
          filterable: false,
          sortable: false,
        },
        primary: {
          key: ["firstName", "lastName"],
          title: [tCommon("first_name"), tCommon("last_name")],
          description: [tCommon('users_first_name'), tCommon('users_last_name')],
          sortable: true,
          sortKey: "firstName",
          icon: User,
        },
        secondary: {
          key: "email",
          title: tCommon("email"),
          description: t("users_email_address"),
          icon: ClipboardList,
          sortable: true,
        },
      },
    },
    priority: 1,
  },
  {
    key: "wallet",
    title: tCommon("wallet"),
    type: "custom",
    icon: Wallet,
    sortable: true,
    searchable: true,
    filterable: true,
    description: t("associated_wallet_for_the_deposit"),
    render: {
      type: "custom",
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
    },
    priority: 2,
  },
  {
    key: "status",
    title: tCommon("status"),
    type: "select",
    icon: ArrowDownCircle,
    sortable: true,
    searchable: true,
    filterable: true,
    description: t("current_status_of_the_deposit_transaction"),
    options: [
      { value: "PENDING", label: tCommon("pending") },
      { value: "COMPLETED", label: tCommon("completed") },
      { value: "FAILED", label: tCommon("failed") },
      { value: "CANCELLED", label: tCommon("cancelled") },
      { value: "EXPIRED", label: tCommon("expired") },
      { value: "REJECTED", label: tCommon("rejected") },
      { value: "REFUNDED", label: tCommon("refunded") },
      { value: "FROZEN", label: tCommon("frozen") },
      { value: "PROCESSING", label: tCommon("processing") },
      { value: "TIMEOUT", label: tCommon("timeout") },
    ],
    priority: 1,
    render: {
      type: "badge",
      config: {
        withDot: true,
        variant: (value: string) => {
          switch (value?.toUpperCase()) {
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
    title: tCommon("amount"),
    type: "number",
    icon: DollarSign,
    sortable: true,
    searchable: false,
    filterable: true,
    description: t("deposit_amount_in_the_wallets_currency"),
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
    title: tCommon("fee"),
    type: "number",
    icon: DollarSign,
    sortable: true,
    searchable: false,
    filterable: true,
    description: t("processing_fee_charged_for_the_deposit"),
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
    title: tCommon("description"),
    type: "text",
    icon: ClipboardList,
    sortable: false,
    searchable: true,
    filterable: false,
    description: t("additional_notes_or_information_about_the_deposit"),
    priority: 2,
    expandedOnly: true,
  },
  {
    key: "referenceId",
    title: tCommon("reference_id"),
    type: "text",
    icon: Hash,
    sortable: true,
    searchable: true,
    filterable: true,
    description: t("external_reference_identifier_for_spot_trading"),
    priority: 2,
    expandedOnly: true,
  },
  {
    key: "trxId",
    title: tCommon("transaction_hash"),
    type: "text",
    icon: Hash,
    sortable: true,
    searchable: true,
    filterable: true,
    description: t("blockchain_transaction_hash_for_crypto_deposits"),
    priority: 2,
    expandedOnly: true,
  },
  {
    key: "createdAt",
    title: tCommon("created_at"),
    type: "date",
    icon: CalendarIcon,
    sortable: true,
    searchable: true,
    filterable: true,
    description: t("date_and_time_when_the_deposit_was_created"),
    priority: 2,
    expandedOnly: true,
    render: { type: "date", format: "PPP", fullDate: true },
  },
  {
    key: "metadata",
    title: tCommon("metadata"),
    type: "custom",
    icon: ClipboardList,
    sortable: false,
    searchable: false,
    filterable: false,
    description: t("additional_transaction_metadata_and_details"),
    render: {
      type: "custom",
      render: (value: any) => <RenderTransactionMetadata value={value} />,
      title: false,
    },
    priority: 3,
    expandedOnly: true,
  },
] as ColumnDefinition[];
}
