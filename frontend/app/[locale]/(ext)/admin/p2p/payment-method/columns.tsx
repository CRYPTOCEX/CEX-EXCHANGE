import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export const columns = [
  {
    key: "paymentMethod",
    title: "Payment Method",
    type: "compound",
    priority: 1,
    filterable: true,
    sortable: true,
    searchable: true,
    render: {
      type: "compound",
      config: {
        image: {
          key: "icon",
          fallback: "/img/placeholder.svg",
          type: "text",
          title: "Icon",
          description: "Icon URL or icon class",
          editable: true,
          usedInCreate: true,
          renderImage: (value: string, row: any) => (
            <Avatar className="h-10 w-10">
              <AvatarImage src={value} alt={row.name} />
              <AvatarFallback className="text-xs">
                {row.name?.charAt(0)?.toUpperCase() || "?"}
              </AvatarFallback>
            </Avatar>
          ),
        },
        primary: {
          key: "name",
          title: "Name",
          description: "Payment method name",
          editable: true,
          usedInCreate: true,
        },
        secondary: {
          key: "description",
          title: "Description",
          editable: true,
          usedInCreate: true,
          render: (value: string) => (
            <span className="text-sm text-muted-foreground line-clamp-1">
              {value || "No description"}
            </span>
          ),
        },
      },
    },
  },
  {
    key: "instructions",
    title: "Instructions",
    type: "textarea",
    priority: 4,
    editable: true,
    usedInCreate: true,
    description: "Instructions for using this payment method",
    expandedOnly: true,
  },
  {
    key: "isGlobal",
    title: "Type",
    type: "boolean",
    priority: 2,
    filterable: true,
    editable: true,
    usedInCreate: true,
    description: "Make this payment method available to all users",
    render: {
      type: "custom",
      render: (value: boolean) => {
        const isGlobal = value === true;
        return (
          <Badge variant={isGlobal ? "default" : "outline"}>
            {isGlobal ? "Global" : "User"}
          </Badge>
        );
      },
    },
  },
  {
    key: "processingTime",
    title: "Processing Time",
    type: "text",
    priority: 4,
    editable: true,
    usedInCreate: true,
    description: "Expected processing time",
    render: {
      type: "custom",
      render: (value: string) => (
        <span className="text-sm">
          {value || <span className="text-muted-foreground">Not specified</span>}
        </span>
      ),
    },
  },
  {
    key: "fees",
    title: "Fees",
    type: "text",
    priority: 5,
    editable: true,
    usedInCreate: true,
    description: "Fee information",
    expandedOnly: true,
  },
  {
    key: "available",
    title: "Status",
    type: "boolean",
    priority: 2,
    filterable: true,
    editable: true,
    usedInCreate: true,
    description: "Whether the payment method is currently available",
    render: {
      type: "custom",
      render: (value: boolean) => (
        <Badge variant={value ? "default" : "destructive"}>
          {value ? "Active" : "Inactive"}
        </Badge>
      ),
    },
  },
  {
    key: "popularityRank",
    title: "Sort Order",
    type: "number",
    priority: 5,
    sortable: true,
    editable: true,
    usedInCreate: true,
    description: "Lower numbers appear first",
    render: {
      type: "custom",
      render: (value: number) => (
        <span className="text-sm font-mono">
          {value ?? 0}
        </span>
      ),
    },
  },
  {
    key: "user",
    title: "Created By",
    type: "compound",
    priority: 3,
    expandedOnly: true,
    render: {
      type: "compound",
      config: {
        primary: {
          key: ["firstName", "lastName"],
          title: ["First Name", "Last Name"],
          description: ["User's first name", "User's last name"],
          editable: false,
          usedInCreate: false,
        },
        secondary: {
          key: "email",
          title: "Email",
          editable: false,
          usedInCreate: false,
        },
      },
    },
  },
  {
    key: "createdAt",
    title: "Created",
    type: "date",
    priority: 6,
    sortable: true,
    editable: false,
    usedInCreate: false,
  },
];