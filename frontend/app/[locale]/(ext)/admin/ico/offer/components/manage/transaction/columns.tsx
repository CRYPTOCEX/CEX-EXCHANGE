"use client";

import {
  CalendarIcon,
  DollarSign,
  ClipboardCheck,
  Clock,
  FileText,
  Wallet as WalletIcon,
} from "lucide-react";
import { format } from "date-fns";
import type { FormConfig } from "@/components/blocks/data-table/types/table";

import { useTranslations } from "next-intl";
export function useColumns() {
  const t = useTranslations("ext_admin");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  return [
    {
      key: "offering.name",
      title: tExt("offering"),
      sortKey: "offering.name",
      type: "text",
      sortable: true,
      searchable: true,
      filterable: true,
      icon: FileText,
      priority: 1,
      description: t("name_of_the_ico_offering_that"),
    },
    {
      key: "amount",
      title: tExt("token_amount"),
      type: "number",
      icon: DollarSign,
      sortable: true,
      searchable: true,
      filterable: true,
      priority: 2,
      description: t("total_number_of_tokens_purchased_in"),
    },
    {
      key: "price",
      title: tCommon("token_price_usd"),
      type: "number",
      icon: DollarSign,
      sortable: true,
      searchable: true,
      filterable: true,
      priority: 3,
      description: tExt("price_per_token_in_usd_at_the_time_of_purchase"),
    },
    {
      key: "status",
      title: tCommon("status"),
      type: "select",
      icon: Clock,
      sortable: true,
      searchable: true,
      filterable: true,
      priority: 4,
      description: t("current_processing_status_of_the_token"),
      render: {
        type: "badge",
        config: {
          withDot: true,
          variant: (value: string) => {
            switch (value.toUpperCase()) {
              case "RELEASED":
                return "success";
              case "PENDING":
                return "warning";
              case "VERIFICATION":
                return "warning";
              case "REJECTED":
                return "destructive";
              default:
                return "default";
            }
          },
        },
      },
      options: [
        { value: "PENDING", label: tCommon("pending") },
        { value: "VERIFICATION", label: tExt("verification") },
        { value: "RELEASED", label: tCommon("released") },
        { value: "REJECTED", label: tCommon("rejected") },
      ],
    },
    {
      key: "createdAt",
      title: tCommon("created_at"),
      type: "date",
      icon: CalendarIcon,
      sortable: true,
      searchable: true,
      filterable: true,
      priority: 5,
      description: tExt("date_and_time_when_the_transaction_was_created"),
      render: {
        type: "date",
        format: "PPP",
      },
    },
    {
      key: "transactionId",
      title: tCommon("transaction_id"),
      type: "text",
      sortable: true,
      searchable: true,
      filterable: true,
      icon: FileText,
      description: tExt("unique_blockchain_transaction_identifier_for_track"),
      expandedOnly: true,
    },
    {
      key: "walletAddress",
      title: tCommon("wallet_address"),
      type: "text",
      sortable: true,
      searchable: true,
      filterable: true,
      icon: WalletIcon,
      description: t("cryptocurrency_wallet_address_used_for_this"),
      expandedOnly: true,
    },
    {
      key: "id",
      title: tCommon("id"),
      type: "text",
      sortable: true,
      searchable: true,
      filterable: true,
      icon: ClipboardCheck,
      description: tExt("internal_system_identifier_for_this_transaction"),
      expandedOnly: true,
    },
  ];
}

// Form configuration with validation rules based on backend model
export function useFormConfig(): FormConfig {
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  const tExtAdmin = useTranslations("ext_admin");
  return {
    create: {
      title: tExt("create_new_transaction"),
      description: tExt("record_a_new_token_purchase_transaction"),
      groups: [
        {
          id: "transaction_details",
          title: tCommon("transaction_details"),
          description: tExt("basic_transaction_information"),
          fields: [
            {
              key: "offering.name",
              required: false,
            },
            {
              key: "amount",
              required: true,
              min: 0,
            },
            {
              key: "price",
              required: true,
              min: 0,
            },
          ],
        },
        {
          id: "wallet_info",
          title: tCommon("wallet_information"),
          description: tExt("blockchain_and_wallet_details"),
          fields: [
            {
              key: "releaseUrl",
              required: false,
              maxLength: 191,
            },
            {
              key: "walletAddress",
              required: false,
              maxLength: 191,
            },
          ],
        },
        {
          id: "status_notes",
          title: tExtAdmin("status_notes"),
          description: tExt("transaction_status_and_additional_information"),
          fields: [
            {
              key: "status",
              required: true,
              options: [
                { value: "PENDING", label: tCommon("pending") },
                { value: "VERIFICATION", label: tExt("verification") },
                { value: "RELEASED", label: tCommon("released") },
                { value: "REJECTED", label: tCommon("rejected") },
              ],
            },
            {
              key: "notes",
              required: false,
            },
          ],
        },
      ],
    },
    edit: {
      title: tCommon("edit_transaction"),
      description: tExtAdmin("update_transaction_details_wallet_information_and"),
      groups: [
        {
          id: "transaction_details",
          title: tCommon("transaction_details"),
          description: tExt("basic_transaction_information"),
          fields: [
            {
              key: "offering.name",
              required: false,
            },
            {
              key: "amount",
              required: true,
              min: 0,
            },
            {
              key: "price",
              required: true,
              min: 0,
            },
          ],
        },
        {
          id: "wallet_info",
          title: tCommon("wallet_information"),
          description: tExt("blockchain_and_wallet_details"),
          fields: [
            {
              key: "releaseUrl",
              required: false,
              maxLength: 191,
            },
            {
              key: "walletAddress",
              required: false,
              maxLength: 191,
            },
          ],
        },
        {
          id: "status_notes",
          title: tExtAdmin("status_notes"),
          description: tExt("transaction_status_and_additional_information"),
          fields: [
            {
              key: "status",
              required: true,
              options: [
                { value: "PENDING", label: tCommon("pending") },
                { value: "VERIFICATION", label: tExt("verification") },
                { value: "RELEASED", label: tCommon("released") },
                { value: "REJECTED", label: tCommon("rejected") },
              ],
            },
            {
              key: "notes",
              required: false,
            },
          ],
        },
      ],
    },
  };
}
