import React from "react";
import { Coins, Package, User, Shield, TrendingUp, Eye, Calendar, Star } from "lucide-react";

export const columns = [
  {
    key: "id",
    title: "ID",
    type: "text",
    sortable: true,
    searchable: true,
    filterable: true,
    icon: Shield,
    description: "Unique token identifier",
    priority: 4,
    editable: false,
    usedInCreate: false,
    expandedOnly: true,
  },
  {
    key: "token",
    title: "Token",
    type: "compound",
    sortable: true,
    searchable: true,
    filterable: true,
    editable: true,
    usedInCreate: true,
    icon: Coins,
    priority: 1,
    sortKey: "name",
    render: {
      type: "compound",
      config: {
        image: {
          key: "image",
          fallback: "/img/placeholder.svg",
          type: "image",
          title: "Token Image",
          description: "NFT token image",
          editable: true,
          usedInCreate: true,
        },
        primary: {
          key: "name",
          title: "Token Name",
          description: "NFT token name",
          editable: true,
          usedInCreate: true,
          icon: Coins,
    validation: (value) => value?.length < 2 ? "Name too short" : null,
  },
        secondary: {
    key: "tokenId",
    title: "Token ID",
          description: "Blockchain token ID",
    editable: false,
    usedInCreate: false,
        },
      }
    }
  },
  {
    key: "collection",
    title: "Collection",
    type: "compound",
    sortable: true,
    searchable: true,
    filterable: true,
    editable: false,
    usedInCreate: false,
    icon: Package,
    priority: 1,
    sortKey: "collection.name",
    render: {
      type: "compound",
      config: {
        image: {
          key: "logoImage",
          fallback: "/img/placeholder.svg",
          type: "image",
          title: "Logo",
          description: "Collection logo",
          editable: false,
          usedInCreate: false,
        },
        primary: {
          key: "name",
          title: "Collection",
          editable: false,
          usedInCreate: false,
        },
        secondary: {
          key: "symbol",
          title: "Symbol",
          editable: false,
          usedInCreate: false,
        },
        metadata: [
          { key: "isVerified", title: "Verified", type: "boolean" }
        ]
      }
    }
  },
  {
    key: "owner",
    title: "Owner",
    type: "compound",
    sortable: true,
    searchable: true,
    filterable: true,
    editable: false,
    usedInCreate: false,
    icon: User,
    priority: 1,
    sortKey: "owner.firstName",
    render: {
      type: "compound",
      config: {
        image: {
          key: "avatar",
          fallback: "/img/placeholder.svg",
          type: "image",
          title: "Avatar",
          description: "Owner's profile picture",
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
    key: "creator",
    title: "Creator",
    type: "compound",
    sortable: true,
    searchable: true,
    filterable: true,
    editable: false,
    usedInCreate: false,
    icon: User,
    priority: 3,
    sortKey: "creator.firstName",
    render: {
      type: "custom",
      render: (value, row) => {
        if (!row.creator || (!row.creator.firstName && !row.creator.lastName && !row.creator.email)) {
          return <span className="text-muted-foreground">No creator assigned</span>;
        }
        
        const creator = row.creator;
        const fullName = [creator.firstName, creator.lastName].filter(Boolean).join(" ");
        
        return (
          <div className="flex items-center gap-3">
            <div className="relative h-8 w-8 rounded-full overflow-hidden bg-muted">
              {creator.avatar ? (
                <img 
                  src={creator.avatar} 
                  alt={fullName || "Creator"} 
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.nextElementSibling.style.display = 'flex';
                  }}
                />
              ) : null}
              <div className="absolute inset-0 flex items-center justify-center bg-muted" style={{ display: creator.avatar ? 'none' : 'flex' }}>
                <User className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="font-medium text-sm">{fullName || "Unknown Creator"}</span>
              {creator.email && (
                <span className="text-xs text-muted-foreground">{creator.email}</span>
              )}
            </div>
          </div>
        );
      }
    },
    expandedOnly: true,
  },
  {
    key: "rarity",
    title: "Rarity",
    type: "select",
    sortable: true,
    filterable: true,
    editable: true,
    usedInCreate: true,
    icon: Star,
    options: [
      { value: "COMMON", label: "Common", color: "secondary" },
      { value: "UNCOMMON", label: "Uncommon", color: "blue" },
      { value: "RARE", label: "Rare", color: "purple" },
      { value: "EPIC", label: "Epic", color: "orange" },
      { value: "LEGENDARY", label: "Legendary", color: "yellow" }
    ],
    render: {
      type: "custom",
      render: (value) => {
        if (!value || value === null || value === undefined) {
          return (
            <span className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
              Not Set
            </span>
          );
        }
        
          const variants = {
            COMMON: "secondary",
            UNCOMMON: "blue",
            RARE: "purple", 
            EPIC: "orange",
            LEGENDARY: "yellow"
          };
        
        const labels = {
          COMMON: "Common",
          UNCOMMON: "Uncommon",
          RARE: "Rare",
          EPIC: "Epic",
          LEGENDARY: "Legendary"
        };
        
        const variant = variants[value] || "secondary";
        const label = labels[value] || value;
        
        const variantClasses = {
          secondary: "bg-secondary text-secondary-foreground",
          blue: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
          purple: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
          orange: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
          yellow: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
        };
        
        return (
          <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${variantClasses[variant]}`}>
            {label}
          </span>
        );
      }
    },
    priority: 2,
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
      { value: "MINTED", label: "Minted", color: "success" },
      { value: "BURNED", label: "Burned", color: "destructive" }
    ],
    render: {
      type: "badge",
      config: {
        variant: (value) => {
          const variants = {
            DRAFT: "secondary",
            MINTED: "success",
            BURNED: "destructive"
          };
          return variants[value] || "secondary";
        }
      }
    },
    priority: 1,
  },
  {
    key: "isMinted",
    title: "Minted",
    type: "boolean",
    sortable: true,
    filterable: true,
    editable: false,
    usedInCreate: false,
    description: "Token minting status",
    priority: 3,
    render: {
      type: "badge",
      config: {
        variant: (value) => value ? "success" : "secondary",
        text: (value) => value ? "Minted" : "Not Minted"
      }
    },
    expandedOnly: true,
  },
  {
    key: "isListed",
    title: "Listed",
    type: "boolean",
    sortable: true,
    filterable: true,
    editable: false,
    usedInCreate: false,
    icon: TrendingUp,
    description: "Currently listed for sale",
    priority: 2,
    render: {
      type: "badge",
      config: {
        variant: (value) => value ? "blue" : "secondary",
        text: (value) => value ? "Listed" : "Not Listed"
      }
    }
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
    description: "Total token views",
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
    key: "rarityScore",
    title: "Rarity Score",
    type: "number",
    sortable: true,
    filterable: true,
    editable: true,
    usedInCreate: false,
    description: "Calculated rarity score",
    priority: 4,
    render: {
      type: "number",
      format: { minimumFractionDigits: 2, maximumFractionDigits: 2 }
    },
    expandedOnly: true,
  },
  {
    key: "mintedAt",
    title: "Minted",
    type: "date",
    sortable: true,
    filterable: true,
    editable: false,
    usedInCreate: false,
    description: "Minting date",
    render: {
      type: "date",
      format: "MMM dd, yyyy"
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
    expandedOnly: true,
  }
]; 