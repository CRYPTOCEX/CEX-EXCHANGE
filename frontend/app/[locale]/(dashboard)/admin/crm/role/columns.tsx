import { Shield, ListChecks } from "lucide-react";

export const columns: ColumnDefinition[] = [
  {
    key: "id",
    title: "ID",
    type: "text",
    sortable: true,
    searchable: true,
    filterable: true,
    icon: Shield,
    description: "Unique identifier for the role",
    priority: 2,
  },
  {
    key: "name",
    title: "Role Name",
    type: "text",
    sortable: true,
    searchable: true,
    filterable: true,
    editable: true,
    usedInCreate: true,
    icon: Shield,
    description: "Name of the role",
    priority: 1,
  },
  {
    key: "permissions",
    title: "Permissions",
    // Use "multiselect" so that in edit mode, it displays as a select (multiple select)
    // while in display mode, we override with the "tags" render type.
    type: "multiselect",
    icon: ListChecks,
    sortable: false,
    searchable: false,
    filterable: false,
    editable: true,
    usedInCreate: true,
    description: "Permissions associated with the role",
    // This tells the form control to load options dynamically.
    apiEndpoint: {
      url: "/api/admin/crm/permission/options",
      method: "GET",
    },
    // In display mode, render as tags.
    render: {
      type: "tags",
      config: { maxDisplay: 3 },
    },
    priority: 3,
  },
];
