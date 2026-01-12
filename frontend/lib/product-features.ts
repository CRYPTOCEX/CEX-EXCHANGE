// Product features data for showcase pages
// This file contains comprehensive feature descriptions for each product

export interface ProductFeature {
  icon: string; // Lucide icon name
  title: string;
  description: string;
}

export interface ProductBenefit {
  title: string;
  description: string;
}

export interface ProductShowcase {
  tagline: string;
  features: ProductFeature[];
  benefits: ProductBenefit[];
  highlights: string[];
  screenshots?: string[];
  adminRoutes?: { path: string; label: string }[];
  userRoutes?: { path: string; label: string }[];
}

// Map product IDs to their showcase data
export const productShowcaseData: Record<string, ProductShowcase> = {
  // AI Investment
  "35988984": {
    tagline: "AI-Powered Investment Strategies for Maximum Returns",
    features: [
      {
        icon: "Brain",
        title: "AI-Driven Investment Plans",
        description:
          "Leverage advanced AI algorithms to create and manage investment plans with optimized risk profiles and return rates.",
      },
      {
        icon: "Clock",
        title: "Flexible Duration Options",
        description:
          "Configure multiple investment durations from short-term to long-term with customizable interest rates.",
      },
      {
        icon: "LineChart",
        title: "Real-Time Analytics",
        description:
          "Track investment performance with comprehensive analytics dashboards and detailed reporting.",
      },
      {
        icon: "Wallet",
        title: "Automated Payouts",
        description:
          "Automatic profit distribution and payout management with transparent tracking.",
      },
      {
        icon: "Shield",
        title: "Risk Management",
        description:
          "Built-in risk assessment and portfolio diversification tools to protect investments.",
      },
      {
        icon: "Settings",
        title: "Admin Control Panel",
        description:
          "Complete admin dashboard for managing plans, durations, and monitoring all investment activities.",
      },
    ],
    benefits: [
      {
        title: "Increase User Engagement",
        description:
          "Keep users actively investing with attractive AI-powered plans and transparent returns.",
      },
      {
        title: "Generate Recurring Revenue",
        description:
          "Create sustainable income streams through investment fees and platform margins.",
      },
      {
        title: "Build User Trust",
        description:
          "Transparent analytics and automated payouts build confidence and loyalty.",
      },
    ],
    highlights: [
      "60+ API endpoints for complete integration",
      "Multiple risk profiles (Low, Medium, High)",
      "Configurable interest rates per duration",
      "Investment logs and audit trails",
      "User dashboard with portfolio tracking",
    ],
    adminRoutes: [
      { path: "/admin/ai/investment/plan", label: "Investment Plans" },
      { path: "/admin/ai/investment/duration", label: "Duration Settings" },
      { path: "/admin/ai/investment/log", label: "Investment Logs" },
    ],
  },

  // AI Market Maker
  "61007981": {
    tagline: "Intelligent Market Making with Automated Trading Bots",
    features: [
      {
        icon: "Bot",
        title: "Automated Market Making",
        description:
          "Deploy AI-powered bots for automated market making on ecosystem markets with intelligent price discovery.",
      },
      {
        icon: "Droplets",
        title: "Liquidity Management",
        description:
          "Advanced tools to manage and optimize liquidity across trading pairs.",
      },
      {
        icon: "Target",
        title: "Smart Price Discovery",
        description:
          "Intelligent algorithms for optimal bid-ask spread management and price stability.",
      },
      {
        icon: "Activity",
        title: "Real-Time Monitoring",
        description:
          "Live performance tracking and bot activity monitoring with detailed analytics.",
      },
      {
        icon: "Sliders",
        title: "Risk Controls",
        description:
          "Configurable risk parameters to protect against market volatility and losses.",
      },
      {
        icon: "BookOpen",
        title: "Comprehensive Guide",
        description:
          "Built-in documentation and setup guides for easy configuration.",
      },
    ],
    benefits: [
      {
        title: "Deep Market Liquidity",
        description:
          "Ensure healthy trading markets with consistent liquidity provision.",
      },
      {
        title: "Reduced Spread Volatility",
        description:
          "Maintain tight spreads even during low volume periods.",
      },
      {
        title: "Automated Operations",
        description:
          "Set it and forget it - bots operate 24/7 without manual intervention.",
      },
    ],
    highlights: [
      "Multi-market support",
      "Real-time performance analytics",
      "Configurable trading parameters",
      "Risk management controls",
      "Historical data analysis",
    ],
    adminRoutes: [
      { path: "/admin/ai/market-maker", label: "Dashboard" },
      { path: "/admin/ai/market-maker/market", label: "Markets" },
      { path: "/admin/ai/market-maker/analytics", label: "Analytics" },
      { path: "/admin/ai/market-maker/settings", label: "Settings" },
    ],
  },

  // Ecosystem & Native Trading
  "40071914": {
    tagline: "Complete Blockchain Infrastructure for Native Trading",
    features: [
      {
        icon: "Network",
        title: "Multi-Chain Support",
        description:
          "Connect to 18+ blockchains including Ethereum, BSC, Polygon, Solana, TRON, and more.",
      },
      {
        icon: "Wallet",
        title: "Master Wallet Infrastructure",
        description:
          "Enterprise-grade master wallet system for secure asset management.",
      },
      {
        icon: "Users",
        title: "Custodial Wallets",
        description:
          "Create and manage custodial wallets for users with full transaction tracking.",
      },
      {
        icon: "Coins",
        title: "Token Management",
        description:
          "Import, deploy, and manage tokens across multiple chains with full metadata support.",
      },
      {
        icon: "ArrowLeftRight",
        title: "Native Trading Markets",
        description:
          "Create trading pairs for native ecosystem tokens with real-time order matching.",
      },
      {
        icon: "FileText",
        title: "Complete Ledger System",
        description:
          "Full transaction ledger with deposits, withdrawals, and internal transfers.",
      },
    ],
    benefits: [
      {
        title: "Launch Your Own Tokens",
        description:
          "Deploy and list your own tokens without relying on external exchanges.",
      },
      {
        title: "Full Control",
        description:
          "Complete control over your blockchain infrastructure and user wallets.",
      },
      {
        title: "Multi-Chain Flexibility",
        description:
          "Support users across multiple blockchain ecosystems from one platform.",
      },
    ],
    highlights: [
      "18+ blockchain networks supported",
      "ERC20, BEP20, SPL token standards",
      "Real-time deposit monitoring",
      "UTXO support for BTC, LTC, DOGE, DASH",
      "Smart contract custodial wallets (EVM)",
      "46+ admin API endpoints",
    ],
    adminRoutes: [
      { path: "/admin/ecosystem", label: "Blockchains" },
      { path: "/admin/ecosystem/wallet/master", label: "Master Wallets" },
      { path: "/admin/ecosystem/wallet/custodial", label: "Custodial Wallets" },
      { path: "/admin/ecosystem/token", label: "Tokens" },
      { path: "/admin/ecosystem/market", label: "Markets" },
      { path: "/admin/ecosystem/ledger", label: "Ledger" },
    ],
  },

  // Forex & Investment
  "36668679": {
    tagline: "Professional Forex Trading & Investment Platform",
    features: [
      {
        icon: "TrendingUp",
        title: "Forex Trading Accounts",
        description:
          "Full-featured forex trading accounts with real-time market data and execution.",
      },
      {
        icon: "PiggyBank",
        title: "Investment Plans",
        description:
          "Create diverse investment plans with customizable durations and returns.",
      },
      {
        icon: "Signal",
        title: "Trading Signals",
        description:
          "Provide trading signals to help users make informed trading decisions.",
      },
      {
        icon: "ArrowUpDown",
        title: "Deposit & Withdrawal",
        description:
          "Seamless deposit and withdrawal processing with multiple payment methods.",
      },
      {
        icon: "History",
        title: "Transaction History",
        description:
          "Complete transaction tracking and history for all account activities.",
      },
      {
        icon: "LayoutDashboard",
        title: "User Dashboard",
        description:
          "Intuitive user interface for managing accounts, investments, and trades.",
      },
    ],
    benefits: [
      {
        title: "Expand Your Offerings",
        description:
          "Add forex trading to your platform to attract a wider audience.",
      },
      {
        title: "Professional Trading Tools",
        description:
          "Provide institutional-grade trading features to your users.",
      },
      {
        title: "Recurring Revenue",
        description:
          "Generate fees from trades, investments, and account management.",
      },
    ],
    highlights: [
      "Real-time forex market data",
      "Multiple account types",
      "Investment plan builder",
      "Signal management system",
      "Complete audit trails",
      "User-friendly dashboard",
    ],
    adminRoutes: [
      { path: "/admin/forex/account", label: "Accounts" },
      { path: "/admin/forex/plan", label: "Plans" },
      { path: "/admin/forex/investment", label: "Investments" },
      { path: "/admin/forex/signal", label: "Signals" },
    ],
    userRoutes: [
      { path: "/forex", label: "Home" },
      { path: "/forex/plan", label: "Plans" },
      { path: "/forex/dashboard", label: "Dashboard" },
    ],
  },

  // Token ICO
  "36120046": {
    tagline: "Launch and Manage Token Sales with Confidence",
    features: [
      {
        icon: "Rocket",
        title: "Token Offerings",
        description:
          "Create and manage ICO/IEO/IDO token sales with multi-phase distribution.",
      },
      {
        icon: "Coins",
        title: "Token Vesting",
        description:
          "Implement vesting schedules for team tokens, advisors, and early investors.",
      },
      {
        icon: "Users",
        title: "Investor Management",
        description:
          "Track investor contributions, allocations, and claim statuses.",
      },
      {
        icon: "CheckCircle",
        title: "Creator Verification",
        description:
          "KYC verification system for token creators to build investor trust.",
      },
      {
        icon: "Map",
        title: "Project Roadmap",
        description:
          "Showcase project milestones and development roadmap to investors.",
      },
      {
        icon: "RefreshCw",
        title: "Refund Management",
        description:
          "Automated refund eligibility checks and processing for failed sales.",
      },
    ],
    benefits: [
      {
        title: "New Revenue Stream",
        description:
          "Earn fees from token launches and trading on your platform.",
      },
      {
        title: "Attract Projects",
        description:
          "Become a launchpad for new blockchain projects and tokens.",
      },
      {
        title: "Build Community",
        description:
          "Create an active investor community around token launches.",
      },
    ],
    highlights: [
      "Multi-phase token sales",
      "Vesting schedule management",
      "Creator verification system",
      "Investor dashboard",
      "Tokenomics display",
      "Team & advisor management",
    ],
    adminRoutes: [
      { path: "/admin/ico", label: "Dashboard" },
      { path: "/admin/ico/offer", label: "Offerings" },
      { path: "/admin/ico/transaction", label: "Transactions" },
      { path: "/admin/ico/settings", label: "Settings" },
    ],
    userRoutes: [
      { path: "/ico", label: "Explore" },
      { path: "/ico/offer", label: "Offerings" },
      { path: "/ico/dashboard", label: "My Investments" },
      { path: "/ico/creator", label: "Launch Token" },
    ],
  },

  // Staking Crypto
  "37434481": {
    tagline: "Earn Passive Income Through Crypto Staking",
    features: [
      {
        icon: "Layers",
        title: "Staking Pools",
        description:
          "Create and manage staking pools with customizable APY rates and lock periods.",
      },
      {
        icon: "Percent",
        title: "Flexible APY",
        description:
          "Configure competitive annual percentage yields to attract stakers.",
      },
      {
        icon: "Lock",
        title: "Lock Periods",
        description:
          "Set lock periods from flexible to long-term with different reward tiers.",
      },
      {
        icon: "Gift",
        title: "Reward Distribution",
        description:
          "Automated reward calculation and distribution based on staking duration.",
      },
      {
        icon: "BarChart3",
        title: "Analytics Dashboard",
        description:
          "Comprehensive analytics for pool performance and staking statistics.",
      },
      {
        icon: "Unlock",
        title: "Early Withdrawal",
        description:
          "Optional early withdrawal with configurable penalty fees.",
      },
    ],
    benefits: [
      {
        title: "Increase Token Utility",
        description:
          "Give your token real utility by enabling staking rewards.",
      },
      {
        title: "Reduce Sell Pressure",
        description:
          "Lock periods reduce circulating supply and selling pressure.",
      },
      {
        title: "User Retention",
        description:
          "Staking creates long-term commitment from your user base.",
      },
    ],
    highlights: [
      "Multiple staking pools",
      "Flexible lock durations",
      "Real-time APY display",
      "Position management",
      "Earnings tracking",
      "Pool analytics",
    ],
    adminRoutes: [
      { path: "/admin/staking", label: "Dashboard" },
      { path: "/admin/staking/pool", label: "Pools" },
      { path: "/admin/staking/position", label: "Positions" },
      { path: "/admin/staking/earning", label: "Earnings" },
    ],
    userRoutes: [
      { path: "/staking", label: "Dashboard" },
      { path: "/staking/pool", label: "Pools" },
      { path: "/staking/position", label: "My Stakes" },
    ],
  },

  // Knowledge Base & FAQs
  "39166202": {
    tagline: "Comprehensive Knowledge Base for Better User Support",
    features: [
      {
        icon: "HelpCircle",
        title: "FAQ Management",
        description:
          "Create and organize FAQ articles with rich content and media support.",
      },
      {
        icon: "Search",
        title: "Smart Search",
        description:
          "Powerful search functionality to help users find answers quickly.",
      },
      {
        icon: "MessageSquare",
        title: "User Feedback",
        description:
          "Collect user feedback on articles to improve content quality.",
      },
      {
        icon: "BarChart",
        title: "Analytics",
        description:
          "Track popular articles and search trends to optimize content.",
      },
      {
        icon: "FolderTree",
        title: "Category Organization",
        description:
          "Organize articles into categories for easy navigation.",
      },
      {
        icon: "Wrench",
        title: "Troubleshooter",
        description:
          "Interactive troubleshooting guides for common issues.",
      },
    ],
    benefits: [
      {
        title: "Reduce Support Tickets",
        description:
          "Self-service knowledge base reduces support workload significantly.",
      },
      {
        title: "Improve User Experience",
        description:
          "Users find answers instantly without waiting for support.",
      },
      {
        title: "SEO Benefits",
        description:
          "Rich content improves search engine visibility and organic traffic.",
      },
    ],
    highlights: [
      "Rich text editor",
      "Category management",
      "Search analytics",
      "User feedback system",
      "Interactive troubleshooter",
      "Multi-language support",
    ],
    adminRoutes: [
      { path: "/admin/faq", label: "Analytics" },
      { path: "/admin/faq/manage", label: "Articles" },
      { path: "/admin/faq/feedback", label: "Feedback" },
      { path: "/admin/faq/question", label: "Questions" },
    ],
    userRoutes: [
      { path: "/faq", label: "Knowledge Base" },
      { path: "/faq/troubleshooter", label: "Troubleshooter" },
    ],
  },

  // Ecommerce
  "44624493": {
    tagline: "Complete E-Commerce Solution for Digital & Physical Products",
    features: [
      {
        icon: "Package",
        title: "Product Catalog",
        description:
          "Comprehensive product management with variants, images, and detailed descriptions.",
      },
      {
        icon: "FolderTree",
        title: "Categories",
        description:
          "Organize products into hierarchical categories for easy browsing.",
      },
      {
        icon: "Star",
        title: "Reviews & Ratings",
        description:
          "Customer review system with star ratings and moderation tools.",
      },
      {
        icon: "Heart",
        title: "Wishlists",
        description:
          "Allow users to save products for later purchase.",
      },
      {
        icon: "ShoppingCart",
        title: "Order Management",
        description:
          "Complete order processing, tracking, and fulfillment system.",
      },
      {
        icon: "Tag",
        title: "Discounts & Promotions",
        description:
          "Create promotional codes and discount campaigns.",
      },
    ],
    benefits: [
      {
        title: "Diversify Revenue",
        description:
          "Add e-commerce revenue stream to your crypto platform.",
      },
      {
        title: "Crypto Payments",
        description:
          "Accept cryptocurrency payments for products.",
      },
      {
        title: "Digital Products",
        description:
          "Sell digital products with automatic delivery.",
      },
    ],
    highlights: [
      "Product variants support",
      "Digital product delivery",
      "Review moderation",
      "Shipping management",
      "License key delivery",
      "Order tracking",
    ],
    adminRoutes: [
      { path: "/admin/ecommerce", label: "Dashboard" },
      { path: "/admin/ecommerce/product", label: "Products" },
      { path: "/admin/ecommerce/category", label: "Categories" },
      { path: "/admin/ecommerce/order", label: "Orders" },
      { path: "/admin/ecommerce/discount", label: "Discounts" },
    ],
    userRoutes: [
      { path: "/ecommerce", label: "Shop" },
      { path: "/ecommerce/product", label: "Products" },
      { path: "/ecommerce/order", label: "My Orders" },
    ],
  },

  // P2P Exchange
  "44593497": {
    tagline: "Peer-to-Peer Trading with Escrow Protection",
    features: [
      {
        icon: "Users",
        title: "P2P Marketplace",
        description:
          "Full-featured peer-to-peer trading marketplace with offer creation and discovery.",
      },
      {
        icon: "MessageCircle",
        title: "Live Chat",
        description:
          "Real-time chat between traders for seamless communication.",
      },
      {
        icon: "Shield",
        title: "Escrow System",
        description:
          "Secure escrow protection for all P2P trades.",
      },
      {
        icon: "AlertTriangle",
        title: "Dispute Resolution",
        description:
          "Built-in dispute handling with admin arbitration.",
      },
      {
        icon: "CreditCard",
        title: "Payment Methods",
        description:
          "Support for multiple fiat payment methods.",
      },
      {
        icon: "Star",
        title: "Reputation System",
        description:
          "User reputation scores based on trading history.",
      },
    ],
    benefits: [
      {
        title: "Fiat Gateway",
        description:
          "Enable fiat-to-crypto conversion without banking integration.",
      },
      {
        title: "User Trust",
        description:
          "Escrow and reputation systems build trading confidence.",
      },
      {
        title: "Fee Revenue",
        description:
          "Earn fees on every P2P transaction on your platform.",
      },
    ],
    highlights: [
      "Real-time chat",
      "Multiple payment methods",
      "Escrow protection",
      "Dispute management",
      "Trader verification",
      "Reputation scores",
    ],
    adminRoutes: [
      { path: "/admin/p2p", label: "Dashboard" },
      { path: "/admin/p2p/trade", label: "Trades" },
      { path: "/admin/p2p/offer", label: "Offers" },
      { path: "/admin/p2p/dispute", label: "Disputes" },
      { path: "/admin/p2p/payment-method", label: "Payment Methods" },
    ],
    userRoutes: [
      { path: "/p2p", label: "Marketplace" },
      { path: "/p2p/offer", label: "My Offers" },
      { path: "/p2p/trade", label: "My Trades" },
    ],
  },

  // MLM / Affiliate
  "36667808": {
    tagline: "Multi-Level Referral System for Viral Growth",
    features: [
      {
        icon: "Network",
        title: "Multi-Level Rewards",
        description:
          "Configure multi-tier commission structures for referral rewards.",
      },
      {
        icon: "Link",
        title: "Referral Links",
        description:
          "Unique referral links for each user with tracking.",
      },
      {
        icon: "GitBranch",
        title: "Network Visualization",
        description:
          "Visual representation of referral network and downlines.",
      },
      {
        icon: "DollarSign",
        title: "Commission Tracking",
        description:
          "Transparent commission calculation and payout tracking.",
      },
      {
        icon: "Gift",
        title: "Reward System",
        description:
          "Configurable rewards for different referral milestones.",
      },
      {
        icon: "Settings",
        title: "Flexible Configuration",
        description:
          "Customize commission rates, levels, and conditions.",
      },
    ],
    benefits: [
      {
        title: "Viral Growth",
        description:
          "Incentivize users to bring new users through referrals.",
      },
      {
        title: "Lower CAC",
        description:
          "Reduce customer acquisition costs through organic referrals.",
      },
      {
        title: "Community Building",
        description:
          "Create a motivated community of brand ambassadors.",
      },
    ],
    highlights: [
      "Multi-tier commissions",
      "Network visualization",
      "Referral link generator",
      "Commission tracking",
      "Milestone rewards",
      "Payout management",
    ],
    adminRoutes: [
      { path: "/admin/affiliate", label: "Dashboard" },
      { path: "/admin/affiliate/condition", label: "Conditions" },
      { path: "/admin/affiliate/reward", label: "Rewards" },
      { path: "/admin/affiliate/referral", label: "Referrals" },
    ],
    userRoutes: [
      { path: "/affiliate", label: "Home" },
      { path: "/affiliate/dashboard", label: "Dashboard" },
      { path: "/affiliate/network", label: "Network" },
      { path: "/affiliate/referral", label: "Referrals" },
    ],
  },

  // Copy Trading
  "61107157": {
    tagline: "Social Trading - Follow and Copy Top Traders",
    features: [
      {
        icon: "Users",
        title: "Leader Profiles",
        description:
          "Verified trading leaders with detailed performance statistics.",
      },
      {
        icon: "Copy",
        title: "Copy Trades",
        description:
          "Automatically replicate trades from successful traders.",
      },
      {
        icon: "PieChart",
        title: "Profit Sharing",
        description:
          "Configurable profit sharing between leaders and followers.",
      },
      {
        icon: "BarChart3",
        title: "Performance Analytics",
        description:
          "Comprehensive analytics for both leaders and followers.",
      },
      {
        icon: "Trophy",
        title: "Leaderboard",
        description:
          "Ranked leaderboard showcasing top performing traders.",
      },
      {
        icon: "Shield",
        title: "Risk Scoring",
        description:
          "Risk assessment scores to help followers make informed decisions.",
      },
    ],
    benefits: [
      {
        title: "Attract New Users",
        description:
          "Social trading appeals to beginners who want to follow experts.",
      },
      {
        title: "Increase Trading Volume",
        description:
          "Copy trading multiplies every leader's trade across followers.",
      },
      {
        title: "Community Engagement",
        description:
          "Create an engaged community of traders and followers.",
      },
    ],
    highlights: [
      "Real-time trade copying",
      "Leader verification",
      "Performance tracking",
      "Risk management",
      "Subscription system",
      "Audit logging",
    ],
    adminRoutes: [
      { path: "/admin/copy-trading", label: "Dashboard" },
      { path: "/admin/copy-trading/leader", label: "Leaders" },
      { path: "/admin/copy-trading/follower", label: "Followers" },
      { path: "/admin/copy-trading/trade", label: "Trades" },
    ],
    userRoutes: [
      { path: "/copy-trading", label: "Discover" },
      { path: "/copy-trading/leader", label: "Leaders" },
      { path: "/copy-trading/subscriptions", label: "Subscriptions" },
      { path: "/copy-trading/analytics", label: "Analytics" },
    ],
  },

  // NFT Marketplace
  "60962133": {
    tagline: "Create, Sell, and Trade NFTs in Your Marketplace",
    features: [
      {
        icon: "Image",
        title: "NFT Collections",
        description:
          "Create and manage NFT collections with rich metadata.",
      },
      {
        icon: "Brush",
        title: "Token Minting",
        description:
          "Standard and lazy minting options for NFT creation.",
      },
      {
        icon: "Store",
        title: "Marketplace",
        description:
          "Full-featured marketplace for buying and selling NFTs.",
      },
      {
        icon: "Gavel",
        title: "Auctions",
        description:
          "Auction system with bidding and reserve prices.",
      },
      {
        icon: "Percent",
        title: "Royalties",
        description:
          "Creator royalties on secondary sales.",
      },
      {
        icon: "CheckCircle",
        title: "Creator Verification",
        description:
          "Verified creator badges for trusted artists.",
      },
    ],
    benefits: [
      {
        title: "NFT Market Access",
        description:
          "Tap into the growing NFT market with your own marketplace.",
      },
      {
        title: "Creator Economy",
        description:
          "Empower creators to monetize their digital art.",
      },
      {
        title: "Trading Fees",
        description:
          "Earn marketplace fees on every NFT transaction.",
      },
    ],
    highlights: [
      "Multi-blockchain support",
      "Lazy minting",
      "Auction system",
      "Fixed-price sales",
      "Creator royalties",
      "Collection management",
    ],
    adminRoutes: [
      { path: "/admin/nft", label: "Dashboard" },
      { path: "/admin/nft/collection", label: "Collections" },
      { path: "/admin/nft/token", label: "NFTs" },
      { path: "/admin/nft/marketplace", label: "Marketplace" },
      { path: "/admin/nft/auction", label: "Auctions" },
    ],
    userRoutes: [
      { path: "/nft", label: "Explore" },
      { path: "/nft/marketplace", label: "Marketplace" },
      { path: "/nft/creator", label: "Create" },
    ],
  },

  // Payment Gateway
  "61043226": {
    tagline: "Accept Crypto Payments on Any Website",
    features: [
      {
        icon: "CreditCard",
        title: "Payment Checkout",
        description:
          "Embeddable checkout for accepting crypto payments anywhere.",
      },
      {
        icon: "Wallet",
        title: "Multi-Wallet Support",
        description:
          "Accept payments to multiple wallet addresses.",
      },
      {
        icon: "RefreshCw",
        title: "Auto-Conversion",
        description:
          "Automatic currency conversion at point of sale.",
      },
      {
        icon: "Webhook",
        title: "Webhooks",
        description:
          "Real-time payment notifications via webhooks.",
      },
      {
        icon: "Code",
        title: "API Access",
        description:
          "Full API for custom payment integrations.",
      },
      {
        icon: "ShoppingBag",
        title: "WooCommerce Plugin",
        description:
          "Ready-to-use plugin for WooCommerce stores.",
      },
    ],
    benefits: [
      {
        title: "New Market",
        description:
          "Enable any merchant to accept crypto payments.",
      },
      {
        title: "Transaction Fees",
        description:
          "Earn fees on every payment processed.",
      },
      {
        title: "Easy Integration",
        description:
          "Simple integration for merchants of all sizes.",
      },
    ],
    highlights: [
      "Embeddable checkout",
      "Multi-currency support",
      "Webhook notifications",
      "Merchant dashboard",
      "Payout management",
      "WooCommerce ready",
    ],
    adminRoutes: [
      { path: "/admin/gateway", label: "Dashboard" },
      { path: "/admin/gateway/merchant", label: "Merchants" },
      { path: "/admin/gateway/payment", label: "Payments" },
      { path: "/admin/gateway/payout", label: "Payouts" },
    ],
    userRoutes: [
      { path: "/gateway", label: "Home" },
      { path: "/gateway/dashboard", label: "Dashboard" },
      { path: "/gateway/integration", label: "Integration" },
    ],
  },

  // MailWizard
  "45613491": {
    tagline: "AI-Powered Email Marketing Made Easy",
    features: [
      {
        icon: "Mail",
        title: "Email Campaigns",
        description:
          "Create and manage email marketing campaigns with ease.",
      },
      {
        icon: "Sparkles",
        title: "AI Content Generation",
        description:
          "Generate compelling email content using AI.",
      },
      {
        icon: "Image",
        title: "AI Image Generation",
        description:
          "Create custom images for emails with AI.",
      },
      {
        icon: "Layout",
        title: "Drag-and-Drop Editor",
        description:
          "Visual email builder with drag-and-drop components.",
      },
      {
        icon: "Clock",
        title: "Scheduling",
        description:
          "Schedule emails for optimal delivery times.",
      },
      {
        icon: "FileText",
        title: "Template Library",
        description:
          "Pre-built templates for quick campaign creation.",
      },
    ],
    benefits: [
      {
        title: "User Engagement",
        description:
          "Keep users engaged with targeted email campaigns.",
      },
      {
        title: "Time Savings",
        description:
          "AI content generation speeds up campaign creation.",
      },
      {
        title: "Professional Emails",
        description:
          "Create beautiful emails without design skills.",
      },
    ],
    highlights: [
      "AI content writer",
      "AI image generator",
      "Visual editor",
      "Campaign scheduling",
      "Template library",
      "Analytics tracking",
    ],
    adminRoutes: [
      { path: "/admin/mailwizard/campaign", label: "Campaigns" },
      { path: "/admin/mailwizard/template", label: "Templates" },
    ],
  },

  // Futures Trading
  "46094641": {
    tagline: "Leverage Trading with Advanced Futures Markets",
    features: [
      {
        icon: "TrendingUp",
        title: "Futures Markets",
        description:
          "Create and manage futures trading markets with leverage.",
      },
      {
        icon: "Scale",
        title: "Leverage Trading",
        description:
          "Configurable leverage options for amplified trading.",
      },
      {
        icon: "Target",
        title: "Position Management",
        description:
          "Track open positions, PnL, and margin requirements.",
      },
      {
        icon: "AlertTriangle",
        title: "Liquidation Engine",
        description:
          "Automated liquidation for risk management.",
      },
      {
        icon: "BarChart3",
        title: "Order Types",
        description:
          "Market, limit, stop-loss, and take-profit orders.",
      },
      {
        icon: "Activity",
        title: "Real-Time Data",
        description:
          "Live price feeds and position updates.",
      },
    ],
    benefits: [
      {
        title: "Higher Volume",
        description:
          "Leverage attracts active traders seeking higher returns.",
      },
      {
        title: "More Fees",
        description:
          "Leveraged positions generate more trading fees.",
      },
      {
        title: "Advanced Traders",
        description:
          "Attract professional traders to your platform.",
      },
    ],
    highlights: [
      "Multi-leverage options",
      "Position tracking",
      "Auto-liquidation",
      "Advanced orders",
      "Real-time PnL",
      "Risk controls",
    ],
    adminRoutes: [
      { path: "/admin/futures/market", label: "Markets" },
      { path: "/admin/futures/position", label: "Positions" },
    ],
  },

  // Wallet Connect
  "37548018": {
    tagline: "Seamless Web3 Wallet Integration",
    features: [
      {
        icon: "Wallet",
        title: "Web3 Login",
        description:
          "Allow users to login with their Web3 wallets.",
      },
      {
        icon: "Link",
        title: "Wallet Connection",
        description:
          "Connect MetaMask, WalletConnect, and other wallets.",
      },
      {
        icon: "Shield",
        title: "Secure Authentication",
        description:
          "Cryptographic signature-based authentication.",
      },
      {
        icon: "Coins",
        title: "Balance Integration",
        description:
          "Display wallet balances directly in the platform.",
      },
      {
        icon: "Key",
        title: "Multi-Wallet Support",
        description:
          "Support for multiple wallet providers.",
      },
      {
        icon: "Zap",
        title: "One-Click Login",
        description:
          "Streamlined login experience for Web3 users.",
      },
    ],
    benefits: [
      {
        title: "Web3 Native",
        description:
          "Attract users who prefer non-custodial authentication.",
      },
      {
        title: "Reduced Friction",
        description:
          "No password needed - just connect wallet.",
      },
      {
        title: "Security",
        description:
          "Users control their own keys and identity.",
      },
    ],
    highlights: [
      "MetaMask support",
      "WalletConnect integration",
      "Signature verification",
      "Multi-chain support",
      "Seamless UX",
      "Balance display",
    ],
  },

  // ========== EXCHANGE PROVIDERS ==========

  // KuCoin Exchange Provider
  "37179816": {
    tagline: "Professional Spot Trading with KuCoin Integration",
    features: [
      {
        icon: "Globe",
        title: "KuCoin API Integration",
        description:
          "Full integration with KuCoin exchange API for real-time trading and market data.",
      },
      {
        icon: "BarChart3",
        title: "Real-Time Market Data",
        description:
          "Live price feeds, order books, and market depth from KuCoin exchange.",
      },
      {
        icon: "ArrowLeftRight",
        title: "Spot Trading",
        description:
          "Execute buy and sell orders with market and limit order types.",
      },
      {
        icon: "Wallet",
        title: "Balance Management",
        description:
          "Real-time balance tracking and portfolio management.",
      },
      {
        icon: "LineChart",
        title: "Trading Charts",
        description:
          "Advanced TradingView charts with technical indicators.",
      },
      {
        icon: "Shield",
        title: "Secure API Keys",
        description:
          "Encrypted storage for exchange API credentials.",
      },
    ],
    benefits: [
      {
        title: "Wide Market Access",
        description:
          "Access hundreds of trading pairs from KuCoin exchange.",
      },
      {
        title: "High Liquidity",
        description:
          "Leverage KuCoin's deep liquidity for optimal trade execution.",
      },
      {
        title: "Reliable Infrastructure",
        description:
          "Built on KuCoin's robust trading infrastructure.",
      },
    ],
    highlights: [
      "Real-time order execution",
      "Market and limit orders",
      "Live balance updates",
      "Order history tracking",
      "Fee management",
      "Multi-currency support",
    ],
    adminRoutes: [
      { path: "/admin/finance/exchange", label: "Exchange Dashboard" },
      { path: "/admin/finance/exchange/market", label: "Markets" },
      { path: "/admin/finance/exchange/balance", label: "Balances" },
      { path: "/admin/finance/exchange/fee", label: "Fees" },
    ],
  },

  // Binance Exchange Provider
  "38650585": {
    tagline: "World's Largest Exchange at Your Fingertips",
    features: [
      {
        icon: "Globe",
        title: "Binance API Integration",
        description:
          "Complete integration with Binance exchange for spot trading and market data.",
      },
      {
        icon: "BarChart3",
        title: "Real-Time Market Data",
        description:
          "Live price feeds, order books, and trades from Binance exchange.",
      },
      {
        icon: "ArrowLeftRight",
        title: "Spot Trading",
        description:
          "Execute trades with multiple order types including market, limit, and stop orders.",
      },
      {
        icon: "Wallet",
        title: "Balance Synchronization",
        description:
          "Real-time balance updates and portfolio tracking.",
      },
      {
        icon: "LineChart",
        title: "Advanced Charting",
        description:
          "Professional trading charts with full technical analysis tools.",
      },
      {
        icon: "Zap",
        title: "High Performance",
        description:
          "Low-latency order execution powered by Binance infrastructure.",
      },
    ],
    benefits: [
      {
        title: "Maximum Liquidity",
        description:
          "Access the world's most liquid cryptocurrency exchange.",
      },
      {
        title: "Extensive Markets",
        description:
          "Trade thousands of pairs across multiple markets.",
      },
      {
        title: "Competitive Fees",
        description:
          "Benefit from Binance's low trading fees.",
      },
    ],
    highlights: [
      "1000+ trading pairs",
      "Real-time order matching",
      "Multiple order types",
      "WebSocket price feeds",
      "Historical data access",
      "API rate limiting handled",
    ],
    adminRoutes: [
      { path: "/admin/finance/exchange", label: "Exchange Dashboard" },
      { path: "/admin/finance/exchange/market", label: "Markets" },
      { path: "/admin/finance/exchange/balance", label: "Balances" },
      { path: "/admin/finance/exchange/fee", label: "Fees" },
    ],
  },

  // XT Exchange Provider
  "54510301": {
    tagline: "Global Digital Asset Trading Platform",
    features: [
      {
        icon: "Globe",
        title: "XT Exchange Integration",
        description:
          "Full API integration with XT exchange for seamless trading operations.",
      },
      {
        icon: "BarChart3",
        title: "Live Market Data",
        description:
          "Real-time prices, order books, and trading volume from XT exchange.",
      },
      {
        icon: "ArrowLeftRight",
        title: "Spot Trading",
        description:
          "Complete spot trading functionality with various order types.",
      },
      {
        icon: "Wallet",
        title: "Balance Management",
        description:
          "Track and manage exchange balances in real-time.",
      },
      {
        icon: "LineChart",
        title: "Trading Interface",
        description:
          "Professional trading charts and market analysis tools.",
      },
      {
        icon: "Shield",
        title: "Secure Integration",
        description:
          "Encrypted API key storage and secure data transmission.",
      },
    ],
    benefits: [
      {
        title: "Growing Exchange",
        description:
          "Access XT's expanding market and trading pairs.",
      },
      {
        title: "Global Reach",
        description:
          "Serve users worldwide with XT's international presence.",
      },
      {
        title: "Diverse Markets",
        description:
          "Trade across multiple cryptocurrency markets.",
      },
    ],
    highlights: [
      "Real-time data feeds",
      "Order management",
      "Balance tracking",
      "Trade history",
      "Fee calculations",
      "Market imports",
    ],
    adminRoutes: [
      { path: "/admin/finance/exchange", label: "Exchange Dashboard" },
      { path: "/admin/finance/exchange/market", label: "Markets" },
      { path: "/admin/finance/exchange/balance", label: "Balances" },
      { path: "/admin/finance/exchange/fee", label: "Fees" },
    ],
  },

  // ========== BLOCKCHAIN PROVIDERS ==========

  // Solana Blockchain
  "54514052": {
    tagline: "High-Performance Solana Blockchain Integration",
    features: [
      {
        icon: "Zap",
        title: "Lightning-Fast Transactions",
        description:
          "Leverage Solana's high-speed blockchain for near-instant deposits and withdrawals.",
      },
      {
        icon: "Wallet",
        title: "SPL Token Support",
        description:
          "Full support for Solana Program Library (SPL) tokens.",
      },
      {
        icon: "ArrowDownToLine",
        title: "Automatic Deposits",
        description:
          "Real-time deposit detection and processing for SOL and SPL tokens.",
      },
      {
        icon: "ArrowUpFromLine",
        title: "Secure Withdrawals",
        description:
          "Safe and efficient withdrawal processing with transaction verification.",
      },
      {
        icon: "Coins",
        title: "Token Management",
        description:
          "Import and manage SPL tokens with full metadata support.",
      },
      {
        icon: "Activity",
        title: "Transaction Monitoring",
        description:
          "Real-time transaction tracking and confirmation status.",
      },
    ],
    benefits: [
      {
        title: "Sub-Second Finality",
        description:
          "Transactions confirm in milliseconds on Solana network.",
      },
      {
        title: "Low Fees",
        description:
          "Minimal transaction costs compared to other networks.",
      },
      {
        title: "Growing Ecosystem",
        description:
          "Access Solana's rapidly expanding DeFi and NFT ecosystem.",
      },
    ],
    highlights: [
      "400ms block times",
      "SPL token deposits",
      "Automatic confirmations",
      "Master wallet management",
      "Custodial wallets",
      "Transaction ledger",
    ],
    adminRoutes: [
      { path: "/admin/ecosystem", label: "Ecosystem Dashboard" },
      { path: "/admin/ecosystem/wallet/master", label: "Master Wallets" },
      { path: "/admin/ecosystem/wallet/custodial", label: "Custodial Wallets" },
      { path: "/admin/ecosystem/token", label: "Tokens" },
    ],
  },

  // Tron Blockchain
  "54577641": {
    tagline: "Fast and Fee-Efficient Tron Network Integration",
    features: [
      {
        icon: "Zap",
        title: "High Throughput",
        description:
          "Process thousands of transactions per second on Tron network.",
      },
      {
        icon: "Wallet",
        title: "TRC20 Token Support",
        description:
          "Full support for TRC20 tokens including USDT-TRC20.",
      },
      {
        icon: "ArrowDownToLine",
        title: "Deposit Processing",
        description:
          "Automatic detection and processing of TRX and TRC20 deposits.",
      },
      {
        icon: "ArrowUpFromLine",
        title: "Withdrawal Management",
        description:
          "Efficient withdrawal processing with energy/bandwidth optimization.",
      },
      {
        icon: "DollarSign",
        title: "USDT Integration",
        description:
          "Native support for USDT-TRC20, one of the most used stablecoins.",
      },
      {
        icon: "Activity",
        title: "Network Monitoring",
        description:
          "Track Tron network status and transaction confirmations.",
      },
    ],
    benefits: [
      {
        title: "Zero Gas Fees",
        description:
          "Free transactions when you have enough bandwidth and energy.",
      },
      {
        title: "USDT Hub",
        description:
          "Tron hosts the largest portion of USDT circulation.",
      },
      {
        title: "Fast Confirmations",
        description:
          "3-second block times for quick transaction finality.",
      },
    ],
    highlights: [
      "TRC20 token support",
      "USDT-TRC20 integration",
      "Energy/bandwidth management",
      "Fast confirmations",
      "Master wallet system",
      "Automated deposits",
    ],
    adminRoutes: [
      { path: "/admin/ecosystem", label: "Ecosystem Dashboard" },
      { path: "/admin/ecosystem/wallet/master", label: "Master Wallets" },
      { path: "/admin/ecosystem/wallet/custodial", label: "Custodial Wallets" },
      { path: "/admin/ecosystem/token", label: "Tokens" },
    ],
  },

  // Monero Blockchain
  "54578959": {
    tagline: "Privacy-Focused Monero Blockchain Integration",
    features: [
      {
        icon: "Shield",
        title: "Privacy by Default",
        description:
          "Leverage Monero's built-in privacy features for confidential transactions.",
      },
      {
        icon: "Eye",
        title: "Ring Signatures",
        description:
          "Transactions are obfuscated using ring signatures and stealth addresses.",
      },
      {
        icon: "ArrowDownToLine",
        title: "Deposit Detection",
        description:
          "Automatic processing of XMR deposits with view key integration.",
      },
      {
        icon: "ArrowUpFromLine",
        title: "Secure Withdrawals",
        description:
          "Privacy-preserving withdrawal processing.",
      },
      {
        icon: "Lock",
        title: "Confidential Amounts",
        description:
          "Transaction amounts are hidden using RingCT technology.",
      },
      {
        icon: "Activity",
        title: "Blockchain Sync",
        description:
          "Efficient wallet synchronization with the Monero network.",
      },
    ],
    benefits: [
      {
        title: "True Privacy",
        description:
          "Offer users the most private cryptocurrency option.",
      },
      {
        title: "Fungibility",
        description:
          "Every XMR is equal - no tainted coins to worry about.",
      },
      {
        title: "Decentralized",
        description:
          "No central authority can trace or freeze funds.",
      },
    ],
    highlights: [
      "Ring signature privacy",
      "Stealth addresses",
      "Confidential transactions",
      "View key integration",
      "Automatic deposits",
      "Secure withdrawals",
    ],
    adminRoutes: [
      { path: "/admin/ecosystem", label: "Ecosystem Dashboard" },
      { path: "/admin/ecosystem/wallet/master", label: "Master Wallets" },
      { path: "/admin/ecosystem/wallet/custodial", label: "Custodial Wallets" },
    ],
  },

  // Chart Engine
  "61364182": {
    tagline:
      "Professional Trading Charts with 173+ Indicators & Advanced Technical Analysis",
    features: [
      {
        icon: "LineChart",
        title: "173+ Technical Indicators",
        description:
          "Comprehensive indicator library across 7 categories including Moving Averages, Oscillators, Volume, Volatility, Trend, and Advanced Specialty indicators.",
      },
      {
        icon: "Pencil",
        title: "45+ Drawing Tools",
        description:
          "Professional suite including Trend Lines, Fibonacci Tools, Gann Tools, Pitchforks, Shapes, and Annotations for complete technical analysis.",
      },
      {
        icon: "Sparkles",
        title: "Pattern Recognition",
        description:
          "Automated detection of 50+ candlestick patterns and 4 harmonic patterns (Gartley, Butterfly, Bat, Crab) with price target projections.",
      },
      {
        icon: "Activity",
        title: "Signal Aggregation",
        description:
          "Collects signals from all active indicators, calculates signal strength and confidence, and provides real-time buy/sell statistics.",
      },
      {
        icon: "History",
        title: "Trade Replay Engine",
        description:
          "Replay historical trading scenarios at adjustable speeds (0.1x to 10x) with order visualization and celebration animations.",
      },
      {
        icon: "Zap",
        title: "WebGL Acceleration",
        description:
          "Hardware-accelerated rendering with 60 FPS performance, Web Worker calculations, and smart memory management.",
      },
    ],
    benefits: [
      {
        title: "Professional Analysis",
        description:
          "Provide traders with institutional-grade charting tools and technical analysis capabilities.",
      },
      {
        title: "Better Trading Decisions",
        description:
          "Pattern recognition and signal aggregation help traders identify high-probability setups.",
      },
      {
        title: "Enhanced Engagement",
        description:
          "Interactive features like trade replay and heatmaps keep traders active on your platform.",
      },
    ],
    highlights: [
      "173+ technical indicators across 7 categories",
      "45+ professional drawing tools",
      "5 chart types (Candlestick, Line, Area, Bar, Heikin-Ashi)",
      "9 timeframes (1m to 1w)",
      "50+ candlestick pattern detection",
      "Harmonic pattern detection with PRZ calculations",
      "Divergence analysis (Regular & Hidden)",
      "Multi-timeframe analysis panels",
      "Strategy builder with risk management",
      "Heatmap visualization (Volume, Volatility, Activity)",
      "Price alert system with notifications",
      "Full keyboard shortcuts and touch support",
      "Dark & Light themes with customization",
      "WAI-ARIA accessibility compliant",
    ],
    adminRoutes: [
      { path: "/admin/finance/binary/settings", label: "Binary Settings" },
    ],
    userRoutes: [
      { path: "/binary", label: "Binary Trading" },
      { path: "/trade", label: "Spot Trading" },
    ],
  },

  // Binary AI Engine
  "61364183": {
    tagline: "AI-Powered Binary Options Trading Engine with Adaptive Win Rates",
    features: [
      {
        icon: "Brain",
        title: "Adaptive Win Rate System",
        description:
          "ML-powered win rate optimization that adapts to market conditions, user behavior, and trading volume in real-time.",
      },
      {
        icon: "Target",
        title: "User Tier Management",
        description:
          "Configure multiple user tiers with custom win rate bonuses based on trading volume and activity levels.",
      },
      {
        icon: "TestTube2",
        title: "A/B Testing Framework",
        description:
          "Built-in A/B testing with statistical significance calculations to optimize win rates and platform performance.",
      },
      {
        icon: "Users",
        title: "Cohort Analysis",
        description:
          "Segment users into cohorts and analyze performance patterns across different user groups.",
      },
      {
        icon: "Activity",
        title: "Price Correlation Monitor",
        description:
          "Monitor external price feeds from CoinGecko, Binance, and CryptoCompare to detect deviations.",
      },
      {
        icon: "Clock",
        title: "Time-Based Optimization",
        description:
          "Analyze and optimize trading patterns by hour of day and day of week for maximum platform performance.",
      },
    ],
    benefits: [
      {
        title: "Predictable Platform Profits",
        description:
          "Maintain consistent platform profitability while keeping users engaged with fair win rates.",
      },
      {
        title: "Data-Driven Decisions",
        description:
          "Make informed decisions using ML analytics, cohort analysis, and A/B test results.",
      },
      {
        title: "Price Integrity",
        description:
          "Ensure price accuracy with multi-provider correlation monitoring and deviation alerts.",
      },
    ],
    highlights: [
      "ML-based win rate optimization",
      "Multi-tier user management",
      "A/B testing with z-test significance",
      "User cohort segmentation",
      "External price correlation",
      "Time-of-day analytics",
      "Configurable cooldown periods",
      "Configuration snapshots for rollback",
      "Real-time statistics dashboard",
      "Alert system for price deviations",
    ],
    adminRoutes: [
      { path: "/admin/ai/binary-engine", label: "Dashboard" },
      { path: "/admin/ai/binary-engine/engine", label: "Engines" },
      { path: "/admin/ai/binary-engine/analytics", label: "Analytics" },
      { path: "/admin/ai/binary-engine/correlation", label: "Price Correlation" },
      { path: "/admin/ai/binary-engine/tiers", label: "User Tiers" },
      { path: "/admin/ai/binary-engine/cooldowns", label: "Cooldowns" },
      { path: "/admin/ai/binary-engine/snapshots", label: "Snapshots" },
      { path: "/admin/ai/binary-engine/settings", label: "Settings" },
    ],
  },

  // TON Blockchain
  "55715370": {
    tagline: "Telegram's High-Speed TON Blockchain Integration",
    features: [
      {
        icon: "Zap",
        title: "Ultra-Fast Transactions",
        description:
          "Leverage TON's multi-chain architecture for lightning-fast processing.",
      },
      {
        icon: "Wallet",
        title: "Jetton Support",
        description:
          "Full support for TON Jettons (TON's token standard).",
      },
      {
        icon: "ArrowDownToLine",
        title: "Deposit Processing",
        description:
          "Automatic detection and processing of TON and Jetton deposits.",
      },
      {
        icon: "ArrowUpFromLine",
        title: "Withdrawal Management",
        description:
          "Efficient withdrawal processing with low fees.",
      },
      {
        icon: "MessageCircle",
        title: "Telegram Integration",
        description:
          "Native integration with Telegram's massive user base.",
      },
      {
        icon: "Network",
        title: "Sharding Technology",
        description:
          "Infinite scalability through dynamic sharding.",
      },
    ],
    benefits: [
      {
        title: "Massive User Base",
        description:
          "Access Telegram's 800+ million users through TON integration.",
      },
      {
        title: "Instant Finality",
        description:
          "Transactions confirm in under 5 seconds.",
      },
      {
        title: "Low Costs",
        description:
          "Minimal transaction fees on TON network.",
      },
    ],
    highlights: [
      "Jetton token support",
      "Fast confirmations",
      "Telegram ecosystem",
      "Dynamic sharding",
      "Master wallet system",
      "Automated processing",
    ],
    adminRoutes: [
      { path: "/admin/ecosystem", label: "Ecosystem Dashboard" },
      { path: "/admin/ecosystem/wallet/master", label: "Master Wallets" },
      { path: "/admin/ecosystem/wallet/custodial", label: "Custodial Wallets" },
      { path: "/admin/ecosystem/token", label: "Tokens" },
    ],
  },
};

// Get product showcase data by product ID
export function getProductShowcase(productId: string): ProductShowcase | null {
  return productShowcaseData[productId] || null;
}

// Check if a product has showcase data
export function hasShowcaseData(productId: string): boolean {
  return productId in productShowcaseData;
}
