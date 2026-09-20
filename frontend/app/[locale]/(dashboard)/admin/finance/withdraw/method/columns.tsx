"use client";
import React from "react";
import { useTranslations } from "next-intl";
import {
  ClipboardList,
  DollarSign,
  Image as ImageIcon,
  CheckSquare,
  Shield,
  ArrowUpCircle,
  Clock,
  FileText,
  Percent,
  ArrowDownToLine,
  ArrowUpToLine,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type {
  FormConfig,
  ViewConfig,
} from "@/components/blocks/data-table/types/table";

export function useColumns(): ColumnDefinition[] {
  const tCommon = useTranslations("common");
  const tDashboardAdmin = useTranslations("dashboard_admin");
  return [
    {
      key: "id",
      title: "ID",
      type: "text",
      icon: ClipboardList,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tDashboardAdmin("unique_identifier_for_the_withdraw_method"),
      priority: 2,
      expandedOnly: true,
    },
    {
      key: "image",
      title: tCommon("image"),
      type: "image",
      icon: ImageIcon,
      sortable: false,
      searchable: false,
      filterable: false,
      description: tDashboardAdmin("method_image_url"),
      priority: 3,
      expandedOnly: true,
    },
    {
      key: "title",
      title: tCommon("title"),
      type: "text",
      icon: Shield,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tCommon("display_title"),
      priority: 3,
      expandedOnly: true,
    },
    {
      key: "compound",
      title: tCommon("method"),
      type: "compound",
      disablePrefixSort: true,
      sortable: true,
      searchable: true,
      filterable: true,
      priority: 1,
      icon: Shield,
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
      key: "processingTime",
      title: tCommon("processing_time"),
      type: "text",
      icon: ClipboardList,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tDashboardAdmin("approximate_processing_time_e_g_1_2_business_days"),
      priority: 1,
    },
    {
      key: "instructions",
      title: tCommon("instructions"),
      type: "text",
      icon: ClipboardList,
      sortable: false,
      searchable: true,
      filterable: false,
      description: tDashboardAdmin("how_to_withdraw_using_this_method"),
      expandedOnly: true,
      priority: 3,
    },
    {
      key: "status",
      title: tCommon("status"),
      type: "boolean",
      icon: CheckSquare,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tDashboardAdmin("whether_this_method_is_active"),
      priority: 1,
    },
    {
      key: "fixedFee",
      title: tCommon("fixed_fee"),
      type: "number",
      icon: DollarSign,
      sortable: true,
      searchable: false,
      filterable: true,
      description: tDashboardAdmin("fixed_fee_charged_for_this_method"),
      priority: 1,
    },
    {
      key: "percentageFee",
      title: tCommon("percentage_fee"),
      type: "number",
      icon: DollarSign,
      sortable: true,
      searchable: false,
      filterable: true,
      description: tDashboardAdmin("percentage_fee_charged"),
      priority: 1,
    },
    {
      key: "minAmount",
      title: tCommon("min_amount"),
      type: "number",
      icon: DollarSign,
      sortable: true,
      searchable: false,
      filterable: true,
      description: tDashboardAdmin("minimum_withdrawable_amount"),
      expandedOnly: true,
      priority: 2,
    },
    {
      key: "maxAmount",
      title: tCommon("max_amount"),
      type: "number",
      icon: DollarSign,
      sortable: true,
      searchable: false,
      filterable: true,
      description: tDashboardAdmin("maximum_withdrawable_amount"),
      expandedOnly: true,
      priority: 2,
    },
    {
      key: "customFields",
      title: tCommon("custom_fields"),
      type: "customFields",
      icon: ClipboardList,
      sortable: false,
      searchable: false,
      filterable: false,
      description: tDashboardAdmin("additional_custom_fields"),
      expandedOnly: true,
      priority: 3,
      render: {
        type: "customFields",
        config: {
          maxDisplay: 5,
        },
      },
    },
  ];
}

/* -------------------------------------------------------------------------- *
 * View dialog
 *
 * A withdrawal method is a fee schedule with an instruction sheet attached.
 * The four numbers that decide whether a payout is even possible — the two fee
 * components and the two limits — lead as the stat strip, and the two long
 * blocks (the customer-facing instructions and the custom field list the payout
 * form is built from) each get the full panel width.
 *
 * The `compound` column is the table's primary, so the header already renders
 * the method's logo and title; neither is repeated below.
 * -------------------------------------------------------------------------- */

/** withdrawMethod's money columns are DOUBLE, but a null still reaches here. */
function fmtNumber(value: unknown): string {
  const num = typeof value === "number" ? value : parseFloat(String(value ?? ""));
  if (!Number.isFinite(num)) return "—";
  return num.toLocaleString(undefined, { maximumFractionDigits: 8 });
}

/**
 * `customFields` is stored as a JSON STRING, so an empty schedule arrives as
 * the literal `"[]"` — truthy, and enough on its own to open a section whose
 * only content is "no fields".
 */
function hasCustomFields(row: any): boolean {
  const raw = row?.customFields;
  if (!raw) return false;
  if (Array.isArray(raw)) return raw.length > 0;
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    return trimmed !== "" && trimmed !== "[]" && trimmed !== "{}" && trimmed !== "null";
  }
  if (typeof raw === "object") return Object.keys(raw).length > 0;
  return false;
}

export function useViewConfig(): ViewConfig {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  return React.useMemo<ViewConfig>(
    () => ({
      size: "3xl",

      badges: (row) => (
        <Badge tone={row.status ? "success" : "neutral"} appearance="soft">
          {row.status ? tCommon("active") : tCommon("disabled")}
        </Badge>
      ),

      stats: [
        {
          label: tCommon("fixed_fee"),
          icon: DollarSign,
          value: (row) => fmtNumber(row.fixedFee),
        },
        {
          label: tCommon("percentage_fee"),
          icon: Percent,
          value: (row) => `${fmtNumber(row.percentageFee)}%`,
        },
        {
          label: tCommon("min_amount"),
          icon: ArrowDownToLine,
          value: (row) => fmtNumber(row.minAmount),
        },
        {
          label: tCommon("max_amount"),
          icon: ArrowUpToLine,
          value: (row) => fmtNumber(row.maxAmount),
        },
      ],

      sections: [
        {
          id: "method-details",
          title: t("method_details"),
          icon: Clock,
          columns: 2,
          fields: [
            { key: "processingTime", icon: Clock, emptyText: tCommon("not_stated") },
            { key: "id", title: tCommon("method_id"), icon: Shield },
          ],
        },
        {
          id: "instructions",
          title: tCommon("instructions"),
          description: t("shown_to_the_customer_when_they_choose_this_method"),
          icon: FileText,
          columns: 1,
          fields: [
            {
              key: "instructions",
              title: t("customer_instructions"),
              fullWidth: true,
              emptyText: t("no_instructions_provided"),
            },
          ],
        },
        {
          id: "custom-fields",
          title: tCommon("custom_fields"),
          description: t("extra_inputs_collected_on_the_withdrawal_form"),
          icon: ClipboardList,
          columns: 1,
          condition: hasCustomFields,
          fields: [{ key: "customFields", fullWidth: true }],
        },
      ],
    }),
    []
  );
}

export function useFormConfig(): FormConfig {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  return {
    create: {
      title: t("create_withdraw_method"),
      description: t("add_a_new_withdrawal_method_for_users"),
      groups: [
        {
          id: "method-basic",
          title: tCommon("basic_information"),
          icon: ArrowUpCircle,
          priority: 1,
          fields: [
            { key: "image", compoundKey: "compound" },
            { key: "title", compoundKey: "compound", required: true },
            { key: "processingTime", required: true },
            { key: "instructions", required: true },
            { key: "status", required: true },
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
            { key: "maxAmount", required: true },
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
      title: t("edit_withdraw_method"),
      description: t("update_withdrawal_method_settings"),
      groups: [
        {
          id: "method-basic",
          title: tCommon("basic_information"),
          icon: ArrowUpCircle,
          priority: 1,
          fields: [
            { key: "image", compoundKey: "compound" },
            { key: "title", compoundKey: "compound", required: true },
            { key: "processingTime", required: true },
            { key: "instructions", required: true },
            { key: "status", required: true },
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
            { key: "maxAmount", required: true },
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
