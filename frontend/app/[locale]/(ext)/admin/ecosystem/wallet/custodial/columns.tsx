"use client";
import { Shield, ClipboardList, CalendarIcon, Wallet, Settings, Network } from "lucide-react";
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
      description: tExtAdmin("unique_custodial_wallet_identifier_in_the"),
      priority: 3,
      expandedOnly: true,
    },
    {
      key: "address",
      title: tCommon("address"),
      type: "text",
      icon: ClipboardList,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("blockchain_address_for_receiving_and_sending"),
      priority: 1,
    },
    {
      key: "chain",
      title: tExt("chain"),
      type: "text",
      icon: Network,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("blockchain_network_this_wallet_operates_on"),
      priority: 1,
      render: {
        type: "custom",
        render: (item: any) => {
          return (
            <div className="flex items-center gap-4">
              <img
                src={`/img/crypto/${(item || "generic").toLowerCase()}.webp`}
                alt={`${item || "generic"} logo`}
                className="w-10 h-10 rounded-full"
              />
              <span>{item}</span>
            </div>
          );
        },
      },
    },
    {
      key: "network",
      title: tExtAdmin("network_auto_filled_if_needed"),
      type: "text",
      icon: ClipboardList,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("network_environment_mainnet_for_production_or"),
      priority: 2,
      expandedOnly: true,
    },
    {
      key: "status",
      title: tCommon("status"),
      type: "select",
      icon: Settings,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("custodial_wallet_operational_status_active_operati"),
      options: [
        { value: "ACTIVE", label: tCommon("active") },
        { value: "INACTIVE", label: tCommon("inactive") },
        { value: "SUSPENDED", label: tCommon("suspended") },
      ],
      priority: 1,
      render: {
        type: "badge",
        config: {
          variant(value: string) {
            switch (value) {
              case "ACTIVE":
                return "success";
              case "INACTIVE":
                return "secondary";
              case "SUSPENDED":
                return "destructive";
              default:
                return "default";
            }
          },
        },
      },
    },
    {
      key: "masterWalletId",
      title: tExtAdmin("master_wallet"),
      type: "select",
      icon: Wallet,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("parent_master_wallet_this_custodial_wallet"),
      priority: 2,
      expandedOnly: true,
      apiEndpoint: {
        method: "GET",
        url: "/api/admin/ecosystem/wallet/custodial/options",
      },
    },
    {
      key: "createdAt",
      title: tCommon("created_at"),
      type: "date",
      icon: CalendarIcon,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("date_and_time_when_this_custodial"),
      render: { type: "date", format: "PPP" },
      priority: 3,
      expandedOnly: true,
    },
  ];
}

export function useFormConfig(): FormConfig {
  const tCommon = useTranslations("common");
  const tExtAdmin = useTranslations("ext_admin");
  return {
    create: {
      title: tExtAdmin("create_new_custodial_wallet"),
      description: tExtAdmin("generate_a_new_custodial_wallet_derived"),
      groups: [
        {
          id: "wallet-selection",
          title: tExtAdmin("master_wallet_selection"),
          icon: Wallet,
          priority: 1,
          fields: [
            {
              key: "masterWalletId",
              required: true,
              apiEndpoint: {
                method: "GET",
                url: "/api/admin/ecosystem/wallet/custodial/options",
              },
            },
          ],
        },
        {
          id: "blockchain-info",
          title: tExtAdmin("blockchain_information"),
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
              key: "address",
              required: true,
              maxLength: 255,
            },
          ],
        },
        {
          id: "status",
          title: tCommon("wallet_status"),
          icon: Settings,
          priority: 3,
          fields: [
            {
              key: "status",
              required: true,
              options: [
                { value: "ACTIVE", label: tCommon("active") },
                { value: "INACTIVE", label: tCommon("inactive") },
                { value: "SUSPENDED", label: tCommon("suspended") },
              ],
            },
          ],
        },
      ],
    },
    edit: {
      title: tExtAdmin("edit_custodial_wallet"),
      description: tExtAdmin("modify_custodial_wallet_operational_status_active"),
      groups: [
        {
          id: "status",
          title: tCommon("wallet_status"),
          icon: Settings,
          priority: 1,
          fields: [
            {
              key: "status",
              required: true,
              options: [
                { value: "ACTIVE", label: tCommon("active") },
                { value: "INACTIVE", label: tCommon("inactive") },
                { value: "SUSPENDED", label: tCommon("suspended") },
              ],
            },
          ],
        },
      ],
    },
  };
}
