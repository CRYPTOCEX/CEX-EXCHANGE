import React from "react";
import { Activity, Coins, User, DollarSign, Calendar, Hash } from "lucide-react";

export const columns = [
  {
    key: "id",
    title: "ID",
    type: "text",
    sortable: true,
    searchable: true,
    filterable: true,
    description: "Unique activity identifier",
    priority: 4,
    editable: false,
    usedInCreate: false,
    expandedOnly: true,
  },
  {
    key: "type",
    title: "Activity Type",
    type: "select",
    sortable: true,
    filterable: true,
    editable: false,
    usedInCreate: false,
    icon: Activity,
    options: [
      { value: "MINT", label: "Mint", color: "green" },
      { value: "TRANSFER", label: "Transfer", color: "blue" },
      { value: "SALE", label: "Sale", color: "purple" },
      { value: "LIST", label: "List", color: "orange" },
      { value: "DELIST", label: "Delist", color: "red" },
      { value: "BID", label: "Bid", color: "yellow" },
      { value: "OFFER", label: "Offer", color: "cyan" },
      { value: "BURN", label: "Burn", color: "gray" }
    ],
    render: {
      type: "badge",
      config: {
        variant: (value) => {
          const variants = {
            MINT: "green",
            TRANSFER: "blue",
            SALE: "purple",
            LIST: "orange",
            DELIST: "red",
            BID: "yellow",
            OFFER: "cyan",
            BURN: "gray"
          };
          return variants[value] || "secondary";
        }
      }
    },
    priority: 1,
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
    key: "fromUser",
    title: "From",
    type: "compound",
    sortable: true,
    searchable: true,
    filterable: true,
    editable: false,
    usedInCreate: false,
    icon: User,
    priority: 1,
    sortKey: "fromUser.firstName",
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
    key: "toUser",
    title: "To",
    type: "compound",
    sortable: true,
    searchable: true,
    filterable: true,
    editable: false,
    usedInCreate: false,
    icon: User,
    priority: 1,
    sortKey: "toUser.firstName",
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
    title: "Price",
    type: "number",
    sortable: true,
    filterable: true,
    editable: false,
    usedInCreate: false,
    icon: DollarSign,
    description: "Transaction price",
    priority: 2,
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
    editable: false,
    usedInCreate: false,
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
    priority: 3,
    expandedOnly: true,
  },
  {
    key: "transactionHash",
    title: "TX Hash",
    type: "text",
    sortable: false,
    searchable: true,
    filterable: false,
    editable: false,
    usedInCreate: false,
    icon: Hash,
    description: "Blockchain transaction hash",
    priority: 4,
    render: {
      type: "custom",
      render: (value) => value ? (
        <code className="text-xs bg-muted px-2 py-1 rounded">
          {value.slice(0, 8)}...{value.slice(-6)}
        </code>
      ) : "—"
    },
    expandedOnly: true,
  },

  {
    key: "blockNumber",
    title: "Block",
    type: "number",
    sortable: true,
    filterable: true,
    editable: false,
    usedInCreate: false,
    description: "Blockchain block number",
    priority: 4,
    render: {
      type: "number",
      format: { notation: "compact" }
    },
    expandedOnly: true,
  },
  {
    key: "createdAt",
    title: "Timestamp",
    type: "date",
    sortable: true,
    filterable: true,
    editable: false,
    usedInCreate: false,
    icon: Calendar,
    render: {
      type: "date",
      format: "MMM dd, yyyy HH:mm:ss"
    },
    priority: 1,
  }
]; 