"use client";

import {
  Hash,
  Building2,
  Mail,
  DollarSign,
  CheckCircle2,
  CalendarIcon,
  Wallet,
  FileText,
  TrendingUp,
  ArrowDownToLine,
} from "lucide-react";
import type { FormConfig } from "@/components/blocks/data-table/types/table";

import { useTranslations } from "next-intl";
export function useColumns(): ColumnDefinition[] {
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  const tExtAdmin = useTranslations("ext_admin");
  return [
    {
      key: "id",
      title: tExt("payout_id"),
      type: "text",
      icon: Hash,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("unique_payout_transaction_identifier_for_tracking"),
      priority: 1,
    },
    {
      key: "merchant",
      title: tExtAdmin("merchant"),
      type: "compound",
      icon: Building2,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("the_merchant_business_receiving_funds_from"),
      priority: 1,
      render: {
        type: "compound",
        config: {
          primary: {
            key: "name",
            title: tExtAdmin("merchant_name"),
            description: tExtAdmin("merchant_business_name"),
            icon: Building2,
          },
          secondary: {
            key: "email",
            title: tCommon("email"),
            icon: Mail,
          },
        },
      },
    },
    {
      key: "netAmount",
      title: tExt("net_amount"),
      type: "number",
      icon: DollarSign,
      sortable: true,
      searchable: false,
      filterable: false,
      description: tExtAdmin("final_payout_amount_transferred_to_merchant"),
      priority: 1,
      render: {
        type: "custom",
        render: (value: number, row: any) => (
          <span className="font-medium text-green-600">
            {value?.toFixed(2)} {row.currency}
          </span>
        ),
      },
    },
    {
      key: "status",
      title: tCommon("status"),
      type: "select",
      icon: CheckCircle2,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("current_processing_status_of_the_payouts_account"),
      priority: 1,
      render: {
        type: "badge",
        config: {
          withDot: true,
          variant: (value: string) => {
            switch (value) {
              case "COMPLETED":
                return "success";
              case "PENDING":
                return "warning";
              case "PROCESSING":
                return "warning";
              case "FAILED":
                return "destructive";
              case "CANCELLED":
                return "destructive";
              default:
                return "secondary";
            }
          },
        },
      },
      options: [
        { value: "PENDING", label: tCommon("pending") },
        { value: "PROCESSING", label: tCommon("processing") },
        { value: "COMPLETED", label: tCommon("completed") },
        { value: "FAILED", label: tCommon("failed") },
        { value: "CANCELLED", label: tCommon("cancelled") },
      ],
    },
    {
      key: "createdAt",
      title: tCommon("created_at"),
      type: "date",
      icon: CalendarIcon,
      sortable: true,
      searchable: false,
      filterable: true,
      description: tExtAdmin("date_and_time_when_the_payout"),
      render: {
        type: "date",
        format: "PPP p",
      },
      priority: 2,
    },
    {
      key: "grossAmount",
      title: tExtAdmin("gross_amount"),
      type: "number",
      icon: TrendingUp,
      sortable: true,
      searchable: false,
      filterable: false,
      description: tExtAdmin("total_revenue_amount_from_all_payments"),
      priority: 3,
      render: {
        type: "custom",
        render: (value: number, row: any) => (
          <span className="font-medium">
            {value?.toFixed(2)} {row.currency}
          </span>
        ),
      },
    },
    {
      key: "paymentCount",
      title: tCommon("payments"),
      type: "number",
      icon: FileText,
      sortable: true,
      searchable: false,
      filterable: false,
      description: tExtAdmin("total_number_of_successful_payments_included"),
      expandedOnly: true,
    },
    {
      key: "refundCount",
      title: tCommon("refunds"),
      type: "number",
      icon: ArrowDownToLine,
      sortable: true,
      searchable: false,
      filterable: false,
      description: tExtAdmin("total_number_of_refunds_processed_and"),
      expandedOnly: true,
    },
    {
      key: "feeAmount",
      title: tCommon("fee"),
      type: "number",
      icon: DollarSign,
      sortable: true,
      searchable: false,
      filterable: false,
      description: tExtAdmin("total_gateway_fees_deducted_from_the_gross_amount"),
      expandedOnly: true,
      render: {
        type: "custom",
        render: (value: number, row: any) => (
          <span className="text-muted-foreground">
            {value?.toFixed(2)} {row.currency}
          </span>
        ),
      },
    },
    {
      key: "walletType",
      title: tCommon("wallet_type"),
      type: "text",
      icon: Wallet,
      sortable: true,
      searchable: false,
      filterable: true,
      description: tExtAdmin("type_of_wallet_or_account_where"),
      expandedOnly: true,
    },
    {
      key: "periodStart",
      title: tCommon("period_start"),
      type: "date",
      icon: CalendarIcon,
      sortable: true,
      searchable: false,
      filterable: false,
      description: tExtAdmin("starting_date_of_the_billing_period"),
      render: {
        type: "date",
        format: "PPP",
      },
      expandedOnly: true,
    },
    {
      key: "periodEnd",
      title: tCommon("period_end"),
      type: "date",
      icon: CalendarIcon,
      sortable: true,
      searchable: false,
      filterable: false,
      description: tExtAdmin("ending_date_of_the_billing_period"),
      render: {
        type: "date",
        format: "PPP",
      },
      expandedOnly: true,
    },
  ];
}

export function useFormConfig(): FormConfig {
  const tCommon = useTranslations("common");
  const tExtAdmin = useTranslations("ext_admin");
  return {
    edit: {
      title: tExtAdmin("edit_payout"),
      description: tExtAdmin("update_payout_transaction_details_including_amount"),
      groups: [
        {
          id: "payout-info",
          title: tCommon("payout_information"),
          icon: DollarSign,
          priority: 1,
          fields: [
            {
              key: "amount",
              required: true,
              min: 0
            },
            {
              key: "currency",
              required: true,
              maxLength: 20
            },
            {
              key: "walletType",
              required: true,
              maxLength: 20
            },
          ],
        },
        {
          id: "status-info",
          title: tCommon("status"),
          icon: CheckCircle2,
          priority: 2,
          fields: [
            {
              key: "status",
              required: true,
              options: [
                { value: "PENDING", label: tCommon("pending") },
                { value: "PROCESSING", label: tCommon("processing") },
                { value: "COMPLETED", label: tCommon("completed") },
                { value: "FAILED", label: tCommon("failed") },
                { value: "CANCELLED", label: tCommon("cancelled") },
              ],
            },
          ],
        },
        {
          id: "amounts",
          title: tExtAdmin("amount_details"),
          icon: TrendingUp,
          priority: 3,
          fields: [
            {
              key: "grossAmount",
              required: true,
              min: 0
            },
            {
              key: "feeAmount",
              required: true,
              min: 0
            },
            {
              key: "netAmount",
              required: true,
              min: 0
            },
          ],
        },
        {
          id: "counts",
          title: tExtAdmin("transaction_counts"),
          icon: FileText,
          priority: 4,
          fields: [
            {
              key: "paymentCount",
              required: true,
              min: 0
            },
            {
              key: "refundCount",
              required: true,
              min: 0
            },
          ],
        },
        {
          id: "period",
          title: tCommon("period"),
          icon: CalendarIcon,
          priority: 5,
          fields: [
            {
              key: "periodStart",
              required: true
            },
            {
              key: "periodEnd",
              required: true
            },
          ],
        },
      ],
    },
  };
}
