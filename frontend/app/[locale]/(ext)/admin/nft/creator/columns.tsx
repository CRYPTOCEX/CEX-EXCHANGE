import React from "react";
import { Users, Shield, Package, DollarSign, TrendingUp, Eye, User } from "lucide-react";

export const columns = [
  {
    key: "id",
    title: "ID",
    type: "string",
    sortable: true,
    filterable: false,
    editable: false,
    usedInCreate: false,
    description: "Unique creator identifier",
    priority: 3,
    render: {
      type: "id"
    },
    expandedOnly: true,
  },
  {
    key: "user",
    title: "Creator",
    type: "compound",
    sortable: true,
    searchable: true,
    filterable: true,
    editable: false,
    usedInCreate: false,
    icon: User,
    priority: 1,
    sortKey: "user.firstName",
    render: {
      type: "compound",
      config: {
        image: {
          key: "avatar",
          fallback: "/img/placeholder.svg",
          type: "image",
          title: "Avatar",
          description: "Creator's profile picture",
          editable: false,
          usedInCreate: false,
        },
        primary: {
          key: ["firstName", "lastName"],
          title: ["First Name", "Last Name"],
          editable: false,
          usedInCreate: false,
          icon: User,
        },
        secondary: {
          key: "email",
          title: "Email",
          editable: false,
          usedInCreate: false,
        },
      }
    }
  },
  {
    key: "displayName",
    title: "Display Name",
    type: "string",
    sortable: true,
    filterable: true,
    editable: true,
    usedInCreate: true,
    icon: Users,
    description: "Creator's public display name",
    priority: 2,
    render: {
      type: "text"
    }
  },
  {
    key: "isVerified",
    title: "Verified",
    type: "boolean",
    sortable: true,
    filterable: true,
    editable: true,
    usedInCreate: false,
    icon: Shield,
    description: "Creator verification status",
    priority: 1,
    render: {
      type: "badge",
      config: {
        true: { label: "Verified", variant: "default", icon: "CheckCircle" },
        false: { label: "Unverified", variant: "outline", icon: "XCircle" }
      }
    }
  },
  {
    key: "verificationTier",
    title: "Tier",
    type: "enum",
    sortable: true,
    filterable: true,
    editable: true,
    usedInCreate: false,
    icon: Shield,
    description: "Verification tier level",
    priority: 2,
    render: {
      type: "badge",
      config: {
        BRONZE: { label: "Bronze", variant: "secondary", icon: "Award" },
        SILVER: { label: "Silver", variant: "default", icon: "Award" },
        GOLD: { label: "Gold", variant: "default", icon: "Award" },
        PLATINUM: { label: "Platinum", variant: "default", icon: "Crown" }
      }
    },
    expandedOnly: true,
  },
  {
    key: "totalItems",
    title: "NFTs",
    type: "number",
    sortable: true,
    filterable: true,
    editable: false,
    usedInCreate: false,
    icon: Package,
    description: "Total NFTs created",
    priority: 1,
    render: {
      type: "number",
      format: { notation: "compact" }
    }
  },
  {
    key: "totalSales",
    title: "Sales",
    type: "number",
    sortable: true,
    filterable: true,
    editable: false,
    usedInCreate: false,
    icon: TrendingUp,
    description: "Total number of sales",
    priority: 2,
    render: {
      type: "number",
      format: { notation: "compact" }
    }
  },
  {
    key: "totalVolume",
    title: "Volume",
    type: "number",
    sortable: true,
    filterable: true,
    editable: false,
    usedInCreate: false,
    icon: DollarSign,
    description: "Total sales volume",
    priority: 1,
    render: {
      type: "number",
      format: { style: "currency", currency: "USD" }
    }
  },
  {
    key: "floorPrice",
    title: "Floor Price",
    type: "number",
    sortable: true,
    filterable: true,
    editable: false,
    usedInCreate: false,
    icon: DollarSign,
    description: "Lowest priced NFT",
    priority: 3,
    render: {
      type: "number",
      format: { style: "currency", currency: "USD" }
    },
    expandedOnly: true,
  },
  {
    key: "profilePublic",
    title: "Public Profile",
    type: "boolean",
    sortable: true,
    filterable: true,
    editable: true,
    usedInCreate: false,
    icon: Eye,
    description: "Profile visibility status",
    priority: 3,
    render: {
      type: "badge",
      config: {
        true: { label: "Public", variant: "default", icon: "Eye" },
        false: { label: "Private", variant: "outline", icon: "EyeOff" }
      }
    },
    expandedOnly: true,
  },
  {
    key: "bio",
    title: "Bio",
    type: "text",
    sortable: false,
    filterable: false,
    editable: true,
    usedInCreate: false,
    description: "Creator biography",
    priority: 4,
    render: {
      type: "text",
      truncate: 100
    },
    expandedOnly: true,
  },
  {
    key: "createdAt",
    title: "Joined",
    type: "date",
    sortable: true,
    filterable: true,
    editable: false,
    usedInCreate: false,
    icon: Users,
    description: "Account creation date",
    priority: 2,
    render: {
      type: "date",
      format: "MMM dd, yyyy"
    }
  },
];