"use client";

import React from "react";
import {
  Shield,
  ClipboardList,
  DollarSign,
  ImageIcon,
  CheckSquare,
  PercentIcon,
  CreditCard,
  Clock,
  ArrowDownToLine,
  ArrowUpToLine,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type {
  FormConfig,
  ViewConfig,
} from "@/components/blocks/data-table/types/table";

import { useTranslations } from "next-intl";
export function useColumns(): ColumnDefinition[] {
  const tCommon = useTranslations("common");
  const tDashboardAdmin = useTranslations("dashboard_admin");
  return [
    {
      key: "id",
      title: "ID",
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

/**
 * A DECIMAL column arrives from mysql2 as a STRING, so every figure here goes
 * through Number() before it is formatted — `"25.00".toLocaleString()` is the
 * string itself, unformatted.
 */
function toNumber(value: any): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatAmount(value: any): string {
  const amount = toNumber(value);
  if (amount === null) return "—";
  const abs = Math.abs(amount);
  return amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    // Crypto methods carry sub-cent fees; a flat 2 places printed them as 0.00.
    maximumFractionDigits: abs > 0 && abs < 1 ? 8 : 2,
  });
}

/**
 * The view dialog for a deposit method.
 *
 * The flat grid put four fee/limit figures, a paragraph of payment
 * instructions and the custom-field schema into one undifferentiated 2-column
 * list. The four numbers are what an operator opens this record for, so they
 * become the stat strip; the two long-form blocks each get the full width they
 * need to be readable.
 */
export function useViewConfig(): ViewConfig {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");

  return React.useMemo<ViewConfig>(
    () => ({
      size: "3xl",

      badges: (row) => (
        <Badge tone={row.status ? "success" : "neutral"} appearance="soft">
          {row.status ? tCommon("enabled") : tCommon("disabled")}
        </Badge>
      ),

      stats: [
        {
          label: tCommon("fixed_fee"),
          icon: DollarSign,
          value: (row) => formatAmount(row.fixedFee),
        },
        {
          label: tCommon("percentage_fee"),
          icon: PercentIcon,
          value: (row) => {
            const percentage = toNumber(row.percentageFee);
            return percentage === null ? "—" : `${formatAmount(percentage)}%`;
          },
        },
        {
          label: tCommon("min_amount"),
          icon: ArrowDownToLine,
          value: (row) => formatAmount(row.minAmount),
        },
        {
          label: tCommon("max_amount"),
          icon: ArrowUpToLine,
          // A null maximum is "no ceiling", not "zero" — the dash the generic
          // renderer prints reads as missing data rather than as a policy.
          value: (row) =>
            toNumber(row.maxAmount) === null
              ? "No limit"
              : formatAmount(row.maxAmount),
        },
      ],

      sections: [
        {
          id: "instructions",
          title: tCommon("payment_instructions"),
          description: t("shown_to_the_user_after_they_pick_this_method"),
          icon: ClipboardList,
          columns: 1,
          fields: [
            {
              key: "instructions",
              fullWidth: true,
              emptyText: t("no_instructions_provided"),
            },
          ],
        },
        {
          id: "custom-fields",
          title: t("requested_fields"),
          description:
            t("collected_from_the_user_when_a"),
          icon: ClipboardList,
          columns: 1,
          fields: [
            {
              key: "customFields",
              fullWidth: true,
              emptyText: t("no_custom_fields_requested"),
            },
          ],
        },
        {
          id: "record",
          title: t("availability_record"),
          icon: Shield,
          columns: 3,
          fields: [
            // The column's toggle renderer, so availability stays switchable
            // from the dialog rather than only from the table row.
            { key: "status", icon: CheckSquare },
            { key: "id", icon: Shield, copyable: true },
            { key: "createdAt", icon: Clock },
          ],
        },
      ],
    }),
    [t, tCommon]
  );
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
          title: tCommon("basic_information"),
          icon: CreditCard,
          priority: 1,
          fields: [
            { key: "image", compoundKey: "depositCompound" },
            { key: "title", compoundKey: "depositCompound", required: true },
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
          title: tCommon("basic_information"),
          icon: CreditCard,
          priority: 1,
          fields: [
            { key: "image", compoundKey: "depositCompound" },
            { key: "title", compoundKey: "depositCompound", required: true },
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
