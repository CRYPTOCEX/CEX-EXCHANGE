import React from "react";
import {
  User,
  Mail,
  CalendarIcon,
  ToggleLeft,
  Shield,
  Clock,
  CheckSquare,
  Phone,
  BadgeIcon,
  Smartphone,
} from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

export const columns: ColumnDefinition[] = [
  {
    key: "user",
    disablePrefixSort: true,
    title: "User Details",
    expandedTitle: (row) => `User Profile: ${row.firstName || ''} ${row.lastName || ''}`,
    type: "compound",
    sortable: true,
    searchable: true,
    filterable: true,
    priority: 1,
    icon: User,
    render: {
      type: "compound",
      config: {
        image: {
          key: "avatar",
          fallback: "/img/placeholder.svg",
          type: "image",
          title: "Avatar",
          description: "User's profile picture",
          editable: true,
          usedInCreate: true,
          filterable: false,
          sortable: false,
        },
        primary: {
          key: ["firstName", "lastName"],
          title: ["First Name", "Last Name"],
          description: ["User's first name", "User's last name"],
          editable: true,
          usedInCreate: true,
          sortable: true,
          sortKey: "firstName",
          icon: User,
          validation: (value) => {
            if (!value) return "Name is required";
            if (value.length < 2)
              return "Name must be at least 2 characters long";
            return null;
          },
        },
        secondary: {
          key: "email",
          icon: Mail,
          type: "email",
          title: "Email Address",
          description: "User's email address",
          editable: true,
          usedInCreate: true,
          sortable: true,
          validation: (value) => {
            if (!value) return "Email is required";
            if (!/\S+@\S+\.\S+/.test(value)) return "Invalid email format";
            return null;
          },
        },
        metadata: [
          {
            key: "lastLogin",
            icon: Clock,
            type: "date",
            title: "Last Login",
            description: "User's last login date",
            sortable: true,
            render: (value) => value ? format(new Date(value), "MMM d, yyyy HH:mm") : "Never",
          },
          {
            key: "role",
            idKey: "id",
            labelKey: "name",
            baseKey: "roleId",
            icon: Shield,
            type: "select",
            title: "Role",
            description: "User's role in the system",
            editable: true,
            usedInCreate: true,
            sortable: true,
            sortKey: "role.name",
            apiEndpoint: {
              url: "/api/admin/crm/role/options",
              method: "GET",
            },
            render: (value) => value?.name || "No Role",
          },
        ],
      },
    },
  },

  // Contact Information
  {
    key: "phone",
    title: "Phone Number",
    type: "text",
    icon: Phone,
    sortable: true,
    searchable: true,
    filterable: true,
    editable: true,
    usedInCreate: true,
    priority: 2,
    description: "User's phone number",
    render: {
      type: "custom",
      render: (value: string) => {
        return value || "Not Provided";
      },
    },
  },
  {
    key: "phoneVerified",
    title: "Phone Verified",
    type: "boolean",
    icon: Smartphone,
    sortable: true,
    filterable: true,
    editable: true,
    usedInCreate: false,
    priority: 3,
    description: "Whether the user's phone has been verified",
  },

  // Account Status & Security
  {
    key: "status",
    title: "Account Status",
    type: "select",
    icon: ToggleLeft,
    sortable: true,
    searchable: true,
    filterable: true,
    editable: true,
    usedInCreate: true,
    priority: 1,
    description: "User's account status",
    render: {
      type: "custom",
      render: (value: any, row: any) => {
        const isBlocked = row.blocks?.some((block: any) => block.isActive === true) || false;
        const variant = (() => {
          switch (value?.toUpperCase()) {
            case "ACTIVE":
              return "success";
            case "INACTIVE":
              return "muted";
            case "SUSPENDED":
              return "warning";
            case "BANNED":
              return "danger";
            default:
              return "default";
          }
        })();
        
        return (
          <div className="flex items-center space-x-2">
            <Badge
              variant={variant as any}
              className="capitalize"
            >
              {value?.toLowerCase()}
            </Badge>
            {isBlocked && (
              <Shield className="h-4 w-4 text-red-500" />
            )}
          </div>
        );
      },
    },
    options: [
      { value: "ACTIVE", label: "Active" },
      { value: "INACTIVE", label: "Inactive" },
      { value: "SUSPENDED", label: "Suspended" },
      { value: "BANNED", label: "Banned" },
    ],
  },
  {
    key: "emailVerified",
    title: "Email Verified",
    type: "boolean",
    icon: CheckSquare,
    sortable: true,
    filterable: true,
    editable: true,
    usedInCreate: true,
    priority: 2,
    description: "Whether the user's email has been verified",
  },

  // KYC Status - Simplified
  {
    key: "kyc.status",
    title: "KYC Status",
    type: "text",
    icon: BadgeIcon,
    sortable: true,
    filterable: true,
    editable: false,
    usedInCreate: false,
    priority: 2,
    description: "KYC verification status",
    render: {
      type: "custom",
      render: (value: string, row: any) => {
        if (!row.kyc) {
          return (
            <Badge variant="secondary" className="text-xs">
              Not Submitted
            </Badge>
          );
        }
        
        const statusValue = value?.toUpperCase();
        let displayText = value || "Not Submitted";
        let variant: "default" | "secondary" | "destructive" | "outline" = "secondary";
        
        switch (statusValue) {
          case "APPROVED":
            variant = "default";
            break;
          case "PENDING":
            variant = "outline";
            break;
          case "REJECTED":
            variant = "destructive";
            break;
          case "ADDITIONAL_INFO_REQUIRED":
            variant = "secondary";
            displayText = "Additional Info Required";
            break;
        }
        
        return (
          <Badge variant={variant} className="text-xs">
            {displayText}
          </Badge>
        );
      },
    },
  },

  // Two-Factor Authentication Status - Simplified
  {
    key: "twoFactor.enabled",
    title: "2FA Status",
    type: "boolean",
    icon: Shield,
    sortable: false,
    filterable: false,
    editable: false,
    usedInCreate: false,
    priority: 3,
    description: "Two-factor authentication status",
    render: {
      type: "custom",
      render: (value: boolean, row: any) => {
        const isEnabled = row.twoFactor?.enabled || false;
        return (
          <Badge variant={isEnabled ? "default" : "destructive"} className="text-xs">
            {isEnabled ? "Enabled" : "Disabled"}
          </Badge>
        );
      },
    },
  },

  // Timestamps
  {
    key: "createdAt",
    title: "Registration Date",
    type: "date",
    icon: CalendarIcon,
    sortable: true,
    searchable: true,
    filterable: true,
    description: "Date when the user registered",
    render: {
      type: "date",
      format: "PPP",
    },
    priority: 2,
  },
];
