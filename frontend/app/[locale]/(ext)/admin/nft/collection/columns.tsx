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
        metadata: [
          {
            key: "chain",
            title: "Chain",
            type: "custom",
            render: (value) => (
              <span className="text-xs font-medium uppercase">{value}</span>
            )
          },
          {
            key: "contractAddress",
            title: "Deployment",
            type: "custom",
            render: (value) => (
              <span className={`text-xs px-1.5 py-0.5 rounded ${value ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'}`}>
                {value ? 'Deployed' : 'Not Deployed'}
              </span>
            )
          }
        ]
      }
    }
  },
  {
    key: "creator",
    title: "Creator",
    type: "custom",
    sortable: true,
    searchable: true,
    filterable: true,
    editable: false,
    usedInCreate: false,
    icon: User,
    priority: 2,
    sortKey: "creator.user.firstName",
    render: {
      type: "custom",
      render: (value, row) => {
        const creator = row.creator;
        const user = creator?.user;
        if (!user) return <span className="text-muted-foreground">—</span>;

        const displayName = creator.displayName || `${user.firstName} ${user.lastName}`;

        return (
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={user.avatar || "/img/placeholder.svg"}
              alt={displayName}
              className="w-8 h-8 rounded-full object-cover flex-shrink-0"
            />
            <div className="min-w-0 flex-1">
              <div className="font-medium truncate" title={displayName}>{displayName}</div>
              {creator.isVerified && (
                <div className="text-xs text-blue-600 dark:text-blue-400">✓ Verified</div>
              )}
            </div>
          </div>
        );
      }
    }
  },
  {
    key: "standard",
    title: "Standard",
    type: "select",
    sortable: true,
    filterable: true,
    editable: false,
    usedInCreate: false, // Set by collection creator, not admin
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
    editable: false,
    usedInCreate: false, // Managed by minting, not set by admin
    description: "Total number of NFTs minted",
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
      type: "custom",
      render: (value) => {
        const isTrue = value === true || value === "true" || value === 1;
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            isTrue
              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
          }`}>
            {isTrue ? "Verified" : "Unverified"}
          </span>
        );
      }
    }
  },
  {
    key: "status",
    title: "Status",
    type: "select",
    sortable: true,
    filterable: true,
    editable: true, // Admins can change collection status
    usedInCreate: false, // Collections created by users start with default status
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
    editable: false,
    usedInCreate: false, // Set by collection creator, not admin
    description: "Creator royalty percentage (0-10%)",
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
    editable: false,
    usedInCreate: false, // Set by collection creator, not admin
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
    key: "contractAddress",
    title: "Contract Address",
    type: "text",
    sortable: false,
    searchable: true,
    filterable: false,
    editable: false, // Cannot be changed after deployment to blockchain
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
    key: "maxSupply",
    title: "Max Supply",
      type: "number",
    sortable: true,
    filterable: true,
    editable: false,
    usedInCreate: false, // Set by collection creator, not admin
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
    editable: false,
    usedInCreate: false, // Set by collection creator, not admin
    description: "Uses lazy minting",
    priority: 4,
    render: {
      type: "badge",
      config: {
        variant: (value) => value === true || value === "true" || value === 1 ? "blue" : "secondary",
        text: (value) => value === true || value === "true" || value === 1 ? "Lazy" : "Pre-minted"
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
    editable: false,
    usedInCreate: false, // Set by collection creator, not admin
    description: "Wallet address to receive royalty payments",
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
    editable: false, // Only creator can set, admins just view
    usedInCreate: false,
    description: "Project website URL",
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
    editable: false, // Only creator can set, admins just view
    usedInCreate: false,
    description: "Discord server invite link",
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
    editable: false, // Only creator can set, admins just view
    usedInCreate: false,
    description: "Twitter/X profile URL",
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
    editable: false, // Only creator can set, admins just view
    usedInCreate: false,
    description: "Telegram group/channel link",
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