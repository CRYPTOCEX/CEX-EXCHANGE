import React from "react";
import { TimeframeSelector } from "./timeframe";
interface AnalyticsHeaderProps {
  timeframe: string;
  onTimeframeChange: (value: string) => void;
}
export const AnalyticsHeader: React.FC<AnalyticsHeaderProps> = ({
  timeframe,
  onTimeframeChange,
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <h2 className="text-2xl font-semibold tracking-tight">
        Analytics Dashboard
      </h2>
      <TimeframeSelector value={timeframe} onChange={onTimeframeChange} />
    </div>
  );
};
