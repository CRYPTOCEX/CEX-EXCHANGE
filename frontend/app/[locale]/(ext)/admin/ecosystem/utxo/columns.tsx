"use client";
import { Badge } from "@/components/ui/badge";
import { Shield, ClipboardList, DollarSign, CalendarIcon, Wallet, Database, FileCode, CheckCircle } from "lucide-react";
import { useTranslations } from "next-intl";
export function useColumns(): ColumnDefinition[] {
  const tCommon = useTranslations("common");
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
      description: tExtAdmin("unique_utxo_unspent_transaction_output_identifier"),
      priority: 3,
      expandedOnly: true,
    },
    {
      key: "wallet",
      idKey: "walletId",
      sortKey: "walletId",
      title: tCommon("wallet"),
      type: "text",
      icon: Wallet,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("associated_wallet_containing_this_unspent_output"),
      priority: 1,
      render: {
        type: "custom",
        render: (value) => value?.currency || 'N/A',
      },
    },
    {
      key: "amount",
      title: tCommon("amount"),
      type: "number",
      icon: DollarSign,
      sortable: true,
      searchable: false,
      filterable: true,
      description: tExtAdmin("unspent_cryptocurrency_amount_available_in_this"),
      priority: 1,
      render: {
        type: "custom",
        render: (value) => typeof value === 'number' ? value.toFixed(8) : value,
      },
    },
    {
      key: "status",
      title: tCommon("status"),
      type: "boolean",
      icon: CheckCircle,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("utxo_availability_status_true_available_for"),
      priority: 1,
      render: {
        type: "badge",
        config: {
          variant: (value: boolean) => value ? "success" : "secondary",
          label: (value: boolean) => value ? "Available" : "Spent",
        },
      },
    },
    {
      key: "index",
      title: tExtAdmin("index"),
      type: "number",
      icon: Database,
      sortable: true,
      searchable: false,
      filterable: true,
      description: tExtAdmin("transaction_output_index_position_used_to"),
      priority: 2,
      expandedOnly: true,
    },
    {
      key: "script",
      title: tExtAdmin("script"),
      type: "text",
      icon: FileCode,
      sortable: false,
      searchable: true,
      filterable: false,
      description: tExtAdmin("locking_script_scriptpubkey_defining_spending_cond"),
      priority: 3,
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
      description: tExtAdmin("timestamp_when_this_utxo_was_created"),
      render: { type: "date", format: "PPP" },
      priority: 3,
      expandedOnly: true,
    },
  ];
}
