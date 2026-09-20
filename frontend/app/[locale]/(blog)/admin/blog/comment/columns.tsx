"use client";

import React from "react";
import { Shield, User, ClipboardList, CalendarIcon, MessageSquare, Mail, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type {
  FormConfig,
  ViewConfig,
} from "@/components/blocks/data-table/types/table";

import { useTranslations } from "next-intl";
// Column definitions for table display only
export function useColumns() {
  const t = useTranslations("blog_admin");
  const tCommon = useTranslations("common");
  return [
    {
      key: "id",
      title: "ID",
      type: "text",
      icon: Shield,
      sortable: true,
      searchable: true,
      filterable: true,
      description: t("unique_system_identifier_for_the_blog_comment"),
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
      description: t("user_who_posted_the_comment_with_name_and_email"),
      render: {
        type: "compound",
        config: {
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
      key: "content",
      title: tCommon("content"),
      type: "text",
      icon: ClipboardList,
      sortable: false,
      searchable: true,
      filterable: false,
      description: t("text_content_of_the_comment"),
      priority: 1,
    },
    {
      key: "status",
      title: tCommon("status"),
      type: "select",
      icon: ClipboardList,
      sortable: true,
      searchable: true,
      filterable: true,
      description: t("moderation_status_of_the_comment_approved"),
      options: [
        { value: "APPROVED", label: tCommon("approved") },
        { value: "PENDING", label: tCommon("pending") },
        { value: "REJECTED", label: tCommon("rejected") },
      ],
      priority: 1,
      render: {
        type: "badge",
        config: {
          variant: (value) => {
            switch (value) {
              case "APPROVED":
                return "success";
              case "PENDING":
                return "warning";
              case "REJECTED":
                return "destructive";
              default:
                return "secondary";
            }
          },
          withDot: true,
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
      description: t("date_when_the_comment_was_posted"),
      render: { type: "date", format: "PPP" },
      priority: 3,
    },
  ] as ColumnDefinition[];
}

/* -------------------------------------------------------------------------- *
 * View dialog
 *
 * A moderation decision needs two things the flat grid did not give: the
 * comment body as readable prose rather than a value squeezed into a half-width
 * tile, and WHICH POST it is on. The list endpoint joins the post in (id,
 * title, slug, image) but `post` is not a column, so the derived dialog dropped
 * it entirely and an operator had to approve or reject a comment with no idea
 * what it was replying to.
 * -------------------------------------------------------------------------- */

function statusTone(status?: string) {
  switch (String(status).toUpperCase()) {
    case "APPROVED":
      return "success" as const;
    case "PENDING":
      return "warning" as const;
    case "REJECTED":
      return "destructive" as const;
    default:
      return "neutral" as const;
  }
}

export function useViewConfig(): ViewConfig {
  const t = useTranslations("blog_admin");
  const tCommon = useTranslations("common");
  return React.useMemo<ViewConfig>(
    () => ({
      size: "3xl",

      badges: (row) => (
        <Badge
          tone={statusTone(row.status)}
          appearance="soft"
          className="capitalize"
        >
          {String(row.status ?? "").toLowerCase() || "unknown"}
        </Badge>
      ),

      sections: [
        {
          id: "content",
          title: tCommon("comment"),
          icon: MessageSquare,
          // Prose, not a key/value pair.
          render: (row) => (
            <p className="whitespace-pre-wrap break-words rounded-lg border border-border bg-muted p-4 text-sm leading-relaxed">
              {row.content || "—"}
            </p>
          ),
        },
        {
          id: "post",
          title: t("on_post"),
          icon: FileText,
          columns: 2,
          condition: (row) => Boolean(row.post),
          fields: [
            {
              key: "post.title",
              title: tCommon("post"),
              icon: FileText,
              render: (value) => (
                <span className="break-words">{String(value)}</span>
              ),
            },
            {
              key: "post.slug",
              title: tCommon("slug"),
              icon: ClipboardList,
              copyable: true,
              render: (value) => (
                <span className="font-mono text-xs break-all">
                  {String(value)}
                </span>
              ),
            },
          ],
        },
        {
          id: "record",
          title: tCommon("record"),
          icon: Shield,
          columns: 2,
          fields: [
            { key: "id", icon: Shield, copyable: true },
            { key: "createdAt", icon: CalendarIcon },
          ],
        },
      ],
    }),
    []
  );
}

// Form configuration - defines create/edit form structure
export function useFormConfig() {
  const t = useTranslations("blog_admin");
  const tCommon = useTranslations("common");
  return {
    create: {
      title: t("create_new_comment"),
      description: t("add_a_new_comment_to_a_blog_post"),
      groups: [
        {
          id: "comment-content",
          title: t("comment_content"),
          icon: MessageSquare,
          priority: 1,
          fields: [
            { key: "content", required: true },
          ],
        },
        {
          id: "comment-status",
          title: tCommon("moderation"),
          icon: ClipboardList,
          priority: 2,
          fields: [
            {
              key: "status",
              required: true,
              options: [
                { value: "APPROVED", label: tCommon("approved") },
                { value: "PENDING", label: tCommon("pending") },
                { value: "REJECTED", label: tCommon("rejected") },
              ],
            },
          ],
        },
      ],
    },
    edit: {
      title: t("edit_comment"),
      description: t("moderate_and_update_comment_content"),
      groups: [
        {
          id: "comment-content",
          title: t("comment_content"),
          icon: MessageSquare,
          priority: 1,
          fields: [
            { key: "content", required: true },
          ],
        },
        {
          id: "comment-status",
          title: tCommon("moderation"),
          icon: ClipboardList,
          priority: 2,
          fields: [
            {
              key: "status",
              required: true,
              options: [
                { value: "APPROVED", label: tCommon("approved") },
                { value: "PENDING", label: tCommon("pending") },
                { value: "REJECTED", label: tCommon("rejected") },
              ],
            },
          ],
        },
      ],
    },
  } as FormConfig;
}
