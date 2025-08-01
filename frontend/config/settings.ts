export type FieldType =
  | "switch"
  | "text"
  | "number"
  | "url"
  | "select"
  | "file"
  | "mlm";

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
  fileSize?: { width: number; height: number };
  preview?: Record<string, Record<string, string>>;
}

export const TABS = [
  { id: "general", label: "General" },
  { id: "wallet", label: "Wallet" },
  { id: "features", label: "Features" },
  { id: "social", label: "Social" },
  { id: "logos", label: "Logos" },
];

export const FIELD_DEFINITIONS: FieldDefinition[] = [
  // General Settings
  // {
  //   key: "layoutSwitcher",
  //   label: "Layout Switcher",
  //   type: "switch",
  //   description: "Allow users to switch between different layouts",
  //   category: "general",
  //   subcategory: "UI Options",
  // },
  {
    key: "landingPageType",
    label: "Landing Page Type",
    type: "select",
    description: "Choose the landing page to display for users.",
    category: "general",
    subcategory: "UI Options",
    options: [
      { label: "Default", value: "DEFAULT" },
      { label: "Custom", value: "CUSTOM" },
    ],
  },

  {
    key: "themeSwitcher",
    label: "Theme Switcher",
    type: "switch",
    description: "Allow users to switch between light and dark themes",
    category: "general",
    subcategory: "UI Options",
  },
  {
    key: "floatingLiveChat",
    label: "Floating Live Chat",
    type: "switch",
    description: "Show floating live chat button",
    category: "general",
    subcategory: "UI Options",
  },
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
  },

  // Wallet Settings
  {
    key: "deposit",
    label: "Deposits",
    type: "switch",
    description: "Enable deposit functionality",
    category: "wallet",
    subcategory: "Core Functions",
  },
  {
    key: "withdraw",
    label: "Withdrawals",
    type: "switch",
    description: "Enable withdrawal functionality",
    category: "wallet",
    subcategory: "Core Functions",
  },
  {
    key: "transfer",
    label: "Transfers",
    type: "switch",
    description: "Enable transfer functionality",
    category: "wallet",
    subcategory: "Core Functions",
  },
  {
    key: "depositExpiration",
    label: "Deposit Expiration",
    type: "switch",
    description: "Enable deposit expiration",
    category: "wallet",
    subcategory: "Restrictions",
  },
  {
    key: "fiatWallets",
    label: "Fiat Wallets",
    type: "switch",
    description: "Enable fiat currency wallets",
    category: "wallet",
    subcategory: "Wallet Types",
  },
  {
    key: "walletTransferFee",
    label: "Wallet Transfer Fee (%)",
    type: "number",
    description: "Fee percentage for wallet transfers",
    category: "wallet",
    subcategory: "Fees",
    min: 0,
    max: 100,
    step: 0.1,
  },
  {
    key: "spotWithdrawFee",
    label: "Spot Withdraw Fee (%)",
    type: "number",
    description: "Fee percentage for spot withdrawals",
    category: "wallet",
    subcategory: "Fees",
    min: 0,
    max: 100,
    step: 0.1,
  },

  // Features Settings
  {
    key: "investment",
    label: "Investment",
    type: "switch",
    description: "Enable investment features",
    category: "features",
    subcategory: "Investment",
  },
  // {
  //   key: "forexInvestment",
  //   label: "Forex Investment",
  //   type: "switch",
  //   description: "Enable forex investment features",
  //   category: "features",
  //   subcategory: "Investment",
  // },
  {
    key: "kycStatus",
    label: "KYC Verification",
    type: "switch",
    description: "Enable KYC verification for users",
    category: "features",
    subcategory: "Verification",
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
  // {
  //   key: "p2pCommission",
  //   label: "P2P Commission (%)",
  //   type: "number",
  //   description: "Commission percentage for P2P transactions",
  //   category: "features",
  //   subcategory: "P2P",
  //   min: 0,
  //   max: 100,
  //   step: 0.1,
  // },
  // {
  //   key: "mlmSystem",
  //   label: "MLM System",
  //   type: "select",
  //   description: "Select the MLM system type",
  //   category: "features",
  //   subcategory: "Affiliate",
  //   options: [
  //     { label: "Direct", value: "DIRECT" },
  //     { label: "Binary", value: "BINARY" },
  //     { label: "Unilevel", value: "UNILEVEL" },
  //   ],
  // },
  // {
  //   key: "binaryLevels",
  //   label: "Binary Levels",
  //   type: "number",
  //   description: "Number of binary levels",
  //   category: "features",
  //   subcategory: "Affiliate",
  //   showIf: (values) => values.mlmSystem === "BINARY",
  //   min: 2,
  //   max: 10,
  //   step: 1,
  // },
  // {
  //   key: "unilevelLevels",
  //   label: "Unilevel Levels",
  //   type: "number",
  //   description: "Number of unilevel levels",
  //   category: "features",
  //   subcategory: "Affiliate",
  //   showIf: (values) => values.mlmSystem === "UNILEVEL",
  //   min: 2,
  //   max: 10,
  //   step: 1,
  // },
  // {
  //   key: "referralApprovalRequired",
  //   label: "Referral Approval Required",
  //   type: "switch",
  //   description: "Require approval for referrals",
  //   category: "features",
  //   subcategory: "Affiliate",
  // },

  // Social Links
  {
    key: "facebookLink",
    label: "Facebook",
    type: "url",
    description: "Facebook page URL",
    category: "social",
  },
  {
    key: "twitterLink",
    label: "Twitter",
    type: "url",
    description: "Twitter profile URL",
    category: "social",
  },
  {
    key: "instagramLink",
    label: "Instagram",
    type: "url",
    description: "Instagram profile URL",
    category: "social",
  },
  {
    key: "linkedinLink",
    label: "LinkedIn",
    type: "url",
    description: "LinkedIn page URL",
    category: "social",
  },
  {
    key: "telegramLink",
    label: "Telegram",
    type: "url",
    description: "Telegram channel URL",
    category: "social",
  },
  {
    key: "appStoreLink",
    label: "App Store Link",
    type: "url",
    description: "Link to your iOS app on the App Store",
    category: "social",
  },
  {
    key: "googlePlayLink",
    label: "Google Play Link",
    type: "url",
    description: "Link to your Android app on Google Play Store",
    category: "social",
  },

  // Logos
  {
    key: "logo",
    label: "Main Logo",
    type: "file",
    description: "Main logo (96x96px)",
    category: "logos",
    subcategory: "Main",
    fileSize: { width: 96, height: 96 },
  },
  {
    key: "darkLogo",
    label: "Dark Logo",
    type: "file",
    description: "Logo for dark theme (96x96px)",
    category: "logos",
    subcategory: "Main",
    fileSize: { width: 96, height: 96 },
  },
  {
    key: "fullLogo",
    label: "Full Logo",
    type: "file",
    description: "Full logo with text (350x75px)",
    category: "logos",
    subcategory: "Main",
    fileSize: { width: 350, height: 75 },
  },
  {
    key: "darkFullLogo",
    label: "Dark Full Logo",
    type: "file",
    description: "Full logo for dark theme (350x75px)",
    category: "logos",
    subcategory: "Main",
    fileSize: { width: 350, height: 75 },
  },
  {
    key: "cardLogo",
    label: "Card Logo",
    type: "file",
    description: "Logo for cards (256x256px)",
    category: "logos",
    subcategory: "Main",
    fileSize: { width: 256, height: 256 },
  },
  {
    key: "favicon16",
    label: "Favicon 16x16",
    type: "file",
    description: "Favicon (16x16px)",
    category: "logos",
    subcategory: "Favicons",
    fileSize: { width: 16, height: 16 },
  },
  {
    key: "favicon32",
    label: "Favicon 32x32",
    type: "file",
    description: "Favicon (32x32px)",
    category: "logos",
    subcategory: "Favicons",
    fileSize: { width: 32, height: 32 },
  },
  {
    key: "favicon96",
    label: "Favicon 96x96",
    type: "file",
    description: "Favicon (96x96px)",
    category: "logos",
    subcategory: "Favicons",
    fileSize: { width: 96, height: 96 },
  },
  {
    key: "appleIcon57",
    label: "Apple Icon 57x57",
    type: "file",
    description: "Apple touch icon (57x57px)",
    category: "logos",
    subcategory: "Apple Icons",
    fileSize: { width: 57, height: 57 },
  },
  {
    key: "appleIcon60",
    label: "Apple Icon 60x60",
    type: "file",
    description: "Apple touch icon (60x60px)",
    category: "logos",
    subcategory: "Apple Icons",
    fileSize: { width: 60, height: 60 },
  },
  {
    key: "appleIcon72",
    label: "Apple Icon 72x72",
    type: "file",
    description: "Apple touch icon (72x72px)",
    category: "logos",
    subcategory: "Apple Icons",
    fileSize: { width: 72, height: 72 },
  },
  {
    key: "appleIcon76",
    label: "Apple Icon 76x76",
    type: "file",
    description: "Apple touch icon (76x76px)",
    category: "logos",
    subcategory: "Apple Icons",
    fileSize: { width: 76, height: 76 },
  },
  {
    key: "appleIcon114",
    label: "Apple Icon 114x114",
    type: "file",
    description: "Apple touch icon (114x114px)",
    category: "logos",
    subcategory: "Apple Icons",
    fileSize: { width: 114, height: 114 },
  },
  {
    key: "appleIcon120",
    label: "Apple Icon 120x120",
    type: "file",
    description: "Apple touch icon (120x120px)",
    category: "logos",
    subcategory: "Apple Icons",
    fileSize: { width: 120, height: 120 },
  },
  {
    key: "appleIcon144",
    label: "Apple Icon 144x144",
    type: "file",
    description: "Apple touch icon (144x144px)",
    category: "logos",
    subcategory: "Apple Icons",
    fileSize: { width: 144, height: 144 },
  },
  {
    key: "appleIcon152",
    label: "Apple Icon 152x152",
    type: "file",
    description: "Apple touch icon (152x152px)",
    category: "logos",
    subcategory: "Apple Icons",
    fileSize: { width: 152, height: 152 },
  },
  {
    key: "appleIcon180",
    label: "Apple Icon 180x180",
    type: "file",
    description: "Apple touch icon (180x180px)",
    category: "logos",
    subcategory: "Apple Icons",
    fileSize: { width: 180, height: 180 },
  },
  {
    key: "androidIcon192",
    label: "Android Icon 192x192",
    type: "file",
    description: "Android icon (192x192px)",
    category: "logos",
    subcategory: "Android Icons",
    fileSize: { width: 192, height: 192 },
  },
  {
    key: "androidIcon256",
    label: "Android Icon 256x256",
    type: "file",
    description: "Android icon (256x256px)",
    category: "logos",
    subcategory: "Android Icons",
    fileSize: { width: 256, height: 256 },
  },
  {
    key: "androidIcon384",
    label: "Android Icon 384x384",
    type: "file",
    description: "Android icon (384x384px)",
    category: "logos",
    subcategory: "Android Icons",
    fileSize: { width: 384, height: 384 },
  },
  {
    key: "androidIcon512",
    label: "Android Icon 512x512",
    type: "file",
    description: "Android icon (512x512px)",
    category: "logos",
    subcategory: "Android Icons",
    fileSize: { width: 512, height: 512 },
  },
  {
    key: "msIcon144",
    label: "MS Icon 144x144",
    type: "file",
    description: "Microsoft icon (144x144px)",
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
  facebookLink: "https://facebook.com/#mash",
  fiatWallets: "true",
  floatingLiveChat: "true",
  forexInvestment: "true",
  forexRestrictions: "false",
  frontendType: "default",
  googleTargetLanguage: "en",
  googleTranslateStatus: "false",
  icoRestrictions: "false",
  instagramLink: "https://instagram.com/#mash",
  investment: "true",
  kycStatus: "true",
  layoutSwitcher: "true",
  logo: "",
  mlmRestrictions: "false",
  mlmSettings:
    '{"unilevel":{"levels":"5","levelsPercentage":[{"level":1,"value":"1"},{"level":2,"value":"2"},{"level":3,"value":"3"},{"level":4,"value":"4"},{"level":5,"value":"5"}]}}',
  mlmSystem: "UNILEVEL",
  newsStatus: "true",
  referralApprovalRequired: "true",
  siteMaintenanceMode: "true",
  spotWithdrawFee: "1",
  stakingRestrictions: "false",
  themeSwitcher: "true",
  tradeRestrictions: "false",
  transfer: "true",
  transferRestrictions: "true",
  twitterLink: "https://x.com/#mash",
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
};
