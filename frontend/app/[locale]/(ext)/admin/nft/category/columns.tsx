import React from "react";
import { Tag, FileText, Calendar, Settings } from "lucide-react";

export const columns = [
  {
    key: "id",
    title: "ID",
    type: "text",
    sortable: true,
    searchable: true,
    filterable: true,
    description: "Unique category identifier",
    priority: 4,
    editable: false,
    usedInCreate: false,
    expandedOnly: true,
  },
  {
    key: "name",
    title: "Category Name",
    type: "text",
    sortable: true,
    searchable: true,
    filterable: true,
    editable: true,
    usedInCreate: true,
    icon: Tag,
    priority: 1,
    description: "Category display name",
  },
  {
    key: "slug",
    title: "Slug",
    type: "text",
    sortable: true,
    searchable: true,
    filterable: true,
    editable: true,
    usedInCreate: true,
    description: "URL-friendly category identifier",
    priority: 2,
    render: {
      type: "badge",
      config: {
        variant: "outline"
      }
    }
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
    icon: FileText,
    description: "Category description",
    priority: 3,
    expandedOnly: true,
  },
  {
    key: "image",
    title: "Image",
    type: "image",
    sortable: false,
    searchable: false,
    filterable: false,
    editable: true,
    usedInCreate: true,
    description: "Category image",
    priority: 3,
    render: {
      type: "image",
      fallback: "/img/placeholder.svg"
    },
    expandedOnly: true,
  },
  {
    key: "status",
    title: "Status",
    type: "select",
    sortable: true,
    filterable: true,
    editable: true,
    usedInCreate: true,
    icon: Settings,
    options: [
      { value: true, label: "Active", color: "success" },
      { value: false, label: "Inactive", color: "secondary" }
    ],
    render: {
      type: "badge",
      config: {
        variant: (value) => {
          return value ? "success" : "secondary";
        }
      }
    },
    priority: 1,
  },
  {
    key: "createdAt",
    title: "Created",
    type: "date",
    sortable: true,
    filterable: true,
    editable: false,
    usedInCreate: false,
    icon: Calendar,
    render: {
      type: "date",
      format: "MMM dd, yyyy"
    },
    priority: 2,
  },
  {
    key: "updatedAt",
    title: "Updated",
    type: "date",
    sortable: true,
    filterable: true,
    editable: false,
    usedInCreate: false,
    icon: Calendar,
    render: {
      type: "date",
      format: "MMM dd, yyyy"
    },
    priority: 4,
    expandedOnly: true,
  }
];