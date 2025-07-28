import { CalendarIcon, FileText, AlertCircle, Code } from "lucide-react";
import { format } from "date-fns";

export const columns: ColumnDefinition[] = [
  {
    key: "message",
    title: "Message",
    type: "textarea",
    sortable: false,
    searchable: true,
    filterable: false,
    description: "Log message details",
    priority: 1,
  },
  {
    key: "level",
    title: "Level",
    type: "text",
    sortable: true,
    searchable: true,
    filterable: true,
    description: "Log level (error, warning, info, etc.)",
    priority: 1,
    icon: AlertCircle,
    render: {
      type: "badge",
      config: {
        withDot: true,
        variant: (value: string) => {
          switch (value.toLowerCase()) {
            case "error":
              return "danger";
            case "warning":
              return "warning";
            case "info":
              return "info";
            default:
              return "default";
          }
        },
      },
    },
  },
  {
    key: "category",
    title: "Category",
    type: "text",
    sortable: true,
    searchable: true,
    filterable: true,
    description: "Category of the log",
    priority: 1,
    icon: FileText,
  },
  {
    key: "file",
    title: "File",
    type: "text",
    sortable: false,
    searchable: true,
    filterable: true,
    description: "File where the log originated",
    priority: 3,
    icon: Code,
    expandedOnly: true,
  },
  {
    key: "timestamp",
    title: "Timestamp",
    type: "date",
    sortable: true,
    searchable: false,
    filterable: true,
    description: "Time when the log was recorded",
    priority: 1,
    icon: CalendarIcon,
    render: {
      type: "date",
      format: "PPPpp", // e.g., Mar 3, 2025, 9:26 PM
    },
  },
  {
    key: "label",
    title: "Label",
    type: "text",
    sortable: true,
    searchable: true,
    filterable: true,
    description: "Label associated with the log",
    priority: 2,
    expandedOnly: true,
  },
];
