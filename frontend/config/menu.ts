// lib/menu.ts

export const adminMenu: MenuItem[] = [
  {
    key: "admin-dashboard",
    title: "Dashboard",
    href: "/admin",
    permission: "access.admin",
    icon: "solar:home-angle-line-duotone",
    description:
      "Comprehensive administrative overview with real-time analytics, system health monitoring, and quick access to critical management functions.",
  },
  {
    key: "admin-user-management",
    title: "Users",
    href: "/admin/crm",
    icon: "solar:users-group-two-rounded-bold-duotone",
    description:
      "Complete user lifecycle management including registration, verification, role assignment, and customer relationship tools for comprehensive user administration.",
    permission: [
      "access.user",
      "access.role",
      "access.permission",
      "access.kyc.application",
      "access.kyc.level",
      "access.support.ticket",
    ],
    child: [
      {
        key: "admin-users",
        title: "Users",
        icon: "ph:users-duotone",
        href: "/admin/crm/user",
        description:
          "Comprehensive user database with advanced filtering, bulk operations, profile management, and detailed activity tracking.",
        permission: "access.user",
      },
      {
        key: "admin-roles-permissions",
        title: "Roles & Permissions",
        icon: "ph:shield-check-duotone",
        description:
          "Advanced access control system for defining user roles, managing permissions, and implementing security policies across the platform.",
        permission: ["access.role", "access.permission"],
        child: [
          {
            key: "admin-roles",
            title: "User Roles",
            href: "/admin/crm/role",
            permission: "access.role",
            icon: "ph:shield-check-duotone",
            description:
              "Create and manage user roles with customizable permission sets and hierarchical access control structures.",
          },
          {
            key: "admin-permissions",
            title: "Permissions",
            href: "/admin/crm/permission",
            permission: "access.permission",
            icon: "ph:key-duotone",
            description:
              "Granular permission management for fine-tuned access control across all system functions and features.",
          },
        ],
      },
      {
        key: "admin-compliance",
        title: "Compliance & Verification",
        icon: "ph:certificate-duotone",
        description:
          "Regulatory compliance tools including KYC processing, document verification, and identity management for legal adherence.",
        permission: ["access.kyc.application", "access.kyc.level"],
        child: [
          {
            key: "admin-kyc-applications",
            title: "KYC Applications",
            href: "/admin/crm/kyc/application",
            permission: "access.kyc.application",
            icon: "ph:identification-card-duotone",
            description:
              "Review and process Know Your Customer applications with document verification, risk assessment, and approval workflows.",
          },
          {
            key: "admin-kyc-levels",
            title: "Verification Levels",
            href: "/admin/crm/kyc/level",
            permission: "access.kyc.level",
            icon: "ph:ranking-duotone",
            description:
              "Configure verification tiers with customizable requirements, limits, and access privileges for different user categories.",
          },
        ],
      },
      {
        key: "admin-support",
        title: "Customer Support",
        icon: "ph:headset-duotone",
        href: "/admin/crm/support",
        permission: "access.support.ticket",
        description:
          "Integrated support ticket system with priority management, response tracking, and customer satisfaction monitoring.",
      },
      {
        key: "admin-api-management",
        title: "API Management",
        icon: "carbon:api",
        href: "/admin/api/key",
        permission: "access.api.key",
        description:
          "API key lifecycle management with usage monitoring, rate limiting, and security controls for third-party integrations.",
      },
    ],
  },
  {
    key: "admin-financial-operations",
    title: "Finance",
    href: "/admin/finance",
    icon: "solar:dollar-minimalistic-bold-duotone",
    description:
      "Comprehensive financial management suite covering revenue analytics, currency management, payment processing, and transaction oversight.",
    permission: [
      "access.admin.profit",
      "access.fiat.currency",
      "access.spot.currency",
      "access.deposit.gateway",
      "access.deposit.method",
      "access.deposit",
      "access.exchange",
      "access.investment.plan",
      "access.investment.duration",
      "access.investment",
      "access.binary.order",
      "access.exchange.order",
      "access.ecosystem.order",
      "access.futures.order",
      "access.transaction",
      "access.transfer",
      "access.wallet",
      "access.withdraw.method",
      "access.withdraw",
    ],
    child: [
      {
        key: "admin-analytics",
        title: "Revenue Analytics",
        icon: "ph:chart-line-up-duotone",
        href: "/admin/finance/profit",
        permission: "access.admin.profit",
        description:
          "Advanced financial analytics with profit tracking, revenue streams analysis, and comprehensive business intelligence dashboards.",
      },
      {
        key: "admin-currencies",
        title: "Currency Management",
        icon: "ph:currency-circle-dollar-duotone",
        description:
          "Multi-currency support with real-time exchange rates, trading pairs configuration, and market data integration.",
        permission: ["access.fiat.currency", "access.spot.currency"],
        child: [
          {
            key: "admin-fiat-currencies",
            title: "Fiat Currencies",
            href: "/admin/finance/currency/fiat",
            permission: "access.fiat.currency",
            icon: "ph:currency-dollar-duotone",
            description:
              "Traditional currency management with exchange rate monitoring, regional settings, and payment gateway integration.",
          },
          {
            key: "admin-crypto-currencies",
            title: "Cryptocurrencies",
            href: "/admin/finance/currency/spot",
            permission: "access.spot.currency",
            icon: "ph:currency-btc-duotone",
            description:
              "Digital asset management with blockchain integration, wallet connectivity, and real-time market data feeds.",
          },
        ],
      },
      {
        key: "admin-payment-systems",
        title: "Payment Systems",
        icon: "ph:credit-card-duotone",
        description:
          "Complete payment infrastructure management including gateways, methods, and transaction processing oversight.",
        permission: ["access.deposit.gateway", "access.deposit.method", "access.deposit"],
        child: [
          {
            key: "admin-payment-gateways",
            title: "Payment Gateways",
            href: "/admin/finance/deposit/gateway",
            permission: "access.deposit.gateway",
            icon: "ri:secure-payment-line",
            description:
              "Configure and monitor payment gateways with fraud detection, compliance checks, and performance analytics.",
          },
          {
            key: "admin-payment-methods",
            title: "Payment Methods",
            href: "/admin/finance/deposit/method",
            permission: "access.deposit.method",
            icon: "ph:wallet-duotone",
            description:
              "Manage available payment options including cards, bank transfers, digital wallets, and cryptocurrency payments.",
          },
          {
            key: "admin-deposit-logs",
            title: "Deposit Records",
            href: "/admin/finance/deposit/log",
            permission: "access.deposit",
            icon: "ph:download-simple-duotone",
            description:
              "Comprehensive deposit transaction logs with status tracking, reconciliation tools, and audit capabilities.",
          },
        ],
      },
      {
        key: "admin-trading-infrastructure",
        title: "Trading Infrastructure",
        icon: "ph:chart-bar-duotone",
        description:
          "Trading platform management including exchange providers, market configurations, and order processing systems.",
        permission: "access.exchange",
        child: [
          {
            key: "admin-exchange-providers",
            title: "Exchange Providers",
            href: "/admin/finance/exchange",
            icon: "material-symbols-light:component-exchange",
            permission: "access.exchange",
            description:
              "Manage exchange integrations with liquidity providers, API configurations, and performance monitoring.",
          },
        ],
          },
          {
            key: "admin-binary-trading",
            title: "Binary Options",
            icon: "humbleicons:exchange-vertical",
        href: "/admin/finance/binary",
            description:
              "Binary options trading system with market setup, duration management, and payout configuration.",
            permission: ["access.binary.market", "access.binary.duration"],
            child: [
              {
                key: "admin-binary-markets",
                title: "Binary Markets",
                href: "/admin/finance/binary/market",
                permission: "access.binary.market",
                icon: "ri:exchange-2-line",
                description:
                  "Configure binary options markets with asset pairs, trading parameters, and market hours.",
              },
              {
                key: "admin-binary-durations",
                title: "Trading Durations",
                href: "/admin/finance/binary/duration",
                permission: "access.binary.duration",
                icon: "ph:clock-duotone",
                description:
                  "Set trading timeframes and payout percentages for binary options with risk management controls.",
          },
        ],
      },
      {
        key: "admin-investment-management",
        title: "Investment Management",
        icon: "solar:course-up-bold-duotone",
        description:
          "Investment product management with plan creation, performance tracking, and portfolio oversight tools.",
        permission: ["access.investment.plan", "access.investment.duration", "access.investment"],
        child: [
          {
            key: "admin-investment-plans",
            title: "Investment Plans",
            href: "/admin/finance/investment/plan",
            permission: "access.investment.plan",
            icon: "solar:planet-2-bold-duotone",
            description:
              "Create and manage investment products with risk profiles, return calculations, and term configurations.",
          },
          {
            key: "admin-investment-durations",
            title: "Investment Durations",
            href: "/admin/finance/investment/duration",
            permission: "access.investment.duration",
            icon: "ph:hourglass-duotone",
            description:
              "Configure investment durations, maturity periods, and compound interest calculations for various products.",
          },
          {
            key: "admin-investment-history",
            title: "Investment Analytics",
            href: "/admin/finance/investment/history",
            permission: "access.investment",
            icon: "ph:chart-line-duotone",
            description:
              "Comprehensive investment performance analytics with ROI tracking and portfolio management insights.",
          },
        ],
      },
      {
        key: "admin-order-management",
        title: "Order Management",
        icon: "solar:clipboard-list-bold-duotone",
        description:
          "Centralized order processing and management across all trading platforms and asset classes.",
        permission: [
          "access.binary.order",
          "access.exchange.order",
          "access.ecosystem.order",
          "access.futures.order",
        ],
        child: [
          {
            key: "admin-binary-orders",
            title: "Binary Orders",
            href: "/admin/finance/order/binary",
            icon: "tabler:binary-tree",
            permission: "access.binary.order",
            env: process.env.NEXT_PUBLIC_BINARY_STATUS,
            description:
              "Monitor and manage binary options orders with execution tracking and settlement processing.",
          },
          {
            key: "admin-spot-orders",
            title: "Spot Orders",
            href: "/admin/finance/order/exchange",
            permission: "access.exchange.order",
            icon: "bi:currency-exchange",
            description:
              "Spot trading order management with real-time execution monitoring and market impact analysis.",
          },
          {
            key: "admin-ecosystem-orders",
            title: "Ecosystem Orders",
            href: "/admin/finance/order/ecosystem",
            permission: "access.ecosystem.order",
            extension: "ecosystem",
            icon: "mdi:briefcase-exchange-outline",
            description:
              "Blockchain ecosystem trading orders with smart contract integration and decentralized execution.",
          },
          {
            key: "admin-futures-orders",
            title: "Futures Orders",
            href: "/admin/finance/order/futures",
            permission: "access.futures.order",
            extension: "futures",
            icon: "mdi:chart-line-variant",
            description:
              "Futures contract order management with margin tracking and risk assessment tools.",
          },
        ],
      },
      {
        key: "admin-transaction-management",
        title: "Transaction Management",
        icon: "solar:transfer-horizontal-bold-duotone",
        description:
          "Complete transaction oversight with detailed logging, reconciliation, and transfer management capabilities.",
        permission: ["access.transaction", "access.transfer", "access.wallet"],
        child: [
          {
            key: "admin-transaction-logs",
            title: "Transaction Logs",
            href: "/admin/finance/transaction",
            permission: "access.transaction",
            icon: "solar:clipboard-list-bold-duotone",
            description:
              "Comprehensive transaction history with advanced filtering, export capabilities, and audit trails.",
          },
          {
            key: "admin-internal-transfers",
            title: "Internal Transfers",
            href: "/admin/finance/transfer",
            permission: "access.transfer",
            icon: "solar:transfer-vertical-line-duotone",
            description:
              "Manage internal fund transfers between accounts with approval workflows and compliance checks.",
          },
          {
            key: "admin-wallet-management",
            title: "Wallet Management",
            href: "/admin/finance/wallet",
            permission: "access.wallet",
            icon: "ph:wallet-duotone",
            description:
              "Multi-currency wallet administration with balance monitoring, security controls, and backup management.",
          },
        ],
      },
      {
        key: "admin-withdrawal-management",
        title: "Withdrawal Management",
        icon: "ph:hand-withdraw-duotone",
        href: "/admin/finance/withdraw/log",
        description:
          "Comprehensive withdrawal system management with automated processing, fraud prevention, and compliance controls.",
        permission: ["access.withdraw.method", "access.withdraw"],
        child: [
          {
            key: "admin-withdrawal-methods",
            title: "Withdrawal Methods",
            href: "/admin/finance/withdraw/method",
            permission: "access.withdraw.method",
            icon: "ph:bank-duotone",
            description:
              "Configure withdrawal options including bank transfers, crypto withdrawals, and third-party processors.",
          },
          {
            key: "admin-withdrawal-logs",
            title: "Withdrawal Records",
            href: "/admin/finance/withdraw/log",
            permission: "access.withdraw",
            icon: "ph:upload-simple-duotone",
            description:
              "Monitor withdrawal requests with status tracking, approval workflows, and compliance verification.",
          },
        ],
      },
    ],
  },
  {
    key: "admin-content-management",
    title: "Content",
    href: "/admin/content",
    icon: "solar:document-text-bold-duotone",
    description: "Comprehensive content management system for blogs, media assets, and dynamic website content.",
    permission: ["access.content.media", "access.content.slider"],
    child: [
      {
        key: "admin-blog-system",
        title: "Blog System",
        href: "/admin/blog",
        icon: "solar:document-add-bold-duotone",
        description:
          "Complete blog management with author profiles, content scheduling, SEO optimization, and engagement analytics.",
      },
      {
        key: "admin-media-library",
        title: "Media Library",
        icon: "ph:image-duotone",
        href: "/admin/content/media",
        permission: "access.content.media",
        description:
          "Centralized media management with cloud storage, image optimization, and CDN integration for optimal performance.",
      },
      {
        key: "admin-homepage-sliders",
        title: "Homepage Sliders",
        icon: "solar:slider-vertical-bold-duotone",
        href: "/admin/content/slider",
        permission: "access.content.slider",
        description:
          "Dynamic homepage content management with responsive sliders, call-to-action buttons, and A/B testing capabilities.",
      },
    ],
  },
  {
    key: "admin-platform-extensions",
    title: "Extensions",
    href: "/admin/extensions",
    icon: "ph:puzzle-piece-duotone",
    description:
      "Advanced platform extensions providing specialized functionality for trading, marketplace, and business operations.",
    megaMenu: [
      {
        key: "admin-trading-extensions",
        title: "Trading Platforms",
        icon: "ph:chart-line-duotone",
        image: "/img/megamenu/extensions/trading.svg",
        description:
          "Professional trading platforms with advanced order types, market analysis tools, and institutional-grade execution.",
        child: [
          {
            key: "admin-ecosystem-platform",
            title: "Blockchain Ecosystem",
            icon: "ph:globe-duotone",
            extension: "ecosystem",
            permission: "access.ecosystem",
            href: "/admin/ecosystem",
            description:
              "Decentralized trading ecosystem with blockchain integration, DeFi protocols, and smart contract automation.",
            features: [
              "Native Token Trading Engine",
              "15+ Blockchain Networks",
              "Multi-Chain Wallet System",
              "Market & Limit Orders",
              "Real-Time Order Book",
              "WebSocket Price Streaming",
            ],
          },
          {
            key: "admin-futures-platform",
            title: "Futures Trading",
            icon: "ph:chart-line-duotone",
            extension: "futures",
            permission: "access.futures.market",
            href: "/admin/futures/market",
            description:
              "Professional futures trading platform with margin management, risk controls, and institutional execution.",
            features: [
              "Perpetual Futures Contracts",
              "Leverage Trading (1x-100x)",
              "Long & Short Positions",
              "Real-Time Liquidation Engine",
              "Cross-Margin Support",
              "Funding Rate System",
            ],
          },
          {
            key: "admin-forex-platform",
            title: "Forex Trading",
            icon: "ph:currency-dollar-simple-duotone",
            extension: "forex",
            permission: "access.forex.account",
            href: "/admin/forex/account",
            description:
              "Professional forex trading with MetaTrader integration, algorithmic trading, and institutional liquidity.",
            features: [
              "Demo & Live Trading Accounts",
              "Flexible Investment Plans",
              "Signal & Copy Trading",
              "Multi-Broker Support (MT4/MT5)",
              "Fraud Detection System",
              "Real-Time Analytics Dashboard",
            ],
          },
          {
            key: "admin-p2p-platform",
            title: "P2P Exchange",
            icon: "ph:users-four-duotone",
            extension: "p2p",
            permission: "access.p2p",
            href: "/admin/p2p",
            description:
              "Peer-to-peer trading platform with escrow services, dispute resolution, and multi-payment gateway support.",
            features: [
              "Secure Escrow System",
              "Smart Offer Matching",
              "Real-Time Trade Chat",
              "Dispute Resolution System",
              "Review & Rating System",
              "Payment Methods Management",
            ],
          },
          {
            key: "admin-copy-trading-platform",
            title: "Copy Trading",
            icon: "ph:copy-duotone",
            extension: "copy_trading",
            permission: "access.copy-trading",
            href: "/admin/copy-trading",
            description:
              "Social trading platform enabling users to follow and automatically copy trades from successful traders.",
            features: [
              "Automated Trade Replication",
              "Leader/Follower System",
              "Real-Time Copy via WebSocket",
              "Multiple Copy Modes",
              "Profit Share Distribution",
              "Leader Performance Analytics",
            ],
          },
          {
            key: "admin-ai-market-maker-platform",
            title: "AI Market Maker",
            icon: "ph:robot-duotone",
            extension: "ai_market_maker",
            permission: "access.ai.market-maker",
            href: "/admin/ai/market-maker",
            description:
              "AI-powered market making system with automated trading bots, liquidity management, and intelligent price discovery.",
            features: [
              "Automated Market Making",
              "Multiple Bot Personalities",
              "Price Stabilization System",
              "Pool-Based Liquidity",
              "Three Aggression Levels",
              "Real-Time Monitoring",
            ],
          },
        ],
      },
      {
        key: "admin-investment-extensions",
        title: "Investment Products",
        icon: "ph:lightning-duotone",
        image: "/img/megamenu/extensions/investment.svg",
        description:
          "Advanced investment products with AI-driven strategies, staking services, and tokenization platforms.",
        child: [
          {
            key: "admin-ai-investment",
            title: "AI Investment",
            icon: "ph:robot-duotone",
            extension: "ai_investment",
            permission: "access.ai.investment",
            href: "/admin/ai/investment/plan",
            description:
              "Artificial intelligence-powered investment management with machine learning algorithms and automated portfolio optimization.",
            features: [
              "Customizable AI Investment Plans",
              "Flexible Duration Options",
              "Automated ROI Distribution",
              "Multi-Wallet Support (SPOT & ECO)",
              "Expected Profit Calculator",
              "Comprehensive Admin Dashboard",
            ],
          },
          {
            key: "admin-staking-platform",
            title: "Staking Services",
            icon: "ph:stack-duotone",
            extension: "staking",
            permission: "access.staking",
            href: "/admin/staking",
            description:
              "Comprehensive staking platform with validator management, reward distribution, and slashing protection.",
            features: [
              "Flexible Staking Pools",
              "Configurable APR Rates",
              "Auto-Compound Feature",
              "Earning Frequency Options",
              "Early Withdrawal Penalties",
              "Automated Reward Distribution",
            ],
          },
          {
            key: "admin-ico-platform",
            title: "Token Sales",
            icon: "hugeicons:ico",
            extension: "ico",
            permission: "access.ico",
            href: "/admin/ico",
            description:
              "Initial Coin Offering platform with KYC integration, smart contract deployment, and regulatory compliance.",
            features: [
              "Multi-Phase Token Sales",
              "Advanced Token Vesting",
              "Creator Portal & Dashboard",
              "Investor Portfolio Dashboard",
              "Refund System with Batch Processing",
              "Multi-Blockchain Support",
            ],
          },
        ],
      },
      {
        key: "admin-marketplace-extensions",
        title: "Marketplace Solutions",
        icon: "ph:shopping-cart-duotone",
        image: "/img/megamenu/extensions/marketplace.svg",
        description:
          "E-commerce and digital marketplace platforms with comprehensive seller tools and buyer protection.",
        child: [
          {
            key: "admin-ecommerce-platform",
            title: "E-commerce Platform",
            icon: "ph:storefront-duotone",
            extension: "ecommerce",
            permission: "access.ecommerce.category",
            href: "/admin/ecommerce",
            description:
              "Full-featured e-commerce platform with inventory management, order processing, and multi-vendor support.",
            features: [
              "Digital & Physical Products",
              "Shopping Cart & Checkout",
              "Multi-Wallet Payments",
              "Discount & Coupon System",
              "Order & Shipment Tracking",
              "Review & Rating System",
            ],
          },
          {
            key: "admin-nft-marketplace",
            title: "NFT Marketplace",
            icon: "ph:image-square-duotone",
            extension: "nft",
            permission: "access.nft",
            href: "/admin/nft",
            description:
              "Professional NFT marketplace with minting tools, royalty management, and auction capabilities.",
            features: [
              "Multi-Chain NFT Support",
              "Smart Contract Deployment",
              "Batch Minting System",
              "Fixed Price & Auction Sales",
              "Real-Time Live Bidding",
              "Automated Royalties (EIP-2981)",
            ],
          },
        ],
      },
      {
        key: "admin-business-extensions",
        title: "Business Tools",
        icon: "ph:briefcase-duotone",
        image: "/img/megamenu/extensions/others.svg",
        description:
          "Essential business tools for marketing, customer support, and knowledge management.",
        child: [
          {
            key: "admin-affiliate-system",
            title: "Affiliate Program",
            icon: "ph:handshake-duotone",
            extension: "mlm",
            permission: "access.affiliate",
            href: "/admin/affiliate",
            description:
              "Multi-level affiliate program with commission tracking, performance analytics, and automated payouts.",
            features: [
              "3 MLM Structures (Direct/Binary/Unilevel)",
              "Multi-Level Commission Distribution",
              "10+ Reward Trigger Conditions",
              "Referral Link & QR Code Generator",
              "Network Visualization",
              "Top Performer Tracking",
            ],
          },
          {
            key: "admin-knowledge-base",
            title: "Knowledge Base",
            icon: "ph:book-open-duotone",
            extension: "knowledge_base",
            permission: "access.faq",
            href: "/admin/faq",
            description:
              "Comprehensive knowledge management system with AI-powered search and content optimization.",
            features: [
              "Dynamic FAQ Management",
              "AI-Powered FAQ Generation",
              "User Feedback System",
              "Full-Text Search",
              "Category & Tag Organization",
              "Analytics Dashboard",
            ],
          },
          {
            key: "admin-email-marketing",
            title: "Email Marketing",
            icon: "ph:envelope-duotone",
            extension: "mailwizard",
            permission: "access.mailwizard.campaign",
            href: "/admin/mailwizard/campaign",
            description:
              "Professional email marketing platform with automation workflows, A/B testing, and analytics.",
            features: [
              "Visual Template Builder",
              "Drag-and-Drop Editor",
              "Campaign Management",
              "Audience Segmentation",
              "Open & Click Tracking",
              "A/B Testing Support",
            ],
          },
          {
            key: "admin-payment-gateway",
            title: "Payment Gateway",
            icon: "ph:credit-card-duotone",
            extension: "gateway",
            permission: "access.gateway.merchant",
            href: "/admin/gateway",
            description:
              "Payment gateway system allowing merchants to accept payments through the platform.",
            features: [
              "Multi-Wallet Payments",
              "Merchant Onboarding System",
              "Dual API Key System",
              "5 Checkout Themes",
              "WooCommerce Plugin",
              "Webhook Notifications",
            ],
          },
        ],
      },
    ],
  },
  {
    key: "admin-system-administration",
    title: "System",
    href: "/admin/system",
    icon: "solar:settings-bold-duotone",
    description:
      "Complete system administration suite for platform configuration, monitoring, and maintenance operations.",
    permission: [
      "access.system.announcement",
      "access.cron",
      "access.extension",
      "access.notification.template",
      "access.settings",
      "access.system.update",
      "access.admin.system.upgrade",
    ],
    child: [
      {
        key: "admin-platform-settings",
        title: "Platform Settings",
        href: "/admin/system/settings",
        icon: "ph:gear-duotone",
        permission: "access.settings",
        description:
          "Core platform configuration including branding, localization, security policies, and feature toggles.",
      },
      {
        key: "admin-system-updates",
        title: "System Updates",
        href: "/admin/system/update",
        icon: "ph:download-duotone",
        permission: "access.system.update",
        description:
          "Automated system updates with rollback capabilities, security patches, and feature deployment management.",
      },
      {
        key: "admin-extension-manager",
        title: "Extension Manager",
        href: "/admin/system/extension",
        icon: "ph:puzzle-piece-duotone",
        permission: "access.extension",
        description:
          "Extension lifecycle management with installation, updates, dependency resolution, and compatibility checking.",
      },
      {
        key: "admin-communication",
        title: "Communication Tools",
        icon: "ph:chat-circle-duotone",
        description:
          "Platform communication management including notifications, announcements, and user messaging systems.",
        permission: ["access.notification.template", "access.system.announcement"],
        child: [
          {
            key: "admin-notification-templates",
            title: "Notification Templates",
            href: "/admin/system/notification/template",
            permission: "access.notification.template",
            icon: "ph:bell-duotone",
            description:
              "Customizable notification templates with multi-channel delivery and personalization variables.",
          },
          {
            key: "admin-system-announcements",
            title: "System Announcements",
            href: "/admin/system/announcement",
            permission: "access.system.announcement",
            icon: "ph:megaphone-duotone",
            description:
              "Platform-wide announcement system with scheduling, targeting, and engagement tracking capabilities.",
          },
        ],
      },
      {
        key: "admin-monitoring",
        title: "System Monitoring",
        icon: "ph:monitor-duotone",
        description:
          "Comprehensive system monitoring with logging, performance metrics, and automated task management.",
        permission: "access.cron",
        child: [
          {
            key: "admin-scheduled-tasks",
            title: "Scheduled Tasks",
            href: "/admin/system/cron",
            permission: "access.cron",
            icon: "ph:calendar-duotone",
            description:
              "Automated task scheduler with job monitoring, failure handling, and performance optimization.",
          },
        ],
      },
      {
        key: "admin-maintenance-tools",
        title: "Maintenance Tools",
        href: "/admin/system/upgrade-helper",
        icon: "ph:wrench-duotone",
        permission: "access.admin.system.upgrade",
        description:
          "System maintenance utilities including database optimization, cache management, and migration tools.",
      },
      {
        key: "admin-appearance",
        title: "Appearance & Design",
        icon: "solar:palette-bold-duotone",
        description:
          "Customize your website appearance and design with advanced visual tools.",
        permission: "access.admin",
        child: [
          {
            key: "admin-design-builder",
            title: "Page Builder",
            href: "/admin/builder",
            icon: "solar:widget-4-bold-duotone",
            permission: "access.admin",
            settingConditions: { landingPageType: "CUSTOM" },
            description:
              "Advanced visual page builder with drag-and-drop interface, responsive design tools, and brand customization options.",
          },
          {
            key: "admin-design-default-editor",
            title: "Default Pages",
            href: "/admin/default-editor",
            icon: "solar:code-bold-duotone",
            permission: "access.admin",
            settingConditions: { landingPageType: "DEFAULT" },
            description:
              "Edit default frontend pages including home, legal pages, and layouts with code editor interface.",
          },
        ],
      },
    ],
  },
];

export const userMenu: MenuItem[] = [
  {
    key: "user-trading",
    title: "Trading",
    href: "/trade",
    icon: "solar:chart-2-bold-duotone",
    description:
      "Access comprehensive trading platforms with advanced charting tools, real-time market data, and professional-grade execution capabilities for all asset classes.",
    child: [
      {
        key: "user-trading-spot",
        title: "Spot Trading",
        href: "/trade",
        icon: "solar:chart-2-bold-duotone",
        description:
          "Execute immediate buy and sell orders at current market prices with advanced order types, depth charts, and professional trading tools.",
      },
      {
        key: "user-trading-binary",
        title: "Binary Options",
        href: "/binary",
        icon: "mdi:chart-line",
        env: process.env.NEXT_PUBLIC_BINARY_STATUS,
        description:
          "Trade binary options with sophisticated analytics, risk management tools, and streamlined execution for time-sensitive strategies.",
      },
      {
        key: "user-trading-forex",
        title: "Forex",
        href: "/forex",
        icon: "mdi:chart-line-variant",
        extension: "forex",
        description:
          "Access global foreign exchange markets with MetaTrader 4/5 integration, advanced charting, and institutional-grade execution.",
      },
      {
        key: "user-trading-p2p",
        title: "P2P Exchange",
        href: "/p2p",
        icon: "material-symbols-light:p2p-outline",
        extension: "p2p",
        description:
          "Engage in secure peer-to-peer cryptocurrency trading with escrow protection, flexible payment methods, and competitive rates.",
      },
      {
        key: "user-trading-copy",
        title: "Copy Trading",
        href: "/copy-trading",
        icon: "ph:copy-duotone",
        extension: "copy_trading",
        description:
          "Follow and automatically copy trades from successful traders with customizable risk settings and real-time performance tracking.",
      },
    ],
  },
  {
    key: "user-investments",
    title: "Investments",
    icon: "solar:course-up-line-duotone",
    auth: true,
    description:
      "Diversified investment opportunities with professional-grade analytics, risk assessment tools, and performance tracking across multiple asset classes.",
    child: [
      {
        key: "user-investments-plans",
        title: "Investment Plans",
        href: "/investment",
        icon: "solar:course-up-line-duotone",
        auth: true,
        settings: ["investment"],
        description:
          "Curated investment strategies with detailed risk profiles, historical performance data, and flexible terms to match your financial goals.",
      },
      {
        key: "user-investments-staking",
        title: "Staking Rewards",
        href: "/staking",
        icon: "mdi:bank-outline",
        extension: "staking",
        description:
          "Earn passive income through cryptocurrency staking with competitive APY rates, flexible lock periods, and automated reward distribution.",
      },
      {
        key: "user-investments-ico",
        title: "Token Sales",
        href: "/ico",
        icon: "solar:dollar-minimalistic-line-duotone",
        extension: "ico",
        description:
          "Early access to vetted Initial Coin Offerings with comprehensive due diligence reports, tokenomics analysis, and investment tracking.",
      },
    ],
  },
  {
    key: "user-marketplace",
    title: "Marketplace",
    icon: "solar:bag-smile-bold-duotone",
    description:
      "Explore premium digital and physical marketplaces with secure transactions, verified sellers, and comprehensive buyer protection.",
    child: [
      {
        key: "user-marketplace-nft",
        title: "NFT Marketplace",
        href: "/nft",
        icon: "ph:image-square-duotone",
        extension: "nft",
        description:
          "Discover, create, and trade unique digital assets in our curated NFT marketplace with auction capabilities and creator royalties.",
      },
             {
         key: "user-marketplace-store",
         title: "Store",
         href: "/ecommerce",
         icon: "solar:bag-smile-bold-duotone",
         extension: "ecommerce",
         description:
           "Premium marketplace featuring both digital and physical products with secure payment processing, worldwide shipping, and buyer protection.",
       },
    ],
  },
  {
    key: "user-services",
    title: "Services",
    icon: "solar:settings-bold-duotone",
    auth: true,
    description:
      "Professional services and tools to enhance your trading experience, including affiliate programs, educational resources, and premium support.",
    child: [
      {
        key: "user-services-affiliate",
        title: "Affiliate Program",
        href: "/affiliate",
        icon: "mdi:handshake-outline",
        extension: "mlm",
        auth: true,
        description:
          "Monetize your network through our comprehensive affiliate program with competitive commissions, real-time tracking, and marketing tools.",
      },
      {
        key: "user-services-merchant",
        title: "Merchant Gateway",
        href: "/gateway",
        icon: "ph:storefront-duotone",
        extension: "gateway",
        description:
          "Accept payments from customers through our secure payment gateway with API integration and real-time transaction tracking.",
      },
      {
        key: "user-services-support",
        title: "Support Center",
        href: "/support",
        icon: "mdi:head-question",
        auth: true,
        description:
          "Professional customer support with ticket management, live chat capabilities, and dedicated account management for premium users.",
      },
      {
        key: "user-services-faq",
        title: "Knowledge Base",
        href: "/faq",
        icon: "ph:question-duotone",
        extension: "knowledge_base",
        description:
          "Comprehensive documentation, tutorials, and frequently asked questions to help you maximize platform capabilities.",
      },
    ],
  },
     {
     key: "user-insights",
     title: "Insights",
     href: "/blog",
     icon: "fluent:content-view-28-regular",
     env: process.env.NEXT_PUBLIC_BLOG_STATUS,
     description:
       "Professional market analysis, trading insights, and industry news from our team of financial experts and market researchers.",
   },
];

function isItemVisible(
  item: MenuItem,
  user: any,
  checkPermission: (permissions?: string | string[]) => boolean,
  hasExtension: (name: string) => boolean,
  getSetting: (key: string) => string | null,
  isAdminMenu: boolean = false
): boolean {
  const hasPermission =
    item.auth === false
      ? !user
      : item.permission
        ? user !== null && checkPermission(item.permission)
        : true;

  const hasRequiredExtension = !item.extension || hasExtension(item.extension);
  const hasRequiredSetting =
    !item.settings || item.settings.every((s) => getSetting(s) === "true");
  const hasRequiredSettingConditions =
    !item.settingConditions ||
    Object.entries(item.settingConditions).every(
      ([key, value]) => getSetting(key) === value
    );
  const isEnvValid = !item.env || item.env === "true";

  // For admin menu, show extensions even if not enabled (they'll be marked as disabled)
  // This allows admins to see what extensions are available but not enabled
  if (isAdminMenu && item.extension) {
    return (
      hasPermission &&
      hasRequiredSetting &&
      hasRequiredSettingConditions &&
      isEnvValid
    );
  }

  // For regular user menu, hide items that require extensions that are not installed/enabled
  // This ensures users don't see menu items for features they can't access
  return (
    hasPermission &&
    hasRequiredExtension &&
    hasRequiredSetting &&
    hasRequiredSettingConditions &&
    isEnvValid
  );
}

function filterChildItems(
  items: MenuItem[] | undefined,
  user: any,
  checkPermission: (permissions?: string | string[]) => boolean,
  hasExtension: (name: string) => boolean,
  getSetting: (key: string) => string | null,
  isAdminMenu: boolean = false
): MenuItem[] | undefined {
  if (!items) return undefined;

  const filtered = items
    .map((item) =>
      filterMenuItem(item, user, checkPermission, hasExtension, getSetting, isAdminMenu)
    )
    .filter((item): item is MenuItem => !!item);

  return filtered.length > 0 ? filtered : undefined;
}

function filterMegaMenuItems(
  megaMenu: MenuItem[] | undefined,
  user: any,
  checkPermission: (permissions?: string | string[]) => boolean,
  hasExtension: (name: string) => boolean,
  getSetting: (key: string) => string | null,
  isAdminMenu: boolean = false
): MenuItem[] | undefined {
  if (!megaMenu) return undefined;

  const filtered = megaMenu
    .map((item) =>
      filterMenuItem(item, user, checkPermission, hasExtension, getSetting, isAdminMenu)
    )
    .filter((item): item is MenuItem => !!item);

  return filtered.length > 0 ? filtered : undefined;
}

function filterMenuItem(
  item: MenuItem,
  user: any,
  checkPermission: (permissions?: string | string[]) => boolean,
  hasExtension: (name: string) => boolean,
  getSetting: (key: string) => string | null,
  isAdminMenu: boolean = false
): MenuItem | null {
  const filteredChild = filterChildItems(
    item.child,
    user,
    checkPermission,
    hasExtension,
    getSetting,
    isAdminMenu
  );

  const filteredMegaMenu = filterMegaMenuItems(
    item.megaMenu,
    user,
    checkPermission,
    hasExtension,
    getSetting,
    isAdminMenu
  );

  const updatedItem = {
    ...item,
    child: filteredChild,
    megaMenu: filteredMegaMenu,
    // Add disabled state for admin menu extensions
    disabled: isAdminMenu && item.extension && !hasExtension(item.extension) ? true : false,
  };

  if (
    !isItemVisible(updatedItem, user, checkPermission, hasExtension, getSetting, isAdminMenu)
  ) {
    return null;
  }

  // For user menu: Hide parent items that have children but no visible children after filtering
  // This ensures menu items like "Marketplace" are hidden when all child extensions are disabled
  if (!isAdminMenu && item.child && !filteredChild) {
    return null;
  }

  return updatedItem;
}

export function getMenu({
  user,
  settings,
  extensions,
  activeMenuType = "user",
}: GetFilteredMenuOptions): MenuItem[] {
  const menu = activeMenuType === "admin" ? adminMenu : userMenu;
  const isAdminMenu = activeMenuType === "admin";
  const userPermissions = user?.role?.permissions ?? [];

  const checkPermission = (permissions?: string | string[]) => {
    if (user?.role?.name === "Super Admin") return true;
    if (!permissions) return true;
    const perms = Array.isArray(permissions) ? permissions : [permissions];
    if (perms.length === 0) return true;
    
    // Convert permission objects to permission names for comparison
    const userPermissionNames = userPermissions.map((p: any) => 
      typeof p === 'string' ? p : p.name
    );
    
    return perms.every((perm) => userPermissionNames.includes(perm));
  };

  const hasExtension = (name: string) => {
    if (!extensions) return false;
    const hasExt = extensions.includes(name);
    
    return hasExt;
  };

  const getSetting = (key: string) => {
    if (!settings) return null;
    return settings[key] || null;
  };

  const filteredMenu = menu
    .map((item) =>
      filterMenuItem(item, user, checkPermission, hasExtension, getSetting, isAdminMenu)
    )
    .filter((item): item is MenuItem => !!item);

  // Debug logging for final filtered menu in admin
  if (isAdminMenu && typeof window !== 'undefined') {
    const extensionItems = filteredMenu.find(item => item.key === "admin-platform-extensions");
  }

  return filteredMenu;
}
