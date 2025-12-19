"use client";
import {
  User,
  Mail,
  Shield,
  FileText,
  Calendar,
  Globe,
  Activity,
  Tag,
} from "lucide-react";
import type {
  ColumnDefinition,
  FormConfig,
} from "@/components/blocks/data-table/types/table";
import { useTranslations } from "next-intl";

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
      filterable: false,
      description: t("unique_identifier_for_the_audit_log"),
      priority: 3,
      expandedOnly: true,
    },
    {
      key: "action",
      title: tCommon("action"),
      type: "select",
      icon: Activity,
      sortable: true,
      searchable: false,
      filterable: true,
      description: t("action_performed"),
      options: [
        { value: "APPROVE", label: tCommon("approve"), color: "success" },
        { value: "REJECT", label: tCommon("reject"), color: "danger" },
        { value: "SUSPEND", label: tCommon("suspend"), color: "warning" },
        { value: "ACTIVATE", label: tCommon("activate"), color: "info" },
        { value: "UPDATE", label: tCommon("update"), color: "primary" },
        { value: "CREATE", label: tCommon("create"), color: "primary" },
        { value: "DELETE", label: tCommon("delete"), color: "danger" },
        { value: "REVERSE", label: t("reverse"), color: "warning" },
        { value: "RECALCULATE", label: t("recalculate"), color: "info" },
      ],
      render: {
        type: "badge",
        config: {
          variant: (value: string) => {
            switch (value) {
              case "APPROVE":
                return "success";
              case "REJECT":
              case "DELETE":
                return "danger";
              case "SUSPEND":
              case "REVERSE":
                return "warning";
              case "ACTIVATE":
              case "RECALCULATE":
                return "info";
              case "UPDATE":
              case "CREATE":
                return "primary";
              default:
                return "secondary";
            }
          },
        },
      },
      priority: 1,
    },
    {
      key: "entityType",
      title: t("entity_type"),
      type: "select",
      icon: Tag,
      sortable: true,
      searchable: false,
      filterable: true,
      description: t("type_of_entity_affected"),
      options: [
        { value: "LEADER", label: t("leader"), color: "primary" },
        { value: "SUBSCRIPTION", label: t("subscription"), color: "info" },
        { value: "TRADE", label: tCommon("trade"), color: "success" },
        { value: "TRANSACTION", label: tCommon("transaction"), color: "warning" },
        { value: "SETTINGS", label: tCommon("settings"), color: "muted" },
      ],
      render: {
        type: "badge",
        config: {
          variant: (value: string) => {
            switch (value) {
              case "LEADER":
                return "primary";
              case "SUBSCRIPTION":
                return "info";
              case "TRADE":
                return "success";
              case "TRANSACTION":
                return "warning";
              case "SETTINGS":
                return "muted";
              default:
                return "secondary";
            }
          },
        },
      },
      priority: 1,
    },
    {
      key: "entityId",
      title: t("entity_id"),
      type: "text",
      icon: FileText,
      sortable: false,
      searchable: true,
      filterable: false,
      description: t("id_of_the_affected_entity"),
      priority: 2,
      render: {
        type: "custom",
        render: (value: string) => (
          <span className="font-mono text-xs">
            {value ? `${value.substring(0, 8)}...` : "-"}
          </span>
        ),
      },
    },
    {
      key: "admin",
      title: tCommon("admin"),
      type: "compound",
      icon: User,
      sortable: true,
      searchable: true,
      filterable: true,
      description: t("admin_who_performed_the_action"),
      render: {
        type: "compound",
        config: {
          image: {
            key: "avatar",
            fallback: "/img/placeholder.svg",
            type: "image",
            title: tCommon("avatar"),
          },
          primary: {
            key: ["firstName", "lastName"],
            title: [tCommon("first_name"), tCommon("last_name")],
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
      key: "ipAddress",
      title: t("ip_address"),
      type: "text",
      icon: Globe,
      sortable: true,
      searchable: true,
      filterable: false,
      description: t("ip_address_of_the_admin"),
      priority: 2,
      render: {
        type: "custom",
        render: (value: string) => (
          <span className="font-mono text-sm">{value || "-"}</span>
        ),
      },
    },
    {
      key: "details",
      title: tCommon("details"),
      type: "text",
      icon: FileText,
      sortable: false,
      searchable: false,
      filterable: false,
      description: t("additional_details_about_the_action"),
      priority: 3,
      expandedOnly: true,
      render: {
        type: "custom",
        render: (value: any) => (
          <pre className="text-xs bg-muted p-2 rounded max-h-32 overflow-auto">
            {JSON.stringify(value, null, 2)}
          </pre>
        ),
      },
    },
    {
      key: "createdAt",
      title: tCommon("date"),
      type: "date",
      icon: Calendar,
      sortable: true,
      searchable: false,
      filterable: true,
      description: t("date_when_action_occurred"),
      priority: 1,
      render: {
        type: "date",
        format: "PPpp",
      },
    },
  ] as ColumnDefinition[];
}

export function useFormConfig(): FormConfig {
  // Audit logs are read-only, no create/edit forms needed
  return {};
}
