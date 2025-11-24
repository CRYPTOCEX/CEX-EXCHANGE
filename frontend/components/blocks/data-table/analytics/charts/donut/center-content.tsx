"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChartData } from "./types";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslations } from "next-intl";

interface CenterContentProps {
  activeSegment: string | null;
  data: ChartData[];
  total: number;
  loading: boolean;
  isFirstLoad: boolean;
}

function CenterContentImpl({
  activeSegment,
  data,
  total,
  loading,
  isFirstLoad,
}: CenterContentProps) {
  const t = useTranslations(
    "components/blocks/data-table/analytics/charts/donut/center-content"
  );
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <AnimatePresence mode="wait">
        {loading && !isFirstLoad ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center"
          >
            <Skeleton className="h-8 w-24 mx-auto mb-1" />
            <div className="text-xs text-muted-foreground">{t("Total")}</div>
          </motion.div>
        ) : activeSegment ? (
          <motion.div
            key={activeSegment}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="text-center"
          >
            <div className="text-xl sm:text-2xl font-bold mb-1">
              {(
                ((data.find((d) => d.id === activeSegment)?.value || 0) /
                  total) *
                100
              ).toFixed(1)}
              %
            </div>
            <div className="text-xs text-muted-foreground">
              {data.find((d) => d.id === activeSegment)?.name}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="total"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center"
          >
            <div className="text-xl sm:text-2xl font-bold mb-1">
              {total.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">{t("Total")}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export const CenterContent = React.memo(CenterContentImpl);
