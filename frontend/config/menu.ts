// lib/menu.ts

import type { MenuOverrides } from "@/lib/chrome/menu-overrides";
import { applyMenuOverrideForScope, menuScopeFor } from "@/lib/chrome/menu-scope";

/**
 * The scope rule, re-exported from the menu module the editor already imports.
 *
 * Both sides of this feature compute the key: the editor when it SAVES, the
 * renderer when it READS. If they ever disagree the PUT succeeds, the editor
 * says "Saved", and the site does not change — a silent no-op with nothing in
 * any log, which is the exact bug class the override engine exists to remove.
 * One implementation, reachable from both, is what makes that impossible.
 * The rule itself and the `MenuScopeSource` shape live in
 * `lib/chrome/menu-scope.ts`.
 */
export { menuScopeFor, DEFAULT_MENU_NAMESPACE, type MenuScopeSource } from "@/lib/chrome/menu-scope";

/**
 * Admin navigation.
 *
 * ORDERING RULE — keep new entries consistent with it rather than appending:
 *
 *   Top level runs overview -> people -> money -> products -> site -> plumbing:
 *     Dashboard, Users, Finance, Extensions, Content, System.
 *   Content used to sit above Extensions; the products an operator manages
 *   daily now come before the blog.
 *
 *   Inside Finance the order is the path money takes, which is the order an
 *   operator investigates it in:
 *     Revenue -> Currencies -> Deposits -> Withdrawals -> Wallets &
 *     Transactions -> Trading setup -> Binary -> Orders -> Investments.
 *   In/out used to be at opposite ends of the group with the ledger between
 *   them.
 *
 *   Inside System, configuration and policy come first and maintenance last:
 *     Settings -> Communication -> Compliance -> Monitoring -> Extension
 *     Manager -> Updates. Installing an extension is the rarest and most
 *     disruptive action in the group and no longer sits second.
 *
 *   Within any group: overview first, then configuration, then records, then
 *   the destructive or one-off actions.
 *
 * TWO INVARIANTS, both of which have been broken before:
 *
 *   1. `key` IS the translation path — dashes become dots, so `admin-analytics`
 *      resolves to `menu.admin.analytics.title`. Renaming a key silently drops
 *      that item back to its English `title` in all 90 locales. Reorder and
 *      re-parent freely; do not rename.
 *
 *   2. A group's `permission` array must be the UNION of every permission
 *      reachable inside it. It is evaluated with `some` (see `getMenu`), so a
 *      missing entry does not merely hide one link — it hides the whole group
 *      from any role scoped to that permission alone.
 */
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
    // A group's permission list is the union of everything reachable inside it,
    // so it must name every child's permission or that child becomes
    // unreachable for a role scoped to it alone. `access.api.key` was missing:
    // an API-only admin saw no Users menu and therefore no API Management page.
    permission: [
      "access.user",
      "access.role",
      "access.permission",
      "access.kyc.application",
      "access.kyc.level",
      "access.support.ticket",
      "access.api.key",
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
      "access.exchange",
      // Binary Options lives in this group; without these two, a
      // binary-only role lost the whole Finance menu.
      "access.binary.market",
      "access.binary.settings",
      "access.investment.plan",
      "access.investment.duration",
      "access.investment",
      "access.binary.order",
      "access.exchange.order",
      "access.ecosystem.order",
      "access.futures.order",
      "access.transaction",
      "access.transfer",
      "access.deposit",
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
        // Crypto first: this is a crypto-first platform, and the fiat list is
        // the one an operator configures once and rarely revisits.
        child: [
          {
            key: "admin-crypto-currencies",
            title: "Cryptocurrencies",
            href: "/admin/finance/currency/spot",
            permission: "access.spot.currency",
            icon: "ph:currency-btc-duotone",
            description:
              "Digital asset management with blockchain integration, wallet connectivity, and real-time market data feeds.",
          },
          {
            key: "admin-fiat-currencies",
            title: "Fiat Currencies",
            href: "/admin/finance/currency/fiat",
            permission: "access.fiat.currency",
            icon: "ph:currency-dollar-duotone",
            description:
              "Traditional currency management with exchange rate monitoring, regional settings, and payment gateway integration.",
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
      {
        key: "admin-transaction-management",
        title: "Transaction Management",
        icon: "solar:transfer-horizontal-bold-duotone",
        description:
          "Complete transaction oversight with detailed logging, reconciliation, and transfer management capabilities.",
        permission: [
          "access.transaction",
          "access.transfer",
          "access.wallet",
          "view.pool.backing",
          "view.spot.deposit.intent",
        ],
        child: [
          {
            key: "admin-wallet-management",
            title: "Wallet Management",
            href: "/admin/finance/wallet",
            permission: "access.wallet",
            icon: "ph:wallet-duotone",
            description:
              "Multi-currency wallet administration with balance monitoring, security controls, and backup management.",
          },
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
            key: "admin-pool-backing",
            title: "Pool Backing",
            href: "/admin/finance/pool-backing",
            icon: "ph:chart-bar-duotone",
            permission: "view.pool.backing",
            description:
              "What the exchange pool owes against what it holds, the transfers and admin credits that explain the gap, and the doors to settle or acknowledge them.",
          },
          {
            key: "admin-spot-deposit-intents",
            title: "Spot Deposit Intents",
            href: "/admin/finance/spot-deposit-intent",
            icon: "ph:seal-check-duotone",
            permission: "view.spot.deposit.intent",
            description:
              "Every declared spot deposit and where its money is: the ones under review, the sweeps that failed, and the doors to credit, reject or resweep them.",
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
          {
            key: "admin-trading-settings",
            title: "Trading Settings",
            href: "/admin/trading/settings",
            icon: "ph:chart-line-up-duotone",
            description:
              "Configure advanced trading interface with layouts, hotkeys, and analytics settings.",
          },
        ],
      },
      {
        key: "admin-binary-trading",
        title: "Binary Options",
        icon: "humbleicons:exchange-vertical",
        description:
          "Binary options trading system with market setup and settings configuration.",
        permission: ["access.binary.market", "access.binary.settings"],
        child: [
          {
            key: "admin-binary-markets",
            title: "Binary Markets",
            href: "/admin/finance/binary/market",
            permission: "access.binary.market",
            icon: "ri:exchange-2-line",
            description:
              "Configure binary options markets with asset pairs and trading parameters.",
          },
          {
            key: "admin-binary-settings",
            title: "Binary Settings",
            href: "/admin/finance/binary/settings",
            permission: "access.binary.settings",
            icon: "ph:gear-duotone",
            description:
              "Configure trading durations, payouts, order types, and risk management.",
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
        // Ordered by market, so it reads the same way the Extensions menu does:
        // the built-in spot book first, then the optional venues.
        child: [
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
          {
            key: "admin-binary-orders",
            title: "Binary Orders",
            href: "/admin/finance/order/binary",
            icon: "tabler:binary-tree",
            permission: "access.binary.order",
            description:
              "Monitor and manage binary options orders with execution tracking and settlement processing.",
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
          {
            /*
             * The territory gate. It has a menu entry rather than living only
             * behind a link on the plans screen because the state it shows —
             * which countries may open a fixed-return position, and who
             * accepted responsibility for offering it there — is the answer to
             * a question an operator gets asked from outside, under time
             * pressure. A compliance screen nobody can find is a compliance
             * screen nobody reads.
             */
            key: "admin-investment-compliance",
            title: "Investment Compliance",
            href: "/admin/finance/investment/compliance",
            permission: "access.investment",
            icon: "ph:shield-check-duotone",
            description:
              "Territory gate for fixed-return investment plans, and the recorded acceptance of responsibility for offering them.",
          },
        ],
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
    /**
     * GROUPING RULE — what decides which group an extension belongs to:
     *
     *   Trading Platforms   a venue. The user places an order and takes the
     *                       other side of a market.
     *   Trading Automation  something trades FOR someone, or makes the market:
     *                       copy engines, strategy bots, AI execution engines.
     *   Investment Products capital in, yield out. The user funds a product and
     *                       collects a return; they never place an order.
     *   Marketplace         goods and collectibles change hands.
     *   Business Tools      run the business around the platform.
     *
     * "Trading Platforms" used to hold ten of the nineteen extensions — every
     * bot, every AI engine and the managed-forex product alongside the actual
     * order books — which made the left rail a list of one long category and
     * four short ones, and made the group meaningless as a filter. Splitting the
     * automation out and filing managed forex under Investment Products leaves
     * 4 / 5 / 4 / 2 / 4, and each group now answers a different question.
     *
     * Group KEYS are translation paths (see the invariants at the top of this
     * file), so the four original groups keep theirs and keep their titles;
     * only `admin-automation-extensions` is new.
     */
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
            href: "/admin/futures",
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
            key: "admin-forex-trading-platform",
            title: "Forex & Multi-Asset Trading",
            icon: "ph:chart-line-up-duotone",
            extension: "forex_trading",
            permission: "access.forex_trading",
            href: "/admin/forex-trading",
            description:
              "Real multi-asset dealing desk: forex, stocks and commodities with live market data, margin trading and an operator risk desk.",
            features: [
              "Real Market Data (Multi-Provider)",
              "Margin Trading with Hedged Netting",
              "Server-Side SL/TP & Trailing Stops",
              "Stop-Out Engine & Negative Balance Protection",
              "Swap/Rollover & Session Calendars",
              "Operator Risk Desk & Deals Ledger",
            ],
          },
          {
            key: "admin-dex-swap",
            title: "Web3 Trading",
            icon: "ph:arrows-left-right-duotone",
            extension: "dex",
            permission: "access.dex",
            href: "/admin/dex",
            description:
              "A self-custody wallet layer and an on-chain trading desk. Aggregators, chains, token allowlist, swap ledger and fee accrual.",
            features: [
              "Self-Custody Wallet Layer",
              "Non-Custodial — No Platform Wallets",
              "Multi-Aggregator Routing",
              "Curated Token Allowlist",
              "On-Chain Receipt Verification",
              "Integrator Fee Accrual & Sweep",
              "Six EVM Chains",
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
        ],
      },
      {
        // NEW GROUP. Everything here trades without a person clicking Buy —
        // either for one account (copy, bots) or for the whole book (market
        // makers, the binary engine). They were filed under "Trading Platforms"
        // next to the order books they run ON TOP OF, which is the one place an
        // operator looking for a venue does not want to wade through five bots.
        key: "admin-automation-extensions",
        title: "Trading Automation",
        icon: "ph:robot-duotone",
        image: "/img/megamenu/extensions/automation.svg",
        description:
          "Automated trading systems: copy trading, strategy bots, and AI-powered market engines.",
        // Per-account automation first, then the engines that run behind a whole
        // market rather than for a single user.
        child: [
          {
            key: "admin-copy-trading-platform",
            title: "Copy Trading",
            icon: "ph:copy-duotone",
            extension: "copy_trading",
            permission: "access.copy_trading",
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
            key: "admin-trading-bot-platform",
            title: "Algo Trading Bots",
            icon: "ph:robot-duotone",
            extension: "trading_bot",
            permission: "access.trading_bot",
            href: "/admin/trading-bot",
            description:
              "Automated trading bot system with multiple strategies, strategy marketplace, and comprehensive risk management.",
            features: [
              "Multi-Strategy Bot Types (DCA, Grid, Indicator, Trailing)",
              "Visual Strategy Builder",
              "Strategy Marketplace with Revenue Sharing",
              "Live & Paper Trading Modes",
              "Risk Management Controls",
              "Real-Time Performance Analytics",
            ],
          },
          {
            key: "admin-hummingbot-platform",
            title: "Hummingbot",
            icon: "ph:plugs-connected-duotone",
            extension: "hummingbot",
            permission: "access.hb",
            href: "/admin/hb",
            // Kept to ~2 rendered lines. The old copy enumerated the same four
            // items the `features` list repeats verbatim right below it, ran to
            // three lines in the mega-menu detail pane, and pushed the title out
            // of the top of the panel.
            description:
              "Platform-wide administration for the self-hosted Hummingbot v2 connector and its API keys.",
            features: [
              "Platform-Wide API Key Inventory",
              "Per-Key Rate-Limit Overrides",
              "Admin Kill-Switch",
              "Per-Key Audit Trail",
              "Spot & Perpetual Connectors",
              "HMAC-Signed Request Auth",
            ],
          },
          {
            key: "admin-ai-market-maker-platform",
            title: "AI Market Maker",
            icon: "ph:robot-duotone",
            extension: "ai_market_maker",
            permission: "access.ai.market_maker",
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
          {
            key: "admin-binary-ai-engine",
            title: "Binary AI Engine",
            icon: "ph:brain-duotone",
            extension: "binary_ai_engine",
            permission: "access.ai.binary_engine",
            href: "/admin/ai/binary-engine",
            description:
              "AI-powered binary options trading engine with adaptive win rates, ML optimization, and multi-tier user management.",
            features: [
              "ML-Based Win Rate Optimization",
              "Multi-Tier User Management",
              "A/B Testing Framework",
              "User Cohort Analysis",
              "External Price Correlation",
              "Time-Based Analytics",
            ],
          },
        ],
      },
      {
        key: "admin-investment-extensions",
        title: "Investment Products",
        // Was `ph:lightning-duotone`, which said nothing about the group and
        // read as "fast" next to four literal chart icons.
        icon: "ph:coins-duotone",
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
            href: "/admin/ai/investment",
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
            // Moved out of "Trading Platforms". `/admin/forex` administers
            // MetaTrader-backed investment PLANS — funded capital with a
            // managed return — not an order book. The dealing desk for
            // currencies is `admin-forex-trading-platform`, and listing both as
            // "trading" made two very different products look like a duplicate.
            key: "admin-forex-platform",
            title: "Forex Broker & Investments",
            icon: "ph:currency-dollar-simple-duotone",
            extension: "forex",
            permission: "access.forex.account",
            href: "/admin/forex",
            description:
              "Forex investment plans with MetaTrader account management and managed returns.",
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
            key: "admin-staking-platform",
            title: "Staking Services",
            icon: "ph:stack-duotone",
            extension: "staking",
            permission: "access.staking",
            href: "/admin/staking",
            description:
              "Fixed-rate pools today, on-chain staking when the mode is switched: pools, positions, earnings, the territory gate and the product switch.",
            features: [
              "Fixed-rate or on-chain product switch",
              "Pools with lock terms and tiers",
              "Position management and withdrawal review",
              "Earnings and commission ledger",
              "Territory gate and risk statement",
              "Solvency console",
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
            key: "admin-email-marketing",
            title: "Email Marketing",
            icon: "ph:envelope-duotone",
            extension: "mailwizard",
            permission: "access.mailwizard.campaign",
            href: "/admin/mailwizard/campaign",
            // FOUR OF THESE DID NOT EXIST. The addon has no automation
            // workflows, no A/B testing, no audience segmentation and no open
            // or click tracking — no pixel, no link rewriting, no segment
            // concept, and a campaign starts when you set it Active rather than
            // at a scheduled time. Its own documentation calls the claims out
            // ("Read this before you promise anyone a feature").
            //
            // This panel is read by an operator deciding whether to buy the
            // addon, so the list has to be what ships.
            description:
              "A bulk-email desk in your admin panel: design from reusable blocks, pick recipients from your own users, and an hourly job sends at the rate you set.",
            features: [
              "Drag-and-Drop Editor",
              "Reusable Saved Blocks",
              "Campaign Management",
              "Recipients From Your Own Users",
              "Hourly Send Job With a Rate Cap",
              "Per-Recipient Delivery State",
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
          {
            // Second-to-last: acquisition (affiliate) -> retention (email) ->
            // merchant revenue (gateway) -> support. It used to sit second,
            // between the two marketing products.
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
            // Immediately after Knowledge Base, and that adjacency is the point:
            // this agent answers FROM that corpus. An operator who has just set
            // up their FAQ is one row away from the thing that reads it, and the
            // pairing explains what the product actually needs to work.
            key: "admin-ai-support",
            title: "AI Support Agent",
            icon: "ph:headset-duotone",
            extension: "ai_support",
            // The root key, matching `ai_investment`'s `access.ai.investment`.
            // The six screens beneath it carry their own finer keys — the inbox
            // deliberately reuses `view.support.ticket` so desk agents get it
            // with no extra grant.
            permission: "access.ai.support",
            href: "/admin/ai/support",
            // Kept in step with the extension seeder's description — the two
            // are read side by side (megamenu card, then the extensions grid)
            // and a buyer noticing they disagree learns not to trust either.
            description:
              "Answers support tickets and live chat instantly from your own documentation, so your team only sees the conversations that need a person.",
            features: [
              "Answers From Your Own Docs",
              "Cites Every Source It Used",
              "Escalates Money & Access Questions",
              "Copilot Mode — Drafts, You Send",
              "Ticket Triage & Handover Summaries",
              "Knowledge Gaps From Real Questions",
            ],
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
    permission: ["access.content.media", "access.content.slider", "access.admin"],
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
        // Directly under the blog, because blog comments are what it is mostly
        // about and the remedy for an upheld report is the comment tooling one
        // entry above. A report queue nobody can navigate to is the same defect
        // as no queue at all — Play's UGC policy asks for a means to ACT on
        // reports, and an unreachable page is not one.
        key: "admin-content-reports",
        title: "Reported Content",
        icon: "solar:flag-bold-duotone",
        href: "/admin/moderation/report",
        permission: "access.blog.comment",
        description:
          "Complaints users filed about comments, posts and listings. Reporting does not hide anything — each item stays up until somebody rules on it.",
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
      {
        // Moved here out of System. The page builder and the default-page
        // editor edit the public site — the same job as the blog, the media
        // library and the sliders directly above them. They were filed under
        // system administration next to cron jobs and platform updates, which
        // is where an operator looking for "change how the site looks" would
        // never think to look.
        key: "admin-appearance",
        title: "Appearance & Design",
        icon: "solar:palette-bold-duotone",
        description:
          "Customize your website appearance and design with advanced visual tools.",
        // A group's permission list is evaluated with `some`, so it must be the
        // UNION of everything reachable inside it. `access.design` is added
        // alongside `access.admin` so a role granted only the design capability
        // can still see the group that contains it.
        permission: ["access.admin", "access.design"],
        child: [
          {
            key: "admin-design-theme",
            title: "Site Design",
            href: "/admin/design",
            icon: "solar:pallete-2-bold-duotone",
            permission: "access.design",
            description:
              "Palette, corner radius, typeface, elevation, motion, and the navbar and footer layout — every visual choice, previewed live against the real site.",
          },
          /* `admin-appearance-chrome` used to sit here pointing at
             /admin/appearance. That page is now a redirect into Site Design
             above, which absorbed it. The KEY is not reused for either entry
             below: `key` IS the translation path in this file, so recycling it
             would hand a new item the old item's label in all 90 locales. */
          {
            key: "admin-content-menus",
            title: "Menus",
            href: "/admin/menus",
            icon: "solar:list-check-bold-duotone",
            permission: "access.design",
            description:
              "Rename, reorder, hide or add items in any menu on the site — the admin sidebar, the public navigation, and every extension's own menu.",
          },
          {
            key: "admin-content-footer",
            title: "Footer",
            href: "/admin/footer",
            icon: "solar:posts-carousel-vertical-bold-duotone",
            permission: "access.design",
            description:
              "Footer content: site name, tagline, copyright line, social links and the link columns. The footer's LAYOUT lives in Site Design.",
          },
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
      "access.database",
      "access.extension",
      "access.geo.restriction",
      "access.notification.template",
      "access.settings",
      "access.system.update",
      "view.currency.icon",
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
        key: "admin-communication",
        title: "Communication Tools",
        icon: "ph:chat-circle-duotone",
        description:
          "Platform communication management including notifications, announcements, and user messaging systems.",
        permission: ["access.notification.template", "access.system.announcement", "access.notification.settings"],
        child: [
          {
            key: "admin-notification-service",
            title: "Notification Service",
            href: "/admin/system/notification",
            permission: "access.notification.settings",
            icon: "ph:bell-ringing-duotone",
            description:
              "Multi-channel notification service with real-time monitoring, health checks, and testing tools for IN_APP, EMAIL, SMS, and PUSH notifications.",
          },
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
            key: "admin-notification-sms",
            title: "SMS Providers",
            href: "/admin/system/notification/sms",
            permission: "access.notification.settings",
            icon: "ph:chat-circle-text-duotone",
            description:
              "Choose and configure the SMS provider that carries auth codes, phone verification, withdrawal codes and notification messages. Compare Twilio and MSG91 and validate credentials before saving them.",
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
          {
            key: "admin-market-news",
            title: "Market News",
            href: "/admin/system/news",
            permission: "access.market.news",
            icon: "ph:newspaper-duotone",
            description:
              "News feed shown in the trading terminal. Provider stories sync automatically; desk commentary is authored here.",
          },
          {
            key: "admin-market-news-providers",
            title: "News Providers",
            href: "/admin/system/news/provider",
            permission: "access.market.news",
            icon: "ph:rss-duotone",
            description:
              "Choose where the terminal's news comes from. Enable any combination of Finnhub, CryptoCompare, CryptoPanic and your own RSS feeds, set what each is asked for and how long its stories are kept, and test a credential before switching it on.",
          },
        ],
      },
      {
        // NOT "admin-compliance": menu keys resolve to translation paths
        // (dashes become dots), and menu.admin.compliance already belongs to
        // the KYC group — reusing it would relabel this one "Compliance &
        // Verification" in every language.
        key: "admin-geo-compliance",
        title: "Compliance",
        icon: "ph:scales-duotone",
        description:
          "Regulatory controls governing who may access the platform, with the audit trail to evidence it.",
        permission: ["access.geo.restriction", "access.geo.restriction.log"],
        child: [
          {
            /* Sits with the geo controls because it answers the same shape of
               question from the other side. Geo restrictions say who is
               FORBIDDEN; this says who the operator is LICENSED to serve, and
               a regulated module reaches only the countries listed here.

               It belongs in a menu because default-deny is invisible: an
               operator whose futures module reaches nobody will report it
               broken unless there is somewhere obvious that explains why. */
            key: "admin-licence-attestations",
            title: "Licence Attestations",
            href: "/admin/system/attestation",
            permission: "access.geo.restriction",
            icon: "ph:seal-check-duotone",
            description:
              "The countries this platform is licensed to serve, per module. A regulated module reaches only residents of a country listed here — an empty list reaches nobody.",
          },
          {
            key: "admin-geo-restrictions",
            title: "Geo Restrictions",
            href: "/admin/system/geo-restriction",
            permission: "access.geo.restriction",
            icon: "ph:globe-hemisphere-west-duotone",
            description:
              "Restrict platform access by country, with scheduled effective dates, a recorded legal basis and a rule tester.",
          },
          {
            key: "admin-geo-restriction-policy",
            title: "Geo Policy",
            href: "/admin/system/geo-restriction/settings",
            permission: "access.geo.restriction",
            icon: "ph:shield-check-duotone",
            description:
              "How restrictions are enforced: detection sources, VPN handling, wind-down carve-outs and the visitor notice.",
          },
          {
            key: "admin-geo-access-log",
            title: "Geo Access Log",
            href: "/admin/system/geo-restriction/log",
            permission: "access.geo.restriction.log",
            icon: "ph:scroll-duotone",
            description:
              "Evidence log of every geographic access decision, with CSV export for regulators and auditors.",
          },
        ],
      },
      {
        key: "admin-monitoring",
        title: "System Monitoring",
        icon: "ph:monitor-duotone",
        description:
          "Comprehensive system monitoring with logging, performance metrics, and automated task management.",
        // Union of the children, per the invariant at the top of this file: with
        // `access.cron` alone a role scoped only to view.currency.icon lost the
        // whole group and could not reach the Currency Icons page.
        permission: ["access.cron", "view.currency.icon", "access.admin.audit"],
        child: [
          {
            key: "admin-audit-trail",
            title: "Audit Trail",
            href: "/admin/system/audit",
            // Seeded in backend/seeders/20240402234643-permissions.js. An entry
            // gated on a permission no role can hold is invisible to everyone
            // but Super Admin — see the `access.binary.duration` note.
            permission: "access.admin.audit",
            icon: "ph:scroll-duotone",
            description:
              "Every administrative action with the admin who performed it, the record it touched, and the reason they gave.",
          },
          {
            key: "admin-scheduled-tasks",
            title: "Scheduled Tasks",
            href: "/admin/system/cron",
            permission: "access.cron",
            icon: "ph:calendar-duotone",
            description:
              "Automated task scheduler with job monitoring, failure handling, and performance optimization.",
          },
          {
            key: "admin-currency-icons",
            title: "Currency Icons",
            href: "/admin/system/icon",
            permission: "view.currency.icon",
            icon: "ph:images-duotone",
            description:
              "Finds currencies with no icon and fetches them as 64x64 webp. Exchange providers list new tokens continuously, so this gap reopens on its own.",
          },
        ],
      },
      {
        key: "admin-database",
        title: "Database",
        icon: "ph:database-duotone",
        description:
          "Backup and restore the platform databases, and inspect the records they hold.",
        // Both children carry the same key, so the union is that one key. The
        // MySQL backup page had no navigation entry at all until this group was
        // added — it existed only to anyone who knew the URL.
        permission: "access.database",
        child: [
          {
            key: "admin-database-backup",
            title: "MySQL Backup",
            href: "/admin/system/database/backup",
            permission: "access.database",
            icon: "ph:floppy-disk-duotone",
            description:
              "Dump the relational database to a file and restore it. A restore drops and recreates the schema.",
          },
          {
            key: "admin-database-scylla",
            title: "ScyllaDB",
            href: "/admin/system/database/scylla",
            permission: "access.database",
            // Nav visibility only, and not access control: the routes behind
            // this page answer 503 on an install without the addon, because
            // ScyllaDB only exists where the ecosystem ships.
            extension: "ecosystem",
            icon: "ph:hard-drives-duotone",
            description:
              "Snapshot and restore the ecosystem and futures keyspaces, and browse or edit the rows they hold.",
          },
        ],
      },
      // Maintenance last. Installing an extension or running an update is the
      // rarest thing anyone does in here and the most disruptive; it used to
      // sit second and third, above the settings and policy screens an operator
      // actually opens week to week.
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
        key: "admin-system-updates",
        title: "System Updates",
        href: "/admin/system/update",
        icon: "ph:download-duotone",
        permission: "access.system.update",
        description:
          "Automated system updates with rollback capabilities, security patches, and feature deployment management.",
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
        settings: ["binaryStatus"],
        description:
          "Trade binary options with sophisticated analytics, risk management tools, and streamlined execution for time-sensitive strategies.",
      },
      {
        key: "user-trading-forex-trading",
        title: "Forex & Stocks",
        href: "/forex-trading/trade",
        icon: "ph:chart-line-up-duotone",
        extension: "forex_trading",
        description:
          "Trade forex, stocks and commodities with real market prices, leverage, stop-loss/take-profit and instant execution.",
      },
      {
        /* No `permission:`, matching `user-trading-forex-trading` above. The
           `extension:` key gates nav VISIBILITY only — client-side, against
           `useConfigStore().extensions` — and is not access control. */
        key: "user-trading-dex",
        title: "Swap",
        href: "/dex/swap",
        icon: "ph:arrows-left-right-duotone",
        extension: "dex",
        description:
          "Swap tokens directly from your own wallet. Non-custodial — we never hold your funds.",
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
      {
        key: "user-trading-bot",
        title: "Algo Trading Bots",
        href: "/trading-bot",
        icon: "ph:robot-duotone",
        extension: "trading_bot",
        description:
          "Automated trading with multiple strategies including DCA, Grid, and Indicator-based bots with paper trading simulation.",
      },
      {
        key: "user-trading-hummingbot",
        title: "Hummingbot",
        href: "/hb",
        icon: "ph:plugs-connected-duotone",
        extension: "hummingbot",
        // `/hb` is now the public landing, not the key manager, so it no longer
        // needs a session to be worth showing. The key manager at `/hb/keys`
        // still authenticates on its own.
        description:
          "Connect a self-hosted Hummingbot market maker with HMAC-signed API keys, and start from a curated strategy preset.",
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
    // Built-in product first, then the extensions, in the same order the admin
    // "Investment Products" group lists them.
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
        // Moved out of Trading. `/forex` sells managed MT4/MT5 plans — the user
        // never places an order there, they fund a plan and collect a return,
        // which is what every other item in this group does. The trading venue
        // for currencies is `user-trading-forex-trading` (/forex-trading/trade),
        // and having both under Trading made the pair indistinguishable.
        //
        // The KEY keeps its old `user-trading-…` shape on purpose: `key` IS the
        // translation path, so renaming it would drop this item back to its
        // English title in all 90 locales. Re-parenting is free; renaming is not.
        key: "user-trading-forex",
        title: "Forex Investments",
        href: "/forex",
        icon: "mdi:chart-line-variant",
        extension: "forex",
        description:
          "Invest in managed forex plans through MetaTrader 4/5 broker accounts with configurable returns.",
      },
      /*
        TWO ENTRIES FOR ONE ROUTE, one per product, gated on the staking mode.
        The words differ because the products do: a fixed rate the operator
        sets and pays, versus coins delegated on a network. `getSetting`
        defaults `stakingMode` to SYNTHETIC so an install that never saved the
        row still shows the fixed-rate entry.
      */
      {
        key: "user-investments-fixedrate",
        title: "Fixed-rate earn",
        href: "/staking",
        icon: "mdi:bank-outline",
        extension: "staking",
        settingConditions: { stakingMode: "SYNTHETIC" },
        description:
          "Set aside a balance for a fixed term at a rate this platform sets and pays from its own funds.",
      },
      {
        key: "user-investments-staking",
        title: "Staking",
        href: "/staking",
        icon: "mdi:bank-outline",
        extension: "staking",
        settingConditions: { stakingMode: "REAL" },
        description:
          "Delegate coins on the network from a wallet this platform holds, and receive what the network pays minus a commission.",
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
     settings: ["blogStatus"],
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
    !item.settings || item.settings.every((s) => {
      const value = getSetting(s);
      // Handle both string "true" and boolean true (settings are converted to booleans in the store)
      if (value === "true" || value === "1") return true;
      if (typeof value === 'boolean') return value === true;
      return false;
    });
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

/**
 * `GetFilteredMenuOptions` plus the admin's stored menu patches.
 *
 * Declared here rather than in `types/menu.d.ts` because that file is a GLOBAL
 * script — it has no top-level import or export, which is what makes `MenuItem`
 * ambient. Adding an `import` to it would turn it into a module and take
 * `MenuItem` out of global scope for the ~200 files that use it unqualified.
 */
export interface GetMenuOptions extends GetFilteredMenuOptions {
  /**
   * Every menu's patch, keyed by scope. OPTIONAL, and absent everywhere the
   * caller has no chrome context — `applyMenuOverrideForScope` short-circuits,
   * so the result is the shipped menu, identical object graph included.
   */
  menuOverrides?: MenuOverrides;
}

export function getMenu({
  user,
  settings,
  extensions,
  activeMenuType = "user",
  menuOverrides,
}: GetMenuOptions): MenuItem[] {
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

    // ANY, not ALL.
    //
    // Every multi-permission entry in this file is a group header whose array is
    // the union of its descendants' permissions — "Finance" carries 21 keys for
    // its 22 leaf screens (Trading Settings declares none, so it is listed for
    // anyone who can see the group and opens on the `access.admin` fallback).
    // Under `every`, that read as "you must hold all of them", so a role scoped
    // to, say, deposits alone lost the entire Finance menu and with it
    // every page it could actually open. Only Super Admin (short-circuited
    // above) ever saw the menu as designed.
    //
    // `some` is what the shape of the data means: show the group if you can
    // reach anything inside it. Each child is then filtered by its own
    // permission, so nothing unreachable is ever listed — and the menu was
    // never the access boundary in the first place; the API enforces the same
    // `access.*` permission on every route behind it.
    return perms.some((perm) => userPermissionNames.includes(perm));
  };

  const hasExtension = (name: string) => {
    if (!extensions) return false;
    const hasExt = extensions.includes(name);
    
    return hasExt;
  };

  const getSetting = (key: string) => {
    // Default landingPageType to "DEFAULT" when unset so the Appearance & Design
    // submenu always has a visible child (mirrors the landing page's "not CUSTOM = default" behavior).
    if (key === "landingPageType") return settings?.landingPageType || "DEFAULT";
    // Same shape for the staking product switch: an install that never saved
    // the key runs the fixed-rate product, and a `settingConditions` entry
    // that names SYNTHETIC has to be able to see that answer.
    if (key === "stakingMode") return String(settings?.stakingMode || "SYNTHETIC").toUpperCase();
    if (!settings) return null;
    return settings[key] || null;
  };

  // Parse addon aliases from settings for menu name overrides
  // Structure: { "ecosystem": { "menu": "Custom Name", "wallet": "..." }, ... }
  // Also supports legacy flat format: { "ecosystem": "Custom Name" }
  const addonMenuAliases: Record<string, string> = (() => {
    const raw = settings?.addon_aliases;
    if (!raw) return {};
    let parsed: Record<string, any> = {};
    if (typeof raw === "string") {
      try { parsed = JSON.parse(raw); } catch { return {}; }
    } else if (typeof raw === "object") {
      parsed = raw as Record<string, any>;
    }
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === "string") {
        // Legacy flat format
        result[key] = value;
      } else if (typeof value === "object" && value !== null && (value as any).menu) {
        // New per-context format - extract menu name
        result[key] = (value as any).menu;
      }
    }
    return result;
  })();

  const filteredMenu = menu
    .map((item) =>
      filterMenuItem(item, user, checkPermission, hasExtension, getSetting, isAdminMenu)
    )
    .filter((item): item is MenuItem => !!item);

  // Apply addon alias overrides to menu items that have an extension property
  // Sets both title and a custom flag so the menu translator knows to skip i18n
  const applyAliases = (items: MenuItem[]): MenuItem[] => {
    return items.map((item) => {
      const updated = { ...item };
      if (item.extension && addonMenuAliases[item.extension]) {
        updated.title = addonMenuAliases[item.extension];
        (updated as any)._customTitle = true;
      }
      if (updated.child) {
        updated.child = applyAliases(updated.child);
      }
      if (updated.megaMenu) {
        updated.megaMenu = applyAliases(updated.megaMenu);
      }
      return updated;
    });
  };

  const aliasedMenu =
    Object.keys(addonMenuAliases).length > 0 ? applyAliases(filteredMenu) : filteredMenu;

  /**
   * The admin's override, applied LAST — and last is the whole point.
   *
   * It runs on the tree that survived `filterMenuItem`, never before it. An
   * override applied first could put back what the permission or extension
   * filter was about to remove: `order` naming a key re-lists it, and a `custom`
   * item can be parented into a group the role cannot reach. The menu would then
   * advertise pages the API refuses, which is how a cosmetic feature turns into
   * an apparent access-control bug. Nothing in the engine reads or writes
   * `permission`; hiding here removes a link, not access.
   *
   * It also runs AFTER `applyAliases`, so an admin renaming an item in the menu
   * editor beats the older addon-alias setting for the same item — the more
   * specific, more deliberate edit wins. Both set `_customTitle`, so either way
   * the translator stops looking for a key that does not exist.
   *
   * `getMenu` stays a pure function of its arguments: same options in, same menu
   * out, no context read and nothing to stub in a test.
   */
  return applyMenuOverrideForScope(
    aliasedMenu,
    menuOverrides,
    menuScopeFor({ coreMenu: activeMenuType })
  );
}
