export type FieldType =
  | "switch"
  | "text"
  | "number"
  | "range"
  | "url"
  | "select"
  | "file"
  | "mlm"
  | "socialLinks"
  | "custom";

// Social link structure for custom social links
export interface SocialLink {
  id: string;
  name: string;
  url: string;
  icon: string; // URL to icon image
}

export interface FieldDefinition {
  key: string;
  label: string;
  type: FieldType;
  description?: string;
  options?: { label: string; value: string }[];
  category: string;
  subcategory?: string;
  showIf?: (values: Record<string, string>) => boolean;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string; // e.g., "%" for percentages, "min" for minutes
  fileSize?: { width: number; height: number };
  preview?: Record<string, Record<string, string>>;
  fullWidth?: boolean; // Whether this field should span the full width in grid layouts
}

export const TABS = [
  { id: "general", label: "General" },
  { id: "features", label: "Features" },
  { id: "wallet", label: "Wallet" },
  { id: "social", label: "Social & Links" },
  { id: "logos", label: "Branding" },
];

export const FIELD_DEFINITIONS: FieldDefinition[] = [
  // ========================================
  // GENERAL SETTINGS
  // ========================================

  // Appearance
  {
    key: "siteTheme",
    label: "Default Site Theme",
    type: "select",
    description:
      "Set the default theme for the entire site (light, dark, or follow system preference)",
    category: "general",
    subcategory: "Appearance",
    options: [
      { label: "Light", value: "light" },
      { label: "Dark", value: "dark" },
      { label: "System (Follow OS preference)", value: "system" },
    ],
  },
  {
    key: "layoutSwitcher",
    label: "Theme Switcher",
    type: "switch",
    description: "Allow users to switch between light and dark themes",
    category: "general",
    subcategory: "Appearance",
  },
  {
    key: "navbarLogoDisplay",
    label: "Navbar Logo Display",
    type: "select",
    description: "Choose how to display the logo in navigation bars",
    category: "general",
    subcategory: "Appearance",
    options: [
      { label: "Square Logo + Site Name", value: "SQUARE_WITH_NAME" },
      { label: "Full Logo Only", value: "FULL_LOGO_ONLY" },
    ],
  },

  // Landing Page
  {
    key: "landingPageType",
    label: "Landing Page Type",
    type: "select",
    description: "Choose the landing page to display for users.",
    category: "general",
    subcategory: "Landing Page",
    options: [
      { label: "Default", value: "DEFAULT" },
      { label: "Custom", value: "CUSTOM" },
    ],
  },

  // Content
  {
    key: "newsStatus",
    label: "News Section",
    type: "switch",
    description: "Enable news section on the platform",
    category: "general",
    subcategory: "Content",
  },
  {
    key: "blogPostLayout",
    label: "Blog Post Layout",
    type: "select",
    description: "Select the layout for blog posts",
    category: "general",
    subcategory: "Content",
    options: [
      { label: "Default", value: "DEFAULT" },
      { label: "Modern", value: "MODERN" },
      { label: "Classic", value: "CLASSIC" },
    ],
    preview: {
      light: {
        DEFAULT: "/img/preview/blog/layout/default.webp",
        CLASSIC: "/img/preview/blog/layout/trail.webp",
        MODERN: "/img/preview/blog/layout/toc.webp",
      },
      dark: {
        DEFAULT: "/img/preview/blog/layout/default-dark.webp",
        CLASSIC: "/img/preview/blog/layout/trail-dark.webp",
        MODERN: "/img/preview/blog/layout/toc-dark.webp",
      },
    },
    fullWidth: true,
  },

  // Support
  {
    key: "floatingLiveChat",
    label: "Floating Live Chat",
    type: "switch",
    description: "Show floating live chat button for customer support",
    category: "general",
    subcategory: "Support",
  },

  // ========================================
  // FEATURES SETTINGS
  // ========================================

  // Trading
  {
    key: "spotWallets",
    label: "Spot Trading",
    type: "switch",
    description: "Enable spot trading functionality",
    category: "features",
    subcategory: "Trading",
  },
  {
    key: "chartType",
    label: "Chart Type",
    type: "select",
    description: "Choose the charting library for trading pages",
    category: "features",
    subcategory: "Trading",
    options: [
      { label: "Native Chart", value: "NATIVE" },
      { label: "TradingView Advanced", value: "TRADINGVIEW" },
    ],
  },
  {
    key: "marketLinkRoute",
    label: "Market Link Route",
    type: "select",
    description:
      "Choose where market links redirect to from markets page and home page",
    category: "features",
    subcategory: "Trading",
    options: [
      { label: "Trading Page", value: "trade" },
      { label: "Binary Trading", value: "binary" },
    ],
  },

  // Investment
  {
    key: "investment",
    label: "Investment",
    type: "switch",
    description: "Enable investment features",
    category: "features",
    subcategory: "Investment",
  },

  // User Verification
  {
    key: "kycStatus",
    label: "KYC Verification",
    type: "switch",
    description: "Enable KYC verification for users",
    category: "features",
    subcategory: "Verification",
  },

  // ========================================
  // WALLET SETTINGS
  // ========================================

  // Wallet Types
  {
    key: "fiatWallets",
    label: "Fiat Wallets",
    type: "switch",
    description: "Enable fiat currency wallets",
    category: "wallet",
    subcategory: "Wallet Types",
  },

  // Transactions
  {
    key: "deposit",
    label: "Deposits",
    type: "switch",
    description: "Enable deposit functionality",
    category: "wallet",
    subcategory: "Transactions",
  },
  {
    key: "withdraw",
    label: "Withdrawals",
    type: "switch",
    description: "Enable withdrawal functionality",
    category: "wallet",
    subcategory: "Transactions",
  },
  {
    key: "transfer",
    label: "Transfers",
    type: "switch",
    description: "Enable transfer functionality between wallets",
    category: "wallet",
    subcategory: "Transactions",
  },

  // Security & Approval
  {
    key: "withdrawApproval",
    label: "Withdrawal Approval",
    type: "switch",
    description:
      "Require manual approval for spot wallet withdrawals (when disabled, withdrawals are processed automatically)",
    category: "wallet",
    subcategory: "Security",
  },
  {
    key: "depositExpiration",
    label: "Deposit Expiration",
    type: "switch",
    description: "Enable deposit address expiration for security",
    category: "wallet",
    subcategory: "Security",
  },

  // Fees
  {
    key: "walletTransferFee",
    label: "Wallet Transfer Fee",
    type: "range",
    description: "Fee percentage for wallet transfers",
    category: "wallet",
    subcategory: "Fees",
    min: 0,
    max: 10,
    step: 0.1,
    suffix: "%",
  },
  {
    key: "spotWithdrawFee",
    label: "Spot Withdraw Fee",
    type: "range",
    description: "Fee percentage for spot withdrawals",
    category: "wallet",
    subcategory: "Fees",
    min: 0,
    max: 10,
    step: 0.1,
    suffix: "%",
  },

  // ========================================
  // SOCIAL & LINKS SETTINGS
  // ========================================

  // Social Media
  {
    key: "customSocialLinks",
    label: "Social Links",
    type: "socialLinks",
    description:
      "Add and manage social media links with custom icons. These links will be displayed in the footer.",
    category: "social",
    subcategory: "Social Media",
  },

  // Mobile Apps
  {
    key: "appStoreLink",
    label: "App Store Link",
    type: "url",
    description: "Link to your iOS app on the App Store",
    category: "social",
    subcategory: "Mobile Apps",
  },
  {
    key: "googlePlayLink",
    label: "Google Play Link",
    type: "url",
    description: "Link to your Android app on Google Play Store",
    category: "social",
    subcategory: "Mobile Apps",
  },

  // ========================================
  // BRANDING / LOGOS SETTINGS
  // ========================================

  // Site Logos
  {
    key: "logo",
    label: "Square Logo (Light)",
    type: "file",
    description: "Square logo for light theme (96x96px)",
    category: "logos",
    subcategory: "Site Logos",
    fileSize: { width: 96, height: 96 },
  },
  {
    key: "darkLogo",
    label: "Square Logo (Dark)",
    type: "file",
    description: "Square logo for dark theme (96x96px)",
    category: "logos",
    subcategory: "Site Logos",
    fileSize: { width: 96, height: 96 },
  },
  {
    key: "fullLogo",
    label: "Full Logo (Light)",
    type: "file",
    description: "Full logo with text for light theme (350x75px)",
    category: "logos",
    subcategory: "Site Logos",
    fileSize: { width: 350, height: 75 },
  },
  {
    key: "darkFullLogo",
    label: "Full Logo (Dark)",
    type: "file",
    description: "Full logo with text for dark theme (350x75px)",
    category: "logos",
    subcategory: "Site Logos",
    fileSize: { width: 350, height: 75 },
  },
  {
    key: "cardLogo",
    label: "Card Logo",
    type: "file",
    description: "Logo for sharing cards and previews (256x256px)",
    category: "logos",
    subcategory: "Site Logos",
    fileSize: { width: 256, height: 256 },
  },

  // Favicons
  {
    key: "favicon16",
    label: "Favicon 16x16",
    type: "file",
    description: "Small favicon for browser tabs",
    category: "logos",
    subcategory: "Favicons",
    fileSize: { width: 16, height: 16 },
  },
  {
    key: "favicon32",
    label: "Favicon 32x32",
    type: "file",
    description: "Standard favicon for browser tabs",
    category: "logos",
    subcategory: "Favicons",
    fileSize: { width: 32, height: 32 },
  },
  {
    key: "favicon96",
    label: "Favicon 96x96",
    type: "file",
    description: "Large favicon for high-DPI displays",
    category: "logos",
    subcategory: "Favicons",
    fileSize: { width: 96, height: 96 },
  },

  // Apple Touch Icons
  {
    key: "appleIcon57",
    label: "Apple Icon 57x57",
    type: "file",
    description: "iPhone (non-Retina)",
    category: "logos",
    subcategory: "Apple Touch Icons",
    fileSize: { width: 57, height: 57 },
  },
  {
    key: "appleIcon60",
    label: "Apple Icon 60x60",
    type: "file",
    description: "iPhone (iOS 7+)",
    category: "logos",
    subcategory: "Apple Touch Icons",
    fileSize: { width: 60, height: 60 },
  },
  {
    key: "appleIcon72",
    label: "Apple Icon 72x72",
    type: "file",
    description: "iPad (non-Retina)",
    category: "logos",
    subcategory: "Apple Touch Icons",
    fileSize: { width: 72, height: 72 },
  },
  {
    key: "appleIcon76",
    label: "Apple Icon 76x76",
    type: "file",
    description: "iPad (iOS 7+)",
    category: "logos",
    subcategory: "Apple Touch Icons",
    fileSize: { width: 76, height: 76 },
  },
  {
    key: "appleIcon114",
    label: "Apple Icon 114x114",
    type: "file",
    description: "iPhone (Retina)",
    category: "logos",
    subcategory: "Apple Touch Icons",
    fileSize: { width: 114, height: 114 },
  },
  {
    key: "appleIcon120",
    label: "Apple Icon 120x120",
    type: "file",
    description: "iPhone (Retina, iOS 7+)",
    category: "logos",
    subcategory: "Apple Touch Icons",
    fileSize: { width: 120, height: 120 },
  },
  {
    key: "appleIcon144",
    label: "Apple Icon 144x144",
    type: "file",
    description: "iPad (Retina)",
    category: "logos",
    subcategory: "Apple Touch Icons",
    fileSize: { width: 144, height: 144 },
  },
  {
    key: "appleIcon152",
    label: "Apple Icon 152x152",
    type: "file",
    description: "iPad (Retina, iOS 7+)",
    category: "logos",
    subcategory: "Apple Touch Icons",
    fileSize: { width: 152, height: 152 },
  },
  {
    key: "appleIcon180",
    label: "Apple Icon 180x180",
    type: "file",
    description: "iPhone 6 Plus",
    category: "logos",
    subcategory: "Apple Touch Icons",
    fileSize: { width: 180, height: 180 },
  },

  // Android Icons
  {
    key: "androidIcon192",
    label: "Android Icon 192x192",
    type: "file",
    description: "Standard Android icon",
    category: "logos",
    subcategory: "Android Icons",
    fileSize: { width: 192, height: 192 },
  },
  {
    key: "androidIcon256",
    label: "Android Icon 256x256",
    type: "file",
    description: "Medium Android icon",
    category: "logos",
    subcategory: "Android Icons",
    fileSize: { width: 256, height: 256 },
  },
  {
    key: "androidIcon384",
    label: "Android Icon 384x384",
    type: "file",
    description: "Large Android icon",
    category: "logos",
    subcategory: "Android Icons",
    fileSize: { width: 384, height: 384 },
  },
  {
    key: "androidIcon512",
    label: "Android Icon 512x512",
    type: "file",
    description: "Extra large Android icon (PWA)",
    category: "logos",
    subcategory: "Android Icons",
    fileSize: { width: 512, height: 512 },
  },

  // Microsoft Icons
  {
    key: "msIcon144",
    label: "MS Icon 144x144",
    type: "file",
    description: "Windows tile icon",
    category: "logos",
    subcategory: "Microsoft Icons",
    fileSize: { width: 144, height: 144 },
  },
];

// @/config/defaultSettings.ts
export const DEFAULT_SETTINGS = {
  binaryLevel1: "1",
  binaryLevel2: "1",
  binaryLevels: "2",
  binaryRestrictions: "false",
  blogPostLayout: "DEFAULT",
  botRestrictions: "false",
  cardLogo: "",
  deposit: "true",
  depositExpiration: "true",
  depositRestrictions: "true",
  ecommerceRestrictions: "false",
  enableStickyTopNavigationHeader: "true",
  customSocialLinks: JSON.stringify([
    {
      id: "1",
      name: "Facebook",
      url: "https://facebook.com",
      icon: "/img/social/facebook.svg",
    },
    {
      id: "2",
      name: "Twitter",
      url: "https://x.com",
      icon: "/img/social/twitter.svg",
    },
    {
      id: "3",
      name: "Instagram",
      url: "https://instagram.com",
      icon: "/img/social/instagram.svg",
    },
    {
      id: "4",
      name: "Telegram",
      url: "https://t.me",
      icon: "/img/social/telegram.svg",
    },
  ]),
  fiatWallets: "true",
  spotWallets: "true",
  floatingLiveChat: "true",
  forexInvestment: "true",
  forexRestrictions: "false",
  frontendType: "default",
  googleTargetLanguage: "en",
  googleTranslateStatus: "false",
  icoRestrictions: "false",
  investment: "true",
  kycStatus: "true",
  layoutSwitcher: "true",
  logo: "",
  mlmRestrictions: "false",
  mlmSettings:
    '{"unilevel":{"levels":"5","levelsPercentage":[{"level":1,"value":"1"},{"level":2,"value":"2"},{"level":3,"value":"3"},{"level":4,"value":"4"},{"level":5,"value":"5"}]}}',
  mlmSystem: "UNILEVEL",
  navbarLogoDisplay: "SQUARE_WITH_NAME",
  newsStatus: "true",
  referralApprovalRequired: "true",
  siteMaintenanceMode: "true",
  spotWithdrawFee: "1",
  stakingRestrictions: "false",
  tradeRestrictions: "false",
  transfer: "true",
  transferRestrictions: "true",
  appStoreLink: "",
  googlePlayLink: "",
  unilevelLevel1: "1",
  unilevelLevel2: "2",
  unilevelLevel3: "3",
  unilevelLevel4: "4",
  unilevelLevel5: "5",
  unilevelLevels: "5",
  walletRestrictions: "true",
  walletTransferFee: "1",
  withdraw: "true",
  withdrawalRestrictions: "false",
  withdrawApproval: "true",
  withdrawChainFee: "false",
  marketLinkRoute: "trade",
};
