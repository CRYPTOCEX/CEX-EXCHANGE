import { Shield, ClipboardList, CalendarIcon, User } from "lucide-react";
import { format } from "date-fns";

export const columns: ColumnDefinition[] = [
  {
    key: "id",
    title: "ID",
    type: "text",
    icon: Shield,
    sortable: true,
    searchable: true,
    filterable: true,
    description: "Unique order identifier",
    priority: 3,
    expandedOnly: true,
  },
  {
    key: "user",
    title: "User",
    type: "compound",
    expandedTitle: (row) => `User: ${row.id}`,
    icon: User,
    sortable: true,
    searchable: true,
    filterable: true,
    description: "Investor",
    render: {
      type: "compound",
      config: {
        image: {
          key: "avatar",
          fallback: "/img/placeholder.svg",
          type: "image",
          title: "Avatar",
          description: "User's profile picture",
          filterable: false,
          sortable: false,
        },
        primary: {
          key: ["firstName", "lastName"],
          title: ["First Name", "Last Name"],
          icon: User,
          editable: false,
        },
        secondary: {
          key: "email",
          title: "Email",
          editable: false,
        },
      },
    },
    priority: 1,
  },
  // products as tags
  {
    key: "products",
    title: "Products",
    type: "tags",
    sortable: false,
    searchable: true,
    filterable: true,
    description: "Ordered products",
    priority: 2,
  },
  {
    key: "status",
    title: "Status",
    type: "select",
    icon: ClipboardList,
    sortable: true,
    searchable: true,
    filterable: true,
    description: "PENDING, COMPLETED, CANCELLED, REJECTED",
    options: [
      { value: "PENDING", label: "Pending" },
      { value: "COMPLETED", label: "Completed" },
      { value: "CANCELLED", label: "Cancelled" },
      { value: "REJECTED", label: "Rejected" },
    ],
    priority: 1,
    render: {
      type: "badge",
      config: {
        variant: (value) => {
          switch (value) {
            case "PENDING":
              return "warning";
            case "COMPLETED":
              return "success";
            case "CANCELLED":
              return "danger";
            case "REJECTED":
              return "danger";
            default:
              return "secondary";
          }
        },
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
    description: "Order creation date",
    render: { type: "date", format: "PPP" },
    priority: 2,
  },
];
