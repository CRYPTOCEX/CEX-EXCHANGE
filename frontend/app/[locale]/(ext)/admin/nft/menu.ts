import { NAV_COLOR_SCHEMAS } from "@/lib/nav-color-schema";

export const menu: MenuItem[] = [
  {
    key: "dashboard",
    title: "Dashboard",
    description:
      "NFT marketplace overview with sales volume, active listings, and creator statistics.",
    href: "/admin/nft",
    icon: "lucide:layout-dashboard",
    exact: true,
  },
  {
    key: "content",
    title: "Content",
    description: "Manage marketplace content and collections.",
    icon: "lucide:folder",
    child: [
      {
        key: "categories",
        title: "Categories",
        description:
          "Create and manage NFT categories to organize marketplace content.",
        href: "/admin/nft/category",
        icon: "lucide:tags",
      },
      {
        key: "collections",
        title: "Collections",
        description:
          "Review and approve collections, feature trending projects, and manage metadata.",
        href: "/admin/nft/collection",
        icon: "lucide:package",
      },
      {
        key: "nfts",
        title: "NFTs",
        description:
          "Monitor all NFT listings, moderate content, and handle reported items.",
        href: "/admin/nft/token",
        icon: "lucide:image",
      },
    ],
  },
  {
    key: "trading",
    title: "Trading",
    description: "Monitor marketplace trading activity.",
    icon: "lucide:trending-up",
    child: [
      {
        key: "marketplace",
        title: "Marketplace",
        description:
          "Overview of marketplace activity, featured items, and trading volume.",
        href: "/admin/nft/marketplace",
        icon: "lucide:store",
      },
      {
        key: "listings",
        title: "Listings",
        description:
          "Manage active NFT listings, monitor pricing, and handle listing issues.",
        href: "/admin/nft/listing",
        icon: "lucide:tag",
      },
      {
        key: "offers",
        title: "Offers",
        description: "Review and moderate NFT offers, handle offer-related issues.",
        href: "/admin/nft/offer",
        icon: "lucide:hand-coins",
      },
      {
        key: "auctions",
        title: "Auctions",
        description:
          "Monitor active bids, handle bid disputes, and manage auction activities.",
        href: "/admin/nft/auction",
        icon: "lucide:gavel",
      },
      {
        key: "sales",
        title: "Sales",
        description:
          "Track all NFT sales, process disputes, and manage transaction issues.",
        href: "/admin/nft/sale",
        icon: "lucide:receipt-text",
      },
    ],
  },
  {
    key: "community",
    title: "Community",
    description: "Manage community features and engagement.",
    icon: "lucide:users",
    child: [
      {
        key: "creators",
        title: "Creators",
        description:
          "Manage creator verifications, review applications, and track creator performance.",
        href: "/admin/nft/creator",
        icon: "lucide:palette",
      },
      {
        key: "activity",
        title: "Activity",
        description:
          "Monitor user activity, track engagement metrics, and review recent actions.",
        href: "/admin/nft/activity",
        icon: "lucide:activity",
      },
    ],
  },
  {
    key: "system",
    title: "System",
    description: "System administration and settings.",
    icon: "lucide:settings",
    child: [
      {
        key: "analytics",
        title: "Analytics",
        description:
          "Detailed marketplace analytics with trends, revenue, and user behavior insights.",
        href: "/admin/nft/analytics",
        icon: "lucide:bar-chart-3",
      },
      {
        key: "settings",
        title: "Settings",
        description:
          "NFT platform configuration including fees, royalties, and marketplace rules.",
        href: "/admin/nft/settings",
        icon: "lucide:settings",
      },
    ],
  },
];

export const colorSchema = NAV_COLOR_SCHEMAS.nft;
