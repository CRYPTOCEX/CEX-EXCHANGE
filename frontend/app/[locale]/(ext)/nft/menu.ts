import { NAV_COLOR_SCHEMAS } from "@/app/[locale]/(ext)/theme-config";

export const menu: MenuItem[] = [
  {
    key: "explore",
    title: "Explore",
    href: "/nft",
    icon: "lucide:trending-up",
    exact: true,
    description:
      "Discover trending NFT collections, featured artists, and popular digital artworks.",
  },
  {
    key: "marketplace",
    title: "Marketplace",
    href: "/nft/marketplace",
    icon: "lucide:shopping-bag",
    description:
      "Buy, sell, and trade NFTs in our secure marketplace with auction and fixed-price listings.",
  },
  {
    key: "creator",
    title: "Creator",
    href: "/nft/creator",
    icon: "lucide:palette",
    auth: true,
    description:
      "Create and manage your NFT collections with professional minting and listing tools.",
  },
];

export const colorSchema = NAV_COLOR_SCHEMAS.nft;
export const adminPath = "/admin/nft";
