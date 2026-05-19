"use client";

import { User, Mail, AlertTriangle, FileText, Calendar, Hash, Activity, Shield } from "lucide-react";
import type { FormConfig } from "@/components/blocks/data-table/types/table";

import { useTranslations } from "next-intl";
export function useColumns(): ColumnDefinition[] {
  const tCommon = useTranslations("common");
  const tExtAdmin = useTranslations("ext_admin");
  return [
    {
      key: "id",
      title: tExtAdmin("dispute_id"),
      type: "text",
      icon: Hash,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("unique_identifier_for_the_dispute_case"),
      priority: 3,
      expandedOnly: true,
    },
    {
      key: "status",
      title: tCommon("status"),
      type: "select",
      icon: Activity,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("current_resolution_status_of_the_dispute"),
      priority: 1,
      render: {
        type: "badge",
        config: {
          withDot: true,
          variant: (value: string) => {
            switch (value) {
              case "RESOLVED":
                return "success";
              case "PENDING":
                return "warning";
              case "IN_PROGRESS":
              case "UNDER_REVIEW":
                return "warning";
              default:
                return "secondary";
            }
          },
        },
      },
      options: [
        {
          value: "PENDING",
          label: tCommon("pending"),
        },
        {
          value: "IN_PROGRESS",
          label: tCommon("in_progress"),
        },
        {
          value: "RESOLVED",
          label: tCommon("resolved"),
        },
      ],
    },
    {
      key: "priority",
      title: tCommon("priority"),
      type: "select",
      icon: AlertTriangle,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("urgency_level_for_dispute_resolution_high"),
      priority: 1,
      render: {
        type: "badge",
        config: {
          withDot: true,
          variant: (value: string) => {
            switch (value) {
              case "HIGH":
                return "destructive";
              case "MEDIUM":
                return "warning";
              case "LOW":
                return "secondary";
              default:
                return "secondary";
            }
          },
        },
      },
      options: [
        {
          value: "HIGH",
          label: tCommon("high"),
        },
        {
          value: "MEDIUM",
          label: tCommon("medium"),
        },
        {
          value: "LOW",
          label: tCommon("low"),
        },
      ],
    },
    {
      key: "trade",
      title: tCommon("trade"),
      type: "text",
      icon: FileText,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("associated_p2p_trade_id_that_is_being_disputed"),
      priority: 2,
      render: {
        type: "custom",
        render: (_: any, row: any) => row.trade?.id || "-",
      },
    },
    {
      key: "reportedBy",
      title: tExtAdmin("reported_by"),
      type: "compound",
      icon: User,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("user_who_initiated_the_dispute_claim"),
      priority: 2,
      render: {
        type: "compound",
        config: {
          image: {
            key: "reportedBy.avatar",
            fallback: "/img/placeholder.svg",
            type: "image",
            title: tExtAdmin("reporter_avatar"),
            description: tExtAdmin("profile_avatar_of_the_user_who_filed_the_dispute"),
          },
          primary: {
            key: ["reportedBy.firstName", "reportedBy.lastName"],
            title: [tCommon("first_name"), tCommon("last_name")],
            description: [tExtAdmin("reporters_first_name"), tExtAdmin("reporters_last_name")],
            icon: User,
          },
          secondary: {
            key: "reportedBy.email",
            title: tCommon("email"),
            icon: Mail,
          },
        },
      },
    },
    {
      key: "against",
      title: tExtAdmin("against"),
      type: "compound",
      icon: Shield,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("user_who_is_being_disputed_against"),
      priority: 2,
      render: {
        type: "compound",
        config: {
          image: {
            key: "against.avatar",
            fallback: "/img/placeholder.svg",
            type: "image",
            title: tCommon("avatar"),
            description: tExtAdmin("profile_avatar_of_the_disputed_user"),
          },
          primary: {
            key: ["against.firstName", "against.lastName"],
            title: [tCommon("first_name"), tCommon("last_name")],
            description: [tExtAdmin("disputed_users_first_name"), tExtAdmin("disputed_users_last_name")],
            icon: User,
          },
          secondary: {
            key: "against.email",
            title: tCommon("email"),
            icon: Mail,
          },
        },
      },
    },
    {
      key: "reason",
      title: tExtAdmin("reason"),
      type: "text",
      icon: FileText,
      sortable: false,
      searchable: true,
      filterable: true,
      description: tExtAdmin("detailed_explanation_of_why_the_dispute_was_filed"),
      priority: 3,
      expandedOnly: true,
    },
    {
      key: "filedOn",
      title: tExtAdmin("filed_on_1"),
      type: "date",
      icon: Calendar,
      sortable: true,
      searchable: false,
      filterable: true,
      description: tExtAdmin("date_and_time_when_the_dispute_was_submitted"),
      priority: 3,
      render: {
        type: "date",
        format: "PPP",
      },
    },
  ];
}

export function useFormConfig(): FormConfig {
  const tCommon = useTranslations("common");
  const tExtAdmin = useTranslations("ext_admin");
  return {
    create: {
      title: tExtAdmin("create_new_dispute"),
      description: tExtAdmin("file_a_new_p2p_trade_dispute"),
      groups: [
        {
          id: "dispute-parties",
          title: tExtAdmin("dispute_parties"),
          icon: User,
          priority: 1,
          fields: [
            { key: "reportedBy", required: true },
            { key: "against", required: true },
            { key: "trade", required: true },
          ],
        },
        {
          id: "dispute-details",
          title: tExtAdmin("dispute_details"),
          icon: FileText,
          priority: 2,
          fields: [
            { key: "reason", required: true },
            { key: "details", required: false },
            {
              key: "amount",
              required: true,
              maxLength: 50
            },
            {
              key: "priority",
              required: true,
              options: [
                { value: "HIGH", label: tCommon("high") },
                { value: "MEDIUM", label: tCommon("medium") },
                { value: "LOW", label: tCommon("low") },
              ],
            },
          ],
        },
        {
          id: "dispute-status",
          title: tExtAdmin("resolution_status"),
          icon: Activity,
          priority: 3,
          fields: [
            {
              key: "status",
              required: true,
              options: [
                { value: "PENDING", label: tCommon("pending") },
                { value: "IN_PROGRESS", label: tCommon("in_progress") },
                { value: "RESOLVED", label: tCommon("resolved") },
              ],
            },
            { key: "filedOn", required: true },
          ],
        },
      ],
    },
    edit: {
      title: tExtAdmin("edit_dispute"),
      description: tExtAdmin("update_dispute_details_priority_and_resolution"),
      groups: [
        {
          id: "dispute-parties",
          title: tExtAdmin("dispute_parties"),
          icon: User,
          priority: 1,
          fields: [
            { key: "reportedBy", required: true },
            { key: "against", required: true },
            { key: "trade", required: true },
          ],
        },
        {
          id: "dispute-details",
          title: tExtAdmin("dispute_details"),
          icon: FileText,
          priority: 2,
          fields: [
            { key: "reason", required: true },
            { key: "details", required: false },
            {
              key: "amount",
              required: true,
              maxLength: 50
            },
            {
              key: "priority",
              required: true,
              options: [
                { value: "HIGH", label: tCommon("high") },
                { value: "MEDIUM", label: tCommon("medium") },
                { value: "LOW", label: tCommon("low") },
              ],
            },
          ],
        },
        {
          id: "dispute-status",
          title: tExtAdmin("resolution_status"),
          icon: Activity,
          priority: 3,
          fields: [
            {
              key: "status",
              required: true,
              options: [
                { value: "PENDING", label: tCommon("pending") },
                { value: "IN_PROGRESS", label: tCommon("in_progress") },
                { value: "RESOLVED", label: tCommon("resolved") },
              ],
            },
            { key: "filedOn", required: true },
            { key: "resolvedOn", required: false },
          ],
        },
      ],
    },
  };
}
