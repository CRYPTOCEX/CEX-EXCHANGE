import { Link } from "@/i18n/routing";
import {
  Shield,
  Image as ImageIcon,
  ClipboardList,
  CalendarIcon,
} from "lucide-react";

export const columns: ColumnDefinition[] = [
  {
    key: "id",
    title: "ID",
    type: "text",
    icon: Shield,
    sortable: true,
    searchable: true,
    filterable: true,
    description: "Unique slider identifier",
    priority: 3,
    expandedOnly: true,
  },
  {
    key: "image",
    title: "Image",
    type: "image",
    icon: ImageIcon,
    sortable: false,
    searchable: false,
    filterable: false,
    editable: true,
    usedInCreate: true,
    description: "Slider image URL",
    priority: 1,
    render: { type: "image", size: "xl" },
  },
  {
    key: "link",
    title: "Link",
    type: "text",
    icon: ClipboardList,
    sortable: true,
    searchable: true,
    filterable: true,
    editable: true,
    usedInCreate: true,
    description: "Destination URL",
    priority: 1,
    render: {
      type: "custom",
      render: (value: any) => {
        return (
          <Link
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 dark:text-blue-400 hover:underline"
          >
            {value}
          </Link>
        );
      },
    },
  },
  {
    key: "status",
    title: "Status",
    type: "boolean",
    icon: ClipboardList,
    sortable: true,
    searchable: true,
    filterable: true,
    editable: true,
    usedInCreate: true,
    description: "Slider status",
    priority: 1,
  },
  {
    key: "createdAt",
    title: "Created At",
    type: "date",
    icon: CalendarIcon,
    sortable: true,
    searchable: true,
    filterable: true,
    description: "Creation date",
    render: { type: "date", format: "PPP" },
    priority: 3,
    expandedOnly: true,
  },
];
