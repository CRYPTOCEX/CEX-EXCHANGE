import { Shield } from "lucide-react";

export const columns: ColumnDefinition[] = [
  {
    key: "id",
    title: "ID",
    type: "text",
    sortable: true,
    searchable: true,
    filterable: true,
    icon: Shield,
    description: "Unique identifier for the permission",
    priority: 1,
  },
  {
    key: "name",
    title: "Permission Name",
    type: "text",
    sortable: true,
    searchable: true,
    filterable: true,
    // Even though the field is editable in the DataTable by default,
    // we disable editing by not enabling the form control since this page is read-only.
    editable: false,
    usedInCreate: false,
    icon: Shield,
    description: "Name of the permission",
    priority: 1,
  },
  {
    key: "roles",
    title: "Roles",
    type: "tags",
    icon: Shield,
    sortable: false,
    searchable: false,
    filterable: false,
    editable: false,
    description: "Roles associated with the permission",
    render: {
      type: "tags",
      config: { maxDisplay: 3 },
    },
    priority: 2,
  },
];
