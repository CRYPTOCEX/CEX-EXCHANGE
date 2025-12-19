"use client";
import {
  Shield,
  ClipboardList,
  DollarSign,
  CheckSquare,
  CalendarIcon,
  Image as ImageIcon,
  Settings,
  Network,
  FileCode,
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
      title: tCommon("id"),
      type: "text",
      icon: Shield,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("unique_token_identifier_in_the_ecosystem_database"),
      priority: 3,
      expandedOnly: true,
    },
    {
      key: "token",
      disablePrefixSort: true,
      title: tExtAdmin("token"),
      expandedTitle: (row) => `Token: ${row.id}`,
      type: "compound",
      sortable: true,
      searchable: true,
      filterable: true,
      priority: 1,
      icon: ClipboardList,
      render: {
        type: "compound",
        config: {
          image: {
            key: "image",
            type: "image",
            fallback: (row) =>
              row.currency
                ? `/img/crypto/${row.currency.toLowerCase()}.webp`
                : "/img/placeholder.svg",
            title: tExt("logo"),
            description: tExtAdmin("token_logo_image_displayed_in_ui"),
            filterable: false,
            sortable: false,
          },
          primary: {
            key: "name",
            title: tCommon("name"),
            description: tExtAdmin("full_token_name_e_g_bitcoin_ethereum"),
            sortable: true,
            sortKey: "name",
            icon: ClipboardList,
            validation: (value: string) => {
              if (!value) return "Name is required";
              if (value.length < 2)
                return "Name must be at least 2 characters long";
              return null;
            },
          },
          secondary: {
            key: "currency",
            icon: DollarSign,
            type: "text",
            title: tCommon("currency"),
            description: tExtAdmin("token_symbol_or_ticker_e_g_btc_eth_usdt"),
            sortable: true,
          },
        },
      },
    },
    {
      key: "chain",
      title: tExt("chain"),
      type: "text",
      icon: Network,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("blockchain_network_hosting_this_token"),
      priority: 1,
    },
    {
      key: "network",
      title: tExtAdmin("network_auto_filled_if_needed"),
      type: "text",
      icon: ClipboardList,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("network_environment_type_must_match_environment"),
      priority: 1,
      validation: (value: string) => {
        if (!value) return "Network is required";
        const validNetworks = ["mainnet", "testnet", "sepolia", "goerli", "matic-mumbai", "matic"];
        if (!validNetworks.includes(value.toLowerCase())) {
          return "Network should be one of: mainnet, testnet, sepolia, goerli, matic-mumbai, matic";
        }
        return null;
      },
    },
    {
      key: "contract",
      title: tExtAdmin("contract"),
      type: "text",
      icon: FileCode,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("smart_contract_address_on_the_blockchain"),
      priority: 2,
      expandedOnly: true,
    },
    {
      key: "contractType",
      title: tExtAdmin("contract_type"),
      type: "select",
      icon: Settings,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("token_standard_implementation_permit_eip_2612"),
      options: [
        { value: "PERMIT", label: tExtAdmin("permit") },
        { value: "NO_PERMIT", label: tExtAdmin("no_permit") },
        { value: "NATIVE", label: tExtAdmin("native") },
      ],
      priority: 2,
      expandedOnly: true,
      render: {
        type: "badge",
        config: {
          variant: (value: string) => {
            switch (value) {
              case "PERMIT":
                return "success";
              case "NATIVE":
                return "warning";
              default:
                return "secondary";
            }
          },
        },
      },
    },
    {
      key: "decimals",
      title: tExtAdmin("decimals"),
      type: "number",
      icon: ClipboardList,
      sortable: true,
      searchable: false,
      filterable: true,
      description: tExtAdmin("number_of_decimal_places_for_token"),
      priority: 2,
      expandedOnly: true,
    },
    {
      key: "status",
      title: tCommon("status"),
      type: "toggle",
      icon: CheckSquare,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("token_status_in_the_ecosystem_enabled"),
      priority: 1,
    },
    {
      key: "createdAt",
      title: tCommon("created_at"),
      type: "date",
      icon: CalendarIcon,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("date_and_time_when_the_token"),
      render: { type: "date", format: "PPP" },
      priority: 3,
      expandedOnly: true,
    },
  ];
}

export function useFormConfig(): FormConfig {
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  const tExtAdmin = useTranslations("ext_admin");
  return {
    create: {
      title: tCommon("create_new_token"),
      description: tExtAdmin("add_a_new_ecosystem_token_with"),
      groups: [
        {
          id: "token-info",
          title: tExt("token_information"),
          icon: ClipboardList,
          priority: 1,
          fields: [
            {
              key: "image",
              fallback: (row) =>
                row?.currency
                  ? `/img/crypto/${row.currency.toLowerCase()}.webp`
                  : "/img/placeholder.svg",
            },
            {
              key: "name",
              required: true,
              maxLength: 255,
              validation: (value: string) => {
                if (!value) return "Name is required";
                if (value.length < 2)
                  return "Name must be at least 2 characters long";
                if (value.length > 255)
                  return "Name must not exceed 255 characters";
                return null;
              },
            },
            {
              key: "currency",
              required: true,
              maxLength: 255,
            },
          ],
        },
        {
          id: "blockchain-config",
          title: tExtAdmin("blockchain_configuration"),
          icon: Network,
          priority: 2,
          fields: [
            {
              key: "chain",
              required: true,
              maxLength: 255,
            },
            {
              key: "network",
              required: true,
              maxLength: 255,
            },
            {
              key: "contract",
              required: true,
              maxLength: 255,
            },
            {
              key: "contractType",
              required: true,
              options: [
                { value: "PERMIT", label: tExtAdmin("permit") },
                { value: "NO_PERMIT", label: tExtAdmin("no_permit") },
                { value: "NATIVE", label: tExtAdmin("native") },
              ],
            },
            {
              key: "decimals",
              required: true,
              min: 0,
            },
          ],
        },
        {
          id: "advanced-config",
          title: tExtAdmin("advanced_configuration"),
          icon: Settings,
          priority: 3,
          fields: [
            {
              key: "precision",
              required: false,
              min: 0,
            },
            {
              key: "icon",
              required: false,
              maxLength: 1000,
            },
          ],
        },
        {
          id: "status",
          title: tCommon("status"),
          icon: CheckSquare,
          priority: 4,
          fields: [{
            key: "status",
            required: true,
          }],
        },
      ],
    },
    edit: {
      title: tExtAdmin("edit_token"),
      description: tExtAdmin("update_token_logo_and_operational_status"),
      groups: [
        {
          id: "token-info",
          title: tExt("token_information"),
          icon: ImageIcon,
          priority: 1,
          fields: [
            {
              key: "image",
              fallback: (row) =>
                row?.currency
                  ? `/img/crypto/${row.currency.toLowerCase()}.webp`
                  : "/img/placeholder.svg",
            },
          ],
        },
        {
          id: "status",
          title: tCommon("status"),
          icon: CheckSquare,
          priority: 2,
          fields: [{
            key: "status",
            required: true,
          }],
        },
      ],
    },
  };
}
