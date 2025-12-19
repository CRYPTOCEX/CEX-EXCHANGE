"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { motion, useScroll, useTransform, useSpring, MotionValue } from "framer-motion";
import {
  Download,
  Smartphone,
  Star,
  Shield,
  Zap,
  Bell,
  Fingerprint,
  ChartLine,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  QrCode,
  CheckCircle,
} from "lucide-react";
import Image from "next/image";
import { useConfigStore } from "@/store/config";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

// Floating shape component with parallax
interface ShapeData {
  id: number;
  type: "circle" | "square" | "triangle" | "ring" | "hexagon";
  size: number;
  x: number;
  y: number;
  color: string;
  parallaxMultiplier: number;
  rotation: number;
  blur?: number;
}

function FloatingShape({
  shape,
  scrollYProgress,
}: {
  shape: ShapeData;
  scrollYProgress: MotionValue<number>;
}) {
  const y = useTransform(
    scrollYProgress,
    [0, 1],
    [-60 * shape.parallaxMultiplier, 60 * shape.parallaxMultiplier]
  );
  const rotate = useTransform(
    scrollYProgress,
    [0, 1],
    [shape.rotation, shape.rotation + 60]
  );
  const smoothY = useSpring(y, { stiffness: 50, damping: 20 });
  const smoothRotate = useSpring(rotate, { stiffness: 50, damping: 20 });

  const renderShape = () => {
    switch (shape.type) {
      case "circle":
        return (
          <div
            className="w-full h-full rounded-full"
            style={{
              background: `linear-gradient(135deg, ${shape.color}20, ${shape.color}05)`,
              border: `1px solid ${shape.color}30`,
              filter: shape.blur ? `blur(${shape.blur}px)` : undefined,
            }}
          />
        );
      case "square":
        return (
          <div
            className="w-full h-full rounded-2xl"
            style={{
              background: `linear-gradient(135deg, ${shape.color}15, transparent)`,
              border: `1px solid ${shape.color}20`,
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
              background: `linear-gradient(180deg, ${shape.color}20, ${shape.color}05)`,
              filter: shape.blur ? `blur(${shape.blur}px)` : undefined,
            }}
          />
        );
      case "ring":
        return (
          <div
            className="w-full h-full rounded-full"
            style={{
              border: `2px solid ${shape.color}30`,
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
              background: `linear-gradient(180deg, ${shape.color}15, ${shape.color}05)`,
              filter: shape.blur ? `blur(${shape.blur}px)` : undefined,
            }}
          />
        );
      default:
        return null;
    }
  };

  return (
    <motion.div
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
    </motion.div>
  );
}

// Glass card component
function GlassCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn(
      "relative rounded-3xl p-[1px]",
      "bg-gradient-to-b from-white/20 to-white/5",
      className
    )}>
      <div className="rounded-3xl bg-background/80 backdrop-blur-xl h-full">
        {children}
      </div>
    </div>
  );
}

export function MobileAppSection() {
  const t = useTranslations("common");
  const { settings } = useConfigStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isScrollReady, setIsScrollReady] = useState(false);

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
  const showSection = hasAppStoreLink || hasGooglePlayLink;

  // Generate floating shapes
  const shapes = useMemo<ShapeData[]>(() => {
    const colors = ["#3b82f6", "#8b5cf6", "#06b6d4", "#ec4899", "#10b981"];
    const types: ShapeData["type"][] = ["circle", "square", "triangle", "ring", "hexagon"];

    return Array.from({ length: 12 }, (_, i) => {
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
        color: colors[Math.floor(seededRandom(seed + 4) * colors.length)],
        parallaxMultiplier: 0.3 + seededRandom(seed + 5) * 0.8,
        rotation: seededRandom(seed + 6) * 360,
        blur: seededRandom(seed + 7) > 0.7 ? 2 : 0,
      };
    });
  }, []);

  // Phone float animation
  const phoneY = useTransform(scrollYProgress, [0, 1], [50, -50]);
  const phoneRotate = useTransform(scrollYProgress, [0, 1], [-5, 5]);
  const smoothPhoneY = useSpring(phoneY, { stiffness: 50, damping: 20 });
  const smoothPhoneRotate = useSpring(phoneRotate, { stiffness: 50, damping: 20 });

  if (!showSection) {
    return null;
  }

  const features = [
    {
      icon: Fingerprint,
      title: t("biometric_security") || "Biometric Security",
      description: t("biometric_desc") || "Face ID & fingerprint login",
      gradient: "from-emerald-500 to-teal-500",
    },
    {
      icon: Bell,
      title: t("instant_alerts") || "Instant Alerts",
      description: t("alerts_desc") || "Real-time price notifications",
      gradient: "from-blue-500 to-cyan-500",
    },
    {
      icon: ChartLine,
      title: t("live_charts") || "Live Charts",
      description: t("charts_desc") || "Professional trading tools",
      gradient: "from-purple-500 to-pink-500",
    },
    {
      icon: Wallet,
      title: t("multi_wallet") || "Multi-Wallet",
      description: t("wallet_desc") || "Manage all your assets",
      gradient: "from-orange-500 to-red-500",
    },
  ];

  return (
    <section
      ref={containerRef}
      className="relative py-24 lg:py-32 overflow-hidden"
    >
      {/* Floating Shapes Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {isScrollReady && shapes.map((shape) => (
          <FloatingShape
            key={shape.id}
            shape={shape}
            scrollYProgress={scrollYProgress}
          />
        ))}
      </div>

      {/* Gradient Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            x: [0, 30, 0],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/4 -left-32 w-96 h-96 rounded-full opacity-30 blur-[100px]"
          style={{ background: "radial-gradient(circle, rgba(139, 92, 246, 0.6) 0%, transparent 70%)" }}
        />
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            x: [0, -20, 0],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut", delay: 5 }}
          className="absolute bottom-1/4 -right-32 w-96 h-96 rounded-full opacity-30 blur-[100px]"
          style={{ background: "radial-gradient(circle, rgba(59, 130, 246, 0.6) 0%, transparent 70%)" }}
        />
      </div>

      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
          {/* Content Side */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="order-2 lg:order-1"
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
            >
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 text-purple-400 mb-8">
                <Smartphone className="w-4 h-4" />
                {t("download_our_app") || "Download Our App"}
              </span>
            </motion.div>

            {/* Heading */}
            <motion.h2
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              viewport={{ once: true }}
              className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 tracking-tight"
            >
              {t("trade_on_the_go") || "Trade on the Go"}
              <span className="block bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
                {t("anytime_anywhere") || "Anytime, Anywhere"}
              </span>
            </motion.h2>

            {/* Description */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
              className="text-xl text-muted-foreground mb-10 leading-relaxed max-w-xl"
            >
              {t("experience_seamless_cryptocurrency_trading") ||
                "Experience seamless cryptocurrency trading with our powerful mobile app. Access all features from your pocket."}
            </motion.p>

            {/* Features Grid */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              viewport={{ once: true }}
              className="grid grid-cols-2 gap-4 mb-10"
            >
              {features.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.4 + index * 0.1 }}
                  viewport={{ once: true }}
                  className="group"
                >
                  <GlassCard>
                    <div className="p-4">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center mb-3 bg-gradient-to-br",
                        feature.gradient
                      )}>
                        <feature.icon className="w-5 h-5 text-white" />
                      </div>
                      <h3 className="font-semibold mb-1 group-hover:text-purple-400 transition-colors">
                        {feature.title}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {feature.description}
                      </p>
                    </div>
                  </GlassCard>
                </motion.div>
              ))}
            </motion.div>

            {/* Download Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              viewport={{ once: true }}
              className="flex flex-col sm:flex-row gap-4"
            >
              {hasAppStoreLink && (
                <motion.a
                  href={settings.appStoreLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="group relative inline-flex items-center gap-4 bg-white text-black px-6 py-4 rounded-2xl font-medium transition-all duration-300 hover:shadow-xl hover:shadow-white/10"
                >
                  <div className="w-10 h-10 relative">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
                      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                    </svg>
                  </div>
                  <div className="text-left">
                    <div className="text-xs opacity-60">{t("download_on_the") || "Download on the"}</div>
                    <div className="text-lg font-bold">App Store</div>
                  </div>
                </motion.a>
              )}

              {hasGooglePlayLink && (
                <motion.a
                  href={settings.googlePlayLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="group relative inline-flex items-center gap-4 bg-white text-black px-6 py-4 rounded-2xl font-medium transition-all duration-300 hover:shadow-xl hover:shadow-white/10"
                >
                  <div className="w-10 h-10 relative">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
                      <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/>
                    </svg>
                  </div>
                  <div className="text-left">
                    <div className="text-xs opacity-60">{t("get_it_on") || "GET IT ON"}</div>
                    <div className="text-lg font-bold">Google Play</div>
                  </div>
                </motion.a>
              )}
            </motion.div>

            {/* QR Code hint */}
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.8 }}
              viewport={{ once: true }}
              className="flex items-center gap-2 mt-6 text-sm text-muted-foreground"
            >
              <QrCode className="w-4 h-4" />
              <span>{t("scan_qr_to_download") || "Or scan the QR code to download"}</span>
            </motion.div>
          </motion.div>

          {/* Phone Mockup Side */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="order-1 lg:order-2 flex justify-center"
          >
            <motion.div
              style={{
                y: isScrollReady ? smoothPhoneY : 0,
                rotateZ: isScrollReady ? smoothPhoneRotate : 0,
              }}
              className="relative"
            >
              {/* Glow effect behind phone */}
              <div className="absolute inset-0 -z-10 scale-110">
                <div className="w-full h-full rounded-[4rem] bg-gradient-to-br from-purple-500/30 via-blue-500/30 to-cyan-500/30 blur-3xl" />
              </div>

              {/* Phone Frame */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                viewport={{ once: true }}
                className="relative w-[320px] h-[650px] bg-gradient-to-b from-zinc-800 to-zinc-900 rounded-[3.5rem] p-3 shadow-2xl ring-1 ring-white/10"
              >
                {/* Camera notch */}
                <div className="absolute top-4 left-1/2 -translate-x-1/2 w-32 h-7 bg-black rounded-full z-20 flex items-center justify-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-zinc-800 ring-1 ring-zinc-700" />
                  <div className="w-2 h-2 rounded-full bg-zinc-800" />
                </div>

                {/* Screen */}
                <div className="w-full h-full bg-gradient-to-br from-slate-900 via-purple-900/50 to-slate-900 rounded-[3rem] overflow-hidden relative">
                  {/* Status Bar */}
                  <div className="absolute top-0 left-0 right-0 h-14 flex items-end justify-between px-8 pb-1 text-white text-sm font-medium z-10">
                    <span>9:41</span>
                    <div className="flex items-center gap-1.5">
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4].map((i) => (
                          <div key={i} className={cn("w-1 rounded-full", i <= 3 ? "h-3 bg-white" : "h-2 bg-white/40")} />
                        ))}
                      </div>
                      <div className="w-6 h-3 border border-white/60 rounded-sm ml-1">
                        <div className="w-4 h-1.5 bg-emerald-400 rounded-sm m-0.5" />
                      </div>
                    </div>
                  </div>

                  {/* App Content */}
                  <div className="pt-16 px-5 pb-8 h-full flex flex-col">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <p className="text-white/60 text-sm">{t("total_balance") || "Total Balance"}</p>
                        <p className="text-white text-3xl font-bold">$24,567.89</p>
                        <div className="flex items-center gap-1 text-emerald-400 text-sm mt-1">
                          <ArrowUpRight className="w-4 h-4" />
                          <span>+12.5%</span>
                        </div>
                      </div>
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                        <span className="text-white font-bold">JD</span>
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="grid grid-cols-4 gap-2 mb-6">
                      {["Send", "Receive", "Buy", "Sell"].map((action, i) => (
                        <div key={action} className="flex flex-col items-center gap-1">
                          <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center">
                            {i === 0 && <ArrowUpRight className="w-5 h-5 text-white" />}
                            {i === 1 && <ArrowDownRight className="w-5 h-5 text-white" />}
                            {i === 2 && <Download className="w-5 h-5 text-white rotate-180" />}
                            {i === 3 && <Download className="w-5 h-5 text-white" />}
                          </div>
                          <span className="text-white/60 text-xs">{action}</span>
                        </div>
                      ))}
                    </div>

                    {/* Chart Area */}
                    <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-4 mb-4 flex-1">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-white font-semibold">Portfolio</span>
                        <span className="text-xs text-white/60 px-2 py-1 rounded-full bg-white/10">24H</span>
                      </div>
                      <div className="h-24 relative">
                        <svg className="w-full h-full" viewBox="0 0 280 80" preserveAspectRatio="none">
                          <defs>
                            <linearGradient id="chartGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                              <stop offset="0%" stopColor="#a855f7" stopOpacity="0.4" />
                              <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
                            </linearGradient>
                          </defs>
                          <path
                            d="M 0 60 Q 30 50 70 45 T 140 35 T 210 25 T 280 15 L 280 80 L 0 80 Z"
                            fill="url(#chartGrad)"
                          />
                          <path
                            d="M 0 60 Q 30 50 70 45 T 140 35 T 210 25 T 280 15"
                            stroke="#a855f7"
                            strokeWidth="3"
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
                          className="flex items-center justify-between p-3 rounded-2xl bg-white/5 backdrop-blur-sm"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold text-sm">
                              {asset.symbol[0]}
                            </div>
                            <div>
                              <p className="text-white font-medium text-sm">{asset.name}</p>
                              <p className="text-white/50 text-xs">{asset.symbol}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-white font-medium text-sm">{asset.price}</p>
                            <p className={cn("text-xs", asset.up ? "text-emerald-400" : "text-red-400")}>
                              {asset.change}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Bottom Navigation */}
                  <div className="absolute bottom-0 left-0 right-0 h-20 bg-black/50 backdrop-blur-xl flex items-center justify-around px-6">
                    {["Home", "Markets", "Trade", "Wallet"].map((item, i) => (
                      <div key={item} className="flex flex-col items-center gap-1">
                        <div className={cn(
                          "w-6 h-6 rounded-lg flex items-center justify-center",
                          i === 0 ? "text-purple-400" : "text-white/40"
                        )}>
                          {i === 0 && <div className="w-5 h-5 rounded bg-purple-400" />}
                          {i === 1 && <ChartLine className="w-5 h-5" />}
                          {i === 2 && <ArrowUpRight className="w-5 h-5 rotate-45" />}
                          {i === 3 && <Wallet className="w-5 h-5" />}
                        </div>
                        <span className={cn("text-[10px]", i === 0 ? "text-purple-400" : "text-white/40")}>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Home Indicator */}
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-28 h-1 bg-white/30 rounded-full" />
              </motion.div>

              {/* Floating Cards */}
              <motion.div
                initial={{ opacity: 0, scale: 0, x: -50 }}
                whileInView={{ opacity: 1, scale: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.8, type: "spring" }}
                viewport={{ once: true }}
                className="absolute -left-16 top-1/4"
              >
                <GlassCard>
                  <div className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Transaction</p>
                      <p className="font-semibold text-emerald-400">Completed</p>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0, x: 50 }}
                whileInView={{ opacity: 1, scale: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 1, type: "spring" }}
                viewport={{ once: true }}
                className="absolute -right-12 top-1/2"
              >
                <GlassCard>
                  <div className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                      <Shield className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Security</p>
                      <p className="font-semibold">Protected</p>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0, y: 50 }}
                whileInView={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 1.2, type: "spring" }}
                viewport={{ once: true }}
                className="absolute -bottom-8 left-1/2 -translate-x-1/2"
              >
                <GlassCard>
                  <div className="p-3 px-5 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-yellow-400" />
                    <span className="text-sm font-medium">Instant Execution</span>
                  </div>
                </GlassCard>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
