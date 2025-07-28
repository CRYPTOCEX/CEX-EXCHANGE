"use client";

import { motion, useTransform, useScroll } from "framer-motion";
import { useRef } from "react";
import Image from "next/image";
import { Link } from "@/i18n/routing";
import { ArrowRight, Shield, Truck, Clock, Zap } from "lucide-react";
import { useTranslations } from "next-intl";

export default function HeroSection() {
  const t = useTranslations("ext");
  // Refs for parallax effects
  const heroRef = useRef<HTMLDivElement>(null);

  // Scroll animations
  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 500], [0, 150]);
  const heroOpacity = useTransform(scrollY, [0, 300], [1, 0.3]);

  return (
    <div className="relative overflow-hidden min-h-screen" ref={heroRef}>
      <motion.div
        className="absolute inset-0"
        style={{
          y: heroY,
          opacity: heroOpacity,
        }}
      >
        <Image
          src="/img/home/ecommerce/banner.avif"
          alt="Hero background"
          fill
          className="object-cover"
          priority
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-900/90 via-indigo-900/70 to-transparent" />
      </motion.div>
      <div className="relative max-w-7xl mx-auto py-32 px-4 sm:px-6 lg:px-8 flex items-center min-h-screen">
        <motion.div
          className="max-w-2xl"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.8,
            delay: 0.2,
          }}
        >
          <motion.div
            className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300 mb-6"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            <Zap className="h-4 w-4 mr-2" />
            {t("now_accepting_bitcoin_ethereum_&_more")}
          </motion.div>
          <motion.h1
            className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.7 }}
          >
            {t("the_future_of")}{" "}
            <motion.span
              className="text-indigo-400"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                delay: 1.2,
                duration: 0.5,
                type: "spring",
                stiffness: 200,
              }}
            >
              {t("Shopping")}
            </motion.span>{" "}
            {t("is_here")}
          </motion.h1>
          <motion.p
            className="mt-6 text-xl text-gray-300 dark:text-zinc-300 max-w-xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.0, duration: 0.7 }}
          >
            {t("experience_seamless_transactions_with_cryptocurrency")}.{" "}
            {t("browse_our_curated_blockchain_technology")}.
          </motion.p>
          <motion.div
            className="mt-10 flex flex-col sm:flex-row gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.3, duration: 0.7 }}
          >
            <Link
              href="/ecommerce/product"
              className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
            >
              {t("shop_now")}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
            <Link
              href="/ecommerce/category"
              className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 dark:border-zinc-700 text-base font-medium rounded-md text-white hover:bg-white/10 transition-all duration-200 transform hover:scale-105"
            >
              {t("explore_categories")}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </motion.div>

          <motion.div
            className="mt-12 grid grid-cols-3 gap-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5, duration: 0.7 }}
          >
            <motion.div
              className="flex items-center text-white"
              whileHover={{ scale: 1.05, x: 5 }}
            >
              <Shield className="h-5 w-5 mr-2 text-indigo-400" />
              <span className="text-sm">{t("secure_payments")}</span>
            </motion.div>
            <motion.div
              className="flex items-center text-white"
              whileHover={{ scale: 1.05, x: 5 }}
            >
              <Truck className="h-5 w-5 mr-2 text-indigo-400" />
              <span className="text-sm">{t("fast_delivery")}</span>
            </motion.div>
            <motion.div
              className="flex items-center text-white"
              whileHover={{ scale: 1.05, x: 5 }}
            >
              <Clock className="h-5 w-5 mr-2 text-indigo-400" />
              <span className="text-sm">{t("24_7_support")}</span>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
