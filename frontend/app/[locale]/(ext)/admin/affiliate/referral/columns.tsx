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
    description: "Unique referral identifier",
    priority: 3,
    expandedOnly: true, // less critical
  },
  {
    key: "referrer",
    idKey: "id",
    labelKey: "name",
    title: "Referrer",
    type: "select",
    baseKey: "referrerId",
    sortKey: "referrer.firstName",
    expandedTitle: (row) => `Referrer: ${row.id}`,
    icon: User,
    sortable: true,
    searchable: true,
    filterable: true,
    editable: true,
    usedInCreate: true,
    description: "User who referred",
    apiEndpoint: {
      url: "/api/admin/crm/user/options",
      method: "GET",
    },
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
          usedInCreate: false,
          sortable: true,
          searchable: true,
          filterable: true,
          sortKey: "firstName",
        },
        secondary: {
          key: "email",
          title: "Email",
          editable: false,
          usedInCreate: false,
          sortable: true,
          searchable: true,
          filterable: true,
          sortKey: "email",
        },
      },
    },
    priority: 1,
  },
  {
    key: "referred",
    idKey: "id",
    labelKey: "name",
    title: "Referred",
    type: "select",
    baseKey: "referredId",
    sortKey: "referred.firstName",
    expandedTitle: (row) => `Referred: ${row.id}`,
    icon: User,
    sortable: true,
    searchable: true,
    filterable: true,
    editable: true,
    usedInCreate: true,
    apiEndpoint: {
      url: "/api/admin/crm/user/options",
      method: "GET",
    },
    description: "User who was referred",
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
          usedInCreate: false,
          sortable: true,
          searchable: true,
          filterable: true,
          sortKey: "firstName",
        },
        secondary: {
          key: "email",
          title: "Email",
          editable: false,
          usedInCreate: false,
          sortable: true,
          searchable: true,
          filterable: true,
          sortKey: "email",
        },
      },
    },
    priority: 1,
  },
  {
    key: "status",
    title: "Status",
    type: "select",
    sortable: true,
    searchable: true,
    filterable: true,
    editable: true,
    usedInCreate: true,
    description: "Referral status",
    options: [
      { value: "PENDING", label: "Pending" },
      { value: "ACTIVE", label: "Active" },
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
            case "ACTIVE":
              return "success";
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
    description: "Creation date",
    render: { type: "date", format: "PPP" },
    priority: 3,
    expandedOnly: true, // less important
  },
];
