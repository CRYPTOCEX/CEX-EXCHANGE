// src/config/disputeColumns.ts

import { AlertTriangle, User } from "lucide-react";
import { Mail } from "lucide-react";
export const disputeColumns: ColumnDefinition[] = [
  {
    key: "id",
    title: "Dispute ID",
    type: "text",
    sortable: true,
    searchable: true,
    filterable: true,
    description: "Unique dispute identifier",
  },
  {
    key: "trade",
    title: "Trade",
    type: "text",
    sortable: true,
    searchable: true,
    filterable: true,
    description: "Related trade ID",
    render: {
      type: "custom",
      render: (_: any, row: any) => row.trade?.id || "-",
    },
  },
  {
    key: "reportedBy",
    title: "Reported By",
    type: "compound",
    icon: User,
    sortable: true,
    searchable: true,
    filterable: true,
    description: "User who filed the dispute",
    render: {
      type: "compound",
      config: {
        image: {
          key: "reportedBy.avatar",
          fallback: "/img/placeholder.svg",
          type: "image",
          title: "Reporter Avatar",
          description: "Reporter avatar",
          editable: false,
          usedInCreate: false,
        },
        primary: {
          key: ["reportedBy.firstName", "reportedBy.lastName"],
          title: ["First Name", "Last Name"],
          description: ["Reporter first name", "Reporter last name"],
          editable: false,
          usedInCreate: false,
          icon: User,
        },
        secondary: {
          key: "reportedBy.email",
          title: "Email",
          icon: Mail,
          editable: false,
          usedInCreate: false,
        },
      },
    },
  },
  {
    key: "against",
    title: "Against",
    type: "compound",
    icon: User,
    sortable: true,
    searchable: true,
    filterable: true,
    description: "User against whom the dispute is filed",
    render: {
      type: "compound",
      config: {
        image: {
          key: "against.avatar",
          fallback: "/img/placeholder.svg",
          type: "image",
          title: "Avatar",
          description: "User avatar",
          editable: false,
          usedInCreate: false,
        },
        primary: {
          key: ["against.firstName", "against.lastName"],
          title: ["First Name", "Last Name"],
          description: ["Against first name", "Against last name"],
          editable: false,
          usedInCreate: false,
          icon: User,
        },
        secondary: {
          key: "against.email",
          title: "Email",
          icon: Mail,
          editable: false,
          usedInCreate: false,
        },
      },
    },
  },
  {
    key: "reason",
    title: "Reason",
    type: "text",
    sortable: false,
    searchable: true,
    filterable: true,
    description: "Reason for the dispute",
  },
  {
    key: "filedOn",
    title: "Filed On",
    type: "date",
    sortable: true,
    searchable: false,
    filterable: true,
    description: "Date when the dispute was filed",
    render: {
      type: "date",
      format: "PPP",
    },
  },
  {
    key: "status",
    title: "Status",
    type: "select",
    sortable: true,
    searchable: true,
    filterable: true,
    description: "Dispute status",
    render: {
      type: "badge",
      config: {
        withDot: true,
        variant: (value: string) => {
          switch (value) {
            case "PENDING":
              return "outline";
            case "IN_PROGRESS":
              return "info";
            case "RESOLVED":
              return "default";
            default:
              return "default";
          }
        },
      },
    },
    options: [
      {
        value: "PENDING",
        label: "Pending",
      },
      {
        value: "IN_PROGRESS",
        label: "In Progress",
      },
      {
        value: "RESOLVED",
        label: "Resolved",
      },
    ],
  },
  {
    key: "priority",
    title: "Priority",
    type: "select",
    sortable: true,
    searchable: true,
    filterable: true,
    description: "Dispute priority",
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
              return "default";
            default:
              return "default";
          }
        },
      },
    },
    options: [
      {
        value: "HIGH",
        label: "High",
      },
      {
        value: "MEDIUM",
        label: "Medium",
      },
      {
        value: "LOW",
        label: "Low",
      },
    ],
  },
  {
    key: "actions",
    title: "Actions",
    type: "custom",
    editable: false,
    usedInCreate: false,
    filterable: false,
    searchable: false,
    render: {
      type: "custom",
      render: (_: any, row: any) => {
        return (
          <a
            href={`/admin/p2p/dispute/${row.id}`}
            className="text-blue-500 underline"
          >
            View Details
          </a>
        );
      },
    },
  },
];
