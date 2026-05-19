"use client";

import React from "react";
import { Activity, Coins, User, DollarSign, Calendar, Hash } from "lucide-react";
import type { ColumnDefinition, FormConfig } from "@/components/blocks/data-table/types/table";

import { useTranslations } from "next-intl";
export function useColumns() {
  const t = useTranslations("ext_admin");
  const tCommon = useTranslations("common");
  const tDashboardAdmin = useTranslations("dashboard_admin");
  const tExt = useTranslations("ext");
  return [
  {
    key: "id",
    title: tCommon("id"),
    type: "text",
    sortable: true,
    searchable: true,
    filterable: true,
    description: t("unique_identifier_for_this_blockchain_activity"),
    priority: 4,
    expandedOnly: true,
  },
  {
    key: "type",
    title: t("activity_type"),
    type: "select",
    sortable: true,
    filterable: true,
    icon: Activity,
    description: t("type_of_blockchain_event_mint_transfer"),
    options: [
      { value: "MINT", label: t("mint"), color: "success" },
      { value: "TRANSFER", label: tCommon("transfer"), color: "blue" },
      { value: "SALE", label: t("sale"), color: "purple" },
      { value: "LIST", label: tDashboardAdmin("list"), color: "warning" },
      { value: "DELIST", label: t("delist"), color: "secondary" },
      { value: "BID", label: t("bid"), color: "yellow" },
      { value: "OFFER", label: tExt("offer"), color: "cyan" },
      { value: "BURN", label: t("burn"), color: "destructive" }
    ],
    render: {
      type: "badge",
      config: {
        variant: (value) => {
          const variants = {
            MINT: "success",
            TRANSFER: "blue",
            SALE: "purple",
            LIST: "warning",
            DELIST: "secondary",
            BID: "yellow",
            OFFER: "cyan",
            BURN: "destructive"
          };
          return variants[value] || "secondary";
        }
      }
    },
    priority: 1,
  },
  {
    key: "token",
    title: t("nft_token"),
    type: "compound",
    sortable: true,
    searchable: true,
    filterable: true,
    icon: Coins,
    description: t("digital_artwork_or_collectible_involved_in"),
    priority: 1,
    sortKey: "token.name",
    render: {
      type: "compound",
      config: {
        image: {
          key: "image",
          fallback: "/img/placeholder.svg",
          type: "image",
          title: t("token_image"),
          description: t("nft_token_image"),
        },
        primary: {
          key: "name",
          title: t("token"),
        },
        secondary: {
          key: "tokenId",
          title: tExt("token_id"),
        },
        metadata: [
          {
            key: "collection",
            title: tCommon("collection"),
            type: "custom",
            render: (value, row) => {
              const collectionName = row.token?.collection?.name || row.collection?.name;
              if (!collectionName) return null;
              return <span className="text-xs">{collectionName}</span>;
            }
          }
        ]
      }
    }
  },
  {
    key: "fromUser",
    title: tCommon("from"),
    type: "compound",
    sortable: true,
    searchable: true,
    filterable: true,
    icon: User,
    description: t("user_or_address_that_initiated_this_activity"),
    priority: 2,
    sortKey: "fromUser.firstName",
    render: {
      type: "compound",
      config: {
        image: {
          key: "avatar",
          fallback: "/img/placeholder.svg",
          type: "image",
          title: tCommon("avatar"),
          description: tCommon("users_profile_picture"),
        },
        primary: {
          key: ["firstName", "lastName"],
          title: [tCommon("first_name"), tCommon("last_name")],
          icon: User,
        },
        secondary: {
          key: "email",
          title: tCommon("email"),
        },
      }
    }
  },
  {
    key: "toUser",
    title: tCommon("to"),
    type: "compound",
    sortable: true,
    searchable: true,
    filterable: true,
    icon: User,
    description: t("user_or_address_that_received_this_activity"),
    priority: 2,
    sortKey: "toUser.firstName",
    render: {
      type: "compound",
      config: {
        image: {
          key: "avatar",
          fallback: "/img/placeholder.svg",
          type: "image",
          title: tCommon("avatar"),
          description: tCommon("users_profile_picture"),
        },
        primary: {
          key: ["firstName", "lastName"],
          title: [tCommon("first_name"), tCommon("last_name")],
          icon: User,
        },
        secondary: {
          key: "email",
          title: tCommon("email"),
        },
      }
    }
  },
  {
    key: "price",
    title: tCommon("price"),
    type: "number",
    sortable: true,
    filterable: true,
    icon: DollarSign,
    description: t("transaction_price_in_cryptocurrency_if_applicable"),
    priority: 1,
    render: {
      type: "custom",
      render: (value, row) => {
        if (value === null || value === undefined || isNaN(parseFloat(value))) {
          return <span className="text-muted-foreground">—</span>;
        }
        const amount = parseFloat(value);
        const currency = row.currency || '';
        let formatted;
        if (amount < 0.01) {
          formatted = amount.toFixed(8).replace(/\.?0+$/, '');
        } else {
          formatted = amount.toFixed(4).replace(/\.?0+$/, '');
        }
        return <span className="font-medium">{formatted} {currency}</span>;
      }
    }
  },
  {
    key: "currency",
    title: tCommon("currency"),
    type: "select",
    sortable: true,
    filterable: true,
    description: t("cryptocurrency_used_for_this_transaction"),
    options: [
      { value: "ETH", label: "ETH", color: "blue" },
      { value: "USDC", label: "USDC", color: "green" },
      { value: "USDT", label: "USDT", color: "green" },
      { value: "BNB", label: "BNB", color: "yellow" },
      { value: "MATIC", label: "MATIC", color: "purple" }
    ],
    render: {
      type: "badge",
      config: {
        variant: (value) => {
          const variants = {
            ETH: "blue",
            USDC: "green",
            USDT: "green",
            BNB: "yellow",
            MATIC: "purple"
          };
          return variants[value] || "secondary";
        }
      }
    },
    priority: 3,
    expandedOnly: true,
  },
  {
    key: "transactionHash",
    title: t("tx_hash"),
    type: "text",
    sortable: false,
    searchable: true,
    filterable: false,
    icon: Hash,
    description: t("blockchain_transaction_hash_for_verification_on"),
    priority: 4,
    render: {
      type: "custom",
      render: (value) => value ? (
        <code className="text-xs bg-muted px-2 py-1 rounded">
          {value.slice(0, 8)}...{value.slice(-6)}
        </code>
      ) : "—"
    },
    expandedOnly: true,
  },
  {
    key: "blockNumber",
    title: t("block"),
    type: "number",
    sortable: true,
    filterable: true,
    description: t("blockchain_block_number_where_this_transaction"),
    priority: 4,
    render: {
      type: "number",
      format: { notation: "compact" }
    },
    expandedOnly: true,
  },
  {
    key: "createdAt",
    title: tCommon("timestamp"),
    type: "date",
    sortable: true,
    filterable: true,
    icon: Calendar,
    description: t("date_and_time_when_this_activity"),
    render: {
      type: "date",
      format: "MMM dd, yyyy HH:mm:ss"
    },
    priority: 1,
  }
] as ColumnDefinition[];
}

// Form configuration - no create/edit forms needed (view-only)
export function useFormConfig() {
  const t = useTranslations("ext_admin");
  return {
    create: {
      title: t("create_new_activity"),
      description: t("record_a_new_nft_blockchain_activity"),
      groups: [],
    },
    edit: {
      title: t("edit_activity"),
      description: t("modify_nft_activity_record_details_and"),
      groups: [],
    },
  } as FormConfig;
}
