import {
  Shield,
  ClipboardList,
  CalendarIcon,
  Image as ImageIcon,
} from "lucide-react";
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
    description: "Unique post identifier",
    priority: 3,
    expandedOnly: true,
  },
  {
    key: "author",
    idKey: "id",
    labelKey: "name",
    baseKey: "authorId",
    sortKey: "author.user.firstName",
    title: "Author",
    type: "select",
    icon: Shield,
    sortable: true,
    searchable: true,
    filterable: true,
    editable: true,
    usedInCreate: true,
    description: "Post author",
    apiEndpoint: {
      url: "/api/admin/blog/author/options",
      method: "GET",
    },
    render: {
      type: "compound",
      config: {
        primary: {
          key: ["user.firstName", "user.lastName"],
          title: ["First Name", "Last Name"],
          editable: false,
          usedInCreate: false,
          icon: Shield,
        },
        secondary: {
          key: "user.email",
          title: "Email",
          editable: false,
          usedInCreate: false,
        },
      },
    },
    priority: 1,
  },
  {
    key: "category",
    idKey: "id",
    labelKey: "name",
    baseKey: "categoryId",
    sortKey: "category.name",
    title: "Category",
    type: "select",
    icon: ClipboardList,
    sortable: true,
    searchable: true,
    filterable: true,
    editable: true,
    usedInCreate: true,
    description: "Post category",
    render: (value: any, row: any) => {
      const category = row?.category || value;
      return category ? category.name : "N/A";
    },
    apiEndpoint: {
      url: "/api/admin/blog/category/options",
      method: "GET",
    },
    priority: 1,
  },
  {
    key: "compound",
    title: "Post",
    type: "compound",
    disablePrefixSort: true,
    sortable: true,
    searchable: true,
    filterable: true,
    priority: 1,
    icon: Shield,
    render: {
      type: "compound",
      config: {
        image: {
          key: "image", // Row's image URL
          fallback: "/img/placeholder.svg",
          type: "image",
          title: "Image",
          description: "Method image URL",
          editable: true,
          usedInCreate: true,
          filterable: false,
          sortable: false,
        },
        primary: {
          key: "title", // Row's display title
          title: "Title",
          description: "Display title",
          editable: true,
          usedInCreate: true,
          sortable: true,
          sortKey: "title",
        },
      },
    },
  },
  {
    key: "slug",
    title: "Slug",
    type: "text",
    icon: ClipboardList,
    sortable: true,
    searchable: true,
    filterable: true,
    editable: true,
    usedInCreate: true,
    description: "URL slug",
    priority: 2,
    expandedOnly: true,
  },
  {
    key: "status",
    title: "Status",
    type: "select",
    icon: ClipboardList,
    sortable: true,
    searchable: true,
    filterable: true,
    editable: true,
    usedInCreate: true,
    description: "Post status",
    options: [
      { value: "PUBLISHED", label: "Published" },
      { value: "DRAFT", label: "Draft" },
    ],
    priority: 1,
    render: {
      type: "badge",
      config: {
        variant: (value) => {
          switch (value) {
            case "PUBLISHED":
              return "success";
            case "DRAFT":
              return "warning";
            default:
              return "secondary";
          }
        },
      },
    },
  },
  {
    key: "description",
    title: "Description",
    type: "textarea",
    icon: ClipboardList,
    sortable: false,
    searchable: true,
    filterable: false,
    editable: true,
    usedInCreate: true,
    description: "Short description",
    priority: 2,
    expandedOnly: true,
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
  {
    key: "content",
    title: "Content",
    type: "editor",
    editable: true,
    usedInCreate: true,
    description: "Enter rich text content",
    uploadDir: "posts",
    expandedOnly: true,
  },
];
