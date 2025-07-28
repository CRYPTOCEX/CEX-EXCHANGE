import React from "react";
import { ShoppingCart, Coins, User, DollarSign, Clock, Eye, Calendar, Gavel } from "lucide-react";

export const columns = [
  {
    key: "id",
    title: "ID",
    type: "text",
    sortable: true,
    searchable: true,
    filterable: true,
    description: "Unique listing identifier",
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
    icon: Coins,
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
        },
      }
    }
  },
  {
    key: "type",
    title: "Type",
    type: "select",
    sortable: true,
    filterable: true,
    editable: true,
    usedInCreate: true,
    icon: ShoppingCart,
    options: [
      { value: "FIXED_PRICE", label: "Fixed Price", color: "blue" },
      { value: "AUCTION", label: "Auction", color: "purple" },
      { value: "BUNDLE", label: "Bundle", color: "orange" }
    ],
    render: {
      type: "badge",
      config: {
        variant: (value) => {
          const variants = {
            FIXED_PRICE: "blue",
            AUCTION: "purple",
            BUNDLE: "orange"
          };
          return variants[value] || "secondary";
        }
      }
    },
    priority: 1,
  },
  {
    key: "price",
    title: "Price",
    type: "number",
    sortable: true,
    filterable: true,
    editable: true,
    usedInCreate: true,
    icon: DollarSign,
    description: "Listing price",
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
    key: "reservePrice",
    title: "Reserve Price",
    type: "number",
    sortable: true,
    filterable: true,
    editable: true,
    usedInCreate: false,
    description: "Minimum auction price",
    priority: 4,
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
    priority: 4,
    render: {
      type: "number",
      format: { style: "currency", currency: "USD" }
    },
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
      { value: "ACTIVE", label: "Active", color: "success" },
      { value: "SOLD", label: "Sold", color: "blue" },
      { value: "CANCELLED", label: "Cancelled", color: "secondary" },
      { value: "EXPIRED", label: "Expired", color: "destructive" }
    ],
    render: {
      type: "badge",
      config: {
        variant: (value) => {
          const variants = {
            ACTIVE: "success",
            SOLD: "blue",
            CANCELLED: "secondary",
            EXPIRED: "destructive"
          };
          return variants[value] || "secondary";
        }
      }
    },
    priority: 1,
  },
  {
    key: "startTime",
    title: "Start Time",
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
    key: "endTime",
    title: "End Time",
    type: "date",
    sortable: true,
    filterable: true,
    editable: true,
    usedInCreate: false,
    icon: Clock,
    description: "Auction end time",
    render: {
      type: "date",
      format: "MMM dd, yyyy HH:mm"
    },
    priority: 2,
  },
  {
    key: "views",
    title: "Views",
    type: "number",
    sortable: true,
    filterable: true,
    editable: false,
    usedInCreate: false,
    icon: Eye,
    description: "Listing views",
    priority: 4,
    render: {
      type: "number",
      format: { notation: "compact" }
    },
    expandedOnly: true,
  },
  {
    key: "likes",
    title: "Likes",
    type: "number",
    sortable: true,
    filterable: true,
    editable: false,
    usedInCreate: false,
    description: "Number of likes",
    priority: 4,
    render: {
      type: "number",
      format: { notation: "compact" }
    },
    expandedOnly: true,
  },
  {
    key: "currentBid",
    title: "Current Bid",
    type: "number",
    sortable: true,
    filterable: true,
    editable: false,
    usedInCreate: false,
    icon: Gavel,
    description: "Highest current bid",
    priority: 2,
    render: {
      type: "number",
      format: { style: "currency", currency: "USD" }
    }
  },
  {
    key: "bidCount",
    title: "Bids",
    type: "number",
    sortable: true,
    filterable: true,
    editable: false,
    usedInCreate: false,
    description: "Number of bids",
    priority: 4,
    render: {
      type: "number",
      format: { notation: "compact" }
    },
    expandedOnly: true,
  },
  {
    key: "createdAt",
    title: "Listed",
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
  }
]; 