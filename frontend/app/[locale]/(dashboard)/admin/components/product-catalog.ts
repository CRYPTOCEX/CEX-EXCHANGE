import {
  ArrowLeftRight,
  Bot,
  Boxes,
  Brain,
  CandlestickChart,
  Coins,
  CreditCard,
  Globe,
  Image as ImageIcon,
  Layers,
  LifeBuoy,
  LineChart,
  Mail,
  Repeat,
  Rocket,
  ShoppingBag,
  Target,
  TrendingUp,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

/**
 * The one place the product list is written down.
 *
 * Three separate things need it — the operations tiles, the revenue attribution
 * and the upsell — and before this file each carried its own partial copy. The
 * old dashboard's upsell block hardcoded fifteen `productId` strings inline
 * with its own titles and paths, so an extension renamed or moved anywhere else
 * in the app left a dead link on the landing page and nothing failed loudly.
 *
 * `name` is the EXTENSION NAME as the platform knows it: the key of
 * `CacheManager.getExtensions()` on the server, and an entry of
 * `useConfigStore().extensions` on the client. Those are the same list — it is
 * seeded by `seeders/20240403000503-extensions.js` — so this is the only string
 * that has to match anything.
 *
 * `productId` is the Envato item id, needed for the extension detail route and
 * for nothing else.
 *
 * `href` is the addon's admin landing page. Verified to exist: every entry with
 * one resolves to a real `page.tsx` under `app/[locale]/(ext)/admin/`. An addon
 * with no admin surface of its own (`wallet_connect` is configured entirely
 * from Platform Settings) carries `href: null` and renders without a link
 * rather than with one that 404s.
 */
export interface ProductDefinition {
  name: string;
  productId: string;
  label: string;
  icon: LucideIcon;
  href: string | null;
  /** One line on what an operator does with it, used in the upsell. */
  pitch: string;
}

export const PRODUCTS: ProductDefinition[] = [
  {
    name: "ecosystem",
    productId: "40071914",
    label: "Ecosystem",
    icon: Layers,
    href: "/admin/ecosystem",
    pitch:
      "Run your own chains, tokens and markets. Full control over pairs, fees and liquidity.",
  },
  {
    name: "p2p",
    productId: "44593497",
    label: "P2P Trading",
    icon: Repeat,
    href: "/admin/p2p",
    pitch:
      "Users trade fiat for crypto directly with each other under escrow, so you carry no banking rails.",
  },
  {
    name: "futures",
    productId: "46094641",
    label: "Futures",
    icon: LineChart,
    href: "/admin/futures",
    pitch: "Leveraged perpetuals on your existing markets — the highest fee-per-trade product.",
  },
  {
    name: "staking",
    productId: "37434481",
    label: "Staking",
    icon: Coins,
    href: "/admin/staking",
    pitch: "Pay yield on held assets. The standard lever for keeping balances on-platform.",
  },
  {
    name: "ico",
    productId: "36120046",
    label: "Token Offerings",
    icon: Rocket,
    href: "/admin/ico",
    pitch: "Run token sales with vesting, phases and MetaMask contributions.",
  },
  {
    name: "nft",
    productId: "60962133",
    label: "NFT Marketplace",
    icon: ImageIcon,
    href: "/admin/nft",
    pitch: "Mint, list, auction and take royalties on digital collectibles.",
  },
  {
    name: "ecommerce",
    productId: "44624493",
    label: "Store",
    icon: ShoppingBag,
    href: "/admin/ecommerce",
    pitch: "Sell physical or digital goods for crypto, with orders and shipping.",
  },
  {
    name: "gateway",
    productId: "61043226",
    label: "Payment Gateway",
    icon: CreditCard,
    href: "/admin/gateway",
    pitch:
      "Let external merchants accept crypto through you and take a cut of every payment.",
  },
  {
    name: "mlm",
    productId: "36667808",
    label: "Affiliate",
    icon: Target,
    href: "/admin/affiliate",
    pitch: "Multi-level referrals that turn your existing users into an acquisition channel.",
  },
  {
    name: "forex",
    productId: "36668679",
    label: "Forex",
    icon: Globe,
    href: "/admin/forex",
    pitch: "Managed forex investment plans and broker accounts.",
  },
  {
    name: "forex_trading",
    productId: "36668679",
    label: "Forex Trading",
    icon: CandlestickChart,
    href: "/admin/forex-trading",
    pitch: "A real forex desk: instruments, routing rules and execution providers.",
  },
  {
    name: "copy_trading",
    productId: "61107157",
    label: "Copy Trading",
    icon: Users,
    href: "/admin/copy-trading",
    pitch: "Beginners mirror your best traders automatically. Both sides pay you.",
  },
  {
    name: "trading_bot",
    productId: "61107157",
    label: "Trading Bots",
    icon: Bot,
    href: "/admin/trading-bot",
    pitch: "A marketplace of DCA, grid and indicator strategies users can rent.",
  },
  {
    name: "ai_investment",
    productId: "35988984",
    label: "AI Investment",
    icon: TrendingUp,
    href: "/admin/ai/investment",
    pitch: "Managed investment plans with automated returns.",
  },
  {
    name: "ai_market_maker",
    productId: "61007981",
    label: "AI Market Maker",
    icon: Brain,
    href: "/admin/ai/market-maker",
    pitch: "Automated liquidity and price discovery for your own markets.",
  },
  {
    name: "binary_ai_engine",
    productId: "61007981",
    label: "Binary Engine",
    icon: Brain,
    href: "/admin/ai/binary-engine",
    pitch: "Tunable outcome engine and risk tiers for binary trading.",
  },
  {
    name: "hummingbot",
    productId: "61007981",
    label: "Hummingbot",
    icon: Bot,
    href: "/admin/hb",
    pitch: "Connect Hummingbot strategies to your markets.",
  },
  {
    name: "mailwizard",
    productId: "45613491",
    label: "MailWizard",
    icon: Mail,
    href: "/admin/mailwizard",
    pitch: "Drag-and-drop campaigns with AI copy, sent to your own user base.",
  },
  {
    name: "knowledge_base",
    productId: "39166202",
    label: "Knowledge Base",
    icon: Boxes,
    href: "/admin/faq",
    pitch: "Self-service answers that keep repeat questions out of the support queue.",
  },
  {
    name: "dex",
    // PLACEHOLDER, matching `seeders/20240403000503-extensions.js`. When the real
    // Envato id lands it has to change in both places at once — the seeder is
    // what `CacheManager.getExtensions()` serves, and this is what links the
    // tile to the extension detail route.
    productId: "62100000",
    /*
      "Web3 Trading", NOT "DEX" and NOT "Swap". Both rules are binding and both
      are written down in plans/DEX-SYSTEM.md: `trade/pro` already calls the
      in-house ecosystem "the DEX", so the name would read as a venue this
      platform operates; and "Swap" is the name of the user-facing TERMINAL, not
      of the addon, which also ships the wallet layer and the pool consoles.
    */
    label: "Web3 Trading",
    icon: ArrowLeftRight,
    href: "/admin/dex",
    pitch:
      "Users connect their own wallet and trade aggregated DeFi liquidity across fifteen chains. You take a fee per swap and custody nothing.",
  },
  {
    name: "ai_support",
    // PLACEHOLDER until the CodeCanyon item exists — the same number is in the
    // extensions seeder and in `backend/src/config/license.ts`.
    productId: "62000001",
    label: "AI Support",
    icon: LifeBuoy,
    href: "/admin/ai/support",
    pitch:
      "Answers tickets and live chat from your own documentation, so your team only sees what needs a person.",
  },
  {
    name: "wallet_connect",
    productId: "37548018",
    label: "Wallet Connect",
    icon: Wallet,
    // Configured entirely from Platform Settings; it has no admin section.
    href: null,
    pitch: "MetaMask and WalletConnect sign-in, the baseline for a Web3 audience.",
  },
  {
    name: "chart_engine",
    productId: "61364182",
    label: "Chart Engine",
    icon: CandlestickChart,
    // A rendering engine the trading screens consume, not a console. Same shape
    // as wallet_connect: it is a real product an operator buys and should be
    // able to see they own, with nothing of its own to open.
    href: null,
    pitch:
      "Premium charting with order visualisation, P/L zones and expiry timers on every trading screen.",
  },
];

export const PRODUCT_BY_NAME = new Map(PRODUCTS.map((p) => [p.name, p]));

/** The extension detail route, where an owner licenses or updates a product. */
export function productDetailHref(productId: string): string {
  return `/admin/system/extension/${productId}`;
}
