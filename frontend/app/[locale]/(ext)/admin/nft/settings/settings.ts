import {
  TrendingUp,
  DollarSign,
  Shield,
  FileText,
  Link as LinkIcon,
} from "lucide-react";
import { FieldDefinition, TabDefinition, TabColors } from "@/components/admin/settings";

// Tab definitions for NFT settings
export const NFT_TABS: TabDefinition[] = [
  {
    id: "trading",
    label: "Trading",
    icon: TrendingUp,
    description: "Configure trading options and auctions",
  },
  {
    id: "fees",
    label: "Fees",
    icon: DollarSign,
    description: "Configure marketplace fees and royalties",
  },
  {
    id: "verification",
    label: "Verification",
    icon: Shield,
    description: "KYC and verification requirements",
  },
  {
    id: "content",
    label: "Content",
    icon: FileText,
    description: "Content and metadata settings",
  },
  {
    id: "integrations",
    label: "Integrations",
    icon: LinkIcon,
    description: "Cross-chain and external integrations",
  },
];

// Tab colors for NFT settings
export const NFT_TAB_COLORS: Record<string, TabColors> = {
  trading: {
    bg: "bg-purple-500/10",
    text: "text-purple-500",
    border: "border-purple-500/20",
    gradient: "from-purple-500/20 via-purple-400/10 to-transparent",
    glow: "shadow-purple-500/20",
    iconBg: "bg-gradient-to-br from-purple-500 to-purple-600",
  },
  fees: {
    bg: "bg-amber-500/10",
    text: "text-amber-500",
    border: "border-amber-500/20",
    gradient: "from-amber-500/20 via-amber-400/10 to-transparent",
    glow: "shadow-amber-500/20",
    iconBg: "bg-gradient-to-br from-amber-500 to-amber-600",
  },
  verification: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-500",
    border: "border-emerald-500/20",
    gradient: "from-emerald-500/20 via-emerald-400/10 to-transparent",
    glow: "shadow-emerald-500/20",
    iconBg: "bg-gradient-to-br from-emerald-500 to-emerald-600",
  },
  content: {
    bg: "bg-blue-500/10",
    text: "text-blue-500",
    border: "border-blue-500/20",
    gradient: "from-blue-500/20 via-blue-400/10 to-transparent",
    glow: "shadow-blue-500/20",
    iconBg: "bg-gradient-to-br from-blue-500 to-blue-600",
  },
  integrations: {
    bg: "bg-pink-500/10",
    text: "text-pink-500",
    border: "border-pink-500/20",
    gradient: "from-pink-500/20 via-pink-400/10 to-transparent",
    glow: "shadow-pink-500/20",
    iconBg: "bg-gradient-to-br from-pink-500 to-pink-600",
  },
};

// Field definitions for NFT settings
export const NFT_FIELD_DEFINITIONS: FieldDefinition[] = [
  // Trading Settings
  {
    key: "nftEnableFixedPriceSales",
    label: "Enable Fixed Price Sales",
    type: "switch",
    description: "Allow sellers to list NFTs at fixed prices",
    category: "trading",
    subcategory: "Sale Types",
  },
  {
    key: "nftEnableAuctions",
    label: "Enable Auctions",
    type: "switch",
    description: "Allow sellers to auction NFTs",
    category: "trading",
    subcategory: "Sale Types",
  },
  {
    key: "nftEnableOffers",
    label: "Enable Offers",
    type: "switch",
    description: "Allow buyers to make offers on NFTs",
    category: "trading",
    subcategory: "Sale Types",
  },
  {
    key: "nftMinAuctionDuration",
    label: "Min Auction Duration (seconds)",
    type: "number",
    description: "Minimum duration for auctions in seconds",
    category: "trading",
    subcategory: "Auction Settings",
    min: 60,
    step: 60,
  },
  {
    key: "nftMaxAuctionDuration",
    label: "Max Auction Duration (seconds)",
    type: "number",
    description: "Maximum duration for auctions in seconds",
    category: "trading",
    subcategory: "Auction Settings",
    min: 3600,
    step: 3600,
  },
  {
    key: "nftBidIncrementPercentage",
    label: "Bid Increment",
    type: "range",
    description: "Minimum percentage increase for each bid",
    category: "trading",
    subcategory: "Auction Settings",
    min: 1,
    max: 25,
    step: 1,
    suffix: "%",
  },
  {
    key: "nftEnableAntiSnipe",
    label: "Enable Anti-Snipe",
    type: "switch",
    description: "Extend auction when bids are placed near the end",
    category: "trading",
    subcategory: "Auction Settings",
  },
  {
    key: "nftAntiSnipeExtension",
    label: "Anti-Snipe Extension (seconds)",
    type: "number",
    description: "Seconds to extend auction when anti-snipe triggers",
    category: "trading",
    subcategory: "Auction Settings",
    min: 60,
    step: 60,
  },

  // Fees Settings
  {
    key: "nftMarketplaceFeePercentage",
    label: "Marketplace Fee",
    type: "range",
    description: "Platform fee percentage on all sales",
    category: "fees",
    subcategory: "Platform Fees",
    min: 0,
    max: 10,
    step: 0.5,
    suffix: "%",
  },
  {
    key: "nftMaxRoyaltyPercentage",
    label: "Max Royalty",
    type: "range",
    description: "Maximum creator royalty percentage allowed",
    category: "fees",
    subcategory: "Creator Royalties",
    min: 0,
    max: 25,
    step: 0.5,
    suffix: "%",
  },
  {
    key: "nftListingFee",
    label: "Listing Fee",
    type: "number",
    description: "Fee charged for listing an NFT (0 = free)",
    category: "fees",
    subcategory: "Platform Fees",
    min: 0,
    step: 0.01,
  },

  // Verification Settings
  {
    key: "nftRequireKycForCreators",
    label: "Require KYC for Creators",
    type: "switch",
    description: "Creators must complete KYC to mint NFTs",
    category: "verification",
    subcategory: "Creator Requirements",
  },
  {
    key: "nftRequireKycForHighValue",
    label: "Require KYC for High Value",
    type: "switch",
    description: "KYC required for transactions above threshold",
    category: "verification",
    subcategory: "Transaction Requirements",
  },
  {
    key: "nftHighValueThreshold",
    label: "High Value Threshold",
    type: "number",
    description: "Transaction value that triggers KYC requirement",
    category: "verification",
    subcategory: "Transaction Requirements",
    min: 0,
    step: 1,
  },

  // Content Settings
  {
    key: "nftRequireMetadataValidation",
    label: "Require Metadata Validation",
    type: "switch",
    description: "Validate NFT metadata before minting",
    category: "content",
    subcategory: "Validation",
  },

  // Integration Settings
  {
    key: "nftEnableCrossChain",
    label: "Enable Cross-Chain",
    type: "switch",
    description: "Allow NFTs to be bridged across chains",
    category: "integrations",
    subcategory: "Cross-Chain",
  },
];

// Default settings values
export const NFT_DEFAULT_SETTINGS: Record<string, any> = {
  nftEnableFixedPriceSales: true,
  nftEnableAuctions: true,
  nftEnableOffers: true,
  nftMinAuctionDuration: 3600,
  nftMaxAuctionDuration: 604800,
  nftBidIncrementPercentage: 5,
  nftEnableAntiSnipe: true,
  nftAntiSnipeExtension: 300,
  nftMarketplaceFeePercentage: 2.5,
  nftMaxRoyaltyPercentage: 10,
  nftListingFee: 0,
  nftRequireKycForCreators: false,
  nftRequireKycForHighValue: true,
  nftHighValueThreshold: 1000,
  nftRequireMetadataValidation: true,
  nftEnableCrossChain: true,
};
