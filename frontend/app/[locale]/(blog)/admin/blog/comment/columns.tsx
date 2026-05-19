"use client";

import { Shield, User, ClipboardList, CalendarIcon, MessageSquare, Mail } from "lucide-react";
import type { FormConfig } from "@/components/blocks/data-table/types/table";

import { useTranslations } from "next-intl";
// Column definitions for table display only
export function useColumns() {
  const t = useTranslations("blog_admin");
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
          title: t("moderation"),
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
          title: t("moderation"),
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
