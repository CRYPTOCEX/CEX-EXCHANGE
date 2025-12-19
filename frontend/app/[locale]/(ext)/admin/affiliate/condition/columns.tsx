"use client";

import {
  Shield,
  ClipboardList,
  DollarSign,
  Image as ImageIcon,
  CheckSquare,
  Sparkles,
  Settings,
} from "lucide-react";
import type { FormConfig } from "@/components/blocks/data-table/types/table";

import { useTranslations } from "next-intl";
export function useColumns(): ColumnDefinition[] {
  const tCommon = useTranslations("common");
  const tExtAdmin = useTranslations("ext_admin");
  return [
    {
      key: "compoundTitle",
      title: tExtAdmin("title_image"),
      type: "compound",
      disablePrefixSort: true,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("the_visual_representation_and_public_title"),
      priority: 1,
      render: {
        type: "compound",
        config: {
          image: {
            key: "image",
            title: tCommon("image"),
            type: "image",
            fallback: "/img/placeholder.svg",
            icon: ImageIcon,
            sortable: false,
            searchable: false,
            filterable: false,
            description: tExtAdmin("visual_icon_or_image_representing_this"),
          },
          primary: {
            key: "title",
            title: tCommon("title"),
            type: "text",
            sortable: true,
            searchable: true,
            filterable: true,
            description: tExtAdmin("public_facing_name_of_the_condition"),
          },
        },
      },
    },
    {
      key: "status",
      title: tCommon("status"),
      type: "toggle",
      icon: CheckSquare,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("whether_this_condition_is_currently_active"),
      priority: 1,
    },
    {
      key: "type",
      title: tCommon("type"),
      type: "select",
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("the_action_or_event_that_must"),
      options: [
        { value: "DEPOSIT", label: tCommon("deposit") },
        { value: "TRADE", label: tCommon("trade") },
        { value: "BINARY_WIN", label: tExtAdmin("binary_win") },
        { value: "INVESTMENT", label: tCommon("investment") },
        { value: "AI_INVESTMENT", label: tCommon("ai_investment") },
        { value: "FOREX_INVESTMENT", label: tCommon("forex_investment") },
        { value: "ICO_CONTRIBUTION", label: tCommon("ico_contribution") },
        { value: "STAKING", label: tCommon("staking") },
        { value: "ECOMMERCE_PURCHASE", label: tExtAdmin("ecommerce_purchase") },
        { value: "P2P_TRADE", label: tCommon("p2p_trade") },
      ],
      priority: 1,
      render: {
        type: "badge",
        config: {
          variant: (value) => {
            switch (value) {
              case "DEPOSIT":
              case "STAKING":
                return "success";
              case "INVESTMENT":
              case "AI_INVESTMENT":
              case "FOREX_INVESTMENT":
              case "P2P_TRADE":
                return "primary";
              case "TRADE":
              case "BINARY_WIN":
                return "warning";
              case "ECOMMERCE_PURCHASE":
                return "info";
              case "ICO_CONTRIBUTION":
                return "secondary";
              default:
                return "secondary";
            }
          },
          withDot: true,
        },
      },
    },
    {
      key: "rewardType",
      title: tCommon("reward_type"),
      type: "select",
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("how_the_reward_is_calculated_percentages"),
      options: [
        { value: "PERCENTAGE", label: tCommon("percentage") },
        { value: "FIXED", label: tExtAdmin("fixed") },
      ],
      priority: 1,
      render: {
        type: "badge",
        config: {
          variant: (value) => {
            switch (value) {
              case "PERCENTAGE":
                return "primary";
              case "FIXED":
                return "success";
              default:
                return "secondary";
            }
          },
          withDot: true,
        },
      },
    },
    {
      key: "reward",
      title: tCommon("reward"),
      type: "number",
      icon: DollarSign,
      sortable: true,
      searchable: false,
      filterable: true,
      description: tExtAdmin("the_reward_amount_given_to_the"),
      priority: 1,
    },
    {
      key: "rewardWalletType",
      title: tExtAdmin("reward_wallet"),
      type: "select",
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("the_wallet_type_where_rewards_will"),
      apiEndpoint: {
        url: "/api/admin/finance/wallet/options",
        method: "GET",
      },
      render: {
        type: "badge",
        config: {
          variant: (value) => {
            switch (value) {
              case "FIAT":
                return "success";
              case "SPOT":
                return "primary";
              case "ECO":
                return "warning";
              default:
                return "secondary";
            }
          },
          withDot: true,
        },
      },
      priority: 2,
      expandedOnly: true,
    },
    {
      key: "rewardCurrency",
      title: tExtAdmin("reward_currency"),
      type: "select",
      icon: DollarSign,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("the_specific_currency_or_token_in"),
      priority: 2,
      expandedOnly: true,
      dynamicSelect: {
        refreshOn: "rewardWalletType",
        endpointBuilder: (walletTypeValue: string | undefined) =>
          walletTypeValue
            ? {
                url: `/api/admin/finance/currency/options?type=${walletTypeValue}`,
                method: "GET",
              }
            : null,
        disableWhenEmpty: true,
      },
    },
    {
      key: "rewardChain",
      title: tExtAdmin("reward_chain"),
      type: "text",
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("the_blockchain_network_for_crypto_rewards"),
      priority: 3,
      expandedOnly: true,
    },
    {
      key: "description",
      title: tExtAdmin("brief_description"),
      type: "textarea",
      sortable: false,
      searchable: true,
      filterable: false,
      description: tExtAdmin("internal_notes_about_this_conditions_purpose"),
      priority: 4,
      expandedOnly: true,
    },
    {
      key: "id",
      title: tCommon("id"),
      type: "text",
      icon: Shield,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("unique_system_identifier_for_this_affiliate"),
      priority: 4,
      expandedOnly: true,
    },
  ];
}

export function useFormConfig(): FormConfig {
  const tCommon = useTranslations("common");
  const tDashboardAdmin = useTranslations("dashboard_admin");
  const tExtAdmin = useTranslations("ext_admin");
  return {
    create: {
      title: tExtAdmin("create_new_affiliate_condition"),
      description: tExtAdmin("set_up_a_new_affiliate_condition"),
      groups: [
        {
          id: "basic-info",
          title: tDashboardAdmin("basic_information"),
          icon: Sparkles,
          priority: 1,
          fields: [
            { key: "title", required: true, validation: (value) => {
              if (!value || value.trim().length === 0) return "Title cannot be empty";
              if (value.length > 191) return "Title must not exceed 191 characters";
              return null;
            }},
            { key: "image", required: false, validation: (value) => {
              if (value && value.length > 191) return "Image path must not exceed 191 characters";
              return null;
            }},
            { key: "type", required: true, options: [
              { value: "DEPOSIT", label: tCommon("deposit") },
              { value: "TRADE", label: tCommon("trade") },
              { value: "BINARY_WIN", label: tExtAdmin("binary_win") },
              { value: "INVESTMENT", label: tCommon("investment") },
              { value: "AI_INVESTMENT", label: tCommon("ai_investment") },
              { value: "FOREX_INVESTMENT", label: tCommon("forex_investment") },
              { value: "ICO_CONTRIBUTION", label: tCommon("ico_contribution") },
              { value: "STAKING", label: tCommon("staking") },
              { value: "ECOMMERCE_PURCHASE", label: tExtAdmin("ecommerce_purchase") },
              { value: "P2P_TRADE", label: tCommon("p2p_trade") },
            ]},
            { key: "description", required: true, validation: (value) => {
              if (!value || value.trim().length === 0) return "Description cannot be empty";
              if (value.length > 191) return "Description must not exceed 191 characters";
              return null;
            }},
          ],
        },
        {
          id: "reward-details",
          title: tExtAdmin("reward_configuration"),
          icon: DollarSign,
          priority: 2,
          fields: [
            { key: "rewardWalletType", required: true, apiEndpoint: {
              url: "/api/admin/finance/wallet/options",
              method: "GET",
            }},
            { key: "rewardCurrency", required: true, validation: (value) => {
              if (!value || value.trim().length === 0) return "Reward currency cannot be empty";
              if (value.length > 191) return "Reward currency must not exceed 191 characters";
              return null;
            }},
            { key: "rewardChain", required: false, validation: (value) => {
              if (value && value.length > 191) return "Reward chain must not exceed 191 characters";
              return null;
            }},
            { key: "rewardType", required: true, options: [
              { value: "PERCENTAGE", label: tCommon("percentage") },
              { value: "FIXED", label: tExtAdmin("fixed") },
            ]},
            { key: "reward", required: true, min: 0 },
          ],
        },
        {
          id: "settings",
          title: tCommon("settings"),
          icon: Settings,
          priority: 3,
          fields: [{ key: "status" }],
        },
      ],
    },
    edit: {
      title: tExtAdmin("edit_affiliate_condition"),
      description: tExtAdmin("modify_the_affiliate_condition_settings_reward"),
      groups: [
        {
          id: "basic-info",
          title: tDashboardAdmin("basic_information"),
          icon: Sparkles,
          priority: 1,
          fields: [
            { key: "title", required: true, validation: (value) => {
              if (!value || value.trim().length === 0) return "Title cannot be empty";
              if (value.length > 191) return "Title must not exceed 191 characters";
              return null;
            }},
            { key: "image", required: false, validation: (value) => {
              if (value && value.length > 191) return "Image path must not exceed 191 characters";
              return null;
            }},
            { key: "type", required: true, options: [
              { value: "DEPOSIT", label: tCommon("deposit") },
              { value: "TRADE", label: tCommon("trade") },
              { value: "BINARY_WIN", label: tExtAdmin("binary_win") },
              { value: "INVESTMENT", label: tCommon("investment") },
              { value: "AI_INVESTMENT", label: tCommon("ai_investment") },
              { value: "FOREX_INVESTMENT", label: tCommon("forex_investment") },
              { value: "ICO_CONTRIBUTION", label: tCommon("ico_contribution") },
              { value: "STAKING", label: tCommon("staking") },
              { value: "ECOMMERCE_PURCHASE", label: tExtAdmin("ecommerce_purchase") },
              { value: "P2P_TRADE", label: tCommon("p2p_trade") },
            ]},
            { key: "description", required: true, validation: (value) => {
              if (!value || value.trim().length === 0) return "Description cannot be empty";
              if (value.length > 191) return "Description must not exceed 191 characters";
              return null;
            }},
          ],
        },
        {
          id: "reward-details",
          title: tExtAdmin("reward_configuration"),
          icon: DollarSign,
          priority: 2,
          fields: [
            { key: "rewardWalletType", required: true, apiEndpoint: {
              url: "/api/admin/finance/wallet/options",
              method: "GET",
            }},
            { key: "rewardCurrency", required: true, validation: (value) => {
              if (!value || value.trim().length === 0) return "Reward currency cannot be empty";
              if (value.length > 191) return "Reward currency must not exceed 191 characters";
              return null;
            }},
            { key: "rewardChain", required: false, validation: (value) => {
              if (value && value.length > 191) return "Reward chain must not exceed 191 characters";
              return null;
            }},
            { key: "rewardType", required: true, options: [
              { value: "PERCENTAGE", label: tCommon("percentage") },
              { value: "FIXED", label: tExtAdmin("fixed") },
            ]},
            { key: "reward", required: true, min: 0 },
          ],
        },
        {
          id: "settings",
          title: tCommon("settings"),
          icon: Settings,
          priority: 3,
          fields: [{ key: "status" }],
        },
      ],
    },
  };
}
