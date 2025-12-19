"use client";
import { Shield, ClipboardList, DollarSign, CalendarIcon, Network, Database } from "lucide-react";
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
      description: tExtAdmin("unique_ledger_entry_identifier_for_tracking"),
      priority: 3,
      expandedOnly: true
    },
    {
      key: "currency",
      title: tCommon("currency"),
      type: "text",
      icon: DollarSign,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("cryptocurrency_symbol_e_g_btc_eth"),
      priority: 1
    },
    {
      key: "chain",
      title: tExt("chain"),
      type: "text",
      icon: Network,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("blockchain_network_where_this_asset_exists"),
      priority: 1
    },
    {
      key: "network",
      title: tExtAdmin("network_auto_filled_if_needed"),
      type: "text",
      icon: ClipboardList,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("network_environment_type_mainnet_for_production"),
      priority: 2,
      expandedOnly: true
    },
    {
      key: "index",
      title: tExtAdmin("index"),
      type: "number",
      icon: Database,
      sortable: true,
      searchable: false,
      filterable: true,
      description: tExtAdmin("sequential_ledger_entry_number_for_ordering"),
      priority: 2,
      expandedOnly: true
    },
    {
      key: "offchainDifference",
      title: tExtAdmin("offchain_diff"),
      type: "number",
      icon: DollarSign,
      sortable: true,
      searchable: false,
      filterable: true,
      description: tExtAdmin("balance_difference_between_on_chain_and"),
      priority: 2,
      expandedOnly: true
    },
    {
      key: "walletId",
      title: tCommon("wallet_id"),
      type: "text",
      icon: ClipboardList,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("associated_custodial_or_master_wallet_identifier"),
      priority: 3,
      expandedOnly: true
    },
    {
      key: "createdAt",
      title: tCommon("created_at"),
      type: "date",
      icon: CalendarIcon,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("timestamp_when_this_ledger_entry_was"),
      render: { type: "date", format: "PPP" },
      priority: 3,
      expandedOnly: true
    },
  ];
}

export function useFormConfig(): FormConfig {
  const tExtAdmin = useTranslations("ext_admin");
  return {
    edit: {
      groups: [
        {
          id: "ledger-adjustment",
          title: tExtAdmin("ledger_adjustment"),
          icon: DollarSign,
          priority: 1,
          fields: [
            { key: "offchainDifference" },
          ]
        },
      ]
    }
  };
}
