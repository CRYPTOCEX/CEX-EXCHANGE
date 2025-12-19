import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ChartContent } from "./content";
import { Legend } from "./legend";
import { ChartTimeframe } from "../../../types/chart";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";

// Chart card animation variants
const cardVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.1,
    },
  },
};

const headerVariants = {
  hidden: { opacity: 0, y: -15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
};

const chartAreaVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.7,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
};

const legendVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
};

export interface ChartCardProps {
  chartKey: string;
  config: any;
  data: any[];
  formatXAxis: (value: string) => string;
  width?: "full" | "half" | "third";
  className?: string;
  loading?: boolean;
  timeframe?: ChartTimeframe;
}

export const ChartCard: React.FC<ChartCardProps> = React.memo(
  ({
    chartKey,
    config,
    data,
    formatXAxis,
    width = "half",
    className,
    loading,
    timeframe,
  }) => {
    const tComponentsBlocks = useTranslations("components_blocks");
    const tCommon = useTranslations("common");
    const hasData = Array.isArray(data) && data.length > 0;

    // Use the title directly (already human-readable)
    const chartTitle = config.title || "";

    return (
      <Card
        className={cn("bg-transparent rounded-xl border relative", className)}
        aria-labelledby={`${chartKey}-title`}
      >
        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="visible"
        >
          <CardHeader>
            <motion.div variants={headerVariants}>
              <CardTitle
                id={`${chartKey}-title`}
                className="text-xl font-semibold tracking-tight"
              >
                {chartTitle}
              </CardTitle>
              <p
                className="text-sm text-muted-foreground"
                id={`${chartKey}-description`}
              >
                {tComponentsBlocks("track_total_and_new_user_growth_trends")}
              </p>
            </motion.div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <motion.div
                variants={chartAreaVariants}
                className="mt-6 h-[400px] flex items-center justify-center"
              >
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </motion.div>
            ) : !hasData ? (
              <motion.div
                variants={chartAreaVariants}
                className="mt-6 h-[400px] flex items-center justify-center"
              >
                <p className="text-muted-foreground">{tCommon("no_data_available")}</p>
              </motion.div>
            ) : (
              <motion.div variants={chartAreaVariants} className="mt-6 h-[400px]">
                <ChartContent
                  chartKey={chartKey}
                  config={config}
                  data={data}
                  formatXAxis={formatXAxis}
                  timeframe={timeframe}
                />
              </motion.div>
            )}
            {hasData && (
              <motion.div variants={legendVariants}>
                <Legend config={config} />
              </motion.div>
            )}
          </CardContent>
        </motion.div>
      </Card>
    );
  }
);

ChartCard.displayName = "ChartCard";

export default ChartCard;
