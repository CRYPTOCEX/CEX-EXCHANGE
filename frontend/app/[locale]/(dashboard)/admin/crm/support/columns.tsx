import React from "react";
import { format } from "date-fns";
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
import { useTranslations } from "next-intl";

export const columns: ColumnDefinition[] = [
  {
    key: "id",
    title: "ID",
    type: "text",
    icon: Shield,
    sortable: true,
    searchable: true,
    filterable: true,
    description: "Unique identifier for the support ticket",
    priority: 1,
    expandedOnly: true,
  },
  {
    key: "user",
    title: "Customer",
    type: "compound",
    icon: User,
    sortable: true,
    searchable: true,
    filterable: true,
    description: "The customer who created the ticket",
    priority: 1, // important - visible by default
    render: {
      type: "compound",
      config: {
        image: {
          key: "avatar", // expects row.user.avatar
          fallback: "/img/placeholder.svg",
          type: "image",
          title: "Avatar",
          description: "User's avatar",
          editable: false,
          usedInCreate: false,
        },
        primary: {
          key: ["firstName", "lastName"],
          title: ["First Name", "Last Name"],
          description: ["User's first name", "User's last name"],
          editable: false,
          usedInCreate: false,
          icon: User,
        },
        secondary: {
          key: "email",
          title: "Email",
          icon: Mail,
          editable: false,
          usedInCreate: false,
        },
      },
    },
  },
  {
    key: "agent",
    title: "Assigned Agent",
    type: "compound",
    icon: User,
    sortable: true,
    searchable: false,
    filterable: false,
    description: "The agent assigned to this ticket",
    priority: 2, // less important
    expandedOnly: true,
    render: {
      type: "compound",
      config: {
        image: {
          key: "avatar", // expects row.agent.avatar
          fallback: "/img/placeholder.svg",
          type: "image",
          title: "Agent Avatar",
          description: "Agent's avatar",
          editable: false,
          usedInCreate: false,
        },
        primary: {
          key: ["firstName", "lastName"],
          title: ["First Name", "Last Name"],
          description: ["Agent's first name", "Agent's last name"],
          editable: false,
          usedInCreate: false,
          icon: User,
        },
        secondary: {
          key: "email",
          title: "Email",
          icon: Mail,
          editable: false,
          usedInCreate: false,
        },
      },
    },
  },
  {
    key: "subject",
    title: "Subject",
    type: "text",
    icon: Inbox,
    sortable: true,
    searchable: true,
    filterable: true,
    editable: true,
    usedInCreate: true,
    description: "Short description of the ticket",
    priority: 1, // important - should be visible
    // Removed expandedOnly to make it visible in the main table
  },
  {
    key: "importance",
    title: "Importance",
    type: "select",
    icon: AlertTriangle,
    sortable: true,
    searchable: true,
    filterable: true,
    editable: true,
    usedInCreate: true,
    description: "Ticket importance level",
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
      { value: "LOW", label: "Low" },
      { value: "MEDIUM", label: "Medium" },
      { value: "HIGH", label: "High" },
    ],
    // important column (no expandedOnly flag)
  },
  {
    key: "status",
    title: "Status",
    type: "select",
    icon: CheckCircle2,
    sortable: true,
    searchable: true,
    filterable: true,
    editable: true,
    usedInCreate: true,
    description: "Ticket status",
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
      { value: "PENDING", label: "Pending" },
      { value: "OPEN", label: "Open" },
      { value: "REPLIED", label: "Replied" },
      { value: "CLOSED", label: "Closed" },
    ],
    // important column (visible by default)
  },
  {
    key: "type",
    title: "Type",
    type: "select",
    icon: Bell,
    sortable: true,
    searchable: true,
    filterable: true,
    editable: true,
    usedInCreate: true,
    description: "Ticket type (Live Chat or Ticket)",
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
      { value: "LIVE", label: "Live Chat" },
      { value: "TICKET", label: "Ticket" },
    ],
    // important column (visible by default)
  },
  {
    key: "messages",
    title: "Messages",
    type: "custom",
    icon: MessageSquare,
    sortable: false,
    searchable: false,
    filterable: false,
    editable: false,
    usedInCreate: false,
    description: "Conversation messages",
    render: {
      type: "custom",
      render: (value: any) => {
        const t = useTranslations("dashboard");
        if (!value || !Array.isArray(value)) {
          return <span>{t("no_messages")}</span>;
        }
        return (
          <span>
            {value.length}
            {t("messages")}
          </span>
        );
      },
    },
    priority: 3, // not important
    expandedOnly: true,
  },
  {
    key: "createdAt",
    title: "Created",
    type: "date",
    icon: CalendarIcon,
    sortable: true,
    searchable: true,
    filterable: true,
    description: "Date when the ticket was created",
    render: {
      type: "date",
      format: "PPp", // Changed to show date and time
    },
    priority: 2, // moderately important
    // Removed expandedOnly to make it visible in the main table
  },
];
