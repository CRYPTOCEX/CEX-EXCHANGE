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
  //
  // THE PRODUCT NAME IS THE PRODUCT NAME; THE SENTENCES MUST NOT ASSERT
  // ALGORITHMS. There is no strategy under this addon. `aiInvestmentPlan` is
  // name/title/durations plus `profitPercentage`, `defaultProfit` and
  // `defaultResult` — a return the OPERATOR typed, paid from the operator's own
  // funds. `ai/investment/log/index.post.ts` says so where it gates the route on
  // territory: "a percentage the operator typed ... with no strategy
  // underneath". There is no risk column on the plan and no risk or
  // diversification code anywhere in the addon, so the "Risk Management" card
  // and the "Multiple risk profiles" highlight are gone rather than reworded.
  "35988984": {
    tagline: "Fixed-Return Investment Plans, Fully Automated",
    features: [
      {
        icon: "SlidersHorizontal",
        title: "Configurable Investment Plans",
        description:
          "Define plans with fixed durations, return rates and outcomes; the platform handles purchase, settlement and payout.",
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
          "Keep users actively investing with attractive plans and transparent returns.",
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
      "REST API covering plans, durations and logs",
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

  // Forex & Multi-Asset Trading (forex_trading) — the real trading engine,
  // separate from the older forex broker/investment addon above.
  // NOTE: this key must stay in sync with the productId in
  // backend/seeders/20240403000503-extensions.js, which is still the placeholder
  // "62000000" pending the real Envato item ID. Update BOTH together or the
  // extension detail page silently falls back to the bare no-features view.
  "62000000": {
    tagline: "A Real Multi-Asset Trading Engine — Forex, Stocks, Commodities & Indices",
    features: [
      {
        icon: "CandlestickChart",
        title: "Multi-Asset Markets",
        description:
          "Trade forex pairs, stocks, commodities and indices from a single terminal with live streaming prices.",
      },
      {
        icon: "Scale",
        title: "Margin & Leverage",
        description:
          "Per-group leverage with reservation-based margin, so exposure is checked before an order is ever accepted.",
      },
      {
        icon: "ShieldCheck",
        title: "Stop Loss, Take Profit & Trailing",
        description:
          "Attach SL/TP at entry or amend live, with server-side trailing stops that follow the market.",
      },
      {
        icon: "Activity",
        title: "Live Market Data",
        description:
          "Streaming quotes and charts driven by a real market data provider, not simulated ticks.",
      },
      {
        icon: "SlidersHorizontal",
        title: "Operator Risk Desk",
        description:
          "Dealing-desk controls with configurable execution rules, per-instrument limits and manual position close.",
      },
      {
        icon: "Clock",
        title: "Sessions & Overnight Swaps",
        description:
          "Per-instrument trading sessions and holiday calendar, with automatic overnight swap charges.",
      },
    ],
    benefits: [
      {
        title: "Open Up New Asset Classes",
        description:
          "Offer far more than crypto — bring forex, equities, commodities and indices to the same account.",
      },
      {
        title: "Full Dealing-Desk Control",
        description:
          "Run the book on your terms with operator-side execution rules and a live risk view of client exposure.",
      },
      {
        title: "Revenue From Spreads & Swaps",
        description:
          "Earn from configurable spreads, commissions and overnight swap charges on every open position.",
      },
    ],
    highlights: [
      "Forex, stocks, commodities and indices",
      "Live streaming market data and charts",
      "Configurable margin, leverage and instrument limits",
      "Stop loss, take profit and trailing stops",
      "Trading sessions and holiday calendar",
      "Overnight swap accrual",
      "Operator risk desk with execution rules",
    ],
    adminRoutes: [
      { path: "/admin/forex-trading", label: "Dashboard" },
      { path: "/admin/forex-trading/instrument", label: "Instruments" },
      { path: "/admin/forex-trading/position", label: "Positions" },
      { path: "/admin/forex-trading/order", label: "Orders" },
      { path: "/admin/forex-trading/execution", label: "Execution" },
      { path: "/admin/forex-trading/provider", label: "Providers" },
      { path: "/admin/forex-trading/settings", label: "Settings" },
    ],
    userRoutes: [
      { path: "/forex-trading", label: "Home" },
      // Accounts, funding and the statement are in-workspace views of the
      // terminal — there is no separate /forex-trading/account route to list.
      { path: "/forex-trading/trade", label: "Trade Terminal" },
    ],
  },

  // AI Support Agent
  "62000001": {
    tagline: "Clear the Support Queue That Doesn't Need a Person",
    features: [
      {
        icon: "MessagesSquare",
        title: "Answers Tickets and Live Chat",
        description:
          "Replies to customers in seconds, around the clock, from your own documentation, help articles and FAQ — not from general internet knowledge.",
      },
      {
        icon: "BookOpenCheck",
        title: "Cites Every Source It Used",
        description:
          "Each answer links the pages it was drawn from. If the retrieved material doesn't actually support the reply, it hands over instead of guessing.",
      },
      {
        icon: "ShieldAlert",
        title: "Escalates Anything Touching Money",
        description:
          "Withdrawals, KYC decisions, account compromise and fee questions go to a human by rule, before the model is even asked.",
      },
      {
        icon: "PenLine",
        title: "Copilot Mode — It Drafts, You Send",
        description:
          "Start with every reply reviewed by your team. Switch it to answering on its own once you have seen enough.",
      },
      {
        icon: "Inbox",
        title: "Triage, Summaries and Handover",
        description:
          "Sorts new tickets by urgency and topic, and writes a short brief when a conversation reaches a person, so nobody reads twenty messages to catch up.",
      },
      {
        icon: "Search",
        title: "Knowledge Gaps From Real Questions",
        description:
          "Surfaces what customers asked that your documentation could not answer, ranked by how often it came up — a backlog built from demand, not guesswork.",
      },
    ],
    benefits: [
      {
        title: "Most Tickets Never Reach Your Desk",
        description:
          "Password resets, 'where is my deposit', how-do-I questions — the repetitive volume is answered instantly, and your team keeps the conversations that need judgement.",
      },
      {
        title: "Instant Replies, Day and Night",
        description:
          "Customers in every timezone get an answer immediately instead of waiting for your working hours, which is where most support complaints actually start.",
      },
      {
        title: "It Gets Cheaper As It Learns",
        description:
          "Answered questions become documentation, documentation gets cached, and a question your install has seen before costs a fraction of the first one.",
      },
      {
        title: "Your Customers' Data Stays On Your Server",
        description:
          "Search and account lookups run on your install. Passwords, 2FA secrets, wallet addresses and transaction hashes are stripped before anything leaves the box.",
      },
    ],
    highlights: [
      "Answers tickets and live chat from your own documentation",
      "Cites its sources, or escalates instead of guessing",
      "Money, KYC and account-access questions always go to a human",
      "Copilot mode: drafts for review before it answers on its own",
      "Automatic ticket triage and handover summaries",
      "Proactive outreach on a failed deposit or withdrawal",
      "Knowledge-gap report built from real customer questions",
      "Bring your own AI key, or buy capacity from MashDiv",
    ],
    adminRoutes: [
      { path: "/admin/ai/support", label: "Overview" },
      { path: "/admin/ai/support/inbox", label: "Live Inbox" },
      // Labels track the addon's own nav (menu.ts), where these two sit under a
      // "Knowledge" group — so the child is "Sources" and the group name is not
      // repeated on the row inside it.
      { path: "/admin/ai/support/knowledge", label: "Sources" },
      { path: "/admin/ai/support/gaps", label: "Gaps" },
      { path: "/admin/ai/support/agents", label: "Agents" },
      { path: "/admin/ai/support/provider", label: "Provider" },
      { path: "/admin/ai/support/settings", label: "Settings" },
    ],
    userRoutes: [
      // There is no dedicated customer route: the assistant works inside the
      // support surfaces the platform already has, which is the point — a
      // customer never has to know they are talking to it.
      { path: "/support", label: "Support Center" },
    ],
  },

  // Web3 Wallet & On-Chain Trading (internal extension key `dex`).
  // NOTE: this key must stay in sync with the productId in
  // backend/seeders/20240403000503-extensions.js, which is still the placeholder
  // "62100000" pending the real Envato item ID. Update BOTH together or the
  // extension detail page silently falls back to the bare no-features view.
  //
  // Scope note: this describes v1 (plans/DEX-SYSTEM.md Phases -1..6) only.
  // Bridging, embedded wallets and operator liquidity pools are Phases 7-8 and
  // must NOT be advertised here until they ship — the product NAME is broad
  // enough to survive them, the feature list deliberately is not.
  "62100000": {
    tagline: "Their Wallet, Their Keys — Your Platform, Your Fee",
    features: [
      {
        icon: "Wallet",
        title: "Users Bring Their Own Wallet",
        description:
          "MetaMask, Rainbow, Coinbase Wallet, Trust and any WalletConnect app, linked to the account by a signed message. You never create a wallet, never store a key and never sign on a user's behalf.",
      },
      {
        icon: "ShieldCheck",
        title: "Balances, Approvals and Gas, Handled",
        description:
          "Live native and ERC-20 balances, the full token-approval flow including the tokens that refuse a non-zero re-approve, and a gas preflight that catches an empty gas tank before the user signs anything.",
      },
      {
        icon: "Route",
        title: "Aggregated On-Chain Routing",
        description:
          "Every quote is raced across multiple DeFi aggregators and the best route wins. If one is down or has no liquidity for the pair, the next one answers.",
      },
      {
        icon: "ArrowLeftRight",
        title: "A Real Trading Terminal",
        description:
          "Token picker, live pricing, charts, price impact, slippage and deadline controls, and a transaction tracker that survives a page reload mid-swap.",
      },
      {
        icon: "Network",
        title: "Curated Tokens, Six EVM Chains",
        description:
          "Ethereum, BNB Chain, Polygon, Arbitrum, Optimism and Base, each independently switchable — trading only the tokens you approved, with per-token risk flags.",
      },
      {
        icon: "Coins",
        title: "You Earn On Every Trade",
        description:
          "A configurable integrator fee that the router pays straight to your address on-chain. Accrual is tracked per chain and per token, with the sweep recorded against it.",
      },
    ],
    benefits: [
      {
        title: "No Custody, No Hot Wallets, No Key Storage",
        description:
          "The platform holds no funds and deploys no contracts. The single largest operational risk in a crypto product — losing customer coins — is simply not in scope here.",
      },
      {
        title: "Thousands of Tokens Without Listing Any",
        description:
          "Users reach the long tail of on-chain liquidity through aggregators, with no order book to run, no market maker to pay and no deposits or withdrawals to process.",
      },
      {
        title: "Revenue That Settles On-Chain",
        description:
          "The integrator fee is paid to your address by the router itself. It is visible on the explorer and reconciled against a confirmed sweep before it books as profit.",
      },
      {
        title: "Compliance Still Applies",
        description:
          "Geo restrictions, KYC level entitlements and the token allowlist are all enforced before a quote is served — the one moment the server can still say no.",
      },
    ],
    highlights: [
      "Self-custody wallet layer — users hold their own keys",
      "WalletConnect plus every major browser wallet",
      "Signed-message wallet linking, and signed disconnect",
      "Token approvals, allowance tracking and gas preflight",
      "Multi-aggregator routing with automatic failover",
      "Configurable slippage, deadline and price-impact guards",
      "On-chain receipt verification before a trade is booked",
      "Curated token allowlist with risk flags",
      "Six EVM chains, each independently switchable",
      "Integrator fee accrual and sweep ledger",
      "Geo and KYC gates enforced at the quote",
      "No smart contracts deployed by the platform",
    ],
    adminRoutes: [
      { path: "/admin/dex", label: "Overview" },
      { path: "/admin/dex/provider", label: "Providers" },
      { path: "/admin/dex/chain", label: "Chains" },
      { path: "/admin/dex/token", label: "Tokens" },
      { path: "/admin/dex/pair", label: "Pairs" },
      { path: "/admin/dex/swap", label: "Swaps" },
      { path: "/admin/dex/quote", label: "Quotes" },
      { path: "/admin/dex/fee", label: "Fees" },
      { path: "/admin/dex/settings", label: "Settings" },
    ],
    userRoutes: [
      { path: "/dex/swap", label: "Swap Terminal" },
      { path: "/dex/history", label: "Swap History" },
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
    tagline: "Fixed-rate pools today, on-chain staking behind one switch",
    features: [
      {
        icon: "Layers",
        title: "Fixed-rate pools",
        description:
          "Pools with a rate the operator sets and pays from its own treasury, with lock terms and per-term tiers.",
      },
      {
        icon: "ToggleLeft",
        title: "Product switch",
        description:
          "One setting decides which product is for sale; every pool and position records the product it was opened under.",
      },
      {
        icon: "Lock",
        title: "Lock terms",
        description:
          "Fixed terms with an optional early-exit fee and an admin review queue for early exits.",
      },
      {
        icon: "Gift",
        title: "Reward ledger",
        description:
          "Every reward is written to a ledger the staker claims from, and every payout is booked against the treasury.",
      },
      {
        icon: "ShieldCheck",
        title: "Territory gate",
        description:
          "Ships blocked where a platform-set rate is a regulated product; unblocking needs a recorded Super Admin acceptance.",
      },
      {
        icon: "BarChart3",
        title: "Solvency console",
        description:
          "Maturity ladder, withdrawal queue and promised-versus-paid rates, so the operator sees what the treasury owes.",
      },
    ],
    benefits: [
      {
        title: "Honest by default",
        description:
          "The product says who sets the rate and who pays it, and refuses a stake the treasury cannot cover.",
      },
      {
        title: "Ready for on-chain",
        description:
          "The on-chain product ships behind the same switch and needs the Ecosystem addon; nothing already open is touched.",
      },
      {
        title: "User retention",
        description:
          "Fixed terms create long-term commitment from your user base.",
      },
    ],
    highlights: [
      "Fixed-rate or on-chain, one switch",
      "Lock terms and tiers",
      "Position management",
      "Earnings ledger",
      "Territory gate and risk statement",
      "Solvency console",
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
  //
  // THERE IS NO AI IN THIS ADDON, AND NO SCHEDULER. This block used to sell
  // both, on the view an UNLICENSED product shows a prospective buyer:
  //   - No AI: zero AI/model/gateway calls anywhere under
  //     `api/(ext)/admin/mailwizard`. The Unlayer editor is mounted with NO
  //     `projectId` (`admin/mailwizard/template/[id]/page.tsx`), which is what
  //     gates Unlayer's own AI, and it declares `imageEditor` and `stockImages`
  //     — stock-photo SEARCH, the opposite of image generation.
  //   - No scheduling: `mailwizardCampaign` is id/name/subject/status/speed/
  //     targets/templateId with no `sendAt` column, and `utils/cron.ts` selects
  //     `status: "ACTIVE"` and sends on the next hourly tick. `speed` is a
  //     per-RUN budget, not a delivery time.
  //   - No analytics: `TARGET_STATUSES` is PENDING/SENT/FAILED, with no open
  //     pixel and no link rewriting.
  "45613491": {
    tagline: "Campaign Email Marketing with a Visual Builder",
    features: [
      {
        icon: "Mail",
        title: "Email Campaigns",
        description:
          "Create and manage email marketing campaigns with ease.",
      },
      {
        icon: "Layout",
        title: "Drag-and-Drop Editor",
        description:
          "Visual email builder with drag-and-drop components.",
      },
      {
        icon: "Clock",
        title: "Send Throttling",
        description:
          "Control how many emails go out per hourly send run.",
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
        title: "Professional Emails",
        description:
          "Create beautiful emails without design skills.",
      },
    ],
    highlights: [
      "Visual editor",
      "Reusable saved blocks",
      "Template library",
      "Per-run send throttle",
      "Send-status reporting",
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
      "Professional Trading Charts with 225 Indicators & Advanced Technical Analysis",
    features: [
      {
        icon: "LineChart",
        title: "225 Technical Indicators",
        description:
          "Comprehensive indicator library across 8 categories: Moving Averages, Oscillators, Volume, Volatility, Trend, Advanced, Statistics and Patterns.",
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
        title: "Cached Indicator Results",
        description:
          "Indicator output is cached per parameter set and keyed on the last confirmed candle, so a tick that only moves the live close recalculates nothing.",
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
      "225 technical indicators across 8 categories",
      "132 professional drawing tools across 9 categories",
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

  // Trading Bot
  "61500000": {
    tagline: "Automated Trading Strategies, Bot Builder & Strategy Marketplace",
    features: [
      {
        icon: "Bot",
        title: "Multi-Strategy Bot Types",
        description:
          "Support for DCA (Dollar Cost Averaging), Grid Trading, Technical Indicator-based, Trailing Stop, and Custom strategies with configurable parameters.",
      },
      {
        icon: "Layers",
        title: "Visual Strategy Builder",
        description:
          "Intuitive interface for creating custom trading strategies without coding. Configure entry/exit conditions, indicators, and risk parameters.",
      },
      {
        icon: "Store",
        title: "Strategy Marketplace",
        description:
          "Creators can publish and sell their strategies. Revenue sharing system with configurable creator payouts and platform fees.",
      },
      {
        icon: "FlaskConical",
        title: "Paper Trading Simulation",
        description:
          "Test strategies risk-free with paper trading simulation before deploying with real funds. Full performance tracking for both modes.",
      },
      {
        icon: "Shield",
        title: "Risk Management Controls",
        description:
          "Set maximum concurrent trades, position sizes, stop-loss percentages, take-profit targets, daily loss limits, and drawdown protection.",
      },
      {
        icon: "LineChart",
        title: "Real-Time Performance Analytics",
        description:
          "Live P&L tracking, win rate, average trade duration, ROI, and detailed trade history per bot with comprehensive audit logging.",
      },
    ],
    benefits: [
      {
        title: "Passive Trading Income",
        description:
          "Users can set up automated trading strategies that work 24/7 without manual intervention.",
      },
      {
        title: "Strategy Monetization",
        description:
          "Strategy creators can earn revenue by selling their profitable strategies in the marketplace.",
      },
      {
        title: "Risk-Free Testing",
        description:
          "Paper trading mode allows users to test strategies without risking real funds.",
      },
    ],
    highlights: [
      "4 Bot Strategy Types (DCA, Grid, Indicator, Trailing Stop)",
      "Visual Strategy Builder with no coding required",
      "Strategy Marketplace with revenue sharing",
      "Live & Paper Trading modes",
      "Stop-Loss & Take-Profit Automation",
      "Daily Loss & Drawdown Protection",
      "Concurrent Trade Limits",
      "Strategy Reviews & Ratings",
      "Wallet Fund Allocation",
      "Comprehensive Audit Logging",
      "Admin Dashboard & Emergency Controls",
      "Multi-Language Support (80+)",
    ],
    adminRoutes: [
      { path: "/admin/trading-bot", label: "Dashboard" },
      { path: "/admin/trading-bot/bot", label: "Bot Management" },
      { path: "/admin/trading-bot/marketplace", label: "Marketplace" },
      { path: "/admin/trading-bot/reviews", label: "Review Moderation" },
      { path: "/admin/trading-bot/logs", label: "Audit Logs" },
      { path: "/admin/trading-bot/settings", label: "Settings" },
    ],
    userRoutes: [
      { path: "/trading-bot", label: "Home" },
      { path: "/trading-bot/dashboard", label: "Dashboard" },
      { path: "/trading-bot/bot", label: "My Bots" },
      { path: "/trading-bot/bot/create", label: "Create Bot" },
      { path: "/trading-bot/marketplace", label: "Strategy Marketplace" },
      { path: "/trading-bot/creator", label: "Creator Dashboard" },
    ],
  },

  // Hummingbot Connector
  "35988084": {
    tagline:
      "Connect Hummingbot v2 to Your CLOB for PMM & XEMM Market Making",
    features: [
      {
        icon: "PlugZap",
        title: "Hummingbot v2 Connector",
        description:
          "Plug any Hummingbot v2 instance into your ecosystem spot and futures order books over signed REST + WebSocket.",
      },
      {
        icon: "KeyRound",
        title: "HMAC API Keys",
        description:
          "Scoped, HMAC-SHA256 signed API keys with IP whitelisting, expiry, and one-time secrets — issued and revoked by users.",
      },
      {
        icon: "ArrowLeftRight",
        title: "Spot & Perpetual Connectors",
        description:
          "Trade ecosystem spot and futures markets in Binance-compatible shapes: orders, balances, positions, leverage, and funding.",
      },
      {
        icon: "Bot",
        title: "PMM & XEMM Strategies",
        description:
          "Six presets ship published — four pure-market-making, two cross-exchange. The maker leg always quotes your own book; the XEMM presets hedge each fill on Binance or MEXC, through the bot runner's own account there.",
      },
      {
        icon: "Gauge",
        title: "Rate Limits & Kill-Switch",
        description:
          "Per-key rate-limit overrides and an admin kill-switch to instantly stop a misbehaving or compromised bot.",
      },
      {
        icon: "Activity",
        title: "Multiplexed WebSocket Streams",
        description:
          "One socket carries order book, trade, ticker, mark-price and funding-rate channels plus signed private order, balance, position and fill streams. The server pushes on per-channel timers — 200ms books, 500ms trades and mark price, 1s user orders — each overridable per install.",
      },
    ],
    benefits: [
      {
        title: "Bridge Liquidity",
        description:
          "Your books become a venue Hummingbot can quote on, so a cross-exchange maker rests orders here and hedges each fill on its own account at an outside venue.",
      },
      {
        title: "Algorithmic Trading Access",
        description:
          "Give power users professional algo-trading through the industry-standard Hummingbot framework.",
      },
      {
        title: "Full Operator Control",
        description:
          "Platform-wide key inventory, audit trails, rate limits, and a kill-switch from the admin panel.",
      },
    ],
    highlights: [
      "HMAC-SHA256 signed requests with replay protection",
      "Spot (ecosystem) + Perpetual (futures) connectors",
      "Six PMM & XEMM presets seeded and published on install",
      "Per-key scopes, IP whitelist & expiry",
      "Admin kill-switch & per-key rate-limit overrides",
      "Per-key audit trail (auth failures, replays, IP blocks)",
      "Real-time WebSocket market & user streams",
      "Binance-compatible API shape",
    ],
    adminRoutes: [
      { path: "/admin/hb", label: "API Keys" },
    ],
    userRoutes: [
      { path: "/hb", label: "Home" },
      { path: "/hb/keys", label: "API Keys" },
      { path: "/hb/strategies", label: "Strategy Presets" },
    ],
  },

  // TON Blockchain
  //
  // THIS IS A NATIVE-TON CHAIN MODULE, NOT A TELEGRAM PRODUCT. It used to sell
  // a "Telegram Integration — native integration with Telegram's massive user
  // base" card and an "access Telegram's 800+ million users" benefit. There is
  // no Telegram code on the platform: no bot, no Mini App, no Telegram auth and
  // no Telegram notification channel — the registered channels are
  // IN_APP/EMAIL/SMS/PUSH (`backend/src/services/notification`), and every
  // `telegram` hit in `backend/src` is a social-link STRING on a profile, an ICO
  // token or an NFT collection. The tagline and the "Telegram ecosystem"
  // highlight are kept: those describe TON's provenance, which is true.
  //
  // Jetton claims are gone for the same reason. `backend/src/blockchains/ton.ts`
  // is native TON only; every `jetton` hit in the repo is under `(ext)/dex`,
  // which is a different product.
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
        title: "Platform-Held Wallets",
        description:
          "Each user gets their own deposit address, and withdrawals go out from a master wallet. The platform holds the keys to both.",
      },
      {
        icon: "ArrowDownToLine",
        title: "Deposit Processing",
        description:
          "Automatic detection and processing of native TON deposits.",
      },
      {
        icon: "ArrowUpFromLine",
        title: "Withdrawal Management",
        description:
          "Efficient withdrawal processing with low fees.",
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
        title: "One Less Custodian",
        description:
          "TON balances sit in wallets this install generates and controls.",
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
  // ========== BUNDLED PROVIDERS (no store listing, no Envato item ID) ==========
  /*
   * KEYED BY NAME, NOT BY PRODUCT ID, AND THAT IS FORCED RATHER THAN CHOSEN.
   *
   * Every key above is an Envato item ID, which works because those products
   * are sold and their IDs are written into the seeders. These four are not:
   * `binanceus`, `kraken`, `okx` and the `MO` chain are rows the platform ships
   * without selling, they appear in NO seeder in this repo, and the
   * `productId`s they carry are per-install hex placeholders — this install
   * reads 2816DB47 / AB56F8DE / 34BDAB64 / 2ED90A72, and none of those four
   * strings exists anywhere in the source tree.
   *
   * So an ID key would have described one database. `exchange.name` and
   * `ecosystemBlockchain.chain` are the stable identity for these — they are
   * already what `EXCHANGE_STORE_SLUGS` and `BLOCKCHAIN_STORE_SLUGS` key their
   * art on, and what the ccxt code paths in
   * `backend/src/api/finance/withdraw/spot/index.post.ts` switch on.
   *
   * `getProductShowcase` tries the ID first, so a real item ID landing on any
   * of these later takes precedence with no edit here.
   */
  "exchange:binanceus": {
    tagline: "US-Regulated Binance Liquidity for Spot Trading",
    features: [
      {
        icon: "Globe",
        title: "Binance US API Integration",
        description:
          "Full integration with the Binance US exchange API for real-time trading and market data.",
      },
      {
        icon: "BarChart3",
        title: "Real-Time Market Data",
        description:
          "Live price feeds, order books, and market depth from Binance US.",
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
        description: "Real-time balance tracking and portfolio management.",
      },
      {
        icon: "LineChart",
        title: "Trading Charts",
        description: "Advanced TradingView charts with technical indicators.",
      },
      {
        icon: "Shield",
        title: "Secure API Keys",
        description: "Encrypted storage for exchange API credentials.",
      },
    ],
    benefits: [
      {
        title: "US Market Coverage",
        description:
          "Serve customers on the Binance entity that operates under US registration.",
      },
      {
        title: "Familiar Liquidity",
        description:
          "The Binance order book and matching behaviour your traders already know.",
      },
      {
        title: "Reliable Infrastructure",
        description: "Built on Binance's proven trading infrastructure.",
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

  "exchange:kraken": {
    tagline: "Deep, Regulated Liquidity from Kraken",
    features: [
      {
        icon: "Globe",
        title: "Kraken API Integration",
        description:
          "Full integration with the Kraken exchange API for real-time trading and market data.",
      },
      {
        icon: "BarChart3",
        title: "Real-Time Market Data",
        description:
          "Live price feeds, order books, and market depth from Kraken.",
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
        description: "Real-time balance tracking and portfolio management.",
      },
      {
        icon: "LineChart",
        title: "Trading Charts",
        description: "Advanced TradingView charts with technical indicators.",
      },
      {
        icon: "Shield",
        title: "Secure API Keys",
        description: "Encrypted storage for exchange API credentials.",
      },
    ],
    benefits: [
      {
        title: "Fiat Pair Depth",
        description:
          "Kraken's long-established USD and EUR books for major assets.",
      },
      {
        title: "Operational Track Record",
        description:
          "One of the longest continuously operating exchanges in the market.",
      },
      {
        title: "Reliable Infrastructure",
        description: "Built on Kraken's mature trading infrastructure.",
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

  "exchange:okx": {
    tagline: "Global OKX Liquidity and Deep Order Books",
    features: [
      {
        icon: "Globe",
        title: "OKX API Integration",
        description:
          "Full integration with the OKX exchange API for real-time trading and market data.",
      },
      {
        icon: "BarChart3",
        title: "Real-Time Market Data",
        description: "Live price feeds, order books, and market depth from OKX.",
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
        description: "Real-time balance tracking and portfolio management.",
      },
      {
        icon: "LineChart",
        title: "Trading Charts",
        description: "Advanced TradingView charts with technical indicators.",
      },
      {
        icon: "Shield",
        title: "Secure API Keys",
        description: "Encrypted storage for exchange API credentials.",
      },
    ],
    benefits: [
      {
        title: "Broad Pair Coverage",
        description:
          "Hundreds of spot pairs, including assets thinly traded elsewhere.",
      },
      {
        title: "Tight Spreads",
        description:
          "High-volume books that keep execution close to the quoted price.",
      },
      {
        title: "Reliable Infrastructure",
        description: "Built on OKX's high-throughput trading infrastructure.",
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

  "blockchain:MO": {
    tagline: "The Native Ecosystem Chain, Built In",
    features: [
      {
        icon: "Boxes",
        title: "Native Chain Support",
        description:
          "MO is wired into the ecosystem addon directly — no external node or third-party RPC to provision.",
      },
      {
        icon: "ArrowDownToLine",
        title: "Deposits & Withdrawals",
        description:
          "Monitored deposits and queued withdrawals through the ecosystem's own wallet pipeline.",
      },
      {
        icon: "Wallet",
        title: "Custodial Wallets",
        description:
          "Per-user custodial addresses generated and managed from the master wallet.",
      },
      {
        icon: "Activity",
        title: "Transaction Monitoring",
        description:
          "Confirmations tracked and credited automatically as blocks land.",
      },
      {
        icon: "Coins",
        title: "Token Listings",
        description:
          "List MO-based assets as ecosystem markets alongside every other chain.",
      },
      {
        icon: "Shield",
        title: "Key Custody",
        description:
          "Master and custodial keys held under the ecosystem's existing encryption.",
      },
    ],
    benefits: [
      {
        title: "No Extra Infrastructure",
        description:
          "Ships with the ecosystem addon, so there is no node to run or RPC contract to buy.",
      },
      {
        title: "One Wallet Model",
        description:
          "Uses the same master and custodial wallet screens as every other chain.",
      },
      {
        title: "Fast Settlement",
        description: "Short block times keep deposits and withdrawals moving.",
      },
    ],
    highlights: [
      "Deposits and withdrawals",
      "Master and custodial wallets",
      "Automatic confirmation tracking",
      "Ecosystem market listings",
      "Shared key custody",
    ],
    adminRoutes: [
      { path: "/admin/ecosystem", label: "Ecosystem Dashboard" },
      { path: "/admin/ecosystem/wallet/master", label: "Master Wallets" },
      { path: "/admin/ecosystem/wallet/custodial", label: "Custodial Wallets" },
      { path: "/admin/ecosystem/token", label: "Tokens" },
    ],
  },
};

/**
 * The stable identity for a product that has no Envato item ID.
 *
 * Mirrors `storeArtForProduct` in `lib/store-products.ts` deliberately: art and
 * copy for the bundled providers must resolve off the SAME field, or a product
 * gets an illustration and no features, or the reverse.
 */
function showcaseFallbackKey(product: {
  category?: string | null;
  name?: string | null;
  chain?: string | null;
}): string | null {
  if (product.category === "blockchain") {
    return product.chain ? `blockchain:${product.chain}` : null;
  }
  if (product.category === "exchange") {
    return product.name ? `exchange:${product.name.toLowerCase()}` : null;
  }
  return null;
}

/**
 * Showcase copy for a product.
 *
 * Accepts the product row rather than only its id, because the bundled
 * providers have no stable id — see the note above `"exchange:binanceus"`. The
 * id is still tried first, so nothing that already resolved changes, and a real
 * item ID assigned later wins automatically.
 */
export function getProductShowcase(
  product:
    | string
    | {
        productId?: string | null;
        category?: string | null;
        name?: string | null;
        chain?: string | null;
      }
): ProductShowcase | null {
  if (typeof product === "string") {
    return productShowcaseData[product] || null;
  }
  if (product.productId && productShowcaseData[product.productId]) {
    return productShowcaseData[product.productId];
  }
  const key = showcaseFallbackKey(product);
  return (key && productShowcaseData[key]) || null;
}

// Check if a product has showcase data
export function hasShowcaseData(productId: string): boolean {
  return productId in productShowcaseData;
}
