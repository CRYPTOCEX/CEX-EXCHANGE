"use client";
import React from "react";
import { format } from "date-fns";
import { useTranslations } from "next-intl";
import {
  User,
  Inbox,
  Bell,
  AlertTriangle,
  CheckCircle2,
  Mail,
  CalendarIcon,
  MessageSquare,
  Shield,
} from "lucide-react";

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
      description: t("unique_identifier_for_the_support_ticket"),
      priority: 1,
      expandedOnly: true,
    },
    {
      key: "user",
      title: tCommon("customer"),
      type: "compound",
      icon: User,
      sortable: true,
      searchable: true,
      filterable: true,
      description: t("the_customer_who_created_the_ticket"),
      priority: 1,
      render: {
        type: "compound",
        config: {
          image: {
            key: "avatar",
            fallback: "/img/placeholder.svg",
            type: "image",
            title: tCommon("avatar"),
            description: tCommon("users_avatar"),
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
            icon: Mail,
          },
        },
      },
    },
    {
      key: "agent",
      title: tCommon("assigned_agent"),
      type: "compound",
      icon: User,
      sortable: true,
      searchable: false,
      filterable: false,
      description: t("the_agent_assigned_to_this_ticket"),
      priority: 2,
      expandedOnly: true,
      render: {
        type: "compound",
        config: {
          image: {
            key: "avatar",
            fallback: "/img/placeholder.svg",
            type: "image",
            title: t("agent_avatar"),
            description: t("agents_avatar"),
          },
          primary: {
            key: ["firstName", "lastName"],
            title: [tCommon("first_name"), tCommon("last_name")],
            description: [t("agents_first_name"), t("agents_last_name")],
            icon: User,
          },
          secondary: {
            key: "email",
            title: tCommon("email"),
            icon: Mail,
          },
        },
      },
    },
    {
      key: "subject",
      title: tCommon("subject"),
      type: "text",
      icon: Inbox,
      sortable: true,
      searchable: true,
      filterable: true,
      description: t("short_description_of_the_ticket"),
      priority: 1,
    },
    {
      key: "importance",
      title: tCommon("importance"),
      type: "select",
      icon: AlertTriangle,
      sortable: true,
      searchable: true,
      filterable: true,
      description: t("ticket_importance_level"),
      render: {
        type: "badge",
        config: {
          withDot: true,
          variant: (value: string) => {
            switch (value.toUpperCase()) {
              case "HIGH":
                return "danger";
              case "MEDIUM":
                return "warning";
              case "LOW":
                return "success";
              default:
                return "default";
            }
          },
        },
      },
      options: [
        { value: "LOW", label: tCommon("low") },
        { value: "MEDIUM", label: tCommon("medium") },
        { value: "HIGH", label: tCommon("high") },
      ],
    },
    {
      key: "status",
      title: tCommon("status"),
      type: "select",
      icon: CheckCircle2,
      sortable: true,
      searchable: true,
      filterable: true,
      description: t("ticket_status"),
      render: {
        type: "badge",
        config: {
          withDot: true,
          variant: (value: string) => {
            switch (value.toUpperCase()) {
              case "PENDING":
                return "info";
              case "OPEN":
                return "primary";
              case "REPLIED":
                return "secondary";
              case "CLOSED":
                return "muted";
              default:
                return "default";
            }
          },
        },
      },
      options: [
        { value: "PENDING", label: tCommon("pending") },
        { value: "OPEN", label: tCommon("open") },
        { value: "REPLIED", label: tCommon("replied") },
        { value: "CLOSED", label: tCommon("closed") },
      ],
    },
    {
      key: "type",
      title: tCommon("type"),
      type: "select",
      icon: Bell,
      sortable: true,
      searchable: true,
      filterable: true,
      description: t("ticket_type_live_chat_or_ticket"),
      render: {
        type: "badge",
        config: {
          withDot: false,
          variant: (value: string) => {
            switch (value.toUpperCase()) {
              case "LIVE":
                return "info";
              case "TICKET":
                return "muted";
              default:
                return "default";
            }
          },
        },
      },
      options: [
        { value: "LIVE", label: tCommon("live_chat") },
        { value: "TICKET", label: tCommon("ticket") },
      ],
    },
    {
      key: "messages",
      title: t("messages"),
      type: "custom",
      icon: MessageSquare,
      sortable: false,
      searchable: false,
      filterable: false,
      description: t("conversation_messages"),
      render: {
        type: "custom",
        render: (value: any) => {
          if (!value || !Array.isArray(value)) {
            return <span>{t("no_messages")}</span>;
          }
          return (
            <span>
              {value.length} messages
            </span>
          );
        },
      },
      priority: 3,
      expandedOnly: true,
    },
    {
      key: "createdAt",
      title: tCommon("created"),
      type: "date",
      icon: CalendarIcon,
      sortable: true,
      searchable: true,
      filterable: true,
      description: t("date_when_the_ticket_was_created"),
      render: {
        type: "date",
        format: "PPp",
      },
      priority: 2,
    },
  ];
}

