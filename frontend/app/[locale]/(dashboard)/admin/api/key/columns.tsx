// columns.tsx for API Key Management page
import React from "react";
import { CalendarIcon, Key as KeyIcon, Shield, User } from "lucide-react";
import { format } from "date-fns";
import { TagsCell } from "@/components/blocks/data-table/content/rows/cells/tags";
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
    description: "Unique identifier for the API key",
    priority: 1,
  },
  {
    key: "user",
    title: "User",
    expandedTitle: (row) => `User: ${row.id}`,
    type: "compound",
    icon: User,
    sortable: true,
    searchable: true,
    filterable: true,
    description: "The user associated with the API key",
    priority: 1,
    render: {
      type: "compound",
      config: {
        image: {
          key: "avatar", // expects row.user.avatar
          fallback: "/img/placeholder.svg",
          type: "image",
          title: "Avatar",
          description: "User avatar",
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
          icon: KeyIcon,
          editable: false,
          usedInCreate: false,
        },
      },
    },
  },
  {
    key: "name",
    title: "Name",
    type: "text",
    icon: Shield,
    sortable: true,
    searchable: true,
    filterable: true,
    editable: true,
    usedInCreate: true,
    description: "The name of the API key",
    priority: 1,
  },
  {
    key: "key",
    title: "Key",
    type: "text",
    icon: KeyIcon,
    sortable: true,
    searchable: true,
    filterable: false,
    editable: true,
    usedInCreate: true,
    description: "The API key string",
    priority: 2,
    expandedOnly: true,
  },
  {
    key: "type",
    title: "Type",
    type: "select",
    icon: Shield,
    sortable: true,
    searchable: true,
    filterable: true,
    editable: true,
    usedInCreate: true,
    description: "Type of API key",
    render: {
      type: "badge",
      config: {
        withDot: false,
        variant: (value: string) => {
          switch (value.toLowerCase()) {
            case "plugin":
              return "info";
            case "user":
              return "primary";
            default:
              return "default";
          }
        },
      },
    },
    options: [
      { value: "plugin", label: "Plugin" },
      { value: "user", label: "User" },
    ],
    priority: 1,
  },
  {
    key: "permissions",
    title: "Permissions",
    type: "multiselect",
    icon: Shield,
    sortable: false,
    searchable: false,
    filterable: false,
    editable: true,
    usedInCreate: true,
    description: "List of permissions for this API key",
    options: [
      { value: "trade", label: "Trade" },
      { value: "futures", label: "Futures" },
      { value: "deposit", label: "Deposit" },
      { value: "withdraw", label: "Withdraw" },
      { value: "transfer", label: "Transfer" },
      { value: "payment", label: "Payment Intent" },
    ],
    render: {
      type: "custom",
      render: (value: any, row: any) => {
        const t = useTranslations("dashboard");
        let perms = [];
        try {
          perms = typeof value === "string" ? JSON.parse(value) : value;
        } catch (err) {
          return <span className="text-red-500">{t("invalid_json")}</span>;
        }
        return <TagsCell value={perms} row={row} maxDisplay={3} />;
      },
    },
  },
  {
    key: "ipRestriction",
    title: "IP Restriction",
    type: "boolean",
    icon: Shield,
    sortable: true,
    searchable: true,
    filterable: true,
    editable: true,
    usedInCreate: true,
    description: "Whether IP restriction is enabled",
    priority: 1,
  },
  {
    key: "ipWhitelist",
    title: "IP Whitelist",
    type: "tags",
    icon: Shield,
    sortable: false,
    searchable: false,
    filterable: false,
    editable: true,
    usedInCreate: true,
    description: "Whitelisted IP addresses",
    expandedOnly: true,
    condition: (values) => values.ipRestriction === true,
  },
  {
    key: "createdAt",
    title: "Created At",
    type: "date",
    icon: CalendarIcon,
    sortable: true,
    searchable: true,
    filterable: true,
    description: "Date when the API key was created",
    render: {
      type: "date",
      format: "PPP",
    },
    priority: 2,
    expandedOnly: true,
  },
];
