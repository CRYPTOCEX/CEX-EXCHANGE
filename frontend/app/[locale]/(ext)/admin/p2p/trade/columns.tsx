"use client";

import { User, Mail, Coins, DollarSign, Activity, Calendar, Hash } from "lucide-react";
import type { FormConfig } from "@/components/blocks/data-table/types/table";

import { useTranslations } from "next-intl";
export function useColumns(): ColumnDefinition[] {
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  const tExtAdmin = useTranslations("ext_admin");
  return [
    {
      key: "id",
      title: tExt("trade_id"),
      type: "text",
      icon: Hash,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("unique_identifier_for_the_p2p_trade_transaction"),
      priority: 3,
      expandedOnly: true,
    },
    {
      key: "status",
      title: tCommon("status"),
      type: "select",
      icon: Activity,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("current_status_of_the_p2p_trade"),
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
              case "PAYMENT_SENT":
                return "warning";
              case "CANCELLED":
                return "destructive";
              case "DISPUTED":
                return "destructive";
              default:
                return "secondary";
            }
          },
        },
      },
      options: [
        {
          value: "PENDING",
          label: tCommon("pending"),
        },
        {
          value: "PAYMENT_SENT",
          label: tCommon("payment_sent"),
        },
        {
          value: "COMPLETED",
          label: tCommon("completed"),
        },
        {
          value: "CANCELLED",
          label: tCommon("cancelled"),
        },
        {
          value: "DISPUTED",
          label: tExt("disputed"),
        },
        {
          value: "EXPIRED",
          label: tCommon("expired"),
        },
      ],
    },
    {
      key: "buyer",
      title: tExt("buyer"),
      type: "compound",
      icon: User,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("user_who_is_purchasing_cryptocurrency_in"),
      priority: 2,
      render: {
        type: "compound",
        config: {
          image: {
            key: "avatar",
            fallback: "/img/placeholder.svg",
            type: "image",
            title: tExtAdmin("buyer_avatar"),
            description: tExtAdmin("buyers_profile_avatar"),
          },
          primary: {
            key: ["firstName", "lastName"],
            title: [tCommon("first_name"), tCommon("last_name")],
            description: [tExtAdmin("buyers_first_name"), tExtAdmin("buyers_last_name")],
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
      key: "seller",
      title: tCommon("seller"),
      type: "compound",
      icon: User,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("user_who_is_selling_cryptocurrency_in"),
      priority: 2,
      render: {
        type: "compound",
        config: {
          image: {
            key: "avatar",
            fallback: "/img/placeholder.svg",
            type: "image",
            title: tExtAdmin("seller_avatar"),
            description: tExtAdmin("sellers_profile_avatar"),
          },
          primary: {
            key: ["firstName", "lastName"],
            title: [tCommon("first_name"), tCommon("last_name")],
            description: [tExtAdmin("sellers_first_name"), tExtAdmin("sellers_last_name")],
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
      icon: Coins,
      sortable: true,
      searchable: false,
      filterable: true,
      description: tExtAdmin("cryptocurrency_amount_being_traded"),
      priority: 1,
    },
    {
      key: "currency",
      title: tCommon("currency"),
      type: "text",
      icon: Coins,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("cryptocurrency_symbol_e_g_btc_eth_usdt"),
      priority: 2,
    },
    {
      key: "price",
      title: tCommon("price"),
      type: "number",
      icon: DollarSign,
      sortable: true,
      searchable: false,
      filterable: true,
      description: tExt("price_per_unit_of_cryptocurrency_in_fiat_currency"),
      priority: 2,
      expandedOnly: true,
    },
    {
      key: "total",
      title: tCommon("total"),
      type: "number",
      icon: DollarSign,
      sortable: true,
      searchable: false,
      filterable: true,
      description: tExtAdmin("total_fiat_value_of_the_trade_amount_price"),
      priority: 1,
    },
    {
      key: "createdAt",
      title: tCommon("created_at"),
      type: "date",
      icon: Calendar,
      sortable: true,
      searchable: false,
      filterable: true,
      description: tExtAdmin("date_and_time_when_the_trade_was_initiated"),
      priority: 3,
      render: {
        type: "date",
        format: "PPP",
      },
    },
  ];
}

export function useFormConfig(): FormConfig {
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  const tExtAdmin = useTranslations("ext_admin");
  return {
    create: {
      title: tExtAdmin("create_new_p2p_trade"),
      description: tExtAdmin("initiate_a_new_peer_to_peer"),
      groups: [
        {
          id: "trade-parties",
          title: tExtAdmin("trade_parties"),
          icon: User,
          priority: 1,
          fields: [
            { key: "offerId", required: true },
            { key: "buyer", required: true },
            { key: "seller", required: true },
          ],
        },
        {
          id: "trade-details",
          title: tCommon("trade_details"),
          icon: Coins,
          priority: 2,
          fields: [
            {
              key: "type",
              required: true,
              options: [
                { value: "BUY", label: tCommon("buy") },
                { value: "SELL", label: tCommon("sell") },
              ],
            },
            {
              key: "currency",
              required: true,
              maxLength: 50
            },
            {
              key: "amount",
              required: true,
              min: 0
            },
            {
              key: "price",
              required: true,
              min: 0
            },
            {
              key: "total",
              required: true,
              min: 0
            },
          ],
        },
        {
          id: "trade-payment",
          title: tCommon("payment_details"),
          icon: Activity,
          priority: 3,
          fields: [
            { key: "paymentMethod", required: true },
            { key: "paymentDetails", required: false },
            {
              key: "paymentReference",
              required: false,
              maxLength: 191
            },
          ],
        },
        {
          id: "trade-fees",
          title: tExtAdmin("fees_terms"),
          icon: DollarSign,
          priority: 4,
          fields: [
            {
              key: "buyerFee",
              required: false,
              min: 0
            },
            {
              key: "sellerFee",
              required: false,
              min: 0
            },
            {
              key: "escrowFee",
              required: false,
              maxLength: 50
            },
            {
              key: "escrowTime",
              required: false,
              maxLength: 50
            },
            { key: "terms", required: false },
          ],
        },
        {
          id: "trade-status",
          title: tExtAdmin("trade_status"),
          icon: Activity,
          priority: 5,
          fields: [
            {
              key: "status",
              required: true,
              options: [
                { value: "PENDING", label: tCommon("pending") },
                { value: "PAYMENT_SENT", label: tCommon("payment_sent") },
                { value: "COMPLETED", label: tCommon("completed") },
                { value: "CANCELLED", label: tCommon("cancelled") },
                { value: "DISPUTED", label: tExt("disputed") },
                { value: "EXPIRED", label: tCommon("expired") },
              ],
            },
            { key: "paymentConfirmedAt", required: false },
            { key: "timeline", required: false },
          ],
        },
      ],
    },
    edit: {
      title: tExtAdmin("edit_p2p_trade"),
      description: tExtAdmin("modify_p2p_trade_details_payment_information"),
      groups: [
        {
          id: "trade-parties",
          title: tExtAdmin("trade_parties"),
          icon: User,
          priority: 1,
          fields: [
            { key: "offerId", required: true },
            { key: "buyer", required: true },
            { key: "seller", required: true },
          ],
        },
        {
          id: "trade-details",
          title: tCommon("trade_details"),
          icon: Coins,
          priority: 2,
          fields: [
            {
              key: "type",
              required: true,
              options: [
                { value: "BUY", label: tCommon("buy") },
                { value: "SELL", label: tCommon("sell") },
              ],
            },
            {
              key: "currency",
              required: true,
              maxLength: 50
            },
            {
              key: "amount",
              required: true,
              min: 0
            },
            {
              key: "price",
              required: true,
              min: 0
            },
            {
              key: "total",
              required: true,
              min: 0
            },
          ],
        },
        {
          id: "trade-payment",
          title: tCommon("payment_details"),
          icon: Activity,
          priority: 3,
          fields: [
            { key: "paymentMethod", required: true },
            { key: "paymentDetails", required: false },
            {
              key: "paymentReference",
              required: false,
              maxLength: 191
            },
          ],
        },
        {
          id: "trade-fees",
          title: tExtAdmin("fees_terms"),
          icon: DollarSign,
          priority: 4,
          fields: [
            {
              key: "buyerFee",
              required: false,
              min: 0
            },
            {
              key: "sellerFee",
              required: false,
              min: 0
            },
            {
              key: "escrowFee",
              required: false,
              maxLength: 50
            },
            {
              key: "escrowTime",
              required: false,
              maxLength: 50
            },
            { key: "terms", required: false },
          ],
        },
        {
          id: "trade-status",
          title: tExtAdmin("trade_status"),
          icon: Activity,
          priority: 5,
          fields: [
            {
              key: "status",
              required: true,
              options: [
                { value: "PENDING", label: tCommon("pending") },
                { value: "PAYMENT_SENT", label: tCommon("payment_sent") },
                { value: "COMPLETED", label: tCommon("completed") },
                { value: "CANCELLED", label: tCommon("cancelled") },
                { value: "DISPUTED", label: tExt("disputed") },
                { value: "EXPIRED", label: tCommon("expired") },
              ],
            },
            { key: "paymentConfirmedAt", required: false },
            { key: "timeline", required: false },
          ],
        },
      ],
    },
  };
}
