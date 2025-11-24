"use client";

import type React from "react";

import { motion } from "framer-motion";
import { Shield, TrendingUp, Gift } from "lucide-react";
import { useAnimateOnScroll } from "../../hooks/use-animate-on-scroll";
import { useTranslations } from "next-intl";

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemFadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5 },
  },
};

export default function FeaturesSection() {
  const t = useTranslations("ext");
  const featuresSection = useAnimateOnScroll();

  return (
    <motion.div
      className="bg-gray-50 dark:bg-zinc-800 py-20"
      ref={featuresSection.ref}
      initial="hidden"
      animate={featuresSection.controls}
      variants={featuresSection.variants}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center max-w-3xl mx-auto mb-16"
          variants={itemFadeIn}
        >
          <h2 className="text-3xl font-bold text-gray-900 dark:text-zinc-100 sm:text-4xl">
            {t("why_shop_with_cryptocurrency")}
          </h2>
          <p className="mt-4 text-lg text-gray-600 dark:text-zinc-400">
            {t("experience_the_future_cryptocurrency-enabled_platform")}.
          </p>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-8"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          <FeatureCard
            icon={<Shield className="h-8 w-8" />}
            title="Enhanced Security"
            description="Blockchain technology ensures your transactions are secure and your personal data remains private."
          />

          <FeatureCard
            icon={<TrendingUp className="h-8 w-8" />}
            title="Investment Opportunity"
            description="Use your cryptocurrency investments directly for purchases, potentially benefiting from value appreciation."
          />

          <FeatureCard
            icon={<Gift className="h-8 w-8" />}
            title="Exclusive Rewards"
            description="Enjoy special discounts, promotions, and loyalty rewards available only to cryptocurrency shoppers."
          />
        </motion.div>
      </div>
    </motion.div>
  );
}

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <motion.div
      className="bg-white dark:bg-zinc-900/80 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 text-center"
      variants={itemFadeIn}
      whileHover={{
        y: -10,
        boxShadow:
          "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
      }}
    >
      <motion.div
        className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400 mb-6"
        whileHover={{ rotate: 360 }}
        transition={{ duration: 0.6 }}
      >
        {icon}
      </motion.div>
      <h3 className="text-xl font-bold text-gray-900 dark:text-zinc-100 mb-4">
        {title}
      </h3>
      <p className="text-gray-600 dark:text-zinc-400">{description}</p>
    </motion.div>
  );
}
