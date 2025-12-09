import {
  Hash,
  User,
  Mail,
  Globe,
  Building2,
  CheckCircle2,
  Shield,
  CalendarIcon,
  DollarSign,
  ToggleLeft,
} from "lucide-react";

export const columns: ColumnDefinition[] = [
  {
    key: "id",
    title: "ID",
    type: "text",
    icon: Hash,
    sortable: true,
    searchable: true,
    filterable: true,
    description: "Unique identifier for the merchant",
    priority: 1,
    expandedOnly: true,
  },
  {
    key: "user",
    title: "Owner",
    type: "compound",
    icon: User,
    sortable: true,
    searchable: true,
    filterable: true,
    description: "The user who owns this merchant account",
    priority: 1,
    render: {
      type: "compound",
      config: {
        image: {
          key: "avatar",
          fallback: "/img/placeholder.svg",
          type: "image",
          title: "Avatar",
          description: "User's avatar",
          editable: false,
          usedInCreate: false,
        },
        primary: {
          key: ["firstName", "lastName"],
          title: ["First Name", "Last Name"],
          description: ["User's first name", "User's last name"],
          editable: false,
          usedInCreate: false,
          icon: User,
        },
        secondary: {
          key: "email",
          title: "Email",
          icon: Mail,
          editable: false,
          usedInCreate: false,
        },
      },
    },
  },
  {
    key: "name",
    title: "Business Name",
    type: "text",
    icon: Building2,
    sortable: true,
    searchable: true,
    filterable: true,
    editable: true,
    usedInCreate: true,
    description: "Merchant business name",
    priority: 1,
  },
  {
    key: "email",
    title: "Business Email",
    type: "text",
    icon: Mail,
    sortable: true,
    searchable: true,
    filterable: true,
    editable: true,
    usedInCreate: true,
    description: "Merchant business email",
  },
  {
    key: "website",
    title: "Website",
    type: "text",
    icon: Globe,
    sortable: false,
    searchable: false,
    filterable: false,
    editable: true,
    usedInCreate: false,
    description: "Merchant website URL",
    expandedOnly: true,
  },
  {
    key: "status",
    title: "Status",
    type: "select",
    icon: CheckCircle2,
    sortable: true,
    searchable: true,
    filterable: true,
    editable: true,
    usedInCreate: false,
    description: "Merchant account status",
    render: {
      type: "badge",
      config: {
        withDot: true,
        variant: (value: string) => {
          switch (value) {
            case "ACTIVE":
              return "success";
            case "PENDING":
              return "warning";
            case "SUSPENDED":
              return "danger";
            case "REJECTED":
              return "muted";
            default:
              return "default";
          }
        },
      },
    },
    options: [
      { value: "PENDING", label: "Pending" },
      { value: "ACTIVE", label: "Active" },
      { value: "SUSPENDED", label: "Suspended" },
      { value: "REJECTED", label: "Rejected" },
    ],
  },
  {
    key: "verificationStatus",
    title: "Verification",
    type: "select",
    icon: Shield,
    sortable: true,
    searchable: true,
    filterable: true,
    editable: true,
    usedInCreate: false,
    description: "Merchant verification status",
    render: {
      type: "badge",
      config: {
        withDot: true,
        variant: (value: string) => {
          switch (value) {
            case "VERIFIED":
              return "success";
            case "PENDING":
              return "warning";
            case "UNVERIFIED":
              return "muted";
            case "REJECTED":
              return "danger";
            default:
              return "default";
          }
        },
      },
    },
    options: [
      { value: "UNVERIFIED", label: "Unverified" },
      { value: "PENDING", label: "Pending" },
      { value: "VERIFIED", label: "Verified" },
      { value: "REJECTED", label: "Rejected" },
    ],
  },
  {
    key: "testMode",
    title: "Test Mode",
    type: "boolean",
    icon: ToggleLeft,
    sortable: true,
    searchable: false,
    filterable: true,
    editable: true,
    usedInCreate: false,
    description: "Whether merchant is in test mode",
    render: {
      type: "badge",
      config: {
        withDot: false,
        variant: (value: boolean) => (value ? "warning" : "success"),
        transform: (value: boolean) => (value ? "Test Mode" : "Live Mode"),
      },
    },
  },
  {
    key: "feePercentage",
    title: "Fee %",
    type: "number",
    icon: DollarSign,
    sortable: true,
    searchable: false,
    filterable: false,
    editable: true,
    usedInCreate: false,
    description: "Transaction fee percentage",
    expandedOnly: true,
  },
  {
    key: "createdAt",
    title: "Created At",
    type: "date",
    icon: CalendarIcon,
    sortable: true,
    searchable: false,
    filterable: true,
    description: "Date when the merchant was created",
    render: {
      type: "date",
      format: "PPP",
    },
    priority: 3,
  },
];
