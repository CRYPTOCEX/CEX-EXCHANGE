import { Shield, Image as ImageIcon, CheckSquare } from "lucide-react";

export const columns: ColumnDefinition[] = [
  {
    key: "id",
    title: "ID",
    type: "text",
    icon: Shield,
    sortable: true,
    searchable: true,
    filterable: true,
    description: "Unique category identifier",
    priority: 3,
    expandedOnly: true,
  },
  {
    key: "category",
    title: "Category",
    disablePrefixSort: true,
    type: "compound",
    sortable: true,
    searchable: true,
    filterable: true,
    description: "Pool details",
    render: {
      type: "compound",
      config: {
        image: {
          key: "image",
          title: "Image",
          type: "image",
          fallback: "/img/placeholder.svg",
          icon: ImageIcon,
          sortable: false,
          searchable: false,
          filterable: false,
          editable: true,
          usedInCreate: true,
          description: "Category image URL",
        },
        primary: {
          key: "name",
          title: "Name",
          type: "text",
          sortable: true,
          searchable: true,
          filterable: true,
          editable: true,
          usedInCreate: true,
          description: "Category name",
        },
        secondary: {
          key: "slug",
          title: "Slug",
          type: "text",
          sortable: true,
          searchable: true,
          filterable: true,
          editable: true,
          usedInCreate: true,
          description: "URL-friendly slug",
        },
      },
    },
  },
  {
    key: "description",
    title: "Description",
    type: "textarea",
    sortable: false,
    searchable: true,
    filterable: false,
    editable: true,
    usedInCreate: true,
    description: "Short description",
    priority: 3,
  },
  {
    key: "status",
    title: "Status",
    type: "toggle",
    icon: CheckSquare,
    sortable: true,
    searchable: true,
    filterable: true,
    editable: true,
    usedInCreate: true,
    description: "Category status",
    priority: 1,
  },
];
