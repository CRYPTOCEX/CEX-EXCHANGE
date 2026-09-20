"use client";
import React from "react";
import {
  CheckSquare,
  CalendarIcon,
  FileText,
  Fingerprint,
  Megaphone,
  Tag,
  Link2,
} from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { sanitizeHTML } from "@/lib/sanitize";
import type {
  FormConfig,
  ViewConfig,
} from "@/components/blocks/data-table/types/table";

import { useTranslations } from "next-intl";
export function useColumns() {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  return [
    {
      key: "id",
      title: "ID",
      type: "text",
      sortable: true,
      searchable: true,
      filterable: true,
      description: t("unique_identifier_for_the_announcement"),
      priority: 2,
      expandedOnly: true,
    },
    {
      key: "title",
      title: tCommon("title"),
      type: "text",
      sortable: true,
      searchable: true,
      filterable: true,
      description: t("announcement_title"),
      priority: 1,
    },
    {
      key: "type",
      title: tCommon("type"),
      type: "select",
      options: [
        { value: "GENERAL", label: tCommon("general") },
        { value: "EVENT", label: tCommon("event") },
        { value: "UPDATE", label: tCommon("update") },
      ],
      sortable: true,
      filterable: true,
      description: t("announcement_type"),
      priority: 1,
      render: {
        type: "badge",
        config: {
          withDot: false,
          variant: (value: string) => {
            switch (value) {
              case "GENERAL":
                return "primary";
              case "EVENT":
                return "success";
              case "UPDATE":
                return "warning";
              default:
                return "primary";
            }
          },
        },
      },
    },
    {
      key: "message",
      title: tCommon("message"),
      type: "editor",
      filterable: false,
      sortable: false,
      expandedOnly: true,
      description: tCommon("announcement_message"),
      priority: 3,
    },
    {
      key: "link",
      title: tCommon("link"),
      type: "text",
      searchable: true,
      filterable: true,
      description: t("related_link_for_the_announcement"),
      priority: 3,
    },
    {
      key: "status",
      title: tCommon("status"),
      type: "boolean",
      icon: CheckSquare,
      sortable: true,
      filterable: true,
      description: t("active_status_of_the_announcement"),
      priority: 2,
      render: {
        type: "badge",
        config: {
          withDot: true,
          variant: (value: boolean) => (value ? "success" : "secondary"),
          labels: {
            true: "Active",
            false: "Inactive",
          },
        },
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
      description: t("announcement_creation_date"),
      render: {
        type: "date",
        format: "PPP",
      },
      priority: 4,
    },
  ] as ColumnDefinition[];
}

/* -------------------------------------------------------------------------- *
 * View dialog
 * -------------------------------------------------------------------------- */

/**
 * View dialog for a system announcement.
 *
 * Almost everything here is already right by default — six fields, a form
 * config that groups them, a collapsed timestamp tail. One thing is not:
 * `message` is authored in the WYSIWYG editor and therefore STORED AS HTML,
 * and the generic cell renderer has no case for the `editor` type, so it falls
 * through to the plain text cell and prints the markup — `<p>Scheduled
 * maintenance…</p>` — instead of the notice. The whole point of opening an
 * announcement is to read that message, so it gets a rendered block of its
 * own; the rest of the record stays a short, flat grid.
 */
export function useViewConfig(): ViewConfig {
  const tCommon = useTranslations("common");
  return React.useMemo<ViewConfig>(
    () => ({
      size: "2xl",

      badges: (row) => (
        <Badge tone={row.status ? "success" : "neutral"} appearance="soft">
          {row.status ? tCommon("active") : tCommon("inactive")}
        </Badge>
      ),

      sections: [
        {
          id: "message",
          title: tCommon("message"),
          icon: Megaphone,
          columns: 1,
          priority: 1,
          condition: (row) => Boolean(row.message),
          /* Sanitised, not raw: the stored HTML comes from an editor and is
             therefore trusted about as far as its author, and `sanitizeHTML`
             is the helper the rest of the product already runs it through.
             The typography is set with token-based descendant rules because
             the `prose` plugin is not registered in this app. */
          render: (row) => (
            <div
              className={[
                "rounded-lg border border-border p-4 text-sm leading-relaxed",
                "[&_p]:mb-2 [&_p:last-child]:mb-0",
                "[&_a]:text-primary [&_a]:underline [&_a]:break-words",
                "[&_strong]:font-semibold [&_em]:italic",
                "[&_h1]:text-base [&_h1]:font-semibold [&_h1]:mb-2",
                "[&_h2]:text-sm [&_h2]:font-semibold [&_h2]:mb-2",
                "[&_ul]:list-disc [&_ul]:ps-5 [&_ul]:mb-2",
                "[&_ol]:list-decimal [&_ol]:ps-5 [&_ol]:mb-2",
                "[&_blockquote]:border-s-2 [&_blockquote]:border-border [&_blockquote]:ps-3 [&_blockquote]:text-muted-foreground",
                "[&_img]:max-w-full [&_img]:rounded-md",
              ].join(" ")}
              dangerouslySetInnerHTML={{
                __html: sanitizeHTML(String(row.message ?? "")),
              }}
            />
          ),
        },
        {
          id: "details",
          title: tCommon("details"),
          icon: Tag,
          columns: 2,
          priority: 2,
          fields: [
            { key: "type", icon: Tag },
            {
              key: "link",
              icon: Link2,
              hideEmpty: true,
              render: (value) => (
                <a
                  href={String(value)}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-primary underline break-all"
                >
                  {String(value)}
                </a>
              ),
            },
          ],
        },
        {
          id: "record",
          title: tCommon("record"),
          icon: Fingerprint,
          columns: 2,
          priority: 3,
          collapsible: true,
          defaultCollapsed: true,
          fields: [
            {
              key: "id",
              icon: Fingerprint,
              copyable: true,
              render: (value) => (
                <span className="font-mono text-xs break-all">
                  {String(value ?? "")}
                </span>
              ),
            },
            { key: "createdAt", icon: CalendarIcon },
          ],
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
      title: t("create_new_announcement"),
      description: t("publish_a_new_system_announcement_for_users"),
      groups: [
        {
          id: "basic-info",
          title: tCommon("basic_information"),
          icon: FileText,
          priority: 1,
          fields: [
            { key: "title", required: true },
            {
              key: "type",
              required: true,
              options: [
                { value: "GENERAL", label: tCommon("general") },
                { value: "EVENT", label: tCommon("event") },
                { value: "UPDATE", label: tCommon("update") },
              ],
            },
          ],
        },
        {
          id: "content",
          title: tCommon("content"),
          icon: FileText,
          priority: 2,
          fields: [
            { key: "message", required: true },
            { key: "link" },
          ],
        },
        {
          id: "settings",
          title: tCommon("settings"),
          icon: CheckSquare,
          priority: 3,
          fields: [
            { key: "status" },
          ],
        },
      ],
    },
    edit: {
      title: t("edit_announcement"),
      description: t("update_system_announcement_details"),
      groups: [
        {
          id: "basic-info",
          title: tCommon("basic_information"),
          icon: FileText,
          priority: 1,
          fields: [
            { key: "title", required: true },
            {
              key: "type",
              required: true,
              options: [
                { value: "GENERAL", label: tCommon("general") },
                { value: "EVENT", label: tCommon("event") },
                { value: "UPDATE", label: tCommon("update") },
              ],
            },
          ],
        },
        {
          id: "content",
          title: tCommon("content"),
          icon: FileText,
          priority: 2,
          fields: [
            { key: "message", required: true },
            { key: "link" },
          ],
        },
        {
          id: "settings",
          title: tCommon("settings"),
          icon: CheckSquare,
          priority: 3,
          fields: [
            { key: "status" },
          ],
        },
      ],
    },
  };
}
