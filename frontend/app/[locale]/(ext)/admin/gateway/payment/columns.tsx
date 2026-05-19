"use client";

import {
  Hash,
  Building2,
  User,
  Mail,
  DollarSign,
  CheckCircle2,
  CalendarIcon,
  FileText,
  Coins,
  Globe,
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
      title: tExt("payment_id"),
      type: "text",
      icon: Hash,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("unique_payment_transaction_identifier_used_for"),
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
      description: tExtAdmin("the_merchant_business_receiving_this_payment"),
      priority: 2,
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
      key: "customer",
      title: tCommon("customer"),
      type: "compound",
      icon: User,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("the_customer_who_initiated_and_made_the_payment"),
      priority: 3,
      render: {
        type: "compound",
        config: {
          image: {
            key: "avatar",
            fallback: "/img/placeholder.svg",
            type: "image",
            title: tCommon("avatar"),
            description: tExtAdmin("customer_avatar"),
          },
          primary: {
            key: ["firstName", "lastName"],
            title: [tCommon("first_name"), tCommon("last_name")],
            description: [tExtAdmin("customer_first_name"), tExtAdmin("customer_last_name")],
            icon: User,
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
      key: "amount",
      title: tCommon("amount"),
      type: "number",
      icon: DollarSign,
      sortable: true,
      searchable: false,
      filterable: false,
      description: tExtAdmin("total_payment_amount_charged_to_the_customer"),
      priority: 1,
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
      key: "status",
      title: tCommon("status"),
      type: "select",
      icon: CheckCircle2,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("current_processing_status_of_the_payment"),
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
              case "FAILED":
                return "destructive";
              case "CANCELLED":
                return "destructive";
              case "EXPIRED":
                return "secondary";
              case "REFUNDED":
                return "secondary";
              case "PARTIALLY_REFUNDED":
                return "secondary";
              default:
                return "secondary";
            }
          },
        },
      },
      options: [
        { value: "PENDING", label: tCommon("pending") },
        { value: "COMPLETED", label: tCommon("completed") },
        { value: "FAILED", label: tCommon("failed") },
        { value: "CANCELLED", label: tCommon("cancelled") },
        { value: "EXPIRED", label: tCommon("expired") },
        { value: "REFUNDED", label: tCommon("refunded") },
        { value: "PARTIALLY_REFUNDED", label: tExt("partially_refunded") },
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
      description: tExtAdmin("date_and_time_when_the_payment"),
      render: {
        type: "date",
        format: "PPP p",
      },
      priority: 2,
    },
    {
      key: "orderId",
      title: tExt("order_id"),
      type: "text",
      icon: FileText,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("external_order_reference_number_from_the"),
      expandedOnly: true,
    },
    {
      key: "currency",
      title: tCommon("currency"),
      type: "text",
      icon: Coins,
      sortable: true,
      searchable: false,
      filterable: true,
      description: tExtAdmin("currency_code_for_the_payment_transaction"),
      expandedOnly: true,
    },
    {
      key: "fee",
      title: tCommon("fee"),
      type: "number",
      icon: DollarSign,
      sortable: true,
      searchable: false,
      filterable: false,
      description: tExtAdmin("gateway_transaction_fee_deducted_from_the"),
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
      key: "netAmount",
      title: tExt("net_amount"),
      type: "number",
      icon: DollarSign,
      sortable: true,
      searchable: false,
      filterable: false,
      description: tExtAdmin("final_amount_received_by_merchant_after"),
      expandedOnly: true,
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
      key: "completedAt",
      title: tExt("completed_at"),
      type: "date",
      icon: CalendarIcon,
      sortable: true,
      searchable: false,
      filterable: false,
      description: tExtAdmin("date_and_time_when_the_payment"),
      render: {
        type: "date",
        format: "PPP p",
      },
      expandedOnly: true,
    },
  ];
}

export function useFormConfig(): FormConfig {
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  const tExtAdmin = useTranslations("ext_admin");
  return {
    edit: {
      title: tExtAdmin("edit_payment"),
      description: tExtAdmin("update_payment_transaction_details_including_amoun"),
      groups: [
        {
          id: "payment-info",
          title: tExtAdmin("payment_information"),
          icon: DollarSign,
          priority: 1,
          fields: [
            {
              key: "amount",
              required: true,
              min: 0.01
            },
            {
              key: "currency",
              required: true,
              maxLength: 20
            },
            {
              key: "walletType",
              required: true,
              options: [
                { value: "FIAT", label: tCommon("fiat") },
                { value: "SPOT", label: tCommon("spot") },
                { value: "ECO", label: tCommon("eco") },
              ],
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
                { value: "EXPIRED", label: tCommon("expired") },
                { value: "REFUNDED", label: tCommon("refunded") },
                { value: "PARTIALLY_REFUNDED", label: tExt("partially_refunded") },
              ],
            },
          ],
        },
        {
          id: "urls",
          title: tExtAdmin("urls"),
          icon: Globe,
          priority: 3,
          fields: [
            {
              key: "returnUrl",
              required: true,
              maxLength: 1000
            },
            {
              key: "cancelUrl",
              required: false,
              maxLength: 1000
            },
            {
              key: "webhookUrl",
              required: false,
              maxLength: 1000
            },
          ],
        },
        {
          id: "customer-info",
          title: tCommon("customer_information"),
          icon: User,
          priority: 4,
          fields: [
            {
              key: "customerEmail",
              required: false,
              maxLength: 255
            },
            {
              key: "customerName",
              required: false,
              maxLength: 191
            },
          ],
        },
      ],
    },
  };
}
