import React from "react";
import { Shield, Package, User, DollarSign, Calendar, Hash } from 'lucide-react'

export const columns = [
  {
    key: "id",
    title: "Sale ID",
    type: "text",
    sortable: true,
    searchable: true,
    filterable: true,
    icon: Shield,
    description: "Unique sale identifier",
    priority: 1,
    editable: false,
    usedInCreate: false,
    expandedOnly: true,
  },
  {
    key: "token",
    title: "NFT",
    type: "compound",
    sortable: true,
    searchable: true,
    filterable: true,
    icon: Package,
    description: "NFT token details",
    priority: 1,
    editable: false,
    usedInCreate: false,
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
          title: "Name",
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
    key: "seller",
    title: "Seller",
    type: "compound",
    sortable: true,
    searchable: true,
    filterable: true,
    icon: User,
    description: "Seller information",
    priority: 2,
    editable: false,
    usedInCreate: false,
    sortKey: "seller.firstName",
    render: {
      type: "compound",
      config: {
        image: {
          key: "avatar",
          fallback: "/img/placeholder.svg",
          type: "image",
          title: "Avatar",
          description: "Seller's profile picture",
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
        }
      }
    }
  },
  {
    key: "buyer",
    title: "Buyer",
    type: "compound",
    sortable: true,
    searchable: true,
    filterable: true,
    icon: User,
    description: "Buyer information",
    priority: 2,
    editable: false,
    usedInCreate: false,
    sortKey: "buyer.firstName",
    render: {
      type: "compound",
      config: {
        image: {
          key: "avatar",
          fallback: "/img/placeholder.svg",
          type: "image",
          title: "Avatar",
          description: "Buyer's profile picture",
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
        }
      }
    }
  },
  {
    key: "price",
    title: "Sale Price",
    type: "number",
    sortable: true,
    searchable: false,
    filterable: true,
    icon: DollarSign,
    description: "Sale price",
    priority: 1,
    editable: false,
    usedInCreate: false,
    render: {
      type: "number",
      format: { style: "currency", currency: "USD" }
    }
  },
  {
    key: "status",
    title: "Status",
    type: "select",
    sortable: true,
    filterable: true,
    editable: false,
    usedInCreate: false,
    options: [
      { value: "PENDING", label: "Pending", color: "warning" },
      { value: "COMPLETED", label: "Completed", color: "success" },
      { value: "FAILED", label: "Failed", color: "destructive" },
      { value: "CANCELLED", label: "Cancelled", color: "muted" }
    ],
    render: {
      type: "badge",
      config: {
        variant: (value: string) => value === "COMPLETED" ? "success" : 
                           value === "PENDING" ? "warning" :
                           value === "FAILED" ? "destructive" : "muted"
      }
    },
    priority: 2,
  },
  {
    key: "createdAt",
    title: "Sale Date",
    type: "date",
    sortable: true,
    filterable: true,
    editable: false,
    usedInCreate: false,
    icon: Calendar,
    render: {
      type: "date",
      format: "MMM dd, yyyy HH:mm"
    },
    priority: 2,
  }
]; 