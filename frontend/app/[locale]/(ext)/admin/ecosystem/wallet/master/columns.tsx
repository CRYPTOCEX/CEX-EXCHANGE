"use client";
import { Shield, ClipboardList, DollarSign, Wallet, Network, Database } from "lucide-react";
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
      description: tExtAdmin("unique_master_wallet_identifier_in_the_ecosystem"),
      priority: 3,
      expandedOnly: true,
    },
    {
      key: "chain",
      title: tExt("chain"),
      type: "select",
      icon: Network,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("blockchain_network_this_master_wallet_operates"),
      priority: 1,
      options: [], // Initialize with empty array
      apiEndpoint: {
        method: "GET",
        url: "/api/admin/ecosystem/wallet/master/options",
      },
      render: {
        type: "custom",
        render: (item: any) => {
          // Handle undefined/null values gracefully
          const chainValue = item || "unknown";
          return (
            <div className="flex items-center gap-4">
              <img
                src={`/img/crypto/${chainValue.toLowerCase()}.webp`}
                alt={`${chainValue} logo`}
                className="w-10 h-10 rounded-full"
                onError={(e) => {
                  // Prevent infinite loops by checking if we already tried fallback
                  const target = e.target as HTMLImageElement;
                  if (!target.dataset.fallbackAttempted) {
                    target.dataset.fallbackAttempted = 'true';
                    // Use a data URI as fallback to prevent further errors
                    target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiNGM0Y0RjYiLz4KPHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4PSI4IiB5PSI4Ij4KPGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMTAiIHN0cm9rZT0iIzY5NzA3QiIgc3Ryb2tlLXdpZHRoPSIyIi8+CjxwYXRoIGQ9Im0xNSA5LTYgNiIgc3Ryb2tlPSIjNjk3MDdCIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8cGF0aCBkPSJtOSA5IDYgNiIgc3Ryb2tlPSIjNjk3MDdCIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8L3N2Zz4KPC9zdmc+';
                  }
                }}
              />
              <span className="capitalize">{chainValue}</span>
            </div>
          );
        },
      },
    },
    {
      key: "currency",
      title: tCommon("currency"),
      type: "text",
      icon: DollarSign,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("native_cryptocurrency_symbol_for_this_blockchain"),
      priority: 1,
    },
    {
      key: "address",
      title: tCommon("address"),
      type: "text",
      icon: ClipboardList,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("master_wallet_blockchain_address_used_as"),
      priority: 1,
    },
    {
      key: "balance",
      title: tCommon("balance"),
      type: "number",
      icon: DollarSign,
      sortable: true,
      searchable: false,
      filterable: true,
      description: tExtAdmin("total_cryptocurrency_balance_held_in_this"),
      priority: 1,
      render: {
        type: "custom",
        render: (value: any) => {
          // Format balance to 8 decimal places
          const formattedBalance = value ? parseFloat(value).toFixed(8) : "0.00000000";
          return (
            <span className="font-mono">
              {formattedBalance}
            </span>
          );
        },
      },
    },
    {
      key: "lastIndex",
      title: tExtAdmin("last_index"),
      type: "number",
      icon: Database,
      sortable: true,
      searchable: false,
      filterable: true,
      description: tExtAdmin("last_derivation_index_used_for_generating"),
      priority: 2,
      expandedOnly: true,
    },
  ];
}

export function useFormConfig(): FormConfig {
  const tCommon = useTranslations("common");
  const tExtAdmin = useTranslations("ext_admin");
  return {
    create: {
      title: tExtAdmin("create_new_master_wallet"),
      description: tExtAdmin("add_a_new_master_wallet_for"),
      groups: [
        {
          id: "wallet-chain",
          title: tExtAdmin("blockchain_selection"),
          icon: Network,
          priority: 1,
          fields: [
            {
              key: "chain",
              required: true,
              maxLength: 255,
              options: [],
              apiEndpoint: {
                method: "GET",
                url: "/api/admin/ecosystem/wallet/master/options",
              },
            },
          ],
        },
        {
          id: "wallet-info",
          title: tCommon("wallet_information"),
          icon: Wallet,
          priority: 2,
          fields: [
            {
              key: "currency",
              required: true,
              maxLength: 255,
            },
            {
              key: "address",
              required: true,
              maxLength: 255,
            },
          ],
        },
        {
          id: "wallet-config",
          title: tExtAdmin("wallet_configuration"),
          icon: Database,
          priority: 3,
          fields: [
            {
              key: "balance",
              required: true,
              min: 0,
            },
            {
              key: "lastIndex",
              required: true,
              min: 0,
            },
            {
              key: "status",
              required: true,
            },
          ],
        },
      ],
    },
    edit: {
      title: tExtAdmin("edit_master_wallet"),
      description: tExtAdmin("update_master_wallet_balance_and_operational"),
      groups: [
        {
          id: "wallet-config",
          title: tExtAdmin("wallet_configuration"),
          icon: Database,
          priority: 1,
          fields: [
            {
              key: "balance",
              required: true,
              min: 0,
            },
            {
              key: "status",
              required: true,
            },
          ],
        },
      ],
    },
  };
}
