"use client";
import { Shield, ClipboardList, DollarSign, User, Key, Mail, Settings } from "lucide-react";
import type { FormConfig } from "@/components/blocks/data-table/types/table";

import { useTranslations } from "next-intl";
// Column definitions for table display only
export function useColumns() {
  const t = useTranslations("ext_admin");
  const tCommon = useTranslations("common");
  return [
    {
      key: "id",
      title: tCommon("id"),
      type: "text",
      icon: Shield,
      sortable: true,
      searchable: true,
      filterable: true,
      description: t("unique_system_identifier_for_the_forex"),
      priority: 3,
      expandedOnly: true,
    },
    {
      key: "user",
      title: tCommon("user"),
      type: "compound",
      icon: User,
      sortable: true,
      searchable: true,
      filterable: true,
      description: t("account_owner_information_including_name_email"),
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
            icon: Mail,
          },
        },
      },
      priority: 1,
    },
    {
      key: "userId",
      title: tCommon("user"),
      type: "select",
      icon: User,
      sortable: false,
      searchable: false,
      filterable: false,
      description: t("select_the_account_owner_from_registered_users"),
      priority: 1,
      expandedOnly: true,
    },
    {
      key: "accountId",
      title: tCommon("account_id"),
      type: "text",
      icon: ClipboardList,
      sortable: true,
      searchable: true,
      filterable: true,
      description: t("unique_trading_account_number_provided_by"),
      priority: 1,
    },
    {
      key: "broker",
      title: t("broker"),
      type: "text",
      icon: ClipboardList,
      sortable: true,
      searchable: true,
      filterable: true,
      description: t("name_of_the_forex_broker_managing"),
      priority: 1,
    },
    {
      key: "type",
      title: tCommon("type"),
      type: "select",
      icon: ClipboardList,
      sortable: true,
      searchable: true,
      filterable: true,
      description: t("account_type_demo_for_practice_trading"),
      options: [
        { value: "DEMO", label: tCommon("demo") },
        { value: "LIVE", label: tCommon("live") },
      ],
      priority: 1,
      render: {
        type: "badge",
        config: {
          variant: (value: any) => {
            switch (value) {
              case "DEMO":
                return "warning";
              case "LIVE":
                return "success";
              default:
                return "secondary";
            }
          },
        },
      },
    },
    {
      key: "balance",
      title: tCommon("balance"),
      type: "number",
      icon: DollarSign,
      sortable: true,
      searchable: false,
      filterable: true,
      description: t("current_account_balance_available_for_trading"),
      priority: 1,
    },
    {
      key: "mt",
      title: t("mt_version"),
      type: "select",
      icon: Key,
      sortable: true,
      searchable: false,
      filterable: true,
      description: t("metatrader_platform_version_mt4_or_mt5"),
      priority: 2,
      expandedOnly: true,
      options: [
        { value: "4", label: t("mt4") },
        { value: "5", label: t("mt5") },
      ],
    },
    {
      key: "leverage",
      title: tCommon("leverage"),
      type: "number",
      icon: DollarSign,
      sortable: true,
      searchable: false,
      filterable: true,
      description: t("trading_leverage_ratio_e_g_1"),
      priority: 2,
      expandedOnly: true,
    },
    {
      key: "status",
      title: tCommon("status"),
      type: "toggle",
      icon: Shield,
      sortable: true,
      searchable: true,
      filterable: true,
      description: t("account_active_status_enabled_accounts_can"),
      priority: 1,
    },
  ] as ColumnDefinition[];
}

// Form configuration - defines create/edit form structure
export function useFormConfig() {
  const t = useTranslations("ext_admin");
  const tCommon = useTranslations("common");
  return {
    create: {
      title: t("create_new_forex_account"),
      description: t("set_up_a_new_forex_trading"),
      groups: [
        {
          id: "account-owner",
          title: t("account_owner"),
          icon: User,
          priority: 1,
          fields: [
            {
              key: "userId",
              required: true,
              apiEndpoint: {
                url: "/api/admin/crm/user/options",
                method: "GET",
              },
            },
          ],
        },
        {
          id: "broker-details",
          title: t("broker_platform"),
          icon: ClipboardList,
          priority: 2,
          fields: [
            { key: "accountId", required: false },
            { key: "broker", required: false },
            {
              key: "mt",
              required: false,
              options: [
                { value: "4", label: t("mt4") },
                { value: "5", label: t("mt5") },
              ],
            },
            {
              key: "type",
              required: true,
              options: [
                { value: "DEMO", label: tCommon("demo") },
                { value: "LIVE", label: tCommon("live") },
              ],
            },
          ],
        },
        {
          id: "trading-settings",
          title: t("trading_settings"),
          icon: DollarSign,
          priority: 3,
          fields: [
            { key: "balance", required: false, min: 0 },
            { key: "leverage", required: false, min: 0 },
          ],
        },
        {
          id: "settings",
          title: t("account_settings"),
          icon: Settings,
          priority: 4,
          fields: [{ key: "status" }],
        },
      ],
    },
    edit: {
      title: t("edit_forex_account"),
      description: t("update_forex_trading_account_settings_broker"),
      groups: [
        {
          id: "broker-details",
          title: t("broker_platform"),
          icon: ClipboardList,
          priority: 1,
          fields: [
            { key: "accountId", required: false },
            { key: "broker", required: false },
            {
              key: "mt",
              required: false,
              options: [
                { value: "4", label: t("mt4") },
                { value: "5", label: t("mt5") },
              ],
            },
            {
              key: "type",
              required: true,
              options: [
                { value: "DEMO", label: tCommon("demo") },
                { value: "LIVE", label: tCommon("live") },
              ],
            },
          ],
        },
        {
          id: "trading-settings",
          title: t("trading_settings"),
          icon: DollarSign,
          priority: 2,
          fields: [
            { key: "balance", required: false, min: 0 },
            { key: "leverage", required: false, min: 0 },
          ],
        },
        {
          id: "settings",
          title: t("account_settings"),
          icon: Settings,
          priority: 3,
          fields: [{ key: "status" }],
        },
      ],
    },
  } as FormConfig;
}
