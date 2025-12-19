"use client";

import {
  Shield,
  ClipboardList,
  DollarSign,
  ImageIcon,
  CheckSquare,
  PercentIcon,
  CreditCard,
  Clock,
} from "lucide-react";
import type { FormConfig } from "@/components/blocks/data-table/types/table";

import { useTranslations } from "next-intl";
export function useColumns(): ColumnDefinition[] {
  const tCommon = useTranslations("common");
  const tDashboardAdmin = useTranslations("dashboard_admin");
  return [
    {
      key: "id",
      title: tCommon("id"),
      type: "text",
      icon: Shield,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tDashboardAdmin("unique_identifier_for_the_deposit_method"),
      priority: 3,
      expandedOnly: true,
    },
    {
      key: "depositCompound",
      title: tCommon("method"),
      type: "compound",
      disablePrefixSort: true,
      sortable: true,
      searchable: true,
      filterable: true,
      priority: 1,
      icon: CreditCard,
      render: {
        type: "compound",
        config: {
          image: {
            key: "image",
            fallback: "/img/placeholder.svg",
            type: "image",
            title: tCommon("image"),
            description: tDashboardAdmin("method_image_url"),
            filterable: false,
            sortable: false,
          },
          primary: {
            key: "title",
            title: tCommon("title"),
            description: tCommon("display_title"),
            sortable: true,
            sortKey: "title",
          },
        },
      },
    },
    {
      key: "instructions",
      title: tCommon("instructions"),
      type: "text",
      icon: ClipboardList,
      sortable: false,
      searchable: true,
      filterable: false,
      description: tDashboardAdmin("payment_instructions_for_users"),
      priority: 3,
      expandedOnly: true,
    },
    {
      key: "fixedFee",
      title: tCommon("fixed_fee"),
      type: "number",
      icon: DollarSign,
      sortable: true,
      searchable: false,
      filterable: true,
      description: tDashboardAdmin("fixed_fee_amount_charged_per_transaction"),
      priority: 2,
    },
    {
      key: "percentageFee",
      title: tCommon("percentage_fee"),
      type: "number",
      icon: PercentIcon,
      sortable: true,
      searchable: false,
      filterable: true,
      description: tDashboardAdmin("percentage_based_fee_charged_on_transaction_amount"),
      priority: 2,
    },
    {
      key: "minAmount",
      title: tCommon("min_amount"),
      type: "number",
      icon: DollarSign,
      sortable: true,
      searchable: false,
      filterable: true,
      description: tDashboardAdmin("minimum_deposit_amount_allowed"),
      priority: 2,
      expandedOnly: true,
    },
    {
      key: "maxAmount",
      title: tCommon("max_amount"),
      type: "number",
      icon: DollarSign,
      sortable: true,
      searchable: false,
      filterable: true,
      description: tDashboardAdmin("maximum_deposit_amount_allowed"),
      priority: 2,
      expandedOnly: true,
      optional: true,
    },
    {
      key: "status",
      title: tCommon("status"),
      type: "boolean",
      render: {
        type: "toggle",
        config: {
          url: "/api/admin/finance/deposit/method/[id]/status",
          method: "PUT",
          field: "status",
          trueValue: true,
          falseValue: false,
        },
      },
      icon: CheckSquare,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tDashboardAdmin("active_status_of_the_deposit_method"),
      priority: 1,
    },
    {
      key: "createdAt",
      title: tCommon("created_at"),
      type: "date",
      icon: Clock,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tDashboardAdmin("date_when_the_method_was_created"),
      render: { type: "date", format: "PPP" },
      priority: 3,
      expandedOnly: true,
    },
    {
      key: "customFields",
      title: tCommon("custom_fields"),
      type: "customFields",
      icon: ClipboardList,
      sortable: false,
      searchable: false,
      filterable: false,
      description: tDashboardAdmin("custom_fields_required_for_this_payment_method"),
      priority: 3,
      expandedOnly: true,
      render: {
        type: "customFields",
        config: {
          maxDisplay: 5,
        },
      },
    },
  ];
}

export function useFormConfig(): FormConfig {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  return {
    create: {
      title: t("create_new_method"),
      description: t("add_a_new_deposit_method_for_users"),
      groups: [
        {
          id: "method-basic",
          title: t("basic_information"),
          icon: CreditCard,
          priority: 1,
          fields: [
            "image",
            { key: "title", required: true },
            { key: "instructions", required: true },
          ],
        },
        {
          id: "method-fees",
          title: t("fees_limits"),
          icon: DollarSign,
          priority: 2,
          fields: [
            { key: "fixedFee", required: true },
            { key: "percentageFee", required: true },
            { key: "minAmount", required: true },
            "maxAmount",
          ],
        },
        {
          id: "method-custom",
          title: tCommon("custom_fields"),
          icon: ClipboardList,
          priority: 3,
          fields: ["customFields"],
        },
      ],
    },
    edit: {
      title: t("edit_method"),
      description: t("update_deposit_method_settings"),
      groups: [
        {
          id: "method-basic",
          title: t("basic_information"),
          icon: CreditCard,
          priority: 1,
          fields: [
            "image",
            { key: "title", required: true },
            { key: "instructions", required: true },
          ],
        },
        {
          id: "method-fees",
          title: t("fees_limits"),
          icon: DollarSign,
          priority: 2,
          fields: [
            { key: "fixedFee", required: true },
            { key: "percentageFee", required: true },
            { key: "minAmount", required: true },
            "maxAmount",
          ],
        },
        {
          id: "method-custom",
          title: tCommon("custom_fields"),
          icon: ClipboardList,
          priority: 3,
          fields: ["customFields"],
        },
      ],
    },
  };
}
