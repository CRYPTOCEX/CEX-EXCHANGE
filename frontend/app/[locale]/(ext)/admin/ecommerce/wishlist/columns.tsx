import { Shield, ClipboardList, User } from "lucide-react";

export const columns: ColumnDefinition[] = [
  // Hidden by default
  {
    key: "id",
    title: "ID",
    type: "text",
    icon: Shield,
    sortable: true,
    searchable: true,
    filterable: true,
    description: "Unique wishlist identifier",
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
    expandedTitle: (row) => `Products: ${row.id}`,
    icon: ClipboardList,
    sortable: true,
    searchable: true,
    filterable: true,
    description: "Products in the wishlist",
    priority: 2,
  },
  {
    key: "createdAt",
    title: "Created At",
    type: "date",
    icon: Shield,
    sortable: true,
    searchable: true,
    filterable: true,
    description: "Date and time the wishlist was created",
    priority: 4,
  },
];
