"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
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
  Play,
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
import Image from "next/image";
import { motion, useScroll, useTransform, useInView, useSpring, MotionValue, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
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
import InteractivePattern, { FloatingShapes } from "@/components/sections/shared/InteractivePattern";

// Icon mapping
const iconMap: Record<string, any> = {
  Zap, Shield, BarChart3, Users, Target, DollarSign, Award, Globe, LineChart,
  Lock, TrendingUp, Wallet, Clock, Star, Layers, Activity, PieChart, CheckCircle,
  Rocket, Copy, Gift, Image: ImageIcon, ShoppingBag, Brain, Percent, ArrowLeftRight,
  Flame, Package, ShoppingCart, Folder, Tag, Database, LayoutGrid, Coins, Sparkles,
  Crosshair, Cpu, Network, Gem, Trophy, Banknote, CircleDollarSign, Landmark, Timer,
  CandlestickChart, Boxes, Hexagon, Orbit, BadgePercent, HandCoins, UserCheck, Store,
  Gavel, TrendingDown, Scale,
};

// Type definitions
interface PageContent {
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

interface LandingStats {
  platform: {
    users: number;
    activeUsers: number;
    verified: number;
  };
  extensions: Record<string, any>;
  features: Array<{
    id: string;
    title: string;
    description: string;
    icon: string;
    gradient: string;
    stats: Array<{ label: string; value: string; icon: string }>;
    link: string;
    data?: Record<string, any>;
  }>;
  settings: {
    spotEnabled: boolean;
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

// Animated noise texture overlay
function NoiseOverlay() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-50 opacity-[0.015]"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
      }}
    />
  );
}

// Mesh gradient background - continuous across sections
function MeshBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-background" />

      <motion.div
        animate={{
          scale: [1, 1.1, 1],
          x: [0, 30, 0],
          y: [0, -20, 0],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 rounded-full opacity-30 blur-[120px]"
        style={{ background: "radial-gradient(circle, rgba(59, 130, 246, 0.5) 0%, transparent 70%)" }}
      />

      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          x: [0, -40, 0],
          y: [0, 30, 0],
        }}
        transition={{ duration: 25, repeat: Infinity, ease: "easeInOut", delay: 5 }}
        className="absolute top-1/4 -right-1/4 w-1/2 h-1/2 rounded-full opacity-30 blur-[120px]"
        style={{ background: "radial-gradient(circle, rgba(139, 92, 246, 0.5) 0%, transparent 70%)" }}
      />

      <motion.div
        animate={{
          scale: [1, 1.15, 1],
          x: [0, 20, 0],
          y: [0, -40, 0],
        }}
        transition={{ duration: 30, repeat: Infinity, ease: "easeInOut", delay: 10 }}
        className="absolute top-1/2 left-1/3 w-1/3 h-1/3 rounded-full opacity-25 blur-[100px]"
        style={{ background: "radial-gradient(circle, rgba(6, 182, 212, 0.5) 0%, transparent 70%)" }}
      />

      <motion.div
        animate={{
          scale: [1, 1.1, 1],
          x: [0, -30, 0],
          y: [0, 20, 0],
        }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut", delay: 7 }}
        className="absolute bottom-1/4 left-1/4 w-1/3 h-1/3 rounded-full opacity-20 blur-[100px]"
        style={{ background: "radial-gradient(circle, rgba(236, 72, 153, 0.4) 0%, transparent 70%)" }}
      />

      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />

      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,hsl(var(--background))_80%)]" />
    </div>
  );
}

// Premium glass card with scroll reveal
function GlassCard({ children, className, delay = 0, hover = true }: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  hover?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      viewport={{ once: true, margin: "-100px" }}
      whileHover={hover ? { y: -8, transition: { duration: 0.3 } } : undefined}
      className={cn(
        "relative group",
        "rounded-3xl p-[1px]",
        "bg-gradient-to-b from-black/10 to-black/5 dark:from-white/20 dark:to-white/5",
        "shadow-xl shadow-black/5 dark:shadow-black/20",
        className
      )}
    >
      <div className="absolute inset-0 rounded-3xl bg-gradient-to-b from-black/5 dark:from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="relative rounded-3xl bg-white/90 dark:bg-background/80 backdrop-blur-xl h-full border border-black/5 dark:border-white/10">
        {children}
      </div>
    </motion.div>
  );
}

// Custom hook for section scroll animations
function useSectionScroll(ref: React.RefObject<HTMLElement | null>) {
  const [scrollState, setScrollState] = useState({ opacity: 0, y: 80, scale: 0.9 });

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const handleScroll = () => {
      const rect = element.getBoundingClientRect();
      const windowHeight = window.innerHeight;

      // Calculate how far the element is through the viewport
      // 0 = element top is at bottom of viewport
      // 1 = element bottom is at top of viewport
      const elementHeight = rect.height;
      const totalScrollDistance = windowHeight + elementHeight;
      const scrolled = windowHeight - rect.top;
      const progress = Math.max(0, Math.min(1, scrolled / totalScrollDistance));

      // Map progress to animation values
      // 0-0.15: fade in, 0.15-0.85: visible, 0.85-1: fade out
      let opacity, y, scale;

      if (progress < 0.15) {
        // Entering
        const t = progress / 0.15;
        opacity = t;
        y = 80 * (1 - t);
        scale = 0.9 + 0.1 * t;
      } else if (progress > 0.85) {
        // Exiting
        const t = (progress - 0.85) / 0.15;
        opacity = 1 - t;
        y = -80 * t;
        scale = 1 - 0.1 * t;
      } else {
        // Fully visible
        opacity = 1;
        y = 0;
        scale = 1;
      }

      setScrollState({ opacity, y, scale });
    };

    handleScroll(); // Initial calculation
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, [ref]);

  return scrollState;
}

// Section wrapper with scroll animations
function Section({ children, className, id }: { children: React.ReactNode; className?: string; id?: string }) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const { opacity, y, scale } = useSectionScroll(sectionRef);

  return (
    <section ref={sectionRef} id={id} className={cn("relative py-24 lg:py-32 overflow-hidden", className)}>
      <motion.div
        animate={{ opacity, y, scale }}
        transition={{ duration: 0.1, ease: "linear" }}
        className="will-change-transform"
      >
        {children}
      </motion.div>
    </section>
  );
}

// Premium ticker
function PremiumTicker({ assets }: { assets: any[] }) {
  if (!assets.length) return null;
  const tickerAssets = [...assets, ...assets, ...assets];

  return (
    <div className="relative overflow-hidden py-6">
      <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-background to-transparent z-10" />
      <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-background to-transparent z-10" />

      <motion.div
        animate={{ x: ["0%", "-33.33%"] }}
        transition={{ duration: 50, ease: "linear", repeat: Infinity }}
        className="flex gap-6"
      >
        {tickerAssets.map((asset, index) => (
          <div
            key={`${asset.symbol}-${index}`}
            className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 shrink-0"
          >
            <div className="w-8 h-8 rounded-full overflow-hidden bg-zinc-800 ring-2 ring-white/10">
              <Image
                src={getCryptoImageUrl(asset.currency || asset.name || "generic")}
                alt={asset.name || "crypto"}
                width={32}
                height={32}
                className="w-full h-full object-cover"
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
              <span className="font-semibold text-sm">{asset.name || asset.currency}</span>
              <span className="font-mono text-xs text-muted-foreground">
                ${asset.price?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0.00"}
              </span>
            </div>
            <span className={cn(
              "text-xs font-semibold px-2.5 py-1 rounded-full ml-2",
              asset.change24h >= 0
                ? "text-emerald-400 bg-emerald-500/15"
                : "text-red-400 bg-red-500/15"
            )}>
              {asset.change24h >= 0 ? "+" : ""}{asset.change24h?.toFixed(2) || "0.00"}%
            </span>
          </div>
        ))}
      </motion.div>
    </div>
  );
}

// Live Markets Grid for Spot/Ecosystem sections
function LiveMarketsGrid({ assets, gradient, linkBase, settings, isEco = false }: {
  assets: any[];
  gradient: string;
  linkBase: string;
  settings: any;
  isEco?: boolean;
}) {
  const formatPrice = (price: number) => {
    if (price >= 1000) return price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (price >= 1) return price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 });
    return price.toLocaleString("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 8 });
  };

  if (!assets || assets.length === 0) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="p-4 rounded-2xl bg-white/5 animate-pulse">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-white/10" />
              <div className="space-y-2">
                <div className="h-4 w-14 bg-white/10 rounded" />
                <div className="h-3 w-10 bg-white/10 rounded" />
              </div>
            </div>
            <div className="h-5 w-20 bg-white/10 rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {assets.slice(0, 4).map((asset, index) => (
        <Link
          key={asset.symbol || index}
          href={isEco
            ? `/ecosystem/${asset.currency}/${asset.pair}`
            : buildMarketLink(settings, asset.currency, asset.pair)
          }
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            viewport={{ once: true }}
            whileHover={{ scale: 1.02, backgroundColor: "rgba(255,255,255,0.08)" }}
            className="p-4 rounded-2xl bg-white/5 cursor-pointer transition-colors group"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-zinc-800 ring-2 ring-white/10 group-hover:ring-blue-500/50 transition-all">
                <img
                  src={getCryptoImageUrl(asset.currency || asset.name || "generic")}
                  alt={asset.currency || "crypto"}
                  width={40}
                  height={40}
                  loading="lazy"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (!target.dataset.fallbackAttempted) {
                      target.dataset.fallbackAttempted = 'true';
                      target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIyMCIgZmlsbD0iIzMzMyIvPjwvc3ZnPg==';
                    }
                  }}
                />
              </div>
              <div>
                <div className="font-bold text-sm group-hover:text-blue-400 transition-colors">
                  {asset.currency || asset.name}
                </div>
                <div className="text-xs text-muted-foreground">
                  {asset.pair ? `/${asset.pair}` : ''}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold">${formatPrice(asset.price || 0)}</span>
              <span className={cn(
                "text-xs font-semibold px-2 py-0.5 rounded-full",
                (asset.change24h || 0) >= 0
                  ? "text-emerald-400 bg-emerald-500/15"
                  : "text-red-400 bg-red-500/15"
              )}>
                {(asset.change24h || 0) >= 0 ? "+" : ""}{(asset.change24h || 0).toFixed(2)}%
              </span>
            </div>
          </motion.div>
        </Link>
      ))}
    </div>
  );
}

// Format helpers
function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toLocaleString();
}

function formatValue(value: number): string {
  if (value >= 1000000000) return `$${(value / 1000000000).toFixed(2)}B`;
  if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(2)}K`;
  return `$${value.toFixed(2)}`;
}

// ===== UNIQUE EXTENSION SECTIONS WITH REAL DATA =====

// Spot Trading Section
function SpotTradingSection({ feature, topAssets, settings }: { feature: any; topAssets: any[]; settings: any }) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const { opacity, y, scale } = useSectionScroll(sectionRef);

  const hasItems = topAssets && topAssets.length > 0;

  return (
    <section ref={sectionRef} className="relative py-32 overflow-hidden">
      {/* Floating shapes background */}
      <FloatingShapes theme={{ primary: "blue", secondary: "cyan" }} count={8} />

      <motion.div
        animate={{ opacity, y, scale }}
        transition={{ duration: 0.1, ease: "linear" }}
        className="container mx-auto px-4 md:px-6 relative z-10 will-change-transform"
      >
        <div className={cn(
          "grid gap-16 items-center",
          hasItems ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1 max-w-3xl mx-auto text-center"
        )}>
          {/* Content */}
          <motion.div
            initial={{ opacity: 0, x: hasItems ? -50 : 0 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            viewport={{ once: true }}
          >
            {/* Feature icon for no-items view */}
            {!hasItems && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5 }}
                viewport={{ once: true }}
                className="w-24 h-24 mx-auto mb-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center"
              >
                <CandlestickChart className="w-12 h-12 text-white" />
              </motion.div>
            )}

            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-blue-500/30 text-blue-400 mb-6",
                !hasItems && "mx-auto"
              )}
            >
              <CandlestickChart className="w-4 h-4" />
              Spot Trading
            </motion.span>

            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              Trade with{" "}
              <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
                precision
              </span>
            </h2>

            <p className={cn(
              "text-xl text-muted-foreground mb-8 leading-relaxed",
              !hasItems && "max-w-xl mx-auto"
            )}>
              Execute trades instantly with our advanced spot trading engine. Real-time charts, deep liquidity, and professional tools.
            </p>

            {/* Stats from API */}
            <div className={cn(
              "grid grid-cols-2 gap-6 mb-8",
              !hasItems && "max-w-md mx-auto"
            )}>
              {feature.stats?.map((stat: any, i: number) => {
                const StatIcon = iconMap[stat.icon] || Activity;
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    viewport={{ once: true }}
                    className={cn(
                      "flex items-center gap-4",
                      !hasItems && "justify-center"
                    )}
                  >
                    <motion.div
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 0.5 }}
                      className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center"
                    >
                      <StatIcon className="w-6 h-6 text-white" />
                    </motion.div>
                    <div className={!hasItems ? "text-left" : ""}>
                      <div className="text-2xl font-bold">{stat.value}</div>
                      <div className="text-sm text-muted-foreground">{stat.label}</div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <Link href="/trade">
              <motion.button
                whileHover={{ scale: 1.02, x: 5 }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex items-center gap-3 h-14 px-8 rounded-2xl font-semibold text-white bg-gradient-to-r from-blue-600 to-cyan-600 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-shadow"
              >
                Start Trading
                <ArrowRight className="w-5 h-5" />
              </motion.button>
            </Link>
          </motion.div>

          {/* Trading Card Visual - Only show when has items */}
          {hasItems && (
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
              viewport={{ once: true }}
            >
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/30 to-cyan-500/30 rounded-3xl blur-3xl" />
                <GlassCard hover={false}>
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                          <TrendingUp className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <div className="font-bold">Live Spot Markets</div>
                          <div className="text-sm text-muted-foreground">Real-time prices</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                        </span>
                        <span className="text-xs text-emerald-400 font-semibold">Live</span>
                      </div>
                    </div>

                    <LiveMarketsGrid
                      assets={topAssets}
                      gradient={feature.gradient}
                      linkBase="/trade"
                      settings={settings}
                    />

                    <Link href="/market" className="block mt-4">
                      <motion.div
                        whileHover={{ x: 5 }}
                        className="flex items-center justify-center gap-2 text-sm text-blue-400 hover:text-blue-300 font-semibold py-3 rounded-xl bg-blue-500/10 hover:bg-blue-500/15 transition-colors"
                      >
                        View all markets
                        <ChevronRight className="w-4 h-4" />
                      </motion.div>
                    </Link>
                  </div>
                </GlassCard>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </section>
  );
}

// Binary Options Section with real data
function BinaryOptionsSection({ feature }: { feature: any }) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const { opacity, y, scale } = useSectionScroll(sectionRef);

  return (
    <section ref={sectionRef} className="relative py-32 overflow-hidden">
      {/* Floating shapes */}
      <FloatingShapes theme={{ primary: "purple", secondary: "pink" }} count={8} />

      <motion.div animate={{ opacity, y, scale }} transition={{ duration: 0.1, ease: "linear" }} className="container mx-auto px-4 md:px-6 relative z-10 will-change-transform">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Visual - Prediction UI */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="order-2 lg:order-1"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/30 to-pink-500/30 rounded-3xl blur-3xl" />
              <GlassCard hover={false}>
                <div className="p-8">
                  <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/20 text-purple-400 mb-4">
                      <Timer className="w-4 h-4" />
                      <span className="font-mono font-bold">Select Duration</span>
                    </div>
                    <h4 className="text-2xl font-bold mb-2">Predict Market Movement</h4>
                    <div className="text-sm text-muted-foreground">Will the price go UP or DOWN?</div>
                  </div>

                  <div className="flex gap-4">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="flex-1 py-6 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 font-bold text-xl flex items-center justify-center gap-2"
                    >
                      <ArrowUpRight className="w-6 h-6" />
                      UP
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="flex-1 py-6 rounded-2xl bg-gradient-to-br from-red-500 to-red-600 font-bold text-xl flex items-center justify-center gap-2"
                    >
                      <ArrowDownRight className="w-6 h-6" />
                      DOWN
                    </motion.button>
                  </div>
                </div>
              </GlassCard>
            </div>
          </motion.div>

          {/* Content */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            viewport={{ once: true }}
            className="order-1 lg:order-2"
          >
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 text-purple-400 mb-6">
              <Target className="w-4 h-4" />
              Binary Options
            </span>

            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              Predict &{" "}
              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-purple-500 bg-clip-text text-transparent">
                profit
              </span>
            </h2>

            <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
              Simple yes or no predictions on market movements. Fixed risk, high potential returns, and instant settlements.
            </p>

            {/* Stats from API */}
            <div className="grid grid-cols-2 gap-6 mb-8">
              {feature.stats?.map((stat: any, i: number) => {
                const StatIcon = iconMap[stat.icon] || Activity;
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    viewport={{ once: true }}
                    className="flex items-center gap-4"
                  >
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                      <StatIcon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{stat.value}</div>
                      <div className="text-sm text-muted-foreground">{stat.label}</div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <Link href="/binary">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex items-center gap-3 h-14 px-8 rounded-2xl font-semibold text-white bg-gradient-to-r from-purple-600 to-pink-600 shadow-lg shadow-purple-500/25"
              >
                Start Predicting
                <ArrowRight className="w-5 h-5" />
              </motion.button>
            </Link>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}

// Futures Trading Section
function FuturesTradingSection({ feature }: { feature: any }) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const { opacity, y, scale } = useSectionScroll(sectionRef);

  const leverageOptions = [5, 10, 25, 50, 75, 100, 125, 150];
  const [selectedLeverage, setSelectedLeverage] = useState(100);
  const baseAmount = 1000;

  return (
    <section ref={sectionRef} className="relative py-32 overflow-hidden">
      {/* Floating shapes */}
      <FloatingShapes theme={{ primary: "orange", secondary: "red" }} count={8} />

      <motion.div animate={{ opacity, y, scale }} transition={{ duration: 0.1, ease: "linear" }} className="container mx-auto px-4 md:px-6 relative z-10 will-change-transform">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Leverage Visual */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500/30 to-red-500/30 rounded-3xl blur-3xl" />
              <GlassCard hover={false}>
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h4 className="text-lg font-bold">Leverage Calculator</h4>
                    <span className="px-3 py-1 rounded-full bg-orange-500/20 text-orange-400 text-xs font-medium">
                      Interactive
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-2 mb-6">
                    {leverageOptions.map((lev) => (
                      <motion.button
                        key={lev}
                        onClick={() => setSelectedLeverage(lev)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className={cn(
                          "py-3 rounded-xl font-bold text-sm transition-all duration-200",
                          selectedLeverage === lev
                            ? "bg-gradient-to-br from-orange-500 to-red-500 text-white shadow-lg shadow-orange-500/30"
                            : "bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {lev}x
                      </motion.button>
                    ))}
                  </div>

                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-white/5">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Your Margin</span>
                        <span className="font-bold">${baseAmount.toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/20">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm text-muted-foreground">Position Size</span>
                        <motion.span
                          key={selectedLeverage}
                          initial={{ scale: 1.2, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="text-2xl font-bold text-orange-400"
                        >
                          ${(baseAmount * selectedLeverage).toLocaleString()}
                        </motion.span>
                      </div>
                      <div className="text-xs text-muted-foreground text-right">
                        with {selectedLeverage}x leverage
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <TrendingUp className="w-4 h-4 text-emerald-400" />
                      <span>+1% move = <span className="text-emerald-400 font-medium">+{selectedLeverage}% profit</span></span>
                    </div>
                  </div>
                </div>
              </GlassCard>
            </div>
          </motion.div>

          {/* Content */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            viewport={{ once: true }}
          >
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/30 text-orange-400 mb-6">
              <Rocket className="w-4 h-4" />
              Futures Trading
            </span>

            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              Amplify your{" "}
              <span className="bg-gradient-to-r from-orange-400 via-red-400 to-orange-500 bg-clip-text text-transparent">
                trades
              </span>
            </h2>

            <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
              Trade perpetual futures with up to 150x leverage. Advanced risk management, real-time PnL, and deep liquidity.
            </p>

            {/* Stats from API */}
            <div className="grid grid-cols-2 gap-6 mb-8">
              {feature.stats?.map((stat: any, i: number) => {
                const StatIcon = iconMap[stat.icon] || Activity;
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    viewport={{ once: true }}
                    className="flex items-center gap-4"
                  >
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                      <StatIcon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{stat.value}</div>
                      <div className="text-sm text-muted-foreground">{stat.label}</div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <Link href="/futures">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex items-center gap-3 h-14 px-8 rounded-2xl font-semibold text-white bg-gradient-to-r from-orange-600 to-red-600 shadow-lg shadow-orange-500/25"
              >
                Trade Futures
                <ArrowRight className="w-5 h-5" />
              </motion.button>
            </Link>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}

// Ecosystem Section with eco markets
function EcosystemSection({ feature, ecoMarkets, settings }: { feature: any; ecoMarkets: any[]; settings: any }) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const { opacity, y, scale } = useSectionScroll(sectionRef);

  const hasItems = ecoMarkets && ecoMarkets.length > 0;

  return (
    <section ref={sectionRef} className="relative py-32 overflow-hidden">
      {/* Floating shapes */}
      <FloatingShapes theme={{ primary: "emerald", secondary: "teal" }} count={8} />

      <motion.div animate={{ opacity, y, scale }} transition={{ duration: 0.1, ease: "linear" }} className="container mx-auto px-4 md:px-6 relative z-10 will-change-transform">
        <div className={cn(
          "grid gap-16 items-center",
          hasItems ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1 max-w-3xl mx-auto text-center"
        )}>
          {/* Content */}
          <motion.div
            initial={{ opacity: 0, x: hasItems ? -50 : 0 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            {/* Feature icon for no-items view */}
            {!hasItems && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5 }}
                viewport={{ once: true }}
                className="w-24 h-24 mx-auto mb-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center"
              >
                <Hexagon className="w-12 h-12 text-white" />
              </motion.div>
            )}

            <span className={cn(
              "inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 text-emerald-400 mb-6",
              !hasItems && "mx-auto"
            )}>
              <Hexagon className="w-4 h-4" />
              Native Tokens
            </span>

            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              On-chain{" "}
              <span className="bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500 bg-clip-text text-transparent">
                trading
              </span>
            </h2>

            <p className={cn(
              "text-xl text-muted-foreground mb-8 leading-relaxed",
              !hasItems && "max-w-xl mx-auto"
            )}>
              Trade native blockchain tokens with direct wallet integration. Lower fees, full custody, and multi-chain support.
            </p>

            {/* Stats from API */}
            <div className={cn(
              "grid grid-cols-2 gap-6 mb-8",
              !hasItems && "max-w-md mx-auto"
            )}>
              {feature.stats?.map((stat: any, i: number) => {
                const StatIcon = iconMap[stat.icon] || Activity;
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    viewport={{ once: true }}
                    className={cn(
                      "flex items-center gap-4",
                      !hasItems && "justify-center"
                    )}
                  >
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                      <StatIcon className="w-6 h-6 text-white" />
                    </div>
                    <div className={!hasItems ? "text-left" : ""}>
                      <div className="text-2xl font-bold">{stat.value}</div>
                      <div className="text-sm text-muted-foreground">{stat.label}</div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <Link href="/ecosystem">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex items-center gap-3 h-14 px-8 rounded-2xl font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 shadow-lg shadow-emerald-500/25"
              >
                Explore Ecosystem
                <ArrowRight className="w-5 h-5" />
              </motion.button>
            </Link>
          </motion.div>

          {/* Eco Markets Card - Only show when has items */}
          {hasItems && (
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              viewport={{ once: true }}
            >
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/30 to-teal-500/30 rounded-3xl blur-3xl" />
                <GlassCard hover={false}>
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                          <Layers className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <div className="font-bold">Native Token Markets</div>
                          <div className="text-sm text-muted-foreground">Decentralized trading</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                        </span>
                        <span className="text-xs text-emerald-400 font-semibold">Live</span>
                      </div>
                    </div>

                    <LiveMarketsGrid
                      assets={ecoMarkets}
                      gradient={feature.gradient}
                      linkBase="/ecosystem"
                      settings={settings}
                      isEco={true}
                    />

                    <Link href="/ecosystem" className="block mt-4">
                      <motion.div
                        whileHover={{ x: 5 }}
                        className="flex items-center justify-center gap-2 text-sm text-emerald-400 hover:text-emerald-300 font-semibold py-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/15 transition-colors"
                      >
                        Explore ecosystem
                        <ChevronRight className="w-4 h-4" />
                      </motion.div>
                    </Link>
                  </div>
                </GlassCard>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </section>
  );
}

// Staking Section with real data
function StakingSection({ feature, data }: { feature: any; data: any }) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const { opacity, y, scale } = useSectionScroll(sectionRef);

  const featuredPools = data?.featuredPools || [];
  const highestApr = data?.highestApr || 0;
  const hasItems = featuredPools.length > 0;

  return (
    <section ref={sectionRef} className="relative py-32 overflow-hidden">
      {/* Floating shapes */}
      <FloatingShapes theme={{ primary: "green", secondary: "emerald" }} count={8} />

      <motion.div animate={{ opacity, y, scale }} transition={{ duration: 0.1, ease: "linear" }} className="container mx-auto px-4 md:px-6 relative z-10 will-change-transform">
        <div className={cn(
          "grid gap-16 items-center",
          hasItems ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1 max-w-3xl mx-auto text-center"
        )}>
          {/* Visual - Real Pool Data - Only show when has items */}
          {hasItems && (
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="order-2 lg:order-1"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/30 to-emerald-500/30 rounded-3xl blur-3xl" />
                <GlassCard hover={false}>
                  <div className="p-8">
                    <div className="text-center mb-8">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                        className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center"
                      >
                        <BadgePercent className="w-12 h-12 text-white" />
                      </motion.div>
                      <div className="text-sm text-muted-foreground mb-2">
                        Highest APR
                      </div>
                      <div className="text-5xl font-bold text-green-400">
                        {highestApr?.toFixed?.(1) || highestApr || "0"}%
                      </div>
                    </div>

                    <div className="space-y-3">
                      {featuredPools.slice(0, 3).map((pool: any, i: number) => (
                        <motion.div
                          key={pool.name || i}
                          initial={{ opacity: 0, x: -20 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.1 }}
                          viewport={{ once: true }}
                          className="flex items-center justify-between p-3 rounded-xl bg-white/5"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                              <Coins className="w-4 h-4 text-green-400" />
                            </div>
                            <span className="font-medium">{pool.symbol || pool.name}</span>
                          </div>
                          <span className="text-green-400 font-bold">{pool.apr?.toFixed(1)}% APR</span>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </GlassCard>
              </div>
            </motion.div>
          )}

          {/* Content */}
          <motion.div
            initial={{ opacity: 0, x: hasItems ? 50 : 0 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            viewport={{ once: true }}
            className={hasItems ? "order-1 lg:order-2" : ""}
          >
            {/* Feature icon for no-items view */}
            {!hasItems && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5 }}
                viewport={{ once: true }}
                className="w-24 h-24 mx-auto mb-8 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center"
              >
                <BadgePercent className="w-12 h-12 text-white" />
              </motion.div>
            )}

            <span className={cn(
              "inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 text-green-400 mb-6",
              !hasItems && "mx-auto"
            )}>
              <Percent className="w-4 h-4" />
              Staking Pools
            </span>

            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              Earn{" "}
              <span className="bg-gradient-to-r from-green-400 via-emerald-400 to-green-500 bg-clip-text text-transparent">
                passively
              </span>
            </h2>

            <p className={cn(
              "text-xl text-muted-foreground mb-8 leading-relaxed",
              !hasItems && "max-w-xl mx-auto"
            )}>
              Stake your assets and earn competitive yields. Flexible or locked staking with auto-compounding rewards.
            </p>

            {/* Stats from API */}
            <div className={cn(
              "grid grid-cols-2 gap-6 mb-8",
              !hasItems && "max-w-md mx-auto"
            )}>
              {feature.stats?.map((stat: any, i: number) => {
                const StatIcon = iconMap[stat.icon] || Activity;
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    viewport={{ once: true }}
                    className={cn(
                      "flex items-center gap-4",
                      !hasItems && "justify-center"
                    )}
                  >
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                      <StatIcon className="w-6 h-6 text-white" />
                    </div>
                    <div className={!hasItems ? "text-left" : ""}>
                      <div className="text-2xl font-bold">{stat.value}</div>
                      <div className="text-sm text-muted-foreground">{stat.label}</div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <Link href="/staking">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex items-center gap-3 h-14 px-8 rounded-2xl font-semibold text-white bg-gradient-to-r from-green-600 to-emerald-600 shadow-lg shadow-green-500/25"
              >
                Start Staking
                <ArrowRight className="w-5 h-5" />
              </motion.button>
            </Link>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}

// Generic Extension Section for other extensions
function GenericExtensionSection({ feature, index }: { feature: any; index: number }) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const { opacity, y, scale } = useSectionScroll(sectionRef);
  const isEven = index % 2 === 0;
  const IconComponent = iconMap[feature.icon] || Zap;

  // Theme mapping for extensions
  const themeMap: Record<string, { primary: string; secondary: string }> = {
    ico: { primary: "amber", secondary: "orange" },
    ai: { primary: "violet", secondary: "purple" },
    forex: { primary: "emerald", secondary: "teal" },
    copyTrading: { primary: "cyan", secondary: "blue" },
    affiliate: { primary: "rose", secondary: "pink" },
    ecommerce: { primary: "amber", secondary: "emerald" },
  };

  const theme = themeMap[feature.id] || { primary: "blue", secondary: "purple" };

  return (
    <section ref={sectionRef} className="relative py-32 overflow-hidden">
      {/* Floating shapes */}
      <FloatingShapes theme={theme} count={8} />

      <motion.div animate={{ opacity, y, scale }} transition={{ duration: 0.1, ease: "linear" }} className="container mx-auto px-4 md:px-6 relative z-10 will-change-transform">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Content */}
          <motion.div
            initial={{ opacity: 0, x: isEven ? -50 : 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className={!isEven ? "lg:order-2" : ""}
          >
            <span className={cn(
              "inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border mb-6",
              `bg-gradient-to-r ${feature.gradient}/20`,
              "border-white/20"
            )}>
              <IconComponent className="w-4 h-4" />
              {feature.title}
            </span>

            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              {feature.title}
            </h2>

            <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
              {feature.description}
            </p>

            {/* Stats from API */}
            <div className="grid grid-cols-2 gap-6 mb-8">
              {feature.stats?.map((stat: any, i: number) => {
                const StatIcon = iconMap[stat.icon] || Activity;
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    viewport={{ once: true }}
                    className="flex items-center gap-4"
                  >
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center",
                      `bg-gradient-to-br ${feature.gradient}`
                    )}>
                      <StatIcon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{stat.value}</div>
                      <div className="text-sm text-muted-foreground">{stat.label}</div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <Link href={feature.link}>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  "inline-flex items-center gap-3 h-14 px-8 rounded-2xl font-semibold text-white shadow-lg",
                  `bg-gradient-to-r ${feature.gradient}`
                )}
              >
                Learn More
                <ArrowRight className="w-5 h-5" />
              </motion.button>
            </Link>
          </motion.div>

          {/* Visual Card */}
          <motion.div
            initial={{ opacity: 0, x: isEven ? 50 : -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            viewport={{ once: true }}
            className={isEven ? "" : "lg:order-1"}
          >
            <div className="relative">
              <div className={cn(
                "absolute inset-0 rounded-3xl blur-3xl",
                `bg-gradient-to-br ${feature.gradient}/30`
              )} />
              <GlassCard hover={false}>
                <div className="p-8 text-center">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                    className={cn(
                      "w-24 h-24 mx-auto mb-6 rounded-2xl flex items-center justify-center",
                      `bg-gradient-to-br ${feature.gradient}`
                    )}
                  >
                    <IconComponent className="w-12 h-12 text-white" />
                  </motion.div>
                  <h3 className="text-2xl font-bold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </div>
              </GlassCard>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}

// User Portfolio Summary component
function UserPortfolioSummary() {
  const { user } = useUserStore();
  const {
    totalBalance,
    totalChange,
    totalChangePercent,
    fetchStats,
  } = useWalletStore();
  const [showBalance, setShowBalance] = useState(true);

  useEffect(() => {
    if (user) {
      fetchStats();
    }
  }, [user, fetchStats]);

  const formatBalance = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const formatChange = (amount: number) => {
    const prefix = amount >= 0 ? '+' : '';
    return prefix + new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  return (
    <GlassCard hover={false}>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-lg text-foreground">Welcome back, {user?.firstName || 'Trader'}!</h3>
            <p className="text-sm text-muted-foreground">Your portfolio overview</p>
          </div>
          <button
            onClick={() => setShowBalance(!showBalance)}
            className="p-2 rounded-full hover:bg-muted/50 dark:hover:bg-white/10 transition-colors text-muted-foreground"
          >
            {showBalance ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
          </button>
        </div>

        {/* Total Balance with PnL */}
        <div className="p-4 rounded-2xl bg-muted/30 dark:bg-white/5 border border-border/50 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground font-medium">Total Balance</span>
            <div className={cn(
              "flex items-center gap-1 text-sm font-semibold px-2 py-0.5 rounded-full",
              totalChangePercent >= 0
                ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
                : "text-red-600 dark:text-red-400 bg-red-500/10"
            )}>
              {totalChangePercent >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {totalChangePercent >= 0 ? '+' : ''}{totalChangePercent.toFixed(2)}%
            </div>
          </div>
          <div className="text-3xl font-bold text-foreground mb-1">
            {showBalance ? formatBalance(totalBalance) : '••••••'}
          </div>
          <div className={cn(
            "text-sm font-medium",
            totalChange >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
          )}>
            {showBalance ? `24h: ${formatChange(totalChange)}` : '24h: ••••••'}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <Link href="/finance/wallet">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold text-sm"
            >
              My Wallets
            </motion.button>
          </Link>
          <Link href="/market">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-3 rounded-xl bg-muted/50 dark:bg-white/10 hover:bg-muted dark:hover:bg-white/15 font-semibold text-sm text-foreground transition-colors border border-border/50"
            >
              Trade Now
            </motion.button>
          </Link>
        </div>

      </div>
    </GlassCard>
  );
}

// ===== MAIN COMPONENT =====
export default function DefaultHomePage() {
  const t = useTranslations("common");
  const [markets, setMarkets] = useState<any[]>([]);
  const [ecoMarkets, setEcoMarkets] = useState<any[]>([]);
  const [tickers, setTickers] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [pageContent, setPageContent] = useState<PageContent | null>(null);
  const [landingStats, setLandingStats] = useState<LandingStats | null>(null);

  // Refs to prevent duplicate fetches
  const hasFetchedData = useRef(false);
  const hasFetchedEcoMarkets = useRef(false);
  const hasFetchedMarkets = useRef(false);

  const { user } = useUserStore();
  const { settings, extensions } = useConfigStore();
  const heroRef = useRef<HTMLDivElement>(null);
  const [isScrollReady, setIsScrollReady] = useState(false);

  // Track when the hero ref is attached and ready for scroll tracking
  // Use requestAnimationFrame to ensure DOM is painted before enabling scroll
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      if (heroRef.current) {
        setIsScrollReady(true);
      }
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  // Use scroll with proper client-side only handling
  // Only pass the target ref when the DOM element is ready
  const { scrollYProgress } = useScroll({
    target: isScrollReady ? heroRef : undefined,
    offset: ["start start", "end start"],
    layoutEffect: false, // Use effect instead of layoutEffect to prevent hydration issues
  });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  const isSpotEnabled = settings?.spotWallets === true || settings?.spotWallets === "true";
  const isEcosystemEnabled = extensions?.includes("ecosystem");

  // Load page content and landing stats
  useEffect(() => {
    if (hasFetchedData.current) return;
    hasFetchedData.current = true;

    const fetchData = async () => {
      try {
        const [contentResponse, statsResponse] = await Promise.all([
          $fetch<PageContent>({
            url: `/api/content/default-page/home`,
            method: "GET",
            params: { pageSource: 'default' },
            silent: true
          }),
          $fetch<LandingStats>({
            url: `/api/content/landing-stats`,
            method: "GET",
            silent: true
          })
        ]);

        if (contentResponse.data) setPageContent(contentResponse.data);
        if (statsResponse.data) setLandingStats(statsResponse.data);
      } catch (error) {
        console.error("Error loading data:", error);
      }
    };

    fetchData();
  }, []);

  // Extension data is now fetched via the consolidated landing-stats endpoint

  // Fetch ecosystem markets separately
  useEffect(() => {
    // Wait for extensions to load
    if (extensions === undefined) return;
    if (!isEcosystemEnabled || hasFetchedEcoMarkets.current) return;
    hasFetchedEcoMarkets.current = true;

    const fetchEcoMarkets = async () => {
      try {
        const res = await fetch("/api/ecosystem/market");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        if (Array.isArray(data)) {
          setEcoMarkets(data.map((market: any) => ({
            currency: market.currency,
            pair: market.pair,
            price: market.price || 0,
            change24h: market.change || 0,
            symbol: `${market.currency}/${market.pair}`,
          })));
        }
      } catch (e) {
        console.error("Error fetching eco markets:", e);
      }
    };

    fetchEcoMarkets();
  }, [isEcosystemEnabled, extensions]);

  // Market data fetching
  useEffect(() => {
    let spotUnsubscribe: (() => void) | null = null;

    // Wait for settings to be loaded before deciding
    if (settings === undefined) return;

    if (!isSpotEnabled) {
      setIsLoading(false);
      return;
    }

    if (hasFetchedMarkets.current) return;
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
      spotUnsubscribe = tickersWs.subscribeToSpotData((tickers) => {
        setTickers({ ...tickers });
      });
    } catch (wsError) {
      console.error("WebSocket initialization error:", wsError);
    }

    return () => {
      if (spotUnsubscribe) spotUnsubscribe();
    };
  }, [isSpotEnabled, settings]);

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

  // Filter and sort extension sections based on admin configuration
  const dynamicFeatures = useMemo(() => {
    const features = landingStats?.features || [];
    const extensionConfig = pageContent?.variables?.extensionSections || {};

    // Filter out disabled extensions and sort by order
    return features
      .filter((feature) => {
        const config = extensionConfig[feature.id];
        // If no config exists, show by default
        return config?.enabled !== false;
      })
      .sort((a, b) => {
        const configA = extensionConfig[a.id] || { order: 999 };
        const configB = extensionConfig[b.id] || { order: 999 };
        return (configA.order ?? 999) - (configB.order ?? 999);
      });
  }, [landingStats?.features, pageContent?.variables?.extensionSections]);

  // Render appropriate section based on feature ID with real data from consolidated endpoint
  const renderExtensionSection = (feature: any, index: number) => {
    // Data is now embedded in feature.data from the landing-stats endpoint
    const featureData = feature.data || {};

    switch (feature.id) {
      case "spot":
        return <SpotTradingSection key={feature.id} feature={feature} topAssets={topAssets} settings={settings} />;
      case "binary":
        return <BinaryOptionsSection key={feature.id} feature={feature} />;
      case "futures":
        return <FuturesTradingSection key={feature.id} feature={feature} />;
      case "ecosystem":
        return <EcosystemSection key={feature.id} feature={feature} ecoMarkets={ecoMarkets} settings={settings} />;
      case "staking":
        return <StakingSection key={feature.id} feature={feature} data={featureData} />;
      default:
        return <GenericExtensionSection key={feature.id} feature={feature} index={index} />;
    }
  };

  return (
    <div className="relative w-full min-h-screen">
      <MeshBackground />
      <NoiseOverlay />

      {/* Hero Section */}
      <section ref={heroRef} className="relative min-h-screen flex items-center pt-20" style={{ position: 'relative' }}>
        {/* Hero floating shapes */}
        <FloatingShapes theme={{ primary: "blue", secondary: "purple" }} count={10} />

        <motion.div
          style={{ y: heroY, opacity: heroOpacity }}
          className="container mx-auto px-4 md:px-6 relative z-10"
        >
          <div className={cn(
            "flex flex-col gap-12 lg:gap-16",
            isSpotEnabled ? "lg:flex-row lg:items-center" : "items-center text-center"
          )}>
            {/* Hero Content */}
            <div className={cn("flex-1 max-w-3xl", isSpotEnabled ? "lg:max-w-2xl" : "")}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 text-blue-400 mb-8">
                  <Sparkles className="w-4 h-4" />
                  {getContent(pageContent, "hero.badge", "#1 Crypto Trading Platform")}
                </span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-8 leading-[1.1]"
              >
                <span className="block">{getContent(pageContent, "hero.title", "Trade Crypto")}</span>
                <span className="block bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent pb-2">
                  {getContent(pageContent, "hero.subtitle", "like a pro")}
                </span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="text-xl md:text-2xl text-muted-foreground mb-10 max-w-2xl leading-relaxed"
              >
                {getContent(pageContent, "hero.description", "Experience lightning-fast execution, institutional-grade security, and advanced trading tools designed for the modern trader.")}
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className={cn(
                  "flex flex-col sm:flex-row gap-4 mb-12",
                  !isSpotEnabled && "justify-center"
                )}
              >
                <Link href={user ? "/market" : "/register"}>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="group inline-flex items-center justify-center gap-3 h-14 px-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl font-semibold text-white shadow-2xl shadow-blue-600/20 hover:shadow-blue-600/30 transition-shadow"
                  >
                    {user ? t("start_trading") : getContent(pageContent, "hero.cta", "Start Trading Free")}
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </motion.button>
                </Link>

                {isSpotEnabled && (
                  <Link href="/market">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="inline-flex items-center justify-center gap-3 h-14 px-8 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-2xl font-semibold transition-all"
                    >
                      <Play className="w-5 h-5" />
                      {t("explore_markets")}
                    </motion.button>
                  </Link>
                )}
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className={cn("flex flex-wrap gap-6", !isSpotEnabled && "justify-center")}
              >
                {(pageContent?.variables?.hero?.features || ["Bank-Grade Security", "24/7 Trading", "Instant Deposits"]).map((feature: string, i: number) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    {feature}
                  </div>
                ))}
              </motion.div>
            </div>

            {/* Right Side Panel */}
            {(isSpotEnabled || user) && (
              <motion.div
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.3 }}
                className="w-full lg:w-[500px] shrink-0"
              >
                {user ? (
                  <UserPortfolioSummary />
                ) : (
                  <GlassCard hover={false}>
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <h3 className="font-bold text-lg">Live Markets</h3>
                          <p className="text-sm text-muted-foreground">Top performing assets</p>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                          </span>
                          <span className="text-xs text-emerald-400 font-semibold">Live</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        {isLoading ? (
                          [...Array(5)].map((_, i) => (
                            <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 animate-pulse">
                              <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-white/10" />
                                <div className="space-y-2">
                                  <div className="h-4 w-16 bg-white/10 rounded" />
                                  <div className="h-3 w-12 bg-white/10 rounded" />
                                </div>
                              </div>
                              <div className="text-right space-y-2">
                                <div className="h-4 w-20 bg-white/10 rounded" />
                                <div className="h-3 w-14 bg-white/10 rounded" />
                              </div>
                            </div>
                          ))
                        ) : (
                          topAssets.slice(0, 5).map((asset, index) => (
                            <Link key={asset.symbol} href={buildMarketLink(settings, asset.currency, asset.pair)}>
                              <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                whileHover={{ backgroundColor: "rgba(255,255,255,0.08)" }}
                                className="flex items-center justify-between p-4 rounded-2xl cursor-pointer transition-colors group"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-12 h-12 rounded-full overflow-hidden bg-zinc-800 ring-2 ring-white/10 group-hover:ring-blue-500/50 transition-all">
                                    <Image
                                      src={getCryptoImageUrl(asset.currency || "generic")}
                                      alt={asset.currency || "crypto"}
                                      width={48}
                                      height={48}
                                      className="w-full h-full object-cover"
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
                                    <div className="font-bold group-hover:text-blue-400 transition-colors">{asset.name}</div>
                                    <div className="text-sm text-muted-foreground">{asset.symbol}</div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="font-mono font-bold">${formatPrice(asset.price)}</div>
                                  <div className={cn(
                                    "text-sm font-semibold flex items-center justify-end gap-1",
                                    asset.change24h >= 0 ? "text-emerald-400" : "text-red-400"
                                  )}>
                                    {asset.change24h >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                    {asset.change24h >= 0 ? "+" : ""}{asset.change24h.toFixed(2)}%
                                  </div>
                                </div>
                              </motion.div>
                            </Link>
                          ))
                        )}
                      </div>

                      <Link href="/market" className="block mt-4">
                        <motion.div
                          whileHover={{ x: 5 }}
                          className="flex items-center justify-center gap-2 text-sm text-blue-400 hover:text-blue-300 font-semibold py-4 rounded-2xl bg-blue-500/10 hover:bg-blue-500/15 transition-colors"
                        >
                          View all markets
                          <ChevronRight className="w-4 h-4" />
                        </motion.div>
                      </Link>
                    </div>
                  </GlassCard>
                )}
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* Scroll Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 12, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-6 h-10 rounded-full border-2 border-white/20 flex items-start justify-center p-2"
          >
            <motion.div className="w-1.5 h-3 bg-white/40 rounded-full" />
          </motion.div>
        </motion.div>
      </section>

      {/* Live Ticker */}
      {isSpotEnabled && topAssets.length > 0 && pageContent?.variables?.ticker?.enabled !== false && (
        <div className="relative border-y border-white/5 mt-20">
          <PremiumTicker assets={topAssets} />
        </div>
      )}

      {/* Extension Sections - Each with unique design and real data */}
      {dynamicFeatures.map((feature, index) => renderExtensionSection(feature, index))}

      {/* Why Choose Us Section */}
      <Section>
        <FloatingShapes theme={{ primary: "blue", secondary: "purple" }} count={6} />
        <div className="container mx-auto px-4 md:px-6 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 text-blue-400 mb-6">
                <Award className="w-4 h-4" />
                {getContent(pageContent, "featuresSection.badge", "Why Choose Us")}
              </span>

              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                {getContent(pageContent, "featuresSection.title", "Built for")}{" "}
                <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
                  {getContent(pageContent, "featuresSection.subtitle", "Professional Traders")}
                </span>
              </h2>

              <p className="text-xl text-muted-foreground mb-10 leading-relaxed">
                {getContent(pageContent, "featuresSection.description", "Experience unmatched security, lightning-fast execution, and professional-grade tools designed for serious traders.")}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {(pageContent?.variables?.features || [
                  { icon: "Shield", title: "Bank-Grade Security", description: "Multi-layer security with cold storage and 2FA", gradient: "from-emerald-500 to-cyan-500" },
                  { icon: "Zap", title: "Lightning Fast", description: "Ultra-low latency trading engine", gradient: "from-yellow-500 to-orange-500" },
                  { icon: "Globe", title: "Global Access", description: "Trade from anywhere in the world", gradient: "from-blue-500 to-indigo-500" },
                  { icon: "Clock", title: "24/7 Support", description: "Round-the-clock customer support", gradient: "from-purple-500 to-pink-500" },
                ]).slice(0, 4).map((feature: any, i: number) => {
                  const Icon = iconMap[feature.icon] || Zap;
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: i * 0.1 }}
                      viewport={{ once: true }}
                      className="flex gap-4"
                    >
                      <div className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br",
                        feature.gradient
                      )}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h4 className="font-bold mb-1">{feature.title}</h4>
                        <p className="text-sm text-muted-foreground">{feature.description}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <GlassCard hover={false}>
                <div className="p-8">
                  <h3 className="text-2xl font-bold mb-8">
                    {getContent(pageContent, "globalSection.platformFeatures.title", "Platform Features")}
                  </h3>
                  <div className="space-y-5">
                    {(pageContent?.variables?.globalSection?.platformFeatures?.items || [
                      "Real-time market data and price feeds",
                      "Advanced order types (Limit, Market, Stop-Loss)",
                      "Professional TradingView charts integration",
                      "Mobile apps for iOS and Android",
                      "API access for algorithmic trading",
                      "Multi-language support",
                    ]).map((item: string, i: number) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.4, delay: i * 0.1 }}
                        viewport={{ once: true }}
                        className="flex items-center gap-4"
                      >
                        <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                          <CheckCircle className="w-5 h-5 text-emerald-400" />
                        </div>
                        <span className="text-muted-foreground">{item}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          </div>
        </div>
      </Section>

      {/* Getting Started Section */}
      <Section>
        <FloatingShapes theme={{ primary: "purple", secondary: "cyan" }} count={6} />
        <div className="container mx-auto px-4 md:px-6 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 text-blue-400 mb-6">
              <Rocket className="w-4 h-4" />
              {getContent(pageContent, "gettingStarted.badge", "Get Started")}
            </span>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              {getContent(pageContent, "gettingStarted.title", "Start Trading")}{" "}
              <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
                {getContent(pageContent, "gettingStarted.subtitle", "in Minutes")}
              </span>
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            <div className="hidden md:block absolute top-28 left-[20%] right-[20%] h-0.5">
              <div className="h-full bg-gradient-to-r from-blue-500/50 via-purple-500/50 to-cyan-500/50" />
            </div>

            {(pageContent?.variables?.gettingStarted?.steps || [
              { step: "01", title: "Create Account", description: "Sign up in seconds with just your email.", icon: "Users", gradient: "from-blue-500 to-cyan-500" },
              { step: "02", title: "Fund Your Wallet", description: "Deposit funds using multiple payment methods.", icon: "Wallet", gradient: "from-purple-500 to-pink-500" },
              { step: "03", title: "Start Trading", description: "Access markets and start trading instantly.", icon: "TrendingUp", gradient: "from-orange-500 to-red-500" },
            ]).map((step: any, i: number) => {
              const Icon = iconMap[step.icon] || Users;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: i * 0.2 }}
                  viewport={{ once: true }}
                >
                  <GlassCard>
                    <div className="p-8 text-center">
                      <div className="relative inline-block mb-6">
                        <div className={cn(
                          "w-20 h-20 rounded-2xl flex items-center justify-center bg-gradient-to-br mx-auto",
                          step.gradient
                        )}>
                          <Icon className="w-10 h-10 text-white" />
                        </div>
                        <div className="absolute -top-3 -right-3 w-10 h-10 rounded-full bg-background border-2 border-white/20 flex items-center justify-center text-sm font-bold">
                          {step.step}
                        </div>
                      </div>
                      <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                      <p className="text-muted-foreground">{step.description}</p>
                    </div>
                  </GlassCard>
                </motion.div>
              );
            })}
          </div>
        </div>
      </Section>

      {/* Mobile App Section */}
      {pageContent?.variables?.mobileApp?.enabled !== false && <MobileAppSection />}

      {/* CTA Section */}
      <section className="relative py-24 lg:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-600/10 to-transparent" />
        <FloatingShapes theme={{ primary: "blue", secondary: "indigo" }} count={8} />

        <div className="container mx-auto px-4 md:px-6 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center max-w-4xl mx-auto"
          >
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-white/10 border border-white/20 mb-8">
              <Sparkles className="w-4 h-4" />
              {getContent(pageContent, "cta.badge", "Join Now")}
            </span>

            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4">
              {user ? t("continue_trading") : getContent(pageContent, "cta.title", "Ready to Start Trading?")}
            </h2>

            <p className="text-xl md:text-2xl text-muted-foreground mb-10 max-w-3xl mx-auto leading-relaxed">
              {user
                ? t("explore_our_markets_description")
                : getContent(pageContent, "cta.description", "Join thousands of traders who trust our platform. Start your journey to financial freedom today.")}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-10">
              <Link href={user ? "/market" : "/register"}>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="group inline-flex items-center justify-center gap-3 h-16 px-10 bg-white text-blue-600 rounded-2xl font-bold text-lg shadow-2xl hover:shadow-white/20 transition-shadow"
                >
                  {user
                    ? getContent(pageContent, "cta.buttonUser", t("explore_markets"))
                    : getContent(pageContent, "cta.button", t("create_free_account"))}
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </motion.button>
              </Link>
            </div>

            <div className="flex flex-wrap justify-center gap-6 text-sm">
              {(user
                ? pageContent?.variables?.cta?.featuresUser || ["Real-time Data", "Secure Trading", "24/7 Access"]
                : pageContent?.variables?.cta?.features || ["No Credit Card Required", "Free Registration", "Instant Access"]
              ).map((feature: string, i: number) => (
                <div key={i} className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  {feature}
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
