"use client";

import { Shield, ClipboardList, Mail, CalendarIcon, Zap, Target, FileText } from "lucide-react";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import type { FormConfig } from "@/components/blocks/data-table/types/table";

export function useColumns(): ColumnDefinition[] {
  const tCommon = useTranslations("common");
  const tExtAdmin = useTranslations("ext_admin");
  return [
    {
      key: "name",
      title: tCommon("name"),
      type: "text",
      icon: ClipboardList,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("campaign_name_used_to_identify_this"),
      priority: 1,
    },
    {
      key: "status",
      title: tCommon("status"),
      type: "select",
      icon: Zap,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("current_campaign_status_pending_not_started"),
      options: [
        { value: "PENDING", label: tCommon("pending") },
        { value: "PAUSED", label: tCommon("paused") },
        { value: "ACTIVE", label: tCommon("active") },
        { value: "STOPPED", label: tCommon("stopped") },
        { value: "COMPLETED", label: tCommon("completed") },
        { value: "CANCELLED", label: tCommon("cancelled") },
      ],
      priority: 1,
      render: {
        type: "badge",
        config: {
          variant: (value: any) => {
            switch (value) {
              case "PENDING":
                return "warning";
              case "PAUSED":
                return "secondary";
              case "ACTIVE":
                return "success";
              case "STOPPED":
                return "destructive";
              case "COMPLETED":
                return "success";
              case "CANCELLED":
                return "destructive";
              default:
                return "secondary";
            }
          },
        },
      },
    },
    {
      key: "subject",
      title: tCommon("subject"),
      type: "text",
      icon: Mail,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("email_subject_line_that_recipients_will"),
      priority: 1,
    },
    {
      key: "targets",
      title: tCommon("progress"),
      type: "custom",
      icon: Target,
      sortable: false,
      searchable: true,
      filterable: false,
      description: tExtAdmin("campaign_sending_progress_showing_percentage_of"),
      priority: 2,
      render: (value: any, row: any) => {
        const t = useTranslations("common");
        const tExt = useTranslations("ext");
        const tExtAdmin = useTranslations("ext_admin");
        let targets: any[] = [];
        if (typeof value === "string") {
          try {
            targets = JSON.parse(value);
          } catch (err) {
            console.error("Error parsing targets:", err);
          }
        } else if (Array.isArray(value)) {
          targets = value;
        }
        const total = targets.length;
        const completed = targets.filter((t) => t.status === "COMPLETED").length;
        const percentComplete = total ? Math.round((completed / total) * 100) : 0;

        return (
          <div className="flex flex-col">
            <div className="mt-1.5 w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-violet-600 h-2.5 rounded-full"
                style={{ width: `${percentComplete}%` }}
              ></div>
            </div>
            <div className="text-xs text-muted-foreground">
              {percentComplete}% {tCommon("completed")}
            </div>
          </div>
        );
      },
    },
    {
      key: "template",
      title: tCommon("template"),
      type: "custom",
      icon: FileText,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("email_template_used_for_this_campaign"),
      render: (value: any, row: any) => {
        const template = row?.template || value;
        if (template && typeof template === "object" && template.id) {
          return (
            <Link
              href={`/admin/mailwizard/template/${template.id}`}
              className="text-violet-600 hover:underline"
            >
              {template.name || "View Template"}
            </Link>
          );
        }
        return "N/A";
      },
      priority: 2,
    },
    {
      key: "speed",
      title: tExtAdmin("speed"),
      type: "number",
      icon: Zap,
      sortable: true,
      searchable: false,
      filterable: true,
      description: tExtAdmin("email_delivery_speed_setting_emails_per"),
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
      description: tExtAdmin("date_and_time_when_this_campaign_was_created"),
      render: { type: "date", format: "PPP" },
      priority: 3,
      expandedOnly: true,
    },
    {
      key: "id",
      title: tCommon("id"),
      type: "text",
      icon: Shield,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("unique_campaign_identifier_for_system_reference"),
      priority: 4,
      expandedOnly: true,
    },
  ];
}

export function useFormConfig(): FormConfig {
  const tExtAdmin = useTranslations("ext_admin");
  return {
    create: {
      title: tExtAdmin("create_new_campaign"),
      description: tExtAdmin("set_up_a_new_email_marketing"),
      groups: [
        {
          id: "campaign-details",
          title: tExtAdmin("campaign_details"),
          icon: Mail,
          priority: 1,
          fields: [
            { key: "name", required: true, maxLength: 191 },
            { key: "subject", required: true, maxLength: 191 },
            { key: "template", required: true },
          ],
        },
        {
          id: "audience-targeting",
          title: tExtAdmin("audience_targeting"),
          icon: Target,
          priority: 2,
          fields: [
            { key: "targets", required: false },
          ],
        },
        {
          id: "delivery-settings",
          title: tExtAdmin("delivery_settings"),
          icon: Zap,
          priority: 3,
          fields: [
            { key: "speed", required: true, min: 1 },
            { key: "status", required: true },
          ],
        },
      ],
    },
    edit: {
      title: tExtAdmin("edit_campaign"),
      description: tExtAdmin("modify_campaign_settings_update_email_content"),
      groups: [
        {
          id: "campaign-details",
          title: tExtAdmin("campaign_details"),
          icon: Mail,
          priority: 1,
          fields: [
            { key: "name", required: true, maxLength: 191 },
            { key: "subject", required: true, maxLength: 191 },
            { key: "template", required: true },
          ],
        },
        {
          id: "audience-targeting",
          title: tExtAdmin("audience_targeting"),
          icon: Target,
          priority: 2,
          fields: [
            { key: "targets", required: false },
          ],
        },
        {
          id: "delivery-settings",
          title: tExtAdmin("delivery_settings"),
          icon: Zap,
          priority: 3,
          fields: [
            { key: "speed", required: true, min: 1 },
            { key: "status", required: true },
          ],
        },
      ],
    },
  };
}
