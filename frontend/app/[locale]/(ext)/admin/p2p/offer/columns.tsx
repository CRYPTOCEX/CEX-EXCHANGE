"use client";

import React from "react";
import { useTranslations } from "next-intl";
import {
  Hash,
  Tag,
  Wallet,
  DollarSign,
  User,
  CreditCard,
  CheckCircle2,
  CalendarIcon,
  Mail,
  Coins,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { FormConfig } from "@/components/blocks/data-table/types/table";

export function useColumns(): ColumnDefinition[] {
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  const tExtAdmin = useTranslations("ext_admin");
  return [
    {
      key: "id",
      title: tCommon("id"),
      type: "text",
      icon: Hash,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("unique_identifier_for_the_p2p_offer_listing"),
      priority: 3,
      expandedOnly: true,
    },
    {
      key: "status",
      title: tCommon("status"),
      type: "select",
      icon: CheckCircle2,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("current_status_of_the_offer_active"),
      priority: 1,
      render: {
        type: "badge",
        config: {
          withDot: true,
          variant: (value: string) => {
            const status = value?.toLowerCase().replace(/_/g, '');
            switch (status) {
              case "active":
                return "success";
              case "completed":
                return "success";
              case "pending":
              case "pendingapproval":
                return "warning";
              case "flagged":
                return "warning";
              case "paused":
                return "secondary";
              case "disabled":
              case "rejected":
                return "destructive";
              default:
                return "secondary";
            }
          },
        },
      },
      options: [
        { value: "DRAFT", label: tCommon("draft") },
        { value: "PENDING_APPROVAL", label: tExt("pending_approval") },
        { value: "ACTIVE", label: tCommon("active") },
        { value: "PAUSED", label: tCommon("paused") },
        { value: "COMPLETED", label: tCommon("completed") },
        { value: "CANCELLED", label: tCommon("cancelled") },
        { value: "REJECTED", label: tCommon("rejected") },
        { value: "EXPIRED", label: tCommon("expired") },
      ],
    },
    {
      key: "user",
      title: tCommon("user"),
      type: "compound",
      icon: User,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("user_who_created_and_owns_this_p2p_offer"),
      priority: 2,
      render: {
        type: "compound",
        config: {
          image: {
            key: "avatar",
            fallback: "/img/placeholder.svg",
            type: "image",
            title: tCommon("avatar"),
            description: tExtAdmin("users_profile_avatar"),
          },
          primary: {
            key: ["firstName", "lastName"],
            title: [tCommon("first_name"), tCommon("last_name")],
            description: [tCommon('users_first_name'), tCommon('users_last_name')],
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
      key: "type",
      title: tCommon("type"),
      type: "select",
      icon: Tag,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("offer_type_buy_user_wants_to"),
      priority: 1,
      render: {
        type: "badge",
        config: {
          withDot: false,
          variant: (value: string) =>
            value.toUpperCase() === "BUY" ? "success" : "warning",
        },
      },
      options: [
        { value: "BUY", label: tCommon("buy") },
        { value: "SELL", label: tCommon("sell") },
      ],
    },
    {
      key: "currency",
      title: tCommon("currency"),
      type: "text",
      icon: Coins,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("cryptocurrency_being_offered_for_trade_e"),
      priority: 1,
    },
    {
      key: "priceConfig",
      title: tCommon("price"),
      type: "custom",
      icon: DollarSign,
      sortable: false,
      searchable: false,
      filterable: false,
      description: tExtAdmin("price_configuration_including_pricing_model_fixed"),
      priority: 2,
      render: {
        type: "custom",
        render: (value: any) => {
          if (!value) {
            return <span>-</span>;
          }
          let config = value;
          if (typeof value === 'string') {
            try {
              config = JSON.parse(value);
            } catch (e) {
              return <span>-</span>;
            }
          }
          if (typeof config !== 'object') {
            return <span>-</span>;
          }
          const finalPrice = config.finalPrice || config.value || 0;
          const model = config.model || 'FIXED';
          return (
            <div className="text-sm">
              <div className="font-medium">{finalPrice.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">{model}</div>
            </div>
          );
        },
      },
    },
    {
      key: "walletType",
      title: tCommon("wallet_type"),
      type: "select",
      icon: Wallet,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("type_of_wallet_used_for_the"),
      priority: 2,
      options: [
        { value: "FIAT", label: tCommon("fiat") },
        { value: "SPOT", label: tCommon("spot") },
        { value: "ECO", label: tCommon("eco") },
      ],
    },
    {
      key: "paymentMethods",
      title: tExt("payment_methods"),
      type: "custom",
      icon: CreditCard,
      sortable: false,
      searchable: false,
      filterable: false,
      description: tExt("accepted_payment_methods_for_this_offer"),
      priority: 3,
      render: {
        type: "custom",
        render: (value: any) => {
          if (!value || !Array.isArray(value) || value.length === 0) {
            return <span>{tExt("no_methods")}</span>;
          }
          return (
            <div className="flex flex-wrap gap-1">
              {value.map((method: any, index: number) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {typeof method === 'string' ? method : method.name || 'Unknown'}
                </Badge>
              ))}
            </div>
          );
        },
      },
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
      description: tExtAdmin("date_and_time_when_the_offer_was_created"),
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
      title: tExtAdmin("create_new_p2p_offer"),
      description: tExtAdmin("create_a_new_peer_to_peer"),
      groups: [
        {
          id: "offer-basic",
          title: tCommon("offer_details"),
          icon: Tag,
          priority: 1,
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
              key: "walletType",
              required: true,
              options: [
                { value: "FIAT", label: tCommon("fiat") },
                { value: "SPOT", label: tCommon("spot") },
                { value: "ECO", label: tCommon("eco") },
              ],
            },
            {
              key: "priceCurrency",
              required: false,
              maxLength: 10
            },
          ],
        },
        {
          id: "offer-pricing",
          title: tExtAdmin("pricing_configuration"),
          icon: DollarSign,
          priority: 2,
          fields: [
            { key: "priceConfig", required: true },
            { key: "amountConfig", required: true },
          ],
        },
        {
          id: "offer-settings",
          title: tCommon("trade_settings"),
          icon: CreditCard,
          priority: 3,
          fields: [
            { key: "tradeSettings", required: true },
            { key: "locationSettings", required: false },
            { key: "userRequirements", required: false },
          ],
        },
        {
          id: "offer-payment",
          title: tExt("payment_methods"),
          icon: CreditCard,
          priority: 4,
          fields: [
            { key: "paymentMethods", required: true },
          ],
        },
        {
          id: "offer-status",
          title: tCommon("status"),
          icon: CheckCircle2,
          priority: 5,
          fields: [
            {
              key: "status",
              required: true,
              options: [
                { value: "DRAFT", label: tCommon("draft") },
                { value: "PENDING_APPROVAL", label: tExt("pending_approval") },
                { value: "ACTIVE", label: tCommon("active") },
                { value: "PAUSED", label: tCommon("paused") },
                { value: "COMPLETED", label: tCommon("completed") },
                { value: "CANCELLED", label: tCommon("cancelled") },
                { value: "REJECTED", label: tCommon("rejected") },
                { value: "EXPIRED", label: tCommon("expired") },
              ],
            },
            {
              key: "views",
              required: false,
              min: 0
            },
            { key: "adminNotes", required: false },
          ],
        },
      ],
    },
    edit: {
      title: tExtAdmin("edit_p2p_offer"),
      description: tExtAdmin("modify_p2p_offer_settings_including_pricing"),
      groups: [
        {
          id: "offer-basic",
          title: tCommon("offer_details"),
          icon: Tag,
          priority: 1,
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
              key: "walletType",
              required: true,
              options: [
                { value: "FIAT", label: tCommon("fiat") },
                { value: "SPOT", label: tCommon("spot") },
                { value: "ECO", label: tCommon("eco") },
              ],
            },
            {
              key: "priceCurrency",
              required: false,
              maxLength: 10
            },
          ],
        },
        {
          id: "offer-pricing",
          title: tExtAdmin("pricing_configuration"),
          icon: DollarSign,
          priority: 2,
          fields: [
            { key: "priceConfig", required: true },
            { key: "amountConfig", required: true },
          ],
        },
        {
          id: "offer-settings",
          title: tCommon("trade_settings"),
          icon: CreditCard,
          priority: 3,
          fields: [
            { key: "tradeSettings", required: true },
            { key: "locationSettings", required: false },
            { key: "userRequirements", required: false },
          ],
        },
        {
          id: "offer-payment",
          title: tExt("payment_methods"),
          icon: CreditCard,
          priority: 4,
          fields: [
            { key: "paymentMethods", required: true },
          ],
        },
        {
          id: "offer-status",
          title: tCommon("status"),
          icon: CheckCircle2,
          priority: 5,
          fields: [
            {
              key: "status",
              required: true,
              options: [
                { value: "DRAFT", label: tCommon("draft") },
                { value: "PENDING_APPROVAL", label: tExt("pending_approval") },
                { value: "ACTIVE", label: tCommon("active") },
                { value: "PAUSED", label: tCommon("paused") },
                { value: "COMPLETED", label: tCommon("completed") },
                { value: "CANCELLED", label: tCommon("cancelled") },
                { value: "REJECTED", label: tCommon("rejected") },
                { value: "EXPIRED", label: tCommon("expired") },
              ],
            },
            {
              key: "views",
              required: false,
              min: 0
            },
            { key: "adminNotes", required: false },
          ],
        },
      ],
    },
  };
}
