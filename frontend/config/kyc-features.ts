/**
 * Canonical KYC feature ids and the copy shown when a user lacks one.
 *
 * There are three places a feature id has to exist for the switch in the admin
 * level builder to mean anything end to end:
 *
 *   1. this file                        — the id and its user-facing copy
 *   2. feature-management.tsx           — the admin switch (icon, category, level)
 *   3. backend/src/utils/kyc.ts         — KYC_FEATURES, what routes enforce
 *
 * SIX IDS WERE REMOVED RATHER THAN WIRED: view_forex, view_ico, view_staking,
 * view_nft, view_gateway and view_copy_trading. Each was a switch in the admin
 * level builder — six of them pre-ticked in the recommended set, so every new
 * level shipped them on — and NOTHING enforced any of them on either side: no
 * `KYC_FEATURES.X` call site in `backend/src`, no `useKycGate` call in any of
 * the frontend call sites, and no mobile module mapped to one. Wiring them
 * would have revoked access users have today, which is the same reason
 * `kycFeatureEnforcement` itself ships off (`backend/src/utils/kyc.ts`).
 *
 * They used to drift silently, and the drift was invisible: ten ids existed in
 * the builder with no copy here, so those gates rendered the generic
 * "Verification Required" text instead of saying what was actually locked.
 * `FEATURE_MESSAGES` below is typed as a total `Record<KycFeatureId, ...>`, so
 * adding an id without writing its copy is now a compile error rather than a
 * silent fallback. (1) and (3) are checked against each other by hand; keep
 * them in the same order to make that easy.
 */

export const KYC_FEATURE_IDS = [
  // Trading
  "trade",
  "binary_trading",
  "deposit_forex",
  "withdraw_forex",
  "trade_forex",
  "create_forex_account",
  "futures_trading",
  // Wallet
  "view_wallets",
  "deposit_wallet",
  "withdraw_wallet",
  "transfer_wallets",
  "api_keys",
  // Content
  "author_blog",
  "comment_blog",
  // E-commerce
  "view_ecommerce",
  "order_ecommerce",
  // Investment
  "invest_forex",
  "invest_general",
  "invest_ai",
  // ICO
  "purchase_ico",
  "create_ico",
  // P2P / affiliate
  "affiliate_mlm",
  "withdraw_affiliate",
  "make_p2p_offer",
  "buy_p2p_offer",
  // Staking
  "invest_staking",
  "withdraw_staking",
  // Support
  "ask_faq",
  "support_ticket",
  // NFT
  "create_nft",
  "buy_nft",
  "sell_nft",
  "transfer_nft",
  "deploy_nft_contract",
  // Gateway
  "use_gateway",
  // Copy trading
  "copy_traders",
  "become_trader",
  // Trading bot
  "view_trading_bot",
  "trade_bot_live",
  "buy_bot_strategy",
  "become_bot_seller",
  // Hummingbot
  "view_hb",
  // DEX / Swap
  "view_dex",
  "swap_dex",
] as const;

export type KycFeatureId = (typeof KYC_FEATURE_IDS)[number];

export interface KycFeatureMessage {
  title: string;
  description: string;
}

export const FEATURE_MESSAGES: Record<KycFeatureId, KycFeatureMessage> = {
  // Trading
  trade: {
    title: "Trading Access",
    description:
      "Start your trading journey with our secure and regulated platform. Complete verification to access real-time markets and advanced trading tools.",
  },
  binary_trading: {
    title: "Binary Options Trading",
    description:
      "Unlock high-yield binary options trading with enhanced security measures. Verification ensures compliance with financial regulations.",
  },
  futures_trading: {
    title: "Futures Trading",
    description:
      "Trade futures contracts with institutional-grade security. Verification ensures compliance with derivatives trading regulations.",
  },
  deposit_forex: {
    title: "Forex Deposits",
    description:
      "Fund your forex trading account securely. Identity verification protects against fraud and ensures secure transactions.",
  },
  withdraw_forex: {
    title: "Forex Withdrawals",
    description:
      "Withdraw your forex profits safely and securely. Verification prevents unauthorized access to your funds.",
  },
  trade_forex: {
    title: "Forex & Multi-Asset Live Trading",
    description:
      "Place live, real-money orders in the Forex & Multi-Asset terminal. Demo trading never requires verification, so you can keep practising while this is pending.",
  },
  create_forex_account: {
    title: "Forex Live Account",
    description:
      "Open a live broker account and receive your trading credentials. Verification is required before a real-money account can be issued in your name.",
  },

  // Wallet
  view_wallets: {
    title: "Wallet Management",
    description:
      "Access your digital wallet portfolio with enhanced security. Verification protects your assets and transaction history.",
  },
  deposit_wallet: {
    title: "Wallet Deposits",
    description:
      "Securely deposit funds into your digital wallets. Identity verification prevents money laundering and protects your account.",
  },
  withdraw_wallet: {
    title: "Wallet Withdrawals",
    description:
      "Withdraw funds from your wallets with confidence. Verification ensures only you can access your digital assets.",
  },
  transfer_wallets: {
    title: "Wallet Transfers",
    description:
      "Transfer funds between wallets securely. Verification prevents unauthorized transfers and protects your assets.",
  },
  api_keys: {
    title: "API Access",
    description:
      "Generate and manage API keys for automated trading. Verification ensures secure programmatic access to your account.",
  },

  // Content
  author_blog: {
    title: "Content Creation",
    description:
      "Share your expertise and create valuable content. Verification establishes credibility and prevents spam.",
  },
  comment_blog: {
    title: "Community Engagement",
    description:
      "Join discussions and engage with our community. Verification ensures authentic interactions and prevents abuse.",
  },

  // E-commerce
  view_ecommerce: {
    title: "Marketplace Access",
    description:
      "Browse our exclusive marketplace with verified products and services. Verification ensures a trusted shopping experience.",
  },
  order_ecommerce: {
    title: "Marketplace Orders",
    description:
      "Purchase products and services securely. Verification protects both buyers and sellers in transactions.",
  },

  // Investment
  invest_forex: {
    title: "Forex Investments",
    description:
      "Invest in managed forex portfolios and strategies. Verification ensures compliance with investment regulations.",
  },
  invest_general: {
    title: "Investment Opportunities",
    description:
      "Access exclusive investment products and portfolios. Verification is required for investor protection and compliance.",
  },
  invest_ai: {
    title: "AI Investments",
    description:
      "Fund AI-managed trading strategies from your platform wallet. Verification is required for investor protection and compliance.",
  },

  // ICO
  purchase_ico: {
    title: "ICO Participation",
    description:
      "Participate in token sales and ICO investments. Verification is required for regulatory compliance and investor protection.",
  },
  create_ico: {
    title: "ICO Creation",
    description:
      "Launch your own token sale or ICO project. Verification ensures legitimacy and builds investor confidence.",
  },

  // P2P / affiliate
  affiliate_mlm: {
    title: "Affiliate Program",
    description:
      "Join our affiliate network and earn commissions. Verification ensures legitimate partnerships and prevents fraud.",
  },
  withdraw_affiliate: {
    title: "Affiliate Payouts",
    description:
      "Claim your earned referral rewards into a platform wallet. Verification is required before commissions can be paid out.",
  },
  make_p2p_offer: {
    title: "P2P Trading",
    description:
      "Create peer-to-peer trading offers. Verification builds trust with other traders and ensures secure transactions.",
  },
  buy_p2p_offer: {
    title: "P2P Purchases",
    description:
      "Buy from peer-to-peer offers safely. Verification protects against fraud and ensures legitimate transactions.",
  },

  // Staking
  invest_staking: {
    title: "Staking Investments",
    description:
      "Stake your cryptocurrencies and earn rewards. Verification protects your staked assets and ensures legitimate participation.",
  },
  withdraw_staking: {
    title: "Staking Withdrawals",
    description:
      "Claim your staking earnings and withdraw staked principal. Verification ensures only you can move funds out of a position.",
  },

  // Support
  ask_faq: {
    title: "Advanced Support",
    description:
      "Access our comprehensive FAQ and knowledge base. Verification provides personalized support experiences.",
  },
  support_ticket: {
    title: "Priority Support",
    description:
      "Get priority customer support and assistance. Verification ensures secure communication and account protection.",
  },

  // NFT
  create_nft: {
    title: "NFT Creation",
    description:
      "Mint and create new NFTs on the platform. Verification establishes creator authenticity and protects collectors.",
  },
  buy_nft: {
    title: "NFT Purchases",
    description:
      "Buy NFTs from the marketplace. Verification protects both sides of a sale and satisfies anti-fraud requirements.",
  },
  sell_nft: {
    title: "NFT Sales",
    description:
      "List and sell your NFTs on the marketplace. Verification builds buyer trust and is required to receive sale proceeds.",
  },
  transfer_nft: {
    title: "NFT Transfers",
    description:
      "Send an owned NFT to another address or user. Verification protects against unauthorized transfers of your assets.",
  },
  deploy_nft_contract: {
    title: "NFT Contract Deployment",
    description:
      "Deploy your collection's smart contract on-chain. Verification is required because deployment permanently spends gas.",
  },

  // Gateway
  use_gateway: {
    title: "Payment Processing",
    description:
      "Accept payments through external gateways as a merchant. Verification is mandatory before you can process third-party funds.",
  },

  // Copy trading
  copy_traders: {
    title: "Copy Trading Allocation",
    description:
      "Allocate capital to follow another trader. Verification protects your funds and satisfies investor-protection rules.",
  },
  become_trader: {
    title: "Become a Trader",
    description:
      "Register as a strategy provider and let others copy your trades. Verification is required because followers commit real money to you.",
  },

  // Trading bot
  view_trading_bot: {
    title: "Trading Bots",
    description:
      "Access the trading bot dashboard, your bots and the strategy marketplace. Verification is required for automated trading access.",
  },
  trade_bot_live: {
    title: "Live Bot Trading",
    description:
      "Run trading bots in live mode against real balances. Paper trading never requires verification, so you can keep testing meanwhile.",
  },
  buy_bot_strategy: {
    title: "Strategy Purchases",
    description:
      "Buy paid strategies from the bot marketplace. Verification protects both buyers and strategy creators in every sale.",
  },
  become_bot_seller: {
    title: "Sell Your Strategies",
    description:
      "Submit a strategy for marketplace review and earn from every sale. Verification is required before you can receive proceeds.",
  },

  // Hummingbot
  view_hb: {
    title: "Hummingbot Connector",
    description:
      "Access the Hummingbot setup guide, connector kit, strategy presets and live console. Verification is required for connector access.",
  },

  // DEX / Swap
  view_dex: {
    title: "Swap Access",
    description:
      "Browse the non-custodial Swap page, its token list, live quotes and your swap history. Executing a swap is verified separately.",
  },
  swap_dex: {
    title: "Execute Swaps",
    description:
      "Build and submit swap transactions from your own wallet. You sign every transaction yourself — the platform never holds your funds.",
  },
};
