"use client";
import React from "react";
import { CalendarIcon, Key as KeyIcon, Shield, User, Lock } from "lucide-react";
import { format } from "date-fns";
import { TagsCell } from "@/components/blocks/data-table/content/rows/cells/tags";
import type { FormConfig } from "@/components/blocks/data-table/types/table";

import { useTranslations } from "next-intl";
export function useColumns() {
  const t = useTranslations("dashboard_admin");
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
      description: t("unique_identifier_for_the_api_key"),
      priority: 1,
    },
    {
      key: "user",
      title: tCommon("user"),
      expandedTitle: (row) => `User: ${row.id}`,
      type: "compound",
      icon: User,
      sortable: true,
      searchable: true,
      filterable: true,
      description: t("the_user_associated_with_the_api_key"),
      priority: 1,
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
            icon: KeyIcon,
          },
        },
      },
    },
    {
      key: "name",
      title: tCommon("name"),
      type: "text",
      icon: Shield,
      sortable: true,
      searchable: true,
      filterable: true,
      description: t("the_name_of_the_api_key"),
      priority: 1,
    },
    {
      key: "key",
      title: t("key"),
      type: "text",
      icon: KeyIcon,
      sortable: true,
      searchable: true,
      filterable: false,
      description: t("the_api_key_string"),
      priority: 2,
      expandedOnly: true,
    },
    {
      key: "permissions",
      title: tCommon("permissions"),
      type: "multiselect",
      icon: Shield,
      sortable: false,
      searchable: false,
      filterable: false,
      description: t("list_of_permissions_for_this_api_key"),
      options: [
        { value: "trade", label: tCommon("trade") },
        { value: "futures", label: tCommon("futures") },
        { value: "deposit", label: tCommon("deposit") },
        { value: "withdraw", label: tCommon("withdraw") },
        { value: "transfer", label: tCommon("transfer") },
        { value: "payment", label: t("payment_intent") },
      ],
      render: {
        type: "custom",
        render: (value: any, row: any) => {
          let perms = [];
          try {
            perms = typeof value === "string" ? JSON.parse(value) : value;
          } catch (err) {
            return <span className="text-red-500">{tCommon("invalid_json")}</span>;
          }
          return <TagsCell value={perms} row={row} maxDisplay={3} />;
        },
      },
    },
    {
      key: "ipRestriction",
      title: t("ip_restriction"),
      type: "boolean",
      icon: Shield,
      sortable: true,
      searchable: true,
      filterable: true,
      description: t("whether_ip_restriction_is_enabled"),
      priority: 1,
    },
    {
      key: "ipWhitelist",
      title: t("ip_whitelist"),
      type: "tags",
      icon: Shield,
      sortable: false,
      searchable: false,
      filterable: false,
      description: t("whitelisted_ip_addresses"),
      expandedOnly: true,
      condition: (values) => values.ipRestriction === true,
    },
    {
      key: "createdAt",
      title: tCommon("created_at"),
      type: "date",
      icon: CalendarIcon,
      sortable: true,
      searchable: true,
      filterable: true,
      description: t("date_when_the_api_key_was_created"),
      render: {
        type: "date",
        format: "PPP",
      },
      priority: 2,
      expandedOnly: true,
    },
  ];
}

export function useFormConfig(): FormConfig {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  return {
    create: {
      title: tCommon("create_new_api_key"),
      description: t("generate_a_new_api_key_with"),
      groups: [
        {
          id: "basic-info",
          title: t("basic_information"),
          icon: Shield,
          priority: 1,
          fields: [
            { key: "name", required: true, maxLength: 255 },
            { key: "key", required: true, maxLength: 255 },
          ],
        },
        {
          id: "permissions",
          title: tCommon("permissions"),
          icon: Lock,
          priority: 2,
          fields: [
            {
              key: "permissions",
              required: true,
              options: [
                { value: "trade", label: tCommon("trade") },
                { value: "futures", label: tCommon("futures") },
                { value: "deposit", label: tCommon("deposit") },
                { value: "withdraw", label: tCommon("withdraw") },
                { value: "transfer", label: tCommon("transfer") },
                { value: "payment", label: t("payment_intent") },
              ],
            },
          ],
        },
        {
          id: "security",
          title: tCommon("security_settings"),
          icon: Shield,
          priority: 3,
          fields: [
            { key: "ipRestriction" },
            { key: "ipWhitelist", condition: (values) => values.ipRestriction === true },
          ],
        },
      ],
    },
    edit: {
      title: tCommon("edit_api_key"),
      description: t("update_api_key_settings_and_permissions"),
      groups: [
        {
          id: "basic-info",
          title: t("basic_information"),
          icon: Shield,
          priority: 1,
          fields: [
            { key: "name", required: true, maxLength: 255 },
            { key: "key", required: true, maxLength: 255 },
          ],
        },
        {
          id: "permissions",
          title: tCommon("permissions"),
          icon: Lock,
          priority: 2,
          fields: [
            {
              key: "permissions",
              required: true,
              options: [
                { value: "trade", label: tCommon("trade") },
                { value: "futures", label: tCommon("futures") },
                { value: "deposit", label: tCommon("deposit") },
                { value: "withdraw", label: tCommon("withdraw") },
                { value: "transfer", label: tCommon("transfer") },
                { value: "payment", label: t("payment_intent") },
              ],
            },
          ],
        },
        {
          id: "security",
          title: tCommon("security_settings"),
          icon: Shield,
          priority: 3,
          fields: [
            { key: "ipRestriction" },
            { key: "ipWhitelist", condition: (values) => values.ipRestriction === true },
          ],
        },
      ],
    },
  };
}
