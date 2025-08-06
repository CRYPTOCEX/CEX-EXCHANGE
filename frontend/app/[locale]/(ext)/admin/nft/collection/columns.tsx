import React from "react";
import { Package, User, Shield, TrendingUp, Eye, Calendar } from "lucide-react";

export const columns = [
  {
    key: "id",
    title: "ID",
    type: "text",
    sortable: true,
    searchable: true,
    filterable: true,
    icon: Shield,
    description: "Unique collection identifier",
    priority: 4,
    editable: false,
    usedInCreate: false,
    expandedOnly: true,
  },
  {
    key: "collection",
    title: "Collection",
    type: "compound",
    sortable: true,
    searchable: true,
    filterable: true,
    editable: true,
    usedInCreate: true,
    icon: Package,
    priority: 1,
    sortKey: "name",
    render: {
      type: "compound",
      config: {
        image: {
          key: "logoImage",
          fallback: "/img/placeholder.svg",
          type: "image",
          title: "Logo",
          description: "Collection logo",
          editable: true,
          usedInCreate: true,
        },
        primary: {
          key: "name",
          title: "Collection Name",
          description: "Collection display name",
          editable: true,
          usedInCreate: true,
          icon: Package,
    validation: (value) => value?.length < 2 ? "Name too short" : null,
  },
        secondary: {
    key: "symbol",
    title: "Symbol",
          description: "Collection symbol/ticker",
    editable: true,
    usedInCreate: true,
        },
      }
    }
  },
  {
    key: "creator",
    title: "Creator",
    type: "compound",
    sortable: true,
    searchable: true,
    filterable: true,
    editable: false,
    usedInCreate: false,
    icon: User,
    priority: 2,
    sortKey: "creator.firstName",
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
          description: ["Creator's first name", "Creator's last name"],
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
    key: "chain",
    title: "Blockchain",
    type: "select",
    sortable: true,
    filterable: true,
    editable: true,
    usedInCreate: true,
    options: [
      { value: "ETH", label: "Ethereum", color: "blue" },
      { value: "BSC", label: "BSC", color: "yellow" },
      { value: "POLYGON", label: "Polygon", color: "purple" },
      { value: "ARBITRUM", label: "Arbitrum", color: "blue" },
      { value: "OPTIMISM", label: "Optimism", color: "red" }
    ],
    render: {
      type: "badge",
      config: {
        variant: (value) => {
          const colors = { ETH: "blue", BSC: "yellow", POLYGON: "purple", ARBITRUM: "blue", OPTIMISM: "red" };
          return colors[value] || "default";
        }
      }
    },
    priority: 3,
    expandedOnly: true,
  },
  {
    key: "standard",
    title: "Standard",
    type: "select",
    sortable: true,
    filterable: true,
    editable: true,
    usedInCreate: true,
    options: [
      { value: "ERC721", label: "ERC-721", color: "blue" },
      { value: "ERC1155", label: "ERC-1155", color: "purple" }
    ],
    render: {
      type: "badge",
      config: {
        variant: (value) => value === "ERC721" ? "blue" : "purple"
      }
    },
    priority: 4,
    expandedOnly: true,
  },
  {
    key: "totalSupply",
    title: "Supply",
    type: "number",
    sortable: true,
    filterable: true,
    editable: true,
    usedInCreate: true,
    description: "Total number of NFTs",
    priority: 3,
    render: {
      type: "number",
      format: { notation: "compact" }
    },
    expandedOnly: true,
  },
  {
    key: "volumeTraded",
    title: "Volume",
    type: "number",
    sortable: true,
    filterable: true,
    editable: false,
    usedInCreate: false,
    icon: TrendingUp,
    description: "Total trading volume",
    priority: 2,
    render: {
      type: "custom",
      render: (value) => {
        if (value === null || value === undefined || isNaN(value)) {
          return <span className="text-muted-foreground">—</span>;
        }
        return new Intl.NumberFormat('en-US', { 
          style: 'currency', 
          currency: 'USD' 
        }).format(value);
      }
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
    description: "Current floor price",
    priority: 2,
    render: {
      type: "custom",
      render: (value) => {
        if (value === null || value === undefined || isNaN(value)) {
          return <span className="text-muted-foreground">—</span>;
        }
        return new Intl.NumberFormat('en-US', { 
          style: 'currency', 
          currency: 'USD' 
        }).format(value);
      }
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
    description: "Collection verification status",
    priority: 1,
    render: {
      type: "badge",
      config: {
        variant: (value) => value ? "success" : "secondary",
        text: (value) => value ? "Verified" : "Unverified"
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
    options: [
      { value: "DRAFT", label: "Draft", color: "secondary" },
      { value: "PENDING", label: "Pending", color: "warning" },
      { value: "ACTIVE", label: "Active", color: "success" },
      { value: "INACTIVE", label: "Inactive", color: "secondary" },
      { value: "SUSPENDED", label: "Suspended", color: "destructive" }
    ],
    render: {
      type: "badge",
      config: {
        variant: (value) => {
          const variants = {
            DRAFT: "secondary",
            PENDING: "warning", 
            ACTIVE: "success",
            INACTIVE: "secondary",
            SUSPENDED: "destructive"
          };
          return variants[value] || "secondary";
        }
      }
    },
    priority: 1,
  },
  {
    key: "royaltyPercentage",
    title: "Royalty %",
    type: "number",
    sortable: true,
    filterable: true,
    editable: true,
    usedInCreate: true,
    description: "Creator royalty percentage",
    priority: 4,
    render: {
      type: "custom",
      render: (value) => {
        if (value === null || value === undefined || isNaN(value)) {
          return <span className="text-muted-foreground">—</span>;
        }
        return `${parseFloat(value).toFixed(2)}%`;
      }
    },
    expandedOnly: true,
  },
  {
    key: "mintPrice",
    title: "Mint Price",
    type: "number",
    sortable: true,
    filterable: true,
    editable: true,
    usedInCreate: true,
    description: "Token mint price",
    priority: 4,
    render: {
      type: "custom",
      render: (value, row) => {
        if (value === null || value === undefined || isNaN(value)) {
          return <span className="text-muted-foreground">—</span>;
        }
        const currency = row.currency || 'USD';
        return `${parseFloat(value).toFixed(4)} ${currency}`;
      }
    },
    expandedOnly: true,
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
    priority: 4,
    expandedOnly: true,
  },
  {
    key: "contractAddress",
    title: "Contract Address",
    type: "text",
    sortable: false,
    searchable: true,
    filterable: false,
    editable: true,
    usedInCreate: false,
    description: "Smart contract address",
    priority: 4,
    render: {
      type: "custom",
      render: (value) => value ? (
        <code className="text-xs bg-muted px-2 py-1 rounded">
          {value.slice(0, 8)}...{value.slice(-6)}
        </code>
      ) : <span className="text-muted-foreground">—</span>
    },
    expandedOnly: true,
  },
  {
    key: "network",
    title: "Network",
    type: "select",
    sortable: true,
    filterable: true,
    editable: true,
    usedInCreate: true,
    options: [
      { value: "mainnet", label: "Mainnet", color: "success" },
      { value: "testnet", label: "Testnet", color: "warning" }
    ],
    render: {
      type: "badge",
      config: {
        variant: (value) => value === "mainnet" ? "success" : "warning"
      }
    },
    priority: 4,
    expandedOnly: true,
  },
  {
    key: "maxSupply",
    title: "Max Supply",
      type: "number",
    sortable: true,
    filterable: true,
    editable: true,
    usedInCreate: true,
    description: "Maximum token supply",
    priority: 4,
    render: {
      type: "custom",
      render: (value) => {
        if (value === null || value === undefined || isNaN(value)) {
          return <span className="text-muted-foreground">Unlimited</span>;
        }
        return new Intl.NumberFormat('en-US', { notation: 'compact' }).format(value);
      }
    },
    expandedOnly: true,
  },
  {
    key: "isLazyMinted",
    title: "Lazy Minted",
    type: "boolean",
    sortable: true,
    filterable: true,
    editable: true,
    usedInCreate: true,
    description: "Uses lazy minting",
    priority: 4,
    render: {
      type: "badge",
      config: {
        variant: (value) => value ? "blue" : "secondary",
        text: (value) => value ? "Lazy" : "Pre-minted"
      }
    },
    expandedOnly: true,
  },
  {
    key: "royaltyAddress",
    title: "Royalty Address",
    type: "text",
    sortable: false,
    searchable: true,
    filterable: false,
    editable: true,
    usedInCreate: false,
    description: "Royalty recipient address",
    priority: 4,
    render: {
      type: "custom",
      render: (value) => value ? (
        <code className="text-xs bg-muted px-2 py-1 rounded">
          {value.slice(0, 8)}...{value.slice(-6)}
        </code>
      ) : <span className="text-muted-foreground">—</span>
    },
    expandedOnly: true,
  },
  {
    key: "website",
    title: "Website",
    type: "text",
    sortable: false,
    searchable: false,
    filterable: false,
    editable: true,
    usedInCreate: false,
    description: "Project website",
    priority: 4,
    render: {
      type: "custom",
      render: (value) => value ? (
        <a href={value} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-xs">
          Visit
        </a>
      ) : <span className="text-muted-foreground">—</span>
    },
    expandedOnly: true,
  },
  {
    key: "discord",
    title: "Discord",
    type: "text",
    sortable: false,
    searchable: false,
    filterable: false,
    editable: true,
    usedInCreate: false,
    description: "Discord server link",
    priority: 4,
    render: {
      type: "custom",
      render: (value) => value ? (
        <a href={value} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-xs">
          Discord
        </a>
      ) : <span className="text-muted-foreground">—</span>
    },
    expandedOnly: true,
  },
  {
    key: "twitter",
    title: "Twitter",
    type: "text",
    sortable: false,
    searchable: false,
    filterable: false,
    editable: true,
    usedInCreate: false,
    description: "Twitter profile link",
    priority: 4,
    render: {
      type: "custom",
      render: (value) => value ? (
        <a href={value} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-xs">
          Twitter
        </a>
      ) : <span className="text-muted-foreground">—</span>
    },
    expandedOnly: true,
  },
  {
    key: "telegram",
    title: "Telegram",
    type: "text",
    sortable: false,
    searchable: false,
    filterable: false,
    editable: true,
    usedInCreate: false,
    description: "Telegram group link",
    priority: 4,
    render: {
      type: "custom",
      render: (value) => value ? (
        <a href={value} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-xs">
          Telegram
        </a>
      ) : <span className="text-muted-foreground">—</span>
    },
    expandedOnly: true,
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
    description: "Total collection views",
    priority: 4,
    render: {
      type: "custom",
      render: (value) => {
        if (value === null || value === undefined || isNaN(value)) {
          return <span className="text-muted-foreground">0</span>;
        }
        return new Intl.NumberFormat('en-US', { notation: 'compact' }).format(value);
      }
    },
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
    expandedOnly: true,
  }
]; 