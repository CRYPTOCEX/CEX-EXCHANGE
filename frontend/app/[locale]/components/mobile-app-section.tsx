"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { m, useScroll, useTransform, useSpring, useReducedMotion, MotionValue } from "framer-motion";
import {
  Activity,
  ArrowDownRight,
  ArrowLeftRight,
  ArrowUpRight,
  Award,
  BadgePercent,
  Banknote,
  BarChart3,
  Bell,
  Boxes,
  Brain,
  CandlestickChart,
  ChartLine,
  CheckCircle,
  CircleDollarSign,
  Clock,
  Coins,
  Copy,
  Cpu,
  CreditCard,
  Crosshair,
  Database,
  DollarSign,
  Download,
  Fingerprint,
  Flame,
  Folder,
  Gavel,
  Gem,
  Gift,
  Globe,
  HandCoins,
  Hexagon,
  Image as ImageIcon,
  Landmark,
  Layers,
  LayoutGrid,
  LineChart,
  Lock,
  Network,
  Orbit,
  Package,
  Percent,
  PieChart,
  QrCode,
  Rocket,
  Scale,
  Shield,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  Sparkles,
  Star,
  Store,
  Tag,
  Target,
  Timer,
  TrendingDown,
  TrendingUp,
  Trophy,
  UserCheck,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import Image from "next/image";
import { useConfigStore } from "@/store/config";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

// Check if device is mobile for reduced animations
const isMobileDevice = () => {
  if (typeof window === "undefined") return false;
  return window.innerWidth < 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

/**
 * Decorative shapes are one hue at a few opacities, not five hues.
 *
 * The tints used to be built by concatenating hex digits onto the colour
 * (`${shape.color}20`), which worked only because the five colours were
 * literal six-digit hex. Against a token that shape produces an invalid colour
 * and the element paints nothing at all — silently (DESIGN-SYSTEM.md, Phase 3),
 * so the alpha has to be expressed inside the `hsl()`.
 */
const shapeTint = (a: number) => `hsl(var(--primary) / ${a})`;

// Floating shape component with parallax
interface ShapeData {
  id: number;
  type: "circle" | "square" | "triangle" | "ring" | "hexagon";
  size: number;
  x: number;
  y: number;
  parallaxMultiplier: number;
  rotation: number;
  blur?: number;
}

function FloatingShape({
  shape,
  scrollYProgress,
  isMobile,
}: {
  shape: ShapeData;
  scrollYProgress: MotionValue<number>;
  isMobile: boolean;
}) {
  // Reduce parallax intensity on mobile to prevent jumping
  const parallaxScale = isMobile ? 0.3 : 1;
  const y = useTransform(
    scrollYProgress,
    [0, 1],
    [-30 * shape.parallaxMultiplier * parallaxScale, 30 * shape.parallaxMultiplier * parallaxScale]
  );
  const rotate = useTransform(
    scrollYProgress,
    [0, 1],
    [shape.rotation, shape.rotation + (isMobile ? 20 : 60)]
  );
  // Higher stiffness and damping for smoother, less jumpy motion on mobile
  const springConfig = isMobile
    ? { stiffness: 100, damping: 30 }
    : { stiffness: 50, damping: 20 };
  const smoothY = useSpring(y, springConfig);
  const smoothRotate = useSpring(rotate, springConfig);

  const renderShape = () => {
    switch (shape.type) {
      case "circle":
        return (
          <div
            className="w-full h-full rounded-full"
            style={{
              background: `linear-gradient(135deg, ${shapeTint(0.12)}, ${shapeTint(0.02)})`,
              border: `1px solid ${shapeTint(0.18)}`,
              filter: shape.blur ? `blur(${shape.blur}px)` : undefined,
            }}
          />
        );
      case "square":
        return (
          <div
            className="w-full h-full rounded-2xl"
            style={{
              background: `linear-gradient(135deg, ${shapeTint(0.08)}, transparent)`,
              border: `1px solid ${shapeTint(0.12)}`,
              filter: shape.blur ? `blur(${shape.blur}px)` : undefined,
            }}
          />
        );
      case "triangle":
        return (
          <div
            className="w-full h-full"
            style={{
              clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)",
              background: `linear-gradient(180deg, ${shapeTint(0.12)}, ${shapeTint(0.02)})`,
              filter: shape.blur ? `blur(${shape.blur}px)` : undefined,
            }}
          />
        );
      case "ring":
        return (
          <div
            className="w-full h-full rounded-full"
            style={{
              border: `2px solid ${shapeTint(0.18)}`,
              filter: shape.blur ? `blur(${shape.blur}px)` : undefined,
            }}
          />
        );
      case "hexagon":
        return (
          <div
            className="w-full h-full"
            style={{
              clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
              background: `linear-gradient(180deg, ${shapeTint(0.08)}, ${shapeTint(0.02)})`,
              filter: shape.blur ? `blur(${shape.blur}px)` : undefined,
            }}
          />
        );
      default:
        return null;
    }
  };

  return (
    <m.div
      className="absolute pointer-events-none"
      style={{
        left: `${shape.x}%`,
        top: `${shape.y}%`,
        width: shape.size,
        height: shape.size,
        y: smoothY,
        rotate: smoothRotate,
      }}
    >
      {renderShape()}
    </m.div>
  );
}

// Raised card: a hairline and a surface step, not a gradient shim (R3).
function GlassCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "h-full rounded-xl border border-border bg-card/90 backdrop-blur-xl",
        className
      )}
    >
      {children}
    </div>
  );
}

/*
 * The two store marks, each in one place.
 *
 * They were inline in the buttons, which was fine while the buttons were the
 * only thing that drew them. The "coming soon" plate below stands in for BOTH
 * buttons and carries both marks, so leaving the paths inline would have meant
 * four copies of two paths — and a plate whose glyphs could silently drift out
 * of step with the buttons it replaces.
 */
function AppleMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  );
}

function GooglePlayMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z" />
    </svg>
  );
}

/**
 * One stored point. Records written by the old editor also carry a `gradient`;
 * it is absent here on purpose rather than accepted and dropped, because the
 * section paints one accent (R2) and there is nowhere for a per-card hue to go.
 */
export interface MobileAppFeature {
  title?: string;
  description?: string;
  /** A lucide icon NAME — the `ICON_MAP` vocabulary below. */
  icon?: string;
}

export interface MobileAppSectionProps {
  badge?: string;
  title?: string;
  subtitle?: string;
  description?: string;
  features?: MobileAppFeature[];
  /**
   * Announce the apps instead of linking to them.
   *
   * This is the ONLY prop that can bring the band onto a page with no store
   * link configured, and it has to be: an owner who is announcing an app they
   * have not shipped has nothing to put in `appStoreLink` yet, so gating the
   * announcement on the very link it stands in for would make the switch do
   * nothing on precisely the site that needs it.
   *
   * It also wins over links that ARE set. An owner who has pasted a store URL
   * ahead of review can still hold the band back with one switch, which is the
   * cheaper of the two ways to say "not yet" — the other is deleting the URL
   * and finding it again later.
   */
  comingSoon?: boolean;
  /** What the plate reads. Blank falls back to the translated "Coming Soon". */
  comingSoonLabel?: string;
  /** The page editor's section marker, spread onto the outermost element. */
  "data-preview-section"?: string;
}

/**
 * Icon names a stored point may carry.
 *
 * Deliberately the whole of `lib/default-page/home-icons` — the vocabulary the
 * editor's icon picker offers — plus the glyphs this section already draws.
 * The picker tells the owner "only the names the page can draw are offered",
 * so a shorter map here would quietly turn most of that list into the fallback
 * and make the promise false for this one field. An unknown name still has to
 * degrade rather than throw: it is a typo or a record from an older editor,
 * not a reason for the page to stop rendering.
 */
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Activity, ArrowDownRight, ArrowLeftRight, ArrowUpRight, Award, BadgePercent,
  Banknote, BarChart3, Bell, Boxes, Brain, CandlestickChart, ChartLine,
  CheckCircle, CircleDollarSign, Clock, Coins, Copy, Cpu, CreditCard, Crosshair,
  Database, DollarSign, Download, Fingerprint, Flame, Folder, Gavel, Gem, Gift,
  Globe, HandCoins, Hexagon, Image: ImageIcon, Landmark, Layers, LayoutGrid,
  LineChart, Lock, Network, Orbit, Package, Percent, PieChart, QrCode, Rocket,
  Scale, Shield, ShoppingBag, ShoppingCart, Smartphone, Sparkles, Star, Store,
  Tag, Target, Timer, TrendingDown, TrendingUp, Trophy, UserCheck, Users,
  Wallet, Zap,
};

export function MobileAppSection({
  badge,
  title,
  subtitle,
  description,
  features: storedFeatures,
  comingSoon = false,
  comingSoonLabel,
  ...rest
}: MobileAppSectionProps = {}) {
  const t = useTranslations("common");
  const { settings } = useConfigStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isScrollReady, setIsScrollReady] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  // Detect mobile device
  useEffect(() => {
    setIsMobile(isMobileDevice());
    const handleResize = () => setIsMobile(isMobileDevice());
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Use requestAnimationFrame to ensure DOM is painted before enabling scroll tracking
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      if (containerRef.current) {
        setIsScrollReady(true);
      }
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  // Only pass the target ref when the DOM element is ready
  const { scrollYProgress } = useScroll({
    target: isScrollReady ? containerRef : undefined,
    offset: ["start end", "end start"],
  });

  // Check if either app store link or google play link is configured
  const hasAppStoreLink = settings?.appStoreLink && settings.appStoreLink.trim() !== "";
  const hasGooglePlayLink = settings?.googlePlayLink && settings.googlePlayLink.trim() !== "";
  /* The announcement replaces the store buttons rather than joining them, so a
     site running it needs no link at all — and any link it does have stays put
     in settings, unpublished, until the switch goes off again. */
  const showSection = comingSoon || hasAppStoreLink || hasGooglePlayLink;

  // Reduce number of floating shapes on mobile for better performance
  const shapeCount = isMobile ? 4 : 12;

  // Generate floating shapes
  const shapes = useMemo<ShapeData[]>(() => {
    const types: ShapeData["type"][] = ["circle", "square", "triangle", "ring", "hexagon"];

    return Array.from({ length: shapeCount }, (_, i) => {
      const seed = i * 1234;
      const seededRandom = (s: number) => {
        const x = Math.sin(s) * 10000;
        return x - Math.floor(x);
      };

      return {
        id: i,
        type: types[Math.floor(seededRandom(seed) * types.length)],
        size: 30 + seededRandom(seed + 1) * 80,
        x: seededRandom(seed + 2) * 100,
        y: seededRandom(seed + 3) * 100,
        parallaxMultiplier: 0.3 + seededRandom(seed + 5) * 0.8,
        rotation: seededRandom(seed + 6) * 360,
        blur: seededRandom(seed + 7) > 0.7 ? 2 : 0,
      };
    });
  }, [shapeCount]);

  // Phone float animation - reduced intensity on mobile
  const phoneYRange = isMobile ? [20, -20] : [50, -50];
  const phoneRotateRange = isMobile ? [-2, 2] : [-5, 5];
  const phoneY = useTransform(scrollYProgress, [0, 1], phoneYRange);
  const phoneRotate = useTransform(scrollYProgress, [0, 1], phoneRotateRange);
  // Higher stiffness/damping on mobile for smoother motion
  const phoneSpringConfig = isMobile
    ? { stiffness: 100, damping: 30 }
    : { stiffness: 50, damping: 20 };
  const smoothPhoneY = useSpring(phoneY, phoneSpringConfig);
  const smoothPhoneRotate = useSpring(phoneRotate, phoneSpringConfig);

  // Skip animations entirely if user prefers reduced motion
  const shouldAnimate = !prefersReducedMotion;

  if (!showSection) {
    return null;
  }

  const defaultFeatures = [
    {
      icon: Fingerprint,
      title: t("biometric_security") || t("biometric_security"),
      description: t("biometric_desc") || t("face_id_fingerprint_login"),
    },
    {
      icon: Bell,
      title: t("instant_alerts") || t("instant_alerts"),
      description: t("alerts_desc") || t("real_time_price_notifications"),
    },
    {
      icon: ChartLine,
      title: t("live_charts") || t("live_charts"),
      description: t("charts_desc") || t("professional_trading_tools"),
    },
    {
      icon: Wallet,
      title: t("multi_wallet") || t("multi_wallet"),
      description: t("wallet_desc") || t("manage_all_your_assets"),
    },
  ];

  /* A stored list replaces the built-in one wholesale. An EMPTY stored list
     falls back rather than rendering nothing: the editor writes `features: []`
     the moment an owner deletes a card, and a four-up grid collapsing to
     nothing is not what "I removed one feature" should mean. Hiding the whole
     band is what `mobileApp.enabled` is for. */
  const features: Array<{
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    description: string;
  }> = storedFeatures?.length
    ? storedFeatures.map((feature) => ({
        icon: (feature.icon && ICON_MAP[feature.icon]) || Smartphone,
        title: feature.title || "",
        description: feature.description || "",
      }))
    : defaultFeatures;

  /* Trimmed rather than `??`: an admin who clears a field stores "", and a
     blank heading on the live site is never what they meant by clearing it. */
  const badgeText = badge?.trim() || t("download_our_app") || "Download Our App";
  const titleText = title?.trim() || t("trade_on_the_go") || "Trade on the Go";
  const subtitleText = subtitle?.trim() || t("anytime_anywhere") || "Anytime, Anywhere";
  const descriptionText =
    description?.trim() ||
    t("experience_seamless_cryptocurrency_trading") ||
    "Experience seamless cryptocurrency trading with our powerful mobile app. Access all features from your pocket.";
  /* The plate is the only thing standing where two buttons were, so it must
     never come up empty: an owner who clears this field gets the translated
     "Coming Soon" back, not a blank slab. */
  const comingSoonText = comingSoonLabel?.trim() || t("coming_soon") || "Coming Soon";

  return (
    <section
      ref={containerRef}
      {...rest}
      className="relative py-24 lg:py-32 overflow-hidden"
    >
      {/* Floating Shapes Background - hidden on mobile for performance */}
      {!isMobile && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {isScrollReady && shapes.map((shape) => (
            <FloatingShape
              key={shape.id}
              shape={shape}
              scrollYProgress={scrollYProgress}
              isMobile={isMobile}
            />
          ))}
        </div>
      )}

      {/* Gradient Orbs - static on mobile, animated on desktop */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <m.div
          animate={shouldAnimate && !isMobile ? {
            scale: [1, 1.2, 1],
            x: [0, 30, 0],
          } : undefined}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/4 -left-32 w-96 h-96 rounded-full opacity-30 blur-[100px]"
          style={{ background: `radial-gradient(circle, ${shapeTint(0.6)} 0%, transparent 70%)` }}
        />
        <m.div
          animate={shouldAnimate && !isMobile ? {
            scale: [1, 1.1, 1],
            x: [0, -20, 0],
          } : undefined}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut", delay: 5 }}
          className="absolute bottom-1/4 -right-32 w-96 h-96 rounded-full opacity-30 blur-[100px]"
          style={{ background: `radial-gradient(circle, ${shapeTint(0.45)} 0%, transparent 70%)` }}
        />
      </div>

      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
          {/* Content Side */}
          <m.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="order-2 lg:order-1"
          >
            {/* Badge */}
            <m.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
            >
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-primary/10 border border-primary/20 text-primary-ink mb-8">
                <Smartphone className="w-4 h-4" />
                {badgeText}
              </span>
            </m.div>

            {/* Heading */}
            <m.h2
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              viewport={{ once: true }}
              className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 tracking-tight"
            >
              {titleText}
              <span className="block text-primary">
                {subtitleText}
              </span>
            </m.h2>

            {/* Description */}
            <m.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
              className="text-xl text-muted-foreground mb-10 leading-relaxed max-w-xl"
            >
              {descriptionText}
            </m.p>

            {/* Features Grid */}
            <m.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              viewport={{ once: true }}
              className="grid grid-cols-2 gap-4 mb-10"
            >
              {features.map((feature, index) => (
                <m.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.4 + index * 0.1 }}
                  viewport={{ once: true }}
                  className="group"
                >
                  <GlassCard className="transition-colors group-hover:border-border-strong">
                    <div className="p-4">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3 border border-primary/20 bg-primary/10">
                        <feature.icon className="w-5 h-5 text-primary" />
                      </div>
                      <h3 className="font-semibold mb-1 text-foreground group-hover:text-primary transition-colors">
                        {feature.title}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {feature.description}
                      </p>
                    </div>
                  </GlassCard>
                </m.div>
              ))}
            </m.div>

            {/* Download buttons — or the one plate that stands in for them */}
            <m.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              viewport={{ once: true }}
              className="flex flex-col sm:flex-row gap-4"
            >
              {comingSoon ? (
                /* ONE plate where two buttons were.
                   It keeps the buttons' silhouette and fill so the band reads
                   the same, and carries BOTH marks because "coming soon" that
                   does not say where is a smaller promise than the two buttons
                   it stands in for.
                   It is a `div`, not an `a` and not a `button`: a store-button
                   shape that does nothing when pressed is worse than no button,
                   and `cursor-default` keeps the pointer honest about that. */
                <div className="inline-flex items-center gap-4 self-start bg-foreground text-background px-6 py-4 rounded-xl font-medium cursor-default">
                  <div className="flex items-center gap-3">
                    <AppleMark className="w-8 h-8" />
                    <GooglePlayMark className="w-8 h-8" />
                  </div>
                  <div className="text-left text-lg font-bold">{comingSoonText}</div>
                </div>
              ) : (
                <>
                  {hasAppStoreLink && (
                    <m.a
                      href={settings.appStoreLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="group relative inline-flex items-center gap-4 bg-foreground text-background px-6 py-4 rounded-xl font-medium transition-opacity duration-200 hover:opacity-90"
                    >
                      <div className="w-10 h-10 relative">
                        <AppleMark className="w-full h-full" />
                      </div>
                      <div className="text-left">
                        <div className="text-xs opacity-60">{t("download_on_the") || t("download_on_the")}</div>
                        <div className="text-lg font-bold">App Store</div>
                      </div>
                    </m.a>
                  )}

                  {hasGooglePlayLink && (
                    <m.a
                      href={settings.googlePlayLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="group relative inline-flex items-center gap-4 bg-foreground text-background px-6 py-4 rounded-xl font-medium transition-opacity duration-200 hover:opacity-90"
                    >
                      <div className="w-10 h-10 relative">
                        <GooglePlayMark className="w-full h-full" />
                      </div>
                      <div className="text-left">
                        <div className="text-xs opacity-60">{t("get_it_on") || t("get_it_on")}</div>
                        <div className="text-lg font-bold">Google Play</div>
                      </div>
                    </m.a>
                  )}
                </>
              )}
            </m.div>

            {/* QR Code hint — there is nothing to scan before the apps ship,
                so the announcement drops it rather than inviting a scan that
                would lead nowhere. */}
            {!comingSoon && (
              <m.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.8 }}
                viewport={{ once: true }}
                className="flex items-center gap-2 mt-6 text-sm text-muted-foreground"
              >
                <QrCode className="w-4 h-4" />
                <span>{t("scan_qr_to_download") || t("or_scan_the_qr_code_to_download")}</span>
              </m.div>
            )}
          </m.div>

          {/* Phone Mockup Side */}
          <m.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="order-1 lg:order-2 flex justify-center"
          >
            <m.div
              style={{
                y: isScrollReady ? smoothPhoneY : 0,
                rotateZ: isScrollReady ? smoothPhoneRotate : 0,
              }}
              className="relative"
            >
              {/* Glow effect behind phone */}
              <div className="absolute inset-0 -z-10 scale-110">
                <div className="w-full h-full rounded-[4rem] bg-primary/20 blur-3xl" />
              </div>

              {/* Phone Frame */}
              <m.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                viewport={{ once: true }}
                className="relative w-[320px] h-[650px] bg-surface-3 rounded-[3.5rem] p-3 shadow-2xl ring-1 ring-border"
              >
                {/* Camera notch */}
                <div className="absolute top-4 left-1/2 -translate-x-1/2 w-32 h-7 bg-overlay rounded-full z-20 flex items-center justify-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-surface-3 ring-1 ring-border-strong" />
                  <div className="w-2 h-2 rounded-full bg-surface-3" />
                </div>

                {/*
                  The screen is a device screenshot, so it stays in the app's
                  dark theme whatever the page theme is. Scoping it with `dark`
                  (the project's class-based variant) means it is painted from
                  the same tokens as the real product rather than from a
                  hand-picked mockup palette — change the brand hue and this
                  changes with it.
                */}
                <div className="dark w-full h-full bg-background rounded-[3rem] overflow-hidden relative">
                  {/* Status Bar */}
                  <div className="absolute top-0 left-0 right-0 h-14 flex items-end justify-between px-8 pb-1 text-foreground text-sm font-medium z-10">
                    <span className="tabular-nums">9:41</span>
                    <div className="flex items-center gap-1.5">
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4].map((i) => (
                          <div key={i} className={cn("w-1 rounded-full", i <= 3 ? "h-3 bg-foreground" : "h-2 bg-muted-foreground")} />
                        ))}
                      </div>
                      <div className="w-6 h-3 border border-muted-foreground rounded-sm ml-1">
                        <div className="w-4 h-1.5 bg-up rounded-sm m-0.5" />
                      </div>
                    </div>
                  </div>

                  {/* App Content */}
                  <div className="pt-16 px-5 pb-8 h-full flex flex-col">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <p className="text-muted-foreground text-xs uppercase tracking-wide">{t("total_balance") || t("total_balance")}</p>
                        <p className="text-foreground text-3xl font-bold font-mono tabular-nums">$24,567.89</p>
                        <div className="flex items-center gap-1 text-up text-sm mt-1 font-mono tabular-nums">
                          <ArrowUpRight className="w-4 h-4" />
                          <span>+12.5%</span>
                        </div>
                      </div>
                      <div className="w-12 h-12 rounded-full border border-primary/20 bg-primary/10 flex items-center justify-center">
                        <span className="text-primary font-bold">JD</span>
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="grid grid-cols-4 gap-2 mb-6">
                      {["Send", "Receive", "Buy", "Sell"].map((action, i) => (
                        <div key={action} className="flex flex-col items-center gap-1">
                          <div className="w-12 h-12 rounded-xl border border-border bg-surface-2 flex items-center justify-center">
                            {i === 0 && <ArrowUpRight className="w-5 h-5 text-foreground" />}
                            {i === 1 && <ArrowDownRight className="w-5 h-5 text-foreground" />}
                            {i === 2 && <Download className="w-5 h-5 text-foreground rotate-180" />}
                            {i === 3 && <Download className="w-5 h-5 text-foreground" />}
                          </div>
                          <span className="text-muted-foreground text-xs">{action}</span>
                        </div>
                      ))}
                    </div>

                    {/* Chart Area */}
                    <div className="border border-border bg-surface-2 rounded-xl p-4 mb-4 flex-1">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-foreground font-semibold">Portfolio</span>
                        <span className="text-xs text-muted-foreground px-2 py-1 rounded bg-surface-3">24H</span>
                      </div>
                      <div className="h-24 relative">
                        <svg className="w-full h-full" viewBox="0 0 280 80" preserveAspectRatio="none">
                          <defs>
                            {/* Token references resolve inside SVG paint attributes — verified in Phase 6. */}
                            <linearGradient id="chartGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                              <stop offset="0%" stopColor="hsl(var(--up))" stopOpacity="0.35" />
                              <stop offset="100%" stopColor="hsl(var(--up))" stopOpacity="0" />
                            </linearGradient>
                          </defs>
                          <path
                            d="M 0 60 Q 30 50 70 45 T 140 35 T 210 25 T 280 15 L 280 80 L 0 80 Z"
                            fill="url(#chartGrad)"
                          />
                          <path
                            d="M 0 60 Q 30 50 70 45 T 140 35 T 210 25 T 280 15"
                            stroke="hsl(var(--up))"
                            strokeWidth="2"
                            fill="none"
                            strokeLinecap="round"
                          />
                        </svg>
                      </div>
                    </div>

                    {/* Asset List */}
                    <div className="space-y-2">
                      {[
                        { name: "Bitcoin", symbol: "BTC", price: "$43,250", change: "+5.2%", up: true },
                        { name: "Ethereum", symbol: "ETH", price: "$2,890", change: "+3.8%", up: true },
                      ].map((asset) => (
                        <div
                          key={asset.symbol}
                          className="flex items-center justify-between p-3 rounded-lg border border-border bg-surface-2"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full border border-border bg-surface-3 flex items-center justify-center text-foreground font-bold text-sm">
                              {asset.symbol[0]}
                            </div>
                            <div>
                              <p className="text-foreground font-medium text-sm">{asset.name}</p>
                              <p className="text-muted-foreground text-xs">{asset.symbol}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-foreground font-medium text-sm font-mono tabular-nums">{asset.price}</p>
                            <p className={cn("text-xs font-mono tabular-nums", asset.up ? "text-up" : "text-down")}>
                              {asset.change}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Bottom Navigation */}
                  <div className="absolute bottom-0 left-0 right-0 h-20 border-t border-border bg-surface-2/90 backdrop-blur-xl flex items-center justify-around px-6">
                    {["Home", "Markets", "Trade", "Wallet"].map((item, i) => (
                      <div key={item} className="flex flex-col items-center gap-1">
                        <div className={cn(
                          "w-6 h-6 rounded flex items-center justify-center",
                          i === 0 ? "text-primary" : "text-subtle-foreground"
                        )}>
                          {i === 0 && <div className="w-5 h-5 rounded bg-primary" />}
                          {i === 1 && <ChartLine className="w-5 h-5" />}
                          {i === 2 && <ArrowUpRight className="w-5 h-5 rotate-45" />}
                          {i === 3 && <Wallet className="w-5 h-5" />}
                        </div>
                        <span className={cn("text-[10px]", i === 0 ? "text-primary" : "text-subtle-foreground")}>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Home Indicator */}
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-28 h-1 bg-border-strong rounded-full" />
              </m.div>

              {/* Floating Cards */}
              <m.div
                initial={{ opacity: 0, scale: 0, x: -50 }}
                whileInView={{ opacity: 1, scale: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.8, type: "spring" }}
                viewport={{ once: true }}
                className="absolute -left-16 top-1/4"
              >
                <GlassCard>
                  <div className="p-4 flex items-center gap-3">
                    {/* A settled transaction is a success state, so it keeps a status colour. */}
                    <div className="w-10 h-10 rounded-lg border border-success/20 bg-success/10 flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-success" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Transaction</p>
                      <p className="font-semibold text-success">Completed</p>
                    </div>
                  </div>
                </GlassCard>
              </m.div>

              <m.div
                initial={{ opacity: 0, scale: 0, x: 50 }}
                whileInView={{ opacity: 1, scale: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 1, type: "spring" }}
                viewport={{ once: true }}
                className="absolute -right-12 top-1/2"
              >
                <GlassCard>
                  <div className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg border border-primary/20 bg-primary/10 flex items-center justify-center">
                      <Shield className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Security</p>
                      <p className="font-semibold text-foreground">Protected</p>
                    </div>
                  </div>
                </GlassCard>
              </m.div>

              <m.div
                initial={{ opacity: 0, scale: 0, y: 50 }}
                whileInView={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 1.2, type: "spring" }}
                viewport={{ once: true }}
                className="absolute -bottom-8 left-1/2 -translate-x-1/2"
              >
                <GlassCard>
                  <div className="p-3 px-5 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium text-foreground">{t("instant_execution")}</span>
                  </div>
                </GlassCard>
              </m.div>
            </m.div>
          </m.div>
        </div>
      </div>
    </section>
  );
}
