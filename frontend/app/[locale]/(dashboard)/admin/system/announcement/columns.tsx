import { CheckSquare, CalendarIcon } from "lucide-react";
import { format } from "date-fns";

export const columns: ColumnDefinition[] = [
  {
    key: "id",
    title: "ID",
    type: "text",
    sortable: true,
    searchable: true,
    filterable: true,
    description: "Unique identifier for the announcement",
    priority: 2,
    expandedOnly: true,
  },
  {
    key: "title",
    title: "Title",
    type: "text",
    sortable: true,
    searchable: true,
    filterable: true,
    editable: true,
    usedInCreate: true,
    description: "Announcement title",
    priority: 1,
  },
  {
    key: "type",
    title: "Type",
    type: "select",
    options: [
      { value: "GENERAL", label: "General" },
      { value: "EVENT", label: "Event" },
      { value: "UPDATE", label: "Update" },
    ],
    sortable: true,
    filterable: true,
    editable: true,
    usedInCreate: true,
    description: "Announcement type",
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
    title: "Message",
    type: "editor",
    editable: true,
    usedInCreate: true,
    filterable: false,
    sortable: false,
    expandedOnly: true,
    description: "Announcement message",
    priority: 3,
  },
  {
    key: "link",
    title: "Link",
    type: "text",
    editable: true,
    usedInCreate: true,
    searchable: true,
    filterable: true,
    description: "Related link for the announcement",
    priority: 3,
  },
  {
    key: "status",
    title: "Status",
    type: "boolean",
    icon: CheckSquare,
    sortable: true,
    filterable: true,
    editable: true,
    usedInCreate: true,
    description: "Active status of the announcement",
    priority: 2,
    render: {
      type: "badge",
      config: {
        withDot: true,
        variant: (value: boolean) => (value ? "success" : "danger"),
      },
    },
  },
  {
    key: "createdAt",
    title: "Created At",
    type: "date",
    icon: CalendarIcon,
    sortable: true,
    searchable: true,
    filterable: true,
    description: "Announcement creation date",
    render: {
      type: "date",
      format: "PPP",
    },
    priority: 4,
  },
];
