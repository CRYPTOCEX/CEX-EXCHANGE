"use client";

import {
  CalendarIcon,
  DollarSign,
  ClipboardCheck,
  Clock,
  FileText,
  Wallet as WalletIcon,
  User,
  ClipboardList,
} from "lucide-react";
import { useTranslations } from "next-intl";
export function useColumns(): ColumnDefinition[] {
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  const tExtAdmin = useTranslations("ext_admin");
  return [
    {
      key: "user",
      title: tCommon("user"),
      type: "compound",
      icon: User,
      sortable: true,
      searchable: true,
      filterable: true,
      priority: 1,
      description: tExtAdmin("investor_who_made_the_token_purchase"),
      render: {
        type: "compound",
        config: {
          image: {
            key: "avatar",
            fallback: "/img/placeholder.svg",
            type: "image",
            title: tCommon("avatar"),
            description: tCommon("user_avatar"),
          },
          primary: {
            key: ["firstName", "lastName"],
            title: [tCommon("first_name"), tCommon("last_name")],
            description: [tCommon("users_first_name"), tCommon("users_last_name")],
            icon: User,
          },
          secondary: {
            key: "email",
            title: tCommon("email"),
            icon: ClipboardList,
          },
        },
      },
    },
    {
      key: "offering.name",
      title: tExt("offering"),
      sortKey: "offering.name",
      type: "text",
      sortable: true,
      searchable: true,
      filterable: true,
      icon: FileText,
      priority: 2,
      description: tExtAdmin("name_of_the_ico_offering_that"),
    },
    {
      key: "amount",
      title: tCommon("amount"),
      type: "number",
      icon: DollarSign,
      sortable: true,
      searchable: true,
      filterable: true,
      priority: 3,
      description: tExtAdmin("total_number_of_tokens_purchased_in"),
    },
    {
      key: "price",
      title: tCommon("price"),
      type: "number",
      icon: DollarSign,
      sortable: true,
      searchable: true,
      filterable: true,
      priority: 4,
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
      priority: 5,
      description: tExtAdmin("current_processing_status_of_the_token"),
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
      priority: 6,
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
      description: tExtAdmin("cryptocurrency_wallet_address_used_for_this"),
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
