"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Download, Smartphone, Star, Shield, Zap } from "lucide-react";
import Image from "next/image";
import { useConfigStore } from "@/store/config";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";

export function MobileAppSection() {
  const t = useTranslations("home");
  const { settings } = useConfigStore();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const [isVisible, setIsVisible] = useState(false);

  // Check if either app store link or google play link is configured
  const hasAppStoreLink = settings?.appStoreLink && settings.appStoreLink.trim() !== "";
  const hasGooglePlayLink = settings?.googlePlayLink && settings.googlePlayLink.trim() !== "";
  const showSection = hasAppStoreLink || hasGooglePlayLink;

  useEffect(() => {
    if (showSection) {
      setIsVisible(true);
    }
  }, [showSection]);

  if (!showSection || !isVisible) {
    return null;
  }

  return (
    <section className="py-16 md:py-24 lg:py-32 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-full blur-3xl" />
        <div
          className={cn(
            "absolute inset-0 bg-gradient-to-br",
            isDark
              ? "from-zinc-900/50 via-transparent to-zinc-900/50"
              : "from-gray-50/50 via-transparent to-gray-50/50"
          )}
        />
      </div>

      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Content Side */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="order-2 lg:order-1"
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-950/50 dark:to-purple-950/50 border border-blue-200 dark:border-blue-800/50 rounded-full px-4 py-2 text-sm font-medium text-blue-700 dark:text-blue-300 mb-8"
            >
              <Smartphone className="w-4 h-4" />
              {t("download_our_app")}
            </motion.div>

            {/* Heading */}
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              viewport={{ once: true }}
              className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6"
            >
              {t("trade_on_the_go")}
              <span className="block bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
                {t("anytime_anywhere")}
              </span>
            </motion.h2>

            {/* Description */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              viewport={{ once: true }}
              className={cn(
                "text-lg md:text-xl mb-8 leading-relaxed",
                isDark ? "text-zinc-300" : "text-gray-600"
              )}
            >
              {t("experience_seamless_cryptocurrency_trading")}
            </motion.p>

            {/* Features */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              viewport={{ once: true }}
              className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10"
            >
              {[
                {
                  icon: Shield,
                  title: "Secure Trading",
                  description: "Bank-level security"
                },
                {
                  icon: Zap,
                  title: "Lightning Fast",
                  description: "Instant transactions"
                },
                {
                  icon: Star,
                  title: "User Friendly",
                  description: "Intuitive interface"
                }
              ].map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.6 + index * 0.1 }}
                  viewport={{ once: true }}
                  className="text-center"
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-semibold mb-1">{feature.title}</h3>
                  <p className={cn("text-sm", isDark ? "text-zinc-400" : "text-gray-500")}>
                    {feature.description}
                  </p>
                </motion.div>
              ))}
            </motion.div>

            {/* Download Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.8 }}
              viewport={{ once: true }}
              className="flex flex-col sm:flex-row gap-4"
            >
              {hasAppStoreLink && (
                <a
                  href={settings.appStoreLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative inline-flex items-center justify-center gap-3 bg-black hover:bg-gray-800 text-white px-6 py-4 rounded-2xl font-medium transition-all duration-300 hover:scale-105 hover:shadow-xl"
                >
                  <div className="w-8 h-8 relative">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
                      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                    </svg>
                  </div>
                  <div className="text-left">
                    <div className="text-xs opacity-75">{t("download_on_the")}</div>
                    <div className="text-lg font-semibold">App Store</div>
                  </div>
                </a>
              )}

              {hasGooglePlayLink && (
                <a
                  href={settings.googlePlayLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative inline-flex items-center justify-center gap-3 bg-black hover:bg-gray-800 text-white px-6 py-4 rounded-2xl font-medium transition-all duration-300 hover:scale-105 hover:shadow-xl"
                >
                  <div className="w-8 h-8 relative">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
                      <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/>
                    </svg>
                  </div>
                  <div className="text-left">
                    <div className="text-xs opacity-75">{t("get_it_on")}</div>
                    <div className="text-lg font-semibold">Google Play</div>
                  </div>
                </a>
              )}
            </motion.div>
          </motion.div>

          {/* Phone Mockup Side */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="order-1 lg:order-2 flex justify-center"
          >
            <div className="relative">
              {/* Phone Frame */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.3 }}
                viewport={{ once: true }}
                className="relative w-80 h-[600px] bg-gradient-to-br from-gray-900 to-black rounded-[3rem] p-4 shadow-2xl"
              >
                {/* Screen */}
                <div className="w-full h-full bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-600 rounded-[2.5rem] overflow-hidden relative">
                  {/* Status Bar */}
                  <div className="absolute top-0 left-0 right-0 h-12 bg-black/20 flex items-center justify-between px-6 text-white text-sm">
                    <span>9:41</span>
                    <div className="flex items-center gap-1">
                      <div className="w-4 h-2 border border-white/50 rounded-sm">
                        <div className="w-3 h-1 bg-white rounded-sm"></div>
                      </div>
                    </div>
                  </div>

                  {/* App Content */}
                  <div className="pt-12 p-6 h-full flex flex-col">
                    {/* Header */}
                    <div className="text-center text-white mb-8">
                      <h3 className="text-2xl font-bold mb-2">{t("trading_dashboard")}</h3>
                      <p className="text-white/80 text-sm">{t("portfolio_balance")}</p>
                      <p className="text-3xl font-bold mt-2">$24,567.89</p>
                    </div>

                    {/* Mock Chart */}
                    <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 mb-6 flex-1">
                      <div className="h-32 relative">
                        <svg className="w-full h-full" viewBox="0 0 300 120">
                          <path
                            d="M 10 80 Q 50 60 100 70 T 200 50 T 290 30"
                            stroke="white"
                            strokeWidth="3"
                            fill="none"
                            strokeLinecap="round"
                          />
                          <defs>
                            <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                              <stop offset="0%" stopColor="white" stopOpacity="0.3" />
                              <stop offset="100%" stopColor="white" stopOpacity="0" />
                            </linearGradient>
                          </defs>
                          <path
                            d="M 10 80 Q 50 60 100 70 T 200 50 T 290 30 L 290 120 L 10 120 Z"
                            fill="url(#chartGradient)"
                          />
                        </svg>
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center">
                        <div className="text-white/80 text-xs mb-1">{t("Buy")}</div>
                        <div className="text-white font-semibold">BTC</div>
                      </div>
                      <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center">
                        <div className="text-white/80 text-xs mb-1">{t("Sell")}</div>
                        <div className="text-white font-semibold">ETH</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Home Indicator */}
                <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-32 h-1 bg-white/30 rounded-full"></div>
              </motion.div>

              {/* Floating Elements */}
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.8 }}
                viewport={{ once: true }}
                className="absolute -top-4 -right-4 w-16 h-16 bg-green-500 rounded-2xl flex items-center justify-center shadow-xl"
              >
                <Download className="w-8 h-8 text-white" />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 1 }}
                viewport={{ once: true }}
                className="absolute -bottom-4 -left-4 w-20 h-12 bg-blue-500 rounded-xl flex items-center justify-center shadow-xl"
              >
                <div className="text-white text-xs font-bold">24/7</div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
} 