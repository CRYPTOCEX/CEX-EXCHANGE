"use client";

import {
  Shield,
  User,
  DollarSign,
  ArrowLeftRight,
  Activity,
  FileText,
  Hash,
  Info,
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
  const t = useTranslations("finance_history");
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
    description: tCommon("unique_identifier_for_your_transaction_record"),
    priority: 3,
    expandedOnly: true,
  },
  {
    key: "wallet",
    title: tCommon("wallet"),
    type: "custom",
    icon: DollarSign,
    sortable: true,
    searchable: true,
    filterable: true,
    description: t("your_wallet_associated_with_this_transaction"),
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
    title: tCommon("type"),
    type: "select",
    icon: ArrowLeftRight,
    sortable: true,
    searchable: true,
    filterable: true,
    description: t("type_of_transaction_in_your_wallet_history"),
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
      { value: "FAILED", label: tCommon("failed") },
      { value: "DEPOSIT", label: tCommon("deposit") },
      { value: "WITHDRAW", label: tCommon("withdraw") },
      { value: "OUTGOING_TRANSFER", label: tCommon("outgoing_transfer") },
      { value: "INCOMING_TRANSFER", label: tCommon("incoming_transfer") },
      { value: "PAYMENT", label: tCommon("payment") },
      { value: "REFUND", label: tCommon("refund") },
      { value: "BINARY_ORDER", label: tCommon("binary_order") },
      { value: "EXCHANGE_ORDER", label: tCommon("exchange_order") },
      { value: "INVESTMENT", label: tCommon("investment") },
      { value: "INVESTMENT_ROI", label: tCommon("investment_roi") },
      { value: "AI_INVESTMENT", label: tCommon("ai_investment") },
      { value: "AI_INVESTMENT_ROI", label: tCommon("ai_investment_roi") },
      { value: "INVOICE", label: tCommon("invoice") },
      { value: "FOREX_DEPOSIT", label: tCommon("forex_deposit") },
      { value: "FOREX_WITHDRAW", label: tCommon("forex_withdraw") },
      { value: "FOREX_INVESTMENT", label: tCommon("forex_investment") },
      { value: "FOREX_INVESTMENT_ROI", label: tCommon("forex_investment_roi") },
      { value: "ICO_CONTRIBUTION", label: tCommon("ico_contribution") },
      { value: "REFERRAL_REWARD", label: tCommon("referral_reward") },
      { value: "STAKING", label: tCommon("staking") },
      { value: "STAKING_REWARD", label: tCommon("staking_reward") },
      { value: "P2P_OFFER_TRANSFER", label: tCommon("p2p_offer_transfer") },
      { value: "P2P_TRADE", label: tCommon("p2p_trade") },
    ],
    priority: 1,
  },
  {
    key: "status",
    title: tCommon("status"),
    type: "select",
    icon: Activity,
    sortable: true,
    searchable: true,
    filterable: true,
    description: t("current_processing_status_of_your_transaction"),
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
  },
  {
    key: "amount",
    title: tCommon("amount"),
    type: "number",
    icon: DollarSign,
    sortable: true,
    searchable: false,
    filterable: true,
    description: t("amount_of_money_involved_in_this_transaction"),
    priority: 1,
  },
  {
    key: "fee",
    title: tCommon("fee"),
    type: "number",
    icon: DollarSign,
    sortable: true,
    searchable: false,
    filterable: true,
    description: t("fee_charged_for_processing_this_transaction"),
    priority: 2,
    expandedOnly: true,
  },
  {
    key: "description",
    title: tCommon("description"),
    type: "text",
    icon: FileText,
    sortable: false,
    searchable: true,
    filterable: false,
    description: t("additional_details_and_notes_about_this"),
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
    description: t("unique_reference_code_for_tracking_and"),
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
    description: t("date_and_time_when_this_transaction_was_created"),
    priority: 2,
    render: { type: "date", format: "PPP", fullDate: true },
  },
  {
    key: "metadata",
    title: tCommon("metadata"),
    type: "custom",
    icon: Info,
    sortable: false,
    searchable: false,
    filterable: false,
    description: t("additional_technical_information_about_this_transa"),
    render: {
      type: "custom",
      render: (value: any) => <RenderTransactionMetadata value={value} />,
      title: false,
    },
    priority: 2,
    expandedOnly: true,
  },
] as ColumnDefinition[];
}
