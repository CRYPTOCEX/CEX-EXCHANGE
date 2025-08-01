import { Shield, User, ClipboardList, CalendarIcon } from "lucide-react";

export const columns: ColumnDefinition[] = [
  {
    key: "id",
    title: "ID",
    type: "text",
    icon: Shield,
    sortable: true,
    searchable: true,
    filterable: true,
    description: "Unique comment identifier",
    priority: 3,
    expandedOnly: true,
  },
  {
    key: "user",
    title: "User",
    type: "compound",
    icon: User,
    sortable: true,
    searchable: true,
    filterable: true,
    description: "User who posted the comment",
    render: {
      type: "compound",
      config: {
        primary: {
          key: ["firstName", "lastName"],
          title: ["First Name", "Last Name"],
          editable: false,
          usedInCreate: false,
          icon: User,
        },
        secondary: {
          key: "email",
          title: "Email",
          editable: false,
          usedInCreate: false,
        },
      },
    },
    priority: 1,
  },
  {
    key: "content",
    title: "Content",
    type: "text",
    icon: ClipboardList,
    sortable: false,
    searchable: true,
    filterable: false,
    editable: true,
    usedInCreate: true,
    description: "Comment content",
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
  },
];
