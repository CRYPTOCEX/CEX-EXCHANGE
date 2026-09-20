"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  ArrowDownRight,
  Shield,
  Zap,
  BarChart3,
  Globe,
  Users,
  Award,
  CheckCircle,
  Sparkles,
  Target,
  DollarSign,
  LineChart,
  Lock,
  TrendingUp,
  Wallet,
  Clock,
  ChevronRight,
  Star,
  Layers,
  Activity,
  PieChart,
  Rocket,
  Copy,
  Gift,
  Image as ImageIcon,
  ShoppingBag,
  Brain,
  Percent,
  ArrowLeftRight,
  Flame,
  Package,
  ShoppingCart,
  Folder,
  Tag,
  Database,
  LayoutGrid,
  Coins,
  Eye,
  EyeOff,
  RefreshCw,
  Crosshair,
  Cpu,
  Network,
  Gem,
  Trophy,
  Banknote,
  CircleDollarSign,
  CreditCard,
  Landmark,
  Timer,
  CandlestickChart,
  Boxes,
  Hexagon,
  Orbit,
  BadgePercent,
  HandCoins,
  UserCheck,
  Store,
  Gavel,
  TrendingDown,
  Scale,
} from "lucide-react";
// Image import removed - using native img tags to prevent Next.js image optimization re-requests
import { m, useScroll, useTransform, useInView, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Loadable } from "@/components/ui/skeleton";
import { tickersWs } from "@/services/tickers-ws";
import { Link } from "@/i18n/routing";
import { useUserStore } from "@/store/user";
import { useWalletStore } from "@/store/finance/wallet-store";
import { useTranslations } from "next-intl";
import { MobileAppSection } from "./components/mobile-app-section";
import { getCryptoImageUrl } from "@/utils/image-fallback";
import { useConfigStore } from "@/store/config";
import { $fetch } from "@/lib/api";
import { buildMarketLink } from "@/utils/market-links";
import {
  previewSectionProps,
  usePagePreview,
  usePreviewSectionFocus,
} from "@/lib/default-page/preview-bridge";
import {
  Eyebrow,
  Headline,
  LivePill,
  NoiseOverlay,
  PageBackground,
  Panel,
  PrimaryCta,
  Section,
  SecondaryCta,
  useSectionReveal,
} from "@/components/landing";
import {
  AffiliateArt,
  AiInvestmentArt,
  BinaryArt,
  CopyTradingArt,
  EcommerceArt,
  EcosystemArt,
  ForexArt,
  FuturesArt,
  GatewayArt,
  HummingbotArt,
  IcoArt,
  MultiAssetArt,
  NftArt,
  P2PArt,
  PlatformArt,
  SpotArt,
  StakingArt,
  TradingBotArt,
} from "@/components/landing/art";

// Icon mapping
const iconMap: Record<string, any> = {
  Zap, Shield, BarChart3, Users, Target, DollarSign, Award, Globe, LineChart,
  Lock, TrendingUp, Wallet, Clock, Star, Layers, Activity, PieChart, CheckCircle,
  Rocket, Copy, Gift, Image: ImageIcon, ShoppingBag, Brain, Percent, ArrowLeftRight,
  Flame, Package, ShoppingCart, Folder, Tag, Database, LayoutGrid, Coins, Sparkles,
  Crosshair, Cpu, Network, Gem, Trophy, Banknote, CircleDollarSign, CreditCard, Landmark, Timer,
  CandlestickChart, Boxes, Hexagon, Orbit, BadgePercent, HandCoins, UserCheck, Store,
  Gavel, TrendingDown, Scale,
};

// Type definitions

/**
 * The stored `home` default-page document.
 *
 * Exported because the server component that renders this page now fetches it
 * — see `initialContent` on `DefaultHomePage`. `app/[locale]/page.tsx` and
 * `app/[locale]/components/home-route-client.tsx` name this type; both erase
 * the import, so nothing pulls this "use client" module onto the server.
 */
export interface PageContent {
  id: string;
  pageId: string;
  pageSource: string;
  type: string;
  title: string;
  variables: Record<string, any>;
  content: string;
  meta: string;
  status: string;
  lastModified: string;
}

interface LandingFeature {
  id: string;
  title: string;
  description: string;
  icon: string;
  stats: Array<{ label: string; value: string; icon: string }>;
  link: string;
  data?: Record<string, any>;
}

/**
 * `/api/content/landing-stats`, the live platform figures this page is made of.
 *
 * Exported for the same reason `PageContent` above is: the server component
 * that renders this route now fetches this payload and hands it down as
 * `initialStats`, and both `app/[locale]/page.tsx` and
 * `app/[locale]/components/home-route-client.tsx` have to name its type. A
 * type-only import erases, so naming it there does not drag this "use client"
 * module onto the server.
 */
export interface LandingStats {
  platform: {
    users: number;
    activeUsers: number;
    verified: number;
  };
  extensions: Record<string, any>;
  features: LandingFeature[];
  settings: {
    spotEnabled: boolean;
    binaryEnabled?: boolean;
  };
}

// Helper function to get text from database variables
const getContent = (pageContent: PageContent | null, path: string, defaultValue: string = "") => {
  if (!pageContent?.variables) return defaultValue;
  const pathParts = path.split('.');
  let value = pageContent.variables;
  for (const part of pathParts) {
    if (value && typeof value === 'object' && part in value) {
      value = value[part];
    } else {
      return defaultValue;
    }
  }
  const result = value || defaultValue;
  return result != null ? String(result) : defaultValue;
};

// ============================================================================
// PAGE-LOCAL PRIMITIVES
//
// Everything that is not specific to this page now lives in
// `@/components/landing` so the addon landing pages compose the same
// arrangement rather than each configuring the old page-builder sections
// into a different one. `StatGrid` stays here: it resolves `iconMap`, which
// is this page's registry for the icon *names* the backend sends.
// ============================================================================

/**
 * The stat pair under every product pitch.
 *
 * Both rows are FIXED-HEIGHT chrome — a 40px icon tile beside `text-xl` over
 * `text-xs` — so the only thing the fetch decides here is how WIDE the two
 * strings are. That is why the pending state is `Loadable` inside the same two
 * elements rather than a second markup branch: the pair measures 40px in both
 * states, and a section carrying it cannot change height as its figures land.
 */
function StatGrid({
  stats,
  loading = false,
  className,
}: {
  stats: LandingFeature["stats"];
  loading?: boolean;
  className?: string;
}) {
  if (!stats?.length) return null;
  return (
    <div className={cn("grid grid-cols-2 gap-4", className)}>
      {stats.map((stat, i) => {
        /* `Activity` is also the pending glyph. The endpoint picks a per-stat
           icon ("DollarSign", "Package") and that name is not knowable here, so
           the tile paints the neutral one until it is — a glyph swap inside a
           box whose size never changes. */
        const StatIcon = iconMap[stat.icon] || Activity;
        return (
          <div key={i} className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10">
              <StatIcon className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <div className="text-xl font-bold tabular-nums text-foreground">
                <Loadable loading={loading} placeholder="12.5K">
                  {stat.value}
                </Loadable>
              </div>
              <div className="truncate text-xs text-muted-foreground">
                <Loadable loading={loading} placeholder="Trading Volume">
                  {stat.label}
                </Loadable>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// LIVE MARKET PIECES
// ============================================================================

/**
 * Ten pending chips, because the strip is exactly one chip tall.
 *
 * The real strip is `topAssets.slice(0, 10)` repeated three times, and the band
 * it sits in is 90px whether it carries one chip or thirty — the row is
 * horizontal, so the COUNT buys no height and only the density reads as wrong
 * if it is off. Ten matches what lands, which is the cheapest way to make the
 * arrival invisible rather than merely non-shifting.
 *
 * `currency: ""` is deliberate: `getCryptoImageUrl("")` falls through to the
 * generic coin, so the 28px avatar is painted in both states from the same
 * code path instead of being gated out of the pending one.
 */
const PENDING_TICKER_ASSETS = Array.from({ length: 10 }, (_, i) => ({
  symbol: `pending-${i}`,
  currency: "",
  name: "",
  price: 0,
  change24h: 0,
}));

/**
 * Five pending rows for the hero panel, matching `topAssets.slice(0, 5)`.
 *
 * Unlike the ticker this count IS load-bearing: the rows stack, each is 60px
 * (a 36px avatar inside `p-3`), and the panel is the tallest thing in the hero
 * on a signed-out visit. The panel used to render a parallel skeleton tree here
 * — five `animate-pulse` divs full of `h-3 w-16` boxes — which happened to be
 * 60px too, by coincidence rather than by construction: nothing tied those
 * boxes to the `text-sm`/`text-xs` pair they stood in for, so the next
 * typography change would have silently broken the match. One tree now, values
 * behind `Loadable`, height produced by the same text layout in both states.
 */
const PENDING_HERO_ASSETS = Array.from({ length: 5 }, (_, i) => ({
  symbol: `pending-${i}`,
  name: "",
  currency: "",
  pair: "",
  price: 0,
  change24h: 0,
}));

const PremiumTicker = React.memo(function PremiumTicker({
  assets,
  loading = false,
}: {
  assets: any[];
  loading?: boolean;
}) {
  const tickerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(tickerRef, { margin: "-100px" });
  const [isPageVisible, setIsPageVisible] = useState(true);
  const prefersReducedMotion = useReducedMotion();

  /**
   * The band renders in BOTH states, and that is the whole point of this prop.
   *
   * `if (!assets.length) return null` used to cover the pending case as well as
   * the empty one, so a 90px bordered strip appeared out of nowhere the moment
   * `/api/exchange/market` answered and pushed the entire rest of the page down
   * with it. Loading and empty are separated now: no assets AND not loading is
   * still nothing (an operator with no markets configured should not get an
   * eternal row of grey), no assets AND loading reserves the row.
   */
  const source = useMemo(
    () => (assets.length ? assets : loading ? PENDING_TICKER_ASSETS : []),
    [assets, loading]
  );
  const showPlaceholders = !assets.length && loading;
  const tickerAssets = useMemo(() => [...source, ...source, ...source], [source]);

  useEffect(() => {
    const handleVisibilityChange = () => setIsPageVisible(!document.hidden);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  if (!source.length) return null;

  /* Nothing scrolls while the values are fake — a marquee of placeholders reads
     as a bug, and the animation would restart on arrival anyway. */
  const shouldAnimate = isInView && isPageVisible && !prefersReducedMotion && !showPlaceholders;

  return (
    <div ref={tickerRef} className="relative overflow-hidden py-4">
      <div className="absolute bottom-0 left-0 top-0 z-10 w-24 bg-linear-to-r from-background to-transparent" />
      <div className="absolute bottom-0 right-0 top-0 z-10 w-24 bg-linear-to-l from-background to-transparent" />

      <m.div
        animate={shouldAnimate ? { x: ["0%", "-33.33%"] } : undefined}
        transition={{ duration: 50, ease: "linear", repeat: Infinity }}
        className="flex gap-3"
      >
        {tickerAssets.map((asset, index) => (
          <div
            key={`${asset.symbol}-${index}`}
            className="flex shrink-0 items-center gap-3 rounded-lg border border-border bg-surface-2 px-4 py-2.5"
          >
            <div className="h-7 w-7 overflow-hidden rounded-full bg-surface-3">
              <img
                src={getCryptoImageUrl(asset.currency || asset.name || "generic")}
                alt={asset.name || "crypto"}
                width={28}
                height={28}
                loading="lazy"
                className="h-full w-full object-cover"
                onError={(e) => {
                  const target = e.currentTarget;
                  if (!target.dataset.fallbackAttempted) {
                    target.dataset.fallbackAttempted = 'true';
                    target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxNiIgY3k9IjE2IiByPSIxNiIgZmlsbD0iIzMzMyIvPjwvc3ZnPg==';
                  }
                }}
              />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-foreground">
                <Loadable loading={showPlaceholders} placeholder="BTC">
                  {asset.name || asset.currency}
                </Loadable>
              </span>
              <span className="font-mono text-xs tabular-nums text-muted-foreground">
                <Loadable loading={showPlaceholders} placeholder="00,000.00">
                  {asset.price?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 }) || "0.00"}
                </Loadable>
              </span>
            </div>
            <span
              className={cn(
                "ml-1 rounded px-2 py-0.5 font-mono text-xs font-semibold tabular-nums",
                /* R5: `up`/`down` state a direction of money. A placeholder has
                   no direction, and `undefined >= 0` is false — so painting the
                   pending chip by the same rule would tell every visitor the
                   whole market was down for a second. It gets the neutral ramp
                   step instead, at the same box. */
                showPlaceholders
                  ? "bg-surface-3 text-muted-foreground"
                  : asset.change24h >= 0
                    ? "bg-up/10 text-up-ink"
                    : "bg-down/10 text-down-ink"
              )}
            >
              <Loadable loading={showPlaceholders} placeholder="+0.00%">
                {asset.change24h >= 0 ? "+" : ""}{asset.change24h?.toFixed(2) || "0.00"}%
              </Loadable>
            </span>
          </div>
        ))}
      </m.div>
    </div>
  );
});


// ============================================================================
// FLAGSHIP PRODUCT SECTION
//
// One shell, one visual slot. The five product sections used to be five copies
// of this markup that differed only in hue, which is why "make the landing page
// consistent" kept failing: there were five places to change and no single
// definition of what a product section looked like.
// ============================================================================

/**
 * A description of REPRESENTATIVE length, for the pending state.
 *
 * The sixteen descriptions this endpoint ships run 88 to 151 characters and
 * average 105, which at `text-lg` in this column is two lines. That number is
 * the only thing separating a pending section from a landed one in height, so
 * it is the one worth getting close: `SkeletonText` lays this string out for
 * real and then paints over it, so the paragraph wraps to the same line count
 * the real copy will — an `h-12` box could not track a font change and this
 * does.
 */
const PENDING_DESCRIPTION =
  "Trade, invest and settle on one platform, with the tools and the liquidity your users already expect.";

function FeatureSection({
  feature,
  eyebrow,
  headline,
  highlight,
  cta,
  visual,
  flip = false,
  loading = false,
}: {
  feature: LandingFeature;
  /* ReactNode, because the eyebrow is the module's own TITLE for eleven of the
     sixteen sections and that string comes from the endpoint — so it is a
     value, and a value that is still in flight is passed here as a
     `<Loadable>`. The chip around it is fixed-height, so this settles sideways
     only. */
  eyebrow: React.ReactNode;
  headline: string;
  highlight?: string;
  cta: string;
  visual?: React.ReactNode;
  flip?: boolean;
  loading?: boolean;
}) {
  const Icon = iconMap[feature.icon] || Zap;
  const hasVisual = Boolean(visual);

  return (
    <Section bordered>
      <div
        className={cn(
          "grid items-center gap-12 lg:gap-16",
          hasVisual ? "grid-cols-1 lg:grid-cols-2" : "mx-auto max-w-3xl grid-cols-1 text-center"
        )}
      >
        <div className={cn(flip && hasVisual && "lg:order-2")}>
          <Eyebrow icon={Icon}>{eyebrow}</Eyebrow>

          {/* `Headline` rather than an inline span: a module that has no
              hand-written highlight passes `undefined`, and the old markup
              printed an empty accent span after a trailing space for it. */}
          <h2 className="mb-5 mt-6 text-balance text-3xl font-bold leading-[1.15] tracking-tight md:text-4xl lg:text-5xl">
            <Headline title={headline} highlight={highlight} />
          </h2>

          <p className={cn("mb-8 text-lg leading-relaxed text-muted-foreground", !hasVisual && "mx-auto max-w-xl")}>
            <Loadable loading={loading} placeholder={PENDING_DESCRIPTION}>
              {feature.description}
            </Loadable>
          </p>

          <StatGrid
            stats={feature.stats}
            loading={loading}
            className={cn("mb-8", !hasVisual && "mx-auto max-w-md")}
          />

          <PrimaryCta href={feature.link}>{cta}</PrimaryCta>
        </div>

        {hasVisual && <div className={cn(flip && "lg:order-1")}>{visual}</div>}
      </div>
    </Section>
  );
}

// ============================================================================
// PRODUCT VISUALS
//
// Deleted 2026-07-29: `SpotVisual`, `EcosystemVisual`, `BinaryVisual`,
// `FuturesVisual`, `StakingVisual` and `ForexVisual` were hand-built HTML mock
// panels standing in for the six core products. Once every addon section had a
// drawn scene, these were the only things on the page that did not, and they
// read as a different design. `MODULE_ART` covers all six now.
// ============================================================================

// ============================================================================
// PLATFORM MODULES
//
// Every registered module used to land in one three-across card grid, on the
// argument that "sixteen alternating sections is not a landing page, it is a
// scroll". What that bought was a page where the six core products each got a
// full section with a picture and the eleven addons each got a 200-word card —
// so a visitor could read the whole thing and never learn that this platform
// does P2P, or NFTs, or merchant payments, beyond seeing the words.
//
// Each module gets its own section now, illustrated with the same scene its own
// landing page uses, so the two agree. Length is controlled where it should be:
// the page-builder's `extensionSections` map already disables and reorders
// these by id, and `dynamicFeatures` honours it.
// ============================================================================

/**
 * Illustration per module.
 *
 * Keyed by the ids `/api/content/landing-stats` emits, which are *not* the
 * extension names — the endpoint sends `copyTrading` where the extension table
 * says `copy_trading`. A module with no entry renders without art instead of
 * breaking the run, which is what happens to anything added later.
 */
const MODULE_ART: Record<string, React.ComponentType> = {
  spot: SpotArt,
  binary: BinaryArt,
  futures: FuturesArt,
  forexTrading: MultiAssetArt,
  ecosystem: EcosystemArt,
  staking: StakingArt,
  ico: IcoArt,
  ai: AiInvestmentArt,
  forex: ForexArt,
  copyTrading: CopyTradingArt,
  tradingBot: TradingBotArt,
  hummingbot: HummingbotArt,
  p2p: P2PArt,
  nft: NftArt,
  ecommerce: EcommerceArt,
  gateway: GatewayArt,
  affiliate: AffiliateArt,
};

/**
 * Headline, accent run and button label per module.
 *
 * The backend sends a title and a description, both of which are catalogue
 * copy. A headline that reads as a sentence is editorial, so it lives here —
 * and anything unlisted falls back to its own title, so a module registered
 * later still gets a section rather than an empty heading.
 */
const MODULE_COPY: Record<string, { headline: string; highlight: string; cta: string }> = {
  ico: { headline: "Launch a token,", highlight: "raise the round", cta: "Browse offerings" },
  ai: { headline: "Managed plans,", highlight: "measured returns", cta: "View plans" },
  forex: { headline: "Institutional forex,", highlight: "retail access", cta: "View plans" },
  copyTrading: { headline: "Follow a record,", highlight: "not a feeling", cta: "Find a leader" },
  tradingBot: { headline: "Automate the strategy,", highlight: "keep the rules", cta: "Build a bot" },
  hummingbot: { headline: "Bring your own", highlight: "market maker", cta: "Connect a bot" },
  p2p: { headline: "Trade peer to peer,", highlight: "settle in escrow", cta: "Browse offers" },
  nft: { headline: "Mint, list and", highlight: "collect", cta: "Open the marketplace" },
  ecommerce: { headline: "Sell for crypto,", highlight: "settle instantly", cta: "Visit the store" },
  gateway: { headline: "Accept crypto", highlight: "anywhere", cta: "Start accepting" },
  affiliate: { headline: "Grow through", highlight: "your own users", cta: "Join the program" },
};

/**
 * WHICH SECTIONS ARE COMING — decided before the fetch answers.
 * ============================================================================
 *
 * This run WAS the page's whole layout-shift budget, and it was not a mis-sized
 * skeleton: `landingStats?.features || []` is an empty array until
 * `/api/content/landing-stats` lands, so the sixteen product sections did not
 * exist for the first second and the page was **124 text nodes tall instead of
 * 584**. Everything under them — "Why Choose Us", the getting-started rail, the
 * mobile-app band, the closing CTA — sat 11,772px too high and then dropped, in
 * one step, all 88 pieces of it. CLS scored that 0.0075, i.e. "good", because
 * CLS weights by viewport impact and almost all of the movement was below the
 * fold. The metric was not wrong; it was answering a different question.
 *
 * The fix is not a guessed count. The endpoint decides this list from two
 * things that are known before the fetch answers:
 *
 *   - `settings`, for the two core products that are not extensions (spot is
 *     `spotWallets`, binary is `binaryStatus`), and
 *   - `extensions`, the canonical `extension.name` list.
 *
 * WHERE THOSE COME FROM — corrected, and this correction was worth 0.0885 CLS.
 *
 * This comment used to say they "arrive as PROPS on `<Providers>` from the
 * server layout and are in `useConfigStore` before this component's first
 * effect runs". Half true, and the false half was the expensive half:
 * `<Providers>` writes them into the store from an EFFECT, and an effect does
 * not run on the server. So `useConfigStore()` returned `{}` / `[]` during SSR,
 * this filter matched nothing, and the server shipped a homepage with ZERO
 * product sections in it — the second of the three "the server rendered a
 * different page" instances catalogued in `plans/SKELETONS.md`.
 *
 * Measured on `/en`: "Built for Professional Traders" sat at document y=828,
 * immediately under the hero, because the ~11,700px of product sections that
 * belong above it did not exist yet. They appeared at ~1.39s and pushed it out
 * of the viewport in one frame, for a layout-shift value of 0.0885 — on its own
 * enough to keep the route over Google's 0.1 threshold.
 *
 * So they now arrive the way `plans/SKELETONS.md` says anything that decides a
 * BOX must: as props through the server render, from the same `getSettings()`
 * the locale layout already calls (`initialSettings` / `initialExtensions`
 * below). The store is still preferred once it has content, so nothing changes
 * for a client that has them — but the server can now answer the question too,
 * and an operator's real install predicts exactly, in the endpoint's own push
 * order, rather than "six, probably".
 *
 * ORDER MATTERS AS MUCH AS COUNT. The rows below are in the order
 * `index.get.ts` pushes them, so `flip` alternates the illustration onto the
 * same side in both states and no section slides across the page on arrival.
 *
 * `ico` IS DELIBERATELY ABSENT. It is the only feature with a second gate the
 * client cannot see — the endpoint emits it `if (activeOfferings > 0)`, so
 * having the extension installed is not evidence that a section is coming. It
 * is reserved only once the payload asks for it, which costs one section of
 * settle on an install that has a live round and costs nothing on the ones that
 * do not.
 *
 * `icon` and `link` are mirrored from the endpoint because they are the two
 * pieces of a section that must be REAL while pending: the eyebrow glyph is
 * chrome, and a CTA is a control — a button whose href appears a second late is
 * a button that swallows the click that was aimed at it.
 */
const PENDING_SECTIONS: Array<{
  id: string;
  /** Canonical `extension.name`, as seeded — `copy_trading`, not `copyTrading`. */
  extension?: string;
  /** …or the settings key, for the two products that ship in core. */
  setting?: string;
  icon: string;
  link: string;
}> = [
  { id: "spot", setting: "spotWallets", icon: "TrendingUp", link: "/trade" },
  { id: "binary", setting: "binaryStatus", icon: "Target", link: "/binary" },
  { id: "futures", extension: "futures", icon: "Rocket", link: "/futures" },
  { id: "forexTrading", extension: "forex_trading", icon: "CandlestickChart", link: "/forex-trading/trade" },
  { id: "ecosystem", extension: "ecosystem", icon: "Layers", link: "/ecosystem" },
  { id: "staking", extension: "staking", icon: "Percent", link: "/staking" },
  { id: "ai", extension: "ai_investment", icon: "Brain", link: "/ai/investment" },
  { id: "forex", extension: "forex", icon: "Landmark", link: "/forex" },
  { id: "copyTrading", extension: "copy_trading", icon: "Copy", link: "/copy-trading" },
  { id: "tradingBot", extension: "trading_bot", icon: "Cpu", link: "/trading-bot" },
  { id: "hummingbot", extension: "hummingbot", icon: "Network", link: "/hb" },
  { id: "p2p", extension: "p2p", icon: "ArrowLeftRight", link: "/p2p" },
  { id: "nft", extension: "nft", icon: "Gem", link: "/nft" },
  { id: "ecommerce", extension: "ecommerce", icon: "ShoppingBag", link: "/ecommerce" },
  { id: "gateway", extension: "gateway", icon: "CreditCard", link: "/gateway" },
  { id: "affiliate", extension: "mlm", icon: "Gift", link: "/affiliate" },
];

/**
 * Two pending stats, because every section ships exactly two.
 *
 * Shared by every pending section rather than rebuilt per row: `StatGrid`
 * renders `Loadable` over these, so the strings are never read — only the
 * LENGTH of the array is, and that is what reserves the 40px pair.
 */
const PENDING_STATS: LandingFeature["stats"] = [
  { label: "", value: "", icon: "" },
  { label: "", value: "", icon: "" },
];

// ============================================================================
// USER PORTFOLIO
// ============================================================================

function UserPortfolioSummary() {
  const t = useTranslations("common");
  const { user } = useUserStore();
  const { totalBalance, totalChange, totalChangePercent, fetchStats, hasFetchedStats } =
    useWalletStore();
  const [showBalance, setShowBalance] = useState(true);

  useEffect(() => {
    if (user) fetchStats();
  }, [user, fetchStats]);

  /**
   * `hasFetchedStats`, not `isLoadingStats`.
   *
   * The store initialises every figure to `0` and only flips `isLoadingStats`
   * true once the request is in flight — so between mount and that effect the
   * panel is "not loading" with a balance of zero, and it told a funded
   * customer their portfolio was $0.00 at +0.00%. `hasFetchedStats` is the only
   * flag that separates "the answer is zero" from "there is no answer yet", and
   * it is set exactly once, on a successful read.
   */
  const statsUnresolved = !hasFetchedStats;

  const formatBalance = (amount: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2,
    }).format(amount);

  const formatChange = (amount: number) =>
    (amount >= 0 ? '+' : '') + formatBalance(amount);

  const isUp = totalChangePercent >= 0;

  return (
    <Panel className="p-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-foreground">
            {t("welcome_back")} {user?.firstName || 'Trader'}!
          </h3>
          <p className="text-sm text-muted-foreground">{t("your_portfolio_overview")}</p>
        </div>
        <button
          type="button"
          onClick={() => setShowBalance(!showBalance)}
          aria-label={showBalance ? "Hide balance" : "Show balance"}
          className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-surface-3 hover:text-foreground"
        >
          {showBalance ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
        </button>
      </div>

      <div className="mb-4 rounded-lg border border-border bg-surface-2 p-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs uppercase tracking-wide text-subtle-foreground">{t("total_balance")}</span>
          {/* The arrow renders in both states so the chip keeps its width; only
              its DIRECTION waits. A pending delta has no direction, so the tint
              is the neutral ramp step until one is known (R5). */}
          <div
            className={cn(
              "flex items-center gap-1 rounded px-2 py-0.5 font-mono text-xs font-semibold tabular-nums",
              statsUnresolved
                ? "bg-surface-3 text-muted-foreground"
                : isUp
                  ? "bg-up/10 text-up-ink"
                  : "bg-down/10 text-down-ink"
            )}
          >
            {isUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            <Loadable loading={statsUnresolved} placeholder="+0.00%">
              {isUp ? '+' : ''}{totalChangePercent.toFixed(2)}%
            </Loadable>
          </div>
        </div>
        <div className="mb-1 font-mono text-2xl font-semibold leading-tight tracking-tight tabular-nums text-foreground">
          <Loadable loading={statsUnresolved && showBalance} placeholder="$00,000.00">
            {showBalance ? formatBalance(totalBalance) : '••••••'}
          </Loadable>
        </div>
        <div
          className={cn(
            "font-mono text-sm tabular-nums",
            statsUnresolved ? "text-muted-foreground" : isUp ? "text-up" : "text-down"
          )}
        >
          <Loadable loading={statsUnresolved && showBalance} placeholder="24h: +$000.00">
            {showBalance ? `24h: ${formatChange(totalChange)}` : '24h: ••••••'}
          </Loadable>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/finance/wallet"
          className="flex h-11 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          {t("my_wallets")}
        </Link>
        <Link
          href="/market"
          className="flex h-11 items-center justify-center rounded-lg border border-border bg-surface-2 text-sm font-semibold text-foreground transition-colors hover:border-border-strong hover:bg-surface-3"
        >
          {t("trade_now")}
        </Link>
      </div>
    </Panel>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/** Products that earn a full section: each has a real visual to show. */
const FLAGSHIP_IDS = ["spot", "binary", "futures", "forexTrading", "ecosystem", "staking"];

/**
 * `initialContent` — the copy, resolved before the browser exists.
 * ============================================================================
 *
 * Every heading, step and feature bullet on this page comes out of `variables`
 * on the stored `home` document, via `getContent` / `effectiveContent` below.
 * That document used to be fetched from HERE, in an effect, which meant the
 * server rendered the built-in fallback strings that are typed inline into the
 * JSX and the browser replaced them a second later with the owner's.
 *
 * That is not a skeleton problem and no skeleton could have fixed it: the
 * sections were all present in both passes, they just said different things and
 * were therefore different heights. Measured on `/en`, three of them changed —
 * "Start Trading in Minutes" (565px) became "Start Your Trading Journey"
 * (585px) and "Built for Professional Traders" grew 630px -> 690px — for a
 * +80px page-height delta and CLS 0.101, over Google's threshold, in one 0.0885
 * frame at ~1.4s.
 *
 * `app/[locale]/page.tsx` now fetches the document during SSR and passes it in.
 * `null` is a real and supported value — a fresh install has no `home` row, and
 * the fetcher answers `null` for every failure too — in which case `getContent`
 * returns its inline `defaultValue` and the built-in copy renders, on the
 * server, with no client decision involved either way.
 */
export default function DefaultHomePage({
  initialContent = null,
  initialStats = null,
  initialSettings = null,
  initialExtensions = null,
}: {
  initialContent?: PageContent | null;
  /**
   * `/api/content/landing-stats` as the SERVER saw it, or `null` when it could
   * not be reached. This is the payload the sixteen product sections get their
   * catalogue copy and their headline figures from — see `featuresLoading`
   * below, which is literally `landingStats === null`, and `PENDING_SECTIONS`
   * for what an empty feature list costs the page.
   */
  initialStats?: LandingStats | null;
  /**
   * `settings` and `extensions` as the SERVER saw them, from the same
   * `getSettings()` the locale layout calls for `<Providers>`. See
   * `PENDING_SECTIONS` for why the store alone was not enough: it is filled
   * from an effect, effects do not run during SSR, and the sixteen product
   * sections this page is mostly made of are derived from these two values.
   */
  initialSettings?: Record<string, any> | null;
  initialExtensions?: string[] | null;
} = {}) {
  const t = useTranslations("common");
  const [markets, setMarkets] = useState<any[]>([]);
  const [tickers, setTickers] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);
  /* Seeded, not fetched-into. The server render and the first client render
     both read the prop, so they produce byte-identical copy and there is
     nothing to hydrate around. */
  const [pageContent, setPageContent] = useState<PageContent | null>(
    initialContent
  );
  /* Seeded from the server for the same reason `pageContent` is: with a
     non-null prop, `featuresLoading` is false on the server AND on the client's
     first render, so the real product sections are in the shipped HTML and the
     `pendingFeatures` reservation is never rendered at all on a healthy
     install. `null` still means "not fetched yet" and still starts the effect
     below. */
  const [landingStats, setLandingStats] = useState<LandingStats | null>(
    initialStats
  );

  /* The page editor's live draft, when this document is framed by it.
     `usePagePreview` returns null forever on the real site — it returns before
     installing a listener unless `window.parent !== window` — so `preview` is
     dead weight in production and everything below reads `pageContent`. */
  const preview = usePagePreview("home");
  usePreviewSectionFocus(preview?.focusSection);

  /* One object for every copy lookup on this page. The whole variables
     document travels in the preview message, not a per-section diff, so
     swapping it wholesale is what makes the frame agree with the editor
     instead of showing edited copy next to defaults. */
  const effectiveContent = useMemo<PageContent | null>(
    () =>
      preview?.variables
        ? ({ ...(pageContent ?? {}), variables: preview.variables } as PageContent)
        : pageContent,
    [pageContent, preview]
  );

  // Refs to prevent duplicate fetches
  const hasFetchedData = useRef(false);
  const hasFetchedMarkets = useRef(false);

  // Ref for ticker data to avoid frequent state updates
  const tickersRef = useRef<Record<string, any>>({});
  const tickerUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { user } = useUserStore();
  const {
    settings: storeSettings,
    extensions: storeExtensions,
    settingsFetched,
  } = useConfigStore();

  /**
   * THE STORE IF IT HAS ANYTHING, THE SERVER'S COPY OTHERWISE.
   * ==========================================================================
   *
   * `useConfigStore` is empty during SSR — `<Providers>` fills it from an
   * effect — so every value derived from it took its "nothing is installed"
   * branch on the server. On this page that is not a cosmetic default: it
   * decides how many product sections exist (`PENDING_SECTIONS`, ~11,700px of
   * them), whether the ticker band exists, and which of two differently-sized
   * things sits in the hero (`spotIsKnownOff`, a ~250px difference).
   *
   * The order of preference is what keeps this hydration-safe in both
   * directions, and neither half is optional:
   *
   *   - EMPTY STORE -> the prop. True on the server, and true again on the
   *     client's very first render, because the store is filled from an effect
   *     which by definition has not run yet. Server HTML and first client
   *     render are therefore identical.
   *   - NON-EMPTY STORE -> the store. `useConfigStore` is a `persist()` store
   *     over localStorage and rehydrates SYNCHRONOUSLY, so a returning visitor
   *     genuinely has settings in the first render and must be allowed to use
   *     them; preferring the prop there would be the mismatch, not the fix.
   *
   * Both paths are the same install's settings, read a moment apart, so the
   * commit where the store takes over is a no-op for layout.
   */
  const settings = useMemo(
    () =>
      storeSettings && Object.keys(storeSettings).length > 0
        ? storeSettings
        : (initialSettings ?? {}),
    [storeSettings, initialSettings]
  );
  const extensions = useMemo(
    () =>
      storeExtensions && storeExtensions.length > 0
        ? storeExtensions
        : (initialExtensions ?? []),
    [storeExtensions, initialExtensions]
  );

  /**
   * "We have been told what is switched on", from EITHER source.
   *
   * `settingsFetched` only ever answers for the store, and it flips in an
   * effect. Now that the server hands the same answer down as a prop, waiting
   * for the store's flag would re-introduce exactly the one-render blind spot
   * the prop was added to close — so a non-null `initialSettings` counts, and
   * counts on the server too.
   */
  const settingsKnown = settingsFetched || initialSettings !== null;

  const heroRef = useRef<HTMLDivElement>(null);
  const [isScrollReady, setIsScrollReady] = useState(false);

  // Track when the hero ref is attached and ready for scroll tracking
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      if (heroRef.current) setIsScrollReady(true);
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  const { scrollYProgress } = useScroll({
    target: isScrollReady ? heroRef : undefined,
    offset: ["start start", "end start"],
  });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  const isSpotEnabled = settings?.spotWallets === true || settings?.spotWallets === "true";
  // `isEcosystemEnabled` and the /api/ecosystem/market fetch that fed the old
  // `EcosystemVisual` are gone with it: the section renders `EcosystemArt` now,
  // so the request was a page-load round trip whose result nothing read.

  // Load page content and landing stats — only what the server did not deliver
  useEffect(() => {
    if (hasFetchedData.current) return;

    /* NOTHING LEFT TO ASK FOR is the normal path now, and it is worth an early
       return rather than a `Promise.all` over two nulls: on a healthy install
       both props arrive in the RSC payload and this effect makes no request,
       sets no state, and causes no re-render. The ref is deliberately NOT set
       here — if a later render arrives with props (it cannot today, they are
       fixed for the life of the tree) the fetch is still available. */
    if (initialContent && initialStats) return;

    hasFetchedData.current = true;

    const fetchData = async () => {
      try {
        /* NO SECOND REQUEST FOR ANYTHING THE SERVER ALREADY DELIVERED.
           Both halves arrived in the RSC payload, so re-asking for either would
           be a round trip whose only possible outcomes are "the same values
           again" (a wasted request and a wasted re-render) or "different
           values", which is the exact shift these props were added to remove.
           Each is still fetched when its prop is `null`, so an install whose
           backend was down during SSR recovers on the client rather than being
           stuck with the built-in strings and a pending feature list.

           `landingStats` used to be unconditional, on the reasoning that
           nothing it feeds changes a section's height. That was wrong and this
           file contradicted it twice over: `featuresLoading` below is exactly
           `landingStats === null`, and `PENDING_SECTIONS`' own header records
           what the empty run costs — 11,772px of settle and 88 moved nodes,
           because the sixteen product sections do not exist until this answers.
           The reservation makes that survivable; it does not make it free. With
           the server's copy in hand there is no pending run at all. */
        const [contentResponse, statsResponse] = await Promise.all([
          initialContent
            ? null
            : $fetch<PageContent>({
                url: `/api/content/default-page/home`,
                method: "GET",
                params: { pageSource: 'default' },
                silent: true
              }),
          initialStats
            ? null
            : $fetch<LandingStats>({
                url: `/api/content/landing-stats`,
                method: "GET",
                silent: true
              })
        ]);

        if (contentResponse?.data) setPageContent(contentResponse.data);
        if (statsResponse?.data) setLandingStats(statsResponse.data);
      } catch (error) {
        console.error("Error loading data:", error);
      }
    };

    fetchData();
    // Intentionally once-only: both props are fixed for the life of the tree,
    // and the `hasFetchedData` ref is the strict-mode double-invoke guard.
  }, []);

  // Market data fetching
  useEffect(() => {
    let spotUnsubscribe: (() => void) | null = null;

    /**
     * DO NOTHING UNTIL THE CONFIGURATION IS KNOWN — and that is a bug fix, not
     * a guard for tidiness.
     *
     * `settings` is `{}` on the first client render (the config store is filled
     * from `<Providers>`' props in an effect), so `isSpotEnabled` is false for
     * one pass on EVERY load — indistinguishable, to this effect, from an
     * operator who has switched spot off. It took the branch below, set
     * `isLoading` false, and nothing ever set it back: when the settings landed
     * and the effect re-ran to actually fetch the markets, the page was already
     * claiming it had finished loading them.
     *
     * The visible result was the opposite of a skeleton. The hero panel showed
     * its resolved-and-empty state — "No markets found" — for the whole second
     * the fetch was in flight, then swapped to a list of markets, and the
     * ticker band was suppressed by the same false `topAssets.length === 0` and
     * appeared out of nowhere 92px tall. Both of those were being read as
     * "there is genuinely nothing here", which is the exact failure the
     * loading/empty split exists to prevent.
     *
     * `settingsKnown` is the only value that distinguishes "spot is off" from
     * "we have not been told yet", so it gates the decision. It is satisfied by
     * the server's `initialSettings` as well as by the store's own flag, so on
     * a normal load this no longer costs a render — the markets request now
     * leaves on the first commit instead of the second.
     */
    if (!settingsKnown) return;

    if (!isSpotEnabled) {
      setIsLoading(false);
      return () => {
        hasFetchedMarkets.current = false;
      };
    }

    if (hasFetchedMarkets.current) {
      // Already fetched, but still need to ensure WebSocket is subscribed
      // This can happen after a re-mount in React Strict Mode
      tickersWs.initialize();
      let hasReceivedData = false;
      spotUnsubscribe = tickersWs.subscribeToSpotData((newTickers) => {
        tickersRef.current = newTickers;
        if (!hasReceivedData && Object.keys(newTickers).length > 0) {
          hasReceivedData = true;
          setTickers({ ...newTickers });
          return;
        }
        if (!tickerUpdateTimeoutRef.current) {
          tickerUpdateTimeoutRef.current = setTimeout(() => {
            setTickers({ ...tickersRef.current });
            tickerUpdateTimeoutRef.current = null;
          }, 3000);
        }
      });

      return () => {
        if (spotUnsubscribe) spotUnsubscribe();
        if (tickerUpdateTimeoutRef.current) {
          clearTimeout(tickerUpdateTimeoutRef.current);
          tickerUpdateTimeoutRef.current = null;
        }
      };
    }

    hasFetchedMarkets.current = true;

    const fetchMarkets = async () => {
      try {
        const res = await fetch("/api/exchange/market");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setMarkets(
          Array.isArray(data)
            ? data.map((market) => ({
                ...market,
                displaySymbol: `${market.currency}/${market.pair}`,
                symbol: `${market.currency}${market.pair}`,
              }))
            : []
        );
      } catch (e) {
        console.error("Error fetching markets:", e);
        setMarkets([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMarkets();

    try {
      tickersWs.initialize();
      let hasReceivedInitialData = false;

      spotUnsubscribe = tickersWs.subscribeToSpotData((newTickers) => {
        tickersRef.current = newTickers;

        if (!hasReceivedInitialData && Object.keys(newTickers).length > 0) {
          hasReceivedInitialData = true;
          setTickers({ ...newTickers });
          return;
        }

        // Throttle subsequent state updates to every 3 seconds to prevent excessive re-renders
        if (!tickerUpdateTimeoutRef.current) {
          tickerUpdateTimeoutRef.current = setTimeout(() => {
            setTickers({ ...tickersRef.current });
            tickerUpdateTimeoutRef.current = null;
          }, 3000);
        }
      });
    } catch (wsError) {
      console.error("WebSocket initialization error:", wsError);
    }

    return () => {
      if (spotUnsubscribe) spotUnsubscribe();
      if (tickerUpdateTimeoutRef.current) {
        clearTimeout(tickerUpdateTimeoutRef.current);
        tickerUpdateTimeoutRef.current = null;
      }
      hasFetchedMarkets.current = false;
    };
  }, [isSpotEnabled, settingsKnown]);

  const topAssets = useMemo(() => {
    if (!markets.length) return [];
    return markets
      .map((market) => {
        const tickerKey = `${market.currency}/${market.pair}`;
        const ticker = tickers[tickerKey] || {};
        return {
          name: market.currency,
          symbol: market.symbol,
          currency: market.currency,
          pair: market.pair,
          price: Number(ticker.last) || 0,
          change24h: Number(ticker.change) || 0,
          volume: Number(ticker.quoteVolume) || 0,
        };
      })
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 10);
  }, [markets, tickers]);

  const formatPrice = (price: number) => {
    if (price >= 1000) return price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (price >= 1) return price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 });
    return price.toLocaleString("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 8 });
  };

  /**
   * "Spot is switched off", as distinct from "we have not been told yet".
   * ==========================================================================
   *
   * This is a ONE-FRAME decision with an outsized cost, because the two answers
   * put different things in the top of the viewport: `PlatformArt` is a ~230px
   * illustration and the live-markets panel is a ~480px list.
   *
   * WHAT IT USED TO BE, AND WHY THE TRADE IS OVER
   *
   * The store is client-only, so on the server `settings` was `{}` and plain
   * `!isSpotEnabled` was TRUE — every server-rendered homepage shipped the
   * illustration, and every one of them then replaced it with the panel the
   * moment `<Providers>` filled the store. That swap landed in the same frame
   * as the whole below-the-fold page appearing (see `pendingFeatures`), and a
   * layout-shift frame is scored on the UNION of everything that moved in it:
   * one 250px change at the top of the viewport turned a shift nobody can see
   * into a shift that covered the screen. Measured, that single element took
   * the route's CLS from 0.0075 to 0.6376.
   *
   * Gating on "have we been told yet" fixed that, and the note here said it was
   * "the only bet available — nothing server-side reaches this component, which
   * reads `settings` from a client-only store". That is no longer true:
   * `initialSettings` reaches it, so `settingsKnown` is satisfied ON THE SERVER
   * and this is not a bet any more, it is the answer. An install with spot
   * switched off now server-renders the illustration and never shows the panel;
   * an install with it on server-renders the panel. Neither one crosses over.
   *
   * The expression is kept rather than collapsed to `!isSpotEnabled` because
   * the distinction it draws is still real whenever `initialSettings` is null —
   * a backend that was down during SSR, or any future caller that renders this
   * component without the prop.
   */
  const spotIsKnownOff = settingsKnown && !isSpotEnabled;

  /**
   * The hero panel's five rows, and its genuinely-empty state.
   *
   * `heroMarketsEmpty` is spelled as a derived const rather than inline so the
   * empty line below is gated on a name the skeleton scanner does not read as a
   * loading flag — it is not one. Loading shows five pending rows; resolved and
   * empty says so; resolved and full shows the markets.
   */
  const heroAssets = isLoading ? PENDING_HERO_ASSETS : topAssets.slice(0, 5);
  const heroMarketsEmpty = !isLoading && topAssets.length === 0;

  /**
   * The ticker band reserves its 90px whenever it is going to have one.
   *
   * The gate used to include `topAssets.length > 0`, so on every load the band
   * did not exist until `/api/exchange/market` answered and then appeared,
   * pushing sixteen product sections and everything under them down by its own
   * height. `isLoading ||` is what separates "no markets yet" from "no markets
   * at all": an install with none still collapses the band, which is right —
   * a permanent strip of grey chips is not an empty state.
   */
  const tickerEnabled = effectiveContent?.variables?.ticker?.enabled !== false;
  const showTickerBand = isSpotEnabled && tickerEnabled && (isLoading || topAssets.length > 0);

  /**
   * Is the feature list still unknown?
   *
   * `false` from the first render on a healthy install: `landingStats` is
   * seeded from `initialStats`, which `app/[locale]/page.tsx` fetches during
   * SSR. It is only ever `true` when that server fetch missed and the effect
   * above is fetching for itself — which is exactly the run `pendingFeatures`
   * below exists to reserve for.
   */
  const featuresLoading = landingStats === null;

  /**
   * The same sixteen sections, one render earlier — see `PENDING_SECTIONS`.
   *
   * Built from `settings`/`extensions`, which the server layout hands to
   * `<Providers>` as props, so this is populated on the client's first commit
   * and does not wait on any request the browser makes.
   */
  const pendingFeatures = useMemo<LandingFeature[]>(() => {
    const installed = new Set(extensions ?? []);
    return PENDING_SECTIONS.filter((section) =>
      section.setting
        ? settings?.[section.setting] === true || settings?.[section.setting] === "true"
        : installed.has(section.extension as string)
    ).map((section) => ({
      id: section.id,
      /* Title and description are the endpoint's catalogue copy and are the
         two values this state genuinely does not know. They travel as empty
         strings and every render site puts them behind `<Loadable>`; nothing
         reads them raw. */
      title: "",
      description: "",
      icon: section.icon,
      stats: PENDING_STATS,
      link: section.link,
    }));
  }, [extensions, settings]);

  // Filter and sort extension sections based on admin configuration
  const dynamicFeatures = useMemo(() => {
    /*
      `?? pendingFeatures`, NOT `|| []`.
      A payload that legitimately carries zero features — every extension
      uninstalled and spot switched off — still resolves to its own empty run,
      because `?? ` only falls through on the null the initial state carries.
      Loading and empty stay different states.
     */
    const features = landingStats?.features ?? pendingFeatures;
    const extensionConfig = effectiveContent?.variables?.extensionSections || {};

    /* `extensionSections` lives on the home document, which the server now
       fetches alongside the stats — so on the normal path both halves are in
       hand at the same instant and the filter is applied to the real list on
       the first render. It is only `{}` while pending on the recovery path
       (server fetch missed, effect running), and there the pending run is
       unfiltered: on an install where the owner has disabled or reordered
       sections in the page editor, that difference is the one settle that run
       still has — bounded by how many they turned off, not by the whole
       list. */
    return features
      .filter((feature) => extensionConfig[feature.id]?.enabled !== false)
      .sort((a, b) => {
        const orderA = extensionConfig[a.id]?.order ?? 999;
        const orderB = extensionConfig[b.id]?.order ?? 999;
        return orderA - orderB;
      });
  }, [landingStats?.features, pendingFeatures, effectiveContent?.variables?.extensionSections]);

  const flagshipFeatures = useMemo(
    () => dynamicFeatures.filter((f) => FLAGSHIP_IDS.includes(f.id)),
    [dynamicFeatures]
  );
  const moduleFeatures = useMemo(
    () => dynamicFeatures.filter((f) => !FLAGSHIP_IDS.includes(f.id)),
    [dynamicFeatures]
  );

  /**
   * Headline, accent run and button label for the six core products. Same shape
   * as `MODULE_COPY`, but it lives in the component because most of these
   * strings come out of the translation catalogue. `eyebrow` is optional and
   * falls back to the title the backend sends.
   */
  const FLAGSHIP_COPY: Record<
    string,
    { eyebrow?: string; headline: string; highlight: string; cta: string }
  > = {
    spot: {
      eyebrow: t("spot_trading"),
      headline: t("trade_with"),
      highlight: "precision",
      cta: t("start_trading"),
    },
    binary: {
      eyebrow: t("binary_options"),
      headline: "Predict &",
      highlight: "profit",
      cta: t("start_predicting"),
    },
    futures: {
      eyebrow: t("futures_trading"),
      headline: t("amplify_your"),
      highlight: "trades",
      cta: t("trade_futures"),
    },
    forexTrading: {
      headline: "One account,",
      highlight: "every market",
      cta: t("start_trading"),
    },
    ecosystem: {
      headline: "Your chain,",
      highlight: "your market",
      cta: t("start_trading"),
    },
    staking: {
      headline: "Put idle balances",
      highlight: "to work",
      cta: t("learn_more"),
    },
  };

  /**
   * Give each flagship its visual.
   *
   * All six render their illustration now. They used to render hand-built HTML
   * mock panels instead — a fake order ticket for binary, a leverage slider for
   * futures, a four-tile instrument grid for multi-asset — which is why half the
   * page had the drawn scenes and half had something that looked like a
   * different design entirely. The two that carried genuinely live data (the
   * spot market list, the ecosystem token list) duplicated the hero panel and
   * the ticker strip directly above them, so nothing unique goes with them.
   *
   * `flip` alternates the layout so consecutive sections don't read as one long
   * column — the only thing that varies between them, which is the point.
   */
  const renderFlagship = (feature: LandingFeature, index: number) => {
    const Art = MODULE_ART[feature.id];
    const copy = FLAGSHIP_COPY[feature.id];
    if (!copy) return null;

    return (
      <FeatureSection
        key={feature.id}
        feature={feature}
        flip={index % 2 === 1}
        loading={featuresLoading}
        /* Three of the six flagships (forexTrading, ecosystem, staking) have no
           translated eyebrow and fall back to the endpoint's title, so those
           three — and only those three — reserve a chip instead of filling one.
           `Eyebrow` is a fixed-height pill, so the settle is horizontal. */
        eyebrow={
          copy.eyebrow ?? (
            <Loadable loading={featuresLoading} placeholder="Native Tokens">
              {feature.title}
            </Loadable>
          )
        }
        headline={copy.headline}
        highlight={copy.highlight}
        cta={copy.cta}
        visual={Art ? <Art /> : undefined}
      />
    );
  };

  /**
   * Every other registered module, one section each, illustrated.
   *
   * `flip` continues the flagship run's alternation rather than restarting at
   * zero, so the picture keeps swapping sides across the seam between the two
   * groups instead of landing twice on the same side.
   */
  const renderModule = (feature: LandingFeature, index: number) => {
    const Art = MODULE_ART[feature.id];
    const copy = MODULE_COPY[feature.id];

    return (
      <FeatureSection
        key={feature.id}
        feature={feature}
        flip={(flagshipFeatures.length + index) % 2 === 1}
        loading={featuresLoading}
        eyebrow={
          <Loadable loading={featuresLoading} placeholder="NFT Marketplace">
            {feature.title}
          </Loadable>
        }
        /* `MODULE_COPY` covers every id `PENDING_SECTIONS` can produce, so the
           headline and the button label are REAL in both states — they are
           editorial copy that lives in this file, not payload. Only a module
           registered later, which the pending run cannot predict either, falls
           back to its own title. */
        headline={copy?.headline ?? feature.title}
        highlight={copy?.highlight}
        cta={copy?.cta ?? t("learn_more")}
        visual={Art ? <Art /> : undefined}
      />
    );
  };

  return (
    <div className="relative min-h-screen w-full">
      <PageBackground />
      <NoiseOverlay />

      {/* Hero */}
      <section
        ref={heroRef}
        {...previewSectionProps("hero")}
        className="relative flex min-h-[92vh] items-center pt-20"
      >
        <m.div
          style={{ y: heroY, opacity: heroOpacity }}
          className="container relative z-10 mx-auto px-4 md:px-6"
        >
          {/* The hero is always split now. It used to centre itself with
              nothing beside it whenever spot was switched off and nobody was
              signed in — which is exactly the configuration an operator selling
              only addons ships, and it left the most-seen screen on the site
              with no picture on it. `PlatformArt` fills that slot. */}
          <div className="flex flex-col gap-12 lg:flex-row lg:items-center lg:gap-16">
            {/* Hero copy */}
            <div className="max-w-3xl flex-1 lg:max-w-2xl">
              <m.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                <Eyebrow icon={Sparkles}>
                  {getContent(effectiveContent, "hero.badge", "#1 Crypto Trading Platform")}
                </Eyebrow>
              </m.div>

              <m.h1
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="mb-6 mt-8 text-balance text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl md:text-6xl lg:text-7xl"
              >
                <span className="block">{getContent(effectiveContent, "hero.title", "Trade Crypto")}</span>
                <span className="block text-primary">
                  {getContent(effectiveContent, "hero.subtitle", "like a pro")}
                </span>
              </m.h1>

              <m.p
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="mb-10 max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl"
              >
                {getContent(
                  effectiveContent,
                  "hero.description",
                  "Experience lightning-fast execution, institutional-grade security, and advanced trading tools designed for the modern trader."
                )}
              </m.p>

              <m.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="mb-12 flex flex-col gap-3 sm:flex-row"
              >
                <PrimaryCta href={user ? "/market" : "/register"}>
                  {user ? t("start_trading") : getContent(effectiveContent, "hero.cta", "Start Trading Free")}
                </PrimaryCta>

                {isSpotEnabled && (
                  <SecondaryCta href="/market">
                    <BarChart3 className="h-4 w-4" />
                    {t("explore_markets")}
                  </SecondaryCta>
                )}
              </m.div>

              <m.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="flex flex-wrap gap-x-6 gap-y-3"
              >
                {(effectiveContent?.variables?.hero?.features || ["Bank-Grade Security", "24/7 Trading", "Instant Deposits"]).map(
                  (feature: string, i: number) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle className="h-4 w-4 text-primary" />
                      {feature}
                    </div>
                  )
                )}
              </m.div>
            </div>

            {/* Hero panel — live data when there is any, the platform scene
                when there is not. Real prices beat an illustration, so the
                illustration is the fallback and not the default — and
                `spotIsKnownOff` is what makes that sentence true of the
                PENDING state too, not just the settled one. */}
            <m.div
              initial={{ opacity: 0, x: 32 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.3 }}
              className="w-full shrink-0 lg:w-[460px]"
            >
              {user ? (
                <UserPortfolioSummary />
              ) : spotIsKnownOff ? (
                <PlatformArt />
              ) : (
                  <Panel className="p-5">
                    <div className="mb-5 flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-foreground">{t("live_markets")}</h3>
                        <p className="text-xs text-muted-foreground">{t("top_performing_assets")}</p>
                      </div>
                      <LivePill label="Live" />
                    </div>

                    <div className="space-y-1">
                      {heroAssets.map((asset) => (
                            <Link
                              key={asset.symbol}
                              /* `/market` while pending: the row is a control,
                                 and a control that is not yet clickable-to-the-
                                 right-place should still be clickable to a
                                 place. `buildMarketLink` needs a currency and a
                                 pair, neither of which exists yet. */
                              href={
                                isLoading
                                  ? "/market"
                                  : buildMarketLink(settings, asset.currency, asset.pair)
                              }
                              className="group flex items-center justify-between rounded-lg p-3 transition-colors hover:bg-surface-3"
                            >
                              <div className="flex items-center gap-3">
                                <div className="h-9 w-9 overflow-hidden rounded-full bg-surface-3">
                                  <img
                                    src={getCryptoImageUrl(asset.currency || "generic")}
                                    alt={asset.currency || "crypto"}
                                    width={36}
                                    height={36}
                                    loading="lazy"
                                    className="h-full w-full object-cover"
                                    onError={(e) => {
                                      const target = e.currentTarget;
                                      if (!target.dataset.fallbackAttempted) {
                                        target.dataset.fallbackAttempted = 'true';
                                        target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIyNCIgY3k9IjI0IiByPSIyNCIgZmlsbD0iIzMzMyIvPjwvc3ZnPg==';
                                      }
                                    }}
                                  />
                                </div>
                                <div>
                                  <div className="text-sm font-bold text-foreground transition-colors group-hover:text-primary">
                                    <Loadable loading={isLoading} placeholder="BTC">
                                      {asset.name}
                                    </Loadable>
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    <Loadable loading={isLoading} placeholder="BTCUSDT">
                                      {asset.symbol}
                                    </Loadable>
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-mono text-sm font-bold tabular-nums text-foreground">
                                  <Loadable loading={isLoading} placeholder="00,000.00">
                                    {formatPrice(asset.price)}
                                  </Loadable>
                                </div>
                                <div
                                  className={cn(
                                    "flex items-center justify-end gap-0.5 font-mono text-xs font-semibold tabular-nums",
                                    /* Neutral until there IS a direction — see the
                                       ticker chip above for why `>= 0` is not a
                                       safe default on a pending value. */
                                    isLoading
                                      ? "text-muted-foreground"
                                      : asset.change24h >= 0
                                        ? "text-up"
                                        : "text-down"
                                  )}
                                >
                                  {asset.change24h >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                                  <Loadable loading={isLoading} placeholder="+0.00%">
                                    {asset.change24h >= 0 ? "+" : ""}{asset.change24h.toFixed(2)}%
                                  </Loadable>
                                </div>
                              </div>
                            </Link>
                          ))}
                      {/* Resolved AND empty — a distinct state from pending, and
                          it has to say so rather than sit on five grey rows
                          forever. One line, so the panel keeps its shape. */}
                      {heroMarketsEmpty && (
                        <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                          {t("no_markets_found")}
                        </p>
                      )}
                    </div>

                    <Link
                      href="/market"
                      className="mt-4 flex items-center justify-center gap-2 rounded-lg border border-border bg-surface-2 py-3 text-sm font-semibold text-foreground transition-colors hover:border-primary/40 hover:text-primary"
                    >
                      {t("view_all_markets")}
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </Panel>
              )}
            </m.div>
          </div>
        </m.div>
      </section>

      {/* Live ticker. The band is reserved while the markets are in flight —
          see `showTickerBand`; it used to appear only once they landed, and
          took the whole page down with it when it did. */}
      {showTickerBand && (
        <div {...previewSectionProps("ticker")} className="relative border-y border-border bg-card/50">
          <PremiumTicker assets={topAssets} loading={isLoading} />
        </div>
      )}

      {/* Flagship product sections, then every other module a section each.
          The two runs share one marker because the editor edits them as one
          rail entry (`extensionSections` orders and disables across both), and
          `usePreviewSectionFocus` resolves by `querySelector` — so the id has
          to appear exactly once. The wrapper carries no styles: these are
          block-level <section>s in normal flow either way.

          No "Platform modules" divider ahead of the second run: a heading
          announcing that what follows is a list of modules tells the visitor
          nothing the modules do not already say, and it had to be a `pb-0`
          section to sit close to the first one — which put its own bottom
          hairline immediately under the subtitle and boxed the whole thing in.
          The sections are already separated by the same hairline as the
          flagship run above. */}
      <div {...previewSectionProps("extensions")}>
        {flagshipFeatures.map((feature, index) => renderFlagship(feature, index))}
        {moduleFeatures.map((feature, index) => renderModule(feature, index))}
      </div>

      {/* Why choose us.
          The marker sits on a wrapper because `Section` and `Panel` take a
          fixed prop list and forward nothing else, and neither is ours to
          change. An unstyled block wrapper around a block-level child is
          layout-inert — including as a grid item, which is what the
          "platform-features" wrapper below becomes. */}
      <div {...previewSectionProps("features")}>
        <Section bordered>
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <div>
              <Eyebrow icon={Award}>{getContent(effectiveContent, "featuresSection.badge", "Why Choose Us")}</Eyebrow>

              <h2 className="mb-5 mt-6 text-balance text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl">
                {getContent(effectiveContent, "featuresSection.title", "Built for")}{" "}
                <span className="text-primary">
                  {getContent(effectiveContent, "featuresSection.subtitle", "Professional Traders")}
                </span>
              </h2>

              <p className="mb-10 text-lg leading-relaxed text-muted-foreground">
                {getContent(
                  effectiveContent,
                  "featuresSection.description",
                  "Experience unmatched security, lightning-fast execution, and professional-grade tools designed for serious traders."
                )}
              </p>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                {(effectiveContent?.variables?.features || [
                  { icon: "Shield", title: "Account Security", description: "Two-factor authentication, verification levels and role-based admin access" },
                  { icon: "Zap", title: "Lightning Fast", description: "Ultra-low latency trading engine" },
                  { icon: "Globe", title: "Global Access", description: "Trade from anywhere in the world" },
                  { icon: "Clock", title: "24/7 Support", description: "Round-the-clock customer support" },
                ]).slice(0, 4).map((feature: any, i: number) => {
                  const Icon = iconMap[feature.icon] || Zap;
                  return (
                    <m.div
                      key={i}
                      initial={{ opacity: 0, y: 16 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: i * 0.08 }}
                      viewport={{ once: true }}
                      className="flex gap-4"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="mb-1 font-bold text-foreground">{feature.title}</h4>
                        <p className="text-sm text-muted-foreground">{feature.description}</p>
                      </div>
                    </m.div>
                  );
                })}
              </div>
            </div>

            <div {...previewSectionProps("platform-features")}>
              <Panel className="p-8">
                <h3 className="mb-6 text-xl font-bold text-foreground">
                  {getContent(effectiveContent, "globalSection.platformFeatures.title", "Platform Features")}
                </h3>
                <div className="space-y-4">
                  {(effectiveContent?.variables?.globalSection?.platformFeatures?.items || [
                    "Real-time market data and price feeds",
                    "Advanced order types (Limit, Market, Stop-Loss)",
                    "Professional TradingView charts integration",
                    "Mobile apps for iOS and Android",
                    "API access for algorithmic trading",
                    "Multi-language support",
                  ]).map((item: string, i: number) => (
                    <m.div
                      key={i}
                      initial={{ opacity: 0, x: -12 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.35, delay: i * 0.06 }}
                      viewport={{ once: true }}
                      className="flex items-center gap-3"
                    >
                      <CheckCircle className="h-4 w-4 shrink-0 text-primary" />
                      <span className="text-sm text-muted-foreground">{item}</span>
                    </m.div>
                  ))}
                </div>
              </Panel>
            </div>
          </div>
        </Section>
      </div>

      {/* Getting started — a real sequence, so the numbering means something */}
      <div {...previewSectionProps("getting-started")}>
        <Section bordered>
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <Eyebrow icon={Rocket}>{getContent(effectiveContent, "gettingStarted.badge", "Get Started")}</Eyebrow>
            <h2 className="mt-6 text-balance text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl">
              {getContent(effectiveContent, "gettingStarted.title", "Start Trading")}{" "}
              <span className="text-primary">
                {getContent(effectiveContent, "gettingStarted.subtitle", "in Minutes")}
              </span>
            </h2>
          </div>

          <div className="relative grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="absolute left-[16.66%] right-[16.66%] top-14 hidden h-px bg-border md:block" />

            {(effectiveContent?.variables?.gettingStarted?.steps || [
              { step: "01", title: "Create Account", description: "Sign up in seconds with just your email.", icon: "Users" },
              { step: "02", title: "Fund Your Wallet", description: "Deposit funds using multiple payment methods.", icon: "Wallet" },
              { step: "03", title: "Start Trading", description: "Access markets and start trading instantly.", icon: "TrendingUp" },
            ]).map((step: any, i: number) => {
              const Icon = iconMap[step.icon] || Users;
              return (
                <m.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: i * 0.12 }}
                  viewport={{ once: true }}
                  className="relative"
                >
                  <Panel className="h-full p-6 text-center">
                    <div className="relative mx-auto mb-5 inline-block">
                      <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
                        <Icon className="h-7 w-7 text-primary" />
                      </div>
                      <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-surface-3 font-mono text-[11px] font-bold tabular-nums text-muted-foreground">
                        {step.step}
                      </span>
                    </div>
                    <h3 className="mb-2 text-lg font-bold text-foreground">{step.title}</h3>
                    <p className="text-sm text-muted-foreground">{step.description}</p>
                  </Panel>
                </m.div>
              );
            })}
          </div>
        </Section>
      </div>

      {/* Mobile app — the marker rides in as a prop rather than on a wrapper
          because this band renders `null` when neither a store link nor the
          coming-soon announcement is configured, and an empty wrapper is a
          section marker pointing at nothing. */}
      {effectiveContent?.variables?.mobileApp?.enabled !== false && (
        <MobileAppSection
          {...previewSectionProps("mobile-app")}
          badge={effectiveContent?.variables?.mobileApp?.badge}
          title={effectiveContent?.variables?.mobileApp?.title}
          subtitle={effectiveContent?.variables?.mobileApp?.subtitle}
          description={effectiveContent?.variables?.mobileApp?.description}
          features={effectiveContent?.variables?.mobileApp?.features}
          /* `=== true`, not `!== false`: absent means the store buttons, which
             is what every site stored before this switch existed. */
          comingSoon={effectiveContent?.variables?.mobileApp?.comingSoon === true}
          comingSoonLabel={effectiveContent?.variables?.mobileApp?.comingSoonLabel}
        />
      )}

      {/* Closing CTA */}
      <div {...previewSectionProps("cta")}>
        <Section bordered>
          <Panel className="overflow-hidden">
            <div className="relative px-6 py-16 text-center md:px-12 lg:py-20">
              {/* One accent wash, behind the one place on the page that asks for a decision. */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-primary/5 blur-3xl"
              />

              <div className="relative mx-auto max-w-3xl">
                <Eyebrow icon={Sparkles}>{getContent(effectiveContent, "cta.badge", "Join Now")}</Eyebrow>

                <h2 className="mb-5 mt-6 text-balance text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl">
                  {user ? t("continue_trading") : getContent(effectiveContent, "cta.title", "Ready to Start Trading?")}
                </h2>

                <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-muted-foreground">
                  {user
                    ? t("explore_our_markets_description")
                    : getContent(
                        effectiveContent,
                        "cta.description",
                        "Join thousands of traders who trust our platform. Start your journey to financial freedom today."
                      )}
                </p>

                <div className="mb-10 flex justify-center">
                  <PrimaryCta href={user ? "/market" : "/register"}>
                    {user
                      ? getContent(effectiveContent, "cta.buttonUser", t("explore_markets"))
                      : getContent(effectiveContent, "cta.button", t("create_free_account"))}
                  </PrimaryCta>
                </div>

                <div className="flex flex-wrap justify-center gap-x-6 gap-y-3 text-sm">
                  {(user
                    ? effectiveContent?.variables?.cta?.featuresUser || ["Real-time Data", "Secure Trading", "24/7 Access"]
                    : effectiveContent?.variables?.cta?.features || ["No Credit Card Required", "Free Registration", "Instant Access"]
                  ).map((feature: string, i: number) => (
                    <div key={i} className="flex items-center gap-2 text-muted-foreground">
                      <CheckCircle className="h-4 w-4 text-primary" />
                      {feature}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Panel>
        </Section>
      </div>
    </div>
  );
}
