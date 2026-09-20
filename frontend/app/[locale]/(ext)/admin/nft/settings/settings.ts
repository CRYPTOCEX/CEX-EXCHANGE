import {
  TrendingUp,
  DollarSign,
  Shield,
  FileText,
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
];

// Tab colors for NFT settings
export const NFT_TAB_COLORS: Record<string, TabColors> = {
  trading: {
    bg: "bg-chart-1/10",
    text: "text-chart-1",
    border: "border-chart-1/20",
    iconBg: "bg-chart-1",
  },
  fees: {
    bg: "bg-chart-2/10",
    text: "text-chart-2",
    border: "border-chart-2/20",
    iconBg: "bg-chart-2",
  },
  verification: {
    bg: "bg-chart-3/10",
    text: "text-chart-3",
    border: "border-chart-3/20",
    iconBg: "bg-chart-3",
  },
  content: {
    bg: "bg-chart-4/10",
    text: "text-chart-4",
    border: "border-chart-4/20",
    iconBg: "bg-chart-4",
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
    key: "nftTransferConfirmGraceHours",
    label: "Transfer Confirmation Window (hours)",
    type: "number",
    description:
      "How long the parties have to confirm the on-chain transfer of an accepted offer before the sale is reversed and the buyer's escrow is released",
    category: "trading",
    subcategory: "Offer Settlement",
    min: 1,
    step: 1,
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
  nftTransferConfirmGraceHours: 24,
  nftMarketplaceFeePercentage: 2.5,
  nftMaxRoyaltyPercentage: 10,
  nftListingFee: 0,
  nftRequireKycForCreators: false,
  // Both must match the backend's absent-key default: listing/[id]/buy for the
  // KYC gate, listing + token/mint-web3 for metadata validation. Shipping these
  // as `true` made the UI claim a purchase or a mint would be refused when
  // nothing refused it.
  nftRequireKycForHighValue: false,
  nftHighValueThreshold: 1000,
  nftRequireMetadataValidation: false,
  // `nftEnableCrossChain` used to sit here, defaulting to TRUE, so a fresh
  // install showed a switch reading "Allow NFTs to be bridged across chains"
  // already ON. There is no bridge: the transfer route's body is
  // toAddress/recipientUserId/transactionHash with no destination chain,
  // `nft/chains/index.get.ts` is multi-chain DEPLOYMENT rather than bridging,
  // and the key had no reader anywhere. The field, the default and the
  // `integrations` tab it was the only occupant of are all gone.
};
