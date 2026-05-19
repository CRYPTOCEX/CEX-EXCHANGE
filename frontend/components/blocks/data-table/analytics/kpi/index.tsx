import React, { useState, useCallback } from "react";
import PropTypes from "prop-types";
import { Card, CardContent } from "@/components/ui/card";
import { Value } from "./value";
import { Change } from "./change";
import { Chart } from "./chart";
import { Icon } from "./icon";
import { motion } from "framer-motion";

// KPI card internal animation variants
const cardContentVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.1,
    },
  },
};

const headerVariants = {
  hidden: { opacity: 0, y: -10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
};

const valueRowVariants = {
  hidden: { opacity: 0, x: -15 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
};

const chartVariants = {
  hidden: { opacity: 0, y: 15, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
};

export interface KpiCardProps {
  id: string;
  title: string;
  value?: number;
  change?: number;
  trend: Array<{ date: string; value: number }>;
  variant?:
    | "success"
    | "danger"
    | "warning"
    | "info"
    | "primary"
    | "secondary"
    | "muted"
    | "default";
  icon?: string;
  loading?: boolean;
  timeframe?: string; // e.g. "24h"
}

// 1) Define a base function
function KpiCardImpl({
  id,
  title,
  value,
  change,
  trend,
  variant = "primary",
  icon,
  loading = false,
  timeframe,
}: KpiCardProps) {
  const [hoveredValue, setHoveredValue] = useState<number | undefined>(
    undefined
  );
  const [hoveredChange, setHoveredChange] = useState<number | undefined>(
    undefined
  );

  const handleChartHover = useCallback(
    (hoverData: { value: number; change: number } | null) => {
      if (hoverData) {
        setHoveredValue(hoverData.value);
        setHoveredChange(hoverData.change);
      } else {
        setHoveredValue(undefined);
        setHoveredChange(undefined);
      }
    },
    []
  );

  return (
    <Card className="bg-transparent relative overflow-hidden">
      <motion.div
        variants={cardContentVariants}
        initial="hidden"
        animate="visible"
      >
        <CardContent className="p-6 pb-24">
          <motion.div
            variants={headerVariants}
            className="flex items-center justify-between mb-4"
          >
            <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
            <Icon icon={icon} />
          </motion.div>
          <motion.div
            variants={valueRowVariants}
            className="flex items-center justify-between mb-4"
          >
            <Value value={hoveredValue ?? value} loading={loading} />
            <Change change={hoveredChange ?? change} loading={loading} />
          </motion.div>
          <motion.div variants={chartVariants}>
            <Chart
              id={id}
              trend={trend ?? []}
              variant={variant}
              loading={loading}
              onHover={handleChartHover}
              timeframe={timeframe === "24h" ? "24h" : "other"}
            />
          </motion.div>
        </CardContent>
      </motion.div>
    </Card>
  );
}

// 2) Assign propTypes & displayName **on the base function**
KpiCardImpl.propTypes = {
  id: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  value: PropTypes.number,
  change: PropTypes.number,
  trend: PropTypes.arrayOf(
    PropTypes.shape({
      date: PropTypes.string.isRequired,
      value: PropTypes.number.isRequired,
    })
  ).isRequired,
  variant: PropTypes.oneOf([
    "success",
    "danger",
    "warning",
    "info",
    "primary",
    "secondary",
    "muted",
    "default",
  ]),
  icon: PropTypes.string,
  loading: PropTypes.bool,
  timeframe: PropTypes.string,
};

KpiCardImpl.displayName = "KpiCard";

// 3) Export a memoized version
export const KpiCard = React.memo(KpiCardImpl);
