import React from "react";
import { HandHeart, User, DollarSign, Clock, Eye, Calendar, Tag } from "lucide-react";

export const columns = [
  {
    key: "id",
    title: "ID",
    type: "text",
    sortable: true,
    searchable: true,
    filterable: true,
    description: "Unique offer identifier",
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
    key: "offerer",
    title: "Offerer",
    type: "compound",
    sortable: true,
    searchable: true,
    filterable: true,
    editable: false,
    usedInCreate: false,
    icon: User,
    priority: 1,
    sortKey: "offerer.firstName",
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
    key: "amount",
    title: "Offer Amount",
    type: "number",
    sortable: true,
    filterable: true,
    editable: true,
    usedInCreate: true,
    icon: DollarSign,
    description: "Offer amount",
    priority: 1,
    render: {
      type: "number",
      format: { style: "currency", currency: "USD" }
    }
  },
  {
    key: "currency",
    title: "Currency",
    type: "select",
    sortable: true,
    filterable: true,
    editable: true,
    usedInCreate: true,
    options: [
      { value: "ETH", label: "ETH", color: "blue" },
      { value: "USDC", label: "USDC", color: "green" },
      { value: "USDT", label: "USDT", color: "green" },
      { value: "BNB", label: "BNB", color: "yellow" },
      { value: "MATIC", label: "MATIC", color: "purple" }
    ],
    render: {
      type: "badge",
      config: {
        variant: (value) => {
          const variants = {
            ETH: "blue",
            USDC: "green", 
            USDT: "green",
            BNB: "yellow",
            MATIC: "purple"
          };
          return variants[value] || "secondary";
        }
      }
    },
    priority: 2,
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
    options: [
      { value: "PENDING", label: "Pending", color: "secondary" },
      { value: "ACCEPTED", label: "Accepted", color: "success" },
      { value: "REJECTED", label: "Rejected", color: "destructive" },
      { value: "EXPIRED", label: "Expired", color: "outline" },
      { value: "CANCELLED", label: "Cancelled", color: "outline" }
    ],
    render: {
      type: "badge",
      config: {
        variant: (value) => {
          const variants = {
            PENDING: "secondary",
            ACCEPTED: "success",
            REJECTED: "destructive",
            EXPIRED: "outline",
            CANCELLED: "outline"
          };
          return variants[value] || "secondary";
        }
      }
    },
    priority: 1,
  },
  {
    key: "type",
    title: "Type",
    type: "select",
    sortable: true,
    filterable: true,
    editable: true,
    usedInCreate: true,
    icon: HandHeart,
    options: [
      { value: "OFFER", label: "Offer", color: "default" },
      { value: "BID", label: "Bid", color: "secondary" },
      { value: "COUNTER_OFFER", label: "Counter Offer", color: "outline" }
    ],
    render: {
      type: "badge",
      config: {
        variant: (value) => {
          const variants = {
            OFFER: "default",
            BID: "secondary",
            COUNTER_OFFER: "outline"
          };
          return variants[value] || "secondary";
        }
      }
    },
    priority: 2,
  },
  {
    key: "expiresAt",
    title: "Expires At",
    type: "date",
    sortable: true,
    filterable: true,
    editable: true,
    usedInCreate: false,
    icon: Clock,
    description: "Offer expiration time",
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