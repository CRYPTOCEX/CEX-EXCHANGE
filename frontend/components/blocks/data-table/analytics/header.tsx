import React from "react";
import { TimeframeSelector } from "./timeframe";
import { useTranslations } from "next-intl";

/* Mounts at rest. The title used to slide in from `x: -30` and the timeframe
   selector from `x: 30`, 150ms apart — two elements converging on a heading row
   that never moved. */

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
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <h2 className="text-2xl font-semibold tracking-tight">
        {t("analytics_dashboard")}
      </h2>
      <div>
        <TimeframeSelector value={timeframe} onChange={onTimeframeChange} />
      </div>
    </div>
  );
};
