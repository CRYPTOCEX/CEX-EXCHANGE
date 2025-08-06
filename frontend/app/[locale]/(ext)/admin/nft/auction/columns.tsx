import React from "react";
import { Gavel, Tag, DollarSign, Clock, Calendar, TrendingUp, User } from "lucide-react";

export const columns = [
  {
    key: "id",
    title: "ID",
    type: "text",
    sortable: true,
    searchable: true,
    filterable: true,
    description: "Unique auction identifier",
    priority: 4,
    editable: false,
    usedInCreate: false,
    expandedOnly: true,
  },
  {
    key: "token",
    title: "NFT Token",
    type: "compound",
    sortable: true,
    searchable: true,
    filterable: true,
    editable: false,
    usedInCreate: false,
    icon: Tag,
    priority: 1,
    sortKey: "token.name",
    render: {
      type: "compound",
      config: {
        image: {
          key: "image",
          fallback: "/img/placeholder.svg",
          type: "image",
          title: "Token Image",
          description: "NFT token image",
          editable: false,
          usedInCreate: false,
        },
        primary: {
          key: "name",
          title: "Token",
          editable: false,
          usedInCreate: false,
        },
        secondary: {
          key: "tokenId",
          title: "Token ID",
          editable: false,
          usedInCreate: false,
        },
        metadata: [
          { key: "collection.name", title: "Collection", type: "text" }
        ]
      }
    }
  },
  {
    key: "status",
    title: "Status",
    type: "select",
    sortable: true,
    filterable: true,
    editable: true,
    usedInCreate: true,
    icon: Gavel,
    options: [
      { value: "ACTIVE", label: "Active", color: "success" },
      { value: "ENDED", label: "Ended", color: "secondary" },
      { value: "CANCELLED", label: "Cancelled", color: "destructive" },
      { value: "PENDING", label: "Pending", color: "outline" }
    ],
    render: {
      type: "badge",
      config: {
        variant: (value) => {
          const variants = {
            ACTIVE: "success",
            ENDED: "secondary",
            CANCELLED: "destructive",
            PENDING: "outline"
          };
          return variants[value] || "secondary";
        }
      }
    },
    priority: 1,
  },
  {
    key: "seller",
    title: "Seller",
    type: "compound",
    sortable: true,
    searchable: true,
    filterable: true,
    editable: false,
    usedInCreate: false,
    icon: User,
    priority: 1,
    sortKey: "seller.firstName",
    render: {
      type: "compound",
      config: {
        image: {
          key: "avatar",
          fallback: "/img/placeholder.svg",
          type: "image",
          title: "Avatar",
          description: "User's profile picture",
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
    key: "price",
    title: "Starting Price",
    type: "number",
    sortable: true,
    filterable: true,
    editable: true,
    usedInCreate: true,
    icon: DollarSign,
    description: "Auction starting price",
    priority: 1,
    render: {
      type: "number",
      format: { style: "currency", currency: "USD" }
    }
  },
  {
    key: "reservePrice",
    title: "Reserve Price",
    type: "number",
    sortable: true,
    filterable: true,
    editable: true,
    usedInCreate: true,
    icon: TrendingUp,
    description: "Minimum auction price",
    priority: 2,
    render: {
      type: "number",
      format: { style: "currency", currency: "USD" }
    },
    expandedOnly: true,
  },
  {
    key: "buyNowPrice",
    title: "Buy Now Price",
    type: "number",
    sortable: true,
    filterable: true,
    editable: true,
    usedInCreate: false,
    description: "Instant purchase price",
    priority: 3,
    render: {
      type: "number",
      format: { style: "currency", currency: "USD" }
    },
    expandedOnly: true,
  },
  {
    key: "endTime",
    title: "Ends At",
    type: "date",
    sortable: true,
    filterable: true,
    editable: true,
    usedInCreate: true,
    icon: Clock,
    description: "Auction end time",
    render: {
      type: "date",
      format: "MMM dd, yyyy HH:mm"
    },
    priority: 2,
  },
  {
    key: "startTime",
    title: "Starts At",
    type: "date",
    sortable: true,
    filterable: true,
    editable: true,
    usedInCreate: false,
    icon: Clock,
    description: "Auction start time",
    render: {
      type: "date",
      format: "MMM dd, yyyy HH:mm"
    },
    priority: 3,
    expandedOnly: true,
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
    priority: 3,
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