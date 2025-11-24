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
    type: "boolean",
    sortable: true,
    filterable: true,
    editable: true,
    usedInCreate: true,
    icon: Settings,
    render: {
      type: "custom",
      render: (value) => {
        const isActive = value === true || value === 1 || value === "true" || value === "1";
        return (
          <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${
            isActive
              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
              : "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
          }`}>
            {isActive ? "Active" : "Inactive"}
          </span>
        );
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