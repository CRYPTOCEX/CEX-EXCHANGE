import React from "react";
import { TimeframeSelector } from "./timeframe";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";

// Header animation variants
const headerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.1,
    },
  },
};

const titleVariants = {
  hidden: { opacity: 0, x: -30 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
};

const selectorVariants = {
  hidden: { opacity: 0, x: 30 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
};

interface AnalyticsHeaderProps {
  timeframe: string;
  onTimeframeChange: (value: string) => void;
}

export const AnalyticsHeader: React.FC<AnalyticsHeaderProps> = ({
  timeframe,
  onTimeframeChange,
}) => {
  const t = useTranslations("components_blocks");
  return (
    <motion.div
      variants={headerVariants}
      initial="hidden"
      animate="visible"
      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
    >
      <motion.h2
        variants={titleVariants}
        className="text-2xl font-semibold tracking-tight"
      >
        {t("analytics_dashboard")}
      </motion.h2>
      <motion.div variants={selectorVariants}>
        <TimeframeSelector value={timeframe} onChange={onTimeframeChange} />
      </motion.div>
    </motion.div>
  );
};
